import type { Translations } from "./en";

// Hindi. A DeepPartial of the English source: anything not translated here
// falls back to the English string rather than showing a bare key.
//
// Translated for a restaurant owner or waiter rather than literally - e.g.
// "Live Orders" is "चालू ऑर्डर" (running orders), which is what the screen
// actually shows, not "जीवित ऑर्डर". Terms that Indian restaurant staff use
// in English day to day (ऑर्डर, मेन्यू, QR, स्टाफ) are kept in Devanagari
// transliteration instead of being forced into Sanskritised Hindi nobody
// says out loud.
type DeepPartial<T> = { [K in keyof T]?: Partial<T[K]> };

const hi: DeepPartial<Translations> = {
  common: {
    refresh: "रिफ्रेश करें",
    save: "सेव करें",
    cancel: "रद्द करें",
    delete: "हटाएँ",
    edit: "बदलें",
    close: "बंद करें",
    retry: "फिर से कोशिश करें",
    showAll: "सभी दिखाएँ",
    all: "सभी",
    loading: "लोड हो रहा है...",
    somethingWentWrong: "कुछ गड़बड़ हो गई",
    logOut: "लॉग आउट",
    logOutHint: "इस डिवाइस से साइन आउट करें",
  },

  tabs: {
    home: "होम",
    orders: "ऑर्डर",
    tables: "टेबल",
    menu: "मेन्यू",
    more: "और",
  },

  titles: {
    overview: "डैशबोर्ड ओवरव्यू",
    orders: "चालू ऑर्डर",
    tables: "चालू टेबल",
    menu: "मेन्यू",
    more: "और विकल्प",
    notifications: "सूचनाएँ",
    profile: "प्रोफ़ाइल विवरण",
    staff: "स्टाफ प्रबंधन",
    happyHours: "हैप्पी आवर्स",
    qr: "टेबल QR कोड",
    appSettings: "ऐप सेटिंग्स",
    support: "सहायता और सपोर्ट",
    orderHistory: "ऑर्डर इतिहास",
  },

  more: {
    profileHint: "नाम, पते, लोगो, लॉगिन, दस्तावेज़",
    staffHint: "टीम के सदस्य और अनुमतियाँ",
    happyHoursHint: "तय समय पर चलने वाले ऑफ़र और छूट",
    qrHint: "टेबल QR कोड बनाएँ और प्रिंट करें",
    settingsHint: "थीम, भाषा, अलर्ट",
    supportHint: "सवाल भेजें और उसकी स्थिति देखें",
    orderHistoryHint: "पूरे हो चुके ऑर्डर, बोर्ड से हटने के बाद",
    addMenuItem: "मेन्यू आइटम जोड़ें",
    addMenuItemHint: "एक डिश बनाएँ",
    bulkAddMenu: "एक साथ मेन्यू जोड़ें",
    bulkAddMenuHint: "एक बार में कई डिश जोड़ें",
  },

  settings: {
    appearance: "दिखावट",
    appearanceCaption: "इस डिवाइस पर ऐप कैसा दिखे।",
    themeLight: "लाइट",
    themeDark: "डार्क",
    themeSystem: "सिस्टम",
    language: "भाषा",
    languageCaption: "पूरे डैशबोर्ड में इस्तेमाल होगी।",
    alerts: "अलर्ट",
    alertsCaption: "नया ऑर्डर आने पर क्या हो।",
    orderAlerts: "ऑर्डर अलर्ट",
    orderAlertsHint: "हेडर की घंटी पर लाल निशान दिखाएँ",
    alertSound: "अलर्ट की आवाज़",
    alertSoundHint: "हर नए ऑर्डर पर आवाज़ बजाएँ",
    alertSoundPreview: "सुनने के लिए दबाएँ",
    keepScreenAwake: "स्क्रीन चालू रखें",
    keepScreenAwakeHint: "काउंटर पर लगे टैबलेट के लिए",
    about: "ऐप के बारे में",
    appVersion: "ऐप वर्ज़न",
    footnote:
      "रेस्टोरेंट का नाम, पते, लोगो, लॉगिन और दस्तावेज़ प्रोफ़ाइल विवरण में बदले जाते हैं।",
  },

  support: {
    emptyTitle: "अभी कोई सवाल नहीं",
    emptyBody:
      "कहीं अटक गए हैं या कोई दिक्कत मिली? सवाल भेजें, हमारी सपोर्ट टीम आगे संभाल लेगी। उसकी स्थिति आप यहीं देख सकते हैं।",
    raiseQuery: "सवाल भेजें",
    raiseRequest: "अनुरोध भेजें",
    formTitle: "सवाल भेजें",
    formIntro:
      "क्या दिक्कत हुई, यह बताएँ — हमारी सपोर्ट टीम इसे देख लेगी। समझाने में मदद हो तो स्क्रीनशॉट या छोटा वीडियो भी लगा सकते हैं।",
    subject: "विषय",
    subjectPlaceholder: "जैसे: टेबल 4 का QR कोड स्कैन नहीं हो रहा",
    description: "विवरण",
    descriptionPlaceholder: "क्या हुआ, और आप क्या करने की कोशिश कर रहे थे?",
    attachments: "अटैचमेंट",
    attachFirst: "फ़ोटो या वीडियो लगाएँ",
    attachMore: "एक और जोड़ें",
    submit: "सवाल भेजें",
    statusOpen: "खुला",
    statusInProgress: "काम चल रहा है",
    statusResolved: "हल हो गया",
    raised: "सवाल भेज दिया गया",
    raisedHint: "हमारी टीम जल्द ही आपसे संपर्क करेगी",
    loadFailed: "आपके सवाल लोड नहीं हो सके",
    submitFailed: "सवाल भेजा नहीं जा सका",
    noneWithStatus: "{status} स्थिति वाला कोई सवाल नहीं",
    resolvedOn: "{date} को हल हुआ",
    attachmentCount: "{count} अटैचमेंट",
    attachmentCountPlural: "{count} अटैचमेंट",
  },

  menu: {
    emptyTitle: "आपका मेन्यू खाली है",
    emptyBody:
      "पहली डिश जोड़ें, या पूरा मेन्यू एक साथ इम्पोर्ट करें। डैशबोर्ड की बाकी सब चीज़ें — ऑफ़र, ऑर्डर, QR ऑर्डरिंग — इसी सूची पर चलती हैं।",
    addItem: "आइटम जोड़ें",
    bulkAdd: "एक साथ जोड़ें",
    deleteAll: "सभी हटाएँ",
    itemCount: "{count} आइटम",
    itemCountPlural: "{count} आइटम",
  },

  happyHours: {
    gateTitle: "पहले अपना मेन्यू जोड़ें",
    gateBody:
      "हैप्पी आवर्स आपके मेन्यू के आइटम पर छूट देते हैं, इसलिए ऑफ़र बनाने से पहले मेन्यू होना ज़रूरी है। कुछ डिश जोड़ें और यह खुल जाएगा।",
    gateRecheck: "मैंने आइटम जोड़ दिए — फिर से देखें",
    emptyTitle: "अभी कोई ऑफ़र नहीं",
    emptyBody:
      "कम भीड़ के समय डिश पर छूट देने के लिए हैप्पी आवर बनाएँ। आपके तय समय पर ये अपने आप चालू और बंद हो जाते हैं।",
    createOffer: "ऑफ़र बनाएँ",
    newOffer: "नया ऑफ़र",
  },

  notifications: {
    emptyTitle: "अभी कोई सूचना नहीं",
    markAllRead: "सभी पढ़ी हुई मार्क करें",
    deleteAll: "सभी हटाएँ",
  },
};

export default hi;
