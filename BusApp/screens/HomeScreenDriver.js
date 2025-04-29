import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIcons, Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import SidebarDriver from '../components/SidebarDriver';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');
const API_URL = 'http://192.168.11.179:3000';
const GEOAPIFY_API_KEY = '7b3757a8e0994af49ee07c57f01d616f';

const HomeScreenDriver = ({ navigation, route }) => {
  const [trip, setTrip] = useState({
    from: '',
    to: '',
    startTime: '',
    busDetails: '',
  });
  const [showMap, setShowMap] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'New route update available', read: false },
    { id: 2, text: 'Passenger waiting at next stop', read: false },
  ]);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [estimatedArrival, setEstimatedArrival] = useState('10 minutes');
  const [destinationCoords, setDestinationCoords] = useState(null);

  const mapRef = useRef(null);
  const locationSubscription = useRef(null);
  const animationRef = useRef(null);
  const driverId = route?.params?.userId || 'driver123'; // Fallback for testing

  const fetchCoordinates = async (location) => {
    try {
      const query = encodeURIComponent(`${location}, Coimbatore, India`);
      const url = `https://api.geoapify.com/v1/geocode/search?text=${query}&apiKey=${GEOAPIFY_API_KEY}&limit=1&format=json&lang=en&bias=proximity:77.7172,11.3410`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          latitude: result.lat,
          longitude: result.lon,
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching coordinates for ${location}:`, error);
      return null;
    }
  };

  const fetchAddressFromGeoapify = async (latitude, longitude) => {
    try {
      const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${GEOAPIFY_API_KEY}&format=json`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const formattedAddress = `${result.street || ''}, ${result.city || ''}, ${result.state || ''}`.trim();
        return formattedAddress || 'Unknown Address';
      }
      return 'Unknown Address';
    } catch (error) {
      console.error('Error fetching address from Geoapify:', error);
      return 'Unknown Address';
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'We need location permissions to show your current location on the map.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const newLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setCurrentLocation(newLocation);
        setMapMarkers([
          {
            coordinate: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            title: 'Your current location',
            type: 'user',
          },
        ]);

        // Use Geoapify for reverse geocoding
        const address = await fetchAddressFromGeoapify(
          location.coords.latitude,
          location.coords.longitude
        );
        setCurrentAddress(address);
        setTrip((prev) => ({ ...prev, from: address }));
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert(
          'Location Error',
          'Failed to get your current location. Please check your device settings.',
          [{ text: 'OK' }]
        );
      } finally {
        setTimeout(() => {
          setIsLoading(false);
        }, 2500);
      }
    })();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const saveTripDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          from: trip.from,
          to: trip.to,
          startTime: trip.startTime,
          busDetails: trip.busDetails,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save trip details');
      }
      return data.tripId;
    } catch (error) {
      console.error('Error saving trip details:', error);
      Alert.alert('Error', `Failed to save trip details: ${error.message}`);
      return null;
    }
  };

  const sendLocationUpdate = async (latitude, longitude) => {
    try {
      const response = await fetch(`${API_URL}/api/driver-locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          busDetails: trip.busDetails,
          latitude,
          longitude,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to send location update');
      }
    } catch (error) {
      console.error('Error sending location update:', error);
    }
  };

  const startLocationTracking = async () => {
    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          const newLocation = {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };

          setCurrentLocation(newLocation);
          setMapMarkers((prevMarkers) => {
            const updatedMarkers = [...prevMarkers];
            const userMarkerIndex = updatedMarkers.findIndex((marker) => marker.type === 'user');
            if (userMarkerIndex !== -1) {
              updatedMarkers[userMarkerIndex] = {
                ...updatedMarkers[userMarkerIndex],
                coordinate: { latitude, longitude },
              };
            }
            return updatedMarkers;
          });

          sendLocationUpdate(latitude, longitude);

          if (mapRef.current) {
            mapRef.current.animateToRegion(newLocation, 1000);
          }
        }
      );
      setIsTracking(true);
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert(
        'Tracking Error',
        'Failed to track your location. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
  };

  const handleToggleTracking = () => {
    if (isTracking) {
      stopLocationTracking();
    } else {
      startLocationTracking();
    }
  };

  const handleStartTrip = async () => {
    if (!trip.to || !trip.busDetails) {
      Alert.alert(
        'Incomplete Information',
        'Please enter your destination and bus details before starting your trip.',
        [{ text: 'OK' }]
      );
      return;
    }

    const tripId = await saveTripDetails();
    if (!tripId) return;

    const coords = await fetchCoordinates(trip.to);
    if (!coords) {
      Alert.alert(
        'Geocoding Error',
        'Could not find coordinates for the destination. Please try a different address.',
        [{ text: 'OK' }]
      );
      return;
    }

    setDestinationCoords(coords);

    if (currentLocation) {
      setMapMarkers([
        {
          coordinate: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          },
          title: trip.from || 'Start',
          type: 'user',
        },
        {
          coordinate: coords,
          title: trip.to || 'End',
          type: 'end',
        },
      ]);
    }

    setShowMap(true);
    startLocationTracking();
  };

  const handleBackToForm = () => {
    stopLocationTracking();
    setShowMap(false);
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const readAllNotifications = () => {
    setNotifications(notifications.map((notification) => ({ ...notification, read: true })));
    setNotificationsVisible(false);
  };

  const dismissNotification = (id) => {
    setNotifications(notifications.filter((notification) => notification.id !== id));
  };

  const handleRouteOptimization = () => {
    Alert.alert(
      'Route Optimization',
      'Optimizing your route based on current traffic conditions...',
      [{ text: 'OK' }]
    );
    setTimeout(() => {
      setEstimatedArrival('8 minutes');
      Alert.alert(
        'Route Optimized!',
        'We’ve found a faster route to your destination.',
        [{ text: 'Great!' }]
      );
    }, 1500);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContentContainer}>
          <View style={styles.loadingIconContainer}>
            <LottieView
              ref={animationRef}
              source={require('../assets/animations/loading.json')}
              autoPlay
              loop
              style={styles.lottieAnimation}
            />
          </View>
          <Text style={styles.loadingTitle}>Bus Tracker</Text>
          <Text style={styles.loadingText}>Getting your current location...</Text>
          <View style={styles.loadingProgressContainer}>
            <View style={styles.loadingProgress}>
              <View style={styles.loadingProgressBar} />
            </View>
          </View>
        </View>
        <View style={styles.loadingFooter}>
          <Text style={styles.loadingFooterText}>Optimizing routes for your journey</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showMap && currentLocation) {
    return (
      <SafeAreaView style={styles.fullScreenContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.mapHeader}>
          <View style={styles.mapHeaderLeftSection}>
            <TouchableOpacity style={styles.menuButtonMap} onPress={toggleSidebar}>
              <Feather name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerTitleContainer}>
            <FontAwesome5 name="bus" size={18} color="#FFFFFF" style={styles.headerIcon} />
            <Text style={styles.mapHeaderTitle}>Bus Tracker</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButtonMap}
            onPress={() => setNotificationsVisible(true)}
          >
            {notifications.filter((n) => !n.read).length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {notifications.filter((n) => !n.read).length}
                </Text>
              </View>
            )}
            <Ionicons name="notifications" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.fullScreenMap}
          initialRegion={currentLocation}
          showsUserLocation={false}
        >
          {mapMarkers.map((marker, index) => (
            <Marker
              key={index}
              coordinate={marker.coordinate}
              title={marker.title}
              pinColor={
                marker.type === 'user' ? '#1976d2' : marker.type === 'start' ? '#3B82F6' : '#EF4444'
              }
            >
              {marker.type === 'user' && (
                <View style={styles.driverMarker}>
                  <MaterialIcons name="directions-bus" size={24} color="#FFFFFF" />
                </View>
              )}
            </Marker>
          ))}
          {destinationCoords && (
            <Polyline
              coordinates={[
                { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                destinationCoords,
              ]}
              strokeColor="#3B82F6"
              strokeWidth={4}
            />
          )}
        </MapView>

        <SidebarDriver
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          navigation={navigation}
        />

        {notificationsVisible && (
          <View style={styles.notificationsPanel}>
            <View style={styles.notificationsPanelHeader}>
              <Text style={styles.notificationsPanelTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotificationsVisible(false)}>
                <MaterialIcons name="close" size={24} color="#4B5563" />
              </TouchableOpacity>
            </View>
            {notifications.length > 0 ? (
              <>
                {notifications.map((notification) => (
                  <View key={notification.id} style={styles.notificationItem}>
                    <View style={styles.notificationItemContent}>
                      <Ionicons
                        name={notification.read ? 'notifications-outline' : 'notifications'}
                        size={20}
                        color={notification.read ? '#9CA3AF' : '#1976d2'}
                      />
                      <Text
                        style={[
                          styles.notificationText,
                          notification.read && styles.notificationReadText,
                        ]}
                      >
                        {notification.text}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => dismissNotification(notification.id)}>
                      <MaterialIcons name="delete-outline" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.markAllReadButton}
                  onPress={readAllNotifications}
                >
                  <Text style={styles.markAllReadText}>Mark all as read</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.noNotificationsText}>No notifications</Text>
            )}
          </View>
        )}

        <View style={styles.tripInfoCard}>
          <Text style={styles.tripInfoTitle}>Trip Details</Text>
          <View style={styles.tripInfoRow}>
            <MaterialIcons name="location-on" size={20} color="#3B82F6" />
            <Text style={styles.tripInfoText}>From: {trip.from}</Text>
          </View>
          <View style={styles.tripInfoRow}>
            <MaterialIcons name="location-on" size={20} color="#EF4444" />
            <Text style={styles.tripInfoText}>To: {trip.to}</Text>
          </View>
          {trip.startTime && (
            <View style={styles.tripInfoRow}>
              <MaterialIcons name="access-time" size={20} color="#6B7280" />
              <Text style={styles.tripInfoText}>Time: {trip.startTime}</Text>
            </View>
          )}
          {trip.busDetails && (
            <View style={styles.tripInfoRow}>
              <MaterialIcons name="directions-bus" size={20} color="#6B7280" />
              <Text style={styles.tripInfoText}>Bus: {trip.busDetails}</Text>
            </View>
          )}
          <View style={styles.tripInfoRow}>
            <MaterialIcons name="schedule" size={20} color="#10B981" />
            <Text style={styles.tripInfoText}>ETA: {estimatedArrival}</Text>
            <TouchableOpacity onPress={handleRouteOptimization}>
              <MaterialIcons name="refresh" size={20} color="#3B82F6" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.trackingButton,
              isTracking ? styles.trackingActiveButton : styles.trackingInactiveButton,
            ]}
            onPress={handleToggleTracking}
          >
            <Text style={styles.trackingButtonText}>
              {isTracking ? 'Stop Sharing Location' : 'Share Location'}
            </Text>
            {isTracking ? (
              <MaterialIcons name="location-off" size={20} color="#FFFFFF" />
            ) : (
              <MaterialIcons name="my-location" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToForm}>
            <Text style={styles.backButtonText}>Back to Trip Form</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeftSection}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <Feather name="menu" size={24} color="#1976d2" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerTitleContainer}>
          <FontAwesome5 name="bus" size={18} color="#1976d2" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Bus Tracker</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => setNotificationsVisible(true)}
        >
          {notifications.filter((n) => !n.read).length > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {notifications.filter((n) => !n.read).length}
              </Text>
            </View>
          )}
          <Ionicons name="notifications" size={22} color="#1976d2" />
        </TouchableOpacity>
      </View>

      <SidebarDriver
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        navigation={navigation}
      />

      {notificationsVisible && (
        <View style={styles.notificationsPanel}>
          <View style={styles.notificationsPanelHeader}>
            <Text style={styles.notificationsPanelTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => setNotificationsVisible(false)}>
              <MaterialIcons name="close" size={24} color="#4B5563" />
            </TouchableOpacity>
          </View>
          {notifications.length > 0 ? (
            <>
              {notifications.map((notification) => (
                <View key={notification.id} style={styles.notificationItem}>
                  <View style={styles.notificationItemContent}>
                    <Ionicons
                      name={notification.read ? 'notifications-outline' : 'notifications'}
                      size={20}
                      color={notification.read ? '#9CA3AF' : '#1976d2'}
                    />
                    <Text
                      style={[
                        styles.notificationText,
                        notification.read && styles.notificationReadText,
                      ]}
                    >
                      {notification.text}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => dismissNotification(notification.id)}>
                    <MaterialIcons name="delete-outline" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.markAllReadButton}
                onPress={readAllNotifications}
              >
                <Text style={styles.markAllReadText}>Mark all as read</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.noNotificationsText}>No notifications</Text>
          )}
        </View>
      )}

      <View style={styles.mainContent}>
        <Text style={styles.title}>Plan Your Trip</Text>
        <Text style={styles.subtitle}>
          Complete the details below to start sharing your location
        </Text>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <MaterialIcons name="location-on" size={24} color="#3B82F6" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="From (Current Location)"
              placeholderTextColor="#9CA3AF"
              value={trip.from}
              onChangeText={(text) => setTrip({ ...trip, from: text })}
              editable={false}
            />
            <View style={styles.currentLocationBadge}>
              <Text style={styles.currentLocationText}>Current</Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="location-on" size={24} color="#EF4444" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="To"
              placeholderTextColor="#9CA3AF"
              value={trip.to}
              onChangeText={(text) => setTrip({ ...trip, to: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="access-time" size={24} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Start Time (e.g., 10:00 AM)"
              placeholderTextColor="#9CA3AF"
              value={trip.startTime}
              onChangeText={(text) => setTrip({ ...trip, startTime: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="directions-bus" size={24} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Bus Details (Route/Number)"
              placeholderTextColor="#9CA3AF"
              value={trip.busDetails}
              onChangeText={(text) => setTrip({ ...trip, busDetails: text })}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.startButton} onPress={handleStartTrip}>
          <Text style={styles.buttonText}>Start Trip</Text>
          <MaterialIcons name="navigation" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingContentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#0d47a1',
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  lottieAnimation: {
    width: 100,
    height: 100,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 32,
  },
  loadingProgressContainer: {
    width: 240,
    alignItems: 'center',
  },
  loadingProgress: {
    height: 6,
    width: '100%',
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  loadingProgressBar: {
    height: '100%',
    width: '75%',
    backgroundColor: '#1976d2',
    borderRadius: 4,
  },
  loadingFooter: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  loadingFooterText: {
    color: '#6B7280',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerLeftSection: {
    width: 32,
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
    color: '#1F2937',
  },
  menuButton: {
    padding: 4,
  },
  notificationButton: {
    position: 'relative',
    padding: 4,
    width: 32,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    height: '100%',
  },
  currentLocationBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentLocationText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  fullScreenMap: {
    ...StyleSheet.absoluteFillObject,
  },
  mapHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
  },
  mapHeaderLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  menuButtonMap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationButtonMap: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripInfoCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  tripInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  tripInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripInfoText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
    marginLeft: 8,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  trackingActiveButton: {
    backgroundColor: '#EF4444',
  },
  trackingInactiveButton: {
    backgroundColor: '#10B981',
  },
  trackingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
    backgroundColor: '#6B7280',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  notificationsPanel: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 100,
  },
  notificationsPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  notificationsPanelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notificationItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
    marginLeft: 8,
  },
  notificationReadText: {
    opacity: 0.6,
  },
  markAllReadButton: {
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  markAllReadText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  noNotificationsText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 12,
  },
  driverMarker: {
    backgroundColor: '#1976d2',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

export default HomeScreenDriver;