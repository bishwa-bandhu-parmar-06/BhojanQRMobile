// The English source strings. Every other locale is a partial override of
// this file, so a key missing from a translation falls back to English rather
// than rendering the raw key at a customer-facing counter.
//
// Keys are grouped by screen, dotted. `{name}`-style placeholders are filled
// by t()'s second argument.
const en = {
  common: {
    refresh: "Refresh",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    retry: "Retry",
    showAll: "Show all",
    all: "All",
    loading: "Loading...",
    somethingWentWrong: "Something went wrong",
    logOut: "Log Out",
    logOutHint: "Sign out of this device",
  },

  tabs: {
    home: "Home",
    orders: "Orders",
    tables: "Tables",
    menu: "Menu",
    more: "More",
  },

  titles: {
    overview: "Dashboard Overview",
    orders: "Live Orders",
    tables: "Active Tables",
    menu: "Menu",
    more: "More",
    notifications: "Notifications",
    profile: "Profile Details",
    staff: "Manage Staff",
    happyHours: "Happy Hours",
    qr: "Table QR Codes",
    appSettings: "App Settings",
    support: "Help & Support",
  },

  more: {
    profileHint: "Name, locations, logo, login, documents",
    staffHint: "Team members and permissions",
    happyHoursHint: "Scheduled offers and discounts",
    qrHint: "Generate and print table codes",
    settingsHint: "Theme, language, alerts",
    supportHint: "Raise a query and track its status",
    addMenuItem: "Add Menu Item",
    addMenuItemHint: "Create a single dish",
    bulkAddMenu: "Bulk Add Menu",
    bulkAddMenuHint: "Add many dishes at once",
  },

  settings: {
    appearance: "Appearance",
    appearanceCaption: "How the app looks on this device.",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    language: "Language",
    languageCaption: "Used across the dashboard.",
    alerts: "Alerts",
    alertsCaption: "What happens when a new order lands.",
    orderAlerts: "Order alerts",
    orderAlertsHint: "Show a badge on the header bell",
    alertSound: "Alert sound",
    alertSoundHint: "Play a chime for each new order",
    alertSoundPreview: "Tap to hear it",
    keepScreenAwake: "Keep screen awake",
    keepScreenAwakeHint: "For a tablet mounted at the counter",
    about: "About",
    appVersion: "App version",
    footnote:
      "Restaurant name, addresses, logo, login details and documents are managed in Profile Details.",
  },

  support: {
    emptyTitle: "No queries yet",
    emptyBody:
      "Stuck on something, or found a problem? Raise a query and our support team will take it from there. You can track its progress here.",
    raiseQuery: "Raise query",
    raiseRequest: "Raise request",
    formTitle: "Raise a Query",
    formIntro:
      "Describe what went wrong and our support team will pick it up. You can attach a screenshot or short clip if it helps explain the problem.",
    subject: "Subject",
    subjectPlaceholder: "e.g. QR code for table 4 is not scanning",
    description: "Description",
    descriptionPlaceholder: "What happened, and what were you trying to do?",
    attachments: "Attachments",
    attachFirst: "Attach a photo or video",
    attachMore: "Add another",
    submit: "Submit query",
    statusOpen: "Open",
    statusInProgress: "In progress",
    statusResolved: "Resolved",
    raised: "Query raised",
    raisedHint: "Our team will get back to you soon",
    loadFailed: "Failed to load your queries",
    submitFailed: "Failed to raise your query",
    noneWithStatus: "No {status} queries",
    resolvedOn: "Resolved on {date}",
    attachmentCount: "{count} attachment",
    attachmentCountPlural: "{count} attachments",
  },

  menu: {
    emptyTitle: "Your menu is empty",
    emptyBody:
      "Add your first dish, or import a whole menu at once. Everything else in the dashboard - offers, orders, QR ordering - runs off this list.",
    addItem: "Add item",
    bulkAdd: "Bulk add",
    deleteAll: "Delete all",
    itemCount: "{count} item",
    itemCountPlural: "{count} items",
  },

  happyHours: {
    gateTitle: "Add your menu first",
    gateBody:
      "Happy Hours discount items on your menu, so there needs to be a menu before an offer can do anything. Add a few dishes and this unlocks.",
    gateRecheck: "I've added items — check again",
    emptyTitle: "No offers yet",
    emptyBody:
      "Create a Happy Hour to discount dishes during quiet periods. They switch on and off automatically on the schedule you set.",
    createOffer: "Create offer",
    newOffer: "New offer",
  },

  notifications: {
    emptyTitle: "No notifications yet",
    markAllRead: "Mark all as read",
    deleteAll: "Delete all",
  },
};

export type Translations = typeof en;
export default en;
