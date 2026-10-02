import { createMMKV } from 'react-native-mmkv';

// let storage = null;
// let usingFallback = false;
// const fallbackMap = new Map();

// function getStorage() {
//   if (storage) return storage;
//   if (usingFallback) return null;
//   try {
//     storage = createMMKV();
//     return storage;
//   } catch (e) {
//     // Common cause: NitroModules native module not available / new architecture not enabled
//     console.warn(
//       'react-native-mmkv: createMMKV failed. Falling back to in-memory storage.\n' +
//         'To fix this, enable the new architecture (TurboModules) and ensure react-native-nitro-modules is autolinked, then rebuild the app.'
//     );
//     console.warn(e);
//     usingFallback = true;
//     return null;
//   }
// }

const reduxStorage = {
  setItem: (key, value) => {
    storage.set(key, value);

    // const s = getStorage();
    // if (s) {
    //   try {
    //     s.set(key, value);
    //     return Promise.resolve(true);
    //   } catch (e) {
    //     console.warn('MMKV set failed, falling back to in-memory set', e);
    //   }
    // }

    // // Fallback: use Map
    // fallbackMap.set(key, value);
    return Promise.resolve(true);
  },

  getItem: key => {
    const value = storage.getString(key);
    // if (s) {
    //   try {
    //     const value = s.getString(key);
        return Promise.resolve(value);
      // } catch (e) {
      //   console.warn('MMKV get failed, falling back to in-memory get', e);
      // }
    },

  //   const value = fallbackMap.has(key) ? fallbackMap.get(key) : null;
  //   return Promise.resolve(value);
  // },

  removeItem: key => {
    // const s = getStorage();
    // if (s) {
    //   try {
    //     s.delete(key);
    //     return Promise.resolve(true);
    //   } catch (e) {
    //     console.warn('MMKV delete failed, falling back to in-memory delete', e);
    //   }
    // }

    storage.delete(key);
    return Promise.resolve();
  },
};

export default reduxStorage;
