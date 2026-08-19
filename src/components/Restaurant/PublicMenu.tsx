import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Store, Tag, Filter } from 'lucide-react-native';
import { getPublicMenu } from '../../API/menuApi';
import BhojanQRLoader from '../BhojanQRLoader';
import MenuImage from '../MenuImage';
import SectionError from '../SectionError';
import { formatMoney } from "../../utils/money";

const PublicMenu = () => {
  const route = useRoute<any>();
  const { restaurantId } = route.params || {};

  // Explicitly type allMenuItems as an array of any, not never[]
  const [allMenuItems, setAllMenuItems] = useState<any[]>([]);
  const [restaurantName, setRestaurantName] = useState('Loading...');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [visibleCount, setVisibleCount] = useState(8);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const res = await getPublicMenu(restaurantId);
      const items = res.data.data;
      setAllMenuItems(items);
      if (items.length > 0 && items[0].restaurant)
        setRestaurantName(items[0].restaurant.restaurantName);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load menu.' });
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) fetchMenu();
  }, [restaurantId, fetchMenu]);

  const filteredItems = useMemo(() => {
    return allMenuItems.filter(
      (item: any) => selectedCategory === 'All' || item.category === selectedCategory,
    );
  }, [allMenuItems, selectedCategory]);

  const categories = [
    'All',
    ...new Set(allMenuItems.map((item: any) => item.category)),
  ];

  const handleLoadMore = () => {
    if (visibleCount < filteredItems.length) setVisibleCount(prev => prev + 6);
  };

  // FIX 6: Explicitly define the props for the renderItem function
  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.imgContainer}>
        <MenuImage uri={item.imageUrl} style={styles.image} />
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>₹{formatMoney(item.price)}</Text>
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
      </View>
    </View>
  );

  if (loading) return <BhojanQRLoader />;

  if (loadError && allMenuItems.length === 0) {
    return (
      <View style={styles.container}>
        <SectionError message="Failed to load the menu." onRetry={fetchMenu} />
      </View>
    );
  }

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
            keyboardShouldPersistTaps="handled"
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
keyboardShouldPersistTaps="handled"
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
});

export default PublicMenu;