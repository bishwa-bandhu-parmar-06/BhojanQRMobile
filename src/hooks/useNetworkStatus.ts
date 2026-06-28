import { useCallback, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

// RN's analogue of the website's Network Information API check (no
// effectiveType on native, but cellularGeneration on the 'cellular' type
// gets us the same "warn on 2g" signal).
const isSlowConnection = (state: { type: string; details: any }) =>
  state.type === 'cellular' && state.details?.cellularGeneration === '2g';

// Tracks device-level connectivity (WiFi/mobile data) plus a coarse
// "slow connection" flag - mirrors the website's useNetworkStatus.js.
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(null);
  const [isSlow, setIsSlow] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = !!state.isConnected;
      setIsOnline(online);
      setIsSlow(isSlowConnection(state as any));
      if (online) setLastOnlineAt(Date.now());
      initialized.current = true;
    });

    NetInfo.fetch().then(state => {
      if (initialized.current) return;
      const online = !!state.isConnected;
      setIsOnline(online);
      setIsSlow(isSlowConnection(state as any));
      if (online) setLastOnlineAt(Date.now());
    });

    return () => unsubscribe();
  }, []);

  const checkNow = useCallback(async () => {
    const state = await NetInfo.fetch();
    const online = !!state.isConnected;
    setIsOnline(online);
    setIsSlow(isSlowConnection(state as any));
    if (online) setLastOnlineAt(Date.now());
    return online;
  }, []);

  return { isOnline, lastOnlineAt, isSlow, checkNow };
}

export default useNetworkStatus;
