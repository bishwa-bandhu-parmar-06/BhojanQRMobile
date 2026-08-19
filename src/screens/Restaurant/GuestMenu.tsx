import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  Store,
  Tag,
  Plus,
  ShoppingBag,
  Filter,
  LayoutGrid,
  List,
  AlertCircle,
} from 'lucide-react-native';

import { getPublicMenu } from '../../API/menuApi';
import { validateTableNumber } from '../../API/restaurentApi';
import { addToCart } from '../../Features/CartSlice';
import useNow from '../../hooks/useNow';
import { useMenuOfferSocket } from '../../hooks/useMenuOfferSocket';
import CallWaiterButton from '../../components/CallWaiterButton';
import VirtualWaiter from '../../components/VirtualWaiter';
import BhojanQRLoader from '../../components/BhojanQRLoader';
import MenuImage from '../../components/MenuImage';
import {
  evaluateBestOfferForItem,
  formatCountdown,
  type Offer,
} from '../../utils/pricingEngine';
import { formatMoney } from '../../utils/money';

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  restaurant?: { restaurantName: string };
  dietaryTags?: string[];
  allergens?: string[];
}

const GuestMenu = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const { restaurantId, table, sig } = route.params || {};

  const cartItems = useSelector((state: any) => state.cart?.items || []);
  const cartCount = cartItems.length;

  // Dietary/allergen highlighting and the "compatible only" filter used to
  // live here, driven by a logged-in customer's saved preferences. Customer
  // accounts no longer exist in the mobile app, so nothing could ever supply
  // those preferences - the whole feature is gone rather than left as code
  // that can only ever evaluate to "no preferences set". The website still
  // has it, and MenuItem below still carries dietaryTags/allergens, so it can
  // come back with whatever replaces customer accounts here.

  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [restaurantName, setRestaurantName] = useState('Loading...');
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [restaurantTimezone, setRestaurantTimezone] = useState('Asia/Kolkata');
  const now = useNow(1000);

  // Table QR Signature Gate - mirrors the website's PublicMenu.jsx
  // isValidTable/checkingTable check, so editing the table number in a
  // deep-linked bhojanqr://menu/:id?table=...&sig=... URL is rejected on
  // mobile exactly like it already is on the website, instead of silently
  // letting a tampered table number reach order creation.
  const [isValidTable, setIsValidTable] = useState(true);
  const [checkingTable, setCheckingTable] = useState(true);

  //  Pagination & Loading States
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false); 
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Filter States
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceRange, setPriceRange] = useState<string>('3000');

  //  Fetch Menu Logic with Pagination
  const fetchMenu = useCallback(async (pageNumber: number, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNumber === 1) {
        setLoading(true);
      } else {
        setIsFetchingMore(true);
      }

      const LIMIT = 8;
      // Make sure your getPublicMenu accepts page and limit arguments!
      const res = await getPublicMenu(restaurantId, pageNumber, LIMIT);
      const newItems: MenuItem[] = res.data?.data || [];

      setActiveOffers(res.data?.activeOffers || []);
      if (res.data?.restaurantTimezone) {
        setRestaurantTimezone(res.data.restaurantTimezone);
      }

      if (newItems.length > 0 && newItems[0].restaurant) {
        setRestaurantName(newItems[0].restaurant.restaurantName);
      }

      // Check if we hit the end
      if (newItems.length < LIMIT) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      setAllMenuItems((prev) => {
        if (isRefresh || pageNumber === 1) return newItems;

        const existingIds = new Set(prev.map(item => item._id));
        const filteredNewItems = newItems.filter(item => !existingIds.has(item._id));
        return [...prev, ...filteredNewItems];
      });
      
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load menu.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsFetchingMore(false);
    }
  }, [restaurantId]);

  // Initial Fetch - validates the table's HMAC signature first (if a table
  // param was passed) before ever calling fetchMenu, same order as the
  // website.
  useEffect(() => {
    const fetchMenuAndValidateTable = async () => {
      setCheckingTable(true);
      try {
        if (table) {
          const tableRes = await validateTableNumber(restaurantId, table, sig);
          if (!tableRes.data?.isValid) {
            setIsValidTable(false);
            setCheckingTable(false);
            return;
          }
        }
        setIsValidTable(true);
        await fetchMenu(1);
      } catch {
        setIsValidTable(false);
      } finally {
        setCheckingTable(false);
      }
    };
    if (restaurantId) fetchMenuAndValidateTable();
  }, [restaurantId, table, sig, fetchMenu]);

  // Live Happy Hour updates: unlike the website (which refetches the whole,
  // unpaginated menu on this event), only the offers/timezone are
  // re-pulled here so an in-progress infinite-scroll list of menu items
  // isn't reset back to page 1 every time the owner touches an offer.
  const refreshOffersSilently = useCallback(async () => {
    try {
      const res = await getPublicMenu(restaurantId, 1, 8);
      setActiveOffers(res.data?.activeOffers || []);
      if (res.data?.restaurantTimezone) {
        setRestaurantTimezone(res.data.restaurantTimezone);
      }
    } catch {
      // Silent - this is a background live-update, not a user-initiated fetch.
    }
  }, [restaurantId]);

  useMenuOfferSocket(restaurantId, refreshOffersSilently);

  // Pull to Refresh
  const onRefresh = useCallback(() => {
    setPage(1);
    fetchMenu(1, true);
  }, [fetchMenu]);

  // Load More logic for Infinite Scroll
  const handleLoadMore = () => {
    if (!loading && !isFetchingMore && !refreshing && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMenu(nextPage);
    }
  };

  const filteredItems = useMemo(() => {
    return allMenuItems.filter((item) => {
      const matchCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchPrice = item.price <= (parseInt(priceRange) || 99999);
      return matchCategory && matchPrice;
    });
  }, [allMenuItems, selectedCategory, priceRange]);

  const categories = ['All', ...new Set(allMenuItems.map((item) => item.category))];

  // --- RENDERERS ---
  const renderItem = ({ item }: { item: MenuItem }) => {
    const bestOffer = activeOffers.length
      ? evaluateBestOfferForItem({
          offers: activeOffers,
          item,
          at: now,
          timezone: restaurantTimezone,
        })
      : null;

    const handleAdd = () => {
      // The note used to be pre-filled from the customer's saved "special
      // notes" preference; with no customer accounts there is nothing to
      // pre-fill from, so every line starts blank and the diner types their
      // own note in the Cart.
      const cartItem = bestOffer
        ? {
            ...item,
            price: bestOffer.discountedPrice,
            originalPrice: bestOffer.basePrice,
            discountAmount: bestOffer.discountAmount,
            offerId: bestOffer.offerId,
            offerName: bestOffer.offerName,
            lockedAt: Date.now(),
            note: '',
          }
        : { ...item, note: '' };
      dispatch(addToCart(cartItem));
      Toast.show({ type: 'success', text1: `${item.name} added!` });
    };

    return (
      <View style={[
        styles.card,
        viewMode === 'list' ? styles.cardList : styles.cardGrid,
      ]}>
        <View style={[styles.imageContainer, viewMode === 'list' ? styles.imageContainerList : styles.imageContainerGrid]}>
          <MenuImage uri={item.imageUrl} style={styles.image} />
          <View style={styles.priceBadge}>
            {bestOffer ? (
              <>
                <Text style={styles.priceTextStrike}>₹{formatMoney(bestOffer.basePrice)}</Text>
                <Text style={styles.priceText}>₹{formatMoney(bestOffer.discountedPrice)}</Text>
              </>
            ) : (
              <Text style={styles.priceText}>₹{formatMoney(item.price)}</Text>
            )}
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.categoryBadge}>
            <Tag size={10} color="#ea580c" />
            <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
          </View>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.itemDesc} numberOfLines={2}>
            {item.description || "Freshly prepared for you."}
          </Text>

          {bestOffer && (
            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText} numberOfLines={1}>
                ⚡ {bestOffer.offerName} · ends in {formatCountdown(bestOffer.endsAt.getTime() - now.getTime())}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Plus size={16} color="#ea580c" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  //  Footer for Infinite Scroll
  const renderFooter = () => {
    if (isFetchingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="large" color="#ea580c" />
        </View>
      );
    }
    if (!hasMore && allMenuItems.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>You've seen all the dishes! 🍽️</Text>
        </View>
      );
    }
    return null;
  };

  if (checkingTable) {
    return <BhojanQRLoader message="Loading menu..." />;
  }

  if (!isValidTable) {
    return (
      <SafeAreaView style={styles.invalidTableContainer}>
        <View style={styles.invalidTableCard}>
          <View style={styles.invalidTableIconWrap}>
            <AlertCircle size={40} color="#ef4444" strokeWidth={1.75} />
          </View>
          <Text style={styles.invalidTableTitle}>Invalid Table Code!</Text>
          <Text style={styles.invalidTableMessage}>
            Table <Text style={styles.invalidTableNumber}>#{table}</Text> does not exist or has
            been deactivated by the restaurant owner. Please scan the official QR code stand.
          </Text>
          <View style={styles.invalidTableShieldBox}>
            <Text style={styles.invalidTableShieldLabel}>BhojanQR Shield</Text>
            <Text style={styles.invalidTableShieldText}>
              Manual URL tampering or outdated table setups are locked out dynamically to prevent
              mixed orders.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && allMenuItems.length === 0) {
    return <BhojanQRLoader message="Loading menu..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.storeIconBox}>
            <Store size={18} color="#fff" />
          </View>
          <Text style={styles.restaurantName} numberOfLines={1}>{restaurantName}</Text>
        </View>
        <View style={styles.headerRight}>
          {table ? <CallWaiterButton restaurantId={restaurantId} tableNumber={table} /> : null}
          <VirtualWaiter restaurantId={restaurantId} menuItems={allMenuItems} />
          <TouchableOpacity onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} style={styles.iconBtn}>
            {viewMode === 'grid' ? <List size={20} color="#4b5563" /> : <LayoutGrid size={20} color="#4b5563" />}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[styles.iconBtn, showFilters && styles.iconBtnActive]}
          >
            <Filter size={20} color={showFilters ? "#ea580c" : "#4b5563"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. FILTERS */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterLabel}>CATEGORIES</Text>
          <FlatList
            keyboardShouldPersistTaps="handled"
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.catPill, selectedCategory === item && styles.catPillActive]}
                onPress={() => setSelectedCategory(item)}
              >
                <Text style={[styles.catText, selectedCategory === item && styles.catTextActive]}>{item}</Text>
              </TouchableOpacity>
            )}
            style={styles.catList}
          />
          <View style={styles.priceFilterRow}>
            <Text style={styles.filterLabel}>MAX PRICE (₹)</Text>
            <TextInput cursorColor="#ea580c" selectionColor="#fdba74"
              style={styles.priceInput}
              keyboardType="number-pad"
              value={priceRange}
              onChangeText={setPriceRange}
            />
          </View>
        </View>
      )}

      {/* 3. MENU LIST */}
      <FlatList
        keyboardShouldPersistTaps="handled"
        key={viewMode}
        data={filteredItems}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        numColumns={viewMode === 'grid' ? 2 : 1}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        //  Added Infinite Scroll Props
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={["#ea580c"]} 
            tintColor="#ea580c"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />

      {/* 4. FLOATING CHECKOUT BUTTON */}
      {cartCount > 0 && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('Cart', { restaurantId, table })}
          >
            <View>
              <ShoppingBag size={24} color="#fff" />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            </View>
            <Text style={styles.fabText}>View Order</Text>
            <View style={styles.fabDivider} />
            <Text style={styles.fabPrice}>
              ₹{formatMoney(cartItems.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0))}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default GuestMenu;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Invalid Table Gate
  invalidTableContainer: { flex: 1, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', padding: 20 },
  invalidTableCard: { backgroundColor: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 420, alignItems: 'center', borderWidth: 1, borderColor: '#fee2e2', elevation: 4 },
  invalidTableIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  invalidTableTitle: { fontSize: 22, fontWeight: '900', color: '#1f2937', marginBottom: 8, textAlign: 'center' },
  invalidTableMessage: { fontSize: 13, color: '#6b7280', fontWeight: '500', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  invalidTableNumber: { color: '#ef4444', fontWeight: '800' },
  invalidTableShieldBox: { backgroundColor: '#f9fafb', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f3f4f6', width: '100%' },
  invalidTableShieldLabel: { fontSize: 10, fontWeight: '900', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  invalidTableShieldText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  storeIconBox: { backgroundColor: '#ea580c', padding: 8, borderRadius: 8 },
  restaurantName: { fontSize: 18, fontWeight: '900', color: '#1f2937', flex: 1 },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 8 },
  iconBtnActive: { backgroundColor: '#ffedd5', borderWidth: 1, borderColor: '#fdba74' },

  // Filters
  filtersContainer: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  filterLabel: { fontSize: 10, fontWeight: '900', color: '#9ca3af', marginBottom: 8, letterSpacing: 1 },
  catList: { marginBottom: 16 },
  catPill: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f3f4f6', borderRadius: 12, marginRight: 8 },
  catPillActive: { backgroundColor: '#ea580c' },
  catText: { fontSize: 14, fontWeight: 'bold', color: '#4b5563' },
  catTextActive: { color: '#fff' },
  priceFilterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, width: 80, fontWeight: 'bold', color: '#ea580c' },

  // List & Cards
  listContent: { padding: 16, paddingBottom: 100 },
  gridRow: { justifyContent: 'space-between' },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#f3f4f6', elevation: 1 },
  cardList: { flexDirection: 'row', height: 140 },
  cardGrid: { width: '48%', flexDirection: 'col' as any },
  imageContainer: { position: 'relative', backgroundColor: '#f3f4f6' },
  imageContainerList: { width: 140, height: '100%' },
  imageContainerGrid: { width: '100%', height: 140 },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  priceBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceText: { fontSize: 12, fontWeight: '900', color: '#111827' },
  priceTextStrike: { fontSize: 11, fontWeight: '600', color: '#9ca3af', textDecorationLine: 'line-through' },
  offerBadge: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fdba74', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 },
  offerBadgeText: { fontSize: 10, fontWeight: '700', color: '#c2410c' },
  cardContent: { padding: 12, flex: 1, justifyContent: 'space-between' },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  categoryText: { fontSize: 10, fontWeight: 'bold', color: '#ea580c' },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  itemDesc: { fontSize: 12, color: '#6b7280', flex: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fdba74', paddingVertical: 8, borderRadius: 10, marginTop: 8, gap: 4 },
  addBtnText: { color: '#ea580c', fontWeight: 'bold', fontSize: 14 },

  // FAB
  fabContainer: { position: 'absolute', bottom: 24, left: 24, right: 24 },
  fab: { backgroundColor: '#ea580c', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 28, paddingHorizontal: 20, elevation: 5, shadowColor: '#ea580c', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  badge: { position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ea580c' },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#ea580c' },
  fabText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginHorizontal: 12 },
  fabDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },
  fabPrice: { color: '#fff', fontWeight: '900', fontSize: 16 },

  //  Footer Styles Add kiye hain
  footerLoader: { paddingVertical: 24, alignItems: "center" },
  footerEnd: { paddingVertical: 24, alignItems: "center" },
  footerEndText: { color: "#9ca3af", fontWeight: "500", fontStyle: "italic" },
});