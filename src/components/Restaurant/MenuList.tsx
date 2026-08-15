import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { UtensilsCrossed, Plus, Layers } from 'lucide-react-native';

// Import the MenuItem interface we created in MenuItemCard
import MenuItemCard, { MenuItem } from './MenuItemCard';
import { MenuListSkeleton } from '../Skeleton';
import LoadMoreButton from '../LoadMoreButton';

// Define exactly what props this component expects
interface MenuListProps {
  items: MenuItem[];
  loading: boolean;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleAvailable: (id: string, newStatus: boolean) => void;
  // Drawn in the empty state only. Once a single dish exists these disappear
  // and the header's two icons are the only way in - a first-run prompt, not
  // a permanent toolbar competing with them.
  onAddItem?: () => void;
  onBulkAdd?: () => void;
  // Infinite scroll. The owner menu is served a page at a time, so the list
  // asks for the next one as it nears the bottom rather than the screen
  // showing only the first 20 dishes of a 100-dish menu.
  onEndReached?: () => void;
  loadingMore?: boolean;
  hasMore?: boolean;
  // The whole menu size from the server, so the footer can say "showing 20 of
  // 100" rather than leaving the length of the list a mystery.
  total?: number;
  canEdit?: boolean;
  canDelete?: boolean;
}

const MenuList: React.FC<MenuListProps> = ({
  items,
  loading,
  onEdit,
  onDelete,
  onToggleAvailable,
  onAddItem,
  onBulkAdd,
  onEndReached,
  loadingMore,
  hasMore,
  total,
  canEdit = true,
  canDelete = true,
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
        <Text style={styles.emptySub}>
          Add your first dish, or import a whole menu at once. Everything else in the
          dashboard - offers, orders, QR ordering - runs off this list.
        </Text>

        {/* Directing people to controls elsewhere ("use the + in the header")
            is what this replaces: an empty screen should carry its own way
            out rather than describing one. */}
        {canEdit && <View style={styles.emptyActions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onAddItem}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Plus size={15} color="#fff" />
            <Text style={styles.primaryBtnText}>Add item</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onBulkAdd}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Layers size={15} color="#ea580c" />
            <Text style={styles.secondaryBtnText}>Bulk add</Text>
          </TouchableOpacity>
        </View>}
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
          canEdit={canEdit}
          canDelete={canDelete}
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
      onEndReached={onEndReached}
      // Fires a page early rather than at the very bottom, so the next batch
      // is usually already there by the time the last card scrolls past.
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        <LoadMoreButton
          onPress={onEndReached || (() => {})}
          loading={loadingMore}
          hasMore={!!hasMore}
          shown={items.length}
          total={total}
          // Only worth saying once the list is long enough that someone might
          // wonder whether more is still loading.
          showEndMarker={items.length > 8}
          endLabel="End of menu"
        />
      }
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
  // Same pair, same weighting as the Happy Hours gate: adding one dish is the
  // ordinary path, bulk import the deliberate one.
  emptyActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#ea580c',
  },
  primaryBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '800', color: '#ea580c' },
  listContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
});

export default MenuList;