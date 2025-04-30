import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Animated,
  ScrollView,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE, AnimatedRegion } from 'react-native-maps';
import {
  FontAwesome5,
  MaterialIcons,
  Ionicons,
  Feather,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Sidebar from '../components/Sidebar';
import { UserContext } from '../screens/UserContext';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const API_URL = 'http://192.168.11.179:3000';
const GEOAPIFY_API_KEY = '7b3757a8e0994af49ee07c57f01d616f';

const HomeScreen = () => {
  const { user } = useContext(UserContext);
  const navigation = useNavigation();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [busSearch, setBusSearch] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [busSearchMode, setBusSearchMode] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('home');
  const [mapMarkers, setMapMarkers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeDetailsVisible, setRouteDetailsVisible] = useState(false);
  const [co2Saved, setCo2Saved] = useState(1.7);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Route Update',
      message: 'Bus 42 is running 3 minutes behind schedule.',
      type: 'info',
      time: '2 min ago',
    },
    {
      id: '2',
      title: 'Service Alert',
      message: 'Line 15 has been temporarily rerouted due to construction.',
      type: 'warning',
      time: '10 min ago',
    },
    {
      id: '3',
      title: 'Special Notice',
      message: 'Weekend schedule in effect tomorrow due to holiday.',
      type: 'info',
      time: '25 min ago',
    },
  ]);
  const [driverLocation, setDriverLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showBusStops, setShowBusStops] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [lastDriverBearing, setLastDriverBearing] = useState(0);
  const locationUpdateInterval = useRef(null);
  const mapRef = useRef(null);

  // Animated region for smooth marker movement
  const animatedDriverCoordinate = useRef(
    new AnimatedRegion({
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    })
  ).current;

  const slideAnim = useState(new Animated.Value(100))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (user.role === 'driver' && !user.profileComplete) {
      navigation.replace('ProfileScreen');
    }
  }, [user, navigation]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({});
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
            title: 'You are here',
            type: 'user',
          },
        ]);

        if (mapRef.current) {
          mapRef.current.animateToRegion(newLocation, 1000);
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    })();
  }, []);

  useEffect(() => {
    if (routes.length > 0) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [routes]);

  useEffect(() => {
    if (selectedRoute && selectedRoute.busDetails) {
      fetchDriverLocation(selectedRoute.busDetails);
      locationUpdateInterval.current = setInterval(() => {
        fetchDriverLocation(selectedRoute.busDetails);
      }, 5000);
    }
    return () => {
      if (locationUpdateInterval.current) {
        clearInterval(locationUpdateInterval.current);
      }
    };
  }, [selectedRoute]);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleMenuItemPress = (menuItem) => {
    setActiveMenuItem(menuItem);
    setSidebarVisible(false);
  };

  const handleSignOut = () => {
    setSidebarVisible(false);
    navigation.navigate('Onboarding');
  };

  const normalizeBusDetails = (busDetails) => {
    const cleaned = busDetails.replace(/^BUS_+/i, '').trim().toUpperCase();
    return `BUS_${cleaned}`;
  };

  const fetchCoordinates = async (stopName) => {
    try {
      const query = encodeURIComponent(`${stopName}, Coimbatore, India`);
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
      console.warn(`No coordinates found for stop: ${stopName}`);
      return null;
    } catch (error) {
      console.error(`Error fetching coordinates for ${stopName}:`, error);
      return null;
    }
  };

  const calculateBearing = (prevLocation, newLocation) => {
    if (!prevLocation) return 0;
    const lat1 = (prevLocation.latitude * Math.PI) / 180;
    const lon1 = (prevLocation.longitude * Math.PI) / 180;
    const lat2 = (newLocation.latitude * Math.PI) / 180;
    const lon2 = (newLocation.longitude * Math.PI) / 180;

    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    bearing = (bearing + 360) % 360;
    return bearing;
  };

  const fetchDriverLocation = async (busDetails) => {
    try {
      setLocationLoading(true);
      const normalizedBusDetails = normalizeBusDetails(busDetails);
      console.log(`Fetching location for busDetails: ${normalizedBusDetails}`);
      const response = await fetch(`${API_URL}/api/driver-locations/${encodeURIComponent(normalizedBusDetails)}`);
      console.log(`HTTP Status: ${response.status}`);
      const data = await response.json();
      console.log('Backend response:', data);

      if (response.ok && data.latitude && data.longitude) {
        const newLocation = {
          latitude: data.latitude,
          longitude: data.longitude,
        };

        if (driverLocation) {
          const bearing = calculateBearing(driverLocation, newLocation);
          setLastDriverBearing(bearing);
        }

        setDriverLocation(newLocation);
        setLastUpdated(new Date(data.timestamp).toLocaleTimeString());

        animatedDriverCoordinate.timing({
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          duration: 1000,
          useNativeDriver: false,
        }).start();

        setMapMarkers((prevMarkers) => {
          const updatedMarkers = [
            ...prevMarkers.filter((marker) => marker.type !== 'driver'),
            {
              coordinate: newLocation,
              title: `Bus ${normalizedBusDetails} Location`,
              type: 'driver',
            },
          ];
          console.log('Updated markers:', updatedMarkers);
          return updatedMarkers;
        });

        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }
        return newLocation;
      } else {
        console.warn(`No location found for busDetails: ${normalizedBusDetails}`, {
          status: response.status,
          data,
        });
        setDriverLocation(null);
        setLastUpdated(null);
        setLastDriverBearing(0);
        return null;
      }
    } catch (error) {
      console.error('Error fetching driver location:', error);
      setDriverLocation(null);
      setLastUpdated(null);
      setLastDriverBearing(0);
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSearch = async () => {
    const trimmedFrom = fromLocation.trim();
    const trimmedTo = toLocation.trim();

    if (!trimmedFrom || !trimmedTo) {
      alert('Please enter both From and To locations');
      return;
    }

    try {
      const url = `${API_URL}/api/bus-routes/route/${encodeURIComponent(trimmedFrom)}/${encodeURIComponent(trimmedTo)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setRoutes(data);
        const newMarkers = [];
        for (const route of data) {
          for (const stop of route.bus_stops) {
            const coords = await fetchCoordinates(stop);
            if (coords) {
              newMarkers.push({
                coordinate: coords,
                title: stop,
                type: 'bus_stop',
              });
            }
          }
          if (route.busDetails) {
            await fetchDriverLocation(route.busDetails);
          }
        }

        setMapMarkers([
          ...mapMarkers.filter((marker) => marker.type === 'user'),
          ...newMarkers,
          ...(driverLocation
            ? [
                {
                  coordinate: driverLocation,
                  title: `Bus ${data[0]?.busDetails || 'Unknown'} Location`,
                  type: 'driver',
                },
              ]
            : []),
        ]);
      } else {
        const message = data.message || 'No routes found';
        if (data.debug) {
          console.log('Debug Info:', data.debug);
          alert(
            `${message}\nFrom matches: ${data.debug.fromMatches}\nTo matches: ${data.debug.toMatches}`
          );
        } else {
          alert(message);
        }
        setRoutes([]);
        setDriverLocation(null);
        setLastUpdated(null);
        setLastDriverBearing(0);
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      alert(
        `Failed to fetch routes: ${error.message}. Ensure the backend is running at ${API_URL}.`
      );
      setRoutes([]);
      setDriverLocation(null);
      setLastUpdated(null);
      setLastDriverBearing(0);
    }

    setSearchMode(false);
  };

  const handleBusSearch = async () => {
    const trimmedBusSearch = busSearch.trim();
    if (!trimmedBusSearch) {
      alert('Please enter a bus or route number');
      return;
    }

    const busNumberRegex = /^[A-Za-z0-9]+$/;
    if (!busNumberRegex.test(trimmedBusSearch.replace(/^BUS_+/i, ''))) {
      alert('Invalid bus number format. Use letters and numbers (e.g., 12C, 1A, BUS_12C).');
      return;
    }

    try {
      const normalizedBusSearch = normalizeBusDetails(trimmedBusSearch);
      console.log(`Searching for bus: ${normalizedBusSearch}`);
      const location = await fetchDriverLocation(normalizedBusSearch);
      if (location) {
        setSelectedRoute({ busDetails: normalizedBusSearch });
        setRouteDetailsVisible(true);
      } else {
        alert(`No live location found for bus/route ${trimmedBusSearch}. Please check the bus number and try again.`);
        setMapMarkers(mapMarkers.filter((marker) => marker.type === 'user'));
      }
    } catch (error) {
      console.error('Error fetching bus location:', error);
      alert(`Failed to fetch bus location: ${error.message}. Ensure the backend is running at ${API_URL}.`);
      setMapMarkers(mapMarkers.filter((marker) => marker.type === 'user'));
    }

    setBusSearchMode(false);
    setBusSearch('');
  };

  const toggleSearchMode = () => {
    setSearchMode(true);
    setFromLocation('');
    setToLocation('');
  };

  const toggleBusSearchMode = () => {
    setBusSearchMode(true);
    setBusSearch('');
  };

  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
    setRouteDetailsVisible(true);
    setShowBusStops(true);
    if (route.busDetails) {
      fetchDriverLocation(route.busDetails);
    }
  };

  const closeRouteDetails = () => {
    setRouteDetailsVisible(false);
    setSelectedRoute(null);
    setShowBusStops(true);
    if (locationUpdateInterval.current) {
      clearInterval(locationUpdateInterval.current);
    }
  };

  const clearRoutes = () => {
    setRoutes([]);
    setDriverLocation(null);
    setLastUpdated(null);
    setLastDriverBearing(0);
    setMapMarkers(mapMarkers.filter((marker) => marker.type === 'user'));
    if (locationUpdateInterval.current) {
      clearInterval(locationUpdateInterval.current);
    }
  };

  const zoomToBusLocation = () => {
    if (driverLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
      closeRouteDetails();
    }
  };

  const toggleBusStops = () => {
    setShowBusStops(!showBusStops);
  };

  const renderBusStops = (stops) => {
    return stops.map((stop, index) => (
      <View key={index} style={styles.routeStopItem}>
        <View style={styles.routeStopDot}>
          {index === 0 ? (
            <MaterialIcons name="trip-origin" size={20} color="#1976d2" />
          ) : index === stops.length - 1 ? (
            <MaterialIcons name="place" size={20} color="#F44336" />
          ) : (
            <View style={styles.dot} />
          )}
        </View>
        {index < stops.length - 1 && <View style={styles.routeLine} />}
        <View style={styles.routeStopInfo}>
          <Text
            style={[
              styles.routeStopText,
              index === 0
                ? styles.startStop
                : index === stops.length - 1
                ? styles.endStop
                : {},
            ]}
            accessibilityLabel={`Stop ${stop}`}
          >
            {stop}
          </Text>
          {index === 0 && <Text style={styles.endpointLabel}>Start</Text>}
          {index === stops.length - 1 && <Text style={styles.endpointLabel}>End</Text>}
        </View>
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={toggleSidebar}
          style={styles.menuButton}
          accessibilityLabel="Open sidebar"
        >
          <Feather name="menu" size={24} color="#1976d2" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <FontAwesome5 name="bus" size={18} color="#1976d2" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Bus Tracker</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => setNotificationsVisible(true)}
          accessibilityLabel={`Notifications, ${notifications.length} new`}
        >
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>{notifications.length}</Text>
          </View>
          <Ionicons name="notifications" size={22} color="#1976d2" />
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        {currentLocation && (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={currentLocation}
            showsUserLocation={true}
          >
            {mapMarkers.map((marker, index) => (
              marker.type === 'driver' ? (
                <Marker.Animated
                  key={`driver-${index}`}
                  coordinate={animatedDriverCoordinate}
                  title={marker.title}
                  anchor={{ x: 0.5, y: 0.5 }}
                  rotation={lastDriverBearing}
                >
                  <View style={styles.driverMarker}>
                    <MaterialIcons name="directions-bus" size={24} color="#FFFFFF" />
                  </View>
                </Marker.Animated>
              ) : (
                <Marker
                  key={`${marker.type}-${index}`}
                  coordinate={marker.coordinate}
                  title={marker.title}
                  pinColor={
                    marker.type === 'user'
                      ? '#1976d2'
                      : marker.type === 'bus_stop'
                      ? '#F44336'
                      : '#10B981'
                  }
                />
              )
            ))}
          </MapView>
        )}
      </View>

      <Modal
        visible={searchMode}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSearchMode(false)}
      >
        <View style={styles.searchModal}>
          <BlurView intensity={80} style={styles.searchContainer}>
            <View style={styles.searchHeader}>
              <Text style={styles.searchTitle}>Search by Route</Text>
              <TouchableOpacity onPress={() => setSearchMode(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <MaterialIcons name="my-location" size={20} color="#777" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="From"
                value={fromLocation}
                onChangeText={(text) => setFromLocation(text)}
              />
            </View>
            <View style={styles.inputContainer}>
              <MaterialIcons name="location-on" size={20} color="#777" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="To"
                value={toLocation}
                onChangeText={(text) => setToLocation(text)}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.searchButton,
                (!fromLocation.trim() || !toLocation.trim()) && styles.searchButtonDisabled,
              ]}
              onPress={handleSearch}
              disabled={!fromLocation.trim() || !toLocation.trim()}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>

      <Modal
        visible={busSearchMode}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBusSearchMode(false)}
      >
        <View style={styles.searchModal}>
          <BlurView intensity={80} style={styles.searchContainer}>
            <View style={styles.searchHeader}>
              <Text style={styles.searchTitle}>Search by Bus/Route Number</Text>
              <TouchableOpacity onPress={() => setBusSearchMode(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <MaterialIcons name="directions-bus" size={20} color="#777" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter Bus Number (e.g., 12C, 1A)"
                placeholderTextColor="#777"
                value={busSearch}
                onChangeText={(text) => setBusSearch(text)}
              />
            </View>
            <Text style={styles.inputHint}>Enter the bus number as shown on the bus (e.g., 12C, 1A).</Text>
            <TouchableOpacity
              style={[
                styles.searchButton,
                !busSearch.trim() && styles.searchButtonDisabled,
              ]}
              onPress={handleBusSearch}
              disabled={!busSearch.trim()}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>

      <Modal
        visible={notificationsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={styles.notificationModal}>
          <BlurView intensity={80} style={styles.notificationContainer}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotificationsVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {notifications.map((notification) => (
                <View key={notification.id} style={styles.notificationItem}>
                  <Ionicons
                    name={notification.type === 'warning' ? 'warning' : 'information-circle'}
                    size={24}
                    color={notification.type === 'warning' ? '#F44336' : '#1976d2'}
                  />
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationItemTitle}>{notification.title}</Text>
                    <Text style={styles.notificationItemText}>{notification.message}</Text>
                    <Text style={styles.notificationItemTime}>{notification.time}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

      <Modal
        visible={routeDetailsVisible}
        animationType="slide"
        onRequestClose={closeRouteDetails}
      >
        <SafeAreaView style={styles.fullscreenModal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={closeRouteDetails}
              style={styles.backButton}
              accessibilityLabel="Close route details"
            >
              <Ionicons name="arrow-back" size={24} color="#1976d2" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Route Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedRoute && (
            <ScrollView style={styles.routeDetailsContent}>
              <View style={styles.routeHero}>
                <View style={styles.routeNumberBadge}>
                  <Text style={styles.routeNumberText}>
                    {selectedRoute.route_number || selectedRoute.busDetails.replace('BUS_', '')}
                  </Text>
                </View>
                <Text style={styles.routeTitle}>
                  {selectedRoute.from
                    ? `${selectedRoute.from} to ${selectedRoute.to}`
                    : `Bus ${selectedRoute.busDetails.replace('BUS_', '')}`}
                </Text>
                {selectedRoute.travel_time && (
                  <Text style={styles.routeSubtitle}>
                    Estimated Travel Time: {selectedRoute.travel_time}
                  </Text>
                )}
                {selectedRoute.bus_stops && (
                  <Text style={styles.routeSubtitle}>
                    {selectedRoute.bus_stops.length} Stops
                  </Text>
                )}
              </View>

              {selectedRoute.bus_stops && (
                <View style={styles.routeDetailCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Stop Points</Text>
                    <TouchableOpacity
                      onPress={toggleBusStops}
                      style={styles.toggleButton}
                      accessibilityLabel={showBusStops ? 'Hide stops' : 'Show stops'}
                    >
                      <Ionicons
                        name={showBusStops ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#1976d2"
                      />
                    </TouchableOpacity>
                  </View>
                  {showBusStops && (
                    <View style={styles.stopsContainer}>
                      {renderBusStops(selectedRoute.bus_stops)}
                    </View>
                  )}
                </View>
              )}

              <View style={styles.routeDetailCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Bus Location</Text>
                  {driverLocation && (
                    <TouchableOpacity
                      onPress={() => fetchDriverLocation(selectedRoute.busDetails)}
                      style={styles.refreshButton}
                      accessibilityLabel="Refresh bus location"
                    >
                      <Ionicons name="refresh" size={20} color="#1976d2" />
                    </TouchableOpacity>
                  )}
                </View>
                {locationLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#1976d2" />
                    <Text style={styles.loadingText}>Fetching location...</Text>
                  </View>
                ) : driverLocation ? (
                  <View>
                    <Text style={styles.infoValue}>
                      Current Location: Lat {driverLocation.latitude.toFixed(4)}, Lon{' '}
                      {driverLocation.longitude.toFixed(4)}
                    </Text>
                    <Text style={styles.infoValue}>
                      Bus: {selectedRoute.busDetails.replace('BUS_', '')}
                    </Text>
                    {lastUpdated && (
                      <Text style={styles.lastUpdatedText}>
                        Last Updated: {lastUpdated}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={styles.zoomButton}
                      onPress={zoomToBusLocation}
                      accessibilityLabel="Zoom to bus location"
                    >
                      <MaterialIcons name="zoom-in-map" size={18} color="#fff" />
                      <Text style={styles.zoomButtonText}>View on Map</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.infoValue}>
                    No live location available for this bus.
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.trackBusButton}
                onPress={closeRouteDetails}
                accessibilityLabel="Track this bus"
              >
                <MaterialIcons name="my-location" size={20} color="#fff" />
                <Text style={styles.trackBusText}>Track This Bus</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {!searchMode && !busSearchMode && (
        <View style={styles.searchOptions}>
          <TouchableOpacity
            style={styles.searchOptionButton}
            onPress={toggleSearchMode}
            accessibilityLabel="Search by route"
          >
            <MaterialIcons name="directions" size={20} color="#fff" />
            <Text style={styles.searchOptionText}>Search Route</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.searchOptionButton}
            onPress={toggleBusSearchMode}
            accessibilityLabel="Search by bus number"
          >
            <MaterialIcons name="directions-bus" size={20} color="#fff" />
            <Text style={styles.searchOptionText}>Search Bus</Text>
          </TouchableOpacity>
        </View>
      )}

      {routes.length > 0 && (
        <Animated.View
          style={[styles.busInfoCard, { transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}
        >
          <View style={styles.busInfoCardHeader}>
            <Text style={styles.busInfoCardTitle}>
              {routes.length} {routes.length === 1 ? 'Route' : 'Routes'} Available
            </Text>
            <TouchableOpacity onPress={clearRoutes}>
              <Ionicons name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.routesList}>
            {routes.map((route) => (
              <TouchableOpacity
                key={route._id}
                style={styles.routeListItem}
                onPress={() => handleRouteSelect(route)}
              >
                <View style={styles.routeNumberCircle}>
                  <Text style={styles.routeNumberCircleText}>{route.route_number}</Text>
                </View>
                <View style={styles.routeListItemInfo}>
                  <Text style={styles.routeListItemTitle}>
                    {route.from} → {route.to}
                  </Text>
                  <View style={styles.routeListItemDetails}>
                    <View style={styles.routeListItemDetail}>
                      <MaterialIcons name="schedule" size={16} color="#666" />
                      <Text style={styles.routeListItemDetailText}>{route.travel_time}</Text>
                    </View>
                    <View style={styles.routeListItemDetail}>
                      <MaterialIcons name="pin-drop" size={16} color="#666" />
                      <Text style={styles.routeListItemDetailText}>
                        {route.bus_stops.length} stops
                      </Text>
                    </View>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#1976d2" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => {
              if (routes.length === 1) {
                handleRouteSelect(routes[0]);
              }
            }}
          >
            <Text style={styles.viewAllButtonText}>
              {routes.length === 1 ? 'View Route Details' : 'View All Routes'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={styles.co2Container}>
        <Text style={styles.co2Text}>
          CO₂ Saved Today: <Text style={styles.co2Value}>{co2Saved} kg</Text>
        </Text>
      </View>

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
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  searchOptions: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  searchOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    elevation: 4,
    flex: 0.48,
  },
  searchOptionText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  searchModal: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  searchContainer: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 5,
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    marginLeft: 10,
  },
  searchButton: {
    backgroundColor: '#1976d2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#b0bec5',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  busInfoCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    maxHeight: height * 0.4,
  },
  busInfoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  busInfoCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  routesList: {
    maxHeight: height * 0.25,
  },
  routeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  routeNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routeNumberCircleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  routeListItemInfo: {
    flex: 1,
  },
  routeListItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  routeListItemDetails: {
    flexDirection: 'row',
  },
  routeListItemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  routeListItemDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  viewAllButton: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  viewAllButtonText: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 15,
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  backButton: {
    padding: 8,
  },
  routeDetailsContent: {
    flex: 1,
    paddingBottom: 20,
  },
  routeHero: {
    backgroundColor: '#1976d2',
    padding: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  routeNumberBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  routeNumberText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  routeSubtitle: {
    fontSize: 14,
    color: '#e3f2fd',
    textAlign: 'center',
  },
  routeDetailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  toggleButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  stopsContainer: {
    paddingVertical: 8,
  },
  routeStopItem: {
    flexDirection: 'row',
    minHeight: 50,
  },
  routeStopDot: {
    width: 24,
    alignItems: 'center',
    zIndex: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1976d2',
  },
  routeLine: {
    position: 'absolute',
    left: 11.5,
    top: 20,
    bottom: 0,
    width: 1,
    backgroundColor: '#1976d2',
    zIndex: 1,
  },
  routeStopInfo: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  routeStopText: {
    fontSize: 14,
    color: '#333',
  },
  startStop: {
    fontWeight: '600',
    color: '#1976d2',
  },
  endStop: {
    fontWeight: '600',
    color: '#F44336',
  },
  endpointLabel: {
    fontSize: 12,
    color: '#666',
  },
  trackBusButton: {
    backgroundColor: '#1976d2',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    margin: 12,
    marginTop: 20,
    elevation: 3,
  },
  trackBusText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
  zoomButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  zoomButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  co2Container: {
    position: 'absolute',
    top: 70,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  co2Text: {
    color: '#fff',
    fontSize: 12,
  },
  co2Value: {
    fontWeight: 'bold',
  },
  notificationModal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  notificationContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '50%',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  notificationContent: {
    marginLeft: 10,
    flex: 1,
  },
  notificationItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  notificationItemText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  notificationItemTime: {
    fontSize: 12,
    color: '#999',
  },
  driverMarker: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen;