import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, Dimensions, ScrollView, TextInput, FlatList, ActivityIndicator, Alert, Animated, PanResponder, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import { CURRENCY } from '../constants';

const { width, height } = Dimensions.get('window');

const PosterCard = React.memo(({ item, API_URL }) => (
  <View style={styles.posterContainer}>
    <Image source={{ uri: item.imageUrl }} style={styles.posterImage} resizeMode="cover" />
  </View>
));

const CategoryCard = React.memo(({ item, API_URL, onPress, isSelected }) => (
  <TouchableOpacity
    style={[styles.categoryCard, isSelected && styles.selectedCategoryCard]}
    onPress={() => onPress(item._id)}
  >
    <View style={[styles.categoryImageContainer, isSelected && styles.selectedCategoryImageContainer]}>
      <Image source={{ uri: item.image }} style={styles.categoryImage} />
    </View>
    <Text style={[styles.categoryText, isSelected && styles.selectedCategoryText]} numberOfLines={1}>{item.name}</Text>
  </TouchableOpacity>
));

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

const ItemCard = React.memo(({ item, API_URL, onAdd, onRatingPress, promotions }) => {
  const promo = getPromotionForItem(item, promotions);
  const discountedPrice = promo ? item.price * (1 - promo.discountValue / 100) : item.price;

  return (
    <View style={styles.itemCardContainer}>
      <View style={styles.itemMainRow}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {promo ? (
            <View>
              <View style={styles.priceRow}>
                <Text style={styles.originalPrice}>{CURRENCY} {item.price.toFixed(2)}</Text>
                <View style={styles.promoBadge}>
                  <Text style={styles.promoBadgeText}>{promo.discountValue}%</Text>
                </View>
              </View>
              <Text style={styles.discountedPrice}>{CURRENCY} {discountedPrice.toFixed(2)}</Text>
            </View>
          ) : (
            <Text style={styles.itemPrice}>{CURRENCY} {item.price.toFixed(2)}</Text>
          )}
        </View>
        <View style={styles.itemImgSection}>
          <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
          {item.averageRating > 0 && (
            <View style={styles.itemRatingBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.itemRatingText}>{item.averageRating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.itemActionRow}>
        <TouchableOpacity style={styles.ratingBox} onPress={() => onRatingPress(item)}>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingValueText}>{item.averageRating ? item.averageRating.toFixed(1) : "0.0"}</Text>
            <Text style={styles.ratingLabelText}>RATING</Text>
          </View>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons key={star} name="star" size={16} color={star <= Math.round(item.averageRating || 0) ? "#FFB800" : "#E0E0E0"} />
            ))}
          </View>
        </TouchableOpacity>

        {promo && (
          <View style={styles.promoLogoContainer}>
            <Image source={{ uri: promo.image }} style={styles.promoLogo} resizeMode="contain" />
          </View>
        )}

        <TouchableOpacity style={styles.addButton} onPress={() => onAdd(item._id)}>
          <Text style={styles.addButtonText}>Add</Text>
          <View style={styles.addIconCircle}>
            <Ionicons name="add" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.itemDivider} />
    </View>
  );
});

const HomeScreen = ({ onNavigate, userData, setUserData, globalData }) => {
  const posters = globalData?.posters || [];
  const categories = globalData?.categories || [];
  const items = globalData?.items || [];

  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // My Orders Feature State
  const [userOrders, setUserOrders] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [activeOrderTab, setActiveOrderTab] = useState('Ongoing'); // 'Ongoing' | 'Completed'
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  
  // Reviews Feature State
  const [userReviews, setUserReviews] = useState([]);
  const [activeReviewOrder, setActiveReviewOrder] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  
  // Gallery Feature State
  const [galleryItem, setGalleryItem] = useState(null);
  const [galleryReviews, setGalleryReviews] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  
  const pollingRef = useRef(null);

  // Draggable Panel Animation
  const SNAP_MAX = -height * 0.7;
  const SNAP_MID = -height * 0.4;
  const SNAP_BOTTOM = -30;
  const panY = useRef(new Animated.Value(SNAP_BOTTOM)).current;
  const lastPanY = useRef(SNAP_BOTTOM);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (evt, gestureState) => {
        let newY = lastPanY.current + gestureState.dy;
        if (newY < SNAP_MAX) newY = SNAP_MAX;
        if (newY > SNAP_BOTTOM) newY = SNAP_BOTTOM;
        panY.setValue(newY);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const currentY = lastPanY.current + gestureState.dy;

        let destY = SNAP_BOTTOM;
        if (currentY < (SNAP_MAX + SNAP_MID) / 2) {
          destY = SNAP_MAX;
        } else if (currentY < (SNAP_MID + SNAP_BOTTOM) / 2) {
          destY = SNAP_MID;
        }

        Animated.spring(panY, { toValue: destY, useNativeDriver: true, tension: 50, friction: 10 }).start();
        lastPanY.current = destY;

        // Start polling if not collapsed, stop if collapsed
        if (destY !== SNAP_BOTTOM) startPolling();
        else stopPolling();
      },
    })
  ).current;

  useEffect(() => {
    if (userData?._id || userData?.id) {
      fetchUserOrders();
      fetchUserReviews();
    }
    return () => stopPolling();
  }, [userData]);

  const fetchUserReviews = async () => {
    try {
      const uId = userData?.id || userData?._id;
      if (!uId) return;
      const response = await fetch(`${API_URL}/api/reviews/user/${uId}`);
      const data = await response.json();
      if (response.ok) {
        setUserReviews(data);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  };

  const fetchItemReviews = async (item) => {
    setGalleryItem(item);
    setGalleryLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/reviews/item/${item._id}`);
      const data = await response.json();
      if (response.ok) {
        setGalleryReviews(data);
      }
    } catch (err) {
      console.error("Error fetching gallery reviews:", err);
    } finally {
      setGalleryLoading(false);
    }
  };

  const fetchUserOrders = async (silent = false) => {
    if (!silent) setOrderLoading(true);
    try {
      const uId = userData?.id || userData?._id;
      if (!uId) return;
      const response = await fetch(`${API_URL}/api/orders/user/${uId}`);
      const data = await response.json();
      if (response.ok) {
        setUserOrders(data);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      if (!silent) setOrderLoading(false);
    }
  };

  const startPolling = () => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => fetchUserOrders(true), 10000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const [reviewStates, setReviewStates] = useState({}); // { itemId: { rating: 5, images: [] } }

  const pickReviewImage = async (itemId) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setReviewStates(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          images: [...(prev[itemId]?.images || []), result.assets[0].uri]
        }
      }));
    }
  };

  const submitAllReviews = async () => {
    try {
      const uId = userData?.id || userData?._id;
      if (!activeReviewOrder) return;

      setOrderLoading(true);
      for (const item of activeReviewOrder.items) {
        const review = reviewStates[item.itemId._id || item.itemId];
        if (!review) continue;

        const formData = new FormData();
        formData.append('userId', uId);
        formData.append('orderId', activeReviewOrder._id);
        formData.append('itemId', item.itemId._id || item.itemId);
        formData.append('rating', review.rating || 5);

        if (review.images && review.images.length > 0) {
          review.images.forEach((uri, idx) => {
            formData.append('images', {
              uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
              name: `review_${idx}.jpg`,
              type: 'image/jpeg',
            });
          });
        }

        const response = await fetch(`${API_URL}/api/reviews`, {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (!response.ok) {
          const errData = await response.json();
          console.warn("Failed to submit one review:", errData.message);
        }
      }

      setIsReviewing(false);
      setActiveReviewOrder(null);
      setReviewStates({});
      fetchUserReviews();
      if (globalData?.refresh) globalData.refresh();
      Alert.alert("Success", "Thank you for your feedback!");
    } catch (err) {
      console.error("Submission Error:", err);
      Alert.alert("Error", "Could not submit all reviews.");
    } finally {
      setOrderLoading(false);
    }
  };

  const cancelOrder = async (orderId) => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order? This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cancelled' }),
              });
              if (response.ok) {
                fetchUserOrders();
                Alert.alert("Success", "Order cancelled and refund initiated.");
              }
            } catch (err) {
              Alert.alert("Error", "Failed to cancel order.");
            }
          }
        }
      ]
    );
  };

  const [currentPosterIndex, setCurrentPosterIndex] = useState(0);
  const posterFlatListRef = useRef(null);

  const OrderStepper = ({ status }) => {
    const steps = [
      { id: 'pending', label: 'Order Placed', icon: require('../Images/Orderplaced.png') },
      { id: 'confirmed', label: 'Order Confirmed', icon: require('../Images/Orderconfirmed.png') },
      { id: 'ready', label: 'Preparing', icon: require('../Images/Orderpreparing.png') },
      { id: 'completed', label: 'Ready to Pickup', icon: require('../Images/Readytopickup.png') },
    ];

    const currentStepIndex = steps.findIndex(s => s.id === status);

    return (
      <View style={styles.stepperContainer}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <View style={styles.stepWrapper}>
              <View style={styles.stepIconContainer}>
                <Image source={step.icon} style={[styles.stepIcon, index > currentStepIndex && { opacity: 0.3 }]} resizeMode="contain" />
                {index <= currentStepIndex && (
                  <View style={styles.checkmarkBadge}>
                    <Ionicons name="checkmark" size={10} color="#FFF" />
                  </View>
                )}
              </View>
              <Text style={[styles.stepLabel, index <= currentStepIndex ? styles.activeLabel : styles.inactiveLabel]}>{step.label}</Text>
            </View>
            {index < steps.length - 1 && (
              <View style={[styles.stepLine, index < currentStepIndex ? styles.activeLine : styles.inactiveLine]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const renderReviewItem = (item) => {
    const itemId = item.itemId._id || item.itemId;
    const review = reviewStates[itemId] || { rating: 5, images: [] };
    const existing = userReviews.find(r => {
      const rItemId = r.itemId?._id || r.itemId;
      return rItemId === itemId && r.orderId === activeReviewOrder?._id;
    });

    if (existing) {
      return (
        <View key={itemId} style={styles.reviewItemCard}>
          <Text style={styles.reviewCompletedLabel}>Review Submitted ✓</Text>
          <View style={styles.reviewItemHeader}>
            <Text style={styles.reviewItemName}>{item.name}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <Ionicons key={s} name={s <= existing.rating ? "star" : "star-outline"} size={20} color="#FFD700" />
              ))}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View key={itemId} style={styles.reviewItemCard}>
        <View style={styles.reviewItemHeader}>
          <Text style={styles.reviewItemName}>{item.name}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(s => (
              <TouchableOpacity key={s} onPress={() => setReviewStates(prev => ({
                ...prev, [itemId]: { ...review, rating: s }
              }))}>
                <Ionicons name={s <= review.rating ? "star" : "star-outline"} size={28} color="#FFD700" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <TouchableOpacity style={styles.photoUploadBtn} onPress={() => pickReviewImage(itemId)}>
          <Ionicons name="camera" size={20} color="#657E63" />
          <Text style={styles.photoUploadText}>
            {review.images.length > 0 ? `${review.images.length} Photos Added` : "Add Photos"}
          </Text>
        </TouchableOpacity>

        {review.images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImagePreview}>
            {review.images.map((img, idx) => (
              <Image key={idx} source={{ uri: img }} style={styles.previewThumb} />
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderTrayContent = () => {
    const ongoing = userOrders.filter(o => ['pending', 'confirmed', 'ready'].includes(o.status));
    const completed = userOrders.filter(o => ['completed', 'cancelled'].includes(o.status));
    const activeList = activeOrderTab === 'Ongoing' ? ongoing : completed;

    return (
      <View style={styles.trayInner}>
        <View style={styles.trayHeaderPill}>
          <Text style={styles.trayHeaderText}>My Orders</Text>
        </View>

        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.tabBtn, activeOrderTab === 'Ongoing' && styles.activeTabBtn]}
            onPress={() => setActiveOrderTab('Ongoing')}
          >
            <Text style={[styles.tabBtnText, activeOrderTab === 'Ongoing' && styles.activeTabBtnText]}>Ongoing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeOrderTab === 'Completed' && styles.activeTabBtn]}
            onPress={() => setActiveOrderTab('Completed')}
          >
            <Text style={[styles.tabBtnText, activeOrderTab === 'Completed' && styles.activeTabBtnText]}>Completed</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.orderList} showsVerticalScrollIndicator={false}>
          {orderLoading ? (
            <ActivityIndicator size="small" color="#657E63" style={{ marginTop: 20 }} />
          ) : activeList.length === 0 ? (
            <View style={styles.emptyTrayPlaceholder}>
              <Ionicons name="receipt-outline" size={50} color="#8DA28B" />
              <Text style={styles.emptyTrayText}>No {activeOrderTab.toLowerCase()} orders found</Text>
            </View>
          ) : (
            activeList.map(order => {
              const isExpanded = expandedOrderId === order._id;

              return (
                <View key={order._id} style={styles.orderCard}>
                  <View style={styles.orderCardHeader}>
                    <TouchableOpacity
                      style={styles.orderIdContainer}
                      onPress={() => setExpandedOrderId(isExpanded ? null : order._id)}
                    >
                      <View>
                        <Text style={styles.orderIdLabel}>Order ID</Text>
                        <View style={styles.orderIdValueRow}>
                          <Text style={styles.orderIdValue}>{order.orderNumber}</Text>
                          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#FF9500" style={{ marginLeft: 5 }} />
                        </View>
                      </View>
                    </TouchableOpacity>
                    {order.status === 'pending' && (
                      <TouchableOpacity style={styles.cancelBtnSmall} onPress={() => cancelOrder(order._id)}>
                        <Text style={styles.cancelBtnTextSmall}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                    {order.status === 'completed' && (
                      <TouchableOpacity 
                        style={styles.reviewBtnGold} 
                        onPress={() => {
                          console.log("Review button pressed for order:", order._id);
                          setActiveReviewOrder(order);
                          setIsReviewing(true);
                        }}
                      >
                        <Text style={styles.reviewBtnTextGold}>Review</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {isExpanded && (
                    <View style={styles.orderDetailsExpansion}>
                      <View style={styles.detailsDivider} />
                      {order.items.map((item, idx) => (
                        <View key={idx} style={styles.detailItemRow}>
                          <Text style={styles.detailItemName}>{item.name} <Text style={styles.detailItemQty}>x{item.quantity}</Text></Text>
                          <Text style={styles.detailItemPrice}>{CURRENCY} {(item.price * item.quantity).toFixed(2)}</Text>
                        </View>
                      ))}
                      <View style={styles.detailsDivider} />
                      <View style={styles.detailTotalRow}>
                        <Text style={styles.detailTotalLabel}>Total Amount</Text>
                        <Text style={styles.detailTotalValue}>{CURRENCY} {order.totalAmount.toFixed(2)}</Text>
                      </View>
                      <View style={{ height: 15 }} />
                    </View>
                  )}

                  {order.status !== 'cancelled' ? (
                    <OrderStepper status={order.status} />
                  ) : (
                    <View style={styles.cancelledStatusContainer}>
                      <Ionicons name="close-circle" size={20} color="#FF3B30" />
                      <Text style={styles.cancelledText}>This order was cancelled</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  };

  useEffect(() => {
    applyFilters(searchQuery, selectedCategory);
  }, [items, searchQuery, selectedCategory]);

  useEffect(() => {
    if (posters.length > 0) {
      const interval = setInterval(() => {
        let nextIndex = currentPosterIndex + 1;
        if (nextIndex >= posters.length) nextIndex = 0;
        setCurrentPosterIndex(nextIndex);
        posterFlatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [currentPosterIndex, posters]);



  const applyFilters = (query, categoryId) => {
    let filtered = items;

    if (categoryId) {
      filtered = filtered.filter(item =>
        item.categories.includes(categoryId) ||
        (typeof item.categories[0] === 'object' && item.categories.some(c => c._id === categoryId))
      );
    }

    if (query) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    applyFilters(query, selectedCategory);
  };

  const handleCategoryPress = (categoryId) => {
    const newCategory = selectedCategory === categoryId ? null : categoryId;
    setSelectedCategory(newCategory);
    applyFilters(searchQuery, newCategory);
  };

  const chunkedCategories = useMemo(() => {
    const chunked = [];
    const firstEight = categories.slice(0, 8);
    const others = categories.slice(8);

    for (let i = 0; i < 4; i++) {
      const top = firstEight[i];
      const bottom = firstEight[i + 4];
      if (top || bottom) {
        chunked.push({ top, bottom });
      }
    }

    for (let i = 0; i < others.length; i += 2) {
      const top = others[i];
      const bottom = others[i + 1];
      if (top || bottom) {
        chunked.push({ top, bottom });
      }
    }
    return chunked;
  }, [categories]);

  if (globalData?.loading && items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#657E63" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}><Ionicons name="chevron-back" size={24} color="#5E7D5E" /></TouchableOpacity>
        <TouchableOpacity style={styles.profileButton} onPress={() => onNavigate('profile')}>
          <Image source={{ uri: userData?.profilePicture ? userData.profilePicture : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQnD5fWTO7ZJ0LWFJLdU7xGd1FhnXCuZLpxxQ&s' }} style={styles.profileImage} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>Hi, {userData?.name || 'Customer'} 👋</Text>
          <Text style={styles.welcomeText}>Welcome to EatUp</Text>
        </View>

        {posters.length > 0 && (
          <View style={styles.carouselContainer}>
            <FlatList
              ref={posterFlatListRef}
              data={posters}
              renderItem={({ item }) => <PosterCard item={item} API_URL={API_URL} />}
              keyExtractor={it => it._id}
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentPosterIndex(index);
              }}
            />
          </View>
        )}

        {/* Category Grid Section (2 Rows, Scrollable) */}
        <View style={styles.categorySection}>
          <FlatList
            data={chunkedCategories}
            keyExtractor={(_, index) => `col-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.categoryColumn}>
                {item.top && <CategoryCard
                  item={item.top}
                  API_URL={API_URL}
                  onPress={handleCategoryPress}
                  isSelected={selectedCategory === item.top._id}
                />}
                <View style={{ height: 15 }} />
                {item.bottom && <CategoryCard
                  item={item.bottom}
                  API_URL={API_URL}
                  onPress={handleCategoryPress}
                  isSelected={selectedCategory === item.bottom._id}
                />}
              </View>
            )}
          />
        </View>

        <View style={styles.searchContainer}>
          <TextInput style={styles.searchInput} placeholder="Search for items" placeholderTextColor="#999" value={searchQuery} onChangeText={handleSearch} />
          <TouchableOpacity style={styles.searchButton}><Ionicons name="search" size={24} color="#555" /></TouchableOpacity>
        </View>

        <View style={styles.gallery}>
          {filteredItems.map((item) => (
            <ItemCard
              key={item._id}
              item={item}
              API_URL={API_URL}
              promotions={globalData?.promotions}
              onAdd={globalData.cart.add}
              onRatingPress={fetchItemReviews}
            />
          ))}
          {filteredItems.length === 0 && <Text style={styles.emptyText}>No items found matching "{searchQuery}"</Text>}
        </View>

        <View style={{ height: globalData.cart.count > 0 ? 160 : 100 }} />
      </ScrollView>

      {/* Floating View Cart Bar */}
      {globalData.cart.count > 0 && (
        <TouchableOpacity style={styles.viewCartBar} onPress={() => onNavigate('cart')}>
          <View style={styles.cartBarInfo}>
            <Text style={styles.cartBarItemCount}>{globalData.cart.count} item{globalData.cart.count > 1 ? 's' : ''}</Text>
            <Text style={styles.cartBarTotal}>{CURRENCY} {globalData.cart.total.toFixed(2)}</Text>
          </View>
          <View style={styles.viewCartAction}>
            <Text style={styles.viewCartText}>View cart</Text>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {/* Draggable Bottom Tray */}
      <Animated.View
        style={[styles.draggableTray, { transform: [{ translateY: panY }] }]}
      >
        <View style={styles.dragHandleContainer} {...panResponder.panHandlers}>
          <View style={styles.dragHandle} />
        </View>

        {renderTrayContent()}
      </Animated.View>

      {/* Fixed Bottom Nav (Not moving) */}
      <View style={styles.navContainer}>
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('home')}><Ionicons name="home" size={28} color="#333" /><View style={styles.activeDot} /></TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => {
            const isExpanded = lastPanY.current !== SNAP_BOTTOM;
            const targetY = isExpanded ? SNAP_BOTTOM : SNAP_MID;
            Animated.spring(panY, { toValue: targetY, useNativeDriver: true }).start();
            lastPanY.current = targetY;

            if (targetY !== SNAP_BOTTOM) startPolling();
            else stopPolling();
          }}><Ionicons name="time-outline" size={28} color="#999" /></TouchableOpacity>
          <TouchableOpacity style={styles.navItem}><Ionicons name="heart-outline" size={28} color="#999" /></TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('profile')}><Ionicons name="person-outline" size={28} color="#999" /></TouchableOpacity>
        </View>
      </View>

      {/* Review Modal - RESTORED */}
      {isReviewing && activeReviewOrder && (
        <View style={styles.reviewOverlay}>
          <View style={styles.reviewModal}>
            <View style={styles.reviewModalHeader}>
              <Text style={styles.reviewTitle}>How was the food?</Text>
              <TouchableOpacity onPress={() => setIsReviewing(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {activeReviewOrder.items.map(renderReviewItem)}
            </ScrollView>
            <TouchableOpacity style={styles.submitReviewsBtn} onPress={submitAllReviews}>
              <Text style={styles.submitReviewsText}>Submit All Reviews</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Item Reviews Gallery Modal */}
      {galleryItem && (
        <View style={styles.reviewOverlay}>
          <View style={styles.reviewModal}>
            <View style={styles.reviewModalHeader}>
              <View>
                <Text style={styles.reviewTitle}>{galleryItem.name}</Text>
                <View style={styles.gallerySubHeader}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.galleryRatingText}>
                    {galleryItem.averageRating ? galleryItem.averageRating.toFixed(1) : "0.0"} ({galleryReviews.length} reviews)
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setGalleryItem(null)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {galleryLoading ? (
              <ActivityIndicator size="large" color="#657E63" style={{ marginVertical: 50 }} />
            ) : galleryReviews.length === 0 ? (
              <View style={styles.emptyReviewsContainer}>
                <Ionicons name="chatbox-ellipses-outline" size={50} color="#CCC" />
                <Text style={styles.emptyReviewsText}>No reviews yet for this item.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {galleryReviews.map((rev, idx) => (
                  <View key={idx} style={styles.galleryReviewCard}>
                    <View style={styles.galleryUserRow}>
                      <Text style={styles.galleryUserName}>{rev.userId?.name || "Customer"}</Text>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <Ionicons key={s} name={s <= rev.rating ? "star" : "star-outline"} size={14} color="#FFD700" />
                        ))}
                      </View>
                    </View>
                    
                    {rev.images && rev.images.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryImagesRow}>
                        {rev.images.map((img, iIdx) => (
                          <Image key={iIdx} source={{ uri: img }} style={styles.galleryImage} resizeMode="cover" />
                        ))}
                      </ScrollView>
                    )}
                    <View style={styles.galleryDateRow}>
                      <Text style={styles.galleryDateText}>{new Date(rev.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 10, marginBottom: 10, backgroundColor: '#FFFFFF' },
  backButton: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#D9E4D6', justifyContent: 'center', alignItems: 'center' },
  profileButton: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 1, borderColor: '#eee', overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%' },
  greetingSection: { paddingHorizontal: 25, marginBottom: 20 },
  greetingText: { fontSize: 32, fontWeight: '800', color: '#333' },
  welcomeText: { fontSize: 18, color: '#999', fontWeight: '600', marginTop: -5 },
  carouselContainer: { width: width, height: width * 0.45, marginBottom: 25 },
  posterContainer: { width: width, paddingHorizontal: 20 },
  posterImage: { width: width - 40, height: width * 0.45, borderRadius: 20 },
  categorySection: { paddingHorizontal: 15, marginBottom: 25 },
  categoryColumn: { paddingHorizontal: 5 },
  categoryCard: { alignItems: 'center', width: (width - 60) / 4 },
  categoryImageContainer: { width: 77, height: 77, borderRadius: 38.5, backgroundColor: '#D9E4D6', justifyContent: 'center', alignItems: 'center', marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  selectedCategoryImageContainer: { borderColor: '#657E63', borderWidth: 2, backgroundColor: '#8DA28B' },
  categoryImage: { width: '100%', height: '100%' },
  categoryText: { fontSize: 13, fontWeight: '800', color: '#333', textAlign: 'center' },
  selectedCategoryText: { color: '#657E63', fontWeight: '900' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 25, borderRadius: 30, height: 55, paddingHorizontal: 20, marginBottom: 30, borderWidth: 2, borderColor: '#E0E0E0' },
  searchInput: { flex: 1, fontSize: 16, color: '#333', fontWeight: '500' },
  searchButton: { marginLeft: 10 },
  gallery: { paddingHorizontal: 25 },
  itemCardContainer: { marginBottom: 5 },
  itemMainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  itemInfo: { flex: 1, paddingRight: 20 },
  itemName: { fontSize: 20, fontWeight: '800', color: '#333', marginBottom: 5, letterSpacing: -0.5 },
  itemPrice: { fontSize: 18, fontWeight: '500', color: '#666' },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  originalPrice: { fontSize: 18, fontWeight: '500', color: '#999', textDecorationLine: 'line-through', marginRight: 10 },
  discountedPrice: { fontSize: 22, fontWeight: '800', color: '#333', marginTop: 2 },
  promoBadge: { backgroundColor: '#8B3A3A', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  promoBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  promoLogoContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', },
  promoLogo: { width: 50, height: 50 },
  itemImgSection: { width: 140, height: 140, borderRadius: 15, overflow: 'hidden', backgroundColor: '#F8F8F8' },
  itemImage: { width: '100%', height: '100%' },
  itemActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#FFB800',
    borderRadius: 8,
    padding: 2,
    paddingRight: 8
  },
  ratingBadge: {
    backgroundColor: '#FFB800',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    marginRight: 8
  },
  ratingValueText: { color: '#fff', fontSize: 13, fontWeight: '800', lineHeight: 15 },
  ratingLabelText: { color: '#fff', fontSize: 7, fontWeight: '700', marginTop: -1 },
  starsContainer: { flexDirection: 'row', gap: 1 },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#657E63',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 25,
    alignItems: 'center',
    height: 40,
    marginRight: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },
  addButtonText: { color: '#fff', fontWeight: '800', fontSize: 20, marginRight: 8 },
  addIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#556D53',
    justifyContent: 'center',
    alignItems: 'center'
  },
  itemDivider: { height: 1, backgroundColor: '#eee', marginTop: 12, marginBottom: 12 },
  emptyText: { textAlign: 'center', color: '#999', fontSize: 16, marginTop: 20 },
  navContainer: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', paddingBottom: 30, zIndex: 100 },
  draggableTray: {
    position: 'absolute',
    bottom: -height * 0.7,
    left: 0,
    right: 0,
    height: height * 0.7 + 100,
    backgroundColor: '#C8D9C6',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20
  },
  dragHandleContainer: { width: '100%', alignItems: 'center', paddingVertical: 10 },
  dragHandle: { width: 70, height: 7, borderRadius: 3.5, backgroundColor: '#FFFFFF', opacity: 1 },
  trayInner: { flex: 1, paddingHorizontal: 20, paddingTop: 3 },
  trayHeaderPill: { alignSelf: 'center', width: width * 0.90, backgroundColor: '#8DA28B', paddingVertical: 20, borderRadius: 35, marginBottom: 35, alignItems: 'center' },
  trayHeaderText: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  tabSelector: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 25, padding: 5, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 25 },
  activeTabBtn: { backgroundColor: 'transparent' },
  tabBtnText: { fontSize: 24, color: '#BCBCBC', fontWeight: '700' },
  activeTabBtnText: { color: '#333', fontWeight: '800' },
  orderList: { flex: 1 },
  orderCard: { backgroundColor: '#FFF', borderRadius: 30, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  orderIdLabel: { color: '#00B140', fontSize: 16, fontWeight: '800' },
  orderIdValueRow: { flexDirection: 'row', alignItems: 'center' },
  orderIdValue: { color: '#FF9500', fontSize: 14, fontWeight: '800' },
  orderDetailsExpansion: { marginTop: 10, marginBottom: 15 },
  detailsDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },
  detailItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  detailItemName: { fontSize: 14, color: '#333', fontWeight: '600' },
  detailItemQty: { color: '#657E63', fontWeight: '800' },
  detailItemPrice: { fontSize: 14, color: '#666', fontWeight: '500' },
  detailTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  detailTotalLabel: { fontSize: 15, fontWeight: '800', color: '#333' },
  detailTotalValue: { fontSize: 16, fontWeight: '900', color: '#657E63' },
  cancelBtnSmall: { backgroundColor: '#FF3B30', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  reviewBtnGold: { backgroundColor: '#FF9500', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  reviewBtnTextGold: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  itemRatingBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 3 },
  itemRatingText: { fontSize: 10, fontWeight: '800', color: '#333' },
  reviewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  reviewModal: { backgroundColor: '#FFF', width: '90%', maxHeight: '80%', borderRadius: 30, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20 },
  reviewModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  reviewTitle: { fontSize: 24, fontWeight: '900', color: '#333' },
  reviewItemCard: { backgroundColor: '#F9F9F9', borderRadius: 20, padding: 15, marginBottom: 15 },
  reviewCompletedLabel: { fontSize: 12, color: '#657E63', fontWeight: '800', marginBottom: 5 },
  reviewItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  reviewItemName: { fontSize: 16, fontWeight: '800', color: '#333', flex: 1 },
  starsRow: { flexDirection: 'row', gap: 5 },
  photoUploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  photoUploadText: { fontSize: 14, fontWeight: '700', color: '#657E63' },
  reviewImagePreview: { marginTop: 10 },
  previewThumb: { width: 60, height: 60, borderRadius: 10, marginRight: 10 },
  submitReviewsBtn: { backgroundColor: '#657E63', paddingVertical: 15, borderRadius: 25, alignItems: 'center', marginTop: 10 },
  submitReviewsText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 5 },
  stepWrapper: { alignItems: 'center', width: (width - 120) / 4 },
  stepIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F5F0', justifyContent: 'center', alignItems: 'center', marginBottom: 8, position: 'relative' },
  stepIcon: { width: 30, height: 30 },
  checkmarkBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#00B140', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  stepLabel: { fontSize: 8, fontWeight: '800', textAlign: 'center' },
  activeLabel: { color: '#333' },
  inactiveLabel: { color: '#CCC' },
  stepLine: { flex: 1, height: 3, backgroundColor: '#EEE', marginTop: -20, marginHorizontal: -10 },
  activeLine: { backgroundColor: '#00B140' },
  inactiveLine: { backgroundColor: '#EEE' },
  cancelledStatusContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#FFF5F5', borderRadius: 10 },
  cancelledText: { color: '#FF3B30', fontWeight: '800', fontSize: 13 },
  emptyTrayPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyTrayText: { color: '#657E63', fontSize: 16, fontWeight: '600', opacity: 0.7, marginTop: 15, textAlign: 'center' },
  navContainer: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', paddingBottom: 30, zIndex: 100 },
  bottomNav: { flexDirection: 'row', backgroundColor: '#FFFFFF', width: width * 0.9, height: 70, borderRadius: 35, justifyContent: 'space-around', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10, borderColor: '#eee', borderWidth: 1 },
  viewCartBar: {
    position: 'absolute',
    bottom: 135,
    alignSelf: 'center',
    width: width * 0.9,
    height: 70,
    backgroundColor: '#657E63',
    borderRadius: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    zIndex: 20,
  },
  cartBarInfo: { justifyContent: 'center' },
  cartBarItemCount: { color: '#eee', fontSize: 14, fontWeight: '600' },
  cartBarTotal: { color: '#fff', fontSize: 18, fontWeight: '800' },
  viewCartAction: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  viewCartText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  navItem: { padding: 10, alignItems: 'center' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#333', marginTop: 4 },
  
  // Gallery Styles
  gallerySubHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  galleryRatingText: { fontSize: 14, fontWeight: '700', color: '#666' },
  emptyReviewsContainer: { alignItems: 'center', marginVertical: 40, opacity: 0.5 },
  emptyReviewsText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 10 },
  galleryReviewCard: { backgroundColor: '#F9F9F9', borderRadius: 20, padding: 15, marginBottom: 15 },
  galleryUserRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  galleryUserName: { fontSize: 15, fontWeight: '800', color: '#333' },
  galleryImagesRow: { flexDirection: 'row', marginTop: 10 },
  galleryImage: { width: 100, height: 100, borderRadius: 12, marginRight: 10 },
  galleryDateRow: { marginTop: 10, alignItems: 'flex-end' },
  galleryDateText: { fontSize: 11, color: '#BBB', fontWeight: '600' },
});

export default HomeScreen;
