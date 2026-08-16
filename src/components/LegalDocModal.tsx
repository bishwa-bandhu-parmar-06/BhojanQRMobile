import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";

import { LEGAL_DOCS, type LegalDocId } from "../constants/legalDocs";

interface LegalDocModalProps {
  docId: LegalDocId | null;
  onClose: () => void;
}

/**
 * Full-screen reader for the legal documents linked from the sign-up form.
 *
 * A Modal rather than a navigation push: the register form is multi-step and
 * holds unsaved input, and navigating away to read the terms would either
 * lose that or require the whole form to be lifted into route state. Closing
 * this returns to exactly the field they left.
 */
const LegalDocModal = ({ docId, onClose }: LegalDocModalProps) => {
  const doc = docId ? LEGAL_DOCS[docId] : null;

  return (
    <Modal
      visible={!!doc}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <View style={styles.bar}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.back}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Back to the form"
          >
            <ArrowLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.barTitle} numberOfLines={1}>
            {doc?.title}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.updated}>Last updated {doc?.updated}</Text>

          {doc?.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.heading}>{section.heading}</Text>
              {section.paragraphs.map((p, i) => (
                <Text key={i} style={styles.paragraph}>
                  {p}
                </Text>
              ))}
            </View>
          ))}

          <Text style={styles.footer}>
            Questions? Write to support@bhojanqr.com or call +91 91423 64660.
          </Text>
        </ScrollView>

        {/* A second way out at the end, so someone who has read to the bottom
            does not have to scroll back up to continue. */}
        <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>Back to form</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default LegalDocModal;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ffffff" },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 46,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  back: { padding: 4 },
  barTitle: { flex: 1, fontSize: 17, fontWeight: "900", color: "#0f172a" },
  body: { padding: 20, paddingBottom: 28 },
  updated: { fontSize: 12, fontWeight: "600", color: "#94a3b8", marginBottom: 20 },
  section: { marginBottom: 24 },
  heading: { fontSize: 15, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  paragraph: { fontSize: 13.5, lineHeight: 21, color: "#475569", marginBottom: 10 },
  footer: {
    fontSize: 12.5,
    lineHeight: 19,
    color: "#94a3b8",
    marginTop: 8,
    fontStyle: "italic",
  },
  doneBtn: {
    margin: 16,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: { fontSize: 15, fontWeight: "800", color: "#ffffff" },
});
