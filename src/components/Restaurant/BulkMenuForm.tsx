import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet, ActivityIndicator, Animated, Easing } from "react-native";
import Toast from "react-native-toast-message";
import { Plus, Trash2, Save, UploadCloud, FileSpreadsheet } from "lucide-react-native";
import { addMenuItem, getMenuCategories, resolveMenuImage } from "../../API/menuApi";
import * as XLSX from "xlsx";
import RNFS from "react-native-fs";
import { launchImageLibrary } from "react-native-image-picker";
import { DEFAULT_MENU_CATEGORIES } from "../../constants/foodTags";
import CategorySelect from "./CategorySelect";

import { pick, types } from "@react-native-documents/picker";

interface BulkMenuFormProps {
  // No onCancel: leaving is the back bar's job now, and the guards that
  // decide whether leaving is even allowed live up there with it.
  onSuccess: () => void;
  // "Something is running that must not be interrupted" - reading a
  // spreadsheet or pushing rows to the server. The screen above uses it to
  // refuse back/close, and the dashboard above that to refuse logout: half an
  // uploaded menu is a worse state than either operation taking a few more
  // seconds.
  onBusyChange?: (busy: boolean) => void;
  // "There is work here that closing would throw away." Drives the discard
  // confirmation, which is owned by the screen above because that screen owns
  // both ways out - its back bar and the hardware back button - and the two
  // have to ask the same question.
  onDirtyChange?: (dirty: boolean) => void;
}

// Indeterminate bar for the read, where there is no percentage to report -
// RNFS hands back the whole file at once and XLSX parses it in one blocking
// call, so there is no progress to sample. It only has to say "still working,
// not frozen", which is what the form failed to say before.
const IndeterminateBar = () => {
  const anim = useRef(new Animated.Value(0)).current;
  // Measured rather than hardcoded: the track is full-width inside a padded
  // box, so the distance to travel is only known after layout.
  const [trackWidth, setTrackWidth] = useState(0);
  const sliverWidth = Math.max(48, trackWidth * 0.35);

  useEffect(() => {
    if (!trackWidth) return;
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        // Runs on the UI thread, which is the whole point here: the JS thread
        // is about to be blocked solid by the parse, and a JS-driven
        // animation would freeze along with it - a stalled progress bar being
        // worse than none at all.
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, trackWidth]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-sliverWidth, trackWidth],
  });

  return (
    <View
      style={styles.indeterminateTrack}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {trackWidth > 0 && (
        <Animated.View
          style={[styles.indeterminateSliver, { width: sliverWidth, transform: [{ translateX }] }]}
        />
      )}
    </View>
  );
};

// A resolved photo is a remote URL, so there is a gap between "the server
// says this link is good" and "the phone has actually downloaded it" - on a
// slow connection that is several seconds of an empty box per row. This fills
// the gap, and doubles as the last line of the fallback chain: a URL the
// server could reach but this device cannot render still ends at NO IMAGE
// rather than a permanently blank square.
const RowThumb = ({ uri }: { uri: string }) => {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // A new URL (hand-picked photo replacing a found one) starts the cycle over.
  useEffect(() => {
    setLoading(true);
    setFailed(false);
  }, [uri]);

  if (failed) return <Text style={styles.noImageText}>NO{"\n"}IMAGE</Text>;

  return (
    <>
      <Image
        source={{ uri }}
        style={styles.previewImg}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setFailed(true);
          setLoading(false);
        }}
      />
      {loading && (
        <View style={styles.thumbSpinner}>
          <ActivityIndicator size="small" color="#ea580c" />
        </View>
      )}
    </>
  );
};

// Tags and spice level have no per-row controls here, exactly as on the web
// dashboard - a row is already four fields wide on a phone. They are carried
// through from the spreadsheet columns instead, so an Excel sheet that
// specifies them imports with them intact.
const emptyRow = () => ({
  id: Date.now(),
  name: "",
  price: "",
  category: "Main Course",
  description: "",
  image: null,
  preview: null,
  dietaryTags: [] as string[],
  allergens: [] as string[],
  spiceLevel: null as string | null,
});

// "Vegetarian, Jain" in a spreadsheet cell -> ["Vegetarian", "Jain"]. The
// server drops anything outside its allowlist, so a typo in the sheet costs
// that one tag rather than failing the import.
const parseCommaList = (value: any): string[] =>
  typeof value === "string"
    ? value.split(",").map((v) => v.trim()).filter(Boolean)
    : [];

const BulkMenuForm: React.FC<BulkMenuFormProps> = ({
  onSuccess,
  onBusyChange,
  onDirtyChange,
}) => {
  const [items, setItems] = useState<any[]>([emptyRow()]);
  const [isUploading, setIsUploading] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [progress, setProgress] = useState(0);
  // Non-null while the image lookup pass is running over imported rows.
  const [imageScan, setImageScan] = useState<{ done: number; total: number } | null>(null);
  const [categories, setCategories] = useState<string[]>(DEFAULT_MENU_CATEGORIES);

  const isBusy = isReadingFile || isUploading;
  // The scan is deliberately NOT part of isBusy: nothing is written by it, so
  // walking away costs nothing beyond the rows themselves (which the discard
  // prompt already covers). It only holds Upload back, so rows are not sent
  // before their photos have been settled.
  const isScanning = !!imageScan;

  // A single untouched starter row is not work worth protecting - the
  // question is only worth asking once something has actually been typed or
  // imported.
  const isDirty = items.some((item: any) => item.name || item.price || item.image || item.preview);

  useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Leaving must not strand the guard in the "on" position, or the screen
  // above would refuse to close for the rest of the session.
  useEffect(
    () => () => {
      onBusyChange?.(false);
      onDirtyChange?.(false);
    },
    [onBusyChange, onDirtyChange],
  );

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await getMenuCategories();
        if (res?.data?.data?.length) setCategories(res.data.data);
      } catch {
        // Defaults are already in state.
      }
    };
    loadCategories();
  }, []);

  const handleAddCategory = (newCategory: string) => {
    setCategories((prev) => [...prev, newCategory]);
  };

  const handleChange = (id: number, field: string, value: string) => {
    setItems((prev: any[]) => prev.map((item: any) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleImageChange = async (id: number) => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (!result.didCancel && result.assets && result.assets.length > 0) {
      const file = result.assets[0];
      // Clears any "no image" verdict from the scan: a hand-picked photo is
      // the strongest source there is, and the caption saying none was found
      // must not survive it.
      setItems((prev: any[]) => prev.map((item: any) => item.id === id ? { ...item, image: file, preview: file.uri, imageStatus: "provided" } : item));
    }
  };

  // Walks the imported rows and settles what photo each one will actually
  // have, using the server's own chain: the sheet's ImageURL if it really
  // resolves to an image, otherwise a stock photo matched on the dish name,
  // otherwise nothing. Nothing is saved - this only replaces a guess with an
  // answer before the owner commits.
  //
  // Rows are patched one at a time as their verdict lands rather than in one
  // batch at the end, so a long sheet fills in visibly instead of sitting
  // blank until the last lookup returns.
  const resolveImagesFor = async (rows: any[]) => {
    const targets = rows.filter((row: any) => row.name && !row.image);
    if (!targets.length) return;

    const targetIds = new Set(targets.map((row: any) => row.id));
    setItems((prev: any[]) =>
      prev.map((item: any) => (targetIds.has(item.id) ? { ...item, imageStatus: "checking" } : item)),
    );
    setImageScan({ done: 0, total: targets.length });

    const queue = [...targets];
    let done = 0;
    let found = 0;

    const worker = async () => {
      for (let row = queue.shift(); row; row = queue.shift()) {
        let patch: any = { imageStatus: "none", preview: null };
        try {
          const res = await resolveMenuImage(row.name, row.preview);
          const { imageUrl, source } = res?.data?.data || {};
          if (imageUrl) {
            patch = { imageStatus: source === "provided" ? "provided" : "stock", preview: imageUrl };
            found += 1;
          }
        } catch {
          // A failed lookup is not a failed row - the item still uploads, the
          // server just falls back to its placeholder.
        }
        // Patched by id, not index: the owner can delete rows while this runs.
        const rowId = row.id;
        setItems((prev: any[]) => prev.map((it: any) => (it.id === rowId ? { ...it, ...patch } : it)));
        done += 1;
        setImageScan({ done, total: targets.length });
      }
    };

    // Three at a time. Enough to keep a long sheet moving, few enough not to
    // hammer the stock-photo providers sitting behind that endpoint.
    await Promise.all(Array.from({ length: Math.min(3, targets.length) }, worker));

    setImageScan(null);

    const missing = targets.length - found;
    Toast.show({
      type: missing ? "info" : "success",
      text1: missing
        ? `${missing} of ${targets.length} items have no image`
        : `Found images for all ${targets.length} items`,
      text2: missing
        ? "Tap a thumbnail to add one, or upload as is - they will show a placeholder."
        : undefined,
    });
  };

  const addNewRow = () => {
    setItems((prev: any[]) => [...prev, emptyRow()]);
  };

  const removeRow = (id: number) => {
    if (items.length === 1) return Toast.show({ type: "error", text1: "You need at least one item." });
    setItems((prev: any[]) => prev.filter((item: any) => item.id !== id));
  };

  const handleFileUpload = async () => {
    // The picker is awaited OUTSIDE the reading state: while the system file
    // dialog is up there is nothing to report, and a cancel here must not
    // leave a spinner behind.
    let picked: any;
    try {
      // FIX: Changed 'DocumentPicker.pick' to just 'pick' to match the import
      [picked] = (await pick({
        type: [types.allFiles],
      })) as any;
    } catch (error: any) {
      if (error.code !== "DOCUMENTS_PICKER_CANCELED") {
        Toast.show({ type: "error", text1: "Could not open that file." });
      }
      return;
    }

    setIsReadingFile(true);
    // XLSX.read and sheet_to_json are synchronous and hold the JS thread for
    // the whole parse - on a few hundred rows that is seconds. Setting the
    // flag above is not enough on its own: React would still be mid-tick when
    // the parse begins, so the spinner would never be committed and the form
    // would sit there looking frozen, which is exactly the problem. Yielding a
    // frame first lets the loader actually reach the screen before the thread
    // is blocked.
    await new Promise((resolve) => setTimeout(resolve, 60));

    try {
      const base64Data = await RNFS.readFile(picked.uri, 'base64');
      const workbook = XLSX.read(base64Data, { type: "base64" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) return Toast.show({ type: "error", text1: "The Excel file is empty!" });

      const importedItems = jsonData.map((row: any, index: number) => ({
        id: Date.now() + index,
        name: row.Name || row.name || "",
        price: (row.Price || row.price || "").toString(),
        category: row.Category || row.category || "Main Course",
        description: row.Description || row.description || "",
        image: null,
        preview: row.ImageURL || row["Image URL"] || null,
        // Same column names the web importer accepts, so one spreadsheet
        // works in both places.
        dietaryTags: parseCommaList(row.DietaryTags || row["Dietary Tags"]),
        allergens: parseCommaList(row.Allergens),
        spiceLevel: (row.SpiceLevel || row["Spice Level"] || "").toString().trim() || null,
      }));

      setItems((prev: any[]) => (prev.length === 1 && !prev[0].name && !prev[0].price) ? importedItems : [...prev, ...importedItems]);

      // Custom categories named in the sheet become selectable straight away,
      // rather than only after the first save makes them known to the server.
      setCategories((prev) => {
        const newOnes = importedItems
          .map((item: any) => item.category)
          .filter((cat: string) => cat && !prev.some((c) => c.toLowerCase() === cat.toLowerCase()));
        return newOnes.length ? [...prev, ...new Set<string>(newOnes)] : prev;
      });

      Toast.show({
        type: "success",
        text1: `Imported ${importedItems.length} items!`,
        text2: "Checking their images…",
      });

      // Deliberately after the reading flag is cleared, and awaited outside
      // the reading state: this part is network-bound, not thread-blocking,
      // and the rows are already on screen and editable while it runs.
      setIsReadingFile(false);
      await resolveImagesFor(importedItems);
    } catch {
      // The picker is handled above, so anything landing here is a genuine
      // read or parse failure.
      Toast.show({ type: "error", text1: "Failed to read Excel file." });
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleBulkSubmit = async () => {
    // Name and price only. An image is genuinely optional now: by this point
    // the sheet's link has been tried, an online search has been tried, and
    // whatever is left the server covers with its own placeholder. Refusing
    // the upload over a photo nobody could find would strand a whole menu
    // over its least important field.
    const invalidItem = items.find((item: any) => !item.name || !item.price);
    if (invalidItem) return Toast.show({ type: "error", text1: "Ensure every row has a name and a price." });

    setIsUploading(true);
    setProgress(0);
    let successCount = 0;

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const formData = new FormData();
        formData.append("name", item.name);
        formData.append("price", item.price);
        formData.append("category", item.category);
        formData.append("description", item.description);
        formData.append("available", "true");
        formData.append("dietaryTags", JSON.stringify(item.dietaryTags || []));
        formData.append("allergens", JSON.stringify(item.allergens || []));
        formData.append("spiceLevel", item.spiceLevel || "");
        if (item.image) {
          formData.append("image", { uri: item.image.uri, type: item.image.type, name: item.image.fileName || `image_${i}.jpg` } as any);
        } else if (item.preview) {
          // Straight from the sheet's ImageURL column. The server verifies the
          // link actually resolves to an image before trusting it.
          formData.append("imageUrl", item.preview);
        }

        await addMenuItem(formData);
        successCount++;
        setProgress(successCount);
      }
      Toast.show({ type: "success", text1: `Added ${successCount} items!` });
      onSuccess();
    } catch {
      Toast.show({ type: "error", text1: `Stopped. Uploaded ${successCount} items.` });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    // No title, no subtitle, no close button: the screen's back bar already
    // names this screen, its arrow already leaves it, and its right-hand
    // Upload already submits it. Repeating all three here cost roughly a
    // third of the list's height and bought nothing.
    <View style={styles.container}>
      {/* Reading a spreadsheet used to give no sign at all: the thread blocks
          inside XLSX and the form simply stopped responding. */}
      {isReadingFile && (
        <View style={styles.uploadingBox}>
          <View style={styles.readingRow}>
            <ActivityIndicator size="small" color="#ea580c" />
            <Text style={styles.uploadingText}>Reading spreadsheet…</Text>
          </View>
          <IndeterminateBar />
          <Text style={styles.readingHint}>Large files can take a few seconds. Keep this screen open.</Text>
        </View>
      )}

      {/* This is the message the owner needs at exactly this moment: the
          sheet's own links have already been tried and some did not resolve,
          so we are out looking for replacements. Determinate, because unlike
          the parse there is a real count to report. */}
      {isScanning && (
        <View style={styles.uploadingBox}>
          <View style={styles.readingRow}>
            <ActivityIndicator size="small" color="#ea580c" />
            <Text style={styles.uploadingText}>
              Finding images… {imageScan!.done} / {imageScan!.total}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(imageScan!.done / imageScan!.total) * 100}%` }]} />
          </View>
          <Text style={styles.readingHint}>
            Links from your sheet are checked first. Where one does not open an image, we search
            online by dish name - anything still not found can be added by hand here or later
            from Edit item.
          </Text>
        </View>
      )}

      {isUploading && (
        <View style={styles.uploadingBox}>
          <Text style={styles.uploadingText}>Uploading... {progress} / {items.length} completed</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(progress / items.length) * 100}%` }]} />
          </View>
        </View>
      )}

      {/* Photo and delete stacked in a narrow left rail, fields in the rest.
          The old card ran a full-width 100px dropzone above four stacked
          inputs, which made one row taller than the visible list - literally
          one row on screen at a time. This fits three, and the delete button
          sits under the thumbnail instead of floating over the name field. */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item: any) => (
          <View key={item.id} style={styles.rowCard}>
            <View style={styles.rowRail}>
              {/* Four states, and the box stays tappable in all of them - the
                  fallback chain is a convenience, never a lock-in. */}
              <TouchableOpacity onPress={() => handleImageChange(item.id)} disabled={isBusy} style={styles.imageBox}>
                {item.imageStatus === "checking" ? (
                  <ActivityIndicator size="small" color="#ea580c" />
                ) : item.preview ? (
                  <RowThumb uri={item.preview} />
                ) : item.imageStatus === "none" ? (
                  <Text style={styles.noImageText}>NO{"\n"}IMAGE</Text>
                ) : (
                  <UploadCloud color="#9ca3af" size={20} />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeRow(item.id)} disabled={isBusy} style={styles.deleteBtn}>
                <Trash2 size={15} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.rowFields}>
              <TextInput cursorColor="#ea580c" selectionColor="#fdba74" style={styles.input} placeholder="Item Name *" placeholderTextColor="#9ca3af" value={item.name} onChangeText={(v) => handleChange(item.id, "name", v)} editable={!isBusy} />
              {/* Price and category share a line: neither needs full width, and
                  pairing them takes a whole input row off every card. */}
              <View style={styles.fieldPair}>
                <View style={styles.priceField}>
                  <TextInput cursorColor="#ea580c" selectionColor="#fdba74" style={styles.input} placeholder="Price *" placeholderTextColor="#9ca3af" keyboardType="numeric" value={item.price} onChangeText={(v) => handleChange(item.id, "price", v)} editable={!isBusy} />
                </View>
                <View style={styles.categoryField}>
                  <CategorySelect
                    compact
                    value={item.category}
                    onChange={(v) => handleChange(item.id, "category", v)}
                    categories={categories}
                    onAddCategory={handleAddCategory}
                    disabled={isBusy}
                  />
                </View>
              </View>
              <TextInput cursorColor="#ea580c" selectionColor="#fdba74" style={styles.input} placeholder="Description" placeholderTextColor="#9ca3af" value={item.description} onChangeText={(v) => handleChange(item.id, "description", v)} editable={!isBusy} />

              {/* Only the two outcomes worth a word. A sheet link that simply
                  worked needs no commentary. */}
              {item.imageStatus === "stock" && (
                <Text style={styles.captionFound}>Photo found online — tap it to replace</Text>
              )}
              {item.imageStatus === "none" && (
                <Text style={styles.captionMissing}>
                  No image available — tap the box, or leave it and add one later from Edit item
                </Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* One row, not two stacked. Upload All stays here as well as in the
          back bar - this is where the thumb already is after filling a row. */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={addNewRow} disabled={isBusy} style={styles.addRowBtn}>
          <Plus size={16} color="#ea580c" /><Text style={styles.addRowText} numberOfLines={1}>Add row</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleFileUpload} disabled={isBusy} style={styles.importBtn}>
          <FileSpreadsheet size={16} color="#15803d" /><Text style={styles.importText} numberOfLines={1}>Excel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleBulkSubmit} disabled={isBusy || isScanning} style={styles.submitBtn}>
          {isUploading ? (
            <><ActivityIndicator size="small" color="#fff" /><Text style={styles.submitText} numberOfLines={1}>Uploading…</Text></>
          ) : (
            <><Save size={16} color="#fff" /><Text style={styles.submitText} numberOfLines={1}>Upload All</Text></>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Full bleed. The card framing this used to have was a second border inside
  // the screen's own, and its padding stacked on the host's - all of it height
  // the rows could have had.
  container: { flex: 1, backgroundColor: "#f9fafb" },
  uploadingBox: { backgroundColor: "#fff7ed", padding: 12, borderRadius: 12, margin: 12, marginBottom: 0 },
  readingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  readingHint: { fontSize: 11, color: "#9a3412", marginTop: 8 },
  indeterminateTrack: {
    height: 8,
    backgroundColor: "#fed7aa",
    borderRadius: 4,
    marginTop: 10,
    // Keeps the travelling sliver from painting outside the track at either end.
    overflow: "hidden",
  },
  indeterminateSliver: { height: 8, backgroundColor: "#ea580c", borderRadius: 4 },
  uploadingText: { fontSize: 12, fontWeight: "bold", color: "#ea580c", marginBottom: 8 },
  progressBarBg: { height: 8, backgroundColor: "#fed7aa", borderRadius: 4 },
  progressBarFill: { height: 8, backgroundColor: "#ea580c", borderRadius: 4 },
  list: { flex: 1 },
  listContent: { padding: 12, paddingBottom: 4 },

  rowCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },
  rowRail: { width: 64, gap: 6 },
  imageBox: {
    width: 64,
    height: 64,
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  previewImg: { width: "100%", height: "100%" },
  // Text, not another image file - a placeholder that is itself an asset can
  // fail to load, which is the exact failure this is standing in for.
  noImageText: { fontSize: 9, fontWeight: "800", color: "#9ca3af", textAlign: "center", lineHeight: 12 },
  // Sits over the image rather than replacing it, so there is no swap-in jump
  // when the download lands.
  thumbSpinner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  deleteBtn: {
    height: 28,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  rowFields: { flex: 1, gap: 8 },
  captionFound: { fontSize: 10, color: "#15803d", fontWeight: "700" },
  captionMissing: { fontSize: 10, color: "#b45309", fontWeight: "700", lineHeight: 14 },
  fieldPair: { flexDirection: "row", gap: 8 },
  priceField: { flex: 1 },
  // Slightly wider than price: a category name is the longer of the two, and
  // this is the field that has to show a custom name without clipping.
  categoryField: { flex: 1.3 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#1f2937" },

  footer: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingTop: 12,
    // Clears the dashboard's bottom tab bar, which sits under this screen.
    paddingBottom: 28,
  },
  addRowBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#fff7ed", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#fed7aa" },
  addRowText: { color: "#ea580c", fontWeight: "800", fontSize: 13 },
  importBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#f0fdf4", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#bbf7d0" },
  importText: { color: "#15803d", fontWeight: "800", fontSize: 13 },
  submitBtn: { flex: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#ea580c", paddingVertical: 12, borderRadius: 10 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});

export default BulkMenuForm;