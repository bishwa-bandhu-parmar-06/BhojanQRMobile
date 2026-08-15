import { Vibration, TurboModuleRegistry, NativeModules } from "react-native";

// New-order alerting. Kept out of the components so the socket handler, the
// settings screen's preview button and any future trigger all go through one
// place, and so the native modules are touched from exactly one file.
//
// Both modules are NATIVE: they only exist in a binary built after they were
// installed, so on a JS-only reload of an older APK they are simply absent.
//
// Probing has to happen BEFORE the package is required. Both call
// TurboModuleRegistry.getEnforcing() at module scope, which throws an
// invariant during evaluation - and in a dev build that surfaces as a redbox
// over the whole app even when the require sits inside a try/catch, because
// Metro reports the module-init failure itself. TurboModuleRegistry.get()
// asks the same question and returns null instead of throwing, so nothing is
// required until it is known to be there.
const hasNativeModule = (name: string) => {
  try {
    return !!TurboModuleRegistry.get(name) || !!(NativeModules as any)[name];
  } catch {
    return false;
  }
};

let Sound: any = null;
let soundLoadFailed = false;

const getSoundModule = () => {
  if (Sound || soundLoadFailed) return Sound;
  if (!hasNativeModule("RNSound")) {
    soundLoadFailed = true;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-sound");
    Sound = mod?.default || mod;
    if (Sound?.setCategory) {
      // Playback category so the chime is not ducked or routed to the earpiece.
      Sound.setCategory("Playback");
    }
  } catch {
    soundLoadFailed = true;
  }
  return Sound;
};

let chime: any = null;
let chimeLoading = false;

// Loaded once and replayed. Constructing a Sound per order would mean a file
// read and decode on every alert - on a busy service that is a stutter in the
// UI thread each time an order lands.
const loadChime = () => {
  const SoundModule = getSoundModule();
  if (!SoundModule || chime || chimeLoading) return;

  chimeLoading = true;
  // android/app/src/main/res/raw/order_alert.wav - Android resolves raw
  // resources by bare name, so no extension and no directory here.
  chime = new SoundModule("order_alert", SoundModule.MAIN_BUNDLE, (error: any) => {
    chimeLoading = false;
    if (error) chime = null;
  });
};

export const isSoundAvailable = () => !!getSoundModule();

/**
 * Plays the new-order chime. Falls back to a short vibration when the audio
 * module is missing, so the alert still registers on a phone in a pocket -
 * and so the setting does something even before the native rebuild.
 */
export const playOrderAlert = () => {
  const SoundModule = getSoundModule();

  if (!SoundModule) {
    Vibration.vibrate(400);
    return;
  }

  if (!chime) {
    loadChime();
    // The very first alert arrives while the file is still decoding. Vibrate
    // for that one rather than dropping it silently.
    Vibration.vibrate(200);
    return;
  }

  // Rewind first: a chime still playing from the previous order would
  // otherwise be ignored, and two orders landing together would sound like one.
  chime.stop(() => chime.play());
};

/** Warms the audio file so the first real order is not the one that vibrates. */
export const preloadOrderAlert = () => loadChime();

// ---- Keep the screen awake -----------------------------------------------

let KeepAwake: any = null;
let keepAwakeLoadFailed = false;

const getKeepAwake = () => {
  if (KeepAwake || keepAwakeLoadFailed) return KeepAwake;
  if (!hasNativeModule("ReactNativeKCKeepAwake")) {
    keepAwakeLoadFailed = true;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@sayem314/react-native-keep-awake");
    KeepAwake = mod?.default || mod;
  } catch {
    keepAwakeLoadFailed = true;
  }
  return KeepAwake;
};

export const isKeepAwakeAvailable = () => !!getKeepAwake();

export const setKeepScreenAwake = (enabled: boolean) => {
  const mod = getKeepAwake();
  if (!mod) return false;

  try {
    if (enabled) mod.activateKeepAwake?.();
    else mod.deactivateKeepAwake?.();
    return true;
  } catch {
    return false;
  }
};
