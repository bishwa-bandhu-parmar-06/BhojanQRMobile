const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: {
      // react-native-qrcode-svg only needs qrcode's pure-JS matrix encoder
      // (QRCode.create). The package's default "browser"/"main" entry points
      // pull in canvas/fs/DOM renderers that don't exist in RN, and the
      // "browser" field's value (an already-extensioned "./lib/browser.js")
      // also trips up Metro's resolver. Pointing straight at the dependency-free
      // core encoder sidesteps both problems.
      qrcode: path.resolve(__dirname, 'node_modules/qrcode/lib/core/qrcode.js'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
