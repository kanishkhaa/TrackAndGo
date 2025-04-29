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
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
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
  const [searchMode, setSearchMode] = useState(false);
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
  const locationUpdateInterval = useRef(null);

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
      locationUpdateInterval.current = setInterval(() => {
        fetchDriverLocation(selectedRoute.busDetails);
      }, 10000); // Update every 10 seconds
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

  const fetchDriverLocation = async (busDetails) => {
    try {
      const response = await fetch(`${API_URL}/api/driver-locations/${encodeURIComponent(busDetails)}`);
      const data = await response.json();
      if (data.latitude && data.longitude) {
        const newLocation = {
          latitude: data.latitude,
          longitude: data.longitude,
        };
        setDriverLocation(newLocation);
        setMapMarkers((prevMarkers) => [
          ...prevMarkers.filter((marker) => marker.type !== 'driver'),
          {
            coordinate: newLocation,
            title: `Bus ${busDetails} Location`,
            type: 'driver',
          },
        ]);
      } else {
        setDriverLocation(null);
      }
    } catch (error) {
      console.error('Error fetching driver location:', error);
      setDriverLocation(null);
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
          // Fetch driver location for each route's busDetails
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
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
      alert(
        `Failed to fetch routes: ${error.message}. Ensure the backend is running at ${API_URL}.`
      );
      setRoutes([]);
      setDriverLocation(null);
    }

    setSearchMode(false);
  };

  const toggleSearchMode = () => {
    setSearchMode(true);
    setFromLocation('');
    setToLocation('');
  };

  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
    setRouteDetailsVisible(true);
    if (route.busDetails) {
      fetchDriverLocation(route.busDetails);
    }
  };

  const closeRouteDetails = () => {
    setRouteDetailsVisible(false);
    setSelectedRoute(null);
    if (locationUpdateInterval.current) {
      clearInterval(locationUpdateInterval.current);
    }
  };

  const clearRoutes = () => {
    setRoutes([]);
    setDriverLocation(null);
    setMapMarkers(mapMarkers.filter((marker) => marker.type === 'user'));
    if (locationUpdateInterval.current) {
      clearInterval(locationUpdateInterval.current);
    }
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
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>{notifications.length}</Text>
          </View>
          <Ionicons name="notifications" size={22} color="#1976d2" />
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        {currentLocation && (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={currentLocation}
            showsUserLocation={true}
          >
            {mapMarkers.map((marker, index) => (
              <Marker
                key={index}
                coordinate={marker.coordinate}
                title={marker.title}
                pinColor={
                  marker.type === 'user'
                    ? '#1976d2'
                    : marker.type === 'driver'
                    ? '#10B981'
                    : '#F44336'
                }
              >
                {marker.type === 'driver' && (
                  <View style={styles.driverMarker}>
                    <MaterialIcons name="directions-bus" size={24} color="#FFFFFF" />
                  </View>
                )}
              </Marker>
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
            <TouchableOpacity onPress={closeRouteDetails} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1976d2" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Route Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedRoute && (
            <ScrollView style={styles.routeDetailsContent}>
              <View style={styles.routeHero}>
                <View style={styles.routeNumberBadge}>
                  <Text style={styles.routeNumberText}>{selectedRoute.route_number}</Text>
                </View>
                <Text style={styles.routeTitle}>
                  {selectedRoute.from} to {selectedRoute.to}
                </Text>
              </View>

              <View style={styles.routeDetailCard}>
                <Text style={styles.sectionTitle}>Schedule Information</Text>
                <View style={styles.scheduleTimes}>
                  <View style={styles.scheduleTimeItem}>
                    <MaterialIcons name="schedule" size={20} color="#1976d2" />
                    <View>
                      <Text style={styles.scheduleLabel}>First Bus</Text>
                      <Text style={styles.scheduleValue}>
                        {selectedRoute.timings.from_start.first_bus}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.scheduleTimeItem}>
                    <MaterialIcons name="schedule" size={20} color="#F44336" />
                    <View>
                      <Text style={styles.scheduleLabel}>Last Bus</Text>
                      <Text style={styles.scheduleValue}>
                        {selectedRoute.timings.from_start.last_bus}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.routeInfoGrid}>
                  <View style={styles.routeInfoItem}>
                    <MaterialCommunityIcons name="bus-clock" size={20} color="#1976d2" />
                    <View>
                      <Text style={styles.scheduleLabel}>Travel Time</Text>
                      <Text style={styles.scheduleValue}>{selectedRoute.travel_time}</Text>
                    </View>
                  </View>
                  <View style={styles.routeInfoItem}>
                    <MaterialCommunityIcons name="bus-multiple" size={20} color="#1976d2" />
                    <View>
                      <Text style={styles.scheduleLabel}>Daily Buses</Text>
                      <Text style={styles.scheduleValue}>{selectedRoute.daily_buses}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.routeDetailCard}>
                <Text style={styles.sectionTitle}>Stop Points</Text>
                <View style={styles.stopsContainer}>{renderBusStops(selectedRoute.bus_stops)}</View>
              </View>

              {driverLocation && (
                <View style={styles.routeDetailCard}>
                  <Text style={styles.sectionTitle}>Bus Location</Text>
                  <Text style={styles.infoValue}>
                    Current Location: Lat {driverLocation.latitude.toFixed(4)}, Lon{' '}
                    {driverLocation.longitude.toFixed(4)}
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.trackBusButton} onPress={closeRouteDetails}>
                <MaterialIcons name="my-location" size={20} color="#fff" />
                <Text style={styles.trackBusText}>Track This Bus</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {!searchMode && (
        <View style={styles.searchOptions}>
          <TouchableOpacity style={styles.searchOptionButton} onPress={toggleSearchMode}>
            <MaterialIcons name="directions" size={20} color="#fff" />
            <Text style={styles.searchOptionText}>Search Route</Text>
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
    justifyContent: 'center',
  },
  searchOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    elevation: 4,
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    padding: 5,
  },
  routeDetailsContent: {
    flex: 1,
    paddingBottom: 20,
  },
  routeHero: {
    backgroundColor: '#1976d2',
    padding: 20,
    alignItems: 'center',
  },
  routeNumberBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeNumberText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  routeDetailCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    margin: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  scheduleTimes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  scheduleTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  scheduleValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  routeInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  stopsContainer: {
    paddingVertical: 10,
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
    fontWeight: 'bold',
    color: '#1976d2',
  },
  endStop: {
    fontWeight: 'bold',
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
    borderRadius: 8,
    margin: 10,
    marginTop: 20,
  },
  trackBusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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
  },
});

export default HomeScreen;