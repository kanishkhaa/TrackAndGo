import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Switch,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import Sidebar from '../components/Sidebar';
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  Feather,
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { UserContext } from '../screens/UserContext';
import { useNavigation } from '@react-navigation/native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const API_URL = 'http://192.168.11.179:3000';
const GEOAPIFY_API_KEY = '7b3757a8e0994af49ee07c57f01d616f';

export default function RoutesScreen() {
  const { user } = useContext(UserContext);
  const navigation = useNavigation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('subscription');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [subscribedRoutes, setSubscribedRoutes] = useState([]);
  const [routeSuggestions, setRouteSuggestions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [modalFadeAnim] = useState(new Animated.Value(0));
  const [coordinateCache, setCoordinateCache] = useState({});
  const intervalRef = useRef(null);

  const fixBusStops = (busStops) => {
    return busStops.map((stop) => {
      if (stop.name) return stop;
      const name = Object.keys(stop)
        .filter((key) => key !== '_id' && !isNaN(key))
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => stop[key])
        .join('');
      return {
        name: name || 'Unknown Stop',
        coordinates: stop.coordinates || { latitude: null, longitude: null },
      };
    });
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (user.role === 'driver' && !user.profileComplete) {
      navigation.replace('ProfileScreen');
    }
  }, [user, navigation]);

  useEffect(() => {
    if (modalVisible && selectedRoute) {
      Animated.timing(modalFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      modalFadeAnim.setValue(0);
    }
  }, [modalVisible, selectedRoute]);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!user.userId) return;
      try {
        const response = await fetch(`${API_URL}/api/subscriptions/${user.userId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response is not JSON');
        }
        const subscriptions = await response.json();
        setSubscribedRoutes(subscriptions || []);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        alert('Failed to fetch subscriptions. Please check your network or server.');
        setSubscribedRoutes([]);
      }
    };
    fetchSubscriptions();
  }, [user.userId]);

  useEffect(() => {
    console.log('subscribedRoutes updated:', subscribedRoutes);
    // Manage interval for calculateETA
    if (subscribedRoutes.length > 0) {
      if (!intervalRef.current) {
        calculateETA(); // Initial call
        intervalRef.current = setInterval(calculateETA, 30000);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [subscribedRoutes.length]); // Depend on length to avoid retriggering on data changes

  const fetchRouteSuggestions = async (query) => {
    try {
      const response = await fetch(`${API_URL}/api/bus-routes`);
      if (!response.ok) throw new Error('Failed to fetch routes');
      const routes = await response.json();
      const fixedRoutes = routes.map((route) => ({
        ...route,
        bus_stops: fixBusStops(route.bus_stops),
      }));
      const filteredRoutes = fixedRoutes.filter((route) =>
        route.route_number.toLowerCase().includes(query.toLowerCase())
      );
      setRouteSuggestions(filteredRoutes);
      setShowSearchSuggestions(query.length > 0);
    } catch (error) {
      console.error('Error fetching route suggestions:', error);
      alert('Failed to fetch route suggestions.');
    }
  };

  const fetchDriverTrip = async (routeNumber) => {
    try {
      const response = await fetch(`${API_URL}/api/trips?routeNumber=${routeNumber}`);
      if (!response.ok) throw new Error('Failed to fetch trip');
      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching driver trip:', error);
      return null;
    }
  };

  const fetchCoordinates = async (location) => {
    if (coordinateCache[location]) return coordinateCache[location];
    try {
      const query = encodeURIComponent(`${location}, Coimbatore, India`);
      const url = `https://api.geoapify.com/v1/geocode/search?text=${query}&apiKey=${GEOAPIFY_API_KEY}&limit=1&format=json`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch coordinates');
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const coords = {
          latitude: data.results[0].lat,
          longitude: data.results[0].lon,
        };
        setCoordinateCache((prev) => ({ ...prev, [location]: coords }));
        return coords;
      }
      console.warn(`No coordinates found for ${location}`);
      return { latitude: 0, longitude: 0 };
    } catch (error) {
      console.error(`Error fetching coordinates for ${location}:`, error);
      return { latitude: 0, longitude: 0 };
    }
  };

  const getDistance = (point1, point2) => {
    const R = 6371;
    const dLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const dLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.latitude * Math.PI) / 180) *
        Math.cos((point2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1.2;
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes * 60) % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateETA = useCallback(async () => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const stopCoordinates = {};
    for (const route of subscribedRoutes) {
      const firstStop = route.bus_stops[0];
      if (!firstStop?.name) {
        console.warn(`Invalid stop for route ${route.route_number}`);
        continue;
      }
      if (!firstStop.coordinates || !firstStop.coordinates.latitude) {
        const coords = await fetchCoordinates(firstStop.name);
        stopCoordinates[firstStop.name] = coords;
      } else {
        stopCoordinates[firstStop.name] = firstStop.coordinates;
      }
    }

    const updatedRoutes = await Promise.all(
      subscribedRoutes.map(async (route) => {
        let eta = 'No active trip';
        let delay = false;

        if (!route.bus_stops[0]?.name) {
          console.warn(`No valid stops for route ${route.route_number}`);
          return { ...route, eta, delay };
        }

        const trip = await fetchDriverTrip(route.route_number);
        const targetStop = route.bus_stops[0];
        const targetCoords = stopCoordinates[targetStop.name];

        if (trip && trip.currentLocation && targetCoords && targetCoords.latitude) {
          const location = {
            latitude: trip.currentLocation.latitude,
            longitude: trip.currentLocation.longitude,
          };
          const distance = getDistance(location, targetCoords);
          const speed = 25;
          const timeMinutes = (distance / speed) * 60;
          eta = formatTime(timeMinutes);

          const travelTimeMinutes = parseInt(route.travel_time) || 0;
          if (timeMinutes > travelTimeMinutes + 5 && route.notifications.alertDelay) {
            delay = true;
            setNotifications((prev) => {
              const exists = prev.find((n) => n.id === `delay-${route._id}` && !n.read);
              if (!exists) {
                return [
                  ...prev,
                  {
                    id: `delay-${route._id}`,
                    text: `Route ${route.route_number} is delayed by ~${Math.round(timeMinutes - travelTimeMinutes)} minutes.`,
                    read: false,
                  },
                ];
              }
              return prev;
            });
          }

          if (distance < 0.5 && route.notifications.alertArrival) {
            setNotifications((prev) => {
              const exists = prev.find((n) => n.id === `arrival-${route._id}` && !n.read);
              if (!exists) {
                return [
                  ...prev,
                  {
                    id: `arrival-${route._id}`,
                    text: `Bus ${route.route_number} is arriving at ${targetStop.name}.`,
                    read: false,
                  },
                ];
              }
              return prev;
            });
          }

          if (trip.crowdness === 'Full' && route.notifications.alertFullness) {
            setNotifications((prev) => {
              const exists = prev.find((n) => n.id === `fullness-${route._id}` && !n.read);
              if (!exists) {
                return [
                  ...prev,
                  {
                    id: `fullness-${route._id}`,
                    text: `Bus ${route.route_number} is currently full.`,
                    read: false,
                  },
                ];
              }
              return prev;
            });
          }
        } else if (route.selectedTime) {
          const [hours, minutes] = route.selectedTime.split(':').map(Number);
          const departureMinutes = hours * 60 + minutes;
          if (departureMinutes >= currentTime) {
            const timeUntilDeparture = departureMinutes - currentTime;
            eta = formatTime(timeUntilDeparture);
          } else {
            eta = 'Departed';
          }
        }

        // Only update if eta or delay has changed
        if (route.eta !== eta || route.delay !== delay) {
          return { ...route, eta, delay };
        }
        return route;
      })
    );

    // Only update state if there are actual changes
    const hasChanges = updatedRoutes.some((route, index) => {
      return (
        route.eta !== subscribedRoutes[index].eta ||
        route.delay !== subscribedRoutes[index].delay
      );
    });

    if (hasChanges) {
      setSubscribedRoutes(updatedRoutes);
    }
  }, [subscribedRoutes, coordinateCache]);

  const toggleSidebar = () => {
    console.log('Toggling sidebar, current state:', sidebarVisible);
    setSidebarVisible(!sidebarVisible);
    console.log('New sidebar state:', !sidebarVisible);
  };

  const handleMenuItemPress = (menuItem) => {
    setActiveMenuItem(menuItem);
    setSidebarVisible(false);
    switch (menuItem) {
      case 'home':
        navigation.navigate('HomeScreen');
        break;
      case 'journeyplanner':
        navigation.navigate('JourneyPlannerScreen');
        break;
      case 'subscription':
        navigation.navigate('RoutesScreen');
        break;
      case 'lost':
        navigation.navigate('LostFoundScreen');
        break;
      case 'settings':
        navigation.navigate('SettingsScreen');
        break;
      default:
        break;
    }
  };

  const handleSignOut = () => {
    setSidebarVisible(false);
    navigation.navigate('Onboarding');
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    fetchRouteSuggestions(text);
  };

  const subscribeToRoute = async (route, time) => {
    if (!time) {
      alert('Please select a departure time.');
      return;
    }
    if (!subscribedRoutes.find((r) => r._id === route._id)) {
      const newSubscription = {
        ...route,
        selectedTime: time,
        notifications: {
          enabled: true,
          timeRange: ['All Day'],
          alertDelay: true,
          alertArrival: true,
          alertFullness: true,
          mute: false,
        },
        eta: 'Calculating...',
        delay: false,
      };
      try {
        const response = await fetch(`${API_URL}/api/subscriptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.userId,
            route,
            selectedTime: time,
          }),
        });
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || 'Failed to save subscription');
        }
        setSubscribedRoutes((prev) => [...prev, newSubscription]);
        setNotifications((prev) => [
          ...prev,
          {
            id: `${route._id}-${Date.now()}`,
            text: `Subscribed to Route ${route.route_number} at ${time}.`,
            read: false,
          },
        ]);
      } catch (error) {
        console.error('Error saving subscription:', error);
        alert('Failed to subscribe to route.');
        return;
      }
    }
    setSearchQuery('');
    setShowSearchSuggestions(false);
    setModalVisible(false);
    setSelectedTime('');
  };

  const unsubscribeFromRoute = async (routeId) => {
    console.log('Attempting to unsubscribe route:', routeId);
    try {
      console.log(`Unsubscribing user ${user.userId} from route ${routeId}`);
      const response = await fetch(`${API_URL}/api/subscriptions/${user.userId}/${routeId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Raw response:', response);
      const result = await response.json();
      console.log('Unsubscribe response:', result);
      if (!result.success) {
        throw new Error(result.message || 'Failed to unsubscribe');
      }
      setSubscribedRoutes((prev) => {
        const newRoutes = prev.filter((route) => route._id !== routeId);
        console.log('Updated subscribed routes:', newRoutes);
        return newRoutes;
      });
      alert('Successfully unsubscribed from route.');
    } catch (error) {
      console.error('Error deleting subscription:', error.message);
      // Update UI even if API fails (fallback)
      setSubscribedRoutes((prev) => {
        const newRoutes = prev.filter((route) => route._id !== routeId);
        console.log('Fallback: Updated subscribed routes:', newRoutes);
        return newRoutes;
      });
      alert(`Failed to unsubscribe from server: ${error.message}. Route removed locally.`);
    }
  };

  const toggleNotification = useCallback((routeId) => {
    setSubscribedRoutes((prev) =>
      prev.map((route) =>
        route._id === routeId
          ? {
              ...route,
              notifications: {
                ...route.notifications,
                enabled: !route.notifications.enabled,
              },
            }
          : route
      )
    );
  }, []);

  const openNotificationPanel = (route) => {
    setSelectedRoute(route);
    setShowNotificationPanel(true);
  };

  const updateNotificationSettings = (settings) => {
    setSubscribedRoutes(
      subscribedRoutes.map((route) =>
        route._id === selectedRoute._id
          ? {
              ...route,
              notifications: {
                ...route.notifications,
                ...settings,
              },
            }
          : route
      )
    );
  };

  const markNotificationRead = (id) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const openRouteModal = (route) => {
    const fixedRoute = {
      ...route,
      bus_stops: fixBusStops(route.bus_stops),
    };
    setSelectedRoute(fixedRoute);
    setModalVisible(true);
    setSelectedTime('');
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => openRouteModal(item)}
    >
      <View style={styles.suggestionContent}>
        <MaterialIcons name="directions-bus" size={20} color="#1976d2" />
        <View style={styles.suggestionTextContainer}>
          <Text style={styles.suggestionTitle}>{item.route_number}</Text>
          <Text style={styles.suggestionSubtitle}>
            {item.from} → {item.to}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSubscribedRoute = ({ item }) => (
    <Animated.View style={[styles.routeCard, { opacity: fadeAnim }]}>
      <View style={styles.routeCardHeader}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeName}>{item.route_number}</Text>
          <Text style={styles.routePath}>
            {item.from} → {item.to}
          </Text>
          <Text style={styles.routePath}>Departure: {item.selectedTime}</Text>
        </View>
        <TouchableOpacity
          key={`notification-${item._id}`}
          style={styles.notificationButton}
          onPress={() => toggleNotification(item._id)}
        >
          <Ionicons
            name={item.notifications?.enabled ? 'notifications' : 'notifications-off'}
            size={22}
            color={item.notifications?.enabled ? '#1976d2' : '#A9A9A9'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.routeCardBody}>
        <View style={styles.etaContainer}>
          <MaterialIcons
            name="access-time"
            size={18}
            color={item.delay ? '#EF4444' : '#1976d2'}
          />
          <Text style={[styles.etaText, item.delay && styles.delayText]}>
            ETA: {item.eta}
          </Text>
        </View>
      </View>

      <View style={styles.routeCardFooter}>
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => openNotificationPanel(item)}
        >
          <Text style={styles.detailsButtonText}>Alert Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.unsubscribeButton}
          onPress={() => {
            console.log('Unsubscribe button pressed for route:', item._id);
            unsubscribeFromRoute(item._id);
          }}
        >
          <Ionicons name="close-circle" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
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
          onPress={() => setShowNotificationPanel(true)}
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

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={22} color="#1976d2" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search routes by number..."
            placeholderTextColor="#A8A8A8"
            value={searchQuery}
            onChangeText={handleSearch}
            accessibilityLabel="Search bus routes"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#A9A8A8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSearchSuggestions && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={routeSuggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
          />
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Subscribed Routes</Text>
        <View style={styles.routeCount}>
          <Text style={styles.routeCountText}>{subscribedRoutes.length}</Text>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Routes Yet</Text>
      <Text style={styles.emptyStateText}>
        Search for routes to subscribe and get real-time updates.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Sidebar
        visible={sidebarVisible}
        activeMenuItem={activeMenuItem}
        onClose={toggleSidebar}
        onMenuItemPress={handleMenuItemPress}
        onSignOut={handleSignOut}
      />

      <FlatList
        data={subscribedRoutes}
        renderItem={renderSubscribedRoute}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        extraData={subscribedRoutes}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedRoute?.route_number} Details
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              accessibilityLabel="Close modal"
            >
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {selectedRoute && (
            <Animated.View style={[styles.modalContent, { opacity: modalFadeAnim }]}>
              <View style={styles.routeSummaryCard}>
                <Text style={styles.routeSummaryTitle}>
                  {selectedRoute.from} → {selectedRoute.to}
                </Text>
                <Text style={styles.routeSummarySubtitle}>Stops:</Text>
                {selectedRoute.bus_stops?.length > 0 ? (
                  selectedRoute.bus_stops.map((stop, index) => (
                    <Text key={index} style={styles.routeSummaryPath}>
                      {index + 1}. {stop.name}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No stops available</Text>
                )}
                <Text style={styles.routeSummaryPath}>
                  Operator: {selectedRoute.operator || 'Unknown'}
                </Text>
                <Text style={styles.routeSummaryPath}>
                  Travel Time: {selectedRoute.travel_time || 'Unknown'}
                </Text>
              </View>

              <Text style={styles.sectionLabel}>Available Departures</Text>
              {selectedRoute.timings?.from_start?.departures?.length > 0 ? (
                <FlatList
                  data={selectedRoute.timings.from_start.departures}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.timeOption,
                        selectedTime === item && styles.selectedTimeOption,
                      ]}
                      onPress={() => setSelectedTime(item)}
                      accessibilityLabel={`Select departure time ${item}`}
                    >
                      <Text style={styles.timeOptionText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item}
                  contentContainerStyle={styles.timeOptionsList}
                  numColumns={3}
                />
              ) : (
                <Text style={styles.noDataText}>No departure times available</Text>
              )}

              <TouchableOpacity
                style={[
                  styles.subscribeButton,
                  !selectedTime && styles.disabledButton,
                ]}
                onPress={() => subscribeToRoute(selectedRoute, selectedTime)}
                disabled={!selectedTime}
                accessibilityLabel="Subscribe to route"
              >
                <LinearGradient
                  colors={['#1976d2', '#42a5f5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.subscribeButtonGradient}
                >
                  <Text style={styles.subscribeButtonText}>Subscribe</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </Modal>

      <Modal
        visible={showNotificationPanel}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotificationPanel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notificationPanel}>
            <View style={styles.notificationPanelHeader}>
              <Text style={styles.notificationPanelTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotificationPanel(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
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
                    {!notification.read && (
                      <TouchableOpacity onPress={() => markNotificationRead(notification.id)}>
                        <MaterialIcons name="check-circle" size={20} color="#1976d2" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.markAllReadButton}
                  onPress={() => setNotifications(notifications.map((n) => ({ ...n, read: true })))}
                >
                  <Text style={styles.markAllReadText}>Mark all as read</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.noNotificationsText}>No notifications</Text>
            )}

            {selectedRoute && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionLabel}>Notification Settings</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.settingLabel}>Enable Notifications</Text>
                  <Switch
                    value={selectedRoute.notifications?.enabled || false}
                    onValueChange={(value) =>
                      updateNotificationSettings({ enabled: value })
                    }
                    trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                    thumbColor={
                      selectedRoute.notifications?.enabled ? '#1976d2' : '#F9FAFB'
                    }
                  />
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>Alert Types</Text>

                <View style={styles.switchRow}>
                  <View style={styles.settingWithIcon}>
                    <MaterialIcons name="timer" size={20} color="#6B7280" />
                    <Text style={styles.settingLabel}>Delays</Text>
                  </View>
                  <Switch
                    value={selectedRoute.notifications?.alertDelay || false}
                    onValueChange={(value) =>
                      updateNotificationSettings({ alertDelay: value })
                    }
                    trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                    thumbColor={
                      selectedRoute.notifications?.alertDelay ? '#1976d2' : '#F9FAFB'
                    }
                    disabled={!selectedRoute.notifications?.enabled}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.settingWithIcon}>
                    <MaterialIcons name="directions-bus" size={20} color="#6B7280" />
                    <Text style={styles.settingLabel}>Arrivals</Text>
                  </View>
                  <Switch
                    value={selectedRoute.notifications?.alertArrival || false}
                    onValueChange={(value) =>
                      updateNotificationSettings({ alertArrival: value })
                    }
                    trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                    thumbColor={
                      selectedRoute.notifications?.alertArrival ? '#1976d2' : '#F9FAFB'
                    }
                    disabled={!selectedRoute.notifications?.enabled}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.settingWithIcon}>
                    <FontAwesome5 name="users" size={20} color="#6B7280" />
                    <Text style={styles.settingLabel}>Crowded Bus</Text>
                  </View>
                  <Switch
                    value={selectedRoute.notifications?.alertFullness || false}
                    onValueChange={(value) =>
                      updateNotificationSettings({ alertFullness: value })
                    }
                    trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
                    thumbColor={
                      selectedRoute.notifications?.alertFullness ? '#1976d2' : '#F9FAFB'
                    }
                    disabled={!selectedRoute.notifications?.enabled}
                  />
                </View>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => setShowNotificationPanel(false)}
                >
                  <Text style={styles.saveButtonText}>Save Settings</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    paddingBottom: 100,
  },
  headerContainer: {
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    zIndex: 1001,
    pointerEvents: 'box-none',
  },
  menuButton: {
    padding: 8,
    zIndex: 1002,
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
  notificationButton: {
    padding: 8,
    position: 'relative',
    zIndex: 1002,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1003,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 999,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 8,
    marginTop: -4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 998,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionTextContainer: {
    marginLeft: 12,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  suggestionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  routeCount: {
    backgroundColor: '#1976d2',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  routeCountText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 1,
  },
  routeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  routePath: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  notificationButton: {
    padding: 8,
    transform: [{ scale: 1 }],
    zIndex: 2,
  },
  routeCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 6,
  },
  delayText: {
    color: '#EF4444',
  },
  routeCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  detailsButton: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  detailsButtonText: {
    color: '#1976d2',
    fontWeight: '600',
    fontSize: 14,
  },
  unsubscribeButton: {
    padding: 6,
    zIndex: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  routeSummaryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  routeSummaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  routeSummarySubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  routeSummaryPath: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  timeOptionsList: {
    paddingBottom: 30,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  timeOption: {
    width: SCREEN_WIDTH / 4,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    margin: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  selectedTimeOption: {
    backgroundColor: '#BFDBFE',
    borderColor: '#1976d2',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
  },
  subscribeButton: {
    borderRadius: 12,
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  subscribeButtonGradient: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  notificationPanel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: SCREEN_WIDTH * 1.3,
  },
  notificationPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  notificationPanelTitle: {
    fontSize: 18,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 8,
  },
  settingWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    padding: 10,
  },
  noNotificationsText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    padding: 20,
  },
  notificationItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  notificationReadText: {
    color: '#6B7280',
  },
  markAllReadButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  markAllReadText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
});