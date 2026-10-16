import React from 'react';
import { StyleSheet, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BG from '../assets/images/bg.png';

const Wrapper = ({ children, style }) => {
  return (
    <ImageBackground
      source={BG}
      resizeMode="cover"
      style={styles.container}
    >
      <SafeAreaView style={[styles.safeAreaView, style]}>
        {children}
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',  
  },
  safeAreaView: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Wrapper;
