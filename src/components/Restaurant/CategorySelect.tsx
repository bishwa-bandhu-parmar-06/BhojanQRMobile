import React from 'react';
import AddableSelect from '../AddableSelect';

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  onAddCategory: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

// The "Category" field for every menu form - the single item form and each
// bulk import row. Thin wrapper around AddableSelect so the menu-specific
// wording lives in one place, mirroring the web dashboard's
// components/Restaurent/CategorySelect.jsx.
const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  categories,
  onAddCategory,
  disabled = false,
  compact = false,
}) => (
  <AddableSelect
    value={value}
    onChange={onChange}
    items={categories}
    onAddItem={onAddCategory}
    title="Select category"
    placeholder="Select category"
    addLabel="Add new category"
    addPlaceholder="New category name"
    disabled={disabled}
    compact={compact}
  />
);

export default CategorySelect;
