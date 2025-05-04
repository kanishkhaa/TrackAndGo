import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  FlatList,
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
    routeNumber: '',
    crowdness: '',
    startTime: '',
  });
  const [showMap, setShowMap] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [movementStatus, setMovementStatus] = useState('Stationary');
  const [locationHistory, setLocationHistory] = useState([]);
  const [routeSuggestions, setRouteSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const mapRef = useRef(null);
  const locationSubscription = useRef(null);
  const animationRef = useRef(null);
  const driverId = route?.params?.userId || 'driver123';
  const lastMovementUpdate = useRef(Date.now());

  const fetchAddressFromGeoapify = async (latitude, longitude) => {
    try {
      const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${GEOAPIFY_API_KEY}&format=json`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return `${result.street || ''}, ${result.city || ''}, ${result.state || ''}`.trim() || 'Unknown Address';
      }
      return 'Unknown Address';
    } catch (error) {
      console.error('Error fetching address:', error);
      return 'Unknown Address';
    }
  };

  const fetchRouteSuggestions = async (query) => {
    try {
      const response = await fetch(`${API_URL}/api/bus-routes`);
      const routes = await response.json();
      const filteredRoutes = routes.filter((route) =>
        route.route_number.toLowerCase().includes(query.toLowerCase())
      );
      setRouteSuggestions(filteredRoutes);
      setShowSuggestions(query.length > 0);
    } catch (error) {
      console.error('Error fetching route suggestions:', error);
      Alert.alert('Error', 'Failed to fetch route suggestions.');
    }
  };

  const calculateETA = (current, destination) => {
    if (!current || !destination) return 'Calculating...';
    const distance = getDistance(current, destination); // in km
    const speed = 30; // Assume average speed of 30 km/h
    const timeHours = distance / speed;
    const timeMinutes = Math.round(timeHours * 60);
    return `${timeMinutes} min`;
  };

  const getDistance = (point1, point2) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const dLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.latitude * Math.PI) / 180) *
        Math.cos((point2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const fitMapToMarkers = (markers) => {
    if (markers.length === 0 || !mapRef.current) return;

    const coordinates = markers.map((marker) => marker.coordinate);
    const minLat = Math.min(...coordinates.map((c) => c.latitude));
    const maxLat = Math.max(...coordinates.map((c) => c.latitude));
    const minLon = Math.min(...coordinates.map((c) => c.longitude));
    const maxLon = Math.max(...coordinates.map((c) => c.longitude));

    const padding = 0.01; // Add padding to the map view
    const region = {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: (maxLat - minLat + padding) * 1.5,
      longitudeDelta: (maxLon - minLon + padding) * 1.5,
    };

    mapRef.current.animateToRegion(region, 1000);
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permissions are required.', [{ text: 'OK' }]);
        setIsLoading(false);
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        const newLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };

        setCurrentLocation(newLocation);
        setMapMarkers([
          {
            id: 'user',
            coordinate: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            title: `Bus ${trip.routeNumber || 'Unknown'}`,
            type: 'user',
          },
        ]);
        setLocationHistory([{ latitude: location.coords.latitude, longitude: location.coords.longitude }]);

        const address = await fetchAddressFromGeoapify(
          location.coords.latitude,
          location.coords.longitude
        );
        setCurrentAddress(address);
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert('Location Error', 'Failed to get your location.', [{ text: 'OK' }]);
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
      Alert.alert('Location Services Disabled', 'Please enable location services.', [{ text: 'OK' }]);
      return false;
    }
    return true;
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required.', [{ text: 'OK' }]);
      return false;
    }
    return true;
  };

  const saveTripDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          routeNumber: trip.routeNumber,
          crowdness: trip.crowdness,
          startTime: trip.startTime,
          busDetails: `BUS_${trip.routeNumber}`,
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
          busDetails: `BUS_${trip.routeNumber}`,
          latitude,
          longitude,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to send location update');
      }
      console.log('Location update sent:', { latitude, longitude });
    } catch (error) {
      console.error('Error sending location update:', error);
    }
  };

  const startLocationTracking = useCallback(async () => {
    const servicesEnabled = await checkLocationServices();
    if (!servicesEnabled) return;

    const permissionGranted = await requestLocationPermission();
    if (!permissionGranted) return;

    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 60000, // Update every 60 seconds
          distanceInterval: 0, // No minimum distance required
        },
        (location) => {
          const { latitude, longitude, speed } = location.coords;
          const newLocation = {
            latitude,
            longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          };

          // Update movement status (debounced every 5 seconds)
          const now = Date.now();
          if (now - lastMovementUpdate.current >= 5000) {
            setMovementStatus(speed > 0.5 ? 'Moving' : 'Stationary');
            lastMovementUpdate.current = now;
          }

          setCurrentLocation(newLocation);
          setLocationHistory((prev) => {
            const newHistory = [...prev, { latitude, longitude }];
            return newHistory.slice(-100); // Keep last 100 points
          });

          // Update user marker coordinates only
          setMapMarkers((prevMarkers) => {
            const updatedMarkers = [...prevMarkers];
            const userMarkerIndex = updatedMarkers.findIndex((marker) => marker.id === 'user');
            if (userMarkerIndex !== -1) {
              updatedMarkers[userMarkerIndex] = {
                ...updatedMarkers[userMarkerIndex],
                coordinate: { latitude, longitude },
              };
            }
            return updatedMarkers;
          });

          sendLocationUpdate(latitude, longitude);

          if (destinationCoords) {
            const eta = calculateETA({ latitude, longitude }, destinationCoords);
            setEstimatedArrival(eta);
          }

          // Fit map to include all markers
          fitMapToMarkers(mapMarkers);
        }
      );
      setIsTracking(true);
      setNotifications((prev) => [
        ...prev,
        {
          id: `tracking-started-${Date.now()}`,
          text: `Location tracking started for Route ${trip.routeNumber}.`,
          read: false,
        },
      ]);
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Tracking Error', 'Failed to track your location.', [{ text: 'OK' }]);
    }
  }, [trip.routeNumber, destinationCoords, mapMarkers]);

  const stopLocationTracking = useCallback(() => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
    setMovementStatus('Stationary');
    setNotifications((prev) => [
      ...prev,
      {
        id: `tracking-stopped-${Date.now()}`,
        text: `Location tracking stopped for Route ${trip.routeNumber}.`,
        read: false,
      },
    ]);
  }, [trip.routeNumber]);

  const handleToggleTracking = () => {
    if (isTracking) {
      stopLocationTracking();
    } else {
      startLocationTracking();
    }
  };

  const handleStartTrip = async () => {
    if (!trip.routeNumber || !trip.crowdness || !trip.startTime) {
      Alert.alert('Incomplete Information', 'Please enter route number, crowdness level, and start time.', [{ text: 'OK' }]);
      return;
    }
  
    // Validate startTime format (HH:MM)
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(trip.startTime)) {
      Alert.alert('Invalid Start Time', 'Please enter a valid start time in HH:MM format (e.g., 10:00).', [{ text: 'OK' }]);
      return;
    }
  
    const tripId = await saveTripDetails();
    if (!tripId) return;
  
    try {
      const response = await fetch(`${API_URL}/api/bus-routes`);
      const routes = await response.json();
      const selectedRoute = routes.find((r) => r.route_number === trip.routeNumber);
      if (!selectedRoute) {
        Alert.alert('Error', 'Route not found.');
        return;
      }
  
      setSelectedRoute(selectedRoute);
  
      // Get the first and last bus stops
      const busStops = selectedRoute.bus_stops;
      if (!busStops || busStops.length < 2) {
        Alert.alert('Error', 'Invalid route: At least two bus stops are required.');
        return;
      }
  
      const startStop = busStops[0];
      const endStop = busStops[busStops.length - 1];
  
      // Fetch coordinates for start and end stops if not available
      let startCoords = startStop.coordinates?.latitude && startStop.coordinates?.longitude
        ? { latitude: startStop.coordinates.latitude, longitude: startStop.coordinates.longitude }
        : await fetchCoordinates(startStop.name);
  
      let endCoords = endStop.coordinates?.latitude && endStop.coordinates?.longitude
        ? { latitude: endStop.coordinates.latitude, longitude: endStop.coordinates.longitude }
        : await fetchCoordinates(endStop.name);
  
      // Fallback if coordinates could not be fetched
      if (!startCoords) {
        Alert.alert('Warning', `Could not fetch coordinates for ${startStop.name}. Using current location as fallback.`);
        startCoords = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        };
      }
  
      if (!endCoords) {
        Alert.alert('Warning', `Could not fetch coordinates for ${endStop.name}. Using offset from start as fallback.`);
        endCoords = {
          latitude: startCoords.latitude + 0.01,
          longitude: startCoords.longitude + 0.01,
        };
      }
  
      // Set destination coordinates for ETA calculation
      setDestinationCoords(endCoords);
  
      // Create markers for all bus stops, including start and end
      const stopMarkers = busStops
        .map((stop, index) => {
          let coords;
          if (index === 0) {
            coords = startCoords;
          } else if (index === busStops.length - 1) {
            coords = endCoords;
          } else {
            coords = stop.coordinates?.latitude && stop.coordinates?.longitude
              ? { latitude: stop.coordinates.latitude, longitude: stop.coordinates.longitude }
              : null;
          }
  
          if (!coords) return null;
  
          return {
            id: `stop-${index}`,
            coordinate: coords,
            title: stop.name,
            type: index === 0 ? 'start' : index === busStops.length - 1 ? 'end' : 'stop',
          };
        })
        .filter((marker) => marker !== null);
  
      // Include the driver's current location as a marker
      const driverMarker = {
        id: 'user',
        coordinate: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        title: `Bus ${trip.routeNumber}`,
        type: 'user',
      };
  
      // Update map markers
      const allMarkers = [driverMarker, ...stopMarkers];
      setMapMarkers(allMarkers);
  
      // Show the map and start tracking
      setShowMap(true);
      startLocationTracking();
  
      // Fit map to include all markers
      setTimeout(() => {
        fitMapToMarkers(allMarkers);
      }, 500);
    } catch (error) {
      console.error('Error fetching route details:', error);
      Alert.alert('Error', 'Failed to fetch route details.');
    }
  };

  const fetchCoordinates = async (location) => {
    try {
      const query = encodeURIComponent(`${location}, Coimbatore, India`);
      const url = `https://api.geoapify.com/v1/geocode/search?text=${query}&apiKey=${GEOAPIFY_API_KEY}&limit=1&format=json`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return {
          latitude: data.results[0].lat,
          longitude: data.results[0].lon,
        };
      }
      return null;
    } catch (error) {
      console.error(`Error fetching coordinates for ${location}:`, error);
      return null;
    }
  };

  const handleBackToForm = () => {
    stopLocationTracking();
    setShowMap(false);
    setLocationHistory([]);
    setMapMarkers([]);
    setDestinationCoords(null);
    setEstimatedArrival('');
    setSelectedRoute(null);
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const readAllNotifications = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    setNotificationsVisible(false);
  };

  const dismissNotification = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const handleRouteNumberChange = (text) => {
    setTrip({ ...trip, routeNumber: text });
    fetchRouteSuggestions(text);
  };

  const selectRoute = (route) => {
    setTrip({ ...trip, routeNumber: route.route_number });
    setShowSuggestions(false);
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity style={styles.suggestionItem} onPress={() => selectRoute(item)}>
      <Text style={styles.suggestionText}>{item.route_number}</Text>
      <Text style={styles.suggestionSubText}>{`${item.from} → ${item.to}`}</Text>
    </TouchableOpacity>
  );

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
          <Text style={styles.loadingText}>Planning your trip...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showMap && currentLocation) {
    return (
      <SafeAreaView style={styles.fullScreenContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.mapHeader}>
          <TouchableOpacity style={styles.menuButtonMap} onPress={toggleSidebar}>
            <Feather name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
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
  showsMyLocationButton={true}
>
  {mapMarkers.map((marker) => (
    <Marker
      key={marker.id}
      coordinate={marker.coordinate}
      title={marker.title || 'Unknown Location'}
      pinColor={
        marker.type === 'user' ? '#1976d2' :
        marker.type === 'start' ? '#10B981' :
        marker.type === 'end' ? '#EF4444' :
        '#3B82F6'
      }
    >
      {marker.type === 'user' && (
        <View style={styles.driverMarker}>
          <MaterialIcons name="directions-bus" size={24} color="#FFFFFF" />
        </View>
      )}
      {marker.type === 'start' && (
        <View style={[styles.driverMarker, { backgroundColor: '#10B981' }]}>
          <MaterialIcons name="play-arrow" size={24} color="#FFFFFF" />
        </View>
      )}
      {marker.type === 'end' && (
        <View style={[styles.driverMarker, { backgroundColor: '#EF4444' }]}>
          <MaterialIcons name="stop" size={24} color="#FFFFFF" />
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
            <MaterialIcons name="directions-bus" size={20} color="#6B7280" />
            <Text style={styles.tripInfoText}>Route: {trip.routeNumber}</Text>
          </View>
          <View style={styles.tripInfoRow}>
            <FontAwesome5 name="users" size={20} color="#6B7280" />
            <Text style={styles.tripInfoText}>Crowdness: {trip.crowdness}</Text>
          </View>
          <View style={styles.tripInfoRow}>
            <MaterialIcons name="access-time" size={20} color="#6B7280" />
            <Text style={styles.tripInfoText}>Start Time: {trip.startTime}</Text>
          </View>
          <View style={styles.tripInfoRow}>
            <MaterialIcons name="directions" size={20} color="#10B981" />
            <Text style={styles.tripInfoText}>Status: {movementStatus}</Text>
          </View>
          <View style={styles.tripInfoRow}>
            <MaterialIcons name="schedule" size={20} color="#10B981" />
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
          <Feather name="menu" size={24} color="#1976d2" />
        </TouchableOpacity>
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
            <MaterialIcons name="directions-bus" size={24} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Route Number (e.g., 11A)"
              placeholderTextColor="#9CA3AF"
              value={trip.routeNumber}
              onChangeText={handleRouteNumberChange}
            />
          </View>
          {showSuggestions && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={routeSuggestions}
                renderItem={renderSuggestion}
                keyExtractor={(item) => item._id}
                style={styles.suggestionsList}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <FontAwesome5 name="users" size={24} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Crowdness (Full/Half/Empty)"
              placeholderTextColor="#9CA3AF"
              value={trip.crowdness}
              onChangeText={(text) => setTrip({ ...trip, crowdness: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="access-time" size={24} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Start Time (e.g., 10:00)"
              placeholderTextColor="#9CA3AF"
              value={trip.startTime}
              onChangeText={(text) => setTrip({ ...trip, startTime: text })}
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
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    maxHeight: 150,
    marginBottom: 15,
    elevation: 3,
  },
  suggestionsList: {
    padding: 10,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  suggestionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  suggestionSubText: {
    fontSize: 14,
    color: '#6B7280',
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