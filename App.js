import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { persistor, store } from './Src/redux/store';
import { PersistGate } from 'redux-persist/integration/react';
import Navigation from './Src/Navigation/Navigation';
import { View, ActivityIndicator } from 'react-native';

const App = () => {
  //useEffect(() => {
    // eslint-disable-next-line no-console
  //   console.log('APP mounted. store/persistor:', !!store, !!persistor);
  // }, []);

  return (
    <Provider store={store}>
      <PersistGate
        loading={null
          // <View style={{flex:1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center'}}>
          //    <ActivityIndicator size="large" color="white" />
          // </View>
        }
        persistor={persistor}
      >
        <Navigation />
      </PersistGate>
    </Provider>
  );
};

export default App;
