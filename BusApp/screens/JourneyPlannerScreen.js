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
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
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
  const [detailedTravelTips, setDetailedTravelTips] = useState([]);
  const [routeProgress, setRouteProgress] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
  const [isRoadmapFullScreen, setIsRoadmapFullScreen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({
    journeySpecific: true,
    general: true,
  });

  // Animated values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(-300))[0];
  const progressAnim = useState(new Animated.Value(0))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];
  const cardScaleAnims = detailedTravelTips.map(() => new Animated.Value(1));

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

      const alternateRoutesRaw = await generateAlternateRoutes(fromLocation, toLocation, primaryJourneyPlan);
      const alternateJourneyPlans = await Promise.all(
        alternateRoutesRaw.map(async (altRoute, index) => {
          const altLocations = [altRoute.from, ...(altRoute.stops || []), altRoute.to];
          const altCoordinatesPromises = altLocations.map(location => geocodeLocation(location));
          const altCoordinatesResults = await Promise.all(altCoordinatesPromises);
          const altCoordinates = altCoordinatesResults.filter(coord => coord !== null);

          if (altCoordinates.length < 2) {
            return null;
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
              eta: 'N/A',
              price: '₹550',
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
            departures: [],
          };
        })
      );

      const validAlternateRoutes = alternateJourneyPlans.filter(route => route !== null);

      setJourneyPlan(primaryJourneyPlan);
      setAlternateRoutes(validAlternateRoutes);
      setSelectedRouteIndex(0);

      const tips = await generateTravelTips(fromLocation, toLocation, {
        duration: route.travel_time,
        stops: route.bus_stops,
      });
      setDetailedTravelTips(tips);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Plan Journey Error:', error);
      Alert.alert('Error', 'Failed to plan journey. Please check your connection and try again.');
    }
  };

  const selectRoute = (index) => {
    setSelectedRouteIndex(index);
    const selectedJourney = index === 0 ? journeyPlan : alternateRoutes[index - 1];
    if (selectedJourney) {
      setEstimatedTimeRemaining(selectedJourney.totalDuration);
      if (mapRef.current && selectedJourney?.segments?.[0]?.coordinates) {
        mapRef.current.fitToCoordinates(selectedJourney.segments[0].coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const startJourney = () => {
    const selectedJourney = selectedRouteIndex === 0 ? journeyPlan : alternateRoutes[selectedRouteIndex - 1];
    if (!selectedJourney) return;

    setTrackingJourney(true);
    setShowStartScreen(false);

    if (journeyAnimationRef.current) {
      journeyAnimationRef.current.play();
    }

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
    if (selectedJourney) {
      setSelectedRoute(selectedJourney);
      setShowScheduleModal(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const toggleRoadmapModal = () => {
    setShowRoadmapModal(!showRoadmapModal);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const toggleRoadmapFullScreen = () => {
    setIsRoadmapFullScreen(!isRoadmapFullScreen);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const animateCardPressIn = (index) => {
    Animated.spring(cardScaleAnims[index], {
      toValue: 0.95,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const animateCardPressOut = (index) => {
    Animated.spring(cardScaleAnims[index], {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
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
    </View>
  );

  const renderJourneyPlan = () => {
    const selectedJourney = selectedRouteIndex === 0 ? journeyPlan : alternateRoutes[selectedRouteIndex - 1];

    if (!selectedJourney) {
      return (
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackText}>No journey selected. Please plan a journey first.</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowStartScreen(true)}
          >
            <LinearGradient
              colors={[THEME_COLOR, '#0d47a1']}
              style={styles.gradientButton}
            >
              <Text style={styles.backButtonText}>Back to Planner</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.journeyContainer}>
        <View style={styles.routeSelectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.routeButton, selectedRouteIndex === 0 && styles.activeRouteButton]}
              onPress={() => selectRoute(0)}
            >
              <Text style={[styles.routeButtonText, selectedRouteIndex === 0 && styles.activeRouteButtonText]}>
                Primary Route ({journeyPlan?.totalDuration || 'N/A'})
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
              {selectedJourney.segments[0].coordinates?.map((coord, index) => (
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
              {selectedJourney.segments[0].coordinates && (
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
              <Text style={styles.journeyTitle}>
                {selectedJourney.segments[0].from} → {selectedJourney.segments[0].to}
              </Text>
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

        <View style={styles.actionBar}>
          <View style={styles.journeyInfoContainer}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="leaf" size={18} color="#4CAF50" />
              <Text style={styles.infoText}>{selectedJourney.carbonFootprint}</Text>
            </View>
            <TouchableOpacity
              style={styles.roadmapButton}
              onPress={toggleRoadmapModal}
            >
              <LinearGradient
                colors={[THEME_COLOR, '#0d47a1']}
                style={styles.gradientButtonSmall}
              >
                <MaterialIcons name="map" size={16} color="#fff" />
                <Text style={styles.roadmapButtonText}>View Roadmap</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {!trackingJourney && (
            <>
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
              <TouchableOpacity
                style={[styles.travelTipsButton, { marginTop: 12 }]}
                onPress={() => {
                  setShowTravelTips(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <LinearGradient
                  colors={[THEME_COLOR, '#0d47a1']}
                  style={styles.gradientButton}
                >
                  <MaterialIcons name="lightbulb-outline" size={18} color="#fff" />
                  <Text style={styles.travelTipsButtonText}>Travel Tips</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderRoadmapModal = () => {
    const selectedJourney = selectedRouteIndex === 0 ? journeyPlan : alternateRoutes[selectedRouteIndex - 1];

    if (!selectedJourney) {
      return (
        <Modal
          visible={showRoadmapModal}
          transparent={true}
          animationType="slide"
          onRequestClose={toggleRoadmapModal}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.roadmapModalContent, isRoadmapFullScreen && styles.fullScreenModalContent]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Journey Roadmap</Text>
                <View style={styles.modalHeaderActions}>
                  <TouchableOpacity onPress={toggleRoadmapFullScreen} style={styles.modalActionButton}>
                    <MaterialIcons
                      name={isRoadmapFullScreen ? "fullscreen-exit" : "fullscreen"}
                      size={24}
                      color="#333"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={toggleRoadmapModal} style={styles.modalActionButton}>
                    <MaterialIcons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.fallbackContainer}>
                <Text style={styles.fallbackText}>No journey selected.</Text>
              </View>
            </View>
          </View>
        </Modal>
      );
    }

    return (
      <Modal
        visible={showRoadmapModal}
        transparent={true}
        animationType="slide"
        onRequestClose={toggleRoadmapModal}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.roadmapModalContent, isRoadmapFullScreen && styles.fullScreenModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Journey Roadmap</Text>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity onPress={toggleRoadmapFullScreen} style={styles.modalActionButton}>
                  <MaterialIcons
                    name={isRoadmapFullScreen ? "fullscreen-exit" : "fullscreen"}
                    size={24}
                    color="#333"
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleRoadmapModal} style={styles.modalActionButton}>
                  <MaterialIcons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
            </View>
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
                      <MaterialIcons name="trip-origin" size={20} color={THEME_COLOR} style={styles.startDot} />
                      <View>
                        <Text style={styles.segmentTitle}>
                          {segment.from} → {segment.to}
                        </Text>
                        <Text style={styles.segmentSubtitle}>
                          {segment.mode} {segment.busNumber} • {segment.type}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.busScheduleButton}
                      onPress={() => {
                        toggleRoadmapModal();
                        showBusSchedule();
                      }}
                    >
                      <LinearGradient
                        colors={[THEME_COLOR, '#0d47a1']}
                        style={styles.gradientButtonSmall}
                      >
                        <MaterialIcons name="schedule" size={16} color="#fff" />
                        <Text style={styles.busScheduleButtonText}>Schedule</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.segmentBadges}>
                    {segment.amenities.map((amenity, i) => (
                      <View key={i} style={styles.amenityBadge}>
                        <Text style={styles.badgeText}>{amenity}</Text>
                      </View>
                    ))}
                  </View>
                  {segment.reason && (
                    <Text style={styles.segmentReason}>Note: {segment.reason}</Text>
                  )}

                  <View style={styles.segmentDetails}>
                    <View style={styles.segmentDetail}>
                      <MaterialIcons name="access-time" size={16} color="#666" />
                      <Text style={styles.segmentInfo}>{segment.duration}</Text>
                    </View>
                    <View style={styles.segmentDetail}>
                      <MaterialIcons name="attach-money" size={16} color="#666" />
                      <Text style={styles.segmentInfo}>{segment.price}</Text>
                    </View>
                    <View style={styles.segmentDetail}>
                      <MaterialIcons name="people" size={16} color="#666" />
                      <Text style={styles.segmentInfo}>{segment.occupancy}</Text>
                    </View>
                  </View>

                  <View style={styles.stopsContainer}>
                    <Text style={styles.stopsTitle}>Stops</Text>
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
        </View>
      </Modal>
    );
  };

  const renderTravelTipsModal = () => (
    <Modal
      visible={showTravelTips}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowTravelTips(false)}
    >
      <View style={styles.tipsModalContainer}>
        <LinearGradient
          colors={[THEME_COLOR, '#0d47a1']}
          style={styles.tipsModalHeader}
        >
          <View style={styles.tipsHeaderContent}>
            <LottieView
              source={require('../assets/animations/travel-tips.json')}
              autoPlay
              loop
              style={styles.tipsHeaderAnimation}
            />
            <Text style={styles.tipsModalTitle}>Travel Tips</Text>
            <TouchableOpacity
              style={styles.tipsCloseButton}
              onPress={() => setShowTravelTips(false)}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView style={styles.tipsContent}>
          <View style={styles.tipCategoryContainer}>
            <TouchableOpacity
              style={styles.tipCategoryHeader}
              onPress={() => toggleCategory('journeySpecific')}
            >
              <Text style={styles.tipCategoryTitle}>Journey-Specific Tips</Text>
              <MaterialIcons
                name={expandedCategories.journeySpecific ? 'expand-less' : 'expand-more'}
                size={24}
                color={THEME_COLOR}
              />
            </TouchableOpacity>
            {expandedCategories.journeySpecific && (
              <Animated.View style={styles.tipList}>
                {detailedTravelTips.slice(0, Math.ceil(detailedTravelTips.length / 2)).map((tip, index) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    onPressIn={() => animateCardPressIn(index)}
                    onPressOut={() => animateCardPressOut(index)}
                  >
                    <Animated.View
                      style={[
                        styles.tipCard,
                        { transform: [{ scale: cardScaleAnims[index] }] },
                        { backgroundColor: index % 2 === 0 ? '#E3F2FD' : '#E8F5E9' },
                      ]}
                    >
                      <View style={styles.tipIconContainer}>
                        <MaterialIcons name="lightbulb-outline" size={20} color={THEME_COLOR} />
                      </View>
                      <Text style={styles.tipItemText}>{tip}</Text>
                    </Animated.View>
                  </TouchableOpacity>
                ))}
              </Animated.View>
            )}
          </View>

          <View style={styles.tipCategoryContainer}>
            <TouchableOpacity
              style={styles.tipCategoryHeader}
              onPress={() => toggleCategory('general')}
            >
              <Text style={styles.tipCategoryTitle}>General Travel Tips</Text>
              <MaterialIcons
                name={expandedCategories.general ? 'expand-less' : 'expand-more'}
                size={24}
                color={THEME_COLOR}
              />
            </TouchableOpacity>
            {expandedCategories.general && (
              <Animated.View style={styles.tipList}>
                {detailedTravelTips.slice(Math.ceil(detailedTravelTips.length / 2)).map((tip, index) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    onPressIn={() => animateCardPressIn(index + Math.ceil(detailedTravelTips.length / 2))}
                    onPressOut={() => animateCardPressOut(index + Math.ceil(detailedTravelTips.length / 2))}
                  >
                    <Animated.View
                      style={[
                        styles.tipCard,
                        { transform: [{ scale: cardScaleAnims[index + Math.ceil(detailedTravelTips.length / 2)] }] },
                        { backgroundColor: index % 2 === 0 ? '#E3F2FD' : '#E8F5E9' },
                      ]}
                    >
                      <View style={styles.tipIconContainer}>
                        <MaterialIcons name="info-outline" size={20} color={THEME_COLOR} />
                      </View>
                      <Text style={styles.tipItemText}>{tip}</Text>
                    </Animated.View>
                  </TouchableOpacity>
                ))}
              </Animated.View>
            )}
          </View>
        </ScrollView>

        <View style={styles.tipsActionContainer}>
          <TouchableOpacity
            style={styles.saveTipsButton}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Tips Saved', 'Travel tips have been saved for later use.');
            }}
          >
            <LinearGradient
              colors={[SUCCESS_COLOR, '#2E7D32']}
              style={styles.gradientButton}
            >
              <MaterialIcons name="save" size={20} color="#fff" />
              <Text style={styles.saveTipsButtonText}>Save Tips</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderScheduleModal = () => (
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
  );

  const renderLiveTrackingModal = () => (
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
  );

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
        : journeyPlan || alternateRoutes.length > 0
        ? renderJourneyPlan()
        : renderPlanner()}

      <Sidebar
        visible={sidebarVisible}
        activeMenuItem={activeMenuItem}
        onClose={toggleSidebar}
        onMenuItemPress={handleMenuItemPress}
        onSignOut={handleSignOut}
      />

      {renderRoadmapModal()}
      {renderTravelTipsModal()}
      {renderScheduleModal()}
      {renderLiveTrackingModal()}
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
  gradientButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
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
  travelTipsButton: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  travelTipsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
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
    height: height * 0.4,
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  journeyHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journeyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  journeyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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
    borderRadius: 6,
  },
  startJourneyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressStart: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  progressEnd: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  actionBar: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  journeyInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 4,
  },
  roadmapButton: {
    borderRadius: 6,
  },
  roadmapButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  startJourneyButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fallbackText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
    maxHeight: '60%',
  },
  roadmapModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
  },
  fullScreenModalContent: {
    maxHeight: '100%',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalActionButton: {
    marginLeft: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  roadmap: {
    padding: 16,
  },
  segment: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activeSegment: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  segmentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  startDot: {
    marginRight: 12,
  },
  segmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  segmentSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  segmentBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  amenityBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  segmentReason: {
    fontSize: 13,
    color: '#777',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  busScheduleButton: {
    borderRadius: 6,
  },
  busScheduleButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  segmentDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  segmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
  },
  segmentInfo: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
  stopsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  stopsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  stopsList: {
    paddingLeft: 8,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1976d2',
    marginRight: 12,
  },
  stopText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
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
  tipsModalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tipsModalHeader: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  tipsHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tipsHeaderAnimation: {
    width: 80,
    height: 80,
    marginRight: 12,
  },
  tipsModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  tipsCloseButton: {
    padding: 8,
  },
  tipsContent: {
    flex: 1,
    padding: 16,
  },
  tipCategoryContainer: {
    marginBottom: 24,
  },
  tipCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tipCategoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  tipList: {
    paddingTop: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
  },
  tipItemText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  tipsActionContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveTipsButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  saveTipsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
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