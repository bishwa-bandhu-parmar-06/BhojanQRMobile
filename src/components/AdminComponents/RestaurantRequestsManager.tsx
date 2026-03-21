import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { Store, CheckCircle, XCircle } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { getPendingRestaurants, getApprovedRestaurants, getRejectedRestaurants, approveRestaurant, rejectRestaurant } from '../../API/adminApi';

type TabType = 'pending' | 'approved' | 'rejected';

const RestaurantRequestsManager = () => {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [isListLoading, setIsListLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false); 

  const fetchRestaurants = async (isRefresh = false) => {
    if (!isRefresh) setIsListLoading(true);
    try {
      let res;
      if (activeTab === 'pending') res = await getPendingRestaurants();
      else if (activeTab === 'approved') res = await getApprovedRestaurants();
      else res = await getRejectedRestaurants();
      setRestaurants(res.data?.data || []);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to load restaurant list' });
    } finally {
      setIsListLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [activeTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRestaurants(true);
    setRefreshing(false);
  }, [activeTab]);

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
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Update failed' });
    } finally {
      setActionId(null);
    }
  };

  const renderRestaurantCard = ({ item }: any) => (
    <View style={styles.resCard}>
      <View style={styles.resInfo}>
        <Text style={styles.resName}>{item.restaurantName}</Text>
        <Text style={styles.resOwner}>{item.ownerName}</Text>
        <Text style={styles.resMobile}>{item.mobile}</Text>
        <Text style={styles.resId}>ID: {item._id.slice(-6)}</Text>
      </View>

      <View style={styles.resActions}>
        {activeTab === 'pending' ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleStatusUpdate(item._id, 'approve')} disabled={actionId === item._id}>
              {actionId === item._id ? <ActivityIndicator size="small" color="#16a34a" /> : <CheckCircle size={20} color="#16a34a" />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleStatusUpdate(item._id, 'reject')} disabled={actionId === item._id}>
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
    </View>
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
          <ActivityIndicator size="large" color="#f97316" />
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
});

export default RestaurantRequestsManager;