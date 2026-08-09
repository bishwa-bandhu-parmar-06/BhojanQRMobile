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
// Flip this to true to point a DEBUG build at the live production API instead
// of the backend on this machine - handy for testing on a phone without
// starting the local server. Release builds ignore it completely and always
// use production, so leaving it flipped can never ship to users.
const USE_PRODUCTION_API_IN_DEV = false;

const DEV_HOST = 'http://localhost:3000';
const PROD_HOST = 'https://bhojanqr.com';

const HOST = !__DEV__ || USE_PRODUCTION_API_IN_DEV ? PROD_HOST : DEV_HOST;

export const API_BASE_URL = `${HOST}/api`;

export const SOCKET_URL = HOST;

export const RAZORPAY_KEY = 'rzp_test_JM1WaEQuOzhIpS';

// Same Google Cloud OAuth "Web application" client used by the website
// (server's GOOGLE_CLIENT_ID env var) - the backend verifies every Google
// ID token's `aud` claim against this exact value (customerController.js's
// googleAuth), so the mobile app must request ID tokens for this same
// client rather than a separate one. Web Client IDs are not secret - Google
// documents embedding them directly in client app code.
export const GOOGLE_WEB_CLIENT_ID =
  '44325942288-atfvtvq19qq38p32s72etgtteopvlb34.apps.googleusercontent.com';
