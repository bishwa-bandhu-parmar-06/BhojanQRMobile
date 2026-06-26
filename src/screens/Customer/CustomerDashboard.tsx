import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import {
  User,
  Receipt,
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  Calendar,
  RotateCcw,
  LogOut,
} from 'lucide-react-native';

import {
  getCustomerDashboardSummary,
  getCustomerBills,
  getExpenditureAnalytics,
  logoutCustomer,
} from '../../API/customerApi';
import { logout } from '../../Features/AuthSlice';
import { clearCart, addToCart } from '../../Features/CartSlice';
import { clearToken } from '../../utils/tokenStorage';

type Tab = 'overview' | 'bills' | 'expenditure';

const CustomerDashboard = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.auth?.user);

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [summary, setSummary] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [billsPage, setBillsPage] = useState(1);
  const [billsPages, setBillsPages] = useState(1);
  const [expenditure, setExpenditure] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await getCustomerDashboardSummary();
      setSummary(res.data?.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load profile summary' });
    }
  }, []);

  const fetchBills = useCallback(async (page = 1) => {
    try {
      const res = await getCustomerBills({ page, limit: 10 });
      setBills(res.data?.data || []);
      setBillsPage(page);
      setBillsPages(res.data?.pages || 1);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load your bills' });
    }
  }, []);

  const fetchExpenditure = useCallback(async () => {
    try {
      const res = await getExpenditureAnalytics();
      setExpenditure(res.data?.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load expenditure analytics' });
    }
  }, []);

  const loadActiveTab = useCallback(async () => {
    if (activeTab === 'overview') await fetchSummary();
    if (activeTab === 'bills') await fetchBills(1);
    if (activeTab === 'expenditure') await fetchExpenditure();
  }, [activeTab, fetchSummary, fetchBills, fetchExpenditure]);

  useEffect(() => {
    setIsLoading(true);
    loadActiveTab().finally(() => setIsLoading(false));
  }, [activeTab, loadActiveTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveTab();
    setRefreshing(false);
  };

  // Re-adds this order's items to the cart and takes the diner back to that
  // restaurant's menu to check out again. Cart is global (not scoped per
  // restaurant), so it's cleared first to avoid mixing items from two
  // different restaurants in one order.
  const handleReorder = (order: any) => {
    if (!order.restaurant) {
      Toast.show({ type: 'error', text1: 'This restaurant is no longer available for reorder.' });
      return;
    }
    dispatch(clearCart());
    order.items.forEach((item: any) => {
      for (let i = 0; i < item.quantity; i++) {
        dispatch(
          addToCart({
            _id: item.menuItem,
            name: item.name,
            price: item.price,
            imageUrl: item.imageUrl,
            note: item.note || '',
          }),
        );
      }
    });
    Toast.show({ type: 'success', text1: 'Items added to cart' });
    navigation.navigate('GuestMenu', { restaurantId: order.restaurant });
  };

  const handleLogout = async () => {
    try {
      await logoutCustomer();
    } catch {
      // best-effort
    }
    await clearToken();
    dispatch(logout());
    navigation.navigate('Home');
  };

  const tabs: { key: Tab; label: string; Icon: any }[] = [
    { key: 'overview', label: 'Overview', Icon: User },
    { key: 'bills', label: 'Bill Vault', Icon: Receipt },
    { key: 'expenditure', label: 'Expenditure', Icon: TrendingUp },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Customer'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollTabs}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            >
              <tab.Icon size={16} color={activeTab === tab.key ? '#fff' : '#64748b'} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#ea580c" />
        </View>
      ) : (
        <>
          {activeTab === 'overview' && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              <View style={styles.profileCard}>
                <Text style={styles.profileName}>{summary?.name || user?.name}</Text>
                <Text style={styles.profileMeta}>
                  Joined {summary?.joinedDate ? new Date(summary.joinedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                </Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <ShoppingBag size={18} color="#ea580c" />
                  <Text style={styles.statValue}>{summary?.totalOrders ?? 0}</Text>
                  <Text style={styles.statLabel}>Total Orders</Text>
                </View>
                <View style={styles.statCard}>
                  <IndianRupee size={18} color="#16a34a" />
                  <Text style={styles.statValue}>₹{summary?.lifetimeSpending ?? 0}</Text>
                  <Text style={styles.statLabel}>Lifetime Spend</Text>
                </View>
              </View>
            </ScrollView>
          )}

          {activeTab === 'bills' && (
            <FlatList
              data={bills}
              keyExtractor={item => item._id}
              contentContainerStyle={styles.scrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListEmptyComponent={<Text style={styles.emptyText}>No bills yet.</Text>}
              renderItem={({ item }) => (
                <View style={styles.billCard}>
                  <View style={styles.billHeaderRow}>
                    <Text style={styles.billRestaurant} numberOfLines={1}>{item.restaurantName || 'Restaurant'}</Text>
                    <Text style={styles.billAmount}>₹{item.totalPrice}</Text>
                  </View>
                  <View style={styles.billMetaRow}>
                    <Calendar size={12} color="#94a3b8" />
                    <Text style={styles.billMetaText}>
                      {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                    <Text style={[styles.billStatus, item.paymentStatus === 'Paid' ? styles.billStatusPaid : styles.billStatusOther]}>
                      {item.paymentStatus}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.reorderBtn} onPress={() => handleReorder(item)}>
                    <RotateCcw size={14} color="#ea580c" />
                    <Text style={styles.reorderBtnText}>Reorder</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListFooterComponent={
                billsPages > 1 ? (
                  <View style={styles.pagerRow}>
                    <TouchableOpacity
                      disabled={billsPage <= 1}
                      onPress={() => fetchBills(billsPage - 1)}
                      style={[styles.pagerBtn, billsPage <= 1 && styles.pagerBtnDisabled]}
                    >
                      <Text style={styles.pagerBtnText}>Previous</Text>
                    </TouchableOpacity>
                    <Text style={styles.pagerLabel}>{billsPage} / {billsPages}</Text>
                    <TouchableOpacity
                      disabled={billsPage >= billsPages}
                      onPress={() => fetchBills(billsPage + 1)}
                      style={[styles.pagerBtn, billsPage >= billsPages && styles.pagerBtnDisabled]}
                    >
                      <Text style={styles.pagerBtnText}>Next</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
            />
          )}

          {activeTab === 'expenditure' && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              {expenditure ? (
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>₹{expenditure.todaySpend ?? 0}</Text>
                    <Text style={styles.statLabel}>Today</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>₹{expenditure.weekSpend ?? 0}</Text>
                    <Text style={styles.statLabel}>This Week</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>₹{expenditure.monthSpend ?? 0}</Text>
                    <Text style={styles.statLabel}>This Month</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>₹{expenditure.lifetimeSpend ?? 0}</Text>
                    <Text style={styles.statLabel}>Lifetime</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyText}>Couldn't load your spending data.</Text>
              )}
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: '#ffffff' },
  greeting: { fontSize: 12, color: '#f97316', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  userName: { fontSize: 22, fontWeight: '900', color: '#1e293b', maxWidth: 250 },
  logoutButton: { padding: 10, backgroundColor: '#fef2f2', borderRadius: 12 },

  tabContainer: { borderBottomWidth: 1, borderColor: '#f1f5f9', backgroundColor: '#ffffff' },
  scrollTabs: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tabButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, gap: 8 },
  tabButtonActive: { backgroundColor: '#ea580c' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#fff' },

  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },

  profileCard: { backgroundColor: '#ea580c', borderRadius: 16, padding: 20, marginBottom: 16 },
  profileName: { fontSize: 20, fontWeight: '900', color: '#fff' },
  profileMeta: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  statValue: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginTop: 6 },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 },

  emptyText: { textAlign: 'center', color: '#94a3b8', fontWeight: '600', marginTop: 40 },

  billCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  billHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billRestaurant: { fontSize: 15, fontWeight: '800', color: '#1e293b', flex: 1 },
  billAmount: { fontSize: 16, fontWeight: '900', color: '#16a34a' },
  billMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  billMetaText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  billStatus: { fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 'auto' },
  billStatusPaid: { backgroundColor: '#dcfce7', color: '#15803d' },
  billStatusOther: { backgroundColor: '#fef3c7', color: '#92400e' },
  reorderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, borderWidth: 1, borderColor: '#fdba74', borderRadius: 10, paddingVertical: 8 },
  reorderBtnText: { color: '#ea580c', fontWeight: '700', fontSize: 13 },

  pagerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  pagerBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  pagerBtnDisabled: { opacity: 0.4 },
  pagerBtnText: { fontWeight: '700', color: '#475569', fontSize: 12 },
  pagerLabel: { fontWeight: '700', color: '#1e293b' },
});

export default CustomerDashboard;
