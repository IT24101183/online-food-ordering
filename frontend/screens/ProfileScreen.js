import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, Dimensions, TextInput, ScrollView, Modal, ActivityIndicator, Alert, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
// API_URL imported from config.js

const ProfileScreen = ({ onNavigate, userData, setUserData }) => {
  const [name, setName] = useState(userData?.name || '');
  const [mobile, setMobile] = useState(userData?.telephone1 || '');
  const [profileImage, setProfileImage] = useState(userData?.profilePicture ? userData.profilePicture : null);
  const [loading, setLoading] = useState(false);

  // Constants for snapping
  const SNAP_UP = -height * 0.22;
  const SNAP_TOP = 0;
  const SNAP_BOTTOM = height * 0.45;

  // Animation values for the draggable panel - Initialize at SNAP_BOTTOM
  const panY = useRef(new Animated.Value(SNAP_BOTTOM)).current;
  const lastPanY = useRef(SNAP_BOTTOM);

  // Entrance animation
  useEffect(() => {
    Animated.spring(panY, {
      toValue: SNAP_UP,
      useNativeDriver: true,
      tension: 50,
      friction: 9,
    }).start();
    lastPanY.current = SNAP_UP;
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes", 
          onPress: async () => {
            await AsyncStorage.removeItem('userData');
            setUserData(null);
            onNavigate('home');
          }
        }
      ]
    );
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        let newY = lastPanY.current + gestureState.dy;
        if (newY < SNAP_UP) newY = SNAP_UP;
        if (newY > SNAP_BOTTOM) newY = SNAP_BOTTOM;
        panY.setValue(newY);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const currentY = lastPanY.current + gestureState.dy;
        let destY = SNAP_TOP;

        if (currentY < SNAP_UP / 2) {
          destY = SNAP_UP;
        } else if (currentY > SNAP_BOTTOM / 3 || gestureState.vy > 0.5) {
          destY = SNAP_BOTTOM;
        }

        Animated.spring(panY, {
          toValue: destY,
          useNativeDriver: true,
          tension: 50,
          friction: 9,
        }).start();
        lastPanY.current = destY;
      },
    })
  ).current;

  // Edit Modals
  const [isEditNameModal, setIsEditNameModal] = useState(false);
  const [isEditMobileModal, setIsEditMobileModal] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need access to your photos to update your profile picture.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      handleUpdateProfile(result.assets[0].uri, 'image');
    }
  };

  const handleUpdateProfile = async (value, type) => {
    setLoading(true);
    try {
      const formData = new FormData();
      if (type === 'image') {
        const uriParts = value.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('image', {
          uri: value,
          name: `profile.${fileType}`,
          type: `image/${fileType}`,
        });
      } else if (type === 'name') {
        formData.append('name', value);
      } else if (type === 'mobile') {
        formData.append('telephone1', value);
      }

      const response = await fetch(`${API_URL}/api/users/profile/${userData.id || userData?._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setUserData(data.user);
        if (type === 'image') setProfileImage(data.user.profilePicture);
        setIsEditNameModal(false);
        setIsEditMobileModal(false);
      } else {
        Alert.alert("Error", data.message || "Failed to update profile.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const InfoRow = ({ icon, label, value, onPress, showArrow = true, rightElement = null }) => (
    <TouchableOpacity style={styles.infoRow} onPress={onPress} disabled={!onPress}>
      <View style={styles.rowLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={22} color="#555" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowValue}>{value}</Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        {rightElement}
        {showArrow && <Ionicons name="chevron-forward" size={20} color="#CCC" />}
      </View>
    </TouchableOpacity>
  );

  if (!userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('home')}>
            <Ionicons name="chevron-back" size={24} color="#555" />
          </TouchableOpacity>
        </View>
        <View style={styles.guestContainer}>
          <Ionicons name="person-circle-outline" size={100} color="#CCC" />
          <Text style={styles.guestTitle}>Welcome, Guest!</Text>
          <Text style={styles.guestSubtitle}>Please log in to view and manage your profile details.</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => onNavigate('login')}>
            <Text style={styles.loginBtnText}>Log In Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Background content */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          const role = userData?.role?.toLowerCase();
          if (role === 'admin' || role === 'staff') {
            onNavigate('admin');
          } else {
            onNavigate('home');
          }
        }}>
          <Ionicons name="chevron-back" size={24} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileButton} onPress={handleLogout}>
          <Image
            source={{ uri: userData?.profilePicture ? `${API_URL}/${userData.profilePicture}` : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQnD5fWTO7ZJ0LWFJLdU7xGd1FhnXCuZLpxxQ&s' }}
            style={styles.profileImage}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.greetingSection}>
        <Text style={styles.greetingText}>Hi, {userData?.name || 'Customer'} 👋</Text>
        <Text style={styles.welcomeText}>Welcome to EatUp</Text>
      </View>

      {/* Draggable Profile Card Section */}
      <Animated.View
        style={[
          styles.profileCard,
          { transform: [{ translateY: panY }] }
        ]}
      >
        <View style={styles.handleBarContainer} {...panResponder.panHandlers}>
          <View style={styles.handleBar} />
        </View>

        <View style={styles.scrollContent}>
          <Text style={styles.profileTitle}>Your Profile</Text>

          <View style={styles.largeAvatarContainer}>
            <Image
              source={{ uri: profileImage || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQnD5fWTO7ZJ0LWFJLdU7xGd1FhnXCuZLpxxQ&s' }}
              style={styles.largeAvatar}
            />
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Your information</Text>

            <InfoRow
              icon="person-outline"
              label="Profile picture"
              value=""
              onPress={pickImage}
              rightElement={
                profileImage ? <Image source={{ uri: profileImage }} style={styles.rowThumbnail} /> : <Ionicons name="camera" size={20} color="#F97316" />
              }
            />

            <InfoRow
              icon="id-card-outline"
              label="Name"
              value={userData?.name || 'Not set'}
              onPress={() => setIsEditNameModal(true)}
            />

            <InfoRow
              icon="phone-portrait-outline"
              label="Mobile"
              value={userData?.telephone1 || 'Not set'}
              onPress={() => setIsEditMobileModal(true)}
            />

            <InfoRow
              icon="mail-outline"
              label="E-mail"
              value={userData?.email || 'Not set'}
              showArrow={false}
              rightElement={<Text style={styles.verifiedBadge}>Verified</Text>}
            />
          </View>
        </View>
      </Animated.View>

      {/* Bottom Navigation */}
      <View style={styles.navContainer}>
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => {
              const role = userData?.role?.toLowerCase();
              if (role === 'admin' || role === 'staff') {
                onNavigate('admin');
              } else {
                onNavigate('home');
              }
            }}
          >
            <Ionicons name="home-outline" size={28} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}><Ionicons name="time-outline" size={28} color="#999" /></TouchableOpacity>
          <TouchableOpacity style={styles.navItem}><Ionicons name="heart-outline" size={28} color="#999" /></TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="person" size={28} color="#333" />
            <View style={styles.activeDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit Name Modal */}
      <Modal visible={isEditNameModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Name</Text>
            <TextInput style={styles.modalInput} value={name} onChangeText={setName} placeholder="Enter your name" />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditNameModal(false)}><Text style={styles.btnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => handleUpdateProfile(name, 'name')} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Mobile Modal */}
      <Modal visible={isEditMobileModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Mobile</Text>
            <TextInput style={styles.modalInput} value={mobile} onChangeText={setMobile} placeholder="Enter mobile number" keyboardType="phone-pad" />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditMobileModal(false)}><Text style={styles.btnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => handleUpdateProfile(mobile, 'mobile')} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 20, marginBottom: 30 },
  backButton: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#D9E4D6', justifyContent: 'center', alignItems: 'center' },
  profileButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 1.5,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  greetingSection: { paddingHorizontal: 25, marginBottom: 40 },
  greetingText: { fontSize: 30, fontWeight: '700', color: '#333333', marginBottom: 5 },
  welcomeText: { fontSize: 18, color: '#666666', fontWeight: '500' },
  profileCard: { position: 'absolute', top: height * 0.4, width: '100%', height: height, backgroundColor: '#C8D9C6', borderTopLeftRadius: 50, borderTopRightRadius: 50, paddingHorizontal: 20, alignItems: 'center' },
  handleBarContainer: { width: '100%', height: 40, justifyContent: 'center', alignItems: 'center' },
  handleBar: { width: 60, height: 6, backgroundColor: '#FFFFFF', borderRadius: 3, opacity: 0.9 },
  scrollContent: { alignItems: 'center', width: '100%', paddingBottom: 20 },
  profileTitle: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 25 },
  largeAvatarContainer: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 35, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  largeAvatar: { width: 140, height: 140, borderRadius: 70 },
  infoCard: { width: width - 40, backgroundColor: '#FFFFFF', borderRadius: 30, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  infoCardTitle: { fontSize: 14, color: '#666', fontWeight: '600', marginBottom: 15, paddingLeft: 5 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 40, alignItems: 'center' },
  textContainer: { marginLeft: 5 },
  rowLabel: { fontSize: 12, color: '#999', fontWeight: '500', marginBottom: 2 },
  rowValue: { fontSize: 14, color: '#333', fontWeight: '700', textTransform: 'uppercase' },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  rowThumbnail: { width: 25, height: 25, borderRadius: 12.5, marginRight: 10 },
  verifiedBadge: { color: '#4F7942', fontWeight: '700', fontSize: 13, marginRight: 10 },
  navContainer: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', paddingBottom: 30, zIndex: 10 },
  bottomNav: { flexDirection: 'row', backgroundColor: '#FFFFFF', width: width * 0.9, height: 70, borderRadius: 35, justifyContent: 'space-around', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 },
  navItem: { padding: 10, alignItems: 'center' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#333', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15, color: '#333' },
  modalInput: { borderWidth: 1, borderColor: '#EEE', borderRadius: 10, padding: 12, marginBottom: 20, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { flex: 1, padding: 12, alignItems: 'center' },
  saveBtn: { flex: 1, backgroundColor: '#4F7942', padding: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { fontWeight: '700', color: '#FFF' },
  
  // Large Logout Button Styling
  largeLogoutButton: {
    width: width - 40,
    height: 55,
    backgroundColor: '#8B3A3A', // Muted Red (Premium)
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  largeLogoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
  },
  guestTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
  },
  guestSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  loginBtn: {
    backgroundColor: '#4F7942',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 3,
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default ProfileScreen;
