import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { Pencil, Trash2, Tag } from 'lucide-react-native';

// FIX 1: Define the shape of the 'item' object
export interface MenuItem {
  _id: string;
  name: string;
  price: string | number;
  category: string;
  description?: string;
  imageUrl?: string;
  available: boolean;
  [key: string]: any; // Allows for any extra fields from your backend
}

// FIX 2: Define the props expected by the component
interface MenuItemCardProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleAvailable: (id: string, newStatus: boolean) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ 
  item, 
  onEdit, 
  onDelete, 
  onToggleAvailable 
}) => {
  return (
    <View style={styles.card}>
      {/* 1. Image & Badge Section */}
      <View style={styles.imageContainer}>
        {/* We use a fallback empty string or default image if imageUrl is missing */}
        <Image source={{ uri: item.imageUrl || '' }} style={styles.image} />

        {/* Price Badge */}
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>₹{item.price}</Text>
        </View>

        {/* Out of Stock Overlay */}
        {!item.available && (
          <View style={styles.outOfStockOverlay}>
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          </View>
        )}
      </View>

      {/* 2. Content Section */}
      <View style={styles.content}>
        {/* Category */}
        <View style={styles.categoryRow}>
          <Tag size={12} color="#ea580c" />
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>

        {/* Title & Description */}
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description || 'No description provided.'}
        </Text>

        {/* 3. Footer Controls */}
        <View style={styles.footer}>
          {/* Availability Toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.availText}>Availability</Text>
            <Switch
              value={item.available}
              onValueChange={() => onToggleAvailable(item._id, !item.available)}
              trackColor={{ true: '#ea580c' }}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={() => onEdit(item)}
              style={styles.editBtn}
            >
              <Pencil size={14} color="#4b5563" />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDelete(item._id)}
              style={styles.deleteBtn}
            >
              <Trash2 size={14} color="#ef4444" />
              <Text style={[styles.actionText, { color: '#ef4444' }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    height: 160,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6', // Added a slight background color in case image is loading/missing
  },
  priceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  priceText: {
    fontWeight: 'bold',
    color: '#ea580c',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  outOfStockText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  categoryText: {
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
  description: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
  },
  footer: {
    borderTopWidth: 1,
    borderColor: '#f3f4f6',
    paddingTop: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  availText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 6,
  },
  actionText: {
    fontWeight: 'bold',
    color: '#4b5563',
    fontSize: 14,
  },
});

export default MenuItemCard;