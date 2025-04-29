import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  FlatList,
  Modal,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import Sidebar from '../components/Sidebar';
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
  Feather,
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { UserContext } from '../screens/UserContext';
import { useNavigation } from '@react-navigation/native';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function RoutesScreen() {
  const { user } = useContext(UserContext);
  const navigation = useNavigation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('routes');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [subscribedRoutes, setSubscribedRoutes] = useState([
    {
      id: '1',
      name: 'Route 42',
      from: 'Downtown',
      to: 'University',
      eta: '3 min',
      fullness: 'medium',
      notifications: {
        enabled: true,
        timeRange: ['7:00 AM', '8:00 AM'],
        alertDelay: true,
        alertArrival: true,
        alertFullness: false,
        mute: false,
      },
    },
    {
      id: '2',
      name: 'Blue Line',
      from: 'Central Station',
      to: 'Airport',
      eta: '12 min',
      fullness: 'low',
      notifications: {
        enabled: true,
        timeRange: ['All Day'],
        alertDelay: true,
        alertArrival: false,
        alertFullness: true,
        mute: false,
      },
    },
    {
      id: '3',
      name: 'Route 87',
      from: 'Park Avenue',
      to: 'Shopping Mall',
      eta: '7 min',
      fullness: 'high',
      notifications: {
        enabled: false,
        timeRange: ['5:00 PM', '6:30 PM'],
        alertDelay: true,
        alertArrival: true,
        alertFullness: true,
        mute: true,
      },
    },
  ]);

  const [recentSearches] = useState([
    { id: '4', name: 'Route 15', from: 'Market Street', to: 'Beach' },
    { id: '5', name: 'Express 99', from: 'Suburbs', to: 'City Center' },
    { id: '6', name: 'Red Line', from: 'North Station', to: 'South Station' },
  ]);

  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (user.role === 'driver' && !user.profileComplete) {
      navigation.replace('ProfileScreen');
    }
  }, [user, navigation]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
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
    navigation.navigate('Onboarding');
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    setShowSearchSuggestions(text.length > 0);
  };

  const subscribeToRoute = (route) => {
    if (!subscribedRoutes.find((r) => r.id === route.id)) {
      setSubscribedRoutes([
        ...subscribedRoutes,
        {
          ...route,
          eta: '15 min',
          fullness: 'low',
          notifications: {
            enabled: true,
            timeRange: ['All Day'],
            alertDelay: true,
            alertArrival: true,
            alertFullness: false,
            mute: false,
          },
        },
      ]);
    }
    setSearchQuery('');
    setShowSearchSuggestions(false);
  };

  const unsubscribeFromRoute = (routeId) => {
    setSubscribedRoutes(subscribedRoutes.filter((route) => route.id !== routeId));
  };

  const toggleNotification = (routeId) => {
    setSubscribedRoutes(
      subscribedRoutes.map((route) => {
        if (route.id === routeId) {
          return {
            ...route,
            notifications: {
              ...route.notifications,
              enabled: !route.notifications.enabled,
            },
          };
        }
        return route;
      })
    );
  };

  const openNotificationPanel = (route) => {
    setSelectedRoute(route);
    setShowNotificationPanel(true);
  };

  const updateNotificationSettings = (settings) => {
    setSubscribedRoutes(
      subscribedRoutes.map((route) => {
        if (route.id === selectedRoute.id) {
          return {
            ...route,
            notifications: {
              ...route.notifications,
              ...settings,
            },
          };
        }
        return route;
      })
    );
  };

  const getFullnessIcon = (fullness) => {
    switch (fullness) {
      case 'low':
        return <FontAwesome5 name="user" size={16} color="#4CAF50" />;
      case 'medium':
        return <FontAwesome5 name="user-friends" size={16} color="#FF9800" />;
      case 'high':
        return <FontAwesome5 name="users" size={16} color="#F44336" />;
      default:
        return <FontAwesome5 name="question" size={16} color="#999" />;
    }
  };

  const getFullnessText = (fullness) => {
    switch (fullness) {
      case 'low':
        return 'Not Crowded';
      case 'medium':
        return 'Moderately Full';
      case 'high':
        return 'Very Crowded';
      default:
        return 'Unknown';
    }
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => subscribeToRoute(item)}
    >
      <View style={styles.suggestionContent}>
        <MaterialIcons name="directions-bus" size={20} color="#5B37B7" />
        <View style={styles.suggestionTextContainer}>
          <Text style={styles.suggestionTitle}>{item.name}</Text>
          <Text style={styles.suggestionSubtitle}>{item.from} → {item.to}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.subscribeButton}
        onPress={() => subscribeToRoute(item)}
      >
        <Ionicons name="star-outline" size={20} color="#5B37B7" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSubscribedRoute = ({ item }) => (
    <Animated.View style={[styles.routeCard, { opacity: fadeAnim }]}>
      <View style={styles.routeCardHeader}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeName}>{item.name}</Text>
          <Text style={styles.routePath}>{item.from} → {item.to}</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => toggleNotification(item.id)}
        >
          <Ionicons
            name={item.notifications.enabled ? 'notifications' : 'notifications-off'}
            size={22}
            color={item.notifications.enabled ? '#5B37B7' : '#A9A9A9'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.routeCardBody}>
        <View style={styles.etaContainer}>
          <MaterialIcons name="access-time" size={18} color="#5B37B7" />
          <Text style={styles.etaText}>ETA: {item.eta}</Text>
        </View>
        <View style={styles.fullnessContainer}>
          {getFullnessIcon(item.fullness)}
          <Text
            style={[
              styles.fullnessText,
              {
                color:
                  item.fullness === 'low'
                    ? '#4CAF50'
                    : item.fullness === 'medium'
                    ? '#FF9800'
                    : '#F44336',
              },
            ]}
          >
            {getFullnessText(item.fullness)}
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
          onPress={() => unsubscribeFromRoute(item.id)}
        >
          <Ionicons name="close-circle" size={20} color="#FF5252" />
        </TouchableOpacity>
      </View>
    </Animated.View>
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
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>{subscribedRoutes.length}</Text>
          </View>
          <Ionicons name="notifications" size={22} color="#1976d2" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchContainer}>
          <LinearGradient
            colors={['#6A3DE8', '#5B37B7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.searchGradient}
          >
            <View style={styles.searchInputContainer}>
              <MaterialIcons name="search" size={22} color="#5B37B7" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search routes by number or stops..."
                placeholderTextColor="#A8A8A8"
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#A8A8A8" />
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </View>

        {showSearchSuggestions && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={recentSearches}
              renderItem={renderSuggestion}
              keyExtractor={(item) => item.id}
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

        {subscribedRoutes.length === 0 && (
          <View style={styles.emptyState}>
            <Image
              source={{ uri: 'https://via.placeholder.com/150' }}
              style={styles.emptyStateImage}
            />
            <Text style={styles.emptyStateTitle}>No Routes Yet</Text>
            <Text style={styles.emptyStateText}>
              Subscribe to routes to get real-time updates and set custom alerts.
            </Text>
            <TouchableOpacity style={styles.emptyStateButton}>
              <Text style={styles.emptyStateButtonText}>Find Routes</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={subscribedRoutes}
          renderItem={renderSubscribedRoute}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.subscribedRoutesList}
        />
      </ScrollView>

      {!showSearchSuggestions && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => {
            setSearchQuery('');
            handleSearch(' ');
          }}
        >
          <LinearGradient
            colors={['#6A3DE8', '#5B37B7']}
            style={styles.gradientButton}
          >
            <Ionicons name="add" size={30} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <Modal
        visible={showNotificationPanel}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotificationPanel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notificationPanel}>
            <View style={styles.notificationPanelHeader}>
              <Text style={styles.notificationPanelTitle}>
                Notification Settings
              </Text>
              <TouchableOpacity onPress={() => setShowNotificationPanel(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedRoute && (
              <>
                <View style={styles.routeSummary}>
                  <Text style={styles.routeSummaryTitle}>{selectedRoute.name}</Text>
                  <Text style={styles.routeSummaryPath}>
                    {selectedRoute.from} → {selectedRoute.to}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.switchRow}>
                  <Text style={styles.settingLabel}>Enable Notifications</Text>
                  <Switch
                    value={selectedRoute.notifications.enabled}
                    onValueChange={(value) =>
                      updateNotificationSettings({ enabled: value })
                    }
                    trackColor={{ false: '#E0E0E0', true: '#B9A0F8' }}
                    thumbColor={
                      selectedRoute.notifications.enabled ? '#5B37B7' : '#F4F4F4'
                    }
                  />
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>Alert Types</Text>

                <View style={styles.switchRow}>
                  <View style={styles.settingWithIcon}>
                    <MaterialIcons name="timer" size={20} color="#5B37B7" />
                    <Text style={styles.settingLabel}>Delays</Text>
                  </View>
                  <Switch
                    value={selectedRoute.notifications.alertDelay}
                    onValueChange={(value) =>
                      updateNotificationSettings({ alertDelay: value })
                    }
                    trackColor={{ false: '#E0E0E0', true: '#B9A0F8' }}
                    thumbColor={
                      selectedRoute.notifications.alertDelay ? '#5B37B7' : '#F4F4F4'
                    }
                    disabled={!selectedRoute.notifications.enabled}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.settingWithIcon}>
                    <MaterialIcons name="directions-bus" size={20} color="#5B37B7" />
                    <Text style={styles.settingLabel}>Arrivals</Text>
                  </View>
                  <Switch
                    value={selectedRoute.notifications.alertArrival}
                    onValueChange={(value) =>
                      updateNotificationSettings({ alertArrival: value })
                    }
                    trackColor={{ false: '#E0E0E0', true: '#B9A0F8' }}
                    thumbColor={
                      selectedRoute.notifications.alertArrival
                        ? '#5B37B7'
                        : '#F4F4F4'
                    }
                    disabled={!selectedRoute.notifications.enabled}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.settingWithIcon}>
                    <FontAwesome5 name="users" size={18} color="#5B37B7" />
                    <Text style={styles.settingLabel}>Crowded Bus</Text>
                  </View>
                  <Switch
                    value={selectedRoute.notifications.alertFullness}
                    onValueChange={(value) =>
                      updateNotificationSettings({ alertFullness: value })
                    }
                    trackColor={{ false: '#E0E0E0', true: '#B9A0F8' }}
                    thumbColor={
                      selectedRoute.notifications.alertFullness
                        ? '#5B37B7'
                        : '#F4F4F4'
                    }
                    disabled={!selectedRoute.notifications.enabled}
                  />
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>Time Settings</Text>

                <TouchableOpacity style={styles.timeRangeSelector}>
                  <View style={styles.settingWithIcon}>
                    <MaterialIcons name="access-time" size={20} color="#5B37B7" />
                    <Text style={styles.settingLabel}>Alert Time Range</Text>
                  </View>
                  <View style={styles.timeRangeValue}>
                    <Text style={styles.timeRangeText}>
                      {selectedRoute.notifications.timeRange.join(' - ')}
                    </Text>
                    <MaterialIcons
                      name="keyboard-arrow-right"
                      size={20}
                      color="#5B37B7"
                    />
                  </View>
                </TouchableOpacity>

                <View style={styles.divider} />

                <View style={styles.switchRow}>
                  <View style={styles.settingWithIcon}>
                    <Ionicons name="volume-mute" size={20} color="#5B37B7" />
                    <Text style={styles.settingLabel}>Mute for Today</Text>
                  </View>
                  <Switch
                    value={selectedRoute.notifications.mute}
                    onValueChange={(value) =>
                      updateNotificationSettings({ mute: value })
                    }
                    trackColor={{ false: '#E0E0E0', true: '#B9A0F8' }}
                    thumbColor={
                      selectedRoute.notifications.mute ? '#5B37B7' : '#F4F4F4'
                    }
                  />
                </View>

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
    backgroundColor: '#F9F9FB',
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
  contentContainer: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
  },
  searchGradient: {
    borderRadius: 12,
    padding: 2,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  suggestionsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 8,
    marginTop: -8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    color: '#333',
  },
  suggestionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  subscribeButton: {
    padding: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  routeCount: {
    backgroundColor: '#5B37B7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  routeCountText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  subscribedRoutesList: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  routeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    color: '#333',
  },
  routePath: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  notificationButton: {
    padding: 4,
  },
  routeCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  fullnessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullnessText: {
    fontSize: 14,
    marginLeft: 6,
  },
  routeCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  detailsButton: {
    backgroundColor: '#F0ECFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  detailsButtonText: {
    color: '#5B37B7',
    fontWeight: '600',
    fontSize: 14,
  },
  unsubscribeButton: {
    padding: 6,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  gradientButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#5B37B7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  notificationPanel: {
    backgroundColor: 'white',
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
    color: '#333',
  },
  routeSummary: {
    marginBottom: 16,
  },
  routeSummaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5B37B7',
  },
  routeSummaryPath: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  settingWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeRangeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeRangeValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeRangeText: {
    fontSize: 16,
    color: '#5B37B7',
    fontWeight: '600',
    marginRight: 4,
  },
  saveButton: {
    backgroundColor: '#5B37B7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyStateImage: {
    width: 120,
    height: 120,
    marginBottom: 24,
    borderRadius: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#5B37B7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});