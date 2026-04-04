import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, FlatList, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { APP_NAME, CURRENCY, DEFAULT_IMAGES, STATUS_COLORS } from '../constants';

const { width, height } = Dimensions.get('window');

const FinanceManager = ({ panResponderHandlers }) => {
  const [filter, setFilter] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ transactions: [], stats: { total: 0, success: 0, fail: 0, refund: 0 } });
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const filterOptions = [
    { label: 'All Time', value: 'all' },
    { label: 'Last 24 Hours', value: 'last24h' },
    { label: 'Daily', value: 'daily' },
    { label: 'This Week', value: 'week' },
  ];

  useEffect(() => {
    fetchFinanceData();
  }, [filter]);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/payments?filter=${filter}`);
      const text = await response.text();

      try {
        const result = JSON.parse(text);
        if (response.ok) {
          setData(result);
        } else {
          console.error("Finance API Error:", result.message || "Failed to fetch data.");
        }
      } catch (e) {
        console.error("Finance JSON Parse Error. Response was:", text);
      }
    } catch (error) {
      console.error("Finance Network Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTransactionDate = (dateString) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = months[date.getMonth()];
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${m} ${d}, ${h}:${min}`;
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'success': return '#00B140';
      case 'failed':
      case 'fail': return '#FF4B4B';
      case 'refunded':
      case 'refund': return '#FF8C00';
      default: return '#999';
    }
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.tableRow}>
      <Text style={styles.dateText}>{formatTransactionDate(item.createdAt)}</Text>
      <TouchableOpacity
        style={{ width: '35%' }}
        onPress={() => setSelectedTransaction(item)}
      >
        <Text style={styles.emailText} numberOfLines={1}>{item.orderId?.userId?.email || 'N/A'}</Text>
      </TouchableOpacity>
      <Text style={styles.totalText}>{CURRENCY} {item.amount}</Text>
      <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
        {item.status === 'success' ? 'Sucsess' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Pill */}
      <View style={styles.headerPill} {...panResponderHandlers}>
        <Text style={styles.headerPillText}>My Finance</Text>
        <View style={styles.iconContainer}>
          <Image source={require('../Images/My Finance.png')} style={{ width: 50, height: 50 }} resizeMode="contain" />
        </View>
      </View>

      {/* Filter Button */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
          <Text style={styles.filterBtnText}>{filterOptions.find(o => o.value === filter).label}</Text>
          <Ionicons name="chevron-down" size={18} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Payment</Text>
          <Text style={styles.summaryValue}>-  <Text style={{ fontWeight: '700', color: '#333' }}>{data.stats.total}</Text></Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Success</Text>
          <Text style={styles.summaryValue}>-  <Text style={{ fontWeight: '700', color: '#00B140' }}>{data.stats.success}</Text></Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Fail</Text>
          <Text style={styles.summaryValue}>-  <Text style={{ fontWeight: '700', color: '#FF4B4B' }}>{data.stats.fail}</Text></Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Refund</Text>
          <Text style={styles.summaryValue}>-  <Text style={{ fontWeight: '700', color: '#FF8C00' }}>{data.stats.refund}</Text></Text>
        </View>
      </View>

      {/* Table Header - NEW ORDER */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeadText, { width: '25%' }]}>Date & Time</Text>
        <Text style={[styles.tableHeadText, { width: '35%' }]}>Email</Text>
        <Text style={[styles.tableHeadText, { width: '22%', textAlign: 'right', paddingRight: 15 }]}>Total</Text>
        <Text style={[styles.tableHeadText, { width: '18%', textAlign: 'right', paddingRight: 0 }]}>Status</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#657E63" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={data.transactions}
          renderItem={renderTransaction}
          keyExtractor={item => item._id}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No records found for this period.</Text>}
        />
      )}

      {/* Detailed Report Modal */}
      <Modal visible={!!selectedTransaction} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedTransaction(null)}
          />
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailImageWrapper}>
                <Image
                  source={{ uri: selectedTransaction?.orderId?.userId?.profilePicture || DEFAULT_IMAGES.PROFILE }}
                  style={styles.detailImage}
                />
              </View>
              <Text style={styles.detailName}>{selectedTransaction?.orderId?.userId?.name || 'Unknown'}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{selectedTransaction?.orderId?.userId?.role?.toUpperCase() || 'CUSTOMER'}</Text>
              </View>
            </View>

            <View style={styles.customerDetailSection}>
              <View style={styles.contactRow}>
                <Ionicons name="call" size={20} color="#00B140" />
                <Text style={styles.contactText}>{selectedTransaction?.orderId?.userId?.telephone1 || 'N/A'}</Text>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="mail" size={20} color="#00B140" />
                <Text style={styles.contactText}>{selectedTransaction?.orderId?.userId?.email || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.billSection}>
              <View style={styles.billHeadRow}>
                <Text style={styles.billHeader}>Order: {selectedTransaction?.orderId?.orderNumber}</Text>
                <Text style={styles.payIdBadge}>Pay ID: {selectedTransaction?.transactionId}</Text>
              </View>
              <ScrollView style={styles.itemList} showsVerticalScrollIndicator={false}>
                {selectedTransaction?.orderId?.items?.map((it, idx) => (
                  <View key={idx} style={styles.billItem}>
                    <Text style={styles.billItemName}>{it.name}</Text>
                    <Text style={styles.billItemQty}>x{it.quantity}</Text>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.billFooter}>
                <Text style={styles.billTotalLabel}>Total Amount</Text>
                <Text style={styles.billTotalValue}>{CURRENCY} {selectedTransaction?.amount?.toFixed(2)}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedTransaction(null)}>
              <Text style={styles.closeBtnText}>Close Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
          <View style={styles.modalContent}>
            {filterOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.modalItem, filter === opt.value && styles.activeModalItem]}
                onPress={() => { setFilter(opt.value); setShowFilterModal(false); }}
              >
                <Text style={[styles.modalItemText, filter === opt.value && styles.activeModalItemText]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 5 },
  headerPill: {
    flexDirection: 'row',
    backgroundColor: '#8DA28B',
    paddingVertical: 11,
    paddingHorizontal: 25,
    borderRadius: 35,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 20
  },
  headerPillText: { fontSize: 32, fontWeight: '600', color: '#FFF' },
  iconContainer: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  plusBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#00B140', borderRadius: 10, width: 16, height: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },

  filterRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 15 },
  filterBtn: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  filterBtnText: { color: '#999', fontSize: 16, marginRight: 5 },

  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 25
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 20, color: '#333', fontWeight: '500' },
  summaryValue: { fontSize: 20, color: '#999' },

  tableHeader: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 12 },
  tableHeadText: { fontSize: 12, color: '#FFF', fontWeight: '700' },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 15,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  dateText: { fontSize: 10, color: '#333', fontWeight: '600', width: '25%' },
  emailText: { fontSize: 10, color: '#FFB800', fontWeight: '700' },
  totalText: { fontSize: 10, color: '#333', fontWeight: '700', width: '22%', textAlign: 'right' },
  statusText: { fontSize: 10, fontWeight: '800', width: '18%', textAlign: 'right' },

  emptyText: { textAlign: 'center', marginTop: 50, color: '#FFF', opacity: 0.6, fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  detailCard: { backgroundColor: '#FFF', width: width * 0.92, borderRadius: 30, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  detailHeader: { alignItems: 'center', marginBottom: 20 },
  detailImageWrapper: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', borderWidth: 3, borderColor: '#00B140', marginBottom: 10 },
  detailImage: { width: '100%', height: '100%' },
  detailName: { fontSize: 22, fontWeight: '700', color: '#333' },
  roleBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 5 },
  roleBadgeText: { fontSize: 12, color: '#00B140', fontWeight: '700' },

  customerDetailSection: { marginBottom: 20 },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  contactText: { fontSize: 16, color: '#555', marginLeft: 12, fontWeight: '500' },

  billSection: { backgroundColor: '#F8F9F8', borderRadius: 20, padding: 15 },
  billHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  billHeader: { fontSize: 15, fontWeight: '700', color: '#657E63' },
  payIdBadge: { fontSize: 10, color: '#999', backgroundColor: '#EEE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },

  itemList: { maxHeight: 120, marginBottom: 10 },
  billItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  billItemName: { fontSize: 14, color: '#333' },
  billItemQty: { fontSize: 14, color: '#999', fontWeight: '600' },
  billFooter: { borderTopWidth: 1, borderColor: '#EEE', marginTop: 10, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billTotalLabel: { fontSize: 14, color: '#999', fontWeight: '500' },
  billTotalValue: { fontSize: 18, color: '#00B140', fontWeight: '800' },

  closeBtn: { backgroundColor: '#657E63', paddingVertical: 15, borderRadius: 15, alignItems: 'center', marginTop: 25 },
  closeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 10, width: width * 0.8 },
  modalItem: { paddingVertical: 15, paddingHorizontal: 20, borderRadius: 10 },
  activeModalItem: { backgroundColor: '#F0F5EF' },
  modalItemText: { fontSize: 18, color: '#333' },
  activeModalItemText: { color: '#657E63', fontWeight: '600' }
});

export default FinanceManager;
