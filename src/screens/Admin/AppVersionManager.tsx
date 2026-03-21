import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, ScrollView } from 'react-native';
import Toast from 'react-native-toast-message';
import { Save, Smartphone } from 'lucide-react-native';
import { getAppVersion, updateAppVersion } from '../../API/versionApi';

const AppVersionManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    minVersion: '',
    latestVersion: '',
    updateUrl: '',
    message: '',
    forceUpdate: true
  });

  useEffect(() => {
    fetchVersionConfig();
  }, []);

  const fetchVersionConfig = async () => {
    try {
      const res = await getAppVersion();
      if (res.data?.data) {
        setFormData(res.data.data);
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to load version config' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAppVersion(formData);
      Toast.show({ type: 'success', text1: 'App Version Updated Successfully! 🚀' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to update version' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#ea580c" style={{ marginTop: 50 }} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={styles.headerBox}>
        <Smartphone size={32} color="#ea580c" />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.title}>App Update Manager</Text>
          <Text style={styles.subtitle}>Force users to update to the latest app version.</Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Minimum Version</Text>
            <TextInput style={styles.input} value={formData.minVersion} onChangeText={(t) => setFormData({ ...formData, minVersion: t })} placeholder="e.g. 1.0.1" />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>Latest Version</Text>
            <TextInput style={styles.input} value={formData.latestVersion} onChangeText={(t) => setFormData({ ...formData, latestVersion: t })} placeholder="e.g. 1.0.2" />
          </View>
        </View>

        <Text style={styles.label}>Play Store / Download URL</Text>
        <TextInput style={styles.input} value={formData.updateUrl} onChangeText={(t) => setFormData({ ...formData, updateUrl: t })} placeholder="https://..." />

        <Text style={styles.label}>Update Message for Users</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={formData.message} onChangeText={(t) => setFormData({ ...formData, message: t })} placeholder="Enter message..." />

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Force Update</Text>
            <Text style={{ fontSize: 12, color: '#64748b' }}>If ON, users cannot skip the update.</Text>
          </View>
          <Switch value={formData.forceUpdate} onValueChange={(val) => setFormData({ ...formData, forceUpdate: val })} trackColor={{ true: '#ea580c' }} />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <>
              <Save size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#fff', padding: 16, borderRadius: 12, elevation: 2 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  formCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#1e293b', marginBottom: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  saveBtn: { flexDirection: 'row', backgroundColor: '#ea580c', paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default AppVersionManager;