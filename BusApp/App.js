import 'react-native-gesture-handler';
import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import JourneyPlannerScreen from './screens/JourneyPlannerScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import RoleScreen from './screens/RoleScreen';
import HomeScreen from './screens/HomeScreen';
import LostFoundScreen from './screens/LostFoundScreen';
import ProfileScreen from './screens/ProfileScreen';
import RoutesScreen from './screens/RoutesScreen';
import HomeScreenDriver from './screens/HomeScreenDriver';

import { UserProvider } from './screens/UserContext';
import LostFoundDriver from './screens/LostFoundDriverScreen';
import ChatbotScreen from './screens/ChatbotScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <UserProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Onboarding" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="RoleScreen" component={RoleScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen name="HomeScreen" component={HomeScreen} />
          <Stack.Screen name="JourneyPlannerScreen" component={JourneyPlannerScreen} />
          <Stack.Screen name="LostFoundScreen" component={LostFoundScreen} />
          <Stack.Screen name="RoutesScreen" component={RoutesScreen} />
          <Stack.Screen name="HomeScreenDriver" component={HomeScreenDriver} />
          <Stack.Screen name="LostFoundDriver" component={LostFoundDriver} />
          <Stack.Screen name="ChatbotScreen" component={ChatbotScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </UserProvider>
  );
}