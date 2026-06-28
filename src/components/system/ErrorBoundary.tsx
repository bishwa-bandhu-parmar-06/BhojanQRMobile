import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { OctagonAlert, Home, RefreshCw } from 'lucide-react-native';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Mirrors the website's ErrorBoundary.jsx - catches any uncaught
// render/lifecycle crash beneath it instead of leaving a blank screen.
// There's no RN equivalent of `window.location.reload()`, so both actions
// reset this boundary's own state, which fully remounts the tree beneath
// it (including AppNavigator, which re-lands on its dynamic initial route)
// rather than restarting the whole app process.
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React render crash caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false });
  };

  handleGoHome = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.topBar} />
            <View style={styles.iconWrap}>
              <OctagonAlert size={56} color="#f87171" strokeWidth={1.5} />
            </View>

            <Text style={styles.title}>Something went wrong.</Text>
            <Text style={styles.subtitle}>We encountered an unexpected error.</Text>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.reloadBtn} onPress={this.handleReload}>
                <RefreshCw size={18} color="#fff" />
                <Text style={styles.reloadBtnText}>Reload Application</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.homeBtn} onPress={this.handleGoHome}>
                <Home size={18} color="#374151" />
                <Text style={styles.homeBtnText}>Go Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 24, padding: 32, width: '100%', maxWidth: 420, alignItems: 'center', elevation: 4, overflow: 'hidden' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: '#f97316' },
  iconWrap: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 20, marginTop: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#1f2937', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', fontWeight: '500', textAlign: 'center' },
  actions: { width: '100%', gap: 12, marginTop: 24 },
  reloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f97316', paddingVertical: 16, borderRadius: 14 },
  reloadBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  homeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 16, borderRadius: 14 },
  homeBtnText: { color: '#374151', fontWeight: '700', fontSize: 16 },
});

export default ErrorBoundary;
