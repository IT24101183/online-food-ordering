import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ScrollView, Modal, TextInput, ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../config';

const { width, height } = Dimensions.get('window');
// API_URL imported from config.js

const AddItem = ({ panResponderHandlers }) => {
  const [view, setView] = useState('list'); // 'list' or 'inventory'
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCategoryPickerVisible, setIsCategoryPickerVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemStock, setItemStock] = useState('0');
  const [itemImage, setItemImage] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_URL}/api/items`);
      const data = await response.json();
      if (response.ok) setItems(data);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`);
      const data = await response.json();
      if (response.ok) setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need access to your photos.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setItemImage(result.assets[0].uri);
    }
  };

  const handleSaveItem = async () => {
    if (!itemName || !itemPrice || selectedCategories.length === 0 || (!itemImage && !editingItem)) {
      return Alert.alert("Error", "Please fill all fields.");
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', itemName);
      formData.append('description', itemDescription);
      formData.append('price', itemPrice);
      formData.append('stock', itemStock);
      formData.append('categories', JSON.stringify(selectedCategories));
      formData.append('isEnabled', 'true');
      if (itemImage && !itemImage.startsWith('http')) {
        const uriParts = itemImage.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('image', {
          uri: itemImage,
          name: `item.${fileType}`,
          type: `image/${fileType}`,
        });
      }
      const url = editingItem ? `${API_URL}/api/items/${editingItem._id}` : `${API_URL}/api/items`;
      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
      if (response.ok) {
        Alert.alert("Success", "Item saved successfully.");
        resetForm();
        fetchItems();
      } else {
        const data = await response.json();
        Alert.alert("Error", data.message || "Failed to save.");
      }
    } catch (error) {
      Alert.alert("Error", "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (itemId, type) => {
    try {
      const response = await fetch(`${API_URL}/api/items/${itemId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (response.ok) {
        const updatedItem = await response.json();
        setItems(items.map(it => it._id === itemId ? updatedItem : it));
      }
    } catch (error) {
      console.error("Error updating stock:", error);
    }
  };

  const resetForm = () => {
    setItemName(''); setItemDescription(''); setItemPrice(''); setItemStock('0');
    setItemImage(null); setSelectedCategories([]); setEditingItem(null);
    setIsModalVisible(false); setIsCategoryPickerVisible(false);
  };

  const openEditModal = (item) => {
    setEditingItem(item); setItemName(item.name); setItemDescription(item.description);
    setItemPrice(item.price.toString()); setItemStock(item.stock.toString());
    setItemImage(item.image);
    setSelectedCategories(item.categories.map(c => c._id || c));
    setIsModalVisible(true);
  };

  const toggleCategory = (id) => {
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
  };

  const renderItemCard = ({ item }) => (
    <TouchableOpacity style={styles.itemCard} onPress={() => openEditModal(item)}>
      <Image source={{ uri: item.image }} style={styles.itemCardImage} />
      <Text style={styles.itemCardName}>{item.name}</Text>
      <Text style={styles.itemCardPrice}>Rs.{item.price}</Text>
    </TouchableOpacity>
  );

  const renderInventoryRow = ({ item }) => (
    <View style={styles.inventoryRow}>
      <Text style={styles.inventoryName}>{item.name}</Text>
      <View style={styles.stockControl}>
        <TouchableOpacity onPress={() => handleUpdateStock(item._id, 'dec')}><Ionicons name="remove-circle" size={32} color="#8B3A3A" /></TouchableOpacity>
        <Text style={[styles.stockText, item.stock < 5 && styles.lowStockText]}>{item.stock}</Text>
        <TouchableOpacity onPress={() => handleUpdateStock(item._id, 'inc')}><Ionicons name="add-circle" size={32} color="#00B140" /></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header} {...panResponderHandlers}>
        <Text style={styles.headerTitle}>Add Item</Text>
        <Image source={require('../Images/Add item.png')} style={styles.headerIcon} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, view === 'list' && styles.activeTab]}
          onPress={() => {
            setView('list');
            resetForm();
            setIsModalVisible(true);
          }}
        >
          <Ionicons name="add-circle" size={24} color="#fff" /><Text style={styles.tabText}>Add new</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, view === 'inventory' && styles.activeTab]} onPress={() => setView('inventory')}>
          <Ionicons name="add-circle" size={24} color="#8B3A3A" /><Text style={styles.tabText}>Inventory</Text>
        </TouchableOpacity>
      </View>

      {view === 'list' ? (
        <FlatList
          data={items}
          renderItem={renderItemCard}
          keyExtractor={it => it._id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.inventoryContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" /><TextInput style={styles.searchInput} placeholder="Search items" value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <View style={styles.inventoryHeader}><Text style={styles.inventoryHeaderLabel}>Item Name</Text><Text style={styles.inventoryHeaderLabel}>Current Stock</Text></View>
          <FlatList data={items.filter(it => it.name.toLowerCase().includes(searchQuery.toLowerCase()))} renderItem={renderInventoryRow} keyExtractor={it => it._id} />
        </View>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={isModalVisible} transparent animationType="none">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={resetForm}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{editingItem ? 'Edit item' : 'Add new'}</Text>
            <TouchableOpacity style={styles.imageUploadArea} onPress={pickImage}>
              {itemImage ? <Image source={{ uri: itemImage }} style={styles.imagePreview} /> :
                <View style={styles.imagePlaceholder}><Ionicons name="cloud-upload-outline" size={40} color="#fff" /><Text style={styles.imagePlaceholderText}>Upload Image</Text></View>}
            </TouchableOpacity>
            <ScrollView style={{ width: '100%' }} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Name</Text><TextInput style={styles.textInput} value={itemName} onChangeText={setItemName} /></View>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Category</Text><TouchableOpacity style={styles.selectInput} onPress={() => setIsCategoryPickerVisible(true)}><Text style={styles.selectInputText}>{selectedCategories.length > 0 ? `${selectedCategories.length} selected` : 'Select'}</Text><Ionicons name="chevron-down" size={20} color="#999" /></TouchableOpacity></View>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Description</Text><TextInput style={styles.textInput} value={itemDescription} onChangeText={setItemDescription} /></View>
              <View style={styles.inputGroup}><Text style={styles.inputLabel}>Price</Text><TextInput style={styles.textInput} keyboardType="numeric" value={itemPrice} onChangeText={setItemPrice} /></View>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={resetForm}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={handleSaveItem}><Text style={styles.modalButtonText}>{editingItem ? 'Save' : 'Add item'}</Text></TouchableOpacity>
            </View>

            {/* INTERNAL CATEGORY PICKER OVERLAY (NOT A SEPARATE MODAL) */}
            {isCategoryPickerVisible && (
              <TouchableOpacity style={styles.pickerInternalOverlay} activeOpacity={1} onPress={() => setIsCategoryPickerVisible(false)}>
                <View style={styles.pickerContent} onStartShouldSetResponder={() => true}>
                  <Text style={styles.pickerTitle}>Select Categories</Text>
                  {categories.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#999', marginVertical: 20 }}>No categories found.</Text>
                  ) : (
                    <ScrollView style={{ maxHeight: height * 0.4 }} keyboardShouldPersistTaps="handled">
                      {categories.map(cat => (
                        <TouchableOpacity key={cat._id} style={styles.pickerItem} onPress={() => toggleCategory(cat._id)}>
                          <Text style={styles.pickerItemText}>{cat.name}</Text>
                          {selectedCategories.includes(cat._id) && <Ionicons name="checkmark-circle" size={24} color="#4F7942" />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  <TouchableOpacity style={styles.pickerCloseButton} onPress={() => setIsCategoryPickerVisible(false)}><Text style={styles.pickerCloseText}>Done</Text></TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C8D9C6' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8DA28B', borderRadius: 35, paddingHorizontal: 25, paddingVertical: 12, marginBottom: 20, justifyContent: 'space-between', marginTop: 15 },
  headerTitle: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  headerIcon: { width: 50, height: 50 },
  tabContainer: { flexDirection: 'row', justifyContent: 'center', gap: 70, marginBottom: 25 },
  tabButton: { flexDirection: 'row', backgroundColor: '#657E63', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, alignItems: 'center' },
  activeTab: { backgroundColor: '#4F7942', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
  tabText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8 },
  listContent: { paddingHorizontal: 15, paddingBottom: 150 },
  itemCard: { width: '46%', alignItems: 'center', marginHorizontal: '2%', marginBottom: 25 },
  itemCardImage: { width: '100%', height: width * 0.4, marginBottom: 10, backgroundColor: '#fff' },
  itemCardName: { color: '#1A1A1A', fontWeight: '800', fontSize: 16, textAlign: 'center' },
  itemCardPrice: { color: '#666', fontSize: 14, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  inventoryContainer: { flex: 1, paddingHorizontal: 15 },
  searchContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 25, paddingHorizontal: 15, height: 45, alignItems: 'center', marginBottom: 20 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  inventoryHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: 8 },
  inventoryHeaderLabel: { color: '#333', fontWeight: '700', fontSize: 13 },
  inventoryRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 15, alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  inventoryName: { fontWeight: '700', fontSize: 15, color: '#333' },
  stockControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stockText: { fontSize: 18, fontWeight: '800', color: '#333', minWidth: 20, textAlign: 'center' },
  lowStockText: { color: '#8B3A3A' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', height: '50%', backgroundColor: '#8DA28B', borderRadius: 30, padding: 20, alignItems: 'center', overflow: 'hidden' },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 15 },
  imageUploadArea: { width: 100, height: 100, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 0, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 2, borderColor: '#FFF', borderStyle: 'dashed', overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center' },
  imagePlaceholderText: { color: '#FFF', fontSize: 10, marginTop: 2 },
  inputGroup: { width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' },
  inputLabel: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', width: '30%' },
  textInput: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, height: 35, paddingHorizontal: 15, fontSize: 14, color: '#333' },
  selectInput: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, height: 35, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectInputText: { fontSize: 13, color: '#333' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
  modalButton: { width: '45%', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  cancelButton: { backgroundColor: '#8B3A3A' },
  submitButton: { backgroundColor: '#526E48' },
  modalButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  pickerInternalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 999, borderRadius: 30 },
  pickerContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  pickerTitle: { fontSize: 20, fontWeight: '800', marginBottom: 15, textAlign: 'center' },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  pickerItemText: { fontSize: 16, fontWeight: '600' },
  pickerCloseButton: { backgroundColor: '#8DA28B', paddingVertical: 12, borderRadius: 15, alignItems: 'center', marginTop: 15 },
  pickerCloseText: { color: '#fff', fontWeight: '800' }
});

export default AddItem;
