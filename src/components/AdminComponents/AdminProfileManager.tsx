import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { User, Edit2, Save } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useDispatch } from 'react-redux';
import { updateAdminProfile } from '../../API/adminApi';
import { updateUser } from '../../Features/AuthSlice';

const AdminProfileManager = ({ admin, onRefreshParent }: { admin: any, onRefreshParent: () => Promise<void> }) => {
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: admin?.name || '', mobile: admin?.mobile || '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const dispatch = useDispatch();

  const handleUpdateProfile = async () => {
    if (!editFormData.name || !editFormData.mobile) return Toast.show({ type: 'error', text1: 'Fields cannot be empty' });
    setIsUpdating(true);
    try {
      const response = await updateAdminProfile(editFormData);
      if (response.data.success) {
        dispatch(updateUser({ name: response.data.admin.name, mobile: response.data.admin.mobile }));
        Toast.show({ type: 'success', text1: 'Profile updated!' });
        setEditMode(false);
        onRefreshParent(); 
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to update profile' });
    } finally {
      setIsUpdating(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefreshParent();
    setRefreshing(false);
  }, [onRefreshParent]);

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#f97316"]} />}
    >
      <View style={styles.profileCard}>
        <View style={styles.avatarBox}><User size={40} color="#f97316" /></View>
        <Text style={styles.adminName}>{admin?.name}</Text>
        <Text style={styles.adminEmail}>{admin?.email}</Text>

        {editMode ? (
          <View style={styles.editForm}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput style={styles.input} value={editFormData.name} onChangeText={(val) => setEditFormData({ ...editFormData, name: val })} />
            <Text style={styles.inputLabel}>Mobile Number</Text>
            <TextInput style={styles.input} value={editFormData.mobile} onChangeText={(val) => setEditFormData({ ...editFormData, mobile: val })} keyboardType="phone-pad" />
            
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditMode(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateProfile} disabled={isUpdating}>
                {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Mobile: {admin?.mobile}</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(true)}>
              <Edit2 size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  profileCard: { backgroundColor: '#ffffff', padding: 24, borderRadius: 20, alignItems: 'center', elevation: 2 },
  avatarBox: { width: 80, height: 80, backgroundColor: '#ffedd5', borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#f97316', marginBottom: 12 },
  adminName: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  adminEmail: { fontSize: 14, color: '#64748b', marginTop: 4, marginBottom: 20 },
  infoBox: { alignItems: 'center', width: '100%' },
  infoText: { fontSize: 16, color: '#334155', fontWeight: '600', marginBottom: 20 },
  editBtn: { flexDirection: 'row', backgroundColor: '#f97316', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  editBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  editForm: { width: '100%', gap: 12, marginTop: 10 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 15 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12 },
  cancelText: { color: '#475569', fontWeight: 'bold' },
  saveBtn: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 12 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
});

export default AdminProfileManager;