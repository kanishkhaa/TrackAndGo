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
  const [movementStatus, setMovementStatus] = useState('Stationary');
  const [locationHistory, setLocationHistory] = useState([]);

  const mapRef = useRef(null);
  const locationSubscription = useRef(null);
  const animationRef = useRef(null);
  const driverId = route?.params?.userId || 'driver123';

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
        setLocationHistory([{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }]);

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

  const checkLocationServices = async () => {
    const isEnabled = await Location.hasServicesEnabledAsync();
    if (!isEnabled) {
      Alert.alert(
        'Location Services Disabled',
        'Please enable location services on your device to share your location.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Location permission is required to share your location.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const saveTripDetails = async () => {
    try {
      const normalizedBusDetails = `BUS_${trip.busDetails.trim().toUpperCase()}`; // Normalize
      const response = await fetch(`${API_URL}/api/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          from: trip.from,
          to: trip.to,
          startTime: trip.startTime,
          busDetails: normalizedBusDetails,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save trip details');
      }
      // Update trip state with normalized busDetails
      setTrip((prev) => ({ ...prev, busDetails: normalizedBusDetails }));
      return data.tripId;
    } catch (error) {
      console.error('Error saving trip details:', error);
      Alert.alert('Error', `Failed to save trip details: ${error.message}`);
      return null;
    }
  };

  const sendLocationUpdate = async (latitude, longitude) => {
    try {
      console.log(`Sending location for busDetails: ${trip.busDetails}`);
      const response = await fetch(`${API_URL}/api/driver-locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          busDetails: trip.busDetails, // Use normalized busDetails from state
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
      // Optionally show an alert for persistent errors
    }
  };

  const startLocationTracking = async () => {
    const servicesEnabled = await checkLocationServices();
    if (!servicesEnabled) return;

    const permissionGranted = await requestLocationPermission();
    if (!permissionGranted) return;

    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const { latitude, longitude, speed } = location.coords;
          const newLocation = {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };

          setMovementStatus(speed > 0.5 ? 'Moving' : 'Stationary');

          setCurrentLocation(newLocation);
          setMapMarkers((prevMarkers) => {
            const updatedMarkers = [...prevMarkers];
            const userMarkerIndex = updatedMarkers.findIndex((marker) => marker.type === 'user');
            if (userMarkerIndex !== -1) {
              updatedMarkers[userMarkerIndex] = {
                ...updatedMarkers[userMarkerIndex],
                coordinate: { latitude, longitude },
                title: `Bus ${trip.busDetails} (${movementStatus})`,
              };
            }
            return updatedMarkers;
          });

          setLocationHistory((prev) => {
            const newHistory = [...prev, { latitude, longitude }];
            return newHistory.slice(-50);
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
    setMovementStatus('Stationary');
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
          title: `Bus ${trip.busDetails} (${movementStatus})`,
          type: 'user',
        },
        {
          coordinate: coords,
          title: trip.to || 'End',
          type: 'end',
        },
      ]);
      setLocationHistory([{
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      }]);
    }

    setShowMap(true);
    startLocationTracking();
  };

  const handleBackToForm = () => {
    stopLocationTracking();
    setShowMap(false);
    setLocationHistory([]);
    setMapMarkers([]);
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
          {locationHistory.length > 1 && (
            <Polyline
              coordinates={locationHistory}
              strokeColor="#3B82F6"
              strokeWidth={4}
            />
          )}
          {destinationCoords && (
            <Polyline
              coordinates={[
                { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                destinationCoords,
              ]}
              strokeColor="#EF4444"
              strokeWidth={4}
              lineDashPattern={[10, 10]}
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
            <MaterialIcons name="directions" size={20} color="#10B981" />
            <Text style={styles.tripInfoText}>Status: {movementStatus}</Text>
          </View>
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
              placeholder="Bus Details (e.g., 1A, 42)"
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
    borderRadius: 3,
    overflow: 'hidden',
  },
  loadingProgressBar: {
    width: '60%',
    height: '100%',
    backgroundColor: '#1976d2',
  },
  loadingFooter: {
    position: 'absolute',
    bottom: 20,
    alignItems: 'center',
  },
  loadingFooterText: {
    fontSize: 14,
    color: '#6B7280',
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
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
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
    padding: 5,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#F44336',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#1F2937',
  },
  currentLocationBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  currentLocationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  startButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10,
  },
  fullScreenContainer: {
    flex: 1,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#1976d2',
    elevation: 2,
    zIndex: 10,
  },
  menuButtonMap: {
    padding: 5,
  },
  mapHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  notificationButtonMap: {
    padding: 5,
    position: 'relative',
  },
  fullScreenMap: {
    flex: 1,
  },
  tripInfoCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tripInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  tripInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripInfoText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 10,
  },
  trackingButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  trackingActiveButton: {
    backgroundColor: '#EF4444',
  },
  trackingInactiveButton: {
    backgroundColor: '#1976d2',
  },
  trackingButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10,
  },
  backButton: {
    backgroundColor: '#F3F4F6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    color: '#1F2937',
    fontWeight: 'bold',
    fontSize: 16,
  },
  notificationsPanel: {
    position: 'absolute',
    top: 80,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: width * 0.8,
    maxHeight: height * 0.4,
  },
  notificationsPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  notificationsPanelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  notificationItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 10,
  },
  notificationReadText: {
    color: '#9CA3AF',
  },
  markAllReadButton: {
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  markAllReadText: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  noNotificationsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    padding: 10,
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