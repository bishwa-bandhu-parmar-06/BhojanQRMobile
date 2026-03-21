import React, { useEffect, useState } from 'react';
import { View, Linking, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import CustomModal from './CustomModal';
import { getAppVersion } from '../API/versionApi';
interface Props {
  children: React.ReactNode;
}

const VersionCheckWrapper: React.FC<Props> = ({ children }) => {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [updateData, setUpdateData] = useState<any>(null);

  //  Version Compare Function
  const isUpdateRequired = (current: string, minimum: string) => {
    const cParts = current.split('.').map(Number);
    const mParts = minimum.split('.').map(Number);
    
    const maxLength = Math.max(cParts.length, mParts.length);

    for (let i = 0; i < maxLength; i++) {
      const cVal = cParts[i] || 0; 
      const mVal = mParts[i] || 0;

      if (cVal < mVal) return true;  
      if (cVal > mVal) return false;
    }
    return false; 
  };

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await getAppVersion(); 
        
        if (response.data?.success && response.data?.data) {
          const config = response.data.data;
          const currentAppVersion = DeviceInfo.getVersion();

          if (isUpdateRequired(currentAppVersion, config.minVersion)) {
            setUpdateData(config);
            setNeedsUpdate(true);
          }
        }
      } catch (error) {
        console.log("Version API failed, skipping check...", error);
      }
    };

    checkVersion();
  }, []);

  return (
    <>
      {children}
      
      {/* Permanent Popup jo back dabane par bhi nahi hatega */}
      <CustomModal
        visible={needsUpdate}
        type="error"
        title="Update Required!"
        message={updateData?.message || "Please update the app to the latest version to continue using BhojanQR."}
        confirmText="Update Now"
        onConfirm={() => {
          if (updateData?.updateUrl) {
            Linking.openURL(updateData.updateUrl);
          }
        }}
      />
    </>
  );
};

export default VersionCheckWrapper;