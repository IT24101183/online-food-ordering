import React, { useState, useEffect } from 'react';
import { View, SafeAreaView, StyleSheet, StatusBar, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import SplashScreen from './screens/SplashScreen';
import HomeScreen from './screens/HomeScreen';
import AdminScreen from './screens/AdminScreen';
import ProfileScreen from './screens/ProfileScreen';
import CartScreen from './screens/CartScreen';
import PaymentScreen from './screens/PaymentScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash'); // 'splash', 'login', 'register', 'home', 'admin', 'profile'
  const [userData, setUserData] = useState(null);
  const [initialDestination, setInitialDestination] = useState('login');

  // Pre-loaded food data
  const [posters, setPosters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [appLoading, setAppLoading] = useState(true);

  const getPromotionForItem = (item, currentPromotions) => {
    if (!currentPromotions || currentPromotions.length === 0) return null;
    
    // Priority 1: Item-specific promotion
    const itemPromo = currentPromotions.find(p => 
      p.items && p.items.some(promoItemId => (promoItemId._id || promoItemId) === item._id)
    );
    if (itemPromo) return itemPromo;

    // Priority 2: Category-wide promotion
    const catPromo = currentPromotions.find(p => 
      p.categories && p.categories.some(promoCatId => {
        const pId = (promoCatId._id || promoCatId).toString();
        // Check if item's categories (array of IDs or objects) includes this promoCatId
        return item.categories && item.categories.some(itemCat => {
          const iId = (itemCat._id || itemCat).toString();
          return iId === pId;
        });
      })
    );
    return catPromo || null;
  };

  // Global Cart State
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [checkoutData, setCheckoutData] = useState(null);

  useEffect(() => {
    checkAuth();
    fetchAppData();
  }, []);

  useEffect(() => {
    fetchCart();
  }, [userData]);

  const fetchAppData = async () => {
    try {
      const [posterRes, catRes, itemRes, promoRes] = await Promise.all([
        fetch(`${API_URL}/api/advertisements`),
        fetch(`${API_URL}/api/categories`),
        fetch(`${API_URL}/api/items`),
        fetch(`${API_URL}/api/promotions`),
      ]);

      const [posterData, catData, itemData, promoData] = await Promise.all([
        posterRes.json(),
        catRes.json(),
        itemRes.json(),
        promoRes.json(),
      ]);

      if (posterRes.ok) setPosters(posterData);
      if (catRes.ok) setCategories(catData);
      if (itemRes.ok) setItems(itemData);
      if (promoRes.ok) setPromotions(promoData);
    } catch (error) {
      console.error("Global Data Fetch Error:", error);
    } finally {
      setAppLoading(false);
    }
  };

  const fetchCart = async () => {
    const userId = userData?.id || userData?._id;
    if (!userId) {
      setCartItems([]);
      setCartCount(0);
      setCartTotal(0);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/cart/${userId}`);
      const data = await response.json();
      if (response.ok) {
        updateLocalCart(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    }
  };

  const updateLocalCart = (items) => {
    setCartItems(items);
    const count = items.reduce((acc, item) => acc + item.quantity, 0);
    
    const total = items.reduce((acc, item) => {
      const product = item.itemId;
      if (!product) return acc;
      
      const promo = getPromotionForItem(product, promotions);
      const price = promo ? product.price * (1 - promo.discountValue / 100) : product.price;
      
      return acc + (price * item.quantity);
    }, 0);

    setCartCount(count);
    setCartTotal(total);
  };

  const addToCart = async (itemId) => {
    const userId = userData?.id || userData?._id;
    if (!userId) return;

    // FIND ITEM for optimistic update
    const itemToAdd = items.find(it => it._id === itemId);
    if (!itemToAdd) return;

    // OPTIMISTIC UPDATE
    const existingItemIndex = cartItems.findIndex(it => it.itemId?._id === itemId);
    let newCartItems = [...cartItems];

    if (existingItemIndex > -1) {
      newCartItems[existingItemIndex] = {
        ...newCartItems[existingItemIndex],
        quantity: newCartItems[existingItemIndex].quantity + 1
      };
    } else {
      newCartItems.push({ itemId: itemToAdd, quantity: 1 });
    }

    updateLocalCart(newCartItems);

    try {
      const response = await fetch(`${API_URL}/api/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, itemId, quantity: 1 }),
      });
      if (response.ok) {
        fetchCart(); // Sync final state
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      fetchCart(); // Rollback/Sync on error
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    const userId = userData?.id || userData?._id;
    if (!userId) return;

    // Optimistic UI update
    const updatedItems = cartItems.map(item => {
      if (item.itemId?._id === itemId) return { ...item, quantity: newQuantity };
      return item;
    }).filter(item => item.quantity > 0);
    updateLocalCart(updatedItems);

    try {
      const response = await fetch(`${API_URL}/api/cart/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, itemId, quantity: newQuantity }),
      });
      if (response.ok) {
        fetchCart();
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      fetchCart(); // Revert on error
    }
  };

  const clearCart = async () => {
    const userId = userData?.id || userData?._id;
    if (!userId) return;

    setCartItems([]);
    setCartCount(0);
    setCartTotal(0);

    try {
      await fetch(`${API_URL}/api/cart/${userId}`, { method: 'DELETE' });
    } catch (error) {
      console.error("Error clearing cart:", error);
      fetchCart(); // Revert on error
    }
  };

  const checkAuth = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('userData');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserData(user);
        const role = user.role?.toLowerCase();
        if (role === 'admin' || role === 'staff') {
          setInitialDestination('admin');
        } else {
          setInitialDestination('home');
        }
      } else {
        setInitialDestination('home');
      }
    } catch (error) {
      console.error("Auth Check Error:", error);
      setInitialDestination('login');
    }
  };

  return (
    <>
      <StatusBar
        barStyle={currentScreen === 'splash' ? "dark-content" : "light-content"}
        backgroundColor={currentScreen === 'splash' ? "#C8D9C6" : "#0f172a"}
      />

      {currentScreen === 'splash' ? (
        <SplashScreen onNavigate={setCurrentScreen} destination={initialDestination} />
      ) : currentScreen === 'home' ? (
        <HomeScreen
          onNavigate={setCurrentScreen}
          userData={userData}
          setUserData={setUserData}
          globalData={{
            posters,
            categories,
            items,
            promotions,
            loading: appLoading,
            refresh: fetchAppData,
            cart: { items: cartItems, count: cartCount, total: cartTotal, add: addToCart, update: updateQuantity, clear: clearCart, fetch: fetchCart }
          }}
        />
      ) : currentScreen === 'admin' ? (
        <AdminScreen onNavigate={setCurrentScreen} userData={userData} setUserData={setUserData} />
      ) : currentScreen === 'login' ? (
        <LoginScreen onNavigate={setCurrentScreen} setUserData={setUserData} />
      ) : currentScreen === 'register' ? (
        <RegisterScreen onNavigate={setCurrentScreen} />
      ) : currentScreen === 'profile' ? (
        <ProfileScreen onNavigate={setCurrentScreen} userData={userData} setUserData={setUserData} />
      ) : currentScreen === 'cart' ? (
        <CartScreen
          onNavigate={setCurrentScreen}
          userData={userData}
          setCheckoutData={setCheckoutData}
          globalData={{
            cart: { items: cartItems, count: cartCount, total: cartTotal, add: addToCart, update: updateQuantity, clear: clearCart, fetch: fetchCart }
          }}
        />
      ) : currentScreen === 'payment' ? (
        <PaymentScreen 
          onNavigate={setCurrentScreen} 
          userData={userData} 
          checkoutData={checkoutData} 
          globalData={{ 
            refresh: fetchAppData, 
            cart: { fetch: fetchCart, clear: clearCart } 
          }} 
        />
      ) : (
        <SafeAreaView style={styles.container}>
          <View style={styles.dashboard}>
            <Text style={styles.dashboardTitle}>🎉 Admin Portal</Text>
            <Text style={styles.dashboardText}>If you see this, please restart your app to refresh the latest UI.</Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={() => setCurrentScreen('login')}>
              <Text style={styles.logoutText}>Return to Login</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  dashboard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f97316',
    marginBottom: 10,
  },
  dashboardText: {
    fontSize: 16,
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  logoutBtn: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  }
});
