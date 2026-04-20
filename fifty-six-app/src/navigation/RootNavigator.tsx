import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROUTES } from './routes';
import { useSocket } from '../hooks/useSocket';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';

import SplashScreen    from '../screens/SplashScreen';
import LoginScreen     from '../screens/LoginScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import HomeScreen      from '../screens/HomeScreen';
import ProfileScreen   from '../screens/ProfileScreen';
import CreateRoomScreen from '../screens/CreateRoomScreen';
import JoinRoomScreen  from '../screens/JoinRoomScreen';
import WaitingRoomScreen from '../screens/WaitingRoomScreen';
import DealAndBidScreen from '../screens/DealAndBidScreen';
import PlayScreen      from '../screens/PlayScreen';
import RoundSummaryScreen from '../screens/RoundSummaryScreen';
import EndGameScreen   from '../screens/EndGameScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  useSocket();
  useBackgroundMusic(); // Initialize background music

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={ROUTES.SPLASH} screenOptions={{ headerShown: false }}>
        <Stack.Screen name={ROUTES.SPLASH}        component={SplashScreen} />
        <Stack.Screen name={ROUTES.LOGIN}         component={LoginScreen} />
        <Stack.Screen name={ROUTES.PROFILE_SETUP} component={ProfileSetupScreen} />
        <Stack.Screen name={ROUTES.HOME}          component={HomeScreen} />
        <Stack.Screen name={ROUTES.PROFILE}       component={ProfileScreen} />
        <Stack.Screen name={ROUTES.CREATE_ROOM}   component={CreateRoomScreen} />
        <Stack.Screen name={ROUTES.JOIN_ROOM}     component={JoinRoomScreen} />
        <Stack.Screen name={ROUTES.WAITING_ROOM}  component={WaitingRoomScreen} />
        <Stack.Screen name={ROUTES.DEAL_AND_BID}  component={DealAndBidScreen} />
        <Stack.Screen name={ROUTES.PLAY}          component={PlayScreen} />
        <Stack.Screen name={ROUTES.ROUND_SUMMARY} component={RoundSummaryScreen} />
        <Stack.Screen name={ROUTES.END_GAME}      component={EndGameScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
