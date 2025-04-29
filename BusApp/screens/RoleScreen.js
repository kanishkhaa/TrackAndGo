import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { UserContext } from './UserContext';

const { width } = Dimensions.get('window');

const RoleScreen = ({ navigation }) => {
  const { setUserRole } = useContext(UserContext);
  const [selectedRole, setSelectedRole] = useState(null);

  const handleRoleSelection = (role) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (selectedRole) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUserRole(selectedRole);
      navigation.replace(selectedRole === 'passenger' ? 'HomeScreen' : 'ProfileScreen');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#f8f9fa', '#e9ecef']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Your Journey Begins</Text>
            <Text style={styles.welcomeSubtext}>Choose how you'd like to travel</Text>
          </View>
          
          <View style={styles.cardsContainer}>
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'passenger' && styles.selectedCard
              ]}
              onPress={() => handleRoleSelection('passenger')}
              activeOpacity={0.9}
            >
              <View style={styles.animationContainer}>
                <LottieView
                  source={require('../assets/animations/passenger-animation.json')}
                  autoPlay
                  loop
                  style={styles.lottieAnimation}
                />
              </View>
              <Text style={[styles.roleTitle, selectedRole === 'passenger' && styles.selectedText]}>Passenger</Text>
              <Text style={styles.roleDescription}>Ready to hop on board?</Text>
              
              {selectedRole === 'passenger' && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'driver' && styles.selectedCard
              ]}
              onPress={() => handleRoleSelection('driver')}
              activeOpacity={0.9}
            >
              <View style={styles.animationContainer}>
                <LottieView
                  source={require('../assets/animations/driver-animation.json')}
                  autoPlay
                  loop
                  style={styles.lottieAnimation}
                />
              </View>
              <Text style={[styles.roleTitle, selectedRole === 'driver' && styles.selectedText]}>Driver</Text>
              <Text style={styles.roleDescription}>Take the wheel!</Text>
              
              {selectedRole === 'driver' && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[
              styles.continueButton,
              !selectedRole && styles.disabledButton
            ]}
            disabled={!selectedRole}
            onPress={handleContinue}
          >
            <LinearGradient
              colors={!selectedRole ? ['#d1d1d1', '#c0c0c0'] : ['#4361EE', '#3A56DE']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.continueButtonText}>Let's Go</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: width * 0.9,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  cardsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  roleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eaeaea',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedCard: {
    borderColor: '#4361EE',
    shadowColor: '#4361EE',
    shadowOpacity: 0.15,
    elevation: 4,
  },
  animationContainer: {
    width: 100,
    height: 100,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    textAlign: 'center',
  },
  selectedText: {
    color: '#4361EE',
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4361EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButton: {
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 24,
    gap: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RoleScreen;