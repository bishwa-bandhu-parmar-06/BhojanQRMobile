import * as Keychain from 'react-native-keychain';

const SERVICE = 'bhojanqr.auth.token';

// In-memory cache so the axios request interceptor never has to await a
// Keychain read on every single API call - only on app boot and right after
// login/logout do we touch the native module.
let cachedToken: string | null = null;

export const setToken = async (token: string): Promise<void> => {
  cachedToken = token;
  await Keychain.setGenericPassword('bhojanqr', token, { service: SERVICE });
};

export const getToken = (): string | null => cachedToken;

// Call once on app boot to warm the in-memory cache from secure storage.
export const loadToken = async (): Promise<string | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({ service: SERVICE });
    cachedToken = credentials ? credentials.password : null;
  } catch {
    cachedToken = null;
  }
  return cachedToken;
};

export const clearToken = async (): Promise<void> => {
  cachedToken = null;
  await Keychain.resetGenericPassword({ service: SERVICE });
};
