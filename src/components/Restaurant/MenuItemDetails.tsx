import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Pencil, Trash2, Tag, Leaf, AlertTriangle, Flame, IndianRupee } from 'lucide-react-native';
import MenuImage from '../MenuImage';
import { formatMoney } from '../../utils/money';
import type { MenuItem } from './MenuItemCard';

interface MenuItemDetailsProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  // Same rules the list card follows. The routes enforce them regardless of
  // what is drawn here - this only keeps the UI honest about what the person
  // looking at it is allowed to do.
  canEdit?: boolean;
  canDelete?: boolean;
}

/**
 * Full-screen read view for one dish, opened by tapping its card.
 *
 * The card itself is deliberately terse - one line of description, a name
 * clipped to a single line - because it has to stay scannable in a long list.
 * Everything that gets truncated there is shown in full here, which is the
 * point of the screen: it is the only place an owner can read a whole
 * description or see every tag on a dish without opening the edit form and
 * risking an accidental change.
 */
const MenuItemDetails: React.FC<MenuItemDetailsProps> = ({
  item,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}) => {
  const hasTags = !!item.dietaryTags?.length || !!item.allergens?.length || !!item.spiceLevel;

  return (
    <View style={styles.container}>
      <View style={styles.heroWrap}>
        <MenuImage uri={item.imageUrl} style={styles.hero} />
        <View style={[styles.availabilityPill, !item.available && styles.availabilityPillOff]}>
          <Text style={[styles.availabilityText, !item.available && styles.availabilityTextOff]}>
            {item.available ? 'Available' : 'Unavailable'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.categoryRow}>
          <Tag size={12} color="#ea580c" />
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>

        {/* No numberOfLines anywhere on this screen - a long dish name wrapping
            onto three lines is fine here, and reading it in full is why
            someone opened the card. */}
        <Text style={styles.name}>{item.name}</Text>

        <View style={styles.priceRow}>
          <IndianRupee size={18} color="#16a34a" />
          <Text style={styles.price}>{formatMoney(item.price)}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Description</Text>
        <Text style={[styles.description, !item.description && styles.descriptionEmpty]}>
          {item.description || 'No description provided.'}
        </Text>

        {hasTags && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Tags</Text>
            <View style={styles.badgeRow}>
              {item.dietaryTags?.map(tag => (
                <View key={tag} style={[styles.badge, styles.badgeDietary]}>
                  <Leaf size={11} color="#15803d" />
                  <Text style={[styles.badgeText, styles.badgeTextDietary]}>{tag}</Text>
                </View>
              ))}
              {item.allergens?.map(allergen => (
                <View key={allergen} style={[styles.badge, styles.badgeAllergen]}>
                  <AlertTriangle size={11} color="#b45309" />
                  <Text style={[styles.badgeText, styles.badgeTextAllergen]}>{allergen}</Text>
                </View>
              ))}
              {!!item.spiceLevel && (
                <View style={[styles.badge, styles.badgeSpice]}>
                  <Flame size={11} color="#dc2626" />
                  <Text style={[styles.badgeText, styles.badgeTextSpice]}>{item.spiceLevel}</Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* Hidden rather than disabled when the permission is missing, matching
          the card's actions - a row of dead buttons is just noise. */}
      {(canEdit || canDelete) && (
        <View style={styles.actions}>
          {canEdit && (
            <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(item)} activeOpacity={0.85}>
              <Pencil size={17} color="#fff" />
              <Text style={styles.editText}>Edit item</Text>
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item._id)} activeOpacity={0.85}>
              <Trash2 size={17} color="#ef4444" />
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 16 },

  heroWrap: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff' },
  hero: { width: '100%', height: 220 },
  availabilityPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  availabilityPillOff: { backgroundColor: '#fee2e2' },
  availabilityText: { fontSize: 11, fontWeight: '800', color: '#15803d' },
  availabilityTextOff: { color: '#dc2626' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  categoryText: { fontSize: 11, fontWeight: '800', color: '#ea580c', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  price: { fontSize: 20, fontWeight: '800', color: '#16a34a' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  description: { fontSize: 14, color: '#374151', lineHeight: 21 },
  descriptionEmpty: { color: '#9ca3af', fontStyle: 'italic' },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  badgeDietary: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },
  badgeTextDietary: { color: '#15803d' },
  badgeAllergen: { backgroundColor: '#fffbeb', borderColor: '#fef3c7' },
  badgeTextAllergen: { color: '#b45309' },
  badgeSpice: { backgroundColor: '#fef2f2', borderColor: '#fee2e2' },
  badgeTextSpice: { color: '#dc2626' },

  actions: { flexDirection: 'row', gap: 12 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    paddingVertical: 14,
    borderRadius: 14,
  },
  editText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 14,
    borderRadius: 14,
  },
  deleteText: { fontSize: 15, fontWeight: '800', color: '#ef4444' },
});

export default MenuItemDetails;
