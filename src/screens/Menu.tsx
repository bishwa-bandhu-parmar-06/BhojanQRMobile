import React, { useCallback, useEffect, useState } from "react";
import { 
  View, 
  Text, 
  Image, 
  FlatList, 
  ActivityIndicator, 
  StyleSheet, 
  Dimensions,
  RefreshControl,
  TouchableOpacity
} from "react-native";

// Imported it from the modern library instead
import { SafeAreaView } from "react-native-safe-area-context"; 
import NetInfo from "@react-native-community/netinfo"; 
import Toast from "react-native-toast-message";
import { Store, Tag,RefreshCw,WifiOff } from "lucide-react-native";

// Assume this is your API function
import { getAllMenuItems } from "../API/menuApi"; 

const { width } = Dimensions.get("window");
// Calculate card width for a 2-column grid with padding
const CARD_WIDTH = (width - 48) / 2; 

// --- TYPESCRIPT INTERFACES ---
export interface Restaurant {
  restaurantName?: string;
  [key: string]: any;
}

export interface MenuItem {
  _id: string;
  name: string;
  price: number | string;
  category: string;
  description?: string;
  imageUrl?: string;
  available: boolean;
  restaurant?: Restaurant;
  [key: string]: any;
}

interface MenuCardProps {
  item: MenuItem;
}

// --- SUB-COMPONENT: MENU CARD ---
const MenuCard: React.FC<MenuCardProps> = ({ item }) => {
  return (
    <View style={styles.card}>
      {/* 1. Image Container */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.imageUrl || "" }}
          style={[
            styles.image,
            // Apply opacity if out of stock
            !item.available && { opacity: 0.6 }
          ]}
        />

        {/* Floating Price Badge */}
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>₹{item.price}</Text>
        </View>

        {/* Out of Stock Overlay */}
        {!item.available && (
          <View style={styles.outOfStockOverlay}>
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
            </View>
          </View>
        )}
      </View>

      {/* 2. Content Container */}
      <View style={styles.content}>
        {/* Category */}
        <View style={styles.categoryRow}>
          <Tag size={10} color="#f97316" strokeWidth={3} />
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>

        {/* Dish Name */}
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>

        {/* Restaurant Name */}
        <View style={styles.restaurantRow}>
          <Store size={10} color="#fb923c" />
          <Text style={styles.restaurantText} numberOfLines={1}>
            {item.restaurant?.restaurantName || "Independent Kitchen"}
          </Text>
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {item.description || "A delicious treat prepared fresh for you."}
        </Text>
      </View>
    </View>
  );
};

const Menu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false); 
  const [isOffline, setIsOffline] = useState<boolean>(false); 

  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);


  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
      if (!state.isConnected) {
        Toast.show({
          type: 'error',
          text1: 'No Internet Connection',
          text2: 'Please check your WiFi or Mobile Data'
        });
      }
    });
    return () => unsubscribe();
  }, []);


  const fetchMenu = async (pageNumber: number, isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else if (pageNumber === 1) setLoading(true);
      else setIsFetchingMore(true); //  Bottom loader chalu karne ke liye

      // Limit ko 8 rakhte hain app ke liye
      const LIMIT = 8;
      const res = await getAllMenuItems(pageNumber, LIMIT);
      
      const newItems: MenuItem[] = res.data?.data || [];

      //  Agar aane wala data limit se kam hai, matlab aage aur data nahi hai
      if (newItems.length < LIMIT) {
        setHasMore(false);
      }

      setMenuItems(prev => {
        if (isRefreshing || pageNumber === 1) {
          return newItems;
        }

        const existingIds = new Set(prev.map(item => item._id));
        const filteredNewItems = newItems.filter(item => !existingIds.has(item._id));
        return [...prev, ...filteredNewItems];
      });
    } catch (error: any) {
      console.error("Fetch Error:", error);
      Toast.show({ type: "error", text1: "Network Error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsFetchingMore(false); //  Bottom loader band karne ke liye
    }
  };

  const handleLoadMore = () => {
    //  Check lagaya ki pehle se fetch nahi ho raha ho tabhi page badhaye
    if (!loading && hasMore && !isOffline && !isFetchingMore) {
      setPage(prev => prev + 1);
    }
  };

  useEffect(() => {
    if (!isOffline) fetchMenu(page);
  }, [page, isOffline]);

  const onRefresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    fetchMenu(1, true);
  }, [isOffline]);

  


  if (isOffline) {
    return (
      <View style={styles.centerScreen}>
        <WifiOff size={60} color="#ef4444" strokeWidth={1.5} />
        <Text style={styles.errorTitle}>No Connection</Text>
        <Text style={styles.errorSub}>Please connect to the internet to see the menu.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }



  // Header Component (Scrolls with the list)
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>
        Explore <Text style={styles.headerTitleHighlight}>Menus</Text>
      </Text>
      <Text style={styles.headerSubtitle}>
        Discover top dishes from restaurants around you.
      </Text>
    </View>
  );

  // Footer Component (Shows loading spinner or "End of list" message)
  const renderFooter = () => {
    if (isFetchingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      );
    }
    if (!hasMore && menuItems.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>You've seen all the dishes! 🍽️</Text>
        </View>
      );
    }
    return null;
  };

  // Initial Full-Screen Loader
  if (loading && menuItems.length === 0) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Discovering delicious food...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
      keyboardShouldPersistTaps="handled"
        data={menuItems}
        keyExtractor={(item: MenuItem) => item._id}
        renderItem={({ item }) => <MenuCard item={item} />}
        numColumns={2} // Creates a 2-column grid for medium-sized cards
        columnWrapperStyle={styles.rowWrapper}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}

        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={["#ea580c"]} 
            tintColor="#ea580c"
          />
        }


        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5} // Trigger load more when halfway down the list
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

// --- STYLESHEET ---
const styles = StyleSheet.create({
  // Main Layout
  container: {
    flex: 1,
    backgroundColor: "#f9fafb", // gray-50
  },
  centerScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    marginTop: 16,
    color: "#6b7280",
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
  },
  rowWrapper: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  
  // Header
  header: {
    marginBottom: 24,
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#111827", // gray-900
    letterSpacing: -0.5,
  },
  headerTitleHighlight: {
    color: "#ea580c", // orange-600
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280", // gray-500
    fontWeight: "500",
    marginTop: 4,
  },

  // Card Styles
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6", // gray-100
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  imageContainer: {
    height: 140, // Reduced for mobile 2-column view
    width: "100%",
    backgroundColor: "#f3f4f6", // gray-100 fallback
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  priceBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ffedd5", // orange-100
    zIndex: 10,
  },
  priceText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#ea580c",
  },

  errorTitle: { fontSize: 20, fontWeight: "bold", marginTop: 16, color: "#1f2937" },
  errorSub: { textAlign: "center", color: "#6b7280", marginTop: 8 },
  retryButton: { marginTop: 20, backgroundColor: "#ea580c", paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 },
  retryText: { color: "#fff", fontWeight: "bold" },


  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  outOfStockBadge: {
    backgroundColor: "#ef4444", // red-500
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    transform: [{ rotate: "-6deg" }],
  },
  outOfStockText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  content: {
    padding: 12,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#f97316", // orange-500
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937", // gray-800
    marginBottom: 4,
  },
  restaurantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f9fafb", // gray-50
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  restaurantText: {
    fontSize: 10,
    color: "#6b7280", 
    fontWeight: "500",
    maxWidth: 100, 
  },
  description: {
    fontSize: 10,
    color: "#6b7280",
    lineHeight: 14,
  },

  // Footer Styles
  footerLoader: {
    paddingVertical: 24,
    alignItems: "center",
  },
  footerEnd: {
    paddingVertical: 24,
    alignItems: "center",
  },
  footerEndText: {
    color: "#9ca3af",
    fontWeight: "500",
  },
});

export default Menu;