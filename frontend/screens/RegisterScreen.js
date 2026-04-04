import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, Dimensions, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

const { width, height } = Dimensions.get('window');
// API_URL imported from config.js

export default function RegisterScreen({ onNavigate }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [telephone1, setTelephone1] = useState('');
  const [telephone2, setTelephone2] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (pass) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    
    if (pass.length < minLength) return { valid: false, msg: "Password must be at least 8 characters long." };
    if (!hasUpperCase) return { valid: false, msg: "Password must contain at least one uppercase letter." };
    if (!hasNumber) return { valid: false, msg: "Password must contain at least one number." };
    if (!hasSpecialChar) return { valid: false, msg: "Password must contain at least one special character (e.g. !@#$%^&*)." };
    
    return { valid: true };
  };

  const handleRegister = async () => {
    if (!name || !email || !telephone1 || !address || !password || !confirmPassword) {
        return Alert.alert("Validation Error", "Please fill in all required fields.");
    }
    if (password !== confirmPassword) {
        return Alert.alert("Validation Error", "Passwords do not match.");
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
        return Alert.alert("Weak Password", passwordCheck.msg);
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, telephone1, telephone2, address, password })
      });
      
      const data = await response.json().catch(() => ({ message: "Invalid JSON from server" }));
      
      if (response.ok) {
        Alert.alert("Success!", "Account created successfully. You can now login.");
        onNavigate('login');
      } else {
        // Backend now returns: "This email is already registered. Please use a different email or login."
        Alert.alert("Registration Failed", data.message || "Email already exists.");
      }
    } catch (error) {
      Alert.alert("Network Error", "Cannot connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('login')}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Register Card */}
          <View style={styles.registerCard}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join us and order your food today</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Full Name*</Text>
              <TextInput style={styles.input} placeholder="John Doe" placeholderTextColor="#999" value={name} onChangeText={setName} />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Email Address*</Text>
              <TextInput style={styles.input} placeholderTextColor="#999" placeholder="johndoe@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            </View>

            {/* Telephone Section */}
            <View style={styles.row}>
              <View style={[styles.inputWrapper, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Telephone 1*</Text>
                <TextInput style={styles.input} placeholder="07XXXXXXXX" placeholderTextColor="#999" value={telephone1} onChangeText={setTelephone1} keyboardType="phone-pad" />
              </View>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={styles.label}>Telephone 2</Text>
                <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#999" value={telephone2} onChangeText={setTelephone2} keyboardType="phone-pad" />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Address*</Text>
              <TextInput style={styles.input} placeholder="123 Main Street..." placeholderTextColor="#999" value={address} onChangeText={setAddress} />
            </View>

            {/* Password Section */}
            <View style={styles.row}>
              <View style={[styles.inputWrapper, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Password*</Text>
                <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry />
              </View>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={styles.label}>Confirm Password*</Text>
                <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#999" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
              </View>
            </View>

            <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>Register</Text>}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have account? </Text>
              <TouchableOpacity onPress={() => onNavigate('login')}>
                <Text style={styles.footerLink}>Login Here</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <View style={styles.navContainer}>
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('home')}>
            <Ionicons name="home-outline" size={28} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="time-outline" size={28} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="heart-outline" size={28} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('login')}>
            <Ionicons name="person" size={28} color="#333" />
            <View style={styles.activeDot} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 25,
    paddingTop: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#D9E4D6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 150, // Space for nav bar
  },
  registerCard: {
    width: width * 0.9,
    backgroundColor: '#C8D9C6',
    borderRadius: 50,
    padding: 25,
    paddingVertical: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
    paddingLeft: 5,
  },
  input: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    height: 50,
    borderRadius: 15,
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#333',
  },
  registerButton: {
    backgroundColor: '#8DA28B',
    width: '100%',
    height: 55,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 15,
  },
  footerText: {
    color: '#666666',
    fontSize: 13,
  },
  footerLink: {
    color: '#f97316',
    fontSize: 13,
    fontWeight: 'bold',
  },
  navContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    paddingBottom: 30,
    zIndex: 10,
  },
  bottomNav: {
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
    borderWidth: 1,
  },
  navItem: {
    padding: 10,
    alignItems: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    marginTop: 4,
  }
});
