import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, Dimensions, Animated, PanResponder, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import { APP_NAME, CURRENCY, DEFAULT_IMAGES, STATUS_COLORS } from '../constants';

// Import Components
import AddCategory from '../components/AddCategory';
import User from '../components/User';
import AddItem from '../components/AddItem';
import PosterManager from '../components/PosterManager';
import PromotionManager from '../components/PromotionManager';
import FinanceManager from '../components/FinanceManager';

const { width, height } = Dimensions.get('window');

const AdminScreen = ({ onNavigate, userData, setUserData }) => {
  const [isShopOpen, setIsShopOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Incoming');

  const panY = useRef(new Animated.Value(height * 0.3)).current;
  const lastPanY = useRef(height * 0.3);
  const [activeManager, setActiveManager] = useState('Orders');

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [now, setNow] = useState(new Date());

  // Reviews State
  const [allReviews, setAllReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [filterRating, setFilterRating] = useState(0); // 0 = All

  // Update timer every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeManager === 'Orders') {
      fetchOrders();
    } else if (activeManager === 'Reviews') {
      fetchAllReviews();
    }
  }, [activeManager]);

  const fetchAllReviews = async () => {
    setReviewsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/reviews`);
      const data = await response.json();
      if (response.ok) {
        setAllReviews(data);
      }
    } catch (err) {
      console.error("Error fetching admin reviews:", err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const deleteReview = async (id) => {
    Alert.alert("Delete Review", "Are you sure you want to remove this feedback?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const response = await fetch(`${API_URL}/api/reviews/${id}`, { method: 'DELETE' });
            if (response.ok) {
              fetchAllReviews();
              Alert.alert("Deleted", "Review has been removed.");
            }
          } catch (err) {
            console.error("Delete review error:", err);
          }
        }
      }
    ]);
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await fetch(`${API_URL}/api/orders/admin`);
      const data = await response.json();
      if (response.ok) {
        setOrders(data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error("Status Update Error:", error);
    }
  };

  const getFilteredOrders = () => {
    if (activeTab === 'Incoming') return orders.filter(o => o.status === 'pending');
    if (activeTab === 'Preparing') return orders.filter(o => o.status === 'confirmed');
    if (activeTab === 'Ready') return orders.filter(o => o.status === 'ready');
    if (activeTab === 'History') return orders.filter(o => o.status === 'completed' || o.status === 'cancelled');
    return [];
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "No", style: "cancel" },
      { text: "Yes", onPress: async () => { await AsyncStorage.removeItem('userData'); setUserData(null); onNavigate('home'); } }
    ]);
  };

  const SNAP_TOP = 0;
  const SNAP_UP = -height * 0.38;
  const SNAP_BOTTOM = height * 0.3;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (evt, gestureState) => {
        let newY = lastPanY.current + gestureState.dy;
        if (newY < SNAP_UP) newY = SNAP_UP;
        if (newY > SNAP_BOTTOM) newY = SNAP_BOTTOM;
        panY.setValue(newY);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const currentY = lastPanY.current + gestureState.dy;
        let destY = SNAP_TOP;
        if (currentY < SNAP_TOP / 2 && currentY < SNAP_UP / 2) destY = SNAP_UP;
        else if (currentY > SNAP_BOTTOM / 3) {
          destY = SNAP_BOTTOM;
          if (activeManager !== 'Orders') setActiveManager('Orders');
        }
        Animated.spring(panY, { toValue: destY, useNativeDriver: true, tension: 50, friction: 9 }).start();
        lastPanY.current = destY;
      },
    })
  ).current;

  const adminActions = [
    { name: 'Add Item', icon: require('../Images/Add item.png') },
    { name: 'Add Category', icon: require('../Images/Add Category.png') },
    { name: 'Add Promotion', icon: require('../Images/Add Promotion.png') },
    { name: 'Users', icon: require('../Images/Users.png') },
    { name: 'Reviews', icon: require('../Images/Reviews.png') },
    { name: 'My Finance', icon: require('../Images/My Finance.png') }
  ];

  const orderTabs = [
    { name: 'Incoming', icon: require('../Images/Incoming.png') },
    { name: 'Preparing', icon: require('../Images/Preparing.png') },
    { name: 'Ready', icon: require('../Images/Ready.png') },
    { name: 'History', icon: require('../Images/History.png') },
  ];

  const OrderTimer = ({ createdAt, status, readyAt, updatedAt }) => {
    const start = new Date(createdAt);
    // Use readyAt if available, fallback to updatedAt for ready/completed orders, otherwise use current time (now)
    const isStopped = status === 'ready' || status === 'completed';
    const end = isStopped ? (readyAt ? new Date(readyAt) : (updatedAt ? new Date(updatedAt) : now)) : now;
    const diff = Math.floor((end - start) / 60000);
    const displayMins = diff < 0 ? 0 : diff;

    let color = '#00B140'; // Green
    if (displayMins > 20 && displayMins <= 40) color = '#FF9500'; // Orange
    else if (displayMins > 40) color = '#FF3B30'; // Red

    return (
      <View style={styles.timerContainer}>
        <View style={[styles.timerRing, { borderColor: isStopped ? '#657E63' : color, borderLeftColor: 'transparent' }]} />
        <View style={styles.timerContent}>
          <Text style={styles.timerValue}>{displayMins}</Text>
          <Text style={styles.timerUnit}>{isStopped ? 'Done' : 'Mins'}</Text>
        </View>
      </View>
    );
  };

  const renderReviewsPanel = () => {
    const filtered = filterRating === 0 ? allReviews : allReviews.filter(r => Math.round(r.rating) === filterRating);

    return (
      <View style={styles.managerPanel}>
        <View style={styles.financeHeaderPill}>
          <Text style={styles.financePillText}>Reviews</Text>
          <Image source={require('../Images/Reviews.png')} style={styles.financePillIcon} resizeMode="contain" />
        </View>

        <View style={styles.managerHeader}>
          <Text style={styles.managerTitle}>Recent Feedback</Text>
          <TouchableOpacity onPress={() => fetchAllReviews()}>
            <Ionicons name="refresh" size={24} color="#657E63" />
          </TouchableOpacity>
        </View>

        {/* Filter Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          {[0, 5, 4, 3, 2, 1].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.filterBtn, filterRating === r && styles.activeFilterBtn]}
              onPress={() => setFilterRating(r)}
            >
              <Text style={[styles.filterBtnText, filterRating === r && styles.activeFilterBtnText]}>
                {r === 0 ? "All" : `${r} ⭐`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {reviewsLoading ? (
          <ActivityIndicator size="large" color="#657E63" style={{ marginTop: 50 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbox-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>No reviews found.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {(() => {
              // Group reviews by orderId
              const groups = filtered.reduce((acc, rev) => {
                const oId = rev.orderId?._id || "unknown";
                if (!acc[oId]) acc[oId] = {
                  orderId: rev.orderId,
                  user: rev.userId,
                  createdAt: rev.createdAt,
                  reviews: []
                };
                acc[oId].reviews.push(rev);
                return acc;
              }, {});

              return Object.values(groups).map((group, gIdx) => (
                <View key={gIdx} style={styles.adminReviewCard}>
                  {/* Order Header */}
                  <View style={styles.adminReviewHeader}>
                    <View>
                      <Text style={styles.adminReviewUser}>{group.user?.name || "Customer"}</Text>
                      <Text style={styles.adminReviewOrderId}>Order ID: #{group.orderId?._id?.slice(-8).toUpperCase() || "N/A"}</Text>
                    </View>
                    <Text style={styles.adminReviewDate}>{new Date(group.createdAt).toLocaleDateString()}</Text>
                  </View>

                  {/* List of reviewed items in this order */}
                  {group.reviews.map((rev, rIdx) => (
                    <View key={rev._id} style={[styles.adminReviewOrderItem, rIdx > 0 && { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15, marginTop: 15 }]}>
                      <View style={styles.adminReviewItemInfo}>
                        <Image source={{ uri: rev.itemId?.image }} style={styles.adminReviewItemImg} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.adminReviewItemName}>{rev.itemId?.name}</Text>
                          <View style={styles.starsRowSmall}>
                            {[1, 2, 3, 4, 5].map(s => (
                              <Ionicons key={s} name={s <= rev.rating ? "star" : "star-outline"} size={14} color="#FFD700" />
                            ))}
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => deleteReview(rev._id)} style={styles.reviewDeleteIcon}>
                          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>

                      {rev.images && rev.images.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.adminReviewGallery}>
                          {rev.images.map((img, iIdx) => (
                            <Image key={iIdx} source={{ uri: img }} style={styles.adminReviewImg} />
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  ))}
                </View>
              ));
            })()}
          </ScrollView>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            if (activeManager !== 'Orders') {
              setActiveManager('Orders');
              Animated.spring(panY, { toValue: SNAP_BOTTOM, useNativeDriver: true }).start();
              lastPanY.current = SNAP_BOTTOM;
            } else handleLogout();
          }}><Ionicons name="chevron-back" size={24} color="#555" /></TouchableOpacity>
          <TouchableOpacity style={styles.profileButton} onPress={() => onNavigate('profile')}>
            <Image source={{ uri: userData?.profilePicture ? userData.profilePicture : DEFAULT_IMAGES.PROFILE }} style={styles.profileImage} />
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>Hi, {userData?.name || 'Admin'} 👋</Text>
          <Text style={styles.welcomeText}>Welcome to Admin Panel</Text>
        </View>

        {/* Action Grid */}
        <View style={styles.grid}>
          {adminActions.map((action, index) => (
            <View key={index} style={styles.gridItemContainer}>
              <TouchableOpacity style={styles.gridItem} onPress={() => {
                if (action.name === 'Add Item') { setActiveManager('AddItem'); Animated.spring(panY, { toValue: SNAP_UP, useNativeDriver: true }).start(); lastPanY.current = SNAP_UP; }
                else if (action.name === 'Add Category') { setActiveManager('Categories'); Animated.spring(panY, { toValue: SNAP_UP, useNativeDriver: true }).start(); lastPanY.current = SNAP_UP; }
                else if (action.name === 'Add Promotion') { setActiveManager('Promotions'); Animated.spring(panY, { toValue: SNAP_UP, useNativeDriver: true }).start(); lastPanY.current = SNAP_UP; }
                else if (action.name === 'Users') { setActiveManager('Users'); Animated.spring(panY, { toValue: SNAP_UP, useNativeDriver: true }).start(); lastPanY.current = SNAP_UP; }
                else if (action.name === 'My Finance') { setActiveManager('Finance'); Animated.spring(panY, { toValue: SNAP_UP, useNativeDriver: true }).start(); lastPanY.current = SNAP_UP; }
                else if (action.name === 'Reviews') { setActiveManager('Reviews'); Animated.spring(panY, { toValue: SNAP_UP, useNativeDriver: true }).start(); lastPanY.current = SNAP_UP; }
              }}><Image source={action.icon} style={styles.actionIcon} resizeMode="contain" /></TouchableOpacity>
              <Text style={styles.actionLabel}>{action.name}</Text>
            </View>
          ))}
        </View>

        {/* Shop Status */}
        <View style={styles.shopStatusSection}>
          <View style={styles.statusLabelContainer}>
            <Text style={styles.shopStatusTitle}>Shop is </Text>
            <View style={styles.statusPill}>
              <Text style={[styles.statusPillText, { color: isShopOpen ? '#00B140' : '#FF4B4B' }]}>{isShopOpen ? 'Opened' : 'Closed'}</Text>
            </View>
          </View>
          <Switch value={isShopOpen} onValueChange={setIsShopOpen} trackColor={{ false: "#ccc", true: "#eee" }} thumbColor={isShopOpen ? "#00B140" : "#f4f3f4"} />
        </View>

        {/* POSTER MANAGER - RE-VERIFIED LOCATION */}
        <View style={styles.posterManagerContainer}>
          <PosterManager />
        </View>

        <View style={{ height: 400 }} />
      </ScrollView>

      {/* Draggable Panel */}
      <Animated.View style={[styles.ordersSection, { transform: [{ translateY: panY }], zIndex: 10 }]}>
        <View style={styles.handleBarContainer} {...panResponder.panHandlers}><View style={styles.handleBar} /></View>
        {activeManager === 'Orders' ? (
          <View style={[styles.ordersManagerContainer, { flex: 1 }]}>
            <View style={styles.tabsPillContainer} {...panResponder.panHandlers}>
              {orderTabs.map((tab) => {
                const count = orders.filter(o => {
                  if (tab.name === 'Incoming') return o.status === 'pending';
                  if (tab.name === 'Preparing') return o.status === 'confirmed';
                  if (tab.name === 'Ready') return o.status === 'ready';
                  return false;
                }).length;

                return (
                  <TouchableOpacity key={tab.name} style={styles.tabItem} onPress={() => setActiveTab(tab.name)}>
                    <View style={styles.tabContent}>
                      <View style={styles.iconBadgeWrapper}>
                        <Image source={tab.icon} style={styles.tabIcon} resizeMode="contain" />
                        {count > 0 && (
                          <View style={styles.notifBadge}>
                            <Text style={styles.notifBadgeText}>{count}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.tabText, activeTab === tab.name && styles.activeTabText]}>{tab.name}</Text>
                    </View>
                    {activeTab === tab.name && <View style={styles.activeUnderline} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.orderListContainer}
              contentContainerStyle={{ paddingBottom: 400, flexGrow: 1 }}
            >
              {getFilteredOrders().length > 0 ? (
                getFilteredOrders().map((order) => (
                  <View key={order._id} style={styles.hiFiOrderCard}>
                    {/* Received & Customer Pill Row */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.receivedBadge}>
                        <View style={styles.receivedDot} />
                        <Text style={styles.receivedBadgeText}>Received</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.customerPill}
                        onPress={() => setSelectedUser(order.userId)}
                      >
                        <Text style={styles.customerPillName}>{order.userId?.name || 'Customer'}</Text>
                        <Text style={styles.customerPillPhone}>{order.userId?.telephone1 || 'No Phone'}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                      <View>
                        <Text style={styles.hiFiOrderTitle}>Order ID</Text>
                        <Text style={styles.hiFiOrderNumber}>{order.orderNumber}</Text>
                      </View>
                      {(activeTab === 'Incoming' || activeTab === 'Preparing' || activeTab === 'Ready') && (
                        <OrderTimer
                          createdAt={order.createdAt}
                          status={order.status}
                          readyAt={order.readyAt}
                          updatedAt={order.updatedAt}
                        />
                      )}
                    </View>

                    {/* Details Bar */}
                    <View style={styles.blueDetailsBar}>
                      <Text style={styles.detailsBarTitle}>Order details</Text>
                      <Text style={styles.detailsBarCount}>{order.items.reduce((acc, i) => acc + i.quantity, 0)} Items</Text>
                    </View>

                    {/* Items List */}
                    <View style={styles.itemsDetailedList}>
                      {order.items.map((item, idx) => (
                        <View key={idx} style={styles.hiFiItemRow}>
                          <Text style={styles.hiFiItemName}>{item.name}</Text>
                          <Text style={styles.hiFiItemQty}>X{item.quantity}</Text>
                          <Text style={styles.hiFiItemPrice}>{CURRENCY} {item.price.toFixed(2)}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Summary */}
                    <View style={styles.hiFiOrderSummary}>
                      <View style={styles.summaryRowLine}>
                        <Text style={styles.summaryLabel}>Total amount</Text>
                        <Text style={styles.summaryValue}>{CURRENCY} {order.totalAmount.toFixed(2)}</Text>
                      </View>
                      <View style={styles.summaryRowLine}>
                        <Text style={styles.summaryLabel}>Payment Method</Text>
                        <Text style={styles.summaryValue}>CardPayment</Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.hiFiActionsRow}>
                      {activeTab === 'Incoming' && (
                        <>
                          <TouchableOpacity
                            style={styles.cancelActionBtn}
                            onPress={() => {
                              Alert.alert(
                                "Cancel Order",
                                "Are you sure you want to cancel this order? This will also initiate a refund simulation.",
                                [
                                  { text: "No", style: "cancel" },
                                  { text: "Yes, Cancel", onPress: () => updateOrderStatus(order._id, 'cancelled'), style: 'destructive' }
                                ]
                              );
                            }}
                          >
                            <Text style={styles.actionBtnText}>Cancel Order</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.confirmActionBtn}
                            onPress={() => {
                              console.log("Confirming order:", order._id);
                              updateOrderStatus(order._id, 'confirmed');
                            }}
                          >
                            <Text style={styles.actionBtnText}>Confirm Order</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {activeTab === 'Preparing' && (
                        <TouchableOpacity
                          style={styles.confirmActionBtn}
                          onPress={() => updateOrderStatus(order._id, 'ready')}
                        >
                          <Text style={styles.actionBtnText}>Mark as Ready</Text>
                        </TouchableOpacity>
                      )}
                      {activeTab === 'Ready' && (
                        <TouchableOpacity
                          style={[styles.confirmActionBtn, { backgroundColor: '#657E63' }]}
                          onPress={() => updateOrderStatus(order._id, 'completed')}
                        >
                          <Text style={styles.actionBtnText}>Complete Order</Text>
                        </TouchableOpacity>
                      )}
                      {activeTab === 'History' && (
                        <View style={styles.completedBadgeHiFi}>
                          <Ionicons name="checkmark-done" size={20} color="#657E63" />
                          <Text style={styles.completedTextHiFi}>
                            {order.status === 'cancelled' ? 'Refunded' : 'Order Processed'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyOrders}>
                  <Image source={require('../Images/OrderSection.png')} style={styles.emptyIllustration} resizeMode="contain" />
                  <Text style={styles.emptyOrdersText}>No {activeTab.toLowerCase()} orders</Text>
                </View>
              )}
            </ScrollView>
          </View>
        ) : activeManager === 'Categories' ? <AddCategory panResponderHandlers={panResponder.panHandlers} />
          : activeManager === 'AddItem' ? <AddItem panResponderHandlers={panResponder.panHandlers} />
            : activeManager === 'Promotions' ? <PromotionManager panResponderHandlers={panResponder.panHandlers} />
              : activeManager === 'Finance' ? <FinanceManager panResponderHandlers={panResponder.panHandlers} />
                : activeManager === 'Reviews' ? renderReviewsPanel()
                  : <User panResponderHandlers={panResponder.panHandlers} userData={userData} />
        }
      </Animated.View>

      {/* Bottom Nav */}
      <View style={styles.navContainer}>
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => { setActiveManager('Orders'); Animated.spring(panY, { toValue: SNAP_BOTTOM, useNativeDriver: true }).start(); lastPanY.current = SNAP_BOTTOM; }}><Ionicons name="home" size={28} color="#333" /><View style={styles.activeDot} /></TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => { setActiveManager('Orders'); Animated.spring(panY, { toValue: SNAP_UP, useNativeDriver: true }).start(); lastPanY.current = SNAP_UP; }}>
            <Ionicons name="time-outline" size={28} color="#999" />
            {orders.filter(o => o.status === 'pending').length > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => { setActiveManager('Reviews'); fetchAllReviews(); }}><Ionicons name="heart-outline" size={28} color="#999" /></TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('profile')}><Ionicons name="person-outline" size={28} color="#999" /></TouchableOpacity>
        </View>
      </View>
      {/* Customer Profile Modal */}
      {selectedUser && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelectedUser(null)} />
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.modalProfileImage}>
                <Image
                  source={{ uri: selectedUser.profilePicture ? selectedUser.profilePicture : DEFAULT_IMAGES.PROFILE }}
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
              <Text style={styles.modalUserName}>{selectedUser.name}</Text>
              <Text style={styles.modalRoleText}>{selectedUser.role?.toUpperCase() || 'CUSTOMER'}</Text>
            </View>

            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Ionicons name="call" size={20} color="#657E63" />
                <View style={styles.detailTextCol}>
                  <Text style={styles.detailInfo}>{selectedUser.telephone1}</Text>
                  {selectedUser.telephone2 && <Text style={styles.detailInfo}>{selectedUser.telephone2}</Text>}
                </View>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="mail" size={20} color="#657E63" />
                <Text style={styles.detailInfo}>{selectedUser.email}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="home" size={20} color="#657E63" />
                <Text style={styles.detailInfo}>{selectedUser.address}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeProfileBtn} onPress={() => setSelectedUser(null)}>
              <Text style={styles.closeProfileBtnText}>Close Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 20, marginBottom: 20 },
  backButton: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#D9E4D6', justifyContent: 'center', alignItems: 'center' },
  profileButton: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 1.5, borderColor: '#eee', overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%' },
  scrollContent: { paddingBottom: 450 },
  greetingSection: { paddingHorizontal: 25, marginBottom: 20 },
  greetingText: { fontSize: 28, fontWeight: '700', color: '#333333' },
  welcomeText: { fontSize: 16, color: '#999', fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  gridItemContainer: { width: '33%', alignItems: 'center', marginBottom: 15 },
  gridItem: { width: 105, height: 105, backgroundColor: '#C8D9C6', borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionIcon: { width: 95, height: 95 },
  actionLabel: { fontSize: 12, color: '#999', textAlign: 'center', fontWeight: '600' },
  shopStatusSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 15 },
  statusLabelContainer: { flexDirection: 'row', alignItems: 'center' },
  shopStatusTitle: { fontSize: 22, fontWeight: '700', color: '#333333' },
  statusPill: { backgroundColor: '#E8E8E8', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 10, marginLeft: 10 },
  statusPillText: { fontSize: 18, fontWeight: '700' },
  posterManagerContainer: { minHeight: 100, width: '100%' },
  ordersSection: { position: 'absolute', top: height * 0.55, width: '100%', height: height, backgroundColor: '#C8D9C6', borderTopLeftRadius: 50, borderTopRightRadius: 50, paddingHorizontal: 20 },
  handleBarContainer: { width: '100%', height: 15, justifyContent: 'center', alignItems: 'center' },
  handleBar: { width: 60, height: 6, backgroundColor: '#FFFFFF', borderRadius: 3, opacity: 0.9 },
  tabsPillContainer: { flexDirection: 'row', backgroundColor: '#8DA28B', borderRadius: 40, paddingVertical: 6, paddingHorizontal: 5, marginBottom: 20, marginTop: 20, justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { alignItems: 'center', width: '25%', position: 'relative', paddingBottom: 5 },
  tabContent: { alignItems: 'center' },
  activeUnderline: { position: 'absolute', bottom: -2, width: '60%', height: 3, backgroundColor: '#333', borderRadius: 2 },
  tabIcon: { width: 30, height: 30, marginBottom: 5 },
  tabText: { fontSize: 11, color: '#FFF', fontWeight: '700' },
  activeTabText: { color: '#FFF', fontWeight: '800' },
  illustrationContainer: { width: '100%', alignItems: 'center', marginTop: 10 },
  illustration: { width: width * 0.8, height: height * 0.25 },
  navContainer: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', paddingBottom: 30, zIndex: 10 },
  bottomNav: { flexDirection: 'row', backgroundColor: '#FFFFFF', width: width * 0.9, height: 70, borderRadius: 35, justifyContent: 'space-around', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10, borderColor: '#eee', borderWidth: 1 },
  navItem: { padding: 10, alignItems: 'center' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#333', marginTop: 4 },
  notifDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B30', marginTop: 4 },
  iconBadgeWrapper: { position: 'relative' },
  notifBadge: { position: 'absolute', top: -10, right: -10, backgroundColor: '#FF3B30', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#8DA28B' },
  notifBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  // Hi-Fi Order Styles
  orderListContainer: { flex: 1, marginTop: 10 },
  hiFiOrderCard: { backgroundColor: '#92A68D', borderRadius: 50, padding: 25, marginBottom: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 8 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  receivedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#778D73', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, gap: 8 },
  receivedDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF', opacity: 0.8 },
  receivedBadgeText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  customerPill: { backgroundColor: '#F37021', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15, alignItems: 'center' },
  customerPillName: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  customerPillPhone: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  hiFiOrderTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', opacity: 0.9 },
  hiFiOrderNumber: { fontSize: 14, fontWeight: '700', color: '#FDD835', marginBottom: 15 },
  blueDetailsBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#6287B7', paddingHorizontal: 15, paddingVertical: 10, marginBottom: 15 },
  detailsBarTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  detailsBarCount: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  itemsDetailedList: { paddingHorizontal: 5, marginBottom: 20 },
  hiFiItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  hiFiItemName: { color: '#FFF', fontSize: 14, fontWeight: '700', flex: 2 },
  hiFiItemQty: { color: '#FFF', fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'center' },
  hiFiItemPrice: { color: '#FFF', fontSize: 14, fontWeight: '700', flex: 1.5, textAlign: 'right' },
  hiFiOrderSummary: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 15, marginBottom: 25 },
  summaryRowLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  summaryLabel: { color: '#FFF', fontSize: 14, fontWeight: '700', opacity: 0.9 },
  summaryValue: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  hiFiActionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 15, marginTop: 10 },
  cancelActionBtn: { flex: 1, backgroundColor: '#8B0000', paddingVertical: 14, borderRadius: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  confirmActionBtn: { flex: 1, backgroundColor: '#769271', paddingVertical: 14, borderRadius: 25, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
  actionBtnText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  completedBadgeHiFi: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 },
  completedTextHiFi: { color: '#657E63', fontWeight: '900', fontSize: 16 },
  emptyOrders: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100, paddingBottom: 100 },
  emptyIllustration: { width: 280, height: 280, marginBottom: 20 },
  emptyOrdersText: { color: '#657E63', fontWeight: '800', fontSize: 20, textAlign: 'center' },

  // Modal Styles
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  profileCard: { backgroundColor: '#FFF', width: width * 0.85, borderRadius: 30, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  profileHeader: { alignItems: 'center', marginBottom: 25 },
  modalProfileImage: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', borderWidth: 3, borderColor: '#657E63', marginBottom: 15 },
  modalUserName: { fontSize: 24, fontWeight: '800', color: '#333' },
  modalRoleText: { fontSize: 12, fontWeight: '700', color: '#657E63', letterSpacing: 1 },
  detailsSection: { width: '100%', gap: 20, marginBottom: 30 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  detailTextCol: { gap: 4 },
  detailInfo: { fontSize: 15, color: '#666', fontWeight: '600' },
  closeProfileBtn: { backgroundColor: '#657E63', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 25 },
  // Timer Styles - Adjusted for Smaller Size & Row Positioning
  timerContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  timerRing: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 4.8,
    transform: [{ rotate: '45deg' }]
  },
  timerContent: { alignItems: 'center', justifyContent: 'center' },
  timerValue: { fontSize: 13, fontWeight: '800', color: '#FFF', lineHeight: 15 },
  timerUnit: { fontSize: 6, fontWeight: '700', color: '#FFF', opacity: 0.9, marginTop: -2 },

  // Finance Section Styles
  financeContainer: { flex: 1, paddingTop: 15 },
  financeHeaderPill: {
    flexDirection: 'row',
    backgroundColor: '#92A68D',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 40,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30
  },
  financePillText: { color: '#FFF', fontSize: 30, fontWeight: '800' },
  financePillIcon: { width: 45, height: 45 },
  emptyManager: { flex: 0.6, justifyContent: 'center', alignItems: 'center' },
  emptyManagerText: { color: '#657E63', fontSize: 16, fontWeight: '600', opacity: 0.7 },

  // Admin Reviews Styles - RESTORED
  managerPanel: { flex: 1, paddingHorizontal: 0, paddingTop: 16 },
  managerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  managerTitle: { fontSize: 24, fontWeight: '900', color: '#333' },
  filterBar: { flexDirection: 'row', marginBottom: 20, maxHeight: 70, paddingVertical: 5 },
  filterBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFD700', marginRight: 15, borderWidth: 1, borderColor: '#FFB800', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 4, justifyContent: 'center', alignItems: 'center' },
  activeFilterBtn: { backgroundColor: '#FF9500', borderColor: '#F37021' },
  filterBtnText: { fontSize: 14, fontWeight: '800', color: '#333' },
  activeFilterBtnText: { color: '#FFF' },
  adminReviewCard: { backgroundColor: '#FFF', borderRadius: 30, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  adminReviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  adminReviewUser: { fontSize: 18, fontWeight: '900', color: '#333' },
  adminReviewOrderId: { fontSize: 13, color: '#999', fontWeight: '700', marginTop: 2 },
  adminReviewItemInfo: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: '#F0F4EF', padding: 12, borderRadius: 20 },
  adminReviewItemImg: { width: 55, height: 55, borderRadius: 15 },
  adminReviewItemName: { fontSize: 15, fontWeight: '800', color: '#333' },
  starsRowSmall: { flexDirection: 'row', gap: 3, marginTop: 4 },
  adminReviewDate: { fontSize: 11, color: '#BBB', fontWeight: '700' },
  adminReviewGallery: { marginTop: 15, flexDirection: 'row' },
  adminReviewImg: { width: 90, height: 90, borderRadius: 15, marginRight: 10 },
  adminReviewOrderItem: { width: '100%' },
  reviewDeleteIcon: { padding: 5, backgroundColor: '#FFF', borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  emptyContainer: { alignItems: 'center', marginTop: 60, opacity: 0.5 },
  emptyText: { fontSize: 18, color: '#999', fontWeight: '800', marginTop: 15 },
});

export default AdminScreen;
