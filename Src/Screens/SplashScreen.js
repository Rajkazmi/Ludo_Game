import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Image,
  Animated,
  ActivityIndicator,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { deviceHeight, deviceWidth } from '../constants/Scaling';
import Wrapper from '../Components/Wrapper';
import Logo from '../assets/images/logo.png';
import { resetAndNavigate } from '../helpers/NavigationUtil';
import { auth, isFirebaseConfigured } from '../config/firebase';
import {
  isDeviceOffline,
  saveSignedInUserEmail,
} from '../services/authService';

const SplashScreen = () => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let isMounted = true;

    const resolveInitialRoute = async () => {
      try {
        const networkState = await NetInfo.fetch();
        if (!isMounted) {
          return;
        }

        if (isDeviceOffline(networkState)) {
          await resetAndNavigate('HomeScreen', { mode: 'offline' });
          return;
        }

        if (!isFirebaseConfigured) {
          await resetAndNavigate('LoginScreen');
          return;
        }

        const currentUser = auth.currentUser;
        if (!currentUser) {
          await resetAndNavigate('LoginScreen');
          return;
        }

        await saveSignedInUserEmail(currentUser);
        if (isMounted) {
          await resetAndNavigate('HomeScreen', { mode: 'online' });
        }
      } catch (error) {
        if (isMounted) {
          await resetAndNavigate('LoginScreen', {
            startupError: error.message || 'Unable to check your sign-in status.',
          });
        }
      }
    };

    resolveInitialRoute();
    return () => {
      isMounted = false;
    };
  }, []);

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

    breathAnimation.start();
    return () => {
      breathAnimation.stop();
    };
  }, [scale]);

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
