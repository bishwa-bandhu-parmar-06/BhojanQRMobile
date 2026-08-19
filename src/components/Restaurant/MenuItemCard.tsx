import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Animated, Pressable } from 'react-native';

import { Pencil, Trash2, Tag } from 'lucide-react-native';
import MenuImage from '../MenuImage';
import { formatMoney } from "../../utils/money";

export interface MenuItem {
  _id: string;
  name: string;
  price: string | number;
  category: string;
  description?: string;
  imageUrl?: string;
  available: boolean;
  [key: string]: any; 
}

interface MenuItemCardProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleAvailable: (id: string, newStatus: boolean) => void;
  // Hidden rather than disabled: a greyed-out delete on every row is noise on
  // a screen a waiter uses all shift. These are the server's rules mirrored
  // for the UI - the routes enforce them regardless of what is drawn here.
  canEdit?: boolean;
  canDelete?: boolean;
}

interface CustomToggleProps {
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const CustomToggle: React.FC<CustomToggleProps> = ({ value, onToggle, disabled }) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const toggle = () => {
    if (disabled) return;
    Animated.timing(anim, {
      toValue: value ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();

    onToggle();
  };

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 18],
  });

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#d1d5db', '#ea580c'],
  });

  return (
    <Pressable onPress={toggle} disabled={disabled} style={disabled && styles.toggleDisabled}>
      <Animated.View style={[styles.toggleTrack, { backgroundColor }]}>
        <Animated.View style={[styles.toggleThumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  );
};

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  onToggleAvailable,
  canEdit = true,
  canDelete = true,
}) => {
  return (
    <View style={[styles.card, !item.available && styles.cardUnavailable]}>
      <View style={styles.imageWrap}>
        <MenuImage uri={item.imageUrl} style={styles.image} />
        {!item.available && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>OUT</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.categoryRow}>
            <Tag size={10} color="#ea580c" />
            <Text style={styles.categoryText} numberOfLines={1}>{item.category}</Text>
          </View>
          <Text style={styles.priceText}>₹{formatMoney(item.price)}</Text>
        </View>

        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.description} numberOfLines={1}>
          {item.description || 'No description provided.'}
        </Text>

        <View style={styles.footer}>
          <View style={styles.toggleRow}>
            {/* Availability is an edit, so it follows manage_menu too - it
                writes to the same record a price change does. */}
            <CustomToggle
              value={item.available}
              onToggle={() =>
                canEdit && onToggleAvailable(item._id, !item.available)
              }
              disabled={!canEdit}
            />
            <Text style={styles.availText}>{item.available ? 'Available' : 'Unavailable'}</Text>
          </View>

          <View style={styles.actionsRow}>
            {canEdit && (
              <TouchableOpacity onPress={() => onEdit(item)} style={styles.iconBtn}>
                <Pencil size={15} color="#4b5563" />
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity onPress={() => onDelete(item._id)} style={[styles.iconBtn, styles.iconBtnDanger]}>
                <Trash2 size={15} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardUnavailable: {
    opacity: 0.7,
  },
  imageWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ea580c',
    textTransform: 'uppercase',
  },
  priceText: {
    fontWeight: 'bold',
    color: '#ea580c',
    fontSize: 14,
  },
  itemName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  description: {
    fontSize: 11,
    color: '#9ca3af',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleDisabled: { opacity: 0.45 },
  toggleTrack: {
    width: 36,
    height: 20,
    borderRadius: 12,
    padding: 2,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    elevation: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  iconBtnDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
});

export default MenuItemCard;
