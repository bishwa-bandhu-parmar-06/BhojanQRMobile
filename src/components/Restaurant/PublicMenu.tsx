import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Store, Tag, Plus, ShoppingBag, Filter } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../../Features/CartSlice';
import { getPublicMenu } from '../../API/menuApi';

const PublicMenu = () => {
  // FIX 1: Type useRoute and useNavigation as any to avoid strict routing errors
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const { restaurantId, table } = route.params || {};
  const tableNumber = table || 'N/A';

  // FIX 2: Explicitly type 'state' as any
  const cartItems = useSelector((state: any) => state.cart?.items || []);
  const cartCount = cartItems.length;

  // FIX 3: Explicitly type allMenuItems as an array of any, not never[]
  const [allMenuItems, setAllMenuItems] = useState<any[]>([]);
  const [restaurantName, setRestaurantName] = useState('Loading...');
  const [loading, setLoading] = useState(true);

  const [visibleCount, setVisibleCount] = useState(8);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await getPublicMenu(restaurantId);
        const items = res.data.data;
        setAllMenuItems(items);
        if (items.length > 0 && items[0].restaurant)
          setRestaurantName(items[0].restaurant.restaurantName);
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Failed to load menu.' });
      } finally {
        setLoading(false);
      }
    };
    if (restaurantId) fetchMenu();
  }, [restaurantId]);

  const filteredItems = useMemo(() => {
    return allMenuItems.filter(
      // FIX 4: Explicitly type 'item' as any
      (item: any) => selectedCategory === 'All' || item.category === selectedCategory,
    );
  }, [allMenuItems, selectedCategory]);

  const categories = [
    'All',
    // FIX 5: Explicitly type 'item' as any
    ...new Set(allMenuItems.map((item: any) => item.category)),
  ];

  const handleLoadMore = () => {
    if (visibleCount < filteredItems.length) setVisibleCount(prev => prev + 6);
  };

  // FIX 6: Explicitly define the props for the renderItem function
  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.imgContainer}>
        <Image source={{ uri: item.imageUrl }} style={styles.image} />
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>₹{item.price}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <View style={styles.catRow}>
          <Tag size={12} color="#ea580c" />
          <Text style={styles.catText}>{item.category}</Text>
        </View>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.desc} numberOfLines={2}>
          {item.description || 'Freshly prepared for you.'}
        </Text>
        <TouchableOpacity
          onPress={() => {
            dispatch(addToCart(item));
            Toast.show({ type: 'success', text1: `${item.name} added!` });
          }}
          style={styles.addBtn}
        >
          <Plus size={16} color="#ea580c" />
          <Text style={styles.addBtnText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Store size={20} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>{restaurantName}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
        >
          <Filter size={18} color={showFilters ? '#fff' : '#4b5563'} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filterArea}>
          <Text style={styles.filterLabel}>CATEGORIES</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.catBtn,
                  selectedCategory === cat && styles.catBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.catBtnText,
                    selectedCategory === cat && { color: '#fff' },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Menu List */}
      <FlatList
        data={filteredItems.slice(0, visibleCount)}
        // FIX 7: Explicitly type 'item' inside keyExtractor
        keyExtractor={(item: any) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          visibleCount < filteredItems.length ? (
            <ActivityIndicator style={{ margin: 20 }} color="#ea580c" />
          ) : null
        }
      />

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('Cart', { restaurantId, table: tableNumber })
          }
          style={styles.fab}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View>
              <ShoppingBag size={20} color="#fff" />
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{cartCount}</Text>
              </View>
            </View>
            <Text style={styles.fabText}>View Order</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.fabPrice}>
            ₹
            {cartItems.reduce(
              // FIX 8: Explicitly type acc and item in the reduce function
              (acc: number, item: any) => acc + item.price * item.quantity,
              0,
            )}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { backgroundColor: '#ea580c', padding: 8, borderRadius: 8 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1f2937' },
  filterBtn: { padding: 8, borderRadius: 8, backgroundColor: '#f3f4f6' },
  filterBtnActive: { backgroundColor: '#ea580c' },
  filterArea: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9ca3af',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  catBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  catBtnActive: { backgroundColor: '#ea580c' },
  catBtnText: { fontWeight: 'bold', color: '#4b5563' },
  listContent: { padding: 16, paddingBottom: 100, gap: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  imgContainer: { height: 180, position: 'relative' },
  image: { width: '100%', height: '100%' },
  priceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  priceText: { fontWeight: 'bold', color: '#111827' },
  content: { padding: 16 },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  catText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ea580c',
    textTransform: 'uppercase',
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  desc: { fontSize: 12, color: '#6b7280', marginBottom: 16 },
  addBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addBtnText: { color: '#ea580c', fontWeight: 'bold' },
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#ea580c',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 56,
    borderRadius: 28,
    elevation: 5,
    shadowColor: '#ea580c',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { height: 5, width: 0 },
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#fff',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTxt: { fontSize: 10, fontWeight: '900', color: '#ea580c' },
  fabText: { color: '#fff', fontWeight: 'bold', marginLeft: 12, fontSize: 16 },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 16,
  },
  fabPrice: { color: '#fff', fontWeight: '900', fontSize: 16 },
});

export default PublicMenu;