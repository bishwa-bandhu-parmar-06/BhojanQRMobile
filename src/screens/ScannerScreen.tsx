import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ScannerScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Camera / Scanner will go here!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  title: { fontSize: 20, color: '#fff' }
});

export default ScannerScreen;