import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

// Icons
import {
  Edit2,
  Store,
  CheckCircle,
  XCircle,
  RefreshCw,
  Save,
  LogOut,
  User,
  X,
} from 'lucide-react-native';

// Redux & API (Ensure these paths match your project)
import { logout, updateUser } from '../../Features/AuthSlice';
import {
  getAdminProfile,
  logoutAdmin,
  updateAdminProfile,
  getPendingRestaurants,
  getApprovedRestaurants,
  getRejectedRestaurants,
  approveRestaurant,
  rejectRestaurant,
} from '../../API/adminApi';

// --- TYPESCRIPT INTERFACES ---
interface AdminData {
  _id?: string;
  name: string;
  email: string;
  mobile: string;
}

interface RestaurantData {
  _id: string;
  restaurantName: string;
  ownerName: string;
  mobile: string;
  status: string;
}

type TabType = 'pending' | 'approved' | 'rejected';

const AdminDashboard = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  // State
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [isListLoading, setIsListLoading] = useState<boolean>(false);
  const [actionId, setActionId] = useState<string | null>(null);

  // Profile Edit States
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState({ name: '', mobile: '' });
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Fetch Admin Profile
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const profileResponse = await getAdminProfile();
        const adminData = profileResponse.data.data || profileResponse.data.admin;
        setAdmin(adminData);
        setEditFormData({ name: adminData.name, mobile: adminData.mobile });
      } catch (error: any) {
        if (error.response?.status === 401) {
          dispatch(logout());
          navigation.navigate('AdminAuth');
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [navigation, dispatch]);

  // Fetch Restaurants
  const fetchRestaurants = async () => {
    setIsListLoading(true);
    try {
      let res;
      if (activeTab === 'pending') res = await getPendingRestaurants();
      else if (activeTab === 'approved') res = await getApprovedRestaurants();
      else res = await getRejectedRestaurants();
      setRestaurants(res.data.data || []);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to load restaurant list' });
    } finally {
      setIsListLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [activeTab]);

  // Handlers
  const handleStatusUpdate = async (id: string, action: 'approve' | 'reject') => {
    setActionId(id);
    try {
      if (action === 'approve') {
        await approveRestaurant(id);
        Toast.show({ type: 'success', text1: 'Restaurant Approved!' });
      } else {
        await rejectRestaurant(id);
        Toast.show({ type: 'info', text1: 'Restaurant Rejected' });
      }
      fetchRestaurants();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Update failed' });
    } finally {
      setActionId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutAdmin();
      dispatch(logout());
      Toast.show({ type: 'success', text1: 'Logged out successfully' });
      
      navigation.reset({
        index: 0,
        routes: [{ 
          name: 'MainApp', 
          params: { screen: 'Home' }
        }],
      });
      
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error logging out' });
    }
  };

  const handleUpdateProfile = async () => {
    if (!editFormData.name || !editFormData.mobile) {
      return Toast.show({ type: 'error', text1: 'Fields cannot be empty' });
    }

    setIsUpdating(true);
    try {
      const response = await updateAdminProfile(editFormData);
      if (response.data.success) {
        const updatedAdmin = response.data.admin || response.data.data;
        setAdmin(updatedAdmin);
        
        dispatch(updateUser({
          name: updatedAdmin.name,
          mobile: updatedAdmin.mobile,
        }));

        Toast.show({ type: 'success', text1: 'Profile updated successfully!' });
        setShowEditModal(false);
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error.response?.data?.message || 'Failed to update profile' });
    } finally {
      setIsUpdating(false);
    }
  };

  // --- RENDERERS ---

  if (isLoading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Syncing Admin Access...</Text>
      </View>
    );
  }

  const renderRestaurantCard = ({ item }: { item: RestaurantData }) => (
    <View style={styles.resCard}>
      <View style={styles.resInfo}>
        <Text style={styles.resName}>{item.restaurantName}</Text>
        <Text style={styles.resOwner}>{item.ownerName}</Text>
        <Text style={styles.resMobile}>{item.mobile}</Text>
        <Text style={styles.resId}>ID: {item._id.slice(-6)}</Text>
      </View>

      <View style={styles.resActions}>
        {activeTab === 'pending' ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => handleStatusUpdate(item._id, 'approve')}
              disabled={actionId === item._id}
            >
              {actionId === item._id ? <ActivityIndicator size="small" color="#16a34a" /> : <CheckCircle size={20} color="#16a34a" />}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleStatusUpdate(item._id, 'reject')}
              disabled={actionId === item._id}
            >
              {actionId === item._id ? <ActivityIndicator size="small" color="#dc2626" /> : <XCircle size={20} color="#dc2626" />}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.statusBadge, activeTab === 'approved' ? styles.badgeApproved : styles.badgeRejected]}>
            <Text style={[styles.statusText, activeTab === 'approved' ? styles.textApproved : styles.textRejected]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER / PROFILE CARD */}
      <View style={styles.profileCard}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color="#ef4444" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.editBtn} onPress={() => setShowEditModal(true)}>
          <Edit2 size={18} color="#f97316" />
        </TouchableOpacity>

        <View style={styles.avatarBox}>
          <User size={32} color="#f97316" />
        </View>
        
        <Text style={styles.adminName}>{admin?.name}</Text>
        <Text style={styles.adminEmail}>{admin?.email}</Text>
        <Text style={styles.adminMobile}>{admin?.mobile}</Text>
      </View>

      {/* TABS SECTION */}
      <View style={styles.listSection}>
        <View style={styles.listHeader}>
          <View style={styles.listTitleRow}>
            <Store size={20} color="#f97316" />
            <Text style={styles.listTitle}>Restaurant Requests</Text>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          {(['pending', 'approved', 'rejected'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* RESTAURANT LIST */}
        {isListLoading ? (
          <View style={styles.centerList}>
            <ActivityIndicator size="large" color="#f97316" />
          </View>
        ) : (
          <FlatList
            data={restaurants}
            keyExtractor={(item) => item._id}
            renderItem={renderRestaurantCard}
            contentContainerStyle={styles.flatListContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.centerList}>
                <Store size={48} color="#d1d5db" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>No {activeTab} restaurants found.</Text>
              </View>
            }
          />
        )}
      </View>

      {/* EDIT PROFILE MODAL */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={editFormData.name}
                onChangeText={(val) => setEditFormData({ ...editFormData, name: val })}
                placeholder="Enter name"
              />

              <Text style={styles.inputLabel}>Mobile Number</Text>
              <TextInput
                style={styles.input}
                value={editFormData.mobile}
                onChangeText={(val) => setEditFormData({ ...editFormData, mobile: val })}
                placeholder="Enter mobile"
                keyboardType="phone-pad"
              />

              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleUpdateProfile}
                disabled={isUpdating}
              >
                {isUpdating ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Save size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' }, // slate-50
  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 16, color: '#64748b', fontWeight: '600' },
  
  // Profile Card
  profileCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  logoutBtn: { position: 'absolute', top: 16, left: 16, padding: 8, backgroundColor: '#fef2f2', borderRadius: 10 },
  editBtn: { position: 'absolute', top: 16, right: 16, padding: 8, backgroundColor: '#fff7ed', borderRadius: 10 },
  avatarBox: {
    width: 72,
    height: 72,
    backgroundColor: '#ffedd5',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#f97316',
    marginBottom: 12,
  },
  adminName: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  adminEmail: { fontSize: 14, color: '#64748b', marginTop: 4 },
  adminMobile: { fontSize: 14, color: '#334155', fontWeight: '600', marginTop: 8 },

  // List Section & Tabs
  listSection: { flex: 1, backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, elevation: 4 },
  listHeader: { paddingHorizontal: 20, marginBottom: 12 },
  listTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  
  tabsContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', marginHorizontal: 20, borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  tabText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  tabTextActive: { color: '#f97316' },

  // Restaurant Cards
  flatListContent: { paddingHorizontal: 20, paddingBottom: 40 },
  centerList: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  resCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 12, elevation: 1 },
  resInfo: { flex: 1 },
  resName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  resOwner: { fontSize: 13, color: '#475569', fontWeight: '500' },
  resMobile: { fontSize: 12, color: '#64748b', marginTop: 2 },
  resId: { fontSize: 10, color: '#cbd5e1', marginTop: 6, fontWeight: 'bold' },
  resActions: { marginLeft: 16 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 10, borderRadius: 10, borderWidth: 1 },
  approveBtn: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  rejectBtn: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeApproved: { backgroundColor: '#dcfce7' },
  badgeRejected: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  textApproved: { color: '#15803d' },
  textRejected: { color: '#b91c1c' },

  // Edit Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  modalForm: { gap: 12 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: -4 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 15, color: '#1e293b' },
  saveBtn: { flexDirection: 'row', backgroundColor: '#0f172a', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});

export default AdminDashboard;