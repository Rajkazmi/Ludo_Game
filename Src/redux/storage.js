import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV();

const reduxStorage = {
  setItem: (key, value) => {
    storage.set(key, value);

    return Promise.resolve(true);
  },

  getItem: key => {
    const value = storage.getString(key);
    return Promise.resolve(value ?? null);
  },
  removeItem: key => {
    storage.delete(key);
    return Promise.resolve();
  },
};

export default reduxStorage;
