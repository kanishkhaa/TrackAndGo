import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import LottieView from 'lottie-react-native';
import Sidebar from '../components/Sidebar';

const { width, height } = Dimensions.get('window');

const JourneyPlannerScreen = () => {
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [journeyPlan, setJourneyPlan] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('journey');
  const [trackingJourney, setTrackingJourney] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Simulate getting current location
    setCurrentLocation({
      latitude: 11.3410,
      longitude: 77.7172,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    });

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleMenuItemPress = (menuItem) => {
    setActiveMenuItem(menuItem);
    setSidebarVisible(false);
  };

  const handleSignOut = () => {
    setSidebarVisible(false);
  };

  const planJourney = () => {
    if (fromLocation.toLowerCase().includes('bit') && toLocation.toLowerCase().includes('namakkal')) {
      setJourneyPlan({
        segments: [
          {
            from: 'BIT College',
            to: 'Sathyamangalam',
            busNumber: 'S12',
            type: 'Express',
            duration: '30 min',
            eta: '8:30 AM',
            coordinates: [
              { latitude: 11.3410, longitude: 77.7172 },
              { latitude: 11.4522, longitude: 77.6937 },
            ],
          },
          {
            from: 'Sathyamangalam',
            to: 'Erode',
            busNumber: 'E45',
            type: 'Local',
            duration: '45 min',
            eta: '9:15 AM',
            coordinates: [
              { latitude: 11.4522, longitude: 77.6937 },
              { latitude: 11.3410, longitude: 77.7172 },
            ],
          },
          {
            from: 'Erode',
            to: 'Namakkal',
            busNumber: 'N78',
            type: 'Express',
            duration: '1 hr',
            eta: '10:15 AM',
            coordinates: [
              { latitude: 11.3410, longitude: 77.7172 },
              { latitude: 11.2213, longitude: 78.1677 },
            ],
          },
        ],
        totalDuration: '2 hr 15 min',
        transfers: 2,
      });
    }
  };

  const startJourney = () => {
    setTrackingJourney(true);
    setShowStartScreen(false);
  };

  const renderStartScreen = () => (
    <Animated.View style={[styles.startScreen, { opacity: fadeAnim }]}>
      <LottieView
        source={require('../assets/animations/journey.json')}
        autoPlay
        loop
        style={styles.animation}
      />
      <Text style={styles.quote}>
        "Every journey begins with a single step – let’s make yours smoother."
      </Text>
      <TouchableOpacity style={styles.startButton} onPress={() => setShowStartScreen(false)}>
        <Text style={styles.startButtonText}>Start Planning</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderPlanner = () => (
    <View style={styles.plannerContainer}>
      <View style={styles.inputContainer}>
        <MaterialIcons name="my-location" size={20} color="#777" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="From: Starting Point"
          value={fromLocation}
          onChangeText={setFromLocation}
        />
      </View>
      <View style={styles.inputContainer}>
        <MaterialIcons name="location-on" size={20} color="#777" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="To: Destination"
          value={toLocation}
          onChangeText={setToLocation}
        />
      </View>
      <TouchableOpacity
        style={styles.searchButton}
        onPress={planJourney}
        disabled={!fromLocation || !toLocation}
      >
        <Text style={styles.searchButtonText}>Plan Journey</Text>
        <MaterialIcons name="directions-bus" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderJourneyPlan = () => (
    <View style={styles.journeyContainer}>
      <ScrollView style={styles.roadmap}>
        {journeyPlan.segments.map((segment, index) => (
          <View key={index} style={styles.segment}>
            <View style={styles.segmentHeader}>
              <Text style={styles.segmentTitle}>
                {segment.from} → {segment.to}
              </Text>
              <Text style={styles.busNumber}>Bus {segment.busNumber}</Text>
            </View>
            <Text style={styles.segmentInfo}>Type: {segment.type}</Text>
            <Text style={styles.segmentInfo}>Duration: {segment.duration}</Text>
            <Text style={styles.segmentInfo}>ETA: {segment.eta}</Text>
            {index < journeyPlan.segments.length - 1 && (
              <Text style={styles.waitingTime}>Waiting: ~10 min</Text>
            )}
          </View>
        ))}
      </ScrollView>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Total Duration: {journeyPlan.totalDuration}
        </Text>
        <Text style={styles.summaryText}>Transfers: {journeyPlan.transfers}</Text>
      </View>
      {!trackingJourney && (
        <TouchableOpacity style={styles.startJourneyButton} onPress={startJourney}>
          <Text style={styles.startJourneyButtonText}>Let's Start the Journey</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
          <Feather name="menu" size={24} color="#1976d2" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <FontAwesome5 name="bus" size={18} color="#1976d2" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Journey Planner</Text>
        </View>
        <View style={styles.notificationButton} />
      </View>

      {showStartScreen && renderStartScreen()}

      {!showStartScreen && !journeyPlan && !trackingJourney && renderPlanner()}

      {journeyPlan && !trackingJourney && renderJourneyPlan()}

      {trackingJourney && (
        <View style={styles.mapContainer}>
          {currentLocation && (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={currentLocation}
              showsUserLocation={true}
            >
              {journeyPlan.segments.map((segment, index) => (
                <React.Fragment key={index}>
                  <Polyline
                    coordinates={segment.coordinates}
                    strokeColor="#1976d2"
                    strokeWidth={4}
                  />
                  <Marker
                    coordinate={segment.coordinates[0]}
                    title={segment.from}
                  />
                  <Marker
                    coordinate={segment.coordinates[1]}
                    title={segment.to}
                  />
                </React.Fragment>
              ))}
            </MapView>
          )}
          <View style={styles.trackingOverlay}>
            <Text style={styles.trackingTitle}>Tracking Your Journey</Text>
            <Text style={styles.currentSegment}>
              Current: {journeyPlan.segments[0].from} → {journeyPlan.segments[0].to}
            </Text>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => {
                setTrackingJourney(false);
                setJourneyPlan(null);
                setShowStartScreen(true);
              }}
            >
              <Text style={styles.completeButtonText}>Complete Journey</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Sidebar
        visible={sidebarVisible}
        activeMenuItem={activeMenuItem}
        onClose={toggleSidebar}
        onMenuItemPress={handleMenuItemPress}
        onSignOut={handleSignOut}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    elevation: 2,
    zIndex: 10,
  },
  menuButton: {
    padding: 5,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationButton: {
    width: 24,
  },
  startScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  animation: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  quote: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  startButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  plannerContainer: {
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 45,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#1976d2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    opacity: 1,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10,
  },
  journeyContainer: {
    flex: 1,
  },
  roadmap: {
    flex: 1,
    padding: 20,
  },
  segment: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 2,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  segmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  busNumber: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  segmentInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  waitingTime: {
    fontSize: 14,
    color: '#FF9800',
    marginTop: 10,
  },
  summary: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  startJourneyButton: {
    backgroundColor: '#1976d2',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  startJourneyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  trackingOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    elevation: 5,
  },
  trackingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  currentSegment: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default JourneyPlannerScreen;