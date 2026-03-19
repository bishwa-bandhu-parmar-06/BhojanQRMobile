import React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

// FIX 1: Import the MenuItem interface we created in MenuItemCard
import MenuItemCard, { MenuItem } from './MenuItemCard';

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
  // Professional Loading State
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={styles.loadingText}>Loading your menu...</Text>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 20,
    marginTop: 24,
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
    gap: 16,
  },
});

export default MenuList;