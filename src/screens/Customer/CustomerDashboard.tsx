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
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import BhojanQRLoader from '../../components/BhojanQRLoader';
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
  Pencil,
  Save,
  X,
  Leaf,
  AlertTriangle,
  Flame,
  NotebookPen,
  ShieldCheck,
  Award,
  UtensilsCrossed,
  Store,
} from 'lucide-react-native';

const PIE_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#64748b'];

import {
  getCustomerDashboardSummary,
  getCustomerBills,
  getExpenditureAnalytics,
  getCustomerProfile,
  updateCustomerProfile,
  logoutCustomer,
} from '../../API/customerApi';
import { logout, updateUser } from '../../Features/AuthSlice';
import { clearCart, addToCart } from '../../Features/CartSlice';
import { clearToken } from '../../utils/tokenStorage';
import InvoiceModal from '../../components/Customer/InvoiceModal';
import { DIETARY_TAGS, ALLERGENS, SPICE_LEVELS } from '../../constants/foodTags';

type Tab = 'overview' | 'bills' | 'expenditure' | 'preferences';

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

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', mobile: '', profilePicture: '' });

  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const [dietary, setDietary] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [spicePreference, setSpicePreference] = useState<string | null>(null);
  const [specialNotes, setSpecialNotes] = useState('');
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  const [billFilters, setBillFilters] = useState({
    startDate: '',
    endDate: '',
    restaurant: '',
    orderId: '',
    item: '',
  });

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
      const params: Record<string, any> = { page, limit: 10 };
      Object.entries(billFilters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const res = await getCustomerBills(params);
      setBills(res.data?.data || []);
      setBillsPage(page);
      setBillsPages(res.data?.pages || 1);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load your bills' });
    }
  }, [billFilters]);

  const handleBillFilterChange = (key: keyof typeof billFilters, value: string) => {
    setBillFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Mirrors the website's BillVault.jsx 350ms debounce - only re-fetches
  // when a filter value actually changes, not on every tab switch (the
  // initial bills load for a fresh tab switch is already handled by
  // loadActiveTab below).
  useEffect(() => {
    if (activeTab !== 'bills') return;
    const timer = setTimeout(() => {
      fetchBills(1);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billFilters]);

  const fetchExpenditure = useCallback(async () => {
    try {
      const res = await getExpenditureAnalytics();
      setExpenditure(res.data?.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load expenditure analytics' });
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await getCustomerProfile();
      const prefs = res.data?.data?.preferences || {};
      setDietary(prefs.dietary || []);
      setAllergies(prefs.allergies || []);
      setSpicePreference(prefs.spicePreference || null);
      setSpecialNotes(prefs.specialNotes || '');
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load preferences' });
    }
  }, []);

  const loadActiveTab = useCallback(async () => {
    if (activeTab === 'overview') await fetchSummary();
    if (activeTab === 'bills') await fetchBills(1);
    if (activeTab === 'expenditure') await fetchExpenditure();
    if (activeTab === 'preferences') await fetchPreferences();
  }, [activeTab, fetchSummary, fetchBills, fetchExpenditure, fetchPreferences]);

  useEffect(() => {
    setIsLoading(true);
    loadActiveTab().finally(() => setIsLoading(false));
  }, [activeTab, loadActiveTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveTab();
    setRefreshing(false);
  };

  const startEditingProfile = () => {
    setProfileForm({
      name: summary?.name || '',
      mobile: summary?.mobile || '',
      profilePicture: summary?.profilePicture || '',
    });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await updateCustomerProfile(profileForm);
      dispatch(updateUser(res.data?.data));
      setSummary((prev: any) => ({ ...prev, ...res.data?.data }));
      Toast.show({ type: 'success', text1: 'Profile updated' });
      setIsEditingProfile(false);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update profile' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const toggleDietary = (tag: string) => {
    setDietary((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const toggleAllergy = (allergen: string) => {
    setAllergies((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen],
    );
  };

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      const res = await updateCustomerProfile({
        preferences: { dietary, allergies, spicePreference, specialNotes },
      });
      dispatch(updateUser({ preferences: res.data?.data?.preferences }));
      Toast.show({ type: 'success', text1: 'Preferences saved' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save preferences' });
    } finally {
      setIsSavingPrefs(false);
    }
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
    { key: 'preferences', label: 'Preferences', Icon: Leaf },
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
          <BhojanQRLoader fullScreen={false} />
        </View>
      ) : (
        <>
          {activeTab === 'overview' && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              <View style={styles.profileCard}>
                {isEditingProfile ? (
                  <View style={styles.profileEditForm}>
                    <TextInput
                      style={styles.profileInput}
                      value={profileForm.name}
                      onChangeText={(v) => setProfileForm((f) => ({ ...f, name: v }))}
                      placeholder="Full name"
                      placeholderTextColor="rgba(255,255,255,0.7)"
                    />
                    <TextInput
                      style={styles.profileInput}
                      value={profileForm.mobile}
                      onChangeText={(v) => setProfileForm((f) => ({ ...f, mobile: v }))}
                      placeholder="Mobile number"
                      placeholderTextColor="rgba(255,255,255,0.7)"
                      keyboardType="phone-pad"
                    />
                    <TextInput
                      style={styles.profileInput}
                      value={profileForm.profilePicture}
                      onChangeText={(v) => setProfileForm((f) => ({ ...f, profilePicture: v }))}
                      placeholder="Profile picture URL"
                      placeholderTextColor="rgba(255,255,255,0.7)"
                    />
                    <View style={styles.profileEditActions}>
                      <TouchableOpacity
                        style={styles.profileSaveBtn}
                        onPress={handleSaveProfile}
                        disabled={isSavingProfile}
                      >
                        {isSavingProfile ? (
                          <ActivityIndicator size="small" color="#ea580c" />
                        ) : (
                          <Save size={14} color="#ea580c" />
                        )}
                        <Text style={styles.profileSaveBtnText}>{isSavingProfile ? 'Saving...' : 'Save'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.profileCancelBtn}
                        onPress={() => setIsEditingProfile(false)}
                        disabled={isSavingProfile}
                      >
                        <X size={14} color="#fff" />
                        <Text style={styles.profileCancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.profileViewRow}>
                    <View style={styles.profileAvatar}>
                      {summary?.profilePicture ? (
                        <Image source={{ uri: summary.profilePicture }} style={styles.profileAvatarImg} />
                      ) : (
                        <Text style={styles.profileAvatarLetter}>
                          {(summary?.name || user?.name || 'B').charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.profileInfo}>
                      <Text style={styles.profileName}>{summary?.name || user?.name}</Text>
                      <Text style={styles.profileMeta}>
                        Joined {summary?.joinedDate ? new Date(summary.joinedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.profileEditBtn} onPress={startEditingProfile}>
                      <Pencil size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
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
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                <View style={styles.billFiltersCard}>
                  <View style={styles.billFiltersRow}>
                    <TextInput
                      style={styles.billFilterInput}
                      value={billFilters.startDate}
                      onChangeText={(v) => handleBillFilterChange('startDate', v)}
                      placeholder="From (YYYY-MM-DD)"
                      placeholderTextColor="#9ca3af"
                    />
                    <TextInput
                      style={styles.billFilterInput}
                      value={billFilters.endDate}
                      onChangeText={(v) => handleBillFilterChange('endDate', v)}
                      placeholder="To (YYYY-MM-DD)"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <TextInput
                    style={styles.billFilterInputFull}
                    value={billFilters.restaurant}
                    onChangeText={(v) => handleBillFilterChange('restaurant', v)}
                    placeholder="Restaurant name"
                    placeholderTextColor="#9ca3af"
                  />
                  <TextInput
                    style={styles.billFilterInputFull}
                    value={billFilters.orderId}
                    onChangeText={(v) => handleBillFilterChange('orderId', v)}
                    placeholder="Order ID"
                    placeholderTextColor="#9ca3af"
                  />
                  <TextInput
                    style={styles.billFilterInputFull}
                    value={billFilters.item}
                    onChangeText={(v) => handleBillFilterChange('item', v)}
                    placeholder="Item name"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              }
              ListEmptyComponent={<Text style={styles.emptyText}>No bills match these filters.</Text>}
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
                  <View style={styles.billActionsRow}>
                    <TouchableOpacity style={styles.reorderBtn} onPress={() => handleReorder(item)}>
                      <RotateCcw size={14} color="#ea580c" />
                      <Text style={styles.reorderBtnText}>Reorder</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.invoiceBtn} onPress={() => setSelectedOrder(item)}>
                      <Receipt size={14} color="#0369a1" />
                      <Text style={styles.invoiceBtnText}>Invoice</Text>
                    </TouchableOpacity>
                    {item.restaurant && (
                      <TouchableOpacity
                        style={styles.viewMenuBtn}
                        onPress={() => navigation.navigate('PublicMenu', { restaurantId: item.restaurant })}
                      >
                        <Store size={14} color="#475569" />
                        <Text style={styles.viewMenuBtnText}>Menu</Text>
                      </TouchableOpacity>
                    )}
                  </View>
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
                <>
                  {expenditure.monthChangePercent !== null && expenditure.monthChangePercent !== undefined && (
                    <Text style={styles.expChangeText}>
                      Spent ₹{(expenditure.monthSpend ?? 0).toLocaleString()} this month.{' '}
                      <Text style={expenditure.monthChangePercent >= 0 ? styles.expChangeUp : styles.expChangeDown}>
                        Dining expenses {expenditure.monthChangePercent >= 0 ? 'increased' : 'decreased'}{' '}
                        {Math.abs(expenditure.monthChangePercent)}% from last month.
                      </Text>
                    </Text>
                  )}

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
                      <Text style={styles.statValue}>₹{expenditure.yearSpend ?? 0}</Text>
                      <Text style={styles.statLabel}>This Year</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>₹{expenditure.lifetimeSpend ?? 0}</Text>
                      <Text style={styles.statLabel}>Lifetime</Text>
                    </View>
                  </View>

                  {expenditure.dailyTrend?.length > 0 && (
                    <View style={styles.chartCard}>
                      <Text style={styles.chartTitle}>Last 30 Days Spending</Text>
                      <LineChart
                        data={{
                          labels: expenditure.dailyTrend.map((d: any, idx: number) =>
                            idx % 5 === 0
                              ? new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                              : '',
                          ),
                          datasets: [{ data: expenditure.dailyTrend.map((d: any) => d.amount) }],
                        }}
                        width={Dimensions.get('window').width - 64}
                        height={200}
                        bezier
                        withDots={false}
                        withInnerLines={false}
                        chartConfig={{
                          backgroundColor: '#fff',
                          backgroundGradientFrom: '#fff',
                          backgroundGradientTo: '#fff',
                          decimalPlaces: 0,
                          color: () => '#f97316',
                          labelColor: () => '#9ca3af',
                          fillShadowGradientFrom: '#f97316',
                          fillShadowGradientFromOpacity: 0.3,
                          fillShadowGradientTo: '#f97316',
                          fillShadowGradientToOpacity: 0,
                          propsForBackgroundLines: { stroke: 'transparent' },
                        }}
                        style={styles.chartStyle}
                      />
                    </View>
                  )}

                  {expenditure.restaurantBreakdown?.length > 0 && (
                    <View style={styles.chartCard}>
                      <Text style={styles.chartTitle}>Top Restaurants</Text>
                      <PieChart
                        data={expenditure.restaurantBreakdown.map((r: any, idx: number) => ({
                          name: r.name,
                          population: r.amount,
                          color: PIE_COLORS[idx % PIE_COLORS.length],
                          legendFontColor: '#475569',
                          legendFontSize: 12,
                        }))}
                        width={Dimensions.get('window').width - 64}
                        height={180}
                        chartConfig={{ color: () => '#000' }}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="12"
                      />
                    </View>
                  )}

                  <View style={styles.miniStatsRow}>
                    <View style={styles.miniStatCard}>
                      <View style={styles.miniStatLabelRow}>
                        <Award size={12} color="#94a3b8" />
                        <Text style={styles.miniStatLabel}>Top Restaurant</Text>
                      </View>
                      <Text style={styles.miniStatValue} numberOfLines={1}>
                        {expenditure.topRestaurant ? expenditure.topRestaurant.name : 'Not enough data yet'}
                      </Text>
                    </View>
                    <View style={styles.miniStatCard}>
                      <View style={styles.miniStatLabelRow}>
                        <UtensilsCrossed size={12} color="#94a3b8" />
                        <Text style={styles.miniStatLabel}>Most Ordered Food</Text>
                      </View>
                      <Text style={styles.miniStatValue} numberOfLines={1}>
                        {expenditure.mostOrderedFood
                          ? `${expenditure.mostOrderedFood.name} (${expenditure.mostOrderedFood.qty}x)`
                          : 'Not enough data yet'}
                      </Text>
                    </View>
                    <View style={styles.miniStatCard}>
                      <View style={styles.miniStatLabelRow}>
                        <Receipt size={12} color="#94a3b8" />
                        <Text style={styles.miniStatLabel}>Average Bill Size</Text>
                      </View>
                      <Text style={styles.miniStatValue}>
                        ₹{(expenditure.averageBillSize ?? 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <Text style={styles.emptyText}>Couldn't load your spending data.</Text>
              )}
            </ScrollView>
          )}

          {activeTab === 'preferences' && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              <View style={styles.prefSectionCard}>
                <View style={styles.prefSectionHeader}>
                  <Leaf size={18} color="#16a34a" />
                  <Text style={styles.prefSectionTitle}>Dietary Preferences</Text>
                </View>
                <Text style={styles.prefSectionHint}>Dishes matching these get highlighted on the menu.</Text>
                <View style={styles.pillRow}>
                  {DIETARY_TAGS.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleDietary(tag)}
                      style={[styles.pill, dietary.includes(tag) && styles.pillActiveGreen]}
                    >
                      <Text style={[styles.pillText, dietary.includes(tag) && styles.pillTextActive]}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.prefSectionCard}>
                <View style={styles.prefSectionHeader}>
                  <AlertTriangle size={18} color="#d97706" />
                  <Text style={styles.prefSectionTitle}>Allergies</Text>
                </View>
                <Text style={styles.prefSectionHint}>We'll show a warning badge on any tagged dish that contains these.</Text>
                <View style={styles.pillRow}>
                  {ALLERGENS.map((allergen) => (
                    <TouchableOpacity
                      key={allergen}
                      onPress={() => toggleAllergy(allergen)}
                      style={[styles.pill, allergies.includes(allergen) && styles.pillActiveAmber]}
                    >
                      <Text style={[styles.pillText, allergies.includes(allergen) && styles.pillTextActive]}>{allergen}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.prefSectionCard}>
                <View style={styles.prefSectionHeader}>
                  <Flame size={18} color="#ef4444" />
                  <Text style={styles.prefSectionTitle}>Spice Preference</Text>
                </View>
                <Text style={styles.prefSectionHint}>Pick the heat level you enjoy most.</Text>
                <View style={styles.pillRow}>
                  {SPICE_LEVELS.map((level) => (
                    <TouchableOpacity
                      key={level}
                      onPress={() => setSpicePreference(spicePreference === level ? null : level)}
                      style={[styles.pill, spicePreference === level && styles.pillActiveRed]}
                    >
                      <Text style={[styles.pillText, spicePreference === level && styles.pillTextActive]}>{level}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.prefSectionCard}>
                <View style={styles.prefSectionHeader}>
                  <NotebookPen size={18} color="#ea580c" />
                  <Text style={styles.prefSectionTitle}>Special Notes</Text>
                </View>
                <Text style={styles.prefSectionHint}>
                  Auto-fills the order note for items you add without typing your own (e.g. "Make it Jain").
                </Text>
                <TextInput
                  style={styles.prefNotesInput}
                  value={specialNotes}
                  onChangeText={(v) => setSpecialNotes(v.slice(0, 300))}
                  maxLength={300}
                  multiline
                  numberOfLines={3}
                  placeholder="E.g. Make it Jain, less oil please..."
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.prefNotesCounter}>{specialNotes.length}/300</Text>
              </View>

              <View style={styles.prefFooterCard}>
                <View style={styles.prefFooterTextRow}>
                  <ShieldCheck size={16} color="#c2410c" />
                  <Text style={styles.prefFooterText}>
                    Only dishes a restaurant has actually tagged will show matches or warnings.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.prefSaveBtn}
                  onPress={handleSavePreferences}
                  disabled={isSavingPrefs}
                >
                  {isSavingPrefs ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Save size={16} color="#fff" />
                  )}
                  <Text style={styles.prefSaveBtnText}>{isSavingPrefs ? 'Saving...' : 'Save Preferences'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </>
      )}

      <InvoiceModal
        order={selectedOrder}
        visible={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
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

  profileViewRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  profileAvatarImg: { width: '100%', height: '100%' },
  profileAvatarLetter: { fontSize: 22, fontWeight: '900', color: '#fff' },
  profileInfo: { flex: 1 },
  profileEditBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  profileEditForm: { gap: 10 },
  profileInput: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontWeight: '700', fontSize: 14 },
  profileEditActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  profileSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flex: 1 },
  profileSaveBtnText: { color: '#ea580c', fontWeight: '900', fontSize: 13 },
  profileCancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flex: 1 },
  profileCancelBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  statValue: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginTop: 6 },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 },

  expChangeText: { fontSize: 13, color: '#475569', fontWeight: '500', marginBottom: 16, lineHeight: 19 },
  expChangeUp: { color: '#ef4444', fontWeight: '800' },
  expChangeDown: { color: '#16a34a', fontWeight: '800' },

  chartCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 16, marginBottom: 16, alignItems: 'center' },
  chartTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', alignSelf: 'flex-start', marginBottom: 8 },
  chartStyle: { borderRadius: 12 },

  miniStatsRow: { gap: 10 },
  miniStatCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  miniStatLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  miniStatLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  miniStatValue: { fontSize: 13, fontWeight: '700', color: '#1e293b' },

  emptyText: { textAlign: 'center', color: '#94a3b8', fontWeight: '600', marginTop: 40 },

  billFiltersCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', gap: 10 },
  billFiltersRow: { flexDirection: 'row', gap: 10 },
  billFilterInput: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#1e293b' },
  billFilterInputFull: { backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#1e293b' },

  billCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  billHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billRestaurant: { fontSize: 15, fontWeight: '800', color: '#1e293b', flex: 1 },
  billAmount: { fontSize: 16, fontWeight: '900', color: '#16a34a' },
  billMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  billMetaText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  billStatus: { fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 'auto' },
  billStatusPaid: { backgroundColor: '#dcfce7', color: '#15803d' },
  billStatusOther: { backgroundColor: '#fef3c7', color: '#92400e' },
  billActionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  reorderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#fdba74', borderRadius: 10, paddingVertical: 8 },
  reorderBtnText: { color: '#ea580c', fontWeight: '700', fontSize: 13 },
  invoiceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#7dd3fc', borderRadius: 10, paddingVertical: 8 },
  invoiceBtnText: { color: '#0369a1', fontWeight: '700', fontSize: 13 },
  viewMenuBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 8 },
  viewMenuBtnText: { color: '#475569', fontWeight: '700', fontSize: 13 },

  pagerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  pagerBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  pagerBtnDisabled: { opacity: 0.4 },
  pagerBtnText: { fontWeight: '700', color: '#475569', fontSize: 12 },
  pagerLabel: { fontWeight: '700', color: '#1e293b' },

  prefSectionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  prefSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  prefSectionTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  prefSectionHint: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginBottom: 12 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  pillActiveGreen: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  pillActiveAmber: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  pillActiveRed: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  pillText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  pillTextActive: { color: '#fff' },

  prefNotesInput: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, fontSize: 13, color: '#1e293b', textAlignVertical: 'top', minHeight: 80 },
  prefNotesCounter: { fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 4 },

  prefFooterCard: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 16, padding: 16, gap: 12 },
  prefFooterTextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  prefFooterText: { flex: 1, fontSize: 12, color: '#c2410c', fontWeight: '600' },
  prefSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ea580c', paddingVertical: 12, borderRadius: 12 },
  prefSaveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

export default CustomerDashboard;
