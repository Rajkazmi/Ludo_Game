import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { deviceHeight, deviceWidth } from '../constants/Scaling';
import Wrapper from '../Components/Wrapper';
import Logo from '../assets/images/logo.png';
import { prepareNavigation, resetAndNavigate } from '../helpers/NavigationUtil';

const SplashScreen = ({ navigation }) => {
  const [isStop] = useState(false);
  const scale = new Animated.Value(1)

  useEffect(() => {
    prepareNavigation();
    setTimeout(() => {
      resetAndNavigate('HomeScreen');}, 1500);}, []);

    //   setIsStop(true);
    //   if (navigation && typeof navigation.reset === 'function') {
    //     navigation.reset({
    //       index: 0,
    //       routes: [{ name: 'HomeScreen' }],
    //     });
    //   }
    // }, 2000);
  //   return () => clearTimeout(timeout);
  // }, [navigation]);

  useEffect(() => {
    const breathAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    
    if (!isStop) {
      breathAnimation.start();
    };
    // } else {
    //   breathAnimation.stop();
    // }
    
    return () => {
      breathAnimation.stop();
    };
  }, [isStop]);

  return (
    <Wrapper>
      <Animated.View style={[styles.imgContainer, { transform: [{ scale }] }]}>
        <Image 
          source={Logo} 
          style={styles.img} 
        />
      </Animated.View>

      <ActivityIndicator color="white" style={styles.activityIndicator} />
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  imgContainer: {
    width: deviceWidth * 0.7,
    height: deviceHeight * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  img: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  activityIndicator: {
    marginTop: 20,
  },
});

export default SplashScreen;
