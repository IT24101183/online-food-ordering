import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ScrollView, Modal, TextInput, Switch, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
// API_URL imported from config.js

const AddCategory = ({ panResponderHandlers }) => {
  // Category State
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryImage, setCategoryImage] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`);
      const data = await response.json();
      if (response.ok) {
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setCategoryImage(result.assets[0].uri);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim() || !categoryImage) {
      return Alert.alert("Error", "Please provide both name and image.");
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', categoryName);
      formData.append('isEnabled', isEnabled ? 'true' : 'false');

      // Image details for FormData
      const uriParts = categoryImage.split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('image', {
        uri: categoryImage,
        name: `category.${fileType}`,
        type: `image/${fileType}`,
      });

      const response = await fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert("Success", "Category added successfully.");
        setIsAddModalVisible(false);
        setCategoryName('');
        setCategoryImage('');
        setIsEnabled(true);
        fetchCategories();
      } else {
        Alert.alert("Error", data.message || "Failed to add category.");
      }
    } catch (error) {
      Alert.alert("Error", "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!categoryName.trim()) return Alert.alert("Error", "Category name is required.");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', categoryName);
      formData.append('isEnabled', isEnabled ? 'true' : 'false');

      if (categoryImage && !categoryImage.startsWith('http')) {
        const uriParts = categoryImage.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('image', {
          uri: categoryImage,
          name: `category.${fileType}`,
          type: `image/${fileType}`,
        });
      }

      const response = await fetch(`${API_URL}/api/categories/${selectedCategory._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      if (response.ok) {
        Alert.alert("Success", "Category updated.");
        setIsEditModalVisible(false);
        fetchCategories();
      } else {
        const data = await response.json();
        Alert.alert("Error", data.message || "Failed to update.");
      }
    } catch (error) {
      Alert.alert("Error", "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this category?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const response = await fetch(`${API_URL}/api/categories/${selectedCategory._id}`, {
              method: 'DELETE',
            });
            if (response.ok) {
              setIsEditModalVisible(false);
              fetchCategories();
            }
          } catch (error) {
            Alert.alert("Error", "Network error.");
          }
        }
      }
    ]);
  };

  const openEditModal = (category) => {
    setSelectedCategory(category);
    setCategoryName(category.name);
    setCategoryImage(category.image);
    setIsEnabled(category.isEnabled);
    setIsEditModalVisible(true);
  };

  return (
    <View style={styles.categoryManagerContainer}>
      <View style={styles.categoryHeader} {...panResponderHandlers}>
        <Text style={styles.categoryHeaderTitle}>Add Category</Text>
        <Image source={require('../Images/Add Category.png')} style={styles.categoryHeaderIcon} />
      </View>

      <TouchableOpacity style={styles.addNewButton} onPress={() => { setCategoryName(''); setCategoryImage(''); setIsEnabled(true); setIsAddModalVisible(true); }}>
        <Ionicons name="add-circle" size={24} color="#fff" /><Text style={styles.addNewButtonText}>Add new</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.categoryGrid}>
        {categories.map((item) => (
          <TouchableOpacity
            key={item._id}
            style={[styles.categoryCard, !item.isEnabled && styles.disabledCard]}
            onPress={() => openEditModal(item)}
          >
            <Image source={{ uri: item.image }} style={styles.categoryCardImage} />
            <Text style={styles.categoryCardText}>{item.name}</Text>
            {!item.isEnabled && <View style={styles.disabledBadge}><Text style={styles.disabledText}>Disabled</Text></View>}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add Category Modal */}
      <Modal visible={isAddModalVisible} transparent animationType="none">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsAddModalVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add new</Text>
            <TouchableOpacity style={styles.imageUploadArea} onPress={pickImage}>
              {categoryImage ? <Image source={{ uri: categoryImage }} style={styles.imagePreview} /> :
                <View style={styles.imagePlaceholder}><Ionicons name="cloud-upload-outline" size={40} color="#fff" /><Text style={styles.imagePlaceholderText}>Upload Image</Text></View>}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <TextInput style={styles.textInput} placeholder="Category name" value={categoryName} onChangeText={setCategoryName} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Enabled</Text>
              <Switch value={isEnabled} onValueChange={setIsEnabled} trackColor={{ false: "#8B3A3A", true: "#4F7942" }} thumbColor={"#fff"} />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsAddModalVisible(false)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={handleAddCategory} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>Add item</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Category Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="none">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsEditModalVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Edit Category</Text>
            <TouchableOpacity style={styles.imageUploadArea} onPress={pickImage}>
              <Image source={{ uri: categoryImage }} style={styles.imagePreview} />
              <View style={styles.editImageOverlay}><Ionicons name="camera" size={20} color="#fff" /></View>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <TextInput style={styles.textInput} value={categoryName} onChangeText={setCategoryName} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Enabled</Text>
              <Switch value={isEnabled} onValueChange={setIsEnabled} trackColor={{ false: "#8B3A3A", true: "#4F7942" }} thumbColor={"#fff"} />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.deleteButton]} onPress={handleDeleteCategory}><Text style={styles.modalButtonText}>Delete</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleUpdateCategory} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  categoryManagerContainer: { flex: 1, paddingTop: 15 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8DA28B', borderRadius: 35, paddingHorizontal: 25, paddingVertical: 12, marginBottom: 20, justifyContent: 'space-between' },
  categoryHeaderTitle: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  categoryHeaderIcon: { width: 50, height: 50 },
  addNewButton: { flexDirection: 'row', backgroundColor: '#4F7942', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, alignItems: 'center', alignSelf: 'flex-start', marginBottom: 20 },
  addNewButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 5 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 150 },
  categoryCard: { width: '48%', alignItems: 'center', marginBottom: 20, position: 'relative' },
  disabledCard: { opacity: 0.6 },
  categoryCardImage: { 
    width: 140, 
    height: 140, 
    borderRadius: 70, 
    marginBottom: 10, 
    backgroundColor: '#eee',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5
  },
  categoryCardText: { fontSize: 16, fontWeight: '800', color: '#333', textAlign: 'center' },
  disabledBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#8B3A3A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  disabledText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#8DA28B', borderRadius: 30, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 20 },
  imageUploadArea: { width: 120, height: 120, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 25, borderWidth: 2, borderColor: '#FFF', borderStyle: 'dashed', overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center' },
  imagePlaceholderText: { color: '#FFF', fontSize: 12, fontWeight: '600', marginTop: 5 },
  editImageOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', width: '100%', height: 35, justifyContent: 'center', alignItems: 'center' },
  inputGroup: { width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 15, justifyContent: 'space-between' },
  inputLabel: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  textInput: { flex: 0.8, backgroundColor: '#FFFFFF', borderRadius: 15, height: 35, paddingHorizontal: 15, fontSize: 14, color: '#333' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  modalButton: { width: '45%', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  cancelButton: { backgroundColor: '#8B3A3A' },
  submitButton: { backgroundColor: '#526E48' },
  deleteButton: { backgroundColor: '#8B3A3A' },
  saveButton: { backgroundColor: '#526E48' },
  modalButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});

export default AddCategory;
