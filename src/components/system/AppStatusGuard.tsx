import React, { useEffect, useRef } from 'react';
import Toast from 'react-native-toast-message';

import useNetworkStatus from '../../hooks/useNetworkStatus';
import useServerHealth from '../../hooks/useServerHealth';
import OfflineScreen from './OfflineScreen';
import ServerDownScreen from './ServerDownScreen';
import SlowNetworkBanner from './SlowNetworkBanner';
import BhojanQRLoader from '../BhojanQRLoader';

interface AppStatusGuardProps {
  children: React.ReactNode;
}

// Mirrors the website's AppStatusGuard.jsx - top-level connectivity/health
// gate wrapping the whole app:
//   1. Device offline             -> OfflineScreen (full takeover)
//   2. Online, backend unreachable -> ServerDownScreen (full takeover)
//   3. Online, slow connection     -> SlowNetworkBanner (non-blocking)
// React crashes are handled separately by ErrorBoundary, one level out.
const AppStatusGuard = ({ children }: AppStatusGuardProps) => {
  const { isOnline, isSlow, lastOnlineAt, checkNow } = useNetworkStatus();
  const { status: serverStatus, countdown, retryCount, retryNow } = useServerHealth({
    enabled: isOnline,
  });

  const wasOfflineRef = useRef(!isOnline);
  const wasServerDownRef = useRef(false);

  useEffect(() => {
    if (wasOfflineRef.current && isOnline) {
      Toast.show({ type: 'success', text1: 'Connection Restored' });
    }
    wasOfflineRef.current = !isOnline;
  }, [isOnline]);

  useEffect(() => {
    if (serverStatus === 'down') {
      wasServerDownRef.current = true;
    } else if (serverStatus === 'online' && wasServerDownRef.current) {
      Toast.show({ type: 'success', text1: 'Server Connected Successfully' });
      wasServerDownRef.current = false;
    }
  }, [serverStatus]);

  if (!isOnline) {
    return <OfflineScreen onRetry={checkNow} lastOnlineAt={lastOnlineAt} />;
  }

  if (serverStatus === 'checking') {
    return <BhojanQRLoader message="Connecting to BhojanQR..." />;
  }

  if (serverStatus === 'down') {
    return <ServerDownScreen countdown={countdown} retryCount={retryCount} onRetryNow={retryNow} />;
  }

  return (
    <>
      {isSlow && <SlowNetworkBanner />}
      {children}
    </>
  );
};

export default AppStatusGuard;
