import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
// API_URL imported from config.js

const PosterManager = () => {
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchPosters();
  }, []);

  const fetchPosters = async () => {
    try {
      const response = await fetch(`${API_URL}/api/advertisements`);
      const data = await response.json();
      if (response.ok) setPosters(data);
    } catch (error) {
      console.error("Error fetching posters:", error);
    }
  };

  const handleAddPoster = async () => {
    if (posters.length >= 5) {
      return Alert.alert("Limit Reached", "You can only have up to 5 posters. Please delete one before adding another.");
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission Required', 'We need access to your photos to upload posters.');
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [21, 9], 
      quality: 0.9,
    });

    if (!result.canceled) {
      uploadPoster(result.assets[0].uri);
    }
  };

  const uploadPoster = async (uri) => {
    setLoading(true);
    try {
      const formData = new FormData();
      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('image', {
        uri: uri,
        name: `poster.${fileType}`,
        type: `image/${fileType}`,
      });

      const response = await fetch(`${API_URL}/api/advertisements`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      if (response.ok) {
        fetchPosters();
      } else {
        const data = await response.json();
        Alert.alert("Error", data.message || "Failed to upload poster");
      }
    } catch (error) {
      Alert.alert("Error", "Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handlePosterAction = (poster) => {
    Alert.alert(
      "Poster Actions",
      "Do you want to replace this poster or delete it?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Replace", onPress: () => replacePoster(poster._id) },
        { text: "Delete", style: "destructive", onPress: () => deletePoster(poster._id) }
      ]
    );
  };

  const replacePoster = async (id) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [21, 9],
      quality: 0.9,
    });

    if (!result.canceled) {
      setLoading(true);
      try {
        const formData = new FormData();
        const uri = result.assets[0].uri;
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];

        formData.append('image', {
          uri: uri,
          name: `poster.${fileType}`,
          type: `image/${fileType}`,
        });

        const response = await fetch(`${API_URL}/api/advertisements/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'multipart/form-data' },
          body: formData,
        });

        if (response.ok) {
          fetchPosters();
        }
      } catch (error) {
        Alert.alert("Error", "Failed to replace poster");
      } finally {
        setLoading(false);
      }
    }
  };

  const deletePoster = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/advertisements/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchPosters();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to delete poster");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.addButton} 
        onPress={handleAddPoster}
        disabled={loading}
      >
        <Ionicons name="add-circle" size={26} color="#fff" />
        <Text style={styles.addButtonText}>Add Poster</Text>
      </TouchableOpacity>
      
      {loading && <ActivityIndicator color="#00B140" style={styles.loader} />}

      <ScrollView horizontal={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.posterList}>
        {posters.map((item) => (
          <TouchableOpacity 
            key={item._id} 
            style={styles.posterItem}
            onPress={() => handlePosterAction(item)}
            activeOpacity={0.8}
          >
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.posterImage} 
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
        {posters.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>No advertisement posters yet.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 10, paddingHorizontal: 25 },
  addButton: { 
    flexDirection: 'row', 
    backgroundColor: '#657E63', // Matched color from the UI image
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    borderRadius: 18, 
    alignItems: 'center', 
    alignSelf: 'flex-start', 
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  addButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700', marginLeft: 8 },
  loader: { marginBottom: 15, alignSelf: 'flex-start' },
  posterList: { paddingBottom: 20 },
  posterItem: { 
    width: '100%',
    marginBottom: 20, 
    borderRadius: 20, 
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  posterImage: { 
    width: '100%', 
    height: (width - 50) * 0.45, // Adjusted to match the banner aspect ratio in the UI image
    borderRadius: 20 
  },
  emptyContainer: { alignItems: 'center', marginTop: 20, opacity: 0.5 },
  emptyText: { color: '#999', fontSize: 14, fontWeight: '600', marginTop: 10 },
});

export default PosterManager;
