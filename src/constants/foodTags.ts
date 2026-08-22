// Mirrored from server/constants/foodTags.js (and client/src/constants/
// foodTags.js) so menu items, customer preferences and both front-ends use
// exactly the same vocabulary. The server re-validates against its own copy
// and silently drops anything outside it, so a value invented here would be
// accepted by the form and then quietly discarded on save - keep the three
// lists in step.
export const DIETARY_TAGS = ['Vegetarian', 'Vegan', 'Jain', 'Eggless', 'Halal'];
export const ALLERGENS = ['Peanut', 'Dairy', 'Gluten', 'Soy'];
export const SPICE_LEVELS = ['Mild', 'Medium', 'Spicy'];

// Starter categories offered before the live list loads from
// /menu/owner/categories. Unlike the three lists above this one is NOT an
// allowlist - MenuItem.category is free text on the server precisely so
// restaurants can add their own - so these are only the defaults shown until
// the real list (defaults + whatever this restaurant already uses) arrives.
export const DEFAULT_MENU_CATEGORIES = [
  'Starter',
  'Main Course',
  'Soup',
  'Salad',
  'Snacks',
  'Bread',
  'Rice & Biryani',
  'Dessert',
  'Beverage',
  'Combo',
];
