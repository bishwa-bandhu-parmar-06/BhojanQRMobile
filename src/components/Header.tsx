import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Menu } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

// 1. Import Redux hooks to check login status
import { useSelector } from 'react-redux';

const Header = () => {
  const navigation = useNavigation<any>();

  // 2. Pull the auth state from Redux
  const { isAuthenticated, user } = useSelector((state: any) => state.auth);

  const [tapCount, setTapCount] = useState(0);
  const [lastTap, setLastTap] = useState(0);

  const handleLogoTap = () => {
    const now = Date.now();

    // If taps are less than 1 second apart
    if (now - lastTap < 1000) {
      const newTapCount = tapCount + 1;
      setTapCount(newTapCount);

      // Trigger on exactly 5 consecutive taps
      if (newTapCount === 5) {
        setTapCount(0); // Reset the counter
        
        // 3. Check if the user is already logged in as an admin
        if (isAuthenticated && user?.role === 'admin') {
          Toast.show({
            type: 'info',
            text1: 'Admin Access Active',
            text2: 'You are already logged in to the control center.',
          });
        } else {
          // If not logged in as admin, navigate to the secret login screen
          navigation.navigate('AdminAuth'); 
        }
      }
    } else {
      // If they waited too long between taps, reset the count to 1
      setTapCount(1);
    }

    setLastTap(now);
  };

  return (
    <View style={styles.headerContainer}>
      
      {/* LEFT: Logo Image */}
      <TouchableOpacity onPress={handleLogoTap} activeOpacity={0.8}>
        <View style={styles.logoContainer}>
          <Image 
            source={require("../assets/logo.png")}
            style={styles.logoImage}
          />
        </View>
      </TouchableOpacity>

      {/* RIGHT: Menu Button */}
      <TouchableOpacity 
        onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        style={styles.menuButton}
      >
        <Menu color="#333" size={26} />
      </TouchableOpacity>

    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  headerContainer: {
    height: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  menuButton: {
    padding: 5,
  },
});