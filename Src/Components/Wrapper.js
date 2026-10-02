import React from 'react';
import { StyleSheet, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BG from '../assets/images/bg.jpeg';
import { deviceHeight } from '../constants/Scaling';

const Wrapper = ({ children, style }) => {
  return (
    <ImageBackground
      source={BG}
      resizeMode="cover" 
      style={styles} 
    >
      <SafeAreaView style={[styles.safeAreaView, {...style}]}>
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
    height: deviceHeight,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Wrapper;
