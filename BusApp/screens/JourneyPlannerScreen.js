import React, { useState, useEffect, useContext, useRef } from 'react';
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
  Modal,
  Alert,
} from 'react-native';
import { FontAwesome5, MaterialIcons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import LottieView from 'lottie-react-native';
import Sidebar from '../components/Sidebar';
import { UserContext } from '../screens/UserContext';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { generateTravelTips, generateAlternateRoutes } from '../src/utils/geminiApi';

const { width, height } = Dimensions.get('window');

const API_URL = 'http://192.168.11.179:3000';
const GEOAPIFY_API_KEY = '7b3757a8e0994af49ee07c57f01d616f';

const THEME_COLOR = '#1976d2';
const ACCENT_COLOR = '#FF9800';
const SUCCESS_COLOR = '#4CAF50';
const DANGER_COLOR = '#F44336';
const WARNING_COLOR = '#FFC107';

const JourneyPlannerScreen = () => {
  const { user } = useContext(UserContext);
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const journeyAnimationRef = useRef(null);

  // States
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [journeyPlan, setJourneyPlan] = useState(null);
  const [alternateRoutes, setAlternateRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0); // 0 for primary, 1+ for alternates
  const [currentLocation, setCurrentLocation] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('journey');
  const [trackingJourney, setTrackingJourney] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showLiveTrackingModal, setShowLiveTrackingModal] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState('');
  const [showTravelTips, setShowTravelTips] = useState(false);
  const [travelTips, setTravelTips] = useState([
    'Book tickets in advance during peak hours',
    'Keep small change ready for bus fare',
  ]);
  const [detailedTravelTips, setDetailedTravelTips] = useState([]);
  const [routeProgress, setRouteProgress] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

  // Animated values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(-300))[0];
  const progressAnim = useState(new Animated.Value(0))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    if (user.role === 'driver' && !user.profileComplete) {
      navigation.replace('ProfileScreen');
    }
  }, [user, navigation]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permission to access location was denied');
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        });

        // Fetch generic travel tips based on current location
        const tips = await generateTravelTips('Current Location', 'Nearby Destinations', {});
        setTravelTips(tips);
      } catch (error) {
        setLocationError('Failed to fetch location');
      }
    })();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (trackingJourney && journeyPlan) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      const interval = setInterval(() => {
        setRouteProgress(prev => {
          const newProgress = prev + 0.01;
          Animated.timing(progressAnim, {
            toValue: newProgress > 1 ? 1 : newProgress,
            duration: 500,
            useNativeDriver: false,
          }).start();

          const totalMinutes = journeyPlan.totalMinutes;
          const remainingPercentage = 1 - newProgress;
          const remainingMinutes = Math.round(remainingPercentage * totalMinutes);
          if (remainingMinutes > 60) {
            const hours = Math.floor(remainingMinutes / 60);
            const minutes = remainingMinutes % 60;
            setEstimatedTimeRemaining(`${hours}h ${minutes}m`);
          } else {
            setEstimatedTimeRemaining(`${remainingMinutes}m`);
          }

          if (newProgress >= 1) {
            clearInterval(interval);
          }
          return newProgress > 1 ? 1 : newProgress;
        });
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [trackingJourney, journeyPlan]);

  useEffect(() => {
    if (showTravelTips) {
      const fetchDetailedTips = async () => {
        const tips = await generateTravelTips(
          fromLocation || 'Current Location',
          toLocation || 'Nearby Destinations',
          journeyPlan || {}
        );
        setDetailedTravelTips(tips);
      };
      fetchDetailedTips();
    }
  }, [showTravelTips, fromLocation, toLocation, journeyPlan]);

  const toggleSidebar = () => {
    Animated.timing(slideAnim, {
      toValue: sidebarVisible ? -300 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setSidebarVisible(!sidebarVisible);
  };

  const handleMenuItemPress = (menuItem) => {
    setActiveMenuItem(menuItem);
    toggleSidebar();
  };

  const handleSignOut = () => {
    toggleSidebar();
    navigation.navigate('Onboarding');
  };

  const geocodeLocation = async (query) => {
    try {
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_API_KEY}&limit=1&format=json&lang=en&bias=proximity:77.7172,11.3410`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.results.length > 0) {
        const { lat, lon } = data.results[0];
        return { latitude: lat, longitude: lon };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const planJourney = async () => {
    if (!fromLocation || !toLocation) {
      Alert.alert('Missing Information', 'Please enter both starting point and destination');
      return;
    }

    try {
      const encodedFrom = encodeURIComponent(fromLocation.trim());
      const encodedTo = encodeURIComponent(toLocation.trim());

      console.log(`Fetching route from ${encodedFrom} to ${encodedTo}`);
      const response = await fetch(
        `${API_URL}/api/long-distance/route/${encodedFrom}/${encodedTo}`
      );
      const data = await response.json();

      console.log('API Response:', data);

      if (!response.ok || data.message) {
        Alert.alert('Route Not Found', data.message || 'No routes found for this journey. Please try different locations.');
        return;
      }

      if (data.length === 0) {
        Alert.alert('Route Not Found', 'No routes found for this journey. Please try different locations.');
        return;
      }

      const route = data[0];
      const locations = [route.from, ...route.bus_stops, route.to];
      const coordinatesPromises = locations.map(location => geocodeLocation(location));
      const coordinatesResults = await Promise.all(coordinatesPromises);
      const coordinates = coordinatesResults.filter(coord => coord !== null);

      if (coordinates.length < 2) {
        Alert.alert('Error', 'Unable to geocode locations for mapping. Please try again.');
        return;
      }

      const [hours, minutes] = route.travel_time.split(' ')[0].split(':').map(Number);
      const totalMinutes = hours * 60 + minutes;

      const primaryJourneyPlan = {
        segments: [{
          from: route.from,
          to: route.to,
          busNumber: 'LD-001',
          type: 'Long-Distance',
          duration: route.travel_time,
          eta: route.departures_from_start[0] || 'N/A',
          price: '₹500',
          occupancy: '50%',
          amenities: ['AC', 'WiFi'],
          coordinates,
          stops: locations,
          mode: 'Bus',
          reason: 'Primary route provided by the system',
        }],
        totalDuration: route.travel_time,
        totalPrice: '₹500',
        transfers: 0,
        carbonFootprint: '5.0 kg CO₂',
        totalMinutes,
        departures: route.departures_from_start,
      };

      // Fetch alternate routes
      const alternateRoutesRaw = await generateAlternateRoutes(fromLocation, toLocation, primaryJourneyPlan);
      const alternateJourneyPlans = await Promise.all(
        alternateRoutesRaw.map(async (altRoute, index) => {
          const altLocations = [altRoute.from, ...(altRoute.stops || []), altRoute.to];
          const altCoordinatesPromises = altLocations.map(location => geocodeLocation(location));
          const altCoordinatesResults = await Promise.all(altCoordinatesPromises);
          const altCoordinates = altCoordinatesResults.filter(coord => coord !== null);

          if (altCoordinates.length < 2) {
            return null; // Skip invalid routes
          }

          const [altHours, altMinutes] = altRoute.travelTime.replace('h ', ':').replace('m', '').split(':').map(Number);
          const altTotalMinutes = altHours * 60 + altMinutes;

          return {
            segments: [{
              from: altRoute.from,
              to: altRoute.to,
              busNumber: `ALT-${index + 1}`,
              type: altRoute.mode,
              duration: altRoute.travelTime,
              eta: 'N/A', // Placeholder, can be enhanced with real data
              price: '₹550', // Placeholder, adjust as needed
              occupancy: '45%',
              amenities: ['AC'],
              coordinates: altCoordinates,
              stops: altLocations,
              mode: altRoute.mode,
              reason: altRoute.reason,
            }],
            totalDuration: altRoute.travelTime,
            totalPrice: '₹550',
            transfers: altRoute.stops.length,
            carbonFootprint: '4.5 kg CO₂',
            totalMinutes: altTotalMinutes,
            departures: [], // Placeholder
          };
        })
      );

      const validAlternateRoutes = alternateJourneyPlans.filter(route => route !== null);

      setJourneyPlan(primaryJourneyPlan);
      setAlternateRoutes(validAlternateRoutes);
      setSelectedRouteIndex(0);

      // Fetch AI-generated travel tips
      const tips = await generateTravelTips(fromLocation, toLocation, {
        duration: route.travel_time,
        stops: route.bus_stops,
      });
      setTravelTips(tips);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Plan Journey Error:', error);
      Alert.alert('Error', 'Failed to plan journey. Please check your connection and try again.');
    }
  };

  const selectRoute = (index) => {
    setSelectedRouteIndex(index);
    const selectedJourney = index === 0 ? journeyPlan : alternateRoutes[index - 1];
    setEstimatedTimeRemaining(selectedJourney.totalDuration);
    if (mapRef.current && selectedJourney?.segments?.[0]?.coordinates) {
      mapRef.current.fitToCoordinates(selectedJourney.segments[0].coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const startJourney = () => {
    setTrackingJourney(true);
    setShowStartScreen(false);

    if (journeyAnimationRef.current) {
      journeyAnimationRef.current.play();
    }

    const selectedJourney = selectedRouteIndex === 0 ? journeyPlan : alternateRoutes[selectedRouteIndex - 1];
    if (mapRef.current && selectedJourney?.segments?.[0]?.coordinates) {
      mapRef.current.fitToCoordinates(selectedJourney.segments[0].coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }

    setEstimatedTimeRemaining(selectedJourney.totalDuration);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const showBusSchedule = () => {
    const selectedJourney = selectedRouteIndex === 0 ? journeyPlan : alternateRoutes[selectedRouteIndex - 1];
    setSelectedRoute(selectedJourney);
    setShowScheduleModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        "Every journey begins with a single step – let's make yours smoother."
      </Text>
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => {
          setShowStartScreen(false);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
      >
        <LinearGradient
          colors={[THEME_COLOR, '#0d47a1']}
          style={styles.gradientButton}
        >
          <Text style={styles.startButtonText}>Start Planning</Text>
          <MaterialIcons name="navigate-next" size={22} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderPlanner = () => (
    <View style={styles.plannerContainer}>
      <View style={styles.locationInputsContainer}>
        <View style={styles.inputGroup}>
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
            style={styles.swapButton}
            onPress={() => {
              const temp = fromLocation;
              setFromLocation(toLocation);
              setToLocation(temp);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <MaterialIcons name="swap-vert" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.searchButton, (!fromLocation || !toLocation) && styles.disabledButton]}
          onPress={planJourney}
          disabled={!fromLocation || !toLocation}
        >
          <LinearGradient
            colors={(!fromLocation || !toLocation) ? ['#cccccc', '#aaaaaa'] : [THEME_COLOR, '#0d47a1']}
            style={styles.gradientButton}
          >
            <Text style={styles.searchButtonText}>Plan Journey</Text>
            <MaterialIcons name="directions-bus" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {currentLocation && (
        <View style={styles.miniMapContainer}>
          <Text style={styles.sectionTitle}>Your Location</Text>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.miniMap}
            region={currentLocation}
            showsUserLocation={true}
            showsMyLocationButton={true}
            scrollEnabled={true}
            zoomEnabled={true}
          />
        </View>
      )}

      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Travel Tips</Text>
        {travelTips.map((tip, index) => (
          <Text key={index} style={styles.tipText}>• {tip}</Text>
        ))}
        <TouchableOpacity
          style={styles.showMoreTips}
          onPress={() => setShowTravelTips(true)}
        >
          <Text style={styles.showMoreTipsText}>Show More Tips</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderJourneyPlan = () => {
    const selectedJourney = selectedRouteIndex === 0 ? journeyPlan : alternateRoutes[selectedRouteIndex - 1];

    return (
      <View style={styles.journeyContainer}>
        <View style={styles.routeSelectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.routeButton, selectedRouteIndex === 0 && styles.activeRouteButton]}
              onPress={() => selectRoute(0)}
            >
              <Text style={[styles.routeButtonText, selectedRouteIndex === 0 && styles.activeRouteButtonText]}>
                Primary Route ({journeyPlan?.totalDuration})
              </Text>
            </TouchableOpacity>
            {alternateRoutes.map((route, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.routeButton, selectedRouteIndex === index + 1 && styles.activeRouteButton]}
                onPress={() => selectRoute(index + 1)}
              >
                <Text style={[styles.routeButtonText, selectedRouteIndex === index + 1 && styles.activeRouteButtonText]}>
                  Alternate {index + 1} ({route.totalDuration})
                </Text>
                <Text style={styles.routeReason}>{route.segments[0].reason}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.mapContainer}>
          {currentLocation && (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={currentLocation}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {selectedJourney?.segments?.[0]?.coordinates?.map((coord, index) => (
                <Marker
                  key={index}
                  coordinate={coord}
                  title={selectedJourney.segments[0].stops[index]}
                >
                  <View style={[
                    styles.markerContainer,
                    index === 0 && trackingJourney ? styles.activeMarker : {}
                  ]}>
                    {index === 0 ? (
                      <MaterialIcons name="directions-bus" size={18} color="#fff" />
                    ) : (
                      <MaterialIcons name="location-on" size={18} color="#fff" />
                    )}
                  </View>
                </Marker>
              ))}
              {selectedJourney?.segments?.[0]?.coordinates && (
                <Polyline
                  coordinates={selectedJourney.segments[0].coordinates}
                  strokeColor={trackingJourney ? ACCENT_COLOR : THEME_COLOR}
                  strokeWidth={trackingJourney ? 6 : 4}
                />
              )}
            </MapView>
          )}
          {locationError && (
            <Text style={styles.errorText}>{locationError}</Text>
          )}

          {trackingJourney && (
            <View style={styles.liveTrackingOverlay}>
              <Animated.View style={[styles.pulseIndicator, { transform: [{ scale: pulseAnim }] }]}>
                <MaterialCommunityIcons name="access-point" size={16} color="#fff" />
              </Animated.View>
              <Text style={styles.liveText}>LIVE</Text>
              <TouchableOpacity
                style={styles.trackingDetailButton}
                onPress={() => setShowLiveTrackingModal(true)}
              >
                <Text style={styles.trackingDetailText}>Details</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.journeySummaryContainer}>
          <View style={styles.journeyHeaderContainer}>
            <View>
              <Text style={styles.journeyTitle}>{selectedJourney.segments[0].from} → {selectedJourney.segments[0].to}</Text>
              <View style={styles.journeyStats}>
                <MaterialIcons name="access-time" size={14} color="#555" />
                <Text style={styles.journeyStatText}>{selectedJourney.totalDuration}</Text>
                <MaterialIcons name="multiple-stop" size={14} color="#555" />
                <Text style={styles.journeyStatText}>{selectedJourney.transfers} transfers</Text>
                <MaterialIcons name="account-balance-wallet" size={14} color="#555" />
                <Text style={styles.journeyStatText}>{selectedJourney.totalPrice}</Text>
              </View>
            </View>

            {!trackingJourney ? (
              <TouchableOpacity
                style={styles.startJourneyButtonSmall}
                onPress={startJourney}
              >
                <Text style={styles.startJourneyButtonText}>Start</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.etaContainer}>
                <Text style={styles.etaLabel}>ETA</Text>
                <Text style={styles.etaTime}>{estimatedTimeRemaining}</Text>
              </View>
            )}
          </View>

          {trackingJourney && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressStart}>{selectedJourney.segments[0].from}</Text>
                <Text style={styles.progressEnd}>{selectedJourney.segments[0].to}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.roadmapContainer}>
          <Text style={styles.roadmapTitle}>Your Journey Roadmap</Text>
          <ScrollView style={styles.roadmap}>
            {selectedJourney.segments.map((segment, index) => (
              <View
                key={index}
                style={[
                  styles.segment,
                  trackingJourney && index === currentSegmentIndex && styles.activeSegment,
                ]}
              >
                <View style={styles.segmentHeader}>
                  <View style={styles.segmentTitleContainer}>
                    <View style={styles.startDot}>
                      <MaterialIcons name="trip-origin" size={16} color={THEME_COLOR} />
                    </View>
                    <View>
                      <Text style={styles.segmentTitle}>
                        {segment.from} → {segment.to}
                      </Text>
                      <View style={styles.segmentBadges}>
                        <View style={[styles.badge, styles.typeBadge]}>
                          <Text style={styles.badgeText}>{segment.type}</Text>
                        </View>
                        {segment.amenities.map((amenity, i) => (
                          <View key={i} style={[styles.badge, styles.amenityBadge]}>
                            <Text style={styles.badgeText}>{amenity}</Text>
                          </View>
                        ))}
                      </View>
                      {segment.reason && (
                        <Text style={styles.segmentReason}>{segment.reason}</Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.busNumberButton}
                    onPress={() => showBusSchedule()}
                  >
                    <Text style={styles.busNumber}>{segment.mode} {segment.busNumber}</Text>
                    <MaterialIcons name="schedule" size={14} color={THEME_COLOR} />
                  </TouchableOpacity>
                </View>

                <View style={styles.segmentDetails}>
                  <View style={styles.segmentDetail}>
                    <MaterialIcons name="access-time" size={14} color="#555" />
                    <Text style={styles.segmentInfo}>{segment.duration}</Text>
                  </View>
                  <View style={styles.segmentDetail}>
                    <MaterialIcons name="attach-money" size={14} color="#555" />
                    <Text style={styles.segmentInfo}>{segment.price}</Text>
                  </View>
                  <View style={styles.segmentDetail}>
                    <MaterialIcons name="people" size={14} color="#555" />
                    <Text style={styles.segmentInfo}>Occupancy: {segment.occupancy}</Text>
                  </View>
                </View>

                <View style={styles.stopsContainer}>
                  <Text style={styles.stopsTitle}>Stops:</Text>
                  <View style={styles.stopsList}>
                    {segment.stops.map((stop, i) => (
                      <View key={i} style={styles.stopItem}>
                        <View style={styles.stopDot} />
                        <Text style={styles.stopText}>{stop}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.actionBar}>
          <View style={styles.journeyInfoContainer}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="leaf" size={18} color="#4CAF50" />
              <Text style={styles.infoText}>{selectedJourney.carbonFootprint}</Text>
            </View>
          </View>

          {!trackingJourney && (
            <TouchableOpacity
              style={styles.startJourneyButton}
              onPress={startJourney}
            >
              <LinearGradient
                colors={[SUCCESS_COLOR, '#2E7D32']}
                style={styles.gradientButton}
              >
                <Text style={styles.startJourneyButtonText}>Let's Start the Journey</Text>
                <MaterialIcons name="directions" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
          <Feather name="menu" size={24} color={THEME_COLOR} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <FontAwesome5 name="bus" size={18} color={THEME_COLOR} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Journey Planner</Text>
        </View>
        <TouchableOpacity style={styles.headerActionButton}>
          <MaterialIcons name="favorite" size={24} color={THEME_COLOR} />
        </TouchableOpacity>
      </View>

      {showStartScreen
        ? renderStartScreen()
        : journeyPlan
        ? renderJourneyPlan()
        : renderPlanner()}

      <Sidebar
        visible={sidebarVisible}
        activeMenuItem={activeMenuItem}
        onClose={toggleSidebar}
        onMenuItemPress={handleMenuItemPress}
        onSignOut={handleSignOut}
      />

      <Modal
        visible={showScheduleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bus Schedule</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.scheduleList}>
              {selectedRoute?.departures?.map((departure, index) => (
                <View key={index} style={styles.scheduleItem}>
                  <View style={styles.scheduleTimes}>
                    <View style={styles.scheduleTimeBlock}>
                      <Text style={styles.scheduleTimeLabel}>Departure</Text>
                      <Text style={styles.scheduleTime}>{departure}</Text>
                    </View>
                    <MaterialIcons name="arrow-forward" size={20} color="#777" />
                    <View style={styles.scheduleTimeBlock}>
                      <Text style={styles.scheduleTimeLabel}>Arrival</Text>
                      <Text style={styles.scheduleTime}>N/A</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.scheduleBookButton}>
                    <Text style={styles.scheduleBookText}>Book</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All Schedules</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLiveTrackingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLiveTrackingModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Live Journey Tracking</Text>
              <TouchableOpacity onPress={() => setShowLiveTrackingModal(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.liveTrackingContent}>
              <LottieView
                ref={journeyAnimationRef}
                source={require('../assets/animations/journey.json')}
                autoPlay
                loop
                style={styles.liveAnimation}
              />

              <View style={styles.liveTrackingInfo}>
                <View style={styles.liveTrackingSegment}>
                  <Text style={styles.liveTrackingTitle}>Current Segment</Text>
                  <Text style={styles.liveTrackingSegmentName}>
                    {selectedRoute?.segments[0]?.from} → {selectedRoute?.segments[0]?.to}
                  </Text>
                  <Text style={styles.liveTrackingBusInfo}>
                    {selectedRoute?.segments[0]?.mode} {selectedRoute?.segments[0]?.busNumber} ({selectedRoute?.segments[0]?.type})
                  </Text>
                </View>

                <View style={styles.liveTrackingStats}>
                  <View style={styles.liveTrackingStat}>
                    <MaterialIcons name="access-time" size={16} color="#555" />
                    <Text style={styles.liveStatLabel}>ETA:</Text>
                    <Text style={styles.liveStatValue}>{estimatedTimeRemaining}</Text>
                  </View>

                  <View style={styles.liveTrackingStat}>
                    <MaterialIcons name="speed" size={16} color="#555" />
                    <Text style={styles.liveStatLabel}>Speed:</Text>
                    <Text style={styles.liveStatValue}>48 km/h</Text>
                  </View>

                  <View style={styles.liveTrackingStat}>
                    <MaterialIcons name="location-on" size={16} color="#555" />
                    <Text style={styles.liveStatLabel}>Next Stop:</Text>
                    <Text style={styles.liveStatValue}>
                      {selectedRoute?.segments[0]?.stops[1] || 'Final Destination'}
                    </Text>
                  </View>
                </View>

                <View style={styles.liveNotifications}>
                  <View style={styles.notificationItem}>
                    <MaterialIcons name="notifications" size={16} color={WARNING_COLOR} />
                    <Text style={styles.notificationText}>Arrival in 5 minutes at next stop</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.shareJourneyButton}>
                <LinearGradient
                  colors={[THEME_COLOR, '#0d47a1']}
                  style={styles.gradientButton}
                >
                  <Text style={styles.shareJourneyText}>Share My Journey</Text>
                  <MaterialIcons name="share" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTravelTips}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTravelTips(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Travel Tips</Text>
              <TouchableOpacity onPress={() => setShowTravelTips(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tipsScrollView}>
              <View style={styles.tipCategory}>
                <Text style={styles.tipCategoryTitle}>Journey-Specific Tips</Text>
                {detailedTravelTips.map((tip, index) => (
                  <View key={index} style={styles.tipItem}>
                    <MaterialIcons name="lightbulb-outline" size={16} color={THEME_COLOR} />
                    <Text style={styles.tipItemText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuButton: {
    padding: 4,
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
    fontWeight: '600',
    color: '#333',
  },
  headerActionButton: {
    padding: 4,
  },
  startScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  animation: {
    width: 300,
    height: 300,
  },
  quote: {
    fontSize: 16,
    color: '#555',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 24,
  },
  startButton: {
    width: '80%',
    marginTop: 20,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  plannerContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  locationInputsContainer: {
    marginBottom: 16,
  },
  inputGroup: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
    marginBottom: 4,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  swapButton: {
    position: 'absolute',
    right: -10,
    top: '50%',
    backgroundColor: '#1976d2',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  searchButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.7,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  miniMapContainer: {
    marginBottom: 16,
  },
  miniMap: {
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tipsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  showMoreTips: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  showMoreTipsText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '500',
  },
  journeyContainer: {
    flex: 1,
  },
  routeSelectorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  routeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  activeRouteButton: {
    backgroundColor: '#1976d2',
  },
  routeButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  activeRouteButtonText: {
    color: '#fff',
  },
  routeReason: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  mapContainer: {
    height: height * 0.3,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  errorText: {
    position: 'absolute',
    top: '50%',
    left: 16,
    right: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
    color: '#fff',
    padding: 8,
    borderRadius: 4,
  },
  liveTrackingOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pulseIndicator: {
    backgroundColor: '#F44336',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  liveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  trackingDetailButton: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trackingDetailText: {
    color: '#fff',
    fontSize: 12,
  },
  journeySummaryContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  journeyHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journeyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  journeyStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  journeyStatText: {
    fontSize: 14,
    color: '#555',
    marginRight: 12,
    marginLeft: 4,
  },
  startJourneyButtonSmall: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  startJourneyButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  etaContainer: {
    alignItems: 'center',
  },
  etaLabel: {
    fontSize: 12,
    color: '#777',
  },
  etaTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressStart: {
    fontSize: 12,
    color: '#777',
  },
  progressEnd: {
    fontSize: 12,
    color: '#777',
    textAlign: 'right',
  },
  roadmapContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  roadmapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  roadmap: {
    flex: 1,
  },
  segment: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activeSegment: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  segmentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  startDot: {
    marginRight: 8,
    marginTop: 2,
  },
  segmentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  segmentBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  typeBadge: {
    backgroundColor: '#e3f2fd',
  },
  amenityBadge: {
    backgroundColor: '#e8f5e9',
  },
  badgeText: {
    fontSize: 12,
    color: '#555',
  },
  segmentReason: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  busNumberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  buserylNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1976d2',
    marginRight: 4,
  },
  segmentDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  segmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  segmentInfo: {
    fontSize: 14,
    color: '#555',
    marginLeft: 4,
  },
  stopsContainer: {
    marginBottom: 8,
  },
  stopsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 4,
  },
  stopsList: {
    paddingLeft: 8,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stopDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#777',
    marginRight: 8,
  },
  stopText: {
    fontSize: 14,
    color: '#555',
  },
  actionBar: {
    backgroundColor: '#fff',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  journeyInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 4,
  },
  startJourneyButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scheduleList: {
    padding: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  scheduleTimes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleTimeBlock: {
    marginHorizontal: 12,
  },
  scheduleTimeLabel: {
    fontSize: 12,
    color: '#777',
  },
  scheduleTime: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  scheduleBookButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  scheduleBookText: {
    color: '#fff',
    fontWeight: '500',
  },
  viewAllButton: {
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  viewAllText: {
    color: '#1976d2',
    fontSize: 16,
    fontWeight: '500',
  },
  liveTrackingContent: {
    padding: 16,
  },
  liveAnimation: {
    width: '100%',
    height: 150,
  },
  liveTrackingInfo: {
    marginVertical: 16,
  },
  liveTrackingSegment: {
    marginBottom: 16,
  },
  liveTrackingTitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 4,
  },
  liveTrackingSegmentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  liveTrackingBusInfo: {
    fontSize: 14,
    color: '#1976d2',
  },
  liveTrackingStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  liveTrackingStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  liveStatLabel: {
    fontSize: 14,
    color: '#555',
    marginLeft: 4,
    marginRight: 4,
  },
  liveStatValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  liveNotifications: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
  },
  shareJourneyButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 16,
  },
  shareJourneyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  tipsScrollView: {
    padding: 16,
  },
  tipCategory: {
    marginBottom: 20,
  },
  tipCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipItemText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 12,
    flex: 1,
  },
  markerContainer: {
    backgroundColor: '#1976d2',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  activeMarker: {
    backgroundColor: '#FF9800',
    transform: [{ scale: 1.2 }],
  },
});

export default JourneyPlannerScreen;