import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { UtensilsCrossed } from 'lucide-react-native';

// Import the MenuItem interface we created in MenuItemCard
import MenuItemCard, { MenuItem } from './MenuItemCard';
import { MenuListSkeleton } from '../Skeleton';

// Define exactly what props this component expects
interface MenuListProps {
  items: MenuItem[];
  loading: boolean;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleAvailable: (id: string, newStatus: boolean) => void;
}

const MenuList: React.FC<MenuListProps> = ({ 
  items, 
  loading, 
  onEdit, 
  onDelete, 
  onToggleAvailable 
}) => {
  if (loading) {
    return (
      <View style={styles.skeletonWrap}>
        <MenuListSkeleton />
      </View>
    );
  }

  if (!items || items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconRing}>
          <View style={styles.emptyIconCircle}>
            <UtensilsCrossed size={30} color="#ea580c" />
          </View>
        </View>
        <Text style={styles.emptyTitle}>Your menu is empty</Text>
        {/* The old copy said 'Tap "Add Item" above'. That button no longer
            exists - adding is now the + in the header, or the More page. */}
        <Text style={styles.emptySub}>
          Use the + in the header to add your first dish, or add several at once from
          the More tab.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      keyboardShouldPersistTaps="handled"
      data={items}
      keyExtractor={item => item._id}
      renderItem={({ item }) => (
        <MenuItemCard
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleAvailable={onToggleAvailable}
        />
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      // Render a screenful up front and extend as the user scrolls. A full
      // menu can run to hundreds of dishes, each with an image.
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={11}
      removeClippedSubviews
    />
  );
};

const styles = StyleSheet.create({
  skeletonWrap: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  // Unboxed and vertically centred, matching the orders and tables lists.
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  emptyIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
  },
  emptySub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
});

export default MenuList;