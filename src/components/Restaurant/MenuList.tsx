import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';

// FIX 1: Import the MenuItem interface we created in MenuItemCard
import MenuItemCard, { MenuItem } from './MenuItemCard';
import { MenuListSkeleton } from '../Skeleton';

// FIX 2: Define exactly what props this component expects
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
  // Skeleton loading state - shaped like the real cards so the list
  // doesn't visually "jump" once the data arrives.
  if (loading) {
    return (
      <View style={styles.skeletonWrap}>
        <MenuListSkeleton />
      </View>
    );
  }

  // Polished Empty State
  if (!items || items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Your menu is empty</Text>
        <Text style={styles.emptySub}>
          Tap "Add Item" above to start building your restaurant's digital menu.
        </Text>
      </View>
    );
  }

  // Menu List Layout
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
    />
  );
};

const styles = StyleSheet.create({
  skeletonWrap: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 20,
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 12,
  },
  emptySub: {
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