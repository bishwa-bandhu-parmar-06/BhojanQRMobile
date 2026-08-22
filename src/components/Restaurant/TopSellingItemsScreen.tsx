import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import RNShare from 'react-native-share';
import RNFS from 'react-native-fs';
import { ArrowLeft, Download, Trophy } from 'lucide-react-native';

import { getTopSellingItems, exportTopSellingItems } from '../../API/reportApi';
import { arrayBufferToBase64 } from '../../utils/base64';
import { extractApiErrorMessage } from '../../utils/apiError';
import { formatMoney } from '../../utils/money';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// `id` is the server's `period` query value; `label` is the chip. The server
// owns the actual date maths and hands back its own periodLabel, which is what
// the summary and the file name use - these labels only have to name the chip.
const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'all', label: 'All time' },
];

interface SoldItem {
  name: string;
  totalQuantity: number;
  revenue: number;
}

interface TopSellingItemsScreenProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * The whole sales history by item, behind the overview's Top Selling Items
 * card.
 *
 * That card is deliberately a top five - it shares the overview with a dozen
 * other things and has to stay scannable. Everything it leaves out is here,
 * along with the Excel export, which is the reason most people open it.
 *
 * A full-screen Modal rather than a dashboard sub-screen: this is a read-only
 * drill-in with no editing to protect, and a Modal covers the bottom tab bar
 * too, which a panel swap does not.
 */
const TopSellingItemsScreen: React.FC<TopSellingItemsScreenProps> = ({ visible, onClose }) => {
  const [items, setItems] = useState<SoldItem[]>([]);
  const [totals, setTotals] = useState({ totalItemsSold: 0, totalRevenue: 0 });
  const [periodLabel, setPeriodLabel] = useState('');
  // Opens on all-time, which is what the card behind it shows - changing the
  // meaning of the numbers between tapping and arriving would be disorienting.
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (forPeriod: string) => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await getTopSellingItems(forPeriod);
      const data = res?.data?.data || {};
      setItems(data.items || []);
      setPeriodLabel(data.periodLabel || '');
      setTotals({
        totalItemsSold: data.totalItemsSold || 0,
        totalRevenue: data.totalRevenue || 0,
      });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetched on open and on every period change. Deliberately not on mount:
  // this list is only ever looked at on purpose, and it is the one request on
  // this screen that scales with the size of the menu.
  useEffect(() => {
    if (visible) load(period);
  }, [visible, period, load]);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    let destPath: string | null = null;

    try {
      // Exports whatever the chips are currently showing, so the file always
      // matches the list the owner is looking at.
      const response = await exportTopSellingItems(period);

      if (!response.data || response.data.byteLength === 0) {
        Toast.show({ type: 'error', text1: 'The export was empty' });
        return;
      }

      // Mirrors the server's own Content-Disposition, so a file saved from
      // here is named the same as one pulled straight from the API.
      const fileName = `BhojanQR-Top Selling Items - ${periodLabel || 'All Time'}.xlsx`;
      destPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      await RNFS.writeFile(destPath, arrayBufferToBase64(response.data), 'base64');

      const stat = await RNFS.stat(destPath);
      Toast.show({
        type: 'success',
        text1: 'Export ready',
        text2: `${(Number(stat.size) / 1024).toFixed(0)} KB — choose where to save it`,
      });

      await RNShare.open({
        url: `file://${destPath}`,
        type: XLSX_MIME,
        filename: fileName,
        title: 'Top Selling Items',
        failOnCancel: false,
      });
      destPath = null;
    } catch (error: any) {
      // Written to the cache directory, so a failed or cancelled share leaves
      // a stray file behind unless it is cleaned up here.
      if (destPath) await RNFS.unlink(destPath).catch(() => {});

      const serverMessage = extractApiErrorMessage(error?.response?.data);
      const timedOut = error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT';
      Toast.show({
        type: 'error',
        text1: 'Export failed',
        text2:
          serverMessage ||
          (timedOut ? 'The export took too long — try again' : 'Please try again'),
      });
    } finally {
      setExporting(false);
    }
  };

  // Every bar is measured against the best seller, so the top row is always
  // full and the rest read as "how far behind number one".
  const leadQuantity = items[0]?.totalQuantity || 0;

  const renderItem = ({ item, index }: { item: SoldItem; index: number }) => {
    const share = leadQuantity > 0 ? item.totalQuantity / leadQuantity : 0;
    return (
      <View style={styles.row}>
        <View style={[styles.rank, index === 0 && styles.rankFirst]}>
          <Text style={[styles.rankText, index === 0 && styles.rankTextFirst]}>{index + 1}</Text>
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.qty}>{item.totalQuantity}×</Text>
            <Text style={styles.revenue}>₹{formatMoney(item.revenue)}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.max(4, share * 100)}%` }]} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.bar}>
          <TouchableOpacity style={styles.barBack} onPress={onClose} activeOpacity={0.7}>
            <ArrowLeft size={18} color="#374151" />
            <Text style={styles.barTitle} numberOfLines={1}>
              Top Selling Items
            </Text>
          </TouchableOpacity>

          {/* Hidden while there is nothing to export - the endpoint answers
              404 on an empty history, and a button that can only fail is
              worse than no button. */}
          {items.length > 0 && (
            <TouchableOpacity
              style={[styles.exportBtn, exporting && styles.exportBtnBusy]}
              onPress={handleExport}
              disabled={exporting}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Export to Excel"
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Download size={15} color="#fff" />
              )}
              <Text style={styles.exportText}>{exporting ? 'Exporting…' : 'Export'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Outside the loading branches on purpose: the chips must stay live
            while a period is being fetched, so a mis-tap can be corrected
            without waiting for the wrong list to arrive first. */}
        <View style={styles.filterRow}>
          {PERIODS.map((p) => {
            const active = p.id === period;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setPeriod(p.id)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                {/* Belt and braces on the single line: even at the narrowest
                    width a label clips rather than wrapping the chip taller
                    than its neighbours. */}
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                  numberOfLines={1}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.centred}>
            <ActivityIndicator size="large" color="#ea580c" />
          </View>
        ) : loadError ? (
          <View style={styles.centred}>
            <Text style={styles.emptyTitle}>Could not load sales</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => load(period)} activeOpacity={0.8}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centred}>
            <Trophy size={30} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>
              {period === 'all' ? 'Nothing sold yet' : `Nothing sold in ${periodLabel || 'this period'}`}
            </Text>
            <Text style={styles.emptySub}>
              {period === 'all'
                ? 'Once orders are paid for, every item you have sold shows up here.'
                : 'Try a wider period — paid orders only count towards these totals.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.name}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={styles.summary}>
                {/* The server's own label, not the chip's - it is the same
                    string the file name and the workbook banner carry, so
                    there is one wording for the period everywhere. */}
                {!!periodLabel && <Text style={styles.summaryPeriod}>{periodLabel}</Text>}
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryValue}>{items.length}</Text>
                  <Text style={styles.summaryLabel}>Items</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryValue}>{totals.totalItemsSold}</Text>
                  <Text style={styles.summaryLabel}>Units sold</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryValue}>₹{formatMoney(totals.totalRevenue)}</Text>
                  <Text style={styles.summaryLabel}>Revenue</Text>
                </View>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  barBack: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  barTitle: { fontSize: 16, fontWeight: '800', color: '#1f2937', flexShrink: 1 },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  exportBtnBusy: { opacity: 0.7 },
  exportText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  // One row, never wrapping. The five periods are a single choice and read as
  // one control, so they share the width evenly rather than being sized by
  // their labels - which is what pushed "All time" onto a second line on
  // narrower screens.
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  chip: {
    flex: 1,
    // Horizontal padding is minimal because flex already sets the width;
    // spending it here is what made the row overflow.
    paddingHorizontal: 4,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  chipActive: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  chipText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  chipTextActive: { color: '#ffffff' },

  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#334155' },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 19 },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#ea580c', fontWeight: '800', fontSize: 13 },

  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 },
  summary: {
    // Wraps so the period caption sits on its own line above the three cells.
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingVertical: 14,
    marginBottom: 14,
  },
  summaryPeriod: {
    width: '100%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  summaryCell: { flex: 1, alignItems: 'center', gap: 2 },
  summaryDivider: { width: 1, height: 28, backgroundColor: '#f1f5f9' },
  summaryValue: { fontSize: 15, fontWeight: '800', color: '#1f2937' },
  summaryLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 12,
    marginBottom: 8,
  },
  rank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankFirst: { backgroundColor: '#ffedd5' },
  rankText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  rankTextFirst: { color: '#ea580c' },
  rowBody: { flex: 1, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1f2937' },
  qty: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  revenue: { fontSize: 13, fontWeight: '800', color: '#16a34a' },
  barTrack: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: '#fb923c', borderRadius: 3 },
});

export default TopSellingItemsScreen;
