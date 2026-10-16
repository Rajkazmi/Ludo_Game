import React from 'react';
import { Provider } from 'react-redux';
import { persistor, store } from './Src/redux/store';
import { PersistGate } from 'redux-persist/integration/react';
import Navigation from './Src/Navigation/Navigation';

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Navigation />
      </PersistGate>
    </Provider>
  );
};

export default App;
