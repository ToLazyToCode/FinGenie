const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force axios to use browser build instead of Node.js build
// This prevents Node.js module import errors
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'axios') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/axios/dist/browser/axios.cjs'),
      type: 'sourceFile',
    };
  }
  // Force lucide-react to use CJS build (ESM entry fails Metro resolution)
  if (moduleName === 'lucide-react') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/lucide-react/dist/cjs/lucide-react.js'),
      type: 'sourceFile',
    };
  }
  // Fallback to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

// Resolve Node.js built-in modules that some packages try to use
config.resolver.extraNodeModules = {
  crypto: path.resolve(__dirname, 'src/polyfills/crypto.js'),
  url: path.resolve(__dirname, 'src/polyfills/url.js'),
};

module.exports = config;
