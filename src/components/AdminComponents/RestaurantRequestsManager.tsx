import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, RefreshControl, Modal, ScrollView } from 'react-native';
import { Store, CheckCircle, XCircle, X, User, Phone, Mail, Calendar, UtensilsCrossed, ShoppingBag, TrendingUp, IndianRupee } from 'lucide-react-native';
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
import BhojanQRLoader from '../BhojanQRLoader';

type TabType = 'pending' | 'approved' | 'rejected';

const RestaurantRequestsManager = () => {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [isListLoading, setIsListLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

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
      {/* SUB TABS */}
      <View style={styles.tabsContainer}>
        {(['pending', 'approved', 'rejected'] as TabType[]).map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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

      <Modal visible={detailsLoading || !!selectedDetails} transparent animationType="fade" onRequestClose={() => setSelectedDetails(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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

                <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
                  <Text style={styles.modalResName}>{selectedDetails.restaurant?.restaurantName}</Text>
                  <View style={styles.modalRow}>
                    <User size={13} color="#9ca3af" />
                    <Text style={styles.modalRowText}>Owner: {selectedDetails.restaurant?.ownerName}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Phone size={13} color="#9ca3af" />
                    <Text style={styles.modalRowText}>{selectedDetails.restaurant?.mobile}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Mail size={13} color="#9ca3af" />
                    <Text style={styles.modalRowText}>{selectedDetails.restaurant?.email}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Calendar size={13} color="#9ca3af" />
                    <Text style={styles.modalRowText}>
                      Joined {selectedDetails.restaurant?.createdAt ? new Date(selectedDetails.restaurant.createdAt).toLocaleDateString() : "-"}
                    </Text>
                  </View>

                  <View style={styles.statsGrid}>
                    <View style={[styles.statBox, { backgroundColor: "#eff6ff" }]}>
                      <UtensilsCrossed size={16} color="#2563eb" />
                      <Text style={styles.statValue}>{selectedDetails.stats?.totalMenus ?? 0}</Text>
                      <Text style={styles.statLabel}>Total Items</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: "#fff7ed" }]}>
                      <ShoppingBag size={16} color="#ea580c" />
                      <Text style={styles.statValue}>{selectedDetails.stats?.todaysOrders ?? 0}</Text>
                      <Text style={styles.statLabel}>Today's Orders</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: "#faf5ff" }]}>
                      <TrendingUp size={16} color="#9333ea" />
                      <Text style={styles.statValue}>{selectedDetails.stats?.totalOrders ?? 0}</Text>
                      <Text style={styles.statLabel}>All-Time Orders</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: "#f0fdf4" }]}>
                      <IndianRupee size={16} color="#16a34a" />
                      <Text style={styles.statValue}>₹{(selectedDetails.stats?.totalRevenue ?? 0).toLocaleString()}</Text>
                      <Text style={styles.statLabel}>Total Revenue</Text>
                    </View>
                  </View>

                  <Text style={styles.moveLabel}>Move to status:</Text>
                  <View style={styles.moveRow}>
                    {(['pending', 'approved', 'rejected'] as const).map((s) => (
                      <TouchableOpacity
                        key={s}
                        disabled={statusUpdating || selectedDetails.restaurant?.status === s}
                        onPress={() => handleMoveStatus(s)}
                        style={[
                          styles.moveBtn,
                          selectedDetails.restaurant?.status === s && styles.moveBtnActive,
                        ]}
                      >
                        <Text style={[styles.moveBtnText, selectedDetails.restaurant?.status === s && styles.moveBtnTextActive]}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 16 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', marginHorizontal: 20, borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  tabText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  tabTextActive: { color: '#f97316' },
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 420 },
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
  moveLabel: { fontSize: 11, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8 },
  moveRow: { flexDirection: 'row', gap: 8 },
  moveBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  moveBtnActive: { backgroundColor: '#ea580c' },
  moveBtnText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  moveBtnTextActive: { color: '#fff' },
});

export default RestaurantRequestsManager;