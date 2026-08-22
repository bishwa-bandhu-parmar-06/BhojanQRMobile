import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { ChevronDown, Plus, Check, X } from 'lucide-react-native';

interface AddableSelectProps {
  value: string;
  onChange: (value: string) => void;
  items: string[];
  onAddItem: (value: string) => void;
  placeholder?: string;
  title?: string;
  addLabel?: string;
  addPlaceholder?: string;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * Dropdown that also lets the user type a brand-new option instead of being
 * locked to the list - the mobile counterpart of the web dashboard's
 * components/common/AddableSelect.jsx, with the same behaviour so a category
 * added on a phone and one added in a browser end up identical.
 *
 * This replaces the native @react-native-picker/picker for the Category
 * field. A platform Spinner can only ever offer a fixed set of <Picker.Item>s,
 * and MenuItem.category is deliberately free text on the server, so the
 * picker could not express the feature at all - it also silently rendered a
 * blank row whenever an item's saved category wasn't one of its hardcoded
 * options, which is what happened to every custom category on edit.
 */
const AddableSelect: React.FC<AddableSelectProps> = ({
  value,
  onChange,
  items,
  onAddItem,
  placeholder = 'Select...',
  title = 'Select an option',
  addLabel = 'Add new',
  addPlaceholder = 'New value',
  disabled = false,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState('');

  const close = () => {
    setOpen(false);
    setAdding(false);
    setNewValue('');
  };

  const handleSelect = (item: string) => {
    onChange(item);
    close();
  };

  // Case-insensitive match against what already exists, so typing "starter"
  // when "Starter" is on the list selects the existing one rather than
  // creating a near-duplicate that would then split the menu into two
  // categories customers see as the same.
  const commitNewValue = () => {
    const trimmed = newValue.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    const existing = items.find(i => i.toLowerCase() === trimmed.toLowerCase());
    if (!existing) onAddItem(trimmed);
    onChange(existing || trimmed);
    close();
  };

  // A single View rather than a fragment: the Modal is a sibling of the field
  // in the tree, and callers lay these out inside gap-spaced columns where a
  // second child - even a zero-height one - would open an extra gap.
  return (
    <View>
      <TouchableOpacity
        style={[styles.field, compact && styles.fieldCompact, disabled && styles.fieldDisabled]}
        onPress={() => setOpen(true)}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={value ? `${title}: ${value}` : placeholder}
      >
        <Text
          style={[styles.fieldText, compact && styles.fieldTextCompact, !value && styles.fieldPlaceholder]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <ChevronDown size={compact ? 16 : 18} color="#9ca3af" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        {/* Tapping the scrim closes, matching the web version's click-outside. */}
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={close}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {items.map(item => {
                const selected = item === value;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.optionText, selected && styles.optionTextSelected]}
                      numberOfLines={1}
                    >
                      {item}
                    </Text>
                    {selected && <Check size={16} color="#ea580c" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.addRow}>
              {adding ? (
                <View style={styles.addingRow}>
                  <TextInput
                    cursorColor="#ea580c"
                    selectionColor="#fdba74"
                    style={styles.addInput}
                    autoFocus
                    value={newValue}
                    onChangeText={setNewValue}
                    placeholder={addPlaceholder}
                    placeholderTextColor="#9ca3af"
                    returnKeyType="done"
                    onSubmitEditing={commitNewValue}
                    maxLength={40}
                  />
                  <TouchableOpacity style={styles.addConfirm} onPress={commitNewValue}>
                    <Check size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addCancel}
                    onPress={() => {
                      setAdding(false);
                      setNewValue('');
                    }}
                  >
                    <X size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addTrigger}
                  onPress={() => setAdding(true)}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color="#ea580c" />
                  <Text style={styles.addTriggerText}>{addLabel}</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldCompact: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  fieldDisabled: { opacity: 0.5 },
  fieldText: { flex: 1, fontSize: 15, color: '#1f2937', fontWeight: '500', marginRight: 8 },
  fieldTextCompact: { fontSize: 14 },
  fieldPlaceholder: { color: '#9ca3af' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#1f2937' },

  // Capped so a restaurant with a long custom list still leaves the "add"
  // row visible instead of pushing it off the bottom of the screen.
  list: { maxHeight: 280 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionSelected: { backgroundColor: '#fff7ed' },
  optionText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#374151', marginRight: 8 },
  optionTextSelected: { color: '#ea580c' },

  addRow: { borderTopWidth: 1, borderColor: '#f3f4f6', padding: 12, backgroundColor: '#f9fafb' },
  addTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 8 },
  addTriggerText: { fontSize: 14, fontWeight: '800', color: '#ea580c' },
  addingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
  },
  addConfirm: { backgroundColor: '#ea580c', padding: 10, borderRadius: 10 },
  addCancel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', padding: 10, borderRadius: 10 },
});

export default AddableSelect;
