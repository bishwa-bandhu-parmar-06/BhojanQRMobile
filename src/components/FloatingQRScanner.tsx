import React, { useState, useRef , useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  Dimensions,
  BackHandler
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

// @ts-ignore
import { Camera } from 'react-native-camera-kit';
import CustomModal from './CustomModal'; 

const { height, width } = Dimensions.get('window');

const FloatingQRScanner = () => {
  const navigation = useNavigation<any>();
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showInvalidQrModal, setShowInvalidQrModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  
  const isProcessing = useRef(false); 


  useEffect(() => {
    const backAction = () => {
      if (isScannerOpen) {
        setIsScannerOpen(false); 
        isProcessing.current = false;
        return true;  
      }
      return false; 
    };

    // Listener add karo
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    // Cleanup listener when component unmounts
    return () => backHandler.remove();
  }, [isScannerOpen]);


  const openScanner = async () => {
    isProcessing.current = false; 
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'BhojanQR needs access to your camera to scan menus.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        setIsScannerOpen(true);
      } else {
        setShowPermissionModal(true);
      }
    } else {
      setIsScannerOpen(true);
    }
  };

  //  FIX 1: Delay Hata Diya! Ab error instantly aayega.
  const handleInvalidQR = () => {
    setIsScannerOpen(false); // Camera instantly band
    setShowInvalidQrModal(true); // Popup instantly chalu
  };

  const onReadCode = (event: any) => {
    if (isProcessing.current) return; 
    
    isProcessing.current = true; // Lock

    const scannedUrl = event.nativeEvent.codeStringValue;

    if (scannedUrl.includes("bhojanqr") || scannedUrl.includes("menu")) {
      setIsScannerOpen(false); 
      try {
        const parts = scannedUrl.split('menu/');
        if (parts.length > 1) {
          const restOfUrl = parts[1];
          const restaurantId = restOfUrl.split('?')[0]; 
          
          navigation.navigate("GuestMenu", { restaurantId: restaurantId });
          // Note: Successful scan par lock kholne ki zaroorat nahi hai, page hi change ho jayega.
        } else {
          handleInvalidQR();
        }
      } catch (error) {
        handleInvalidQR();
      }
    } else {
      handleInvalidQR(); 
    }
  };

  return (
    <>
      {!isScannerOpen && (
        <TouchableOpacity 
          style={[styles.floatingQrButton, styles.premiumShadow]}
          onPress={openScanner}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={["#ea580c", "#c2410c"]}
            style={styles.floatingButtonGradient}
          >
            <FontAwesome5 name="qrcode" size={24} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* ERROR MODALS */}
      <CustomModal 
        visible={showPermissionModal}
        type="error"
        title="Permission Denied"
        message="Camera permission is required to scan the QR code. Please enable it in your device settings."
        confirmText="Okay"
        onConfirm={() => setShowPermissionModal(false)}
      />

      <CustomModal 
        visible={showInvalidQrModal}
        type="error"
        title="Invalid QR Code"
        message="This is not a BhojanQR. Please scan a valid restaurant menu QR code."
        confirmText="Okay"
        //  FIX 2: Jab user Okay dabaye, toh wapas lock khol do taaki dobara scan ho sake
        onConfirm={() => {
          setShowInvalidQrModal(false);
          isProcessing.current = false; 
        }}
      />

      {/* FULL SCREEN SCANNER */}
      {isScannerOpen && (
        <View style={styles.fullScreenScanner}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan BhojanQR</Text>
            <TouchableOpacity 
              style={styles.closeScannerBtn} 
              onPress={() => {
                isProcessing.current = true; 
                setIsScannerOpen(false);
              }}
            >
              <FontAwesome5 name="times" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <Camera
            style={{ flex: 1 }}
            scanBarcode={true}
            onReadCode={onReadCode}
            showFrame={true} 
            laserColor="#ea580c" 
            frameColor="#16a34a" 
            focusMode="on" //  FIX 3: Autofocus force on kiya hai taaki jaldi catch kare
          />
          
          <View style={styles.scannerFooter}>
            <Text style={styles.scannerFooterText}>Point your camera at a restaurant's BhojanQR</Text>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  premiumShadow: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 5 },
    }),
  },
  floatingQrButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    zIndex: 99,
  },
  floatingButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenScanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    backgroundColor: '#000000',
    zIndex: 9999,
    elevation: 9999,
  },
  scannerHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  scannerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeScannerBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 20,
  },
  scannerFooter: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  scannerFooterText: {
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '600',
  }
});

export default FloatingQRScanner;