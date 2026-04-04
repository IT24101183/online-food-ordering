import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ScrollView, Modal, TextInput, ActivityIndicator, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../config';

const { width, height } = Dimensions.get('window');
// API_URL imported from config.js

const PromotionManager = ({ panResponderHandlers }) => {
  const [promotions, setPromotions] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isItemPickerVisible, setIsItemPickerVisible] = useState(false);
  const [isCategoryPickerVisible, setIsCategoryPickerVisible] = useState(false);

  const [editingPromo, setEditingPromo] = useState(null);
  const [promoName, setPromoName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [discountValue, setDiscountValue] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const responseArr = await Promise.all([
        fetch(`${API_URL}/api/promotions`),
        fetch(`${API_URL}/api/items`),
        fetch(`${API_URL}/api/categories`)
      ]);

      const [promoData, itemData, catData] = await Promise.all(
        responseArr.map(async (res) => {
          if (!res.ok) return [];
          return res.json();
        })
      );

      setPromotions(promoData || []);
      setItems(itemData || []);
      setCategories(catData || []);
    } catch (error) {
      console.error("Fetch Data Error:", error);
      Alert.alert("Connection Error", "Could not connect to the server to load options.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleAddPromotion = async () => {
    if (!promoName || !startDate || !endDate || (!selectedImage && !editingPromo)) {
      Alert.alert("Error", "Please fill all required fields and add an image.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('name', promoName);
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);
    formData.append('discountValue', discountValue || '0');
    formData.append('items', JSON.stringify(selectedItems));
    formData.append('categories', JSON.stringify(selectedCategories));

    if (selectedImage) {
      const filename = selectedImage.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      formData.append('image', { uri: selectedImage, name: filename, type });
    }

    try {
      const url = editingPromo ? `${API_URL}/api/promotions/${editingPromo._id}` : `${API_URL}/api/promotions`;
      const method = editingPromo ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.ok) {
        Alert.alert("Success", `Promotion ${editingPromo ? 'updated' : 'added'} successfully!`);
        resetForm();
        fetchData();
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.message || "Something went wrong.");
      }
    } catch (error) {
      console.error("Save Promotion Error:", error);
      Alert.alert("Error", "Failed to save promotion.");
    } finally {
      setLoading(false);
    }
  };

  const deletePromotion = (id) => {
    Alert.alert("Delete Promotion", "Are you sure you want to remove this promotion?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/api/promotions/${id}`, { method: 'DELETE' });
            if (res.ok) {
              fetchData();
              setIsModalVisible(false);
            }
          } catch (error) {
            Alert.alert("Error", "Failed to delete promotion.");
          }
        }
      }
    ]);
  };

  const resetForm = () => {
    setEditingPromo(null);
    setPromoName('');
    setStartDate('');
    setEndDate('');
    setSelectedImage(null);
    setSelectedItems([]);
    setSelectedCategories([]);
    setDiscountValue('');
    setIsModalVisible(false);
  };

  const openEditModal = (promo) => {
    setEditingPromo(promo);
    setPromoName(promo.name);
    setStartDate(promo.startDate);
    setEndDate(promo.endDate);
    setSelectedImage(null); // Keep original if not changed
    setSelectedItems(promo.items.map(i => i._id || i));
    setSelectedCategories(promo.categories.map(c => c._id || c));
    setDiscountValue(promo.discountValue ? promo.discountValue.toString() : '');
    setIsModalVisible(true);
  };

  const toggleSelection = (id, type) => {
    const list = type === 'item' ? selectedItems : selectedCategories;
    const setter = type === 'item' ? setSelectedItems : setSelectedCategories;

    if (list.includes(id)) {
      setter(list.filter(item => item !== id));
    } else {
      setter([...list, id]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Header - Exact match with AddItem.js */}
        <View style={styles.header} {...panResponderHandlers}>
          <Text style={styles.headerTitle}>Add Promotion</Text>
          <Image source={require('../Images/Add Promotion.png')} style={styles.headerIcon} />
        </View>

        {/* Tab Container - Exact match with AddItem.js */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, styles.activeTab]}
            onPress={() => { resetForm(); setIsModalVisible(true); }}
          >
            <Ionicons name="add-circle" size={24} color="#FFF" />
            <Text style={styles.tabText}>Add new</Text>
          </TouchableOpacity>
        </View>

        {loading && !isModalVisible ? (
          <ActivityIndicator size="large" color="#657E63" style={{ marginTop: 50 }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            <View style={styles.grid}>
              {promotions.map((item) => (
                <TouchableOpacity key={item._id} style={styles.itemCard} onPress={() => openEditModal(item)}>
                  <View style={styles.itemCardImageContainer}>
                    <Image source={{ uri: item.image }} style={styles.itemCardImage} />
                    {item.discountValue > 0 && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountBadgeText}>-{item.discountValue}% OFF</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemCardName}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: 250 }} />
          </ScrollView>
        )}
      </View>

      {/* ADD / EDIT MODAL */}
      <Modal visible={isModalVisible} animationType="none" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={resetForm}>
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingPromo ? 'Edit Promotion' : 'Add new'}</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              {/* Image Picker */}
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                ) : editingPromo ? (
                  <Image source={{ uri: editingPromo.image }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={40} color="#999" />
                    <Text style={styles.placeholderText}>Add Image</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Promo Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={promoName}
                  onChangeText={setPromoName}
                  placeholder="Christmas Sale"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Discount (%)</Text>
                <TextInput
                  style={styles.textInput}
                  value={discountValue}
                  onChangeText={setDiscountValue}
                  placeholder="20"
                  keyboardType="numeric"
                />
              </View>

              {/* Items Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Add items</Text>
                <TouchableOpacity style={styles.dropdown} onPress={() => setIsItemPickerVisible(true)}>
                  <Text style={styles.dropdownText}>
                    {selectedItems.length > 0 ? `${selectedItems.length} items selected` : 'Select'}
                  </Text>
                  <Ionicons name="caret-down" size={18} color="#999" />
                </TouchableOpacity>
              </View>

              {/* Categories Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Add Category</Text>
                <TouchableOpacity style={styles.dropdown} onPress={() => setIsCategoryPickerVisible(true)}>
                  <Text style={styles.dropdownText}>
                    {selectedCategories.length > 0 ? `${selectedCategories.length} categories selected` : 'Select'}
                  </Text>
                  <Ionicons name="caret-down" size={18} color="#999" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Start Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="01/04/2026"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>End Date</Text>
                <TextInput
                  style={styles.textInput}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="21/04/2026"
                />
              </View>

              <View style={styles.modalButtons}>
                {editingPromo ? (
                  <>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePromotion(editingPromo._id)}>
                      <Text style={styles.btnText}>Delete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleAddPromotion}>
                      <Text style={styles.btnText}>Save</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                      <Text style={styles.btnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addPromoBtn} onPress={handleAddPromotion}>
                      <Text style={styles.btnText}>Add Promotion</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </ScrollView>

            {/* INLINE PICKER OVERLAY (Moved inside to be on top of Modal content) */}
            {(isItemPickerVisible || isCategoryPickerVisible) && (
              <View style={[StyleSheet.absoluteFillObject, { borderRadius: 35, backgroundColor: '#8DA28B', zIndex: 100 }]}>
                <View style={[styles.pickerContent, { width: '100%', height: '100%', borderRadius: 35 }]}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Select {isItemPickerVisible ? 'Items' : 'Categories'}</Text>
                    <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
                      <Ionicons name="refresh" size={20} color="#657E63" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
                    {(isItemPickerVisible ? items : categories).length > 0 ? (
                      (isItemPickerVisible ? items : categories).map(opt => (
                        <TouchableOpacity
                          key={opt._id}
                          style={styles.pickerOption}
                          onPress={() => toggleSelection(opt._id, isItemPickerVisible ? 'item' : 'category')}
                        >
                          <Ionicons
                            name={(isItemPickerVisible ? selectedItems : selectedCategories).includes(opt._id) ? "checkbox" : "square-outline"}
                            size={24}
                            color="#657E63"
                          />
                          <Text style={styles.optionText}>{opt.name}</Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.emptyState}>
                        <ActivityIndicator size="small" color="#657E63" style={{ marginBottom: 10 }} />
                        <Text style={styles.emptyStateText}>Loading or No Data Found</Text>
                        <Text style={styles.emptyStateSub}>Tap refresh above if the list is empty</Text>
                      </View>
                    )}
                  </ScrollView>
                  <TouchableOpacity style={styles.closePickerBtn} onPress={() => { setIsItemPickerVisible(false); setIsCategoryPickerVisible(false); }}>
                    <Text style={styles.closePickerText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C8D9C6' },
  contentContainer: { flex: 1 },

  // Header Style - Exact match with AddItem.js
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8DA28B',
    borderRadius: 35,
    paddingHorizontal: 25,
    paddingVertical: 12,
    marginBottom: 20,
    justifyContent: 'space-between',
    marginTop: 15
  },
  headerTitle: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  headerIcon: { width: 50, height: 50, resizeMode: 'contain' },

  // Tab Container Style - Exact match with AddItem.js (but justified to left)
  tabContainer: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 15, marginBottom: 25 },
  tabButton: {
    flexDirection: 'row',
    backgroundColor: '#657E63',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center'
  },
  activeTab: {
    backgroundColor: '#4F7942',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5
  },
  tabText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8 },

  // Grid/List Style - Exact match with AddItem.js itemCard
  listContent: { paddingHorizontal: 15, paddingBottom: 150 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  itemCard: {
    width: '46%',
    alignItems: 'center',
    marginHorizontal: '2%',
    marginBottom: 25
  },
  itemCardImageContainer: {
    width: '100%',
    height: width * 0.4,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  itemCardImage: { width: '80%', height: '80%', resizeMode: 'contain' },
  itemCardName: { color: '#1A1A1A', fontWeight: '800', fontSize: 16, textAlign: 'center' },

  // MODAL STYLES - Exact match with AddItem.js
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    width: '90%',
    height: '62%',
    backgroundColor: '#8DA28B',
    borderRadius: 30,
    padding: 20,
    alignItems: 'center',
    overflow: 'hidden'
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 15 },
  imagePicker: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#FFF',
    borderStyle: 'dashed',
    overflow: 'hidden'
  },
  previewImage: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center' },
  placeholderText: { color: '#FFF', fontSize: 10, marginTop: 2 },
  inputGroup: { width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' },
  inputLabel: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', width: '35%' },
  textInput: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, height: 35, paddingHorizontal: 15, fontSize: 14, color: '#333' },
  dropdown: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    height: 35,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dropdownText: { fontSize: 13, color: '#333' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
  deleteBtn: { width: '45%', backgroundColor: '#8B3A3A', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  cancelBtn: { width: '45%', backgroundColor: '#8B3A3A', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  saveBtn: { width: '45%', backgroundColor: '#526E48', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  addPromoBtn: { width: '45%', backgroundColor: '#526E48', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // PICKER STYLES
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    borderRadius: 30
  },
  pickerContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 15 },
  pickerTitle: { fontSize: 20, fontWeight: '800', color: '#333', textAlign: 'center' },
  refreshBtn: { position: 'absolute', right: 0 },
  pickerList: { flex: 1 },
  pickerOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  optionText: { fontSize: 16, color: '#333', fontWeight: '600' },
  closePickerBtn: { backgroundColor: '#8DA28B', paddingVertical: 12, borderRadius: 15, alignItems: 'center', marginTop: 15, marginBottom: 10 },
  closePickerText: { color: '#fff', fontWeight: '800' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyStateText: { fontSize: 16, fontWeight: '700', color: '#666' },
  emptyStateSub: { fontSize: 12, color: '#999', marginTop: 5, textAlign: 'center' },
  discountBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#C83A3A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10
  },
  discountBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800'
  }
});

export default PromotionManager;
