import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ScrollView, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

const { width } = Dimensions.get('window');

const User = ({ panResponderHandlers, userData }) => {
  // User Management State
  const [staffMembers, setStaffMembers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeUserTab, setActiveUserTab] = useState('Staff Members');
  
  const [isAddStaffModalVisible, setIsAddStaffModalVisible] = useState(false);
  const [isEditStaffModalVisible, setIsEditStaffModalVisible] = useState(false);
  const [isCustomerDetailsModalVisible, setIsCustomerDetailsModalVisible] = useState(false);
  
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/all`);
      const data = await response.json();
      if (response.ok) {
        setStaffMembers(data.staff);
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleAddStaff = async () => {
    const { name, email, password, confirmPassword } = staffForm;
    if (!name || !email || !password || !confirmPassword) return Alert.alert("Error", "Please fill in all fields.");
    if (password !== confirmPassword) return Alert.alert("Error", "Passwords do not match.");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...staffForm, role: 'Staff', address: 'Staff Office', telephone1: '000000000' })
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert("Success", "Staff member added successfully.");
        setIsAddStaffModalVisible(false);
        setStaffForm({ name: '', email: '', password: '', confirmPassword: '' });
        fetchUsers();
      } else {
        Alert.alert("Error", data.message || "Failed to add staff.");
      }
    } catch (error) {
      Alert.alert("Error", "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStaff = async () => {
    const { name, email, password } = staffForm;
    if (!name || !email) return Alert.alert("Error", "Name and Email are required.");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/users/staff/${selectedStaff._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert("Success", "Staff member updated.");
        setIsEditStaffModalVisible(false);
        fetchUsers();
      } else {
        Alert.alert("Error", data.message || "Update failed.");
      }
    } catch (error) {
      Alert.alert("Error", "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this user?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          const response = await fetch(`${API_URL}/api/users/${id}`, { method: 'DELETE' });
          if (response.ok) {
            setIsEditStaffModalVisible(false);
            setIsCustomerDetailsModalVisible(false);
            fetchUsers();
          }
        } catch (error) {
          Alert.alert("Error", "Network error.");
        }
      }}
    ]);
  };

  return (
    <View style={styles.categoryManagerContainer}>
      <View style={styles.categoryHeader} {...panResponderHandlers}>
        <Text style={styles.categoryHeaderTitle}>User Manage</Text>
        <Image source={require('../Images/Users.png')} style={styles.categoryHeaderIcon} />
      </View>
      <TouchableOpacity style={styles.addNewButton} onPress={() => { setStaffForm({ name: '', email: '', password: '', confirmPassword: '' }); setIsAddStaffModalVisible(true); }}>
        <Ionicons name="add-circle" size={24} color="#fff" /><Text style={styles.addNewButtonText}>Add Staff</Text>
      </TouchableOpacity>

      <View style={styles.userTabsContainer}>
        {['Staff Members', 'Customers'].map(tab => (
          <TouchableOpacity key={tab} style={[styles.userTab, activeUserTab === tab && styles.activeUserTab]} onPress={() => setActiveUserTab(tab)}>
            <Text style={[styles.userTabText, activeUserTab === tab && styles.activeUserTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {activeUserTab === 'Staff Members' ? (
          <View style={styles.staffGrid}>
            {staffMembers.map((staff) => (
              <TouchableOpacity key={staff._id} style={[styles.staffCard, staff.role === 'Admin' && { backgroundColor: '#FFD700' }]} onPress={() => { if (staff.role === 'Admin') return; setSelectedStaff(staff); setStaffForm({ name: staff.name, email: staff.email, password: '' }); setIsEditStaffModalVisible(true); }}>
                {staff.role === 'Admin' && <Ionicons name="lock-closed" size={16} color="#333" style={styles.lockIcon} />}
                <Image source={staff.role === 'Admin' ? require('../Images/Admin.png') : require('../Images/Staff.png')} style={styles.staffAvatar} />
                <Text style={styles.staffName}>{staff.role === 'Admin' ? 'Admin(You)' : staff.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.customerList}>
            {customers.map((customer) => (
              <TouchableOpacity key={customer._id} style={styles.customerPill} onPress={() => { setSelectedCustomer(customer); setIsCustomerDetailsModalVisible(true); }}>
                <Text style={styles.customerName}>{customer.name}</Text><Text style={styles.customerId}>{customer._id.slice(-10)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Staff Modal */}
      <Modal visible={isAddStaffModalVisible} transparent animationType="none">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsAddStaffModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: '#8DA28B' }]} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add Staff</Text>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Add Image</Text><View style={styles.textInputContainer}><TextInput style={styles.textInput} placeholder="Staff.png" editable={false}/></View></View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Name</Text><View style={styles.textInputContainer}><TextInput style={styles.textInput} value={staffForm.name} onChangeText={(t) => setStaffForm({...staffForm, name: t})}/></View></View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Email</Text><View style={styles.textInputContainer}><TextInput style={styles.textInput} value={staffForm.email} onChangeText={(t) => setStaffForm({...staffForm, email: t})}/></View></View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Password</Text><View style={styles.textInputContainer}><TextInput style={styles.textInput} secureTextEntry value={staffForm.password} onChangeText={(t) => setStaffForm({...staffForm, password: t})}/></View></View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Password</Text><View style={styles.textInputContainer}><TextInput style={styles.textInput} secureTextEntry value={staffForm.confirmPassword} onChangeText={(t) => setStaffForm({...staffForm, confirmPassword: t})}/></View></View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#8B3A3A' }]} onPress={() => setIsAddStaffModalVisible(false)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#4F7942' }]} onPress={handleAddStaff} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>Add Staff</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal visible={isEditStaffModalVisible} transparent animationType="none">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsEditStaffModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: '#8DA28B' }]} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Edit Staff</Text>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Add Image</Text><View style={styles.textInputContainer}><TextInput style={styles.textInput} placeholder="Staff.png" editable={false}/></View></View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Name</Text><View style={styles.textInputContainer}><TextInput style={styles.textInput} value={staffForm.name} onChangeText={(t) => setStaffForm({...staffForm, name: t})}/></View></View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Email</Text><View style={styles.textInputContainer}><TextInput style={styles.textInput} value={staffForm.email} onChangeText={(t) => setStaffForm({...staffForm, email: t})}/></View></View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Password</Text><View style={styles.textInputContainer}><TextInput style={styles.textInput} secureTextEntry placeholder="********" value={staffForm.password} onChangeText={(t) => setStaffForm({...staffForm, password: t})}/><Ionicons name="eye-outline" size={20} color="#333" style={{ position: 'absolute', right: 10 }} /></View></View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#8B3A3A' }]} onPress={() => handleDeleteUser(selectedStaff?._id)}><Text style={styles.modalButtonText}>Delete</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#4F7942' }]} onPress={handleUpdateStaff} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Customer Details Modal */}
      <Modal visible={isCustomerDetailsModalVisible} transparent animationType="none">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsCustomerDetailsModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: '#8DA28B' }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { marginBottom: 10 }]}>Customer Details</Text>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }} style={[styles.staffAvatar, { width: 80, height: 80 }]} />
              <Text style={{ color: '#fff', fontSize: 16 }}>{selectedCustomer?._id.slice(-10)}</Text>
            </View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Name</Text><View style={styles.textInputContainer}><TextInput style={styles.textInput} value={selectedCustomer?.name} editable={false}/></View></View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Email</Text><View style={styles.textInputContainer}><TextInput style={styles.textInput} value={selectedCustomer?.email} editable={false}/></View></View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Tel No</Text><View style={styles.textInputContainer}><TextInput style={styles.textInput} value={selectedCustomer?.telephone1} editable={false}/></View></View>
            {selectedCustomer?.telephone2 && <View style={styles.inputGroup}><Text style={styles.inputLabel}></Text><View style={styles.textInputContainer}><TextInput style={styles.textInput} value={selectedCustomer?.telephone2} editable={false}/></View></View>}
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Address</Text><View style={styles.textInputContainer}><TextInput style={styles.textInput} value={selectedCustomer?.address} editable={false}/></View></View>
            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Registered</Text><View style={styles.textInputContainer}><TextInput style={styles.textInput} value={selectedCustomer ? new Date(selectedCustomer.registeredDate).toLocaleDateString() : ''} editable={false}/></View></View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#8B3A3A', width: '40%' }]} onPress={() => handleDeleteUser(selectedCustomer?._id)}><Text style={styles.modalButtonText}>Delete</Text></TouchableOpacity>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#8DA28B', borderRadius: 30, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 20 },
  inputGroup: { width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  inputLabel: { width: '35%', fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  textInput: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 15, height: 35, paddingHorizontal: 15, fontSize: 14, color: '#333' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  modalButton: { width: '45%', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  modalButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  userTabsContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 20, padding: 5, marginBottom: 20, width: '100%' },
  userTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 15 },
  activeUserTab: { backgroundColor: '#4F7942' },
  userTabText: { color: '#FFF', fontWeight: '700', fontSize: 14, opacity: 0.8 },
  activeUserTabText: { color: '#FFF', opacity: 1 },
  staffGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  staffCard: { width: '48%', backgroundColor: '#00B140', borderRadius: 25, padding: 15, alignItems: 'center', marginBottom: 15, position: 'relative' },
  staffAvatar: { width: 60, height: 60, borderRadius: 30, marginBottom: 10, backgroundColor: '#fff' },
  staffName: { color: '#FFF', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  lockIcon: { position: 'absolute', top: 10, right: 15, zIndex: 1 },
  customerList: { width: '100%' },
  customerPill: { backgroundColor: '#f97316', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 25, marginBottom: 10, alignItems: 'center' },
  customerName: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  customerId: { color: '#FFF', opacity: 0.9, fontSize: 12 },
  textInputContainer: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 15, height: 35, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, position: 'relative' },
});

export default User;
