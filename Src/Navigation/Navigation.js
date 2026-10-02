import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LudoBoardScreen from '../Screens/LudoBoardScreen';
import SplashScreen from '../Screens/SplashScreen'; 
import HomeScreen from '../Screens/HomeScreen';

export const NavigationRef = createNavigationContainerRef();

const Stack = createNativeStackNavigator();

const Navigation = () => {
  return (
    <NavigationContainer ref={NavigationRef}>
      <Stack.Navigator
        initialRouteName="SplashScreen"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="SplashScreen" component={SplashScreen} />

        <Stack.Screen
          name="LudoBoardScreen"
          component={LudoBoardScreen}
          options={{
            animation: 'fade',
          }}
        />

        <Stack.Screen
          name="HomeScreen"
          component={HomeScreen}
          options={{ 
            animation: 'fade',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
