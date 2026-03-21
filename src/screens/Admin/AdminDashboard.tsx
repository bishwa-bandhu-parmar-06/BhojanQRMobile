import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../Features/AuthSlice';
import { getAdminProfile, logoutAdmin } from '../../API/adminApi';

// Icons for Tab Bar
import { LayoutDashboard, Store, Users, User, Settings, LogOut } from 'lucide-react-native';

// Components
import CustomModal from '../../components/CustomModal';
import RestaurantRequestsManager from '../../components/AdminComponents/RestaurantRequestsManager';
import AdminProfileManager from "../../components/AdminComponents/AdminProfileManager";
import AppVersionManager from './AppVersionManager';
const AdminDashboard = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { user } = useSelector((state: any) => state.auth);

  // States
  const [admin, setAdmin] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests'); 

  // Modal States
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isSessionExpiredModalVisible, setSessionExpiredModalVisible] = useState(false);

  // Fetch Admin Profile
  const fetchAdminData = async () => {
    try {
      const res = await getAdminProfile();
      setAdmin(res.data.data || res.data.admin);
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        dispatch(logout());
        setSessionExpiredModalVisible(true);
      }
    }
  };

  useEffect(() => {
    fetchAdminData().finally(() => setIsLoading(false));
  }, [navigation, dispatch]);

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    try {
      await logoutAdmin();
      dispatch(logout());
      navigation.reset({ index: 0, routes: [{ name: 'MainApp', params: { screen: 'Home' } }] });
    } catch (error) {
      console.log('Logout error', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Syncing Admin Access...</Text>
      </View>
    );
  }

  // Helper for Top Tabs
  const TabButton = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => {
    const isActive = activeTab === id;
    return (
      <TouchableOpacity style={[styles.tabButton, isActive && styles.tabButtonActive]} onPress={() => setActiveTab(id)}>
        <Icon size={18} color={isActive ? "#fff" : "#64748b"} />
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* MODALS */}
      <CustomModal 
        visible={isLogoutModalVisible} type="logout" title="Log Out?"
        message="Are you sure you want to securely log out of the Admin portal?"
        confirmText="Yes, Log Out" onConfirm={handleConfirmLogout} onCancel={() => setLogoutModalVisible(false)} 
      />
      <CustomModal 
        visible={isSessionExpiredModalVisible} type="error" title="Session Expired"
        message="Your admin session has expired. Please log in again to continue."
        confirmText="Log In Again" onConfirm={() => { setSessionExpiredModalVisible(false); navigation.navigate('AdminAuth'); }}
      />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Portal</Text>
          <Text style={styles.adminName} numberOfLines={1}>Hello, {admin?.name || "Admin"}</Text>
        </View>
        <TouchableOpacity onPress={() => setLogoutModalVisible(true)} style={styles.logoutButton}>
          <LogOut size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* SCROLLABLE HORIZONTAL MENU BAR */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollTabs}>
          <TabButton id="overview" label="Overview" icon={LayoutDashboard} />
          <TabButton id="requests" label="Restaurants" icon={Store} />
          <TabButton id="users" label="Users" icon={Users} />
          <TabButton id="profile" label="Profile" icon={User} />
          <TabButton id="settings" label="Settings" icon={Settings} />
        </ScrollView>
      </View>

      {/* MAIN CONTENT AREA */}
      <View style={styles.mainContent}>
        {/* Placeholders for future components */}
        {activeTab === 'overview' && <View style={styles.placeholder}><Text>Overview Coming Soon</Text></View>}
        {activeTab === 'users' && <View style={styles.placeholder}><Text>User Management Coming Soon</Text></View>}
        
        {/* Active Components */}
        {activeTab === 'requests' && <RestaurantRequestsManager />}
        {activeTab === 'profile' && <AdminProfileManager admin={admin} onRefreshParent={fetchAdminData} />}

        {activeTab === 'settings' && <AppVersionManager />}
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 12, color: '#64748b', fontWeight: '600' },
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: '#ffffff' },
  greeting: { fontSize: 12, color: '#f97316', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  adminName: { fontSize: 22, fontWeight: '900', color: '#1e293b', maxWidth: 250 },
  logoutButton: { padding: 10, backgroundColor: '#fef2f2', borderRadius: 12 },
  tabContainer: { borderBottomWidth: 1, borderColor: '#f1f5f9', backgroundColor: '#ffffff' },
  scrollTabs: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tabButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, gap: 8 },
  tabButtonActive: { backgroundColor: '#f97316' },
  tabText: { fontSize: 14, fontWeight: 'bold', color: '#64748b' },
  tabTextActive: { color: '#ffffff' },
  mainContent: { flex: 1, backgroundColor: '#f8fafc' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default AdminDashboard;