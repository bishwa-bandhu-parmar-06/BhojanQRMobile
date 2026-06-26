// Mirrors the website's client/src/API/axiosInstance.js pattern
// (`import.meta.env.DEV ? "http://localhost:3000/api" : "/api"`) - same idea,
// same "localhost" address, zero manual switching between machines.
//
// On web, "localhost" works in dev because the browser and the dev server
// are the same machine. A phone is a separate device, so "localhost" would
// normally mean the phone itself - `adb reverse tcp:3000 tcp:3000` (wired up
// in package.json's "android" script) forwards the phone's localhost:3000
// to this computer's localhost:3000 over the USB cable, so the address can
// stay literally "localhost" just like the website.
//
// __DEV__ is RN's built-in equivalent of Vite's import.meta.env.DEV: true
// for debug builds, false for release builds - set automatically, no env
// file needed.
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://bhojanqr.com/api';

export const SOCKET_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://bhojanqr.com';

export const RAZORPAY_KEY = 'rzp_test_JM1WaEQuOzhIpS';
