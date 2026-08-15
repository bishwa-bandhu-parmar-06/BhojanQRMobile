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

// "localhost" only resolves because `adb reverse` (see package.json's
// "android" script) tunnels the phone's port 3000 to this machine's over the
// USB cable. That tunnel does not exist for wireless debugging, for a second
// device sharing the same Metro server, or for a physical iPhone - there,
// requests silently fail with a network error and nothing says why.
//
// For those cases put this machine's LAN address here (ipconfig -> IPv4, e.g.
// 'http://192.168.1.7:3000') and the tunnel is no longer needed; the phone
// reaches the dev server directly over WiFi. Leave it empty to use the USB
// tunnel, which needs no per-machine configuration and is the default.
//
// Plain http:// works for both only because AndroidManifest.xml currently
// sets android:usesCleartextTraffic="true" app-wide. Neither dev address can
// ever be reached from a release build (HOST is the https:// production host
// below whenever __DEV__ is false), so that flag should be narrowed to debug
// builds via a network security config rather than shipped as-is.
const DEV_LAN_HOST = '';

const DEV_HOST = DEV_LAN_HOST || 'http://localhost:3000';
const PROD_HOST = 'https://bhojanqr.com';

const HOST = !__DEV__ || USE_PRODUCTION_API_IN_DEV ? PROD_HOST : DEV_HOST;

export const API_BASE_URL = `${HOST}/api`;

export const SOCKET_URL = HOST;

export const RAZORPAY_KEY = 'rzp_test_JM1WaEQuOzhIpS';

// GOOGLE_WEB_CLIENT_ID lived here for "Continue with Google" on the customer
// login. That login is gone, and restaurant/staff/admin all sign in with
// email + password, so nothing requests a Google ID token any more. The
// website still uses the same OAuth client via its own VITE_GOOGLE_CLIENT_ID,
// and the server still verifies against GOOGLE_CLIENT_ID - neither is
// affected by dropping it here.
