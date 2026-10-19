import React, { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
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
  getSignedInUserEmail,
  isDeviceOffline,
} from '../services/authService';
import { getUserProfile } from '../services/profileService';
import { setUserProfile } from '../redux/profileSlice';

const MINIMUM_SPLASH_DURATION = 3500;
const SPLASH_BREATH_DURATION = 2500;

const SplashScreen = () => {
  const dispatch = useDispatch();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let isMounted = true;
    const splashStartedAt = Date.now();

    const resolveInitialRoute = async () => {
      let route = 'LoginScreen';
      let params;

      try {
        const networkState = await NetInfo.fetch();
        if (!isMounted) {
          return;
        }

        if (isDeviceOffline(networkState)) {
          route = 'HomeScreen';
          params = { mode: 'offline' };
        } else if (isFirebaseConfigured) {
          await auth.authStateReady();
          if (!isMounted) {
            return;
          }

          const user = auth.currentUser;
          if (user) {
            getSignedInUserEmail(user);
            const profile = await getUserProfile();
            dispatch(
              setUserProfile(
                profile ? { uid: user.uid, profile } : null,
              ),
            );
            route = profile ? 'HomeScreen' : 'ProfileSetupScreen';
            params = profile ? { mode: 'online' } : undefined;
          }
        }
      } catch (error) {
        if (auth.currentUser) {
          route = 'HomeScreen';
          params = {
            mode: 'online',
            startupError:
              error.message || 'Unable to load your saved profile.',
          };
        } else {
          params = {
            startupError:
              error.message || 'Unable to check your sign-in status.',
          };
        }
      }

      const elapsed = Date.now() - splashStartedAt;
      const remaining = Math.max(0, MINIMUM_SPLASH_DURATION - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));

      if (isMounted) {
        await resetAndNavigate(route, params);
      }
    };

    resolveInitialRoute();
    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  useEffect(() => {
    const breathAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.1,
          duration: SPLASH_BREATH_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: SPLASH_BREATH_DURATION,
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
