import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  BackHandler
} from 'react-native';
import { useRoute, useNavigation,useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
// @ts-ignore - Razorpay does not have official TypeScript definitions
import RazorpayCheckout from 'react-native-razorpay';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  User,
  Hash,
  ShoppingCart,
} from 'lucide-react-native';

import { removeFromCart, updateQuantity, updateItemPricing, clearCart } from '../Features/CartSlice';
import { createOrder, verifyPayment } from '../API/orderApi';
import { getPublicMenu } from '../API/menuApi';
import { RAZORPAY_KEY } from '../config/env';
import useNow from '../hooks/useNow';
import {
  evaluateBestOfferForItem,
  formatCountdown,
  PRICE_LOCK_DURATION_MS,
} from '../utils/pricingEngine';

const Cart = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const { restaurantId, table: urlTableNumber } = route.params || {};

  const cart = useSelector((state: any) => state.cart?.items || []);
  const totalAmount = useSelector((state: any) => state.cart?.totalAmount || 0);
  const authUser = useSelector((state: any) => state.auth?.user);

  // A table number only ever reaches this screen via the QR-scan chain
  // (FloatingQRScanner -> GuestMenu -> Cart), and the scanner already
  // verified it against the table's HMAC signature server-side - so once
  // it's present here it must stay locked, exactly like the website's
  // readOnly table field, otherwise a customer could spoof a different
  // table after a validated scan.
  const tableLocked = !!urlTableNumber;
  const [tableNumber, setTableNumber] = useState(urlTableNumber || '');
  const [customerName, setCustomerName] = useState(
    authUser?.role === 'customer' ? authUser?.name || '' : '',
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // This screen can stay mounted in the nav stack across a login/logout
  // (e.g. the user opens Cart, then signs in from elsewhere and comes
  // back), so the useState initializer above only catches the name at the
  // very first mount. Re-sync whenever the logged-in customer changes,
  // unless the field no longer matches what was last auto-filled - i.e.
  // the customer typed their own value, which should never be clobbered.
  const lastAutoFilledName = useRef(
    authUser?.role === 'customer' ? authUser?.name || '' : '',
  );
  useEffect(() => {
    if (authUser?.role !== 'customer') return;
    const nextName = authUser?.name || '';
    setCustomerName((prev: string) =>
      prev === lastAutoFilledName.current ? nextName : prev,
    );
    lastAutoFilledName.current = nextName;
  }, [authUser]);

  // 1s tick drives the per-item "price locked for Xm Ys" countdown; the
  // separate 10s tick below drives the actual expiry check, so an expired
  // lock isn't re-fetched-and-recomputed every single second.
  const now = useNow(1000);
  const expiryCheckTick = useNow(10000);
  const recalculatingRef = useRef(false);

  // A cart line's discounted price is only honorable for PRICE_LOCK_DURATION_MS
  // after it was added - never silently charge more than what the customer
  // saw, but never honor it forever either. Once expired, re-evaluate against
  // the restaurant's current offers/prices (the backend re-verifies all of
  // this independently at checkout regardless; this just keeps the displayed
  // total honest).
  useEffect(() => {
    const expiredItems = cart.filter(
      (item: any) => item.lockedAt && Date.now() - item.lockedAt > PRICE_LOCK_DURATION_MS,
    );
    if (expiredItems.length === 0 || recalculatingRef.current || !restaurantId) return;
    recalculatingRef.current = true;

    (async () => {
      try {
        const res = await getPublicMenu(restaurantId);
        const freshItems: any[] = res.data.data || [];
        const offers = res.data.activeOffers || [];
        const timezone = res.data.restaurantTimezone || 'Asia/Kolkata';
        const itemsById = new Map<string, any>(freshItems.map((mi: any) => [mi._id, mi]));
        const nowDate = new Date();

        let anyChanged = false;
        expiredItems.forEach((cartItem: any) => {
          const freshItem = itemsById.get(cartItem._id);
          if (!freshItem) return;
          const best = offers.length
            ? evaluateBestOfferForItem({ offers, item: freshItem, at: nowDate, timezone })
            : null;
          const newPrice = best ? best.discountedPrice : parseFloat(freshItem.price);
          if (newPrice !== cartItem.price) anyChanged = true;

          dispatch(
            updateItemPricing({
              cartLineId: cartItem.cartLineId,
              price: newPrice,
              originalPrice: best ? best.basePrice : null,
              discountAmount: best ? best.discountAmount : null,
              offerId: best ? best.offerId : null,
              offerName: best ? best.offerName : null,
              lockedAt: best ? Date.now() : null,
            }),
          );
        });

        if (anyChanged) {
          Toast.show({ type: 'info', text1: 'Offer pricing expired. Cart has been updated.' });
        }
      } catch {
        // Best-effort - checkout still recomputes server-side either way.
      } finally {
        recalculatingRef.current = false;
      }
    })();
  }, [expiryCheckTick, cart, restaurantId, dispatch]);

  //  FIX 1: EXPLICIT NAVIGATION INSTEAD OF goBack()
  const handleBackToMenu = useCallback(() => {
    if (restaurantId) {
      navigation.navigate('GuestMenu', {
        restaurantId: restaurantId,
        table: tableNumber
      });
    } else {
      navigation.navigate('Home');
    }
  }, [navigation, restaurantId, tableNumber]);
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBackToMenu();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();

    }, [handleBackToMenu])
  );
  const handleProceed = async () => {
    if (!tableNumber || !customerName) return;

    setIsProcessing(true);

    try {
      const orderItems = cart.map((item: any) => ({
        menuItem: item._id,
        quantity: item.quantity,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        note: item.note || '',
        // Backend never trusts `price` above - it only uses this offerId +
        // lockedAt as a claim, independently re-verified against the
        // offer's real, current state before any discount is applied.
        ...(item.offerId && item.lockedAt
          ? { offerId: item.offerId, lockedAt: new Date(item.lockedAt).toISOString() }
          : {}),
      }));

      // 1. Create Order on your backend to get Razorpay Order ID
      const { data } = await createOrder({
        restaurantId,
        customerName,
        tableNumber,
        items: orderItems,
        totalPrice: totalAmount,
      });

      if (!data.success) {
        Toast.show({ type: 'error', text1: data.message || 'Failed to create order' });
        setIsProcessing(false);
        return;
      }

      const { razorpayOrderId, amount, currency, orderDBId } = data;

      const options = {
        description: `Order for Table ${tableNumber}`,
        image: 'https://cdn-icons-png.flaticon.com/512/3703/3703377.png', 
        currency: currency || 'INR',
        key: RAZORPAY_KEY,
        amount: amount,
        name: 'BhojanQR',
        order_id: razorpayOrderId,
        prefill: {
          name: customerName,
          email: 'bhojanqr@gamil.com', 
          contact: '9142364660' 
        },
        theme: { color: '#ea580c' },
      };

      RazorpayCheckout.open(options)
        .then(async (response: any) => {
          // 3. Verify Payment
          try {
            const { data: verifyData } = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderDBId,
            });

            if (verifyData.success) {
              Toast.show({ type: 'success', text1: 'Payment successful!' });
              
              const restName = cart[0]?.restaurant?.restaurantName || 'BhojanQR Partner';
              const restEmail = cart[0]?.restaurant?.email || 'contact@bhojanqr.com';
              const finalCartData = [...cart];
              dispatch(clearCart());
              
              // Navigate to success screen
              navigation.navigate('OrderSuccess', {
                restaurantId: restaurantId,
                customerName,
                tableNumber,
                total: totalAmount,
                paymentId: response.razorpay_payment_id,
                restaurantName: restName,
                restaurantEmail: restEmail,
                cart: finalCartData,
              });
            } else {
              Toast.show({ type: 'error', text1: 'Payment verification failed' });
            }
          } catch {
            Toast.show({ type: 'error', text1: 'Error verifying payment' });
          } finally {
            setIsProcessing(false);
          }
        })
        .catch((error: any) => {
          console.log("Razorpay Error Full:", JSON.stringify(error));
          
          let errorTitle = "Payment Failed";
          let errorDesc = "Something went wrong. Please try again.";

          // 1. Extract inner error object safely
          const innerError = error?.error || {};
          
          // 2. Check all possible places where the error code/reason might be hiding
          const errorCode = error?.code || innerError?.code;
          const errorReason = innerError?.reason;
          const descriptionString = error?.description || "";

          // 🌟 SMART ERROR HANDLING (Nested checking)
          if (
            errorCode === 2 || 
            errorCode === '2' || 
            errorCode === 'BAD_REQUEST_ERROR' || 
            errorReason === 'payment_error' ||
            errorReason === 'payment_cancelled' ||
            descriptionString.includes('BAD_REQUEST_ERROR') ||
            descriptionString.toLowerCase().includes('cancel')
          ) {
            errorTitle = "Payment Cancelled";
            errorDesc = "You closed the payment window or authentication failed.";
          } 
          // Custom genuine errors from Bank (if description is readable and not "undefined")
          else if (innerError?.description && innerError.description !== 'undefined') {
            errorDesc = innerError.description;
          } 
          else if (typeof descriptionString === 'string' && !descriptionString.startsWith('{') && descriptionString !== 'undefined') {
            errorDesc = descriptionString;
          }

          // Show Toast with clear meaning
          Toast.show({ 
            type: 'error', 
            text1: errorTitle, 
            text2: errorDesc 
          });
          
          setIsProcessing(false);
        });

    } catch (err) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Something went wrong.' });
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <TouchableOpacity onPress={handleBackToMenu} style={styles.backBtn}>
          <ArrowLeft size={20} color="#16a34a" />
          <Text style={styles.backText}>Back to Menu</Text>
        </TouchableOpacity>
        <View style={styles.emptyContent}>
          <ShoppingCart size={80} color="#dcfce7" style={{ marginBottom: 20 }} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyDesc}>Explore our delicious menu and find your favorite dishes!</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFormValid = tableNumber.trim() !== '' && customerName.trim() !== '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToMenu} style={styles.backBtn}>
          <ArrowLeft size={20} color="#16a34a" />
          <Text style={styles.backText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>

      {/* KEEP THE REST OF YOUR RETURN JSX EXACTLY AS YOU HAD IT */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <Text style={styles.mainTitle}>Your <Text style={{ color: '#ea580c' }}>Cart</Text></Text>
          <View style={styles.totalBox}>
            <Text style={styles.totalBoxLabel}>Total</Text>
            <Text style={styles.totalBoxAmount}>₹{totalAmount}</Text>
          </View>
        </View>

        {/* CART ITEMS */}
        <View style={styles.itemsList}>
          {cart.map((item: any) => {
            const lockRemaining = item.lockedAt
              ? PRICE_LOCK_DURATION_MS - (now.getTime() - item.lockedAt)
              : null;
            return (
              <View key={item.cartLineId} style={styles.cartCard}>
                <Image source={{ uri: item.imageUrl }} style={styles.cartImage} />
                <View style={styles.cartDetails}>
                  <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.cartPriceRow}>
                    {item.offerId && item.originalPrice ? (
                      <Text style={styles.cartItemPriceStrike}>₹{item.originalPrice}</Text>
                    ) : null}
                    <Text style={styles.cartItemPrice}>₹{item.price}</Text>
                  </View>
                  {item.offerId && lockRemaining != null && lockRemaining > 0 && (
                    <Text style={styles.lockText}>
                      {item.offerName} locked for {formatCountdown(lockRemaining)}
                    </Text>
                  )}

                  <View style={styles.cartActionsRow}>
                    <View style={styles.qtyControl}>
                      <TouchableOpacity onPress={() => dispatch(updateQuantity({ id: item.cartLineId, quantity: Math.max(1, item.quantity - 1) }))} style={styles.qtyBtn}>
                        <Minus size={14} color="#4b5563" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity onPress={() => dispatch(updateQuantity({ id: item.cartLineId, quantity: item.quantity + 1 }))} style={styles.qtyBtn}>
                        <Plus size={14} color="#4b5563" />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => {
                      dispatch(removeFromCart(item.cartLineId));
                      Toast.show({ type: 'success', text1: 'Item removed' });
                    }} style={styles.deleteBtn}>
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* CHECKOUT FORM */}
        <View style={styles.checkoutCard}>
          <View style={styles.checkoutHeader}>
            <CreditCard size={20} color="#16a34a" />
            <Text style={styles.checkoutTitle}>Checkout Details</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}><Hash size={14} color="#9ca3af" /> Table Number</Text>
            <TextInput
              style={[styles.input, tableLocked && styles.inputLocked]}
              value={tableNumber}
              onChangeText={tableLocked ? undefined : setTableNumber}
              editable={!tableLocked}
              placeholder="e.g. 5, A3"
              keyboardType="default"
            />
            {tableLocked && (
              <Text style={styles.lockedHint}>Locked from your table's QR code</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}><User size={14} color="#9ca3af" /> Customer Name</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Your full name"
            />
          </View>

          <TouchableOpacity
            style={[styles.payBtn, (!isFormValid || isProcessing) && styles.payBtnDisabled]}
            onPress={handleProceed}
            disabled={!isFormValid || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <ShoppingCart size={20} color="#fff" />
                <Text style={styles.payBtnText}>Pay ₹{totalAmount}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- STYLES REMAIN EXACTLY THE SAME ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' }, // Light green bg
  emptyContainer: { flex: 1, backgroundColor: '#f0fdf4', padding: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: '#16a34a', fontWeight: '600' },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#15803d', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#4b5563', textAlign: 'center', paddingHorizontal: 20 },

  header: { padding: 16 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  mainTitle: { fontSize: 32, fontWeight: '900', color: '#15803d' },
  totalBox: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, elevation: 2 },
  totalBoxLabel: { fontSize: 10, color: '#6b7280', fontWeight: 'bold' },
  totalBoxAmount: { fontSize: 18, fontWeight: '900', color: '#15803d' },

  itemsList: { gap: 16, marginBottom: 24 },
  cartCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, elevation: 2 },
  cartImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#f3f4f6' },
  cartDetails: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  cartItemName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  cartPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartItemPrice: { fontSize: 16, fontWeight: '900', color: '#ea580c' },
  cartItemPriceStrike: { fontSize: 13, fontWeight: '600', color: '#9ca3af', textDecorationLine: 'line-through' },
  lockText: { fontSize: 11, fontWeight: '600', color: '#c2410c', marginTop: 2 },
  cartActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 },
  qtyBtn: { padding: 8, backgroundColor: '#f9fafb', borderRadius: 8 },
  qtyText: { paddingHorizontal: 12, fontWeight: 'bold', fontSize: 16 },
  deleteBtn: { padding: 8, backgroundColor: '#fef2f2', borderRadius: 8 },

  checkoutCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 4 },
  checkoutHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  checkoutTitle: { fontSize: 18, fontWeight: 'bold', color: '#15803d' },
  inputGroup: { marginBottom: 16 },
  label: { flexDirection: 'row', fontSize: 12, fontWeight: 'bold', color: '#4b5563', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 16, backgroundColor: '#f9fafb' },
  inputLocked: { backgroundColor: '#f3f4f6', color: '#9ca3af' },
  lockedHint: { fontSize: 11, color: '#9ca3af', marginTop: 4, fontWeight: '600' },
  
  payBtn: { backgroundColor: '#ea580c', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 16, marginTop: 8, gap: 8 },
  payBtnDisabled: { backgroundColor: '#d1d5db' },
  payBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default Cart;