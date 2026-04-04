import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, TextInput, ScrollView, Dimensions, ActivityIndicator, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
import { API_URL } from '../config';
import { APP_NAME, CURRENCY } from '../constants';

const PaymentScreen = ({ onNavigate, userData, checkoutData, globalData }) => {
  const [stage, setStage] = useState('select_method'); // 'select_method', 'card_details', 'success'
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentId, setPaymentId] = useState('');

  // Form State
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cvv, setCvv] = useState('');
  const [expiry, setExpiry] = useState('');
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const orderId = checkoutData?.orderId || 'ORD-000000';
  const amount = checkoutData?.amount || 0;

  useEffect(() => {
    if (stage === 'success') {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 5 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true })
      ]).start();
    }
  }, [stage]);

  const cardMethods = [
    { name: 'Mastercard', icon: require('../Images/Mastercard.png') },
    { name: 'Visa', icon: require('../Images/Visacard.png') },
    { name: 'American Express', icon: require('../Images/Amexcard.png') },
    { name: 'Maestro', icon: require('../Images/Maestrocard.png') },
    { name: 'Cirrus', icon: require('../Images/Cirruscard.png') },
    { name: 'JCB', icon: require('../Images/JCBcard.png') },
  ];

  const formatExpiry = (text) => {
    // Remove any non-digits
    const cleanText = text.replace(/\D/g, '');
    let formatted = cleanText;
    if (cleanText.length > 2) {
      formatted = cleanText.slice(0, 2) + '/' + cleanText.slice(2, 4);
    }
    setExpiry(formatted);
  };

  const handlePayment = async () => {
    // Basic Validations
    if (!cardName) return Alert.alert("Required", "Please enter the name on your card.");
    if (cardNumber.length < 16) return Alert.alert("Invalid Card", "Card number must be 16 digits.");
    if (cvv.length < 3) return Alert.alert("Invalid CVV", "CVV must be 3 or 4 digits.");
    if (expiry.length < 5) return Alert.alert("Invalid Expiry", "Please enter a valid expiry date (MM/YY).");

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/payments/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount,
          method: 'Bank Card',
          cardDetails: { type: selectedMethod }
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setPaymentId(data.paymentId);
        setStage('success');
        globalData.cart.clear(); // Clear local cart
        globalData.refresh(); // Sync global data
      } else {
        Alert.alert("Payment Failed", data.message || "Unable to process payment.");
      }
    } catch (error) {
      console.error("Payment Error:", error);
      Alert.alert("Error", "Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.logoContainer}>
          <Image source={require('../Images/Paynow.jpg')} style={styles.logo} />
        </View>
        <View style={styles.orderInfo}>
          <Text style={styles.companyName}>{APP_NAME}</Text>
          <Text style={styles.orderNumber}>Order {orderId}</Text>
          <Text style={styles.amountText}>{CURRENCY} {amount.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );

  const renderSelectMethod = () => (
    <View style={styles.content}>
      <View style={styles.stageHeader}>
        <Text style={styles.stageTitle}>Pay with</Text>
        <TouchableOpacity onPress={() => onNavigate('cart')}>
          <Text style={styles.backToCart}>Back to Cart</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subTitle}>Bank Card</Text>

      <View style={styles.cardGrid}>
        {cardMethods.map((method, index) => (
          <TouchableOpacity
            key={index}
            style={styles.cardItem}
            onPress={() => {
              setSelectedMethod(method.name);
              setStage('card_details');
            }}
          >
            <View style={styles.cardIconWrapper}>
              <Image source={method.icon} style={styles.cardBrandIcon} resizeMode="contain" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCardDetails = () => (
    <View style={styles.content}>
      <TouchableOpacity style={styles.backLink} onPress={() => setStage('select_method')}>
        <Ionicons name="chevron-back" size={24} color="#333" />
        <Text style={styles.backLinkText}>Bank Card</Text>
      </TouchableOpacity>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Name on Card"
          value={cardName}
          onChangeText={setCardName}
        />
        <TextInput
          style={styles.input}
          placeholder="Credit Card Number"
          keyboardType="numeric"
          maxLength={16}
          value={cardNumber}
          onChangeText={setCardNumber}
        />
        <TextInput
          style={styles.input}
          placeholder="CVV"
          keyboardType="numeric"
          maxLength={4}
          value={cvv}
          onChangeText={setCvv}
        />
        <TextInput
          style={styles.input}
          placeholder="Expiry MM/YY"
          keyboardType="numeric"
          maxLength={5}
          value={expiry}
          onChangeText={formatExpiry}
        />

        <TouchableOpacity
          style={styles.payButton}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>Pay {amount.toFixed(2)}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.content}>
      <View style={styles.successContainer}>
        <Text style={styles.thankYouText}>THANK YOU!</Text>

        <View style={styles.successVisual}>
          <Animated.View style={[styles.checkmarkCircle, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
            <Ionicons name="checkmark" size={60} color="#00B140" />
          </Animated.View>
          <Animated.Text style={[styles.approvedText, { opacity: opacityAnim }]}>Payment Approved</Animated.Text>
        </View>

        <View style={styles.paymentDetailsBox}>
          <Text style={styles.paymentIdLabel}>Payment ID #{paymentId.split('-')[1] || paymentId}</Text>
          <Text style={styles.paymentSubtitle}>You'll receive an Email Receipt with this Payment ID for further reference</Text>
        </View>

        <TouchableOpacity style={styles.homeLink} onPress={() => onNavigate('home')}>
          <Text style={styles.homeLinkText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      <View style={styles.securedContainer}>
        <View style={styles.securedLine}>
          <Ionicons name="lock-closed" size={12} color="#999" />
          <Text style={styles.securedText}>Secured By</Text>
        </View>
        <Text style={styles.payNowBrand}><Text style={{ color: '#2b3990' }}>Pay</Text><Text style={{ color: '#f15a24' }}>Now</Text></Text>
        <Text style={styles.gatewayDisclaimer}>PayNow is a Central Bank Approved Secure Payment Gateway Service</Text>
      </View>

      <View style={styles.tabContainer}>
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => onNavigate('home')}><Ionicons name="home" size={28} color="#333" /></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}><Ionicons name="time-outline" size={28} color="#999" /></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}><Ionicons name="heart-outline" size={28} color="#999" /></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => onNavigate('profile')}><Ionicons name="person-outline" size={28} color="#999" /></TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.3, backgroundColor: '#657E63', zIndex: -1 }} />
      {renderHeader()}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {stage === 'select_method' && renderSelectMethod()}
        {stage === 'card_details' && renderCardDetails()}
        {stage === 'success' && renderSuccess()}
      </ScrollView>
      {renderFooter()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    backgroundColor: '#657E63',
    height: height * 0.28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingTop: 40,
    paddingBottom: 20
  },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  logo: { width: '80%', height: '80%', borderRadius: 10 },
  orderInfo: { marginLeft: 15 },
  companyName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  orderNumber: { color: '#fff', fontSize: 12, marginTop: 2 },
  amountText: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 5 },

  content: { flex: 1, paddingHorizontal: 25, paddingTop: 30, backgroundColor: '#FFFFFF' },
  stageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  stageTitle: { fontSize: 28, fontWeight: '800', color: '#333' },
  backToCart: { color: '#999', fontSize: 14, textDecorationLine: 'underline' },
  subTitle: { fontSize: 16, color: '#999', fontWeight: '700', marginBottom: 20 },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
  cardItem: { width: '32%', alignItems: 'center', marginBottom: 25, backgroundColor: '#FFF', paddingVertical: 15, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: '#f0f0f0' },
  cardIconWrapper: { width: 95, height: 60, justifyContent: 'center', alignItems: 'center' },
  cardBrandIcon: { width: '100%', height: '100%' },

  backLink: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, gap: 5 },
  backLinkText: { fontSize: 28, fontWeight: '800', color: '#333' },
  form: { gap: 15 },
  input: { backgroundColor: '#EEF2F6', height: 50, borderRadius: 8, paddingHorizontal: 15, fontSize: 16, fontWeight: '600' },
  payButton: { backgroundColor: '#00B140', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  payButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  successContainer: { alignItems: 'center', flex: 1 },
  thankYouText: { color: '#999', fontSize: 18, fontWeight: '700', marginTop: 20 },
  successVisual: { alignItems: 'center', marginTop: 50 },
  checkmarkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 5,
    borderColor: '#00B140',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  approvedText: { fontSize: 18, fontWeight: '800', color: '#555' },
  paymentDetailsBox: { backgroundColor: '#EEF2F6', width: '100%', padding: 20, marginTop: 50, borderRadius: 10, alignItems: 'center' },
  paymentIdLabel: { fontSize: 16, fontWeight: '800', color: '#555', marginBottom: 5 },
  paymentSubtitle: { fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 18 },
  homeLink: { marginTop: 30, borderBottomWidth: 1, borderBottomColor: '#333' },
  homeLinkText: { fontSize: 18, fontWeight: '700', color: '#333', paddingBottom: 2 },

  footer: { paddingBottom: 0, backgroundColor: '#FFFFFF' },
  securedContainer: { alignItems: 'center', marginBottom: 20 },
  securedLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  securedText: { fontSize: 12, color: '#999', fontWeight: '600' },
  payNowBrand: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  gatewayDisclaimer: { fontSize: 8, color: '#CCC', marginTop: 5 },
  tabContainer: { alignItems: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    width: width * 0.9,
    height: 70,
    borderRadius: 35,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderColor: '#eee',
    borderWidth: 1
  },
  tabItem: { padding: 10 },
});

const { height } = Dimensions.get('window');

export default PaymentScreen;
