import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, RefreshControl, Modal, ScrollView, Image, Linking } from 'react-native';
import {
  Store,
  CheckCircle,
  XCircle,
  X,
  User,
  Phone,
  Mail,
  UtensilsCrossed,
  ShoppingBag,
  TrendingUp,
  Clock,
  FileText,
  Lock,
  Eye,
  ExternalLink,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import {
  getPendingRestaurants,
  getApprovedRestaurants,
  getRejectedRestaurants,
  approveRestaurant,
  rejectRestaurant,
  getRestaurantDetailsAdmin,
  updateRestaurantStatusAdmin,
} from '../../API/adminApi';
import { formatMoney } from '../../utils/money';
import BhojanQRLoader from '../BhojanQRLoader';

type TabType = 'pending' | 'approved' | 'rejected';


// Cloudinary appends a transformation query, so a plain endsWith(".pdf") is
// not enough to recognise one.
const isPdf = (url: string) => /\.pdf($|\?)/i.test(url || '');

// One labelled fact. Kept as a component so every row in the detail view has
// the same icon size, spacing and truncation rather than each being spelled
// out at the call site.
const DetailRow = ({ icon: Icon, label, value, mono, last }: any) => (
  <View style={[styles.detailRow, last && styles.rowLast]}>
    <Icon size={15} color="#94a3b8" />
    <Text style={styles.detailRowLabel}>{label}</Text>
    <Text
      style={[styles.detailRowValue, mono && styles.detailRowMono]}
      numberOfLines={1}
      ellipsizeMode="middle"
    >
      {value || '-'}
    </Text>
  </View>
);

const REVENUE_TONES: Record<string, { bg: string; fg: string }> = {
  amber: { bg: '#fff7ed', fg: '#c2410c' },
  blue: { bg: '#eff6ff', fg: '#1d4ed8' },
  violet: { bg: '#faf5ff', fg: '#7c3aed' },
  green: { bg: '#f0fdf4', fg: '#15803d' },
};

const RevenueTile = ({ label, value, tone }: any) => {
  const t = REVENUE_TONES[tone] || REVENUE_TONES.amber;
  return (
    <View style={[styles.revenueTile, { backgroundColor: t.bg }]}>
      <Text style={styles.revenueLabel}>{label}</Text>
      <Text style={[styles.revenueValue, { color: t.fg }]} numberOfLines={1} adjustsFontSizeToFit>
        {'\u20B9'}{formatMoney(value || 0)}
      </Text>
    </View>
  );
};

const FILTER_PILLS: { id: TabType; label: string; color: string }[] = [
  { id: 'pending', label: 'Pending', color: '#d97706' },
  { id: 'approved', label: 'Approved', color: '#16a34a' },
  { id: 'rejected', label: 'Rejected', color: '#dc2626' },
];

const RestaurantRequestsManager = () => {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [isListLoading, setIsListLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  // The document currently open in the image viewer. PDFs never land here -
  // they are handed to the OS instead (see openDocument).
  const [viewerDoc, setViewerDoc] = useState<any>(null);
  const [viewerFailed, setViewerFailed] = useState(false);

  const fetchRestaurants = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsListLoading(true);
    try {
      let res;
      if (activeTab === 'pending') res = await getPendingRestaurants();
      else if (activeTab === 'approved') res = await getApprovedRestaurants();
      else res = await getRejectedRestaurants();
      setRestaurants(res.data?.data || []);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load restaurant list' });
    } finally {
      setIsListLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRestaurants(true);
    setRefreshing(false);
  }, [fetchRestaurants]);

  const handleStatusUpdate = async (id: string, action: 'approve' | 'reject') => {
    setActionId(id);
    try {
      if (action === 'approve') {
        await approveRestaurant(id);
        Toast.show({ type: 'success', text1: 'Restaurant Approved!' });
      } else {
        await rejectRestaurant(id);
        Toast.show({ type: 'info', text1: 'Restaurant Rejected' });
      }
      fetchRestaurants(false);
    } catch {
      Toast.show({ type: 'error', text1: 'Update failed' });
    } finally {
      setActionId(null);
    }
  };

  const openDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const res = await getRestaurantDetailsAdmin(id);
      setSelectedDetails(res.data?.data || null);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load restaurant details' });
    } finally {
      setDetailsLoading(false);
    }
  };


  // The server accepts .jpg/.jpeg/.png/.pdf for documents (see
  // config/cloudinary.js). Images open in the viewer below; a PDF is handed
  // to whatever app the device uses for them, because nothing in this build
  // can render one - there is no PDF or WebView library installed, and
  // pretending otherwise would show a blank page.
  const openDocument = async (doc: any) => {
    const url = doc?.documentUrl;
    if (!url) {
      Toast.show({ type: 'error', text1: 'No file was uploaded for this document' });
      return;
    }

    if (!isPdf(url)) {
      setViewerFailed(false);
      setViewerDoc(doc);
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('unsupported');
      await Linking.openURL(url);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Could not open the PDF',
        text2: 'No app on this device can display it',
      });
    }
  };

  const handleMoveStatus = async (status: 'pending' | 'approved' | 'rejected') => {
    if (!selectedDetails?.restaurant?._id) return;
    setStatusUpdating(true);
    try {
      await updateRestaurantStatusAdmin(selectedDetails.restaurant._id, status);
      Toast.show({ type: 'success', text1: `Restaurant marked as ${status}` });
      setSelectedDetails(null);
      fetchRestaurants(false);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update status' });
    } finally {
      setStatusUpdating(false);
    }
  };

  const renderRestaurantCard = ({ item }: any) => (
    <TouchableOpacity style={styles.resCard} onPress={() => openDetails(item._id)} activeOpacity={0.8}>
      <View style={styles.resInfo}>
        <Text style={styles.resName}>{item.restaurantName}</Text>
        <Text style={styles.resOwner}>{item.ownerName}</Text>
        <Text style={styles.resMobile}>{item.mobile}</Text>
        <Text style={styles.resId}>ID: {item._id.slice(-6)}</Text>
      </View>

      <View style={styles.resActions}>
        {activeTab === 'pending' ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={(e) => { e.stopPropagation(); handleStatusUpdate(item._id, 'approve'); }}
              disabled={actionId === item._id}
            >
              {actionId === item._id ? <ActivityIndicator size="small" color="#16a34a" /> : <CheckCircle size={20} color="#16a34a" />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={(e) => { e.stopPropagation(); handleStatusUpdate(item._id, 'reject'); }}
              disabled={actionId === item._id}
            >
              {actionId === item._id ? <ActivityIndicator size="small" color="#dc2626" /> : <XCircle size={20} color="#dc2626" />}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.statusBadge, activeTab === 'approved' ? styles.badgeApproved : styles.badgeRejected]}>
            <Text style={[styles.statusText, activeTab === 'approved' ? styles.textApproved : styles.textRejected]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* FILTER PILLS. Each carries its own colour when selected, so the
          state being viewed is readable at a glance rather than every filter
          looking identically orange - "Rejected" should not look like
          "Approved". */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTER_PILLS.map(({ id, label, color }) => {
          const isActive = activeTab === id;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.pill, isActive && { backgroundColor: color }]}
              onPress={() => setActiveTab(id)}
              activeOpacity={0.8}
            >
              {!isActive && <View style={[styles.pillDot, { backgroundColor: color }]} />}
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{label}</Text>
              {isActive && restaurants.length > 0 && (
                <View style={styles.pillCount}>
                  <Text style={[styles.pillCountText, { color }]}>{restaurants.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* LIST */}
      {isListLoading ? (
        <View style={styles.centerList}>
          <BhojanQRLoader fullScreen={false} />
        </View>
      ) : (
        <FlatList
        keyboardShouldPersistTaps="handled"
          data={restaurants}
          keyExtractor={(item) => item._id}
          renderItem={renderRestaurantCard}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#f97316"]} />}
          ListEmptyComponent={
            <View style={styles.centerList}>
              <Store size={48} color="#d1d5db" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>No {activeTab} restaurants found.</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={detailsLoading || !!selectedDetails}
        animationType="slide"
        onRequestClose={() => setSelectedDetails(null)}
      >
        <View style={styles.fullScreen}>
          <View style={styles.fullScreenInner}>
            {detailsLoading ? (
              <BhojanQRLoader fullScreen={false} />
            ) : selectedDetails ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconBox}>
                    <Store size={22} color="#ea580c" />
                  </View>
                  <TouchableOpacity onPress={() => setSelectedDetails(null)} style={styles.modalCloseBtn}>
                    <X size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  style={styles.detailScroll}
                  contentContainerStyle={styles.detailScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* IDENTITY. Logo when one has been uploaded, initials
                      otherwise - an empty square reads as a broken image
                      rather than "no logo set". */}
                  <View style={styles.idBlock}>
                    {selectedDetails.restaurant?.logo ? (
                      <Image source={{ uri: selectedDetails.restaurant.logo }} style={styles.logo} />
                    ) : (
                      <View style={styles.logoFallback}>
                        <Text style={styles.logoInitials}>
                          {(selectedDetails.restaurant?.restaurantName || '?').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.idText}>
                      <Text style={styles.detailName} numberOfLines={2}>
                        {selectedDetails.restaurant?.restaurantName}
                      </Text>
                      <View
                        style={[
                          styles.detailStatus,
                          selectedDetails.restaurant?.status === 'approved'
                            ? styles.detailStatusApproved
                            : selectedDetails.restaurant?.status === 'rejected'
                              ? styles.detailStatusRejected
                              : styles.detailStatusPending,
                        ]}
                      >
                        <Text style={styles.detailStatusText}>
                          {(selectedDetails.restaurant?.status || '').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.groupLabel}>Contact</Text>
                  <View style={styles.group}>
                    <DetailRow icon={User} label="Owner" value={selectedDetails.restaurant?.ownerName} />
                    <DetailRow icon={Mail} label="Email" value={selectedDetails.restaurant?.email} />
                    <DetailRow icon={Phone} label="Mobile" value={selectedDetails.restaurant?.mobile} />
                    <DetailRow icon={Store} label="Restaurant ID" value={selectedDetails.restaurant?._id} mono />
                    <DetailRow
                      icon={Clock}
                      label="Registered"
                      value={
                        selectedDetails.restaurant?.createdAt
                          ? new Date(selectedDetails.restaurant.createdAt).toLocaleDateString()
                          : '-'
                      }
                      last
                    />
                  </View>

                  {/* Everything below is super-admin only. The server sends
                      scope:"basic" and omits the data entirely for a sub
                      admin, so this is not the gate - it is what stops an
                      empty section rendering where data was withheld. */}
                  {selectedDetails.scope === 'full' ? (
                    <>
                      <Text style={styles.groupLabel}>Revenue</Text>
                      <View style={styles.revenueGrid}>
                        <RevenueTile label="Today" value={selectedDetails.stats?.dailyRevenue} tone="amber" />
                        <RevenueTile label="This month" value={selectedDetails.stats?.monthlyRevenue} tone="blue" />
                        <RevenueTile label="This year" value={selectedDetails.stats?.yearlyRevenue} tone="violet" />
                        <RevenueTile label="All time" value={selectedDetails.stats?.totalRevenue} tone="green" />
                      </View>

                      <Text style={styles.groupLabel}>Activity</Text>
                      <View style={styles.group}>
                        <DetailRow icon={UtensilsCrossed} label="Menu items" value={String(selectedDetails.stats?.totalMenus ?? 0)} />
                        <DetailRow icon={ShoppingBag} label="Orders today" value={String(selectedDetails.stats?.todaysOrders ?? 0)} />
                        <DetailRow icon={TrendingUp} label="Orders all time" value={String(selectedDetails.stats?.totalOrders ?? 0)} last />
                      </View>

                      {selectedDetails.stats?.bestSellers?.length > 0 && (
                        <>
                          <Text style={styles.groupLabel}>Best sellers</Text>
                          <View style={styles.group}>
                            {selectedDetails.stats.bestSellers.map((b: any, i: number) => (
                              <View
                                key={b.name || i}
                                style={[styles.sellerRow, i === selectedDetails.stats.bestSellers.length - 1 && styles.rowLast]}
                              >
                                <Text style={styles.sellerRank}>{i + 1}</Text>
                                <Text style={styles.sellerName} numberOfLines={1}>{b.name}</Text>
                                <Text style={styles.sellerQty}>{b.quantitySold} sold</Text>
                                <Text style={styles.sellerRevenue}>{'\u20B9'}{formatMoney(b.revenue)}</Text>
                              </View>
                            ))}
                          </View>
                        </>
                      )}

                      <Text style={styles.groupLabel}>Government documents</Text>
                      {selectedDetails.restaurant?.documents?.length > 0 ? (
                        <View style={styles.group}>
                          {selectedDetails.restaurant.documents.map((doc: any, i: number) => (
                            <View
                              key={doc._id || i}
                              style={[styles.docRow, i === selectedDetails.restaurant.documents.length - 1 && styles.rowLast]}
                            >
                              <View style={styles.docIcon}>
                                <FileText size={15} color="#475569" />
                              </View>
                              <View style={styles.docText}>
                                <Text style={styles.docType}>
                                  {doc.idType || 'Document'}{doc.isPrimary ? '  \u00B7  PRIMARY' : ''}
                                </Text>
                                <Text style={styles.docNumber} numberOfLines={1}>{doc.idNumber || '-'}</Text>
                              </View>
                              {/* Tapping either the thumbnail or the button
                                  opens it - the preview is the obvious target,
                                  but a labelled button is what makes it clear
                                  the file can be opened at all. */}
                              {doc.documentUrl ? (
                                <TouchableOpacity
                                  onPress={() => openDocument(doc)}
                                  style={styles.docOpen}
                                  activeOpacity={0.75}
                                  accessibilityRole="button"
                                  accessibilityLabel={`View ${doc.idType || 'document'}`}
                                >
                                  {isPdf(doc.documentUrl) ? (
                                    <View style={styles.docPdf}>
                                      <Text style={styles.docPdfText}>PDF</Text>
                                    </View>
                                  ) : (
                                    <Image source={{ uri: doc.documentUrl }} style={styles.docThumb} />
                                  )}
                                  <View style={styles.docViewBtn}>
                                    {isPdf(doc.documentUrl) ? (
                                      <ExternalLink size={11} color="#ea580c" />
                                    ) : (
                                      <Eye size={11} color="#ea580c" />
                                    )}
                                    <Text style={styles.docViewText}>View</Text>
                                  </View>
                                </TouchableOpacity>
                              ) : (
                                <Text style={styles.docMissing}>No file</Text>
                              )}
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.emptyNote}>No documents uploaded.</Text>
                      )}
                    </>
                  ) : (
                    // Says why the rest is absent. Without it a sub admin reads
                    // a short page as a broken one.
                    <View style={styles.restrictedNote}>
                      <Lock size={15} color="#94a3b8" />
                      <Text style={styles.restrictedText}>
                        Revenue, documents and activity are visible to the super admin only.
                      </Text>
                    </View>
                  )}

                  <Text style={styles.moveLabel}>Move to status:</Text>
                  <View style={styles.moveRow}>
                    {(['pending', 'approved', 'rejected'] as const).map((st) => (
                      <TouchableOpacity
                        key={st}
                        disabled={statusUpdating || selectedDetails.restaurant?.status === st}
                        onPress={() => handleMoveStatus(st)}
                        style={[styles.moveBtn, selectedDetails.restaurant?.status === st && styles.moveBtnActive]}
                      >
                        <Text style={[styles.moveBtnText, selectedDetails.restaurant?.status === st && styles.moveBtnTextActive]}>
                          {st.charAt(0).toUpperCase() + st.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Sibling of the details modal rather than nested inside it: RN puts
          each Modal in its own window, and the most recently opened sits on
          top, so this avoids the nesting quirks Android has with two. */}
      <Modal
        visible={!!viewerDoc}
        animationType="fade"
        onRequestClose={() => setViewerDoc(null)}
        statusBarTranslucent
      >
        <View style={styles.viewerRoot}>
          <View style={styles.viewerBar}>
            <View style={styles.viewerBarText}>
              <Text style={styles.viewerTitle} numberOfLines={1}>
                {viewerDoc?.idType || 'Document'}
              </Text>
              {!!viewerDoc?.idNumber && (
                <Text style={styles.viewerSubtitle} numberOfLines={1}>
                  {viewerDoc.idNumber}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => viewerDoc?.documentUrl && Linking.openURL(viewerDoc.documentUrl)}
              style={styles.viewerAction}
              accessibilityRole="button"
              accessibilityLabel="Open outside the app"
            >
              <ExternalLink size={19} color="#e2e8f0" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewerDoc(null)}
              style={styles.viewerAction}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={22} color="#e2e8f0" />
            </TouchableOpacity>
          </View>

          <View style={styles.viewerBody}>
            {viewerFailed ? (
              <Text style={styles.viewerError}>
                This image could not be loaded. It may have been removed from storage.
              </Text>
            ) : (
              // contain, not cover: a document has to be readable end to end,
              // and cropping an ID card to fill the screen hides the number.
              <Image
                source={{ uri: viewerDoc?.documentUrl }}
                style={styles.viewerImage}
                resizeMode="contain"
                onError={() => setViewerFailed(true)}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 16 },
  filterScroll: { flexGrow: 0, backgroundColor: '#ffffff' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 100, backgroundColor: '#f1f5f9' },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  pillTextActive: { color: '#ffffff' },
  pillCount: { minWidth: 20, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 100, backgroundColor: '#ffffff', alignItems: 'center' },
  pillCountText: { fontSize: 11, fontWeight: '800' },
  flatListContent: { paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 },
  centerList: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  resCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 12, elevation: 1 },
  resInfo: { flex: 1 },
  resName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  resOwner: { fontSize: 13, color: '#475569', fontWeight: '500' },
  resMobile: { fontSize: 12, color: '#64748b', marginTop: 2 },
  resId: { fontSize: 10, color: '#cbd5e1', marginTop: 6, fontWeight: 'bold' },
  resActions: { marginLeft: 16 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 10, borderRadius: 10, borderWidth: 1 },
  approveBtn: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  rejectBtn: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeApproved: { backgroundColor: '#dcfce7' },
  badgeRejected: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  textApproved: { color: '#15803d' },
  textRejected: { color: '#b91c1c' },

  fullScreen: { flex: 1, backgroundColor: '#f8fafc' },
  // paddingTop clears the status bar - a full-screen Modal draws under it.
  fullScreenInner: { flex: 1, backgroundColor: '#ffffff', paddingTop: 44, paddingHorizontal: 20, paddingBottom: 20 },
  detailScroll: { flex: 1 },
  detailScrollContent: { paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  modalCloseBtn: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 100 },
  modalResName: { fontSize: 19, fontWeight: '900', color: '#1f2937', marginBottom: 8 },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  modalRowText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, marginBottom: 16 },
  statBox: { width: '47%', borderRadius: 14, padding: 12, gap: 4 },
  statValue: { fontSize: 16, fontWeight: '900', color: '#1f2937', marginTop: 4 },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' },

  idBlock: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  logo: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#f1f5f9' },
  logoFallback: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  logoInitials: { fontSize: 21, fontWeight: '900', color: '#ea580c' },
  idText: { flex: 1, gap: 7 },
  detailName: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  detailStatus: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6 },
  detailStatusApproved: { backgroundColor: '#dcfce7' },
  detailStatusRejected: { backgroundColor: '#fee2e2' },
  detailStatusPending: { backgroundColor: '#fef3c7' },
  detailStatusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.6, color: '#334155' },

  groupLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 22, marginBottom: 9 },
  group: { backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 13 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e9eef5' },
  rowLast: { borderBottomWidth: 0 },
  detailRowLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', width: 96 },
  detailRowValue: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0f172a', textAlign: 'right' },
  detailRowMono: { fontSize: 11, fontWeight: '600', color: '#64748b' },

  revenueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // Just under half so two sit per row with the gap between them.
  revenueTile: { width: '47.8%', flexGrow: 1, borderRadius: 14, padding: 13 },
  revenueLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.4 },
  revenueValue: { fontSize: 18, fontWeight: '900', marginTop: 6 },

  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#e9eef5' },
  sellerRank: { fontSize: 12, fontWeight: '900', color: '#ea580c', minWidth: 14 },
  sellerName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#334155' },
  sellerQty: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  sellerRevenue: { fontSize: 13, fontWeight: '800', color: '#15803d', minWidth: 64, textAlign: 'right' },

  docRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e9eef5' },
  docIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  docText: { flex: 1 },
  docType: { fontSize: 11, fontWeight: '800', color: '#475569', letterSpacing: 0.3 },
  docNumber: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  docThumb: { width: 46, height: 46, borderRadius: 9, backgroundColor: '#e2e8f0' },
  docPdf: { width: 46, height: 46, borderRadius: 9, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  docPdfText: { fontSize: 10, fontWeight: '900', color: '#dc2626' },
  emptyNote: { fontSize: 12, color: '#94a3b8', fontWeight: '600', fontStyle: 'italic' },


  docOpen: { alignItems: 'center', gap: 5 },
  docViewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  docViewText: { fontSize: 10, fontWeight: '800', color: '#ea580c' },
  docMissing: { fontSize: 11, fontWeight: '600', color: '#cbd5e1', fontStyle: 'italic' },

  viewerRoot: { flex: 1, backgroundColor: '#0f172a' },
  viewerBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 46, paddingBottom: 14, paddingHorizontal: 16 },
  viewerBarText: { flex: 1 },
  viewerTitle: { fontSize: 15, fontWeight: '800', color: '#f8fafc' },
  viewerSubtitle: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
  viewerAction: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  viewerBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  viewerImage: { width: '100%', height: '100%' },
  viewerError: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
  restrictedNote: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 22, padding: 14, borderRadius: 12, backgroundColor: '#f1f5f9' },
  restrictedText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#64748b', lineHeight: 18 },
  moveLabel: { fontSize: 11, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8 },
  moveRow: { flexDirection: 'row', gap: 8 },
  moveBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  moveBtnActive: { backgroundColor: '#ea580c' },
  moveBtnText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  moveBtnTextActive: { color: '#fff' },
});

export default RestaurantRequestsManager;