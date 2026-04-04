import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, ScrollView, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { CURRENCY } from '../constants';

const { width } = Dimensions.get('window');
// API_URL imported from config.js

const getPromotionForItem = (item, promotions) => {
  if (!promotions || promotions.length === 0) return null;
  
  // Priority 1: Item-specific promotion
  const itemPromo = promotions.find(p => 
    p.items && p.items.some(promoItemId => (promoItemId._id || promoItemId) === item._id)
  );
  if (itemPromo) return itemPromo;

  // Priority 2: Category-wide promotion
  const catPromo = promotions.find(p => 
    p.categories && p.categories.some(promoCatId => {
      const pId = (promoCatId._id || promoCatId).toString();
      // Check if item's categories (objects or IDs) includes this promoCatId
      return item.categories && item.categories.some(itemCat => {
        const iId = (itemCat._id || itemCat).toString();
        return iId === pId;
      });
    })
  );
  return catPromo || null;
};

const CartScreen = ({ onNavigate, userData, globalData, setCheckoutData }) => {
  const cartItems = globalData.cart.items || [];
  const subtotal = globalData.cart.total || 0;

  const handleProceedToPay = async () => {
    if (cartItems.length === 0) return;

    try {
      // 1. Create the order on the backend
      const orderResponse = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData?._id || userData?.id,
          totalAmount: subtotal,
          items: cartItems
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        Alert.alert("Order Error", orderData.message || "Something went wrong.");
        return;
      }

      // 2. Navigate to custom Payment Screen
      setCheckoutData({
        orderId: orderData.orderNumber,
        amount: subtotal
      });
      onNavigate('payment');
    } catch (error) {
      console.error("Checkout Error:", error);
      Alert.alert("Checkout Error", "Failed to initiate payment. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('home')}>
          <Ionicons name="chevron-back" size={24} color="#5E7D5E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        <View style={styles.profileButton}>
          <Image
            source={{ uri: userData?.profilePicture ? userData.profilePicture : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQnD5fWTO7ZJ0LWFJLdU7xGd1FhnXCuZLpxxQ&s' }}
            style={styles.profileImage}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Store Pickup Badge */}
        <View style={styles.pickupBadge}>
          <Ionicons name="location" size={24} color="#fff" />
          <Text style={styles.pickupText}>Store Pick Up</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Your order will be ready soon! Please pick it up from EatUP Restaurant, Colombo 7.</Text>
          <Text style={styles.infoSubtitle}>We currently do not provide delivery services. Thanks for your understanding.</Text>
        </View>

        {cartItems.length > 0 ? (
          <>
            <TouchableOpacity style={styles.clearCartButton} onPress={globalData.cart.clear}>
              <Text style={styles.clearCartText}>Clear Cart</Text>
              <Ionicons name="cart-outline" size={20} color="#999" />
            </TouchableOpacity>

            <View style={styles.itemsList}>
              {cartItems.map((item) => (
                <View key={item.itemId?._id || item._id} style={styles.cartItem}>
                  <Image source={{ uri: item.itemId?.image }} style={styles.itemImage} />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.itemId?.name}</Text>
                    {(() => {
                      const promo = getPromotionForItem(item.itemId || {}, globalData.promotions);
                      if (promo) {
                        const discountedPrice = item.itemId.price * (1 - promo.discountValue / 100);
                        return (
                          <View>
                            <View style={styles.priceRow}>
                              <Text style={styles.originalPrice}>{CURRENCY} {item.itemId.price.toFixed(2)}</Text>
                              <View style={styles.promoBadge}>
                                <Text style={styles.promoBadgeText}>{promo.discountValue}%</Text>
                              </View>
                            </View>
                            <Text style={styles.discountedPrice}>{CURRENCY} {discountedPrice.toFixed(2)}</Text>
                          </View>
                        );
                      }
                      return <Text style={styles.itemPrice}>{CURRENCY} {item.itemId?.price.toFixed(2)}</Text>;
                    })()}
                  </View>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.qtyBtnMinus}
                      onPress={() => globalData.cart.update(item.itemId?._id, item.quantity - 1)}
                    >
                      <Ionicons name="remove" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtnPlus}
                      onPress={() => globalData.cart.update(item.itemId?._id, item.quantity + 1)}
                    >
                      <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.summarySection}>
              {(() => {
                const originalSubtotal = cartItems.reduce((acc, item) => acc + (item.itemId?.price * item.quantity || 0), 0);
                const discountAmount = originalSubtotal - subtotal;
                
                if (discountAmount > 0) {
                  return (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal</Text>
                        <Text style={styles.summaryValue}>{CURRENCY} {originalSubtotal.toFixed(2)}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: '#8B3A3A' }]}>Discount</Text>
                        <Text style={[styles.summaryValue, { color: '#8B3A3A' }]}>- {CURRENCY} {discountAmount.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, marginTop: 5 }]}>
                        <Text style={styles.summaryLabel}>Total Amount</Text>
                        <Text style={[styles.summaryValue, { fontSize: 22, fontWeight: '900' }]}>{CURRENCY} {subtotal.toFixed(2)}</Text>
                      </View>
                    </>
                  );
                }
                
                return (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>{CURRENCY} {subtotal.toFixed(2)}</Text>
                  </View>
                );
              })()}
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={100} color="#eee" />
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <TouchableOpacity style={styles.shopNowBtn} onPress={() => onNavigate('home')}>
              <Text style={styles.shopNowText}>Shop Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Section */}
      {cartItems.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.payButton}
            onPress={handleProceedToPay}
          >
            <Text style={styles.payButtonText}>Proceed to Pay</Text>
            <Text style={styles.payButtonTotal}>{CURRENCY} {subtotal.toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Nav Placeholder (to match global UI) */}
      <View style={styles.navContainer}>
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('home')}><Ionicons name="home-outline" size={28} color="#999" /></TouchableOpacity>
          <TouchableOpacity style={styles.navItem}><Ionicons name="time-outline" size={28} color="#999" /></TouchableOpacity>
          <TouchableOpacity style={styles.navItem}><Ionicons name="heart-outline" size={28} color="#999" /></TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('profile')}><Ionicons name="person-outline" size={28} color="#999" /></TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 10, height: 60 },
  backButton: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#D9E4D6', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#333' },
  profileButton: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 1, borderColor: '#eee', overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%' },
  scrollContent: { paddingBottom: 170 },
  pickupBadge: {
    flexDirection: 'row',
    backgroundColor: '#657E63',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  pickupText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  infoSection: { paddingHorizontal: 25, marginTop: 15 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#333', textAlign: 'left', lineHeight: 18 },
  infoSubtitle: { fontSize: 11, fontWeight: '700', color: '#A04040', textAlign: 'left', marginTop: 5 },
  clearCartButton: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 5, paddingHorizontal: 25, marginTop: 25 },
  clearCartText: { color: '#999', fontSize: 14, fontWeight: '600' },
  itemsList: { paddingHorizontal: 20, marginTop: 15 },
  cartItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#fff', paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemImage: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#F8F8F8' },
  itemInfo: { flex: 1, marginLeft: 15 },
  itemName: { fontSize: 18, fontWeight: '800', color: '#333' },
  itemPrice: { fontSize: 15, fontWeight: '600', color: '#666', marginTop: 5 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtnMinus: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8E3E3E', justifyContent: 'center', alignItems: 'center' },
  qtyBtnPlus: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00B140', justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 20, fontWeight: '800', color: '#333', width: 25, textAlign: 'center' },
  summarySection: { paddingHorizontal: 25, marginTop: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 20, fontWeight: '800', color: '#333' },
  summaryValue: { fontSize: 18, fontWeight: '600', color: '#333' },
  bottomBar: { position: 'absolute', bottom: 110, width: '100%', paddingHorizontal: 20, zIndex: 10 },
  payButton: {
    backgroundColor: '#657E63',
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10
  },
  payButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  payButtonTotal: { color: '#fff', fontSize: 18, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, color: '#999', fontWeight: '600', marginTop: 10 },
  shopNowBtn: { marginTop: 20, backgroundColor: '#657E63', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  shopNowText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  navContainer: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', paddingBottom: 30, zIndex: 10 },
  bottomNav: { flexDirection: 'row', backgroundColor: '#FFFFFF', width: width * 0.9, height: 70, borderRadius: 35, justifyContent: 'space-around', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10, borderColor: '#eee', borderWidth: 1 },
  navItem: { padding: 10, alignItems: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  originalPrice: { fontSize: 14, fontWeight: '500', color: '#999', textDecorationLine: 'line-through', marginRight: 10 },
  discountedPrice: { fontSize: 16, fontWeight: '800', color: '#333' },
  promoBadge: { backgroundColor: '#8B3A3A', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  promoBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
});

export default CartScreen;
