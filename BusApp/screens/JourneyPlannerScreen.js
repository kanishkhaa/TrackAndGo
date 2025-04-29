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
  Image,
  Alert,
  FlatList,
} from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons, Feather, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import LottieView from 'lottie-react-native';
import Sidebar from '../components/Sidebar';
import { UserContext } from '../screens/UserContext';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const THEME_COLOR = '#1976d2';
const ACCENT_COLOR = '#FF9800';
const SUCCESS_COLOR = '#4CAF50';
const DANGER_COLOR = '#F44336';
const WARNING_COLOR = '#FFC107';

// Frequently used locations
const FREQUENT_LOCATIONS = [
  { id: '1', name: 'BIT College', address: 'Sathyamangalam, Erode' },
  { id: '2', name: 'Namakkal Bus Stand', address: 'Namakkal' },
  { id: '3', name: 'Erode Junction', address: 'Erode' },
  { id: '4', name: 'Coimbatore Airport', address: 'Coimbatore' },
];

// Mock bus schedules data
const BUS_SCHEDULES = {
  'S12': [
    { departure: '07:30 AM', arrival: '08:00 AM' },
    { departure: '08:30 AM', arrival: '09:00 AM' },
    { departure: '09:30 AM', arrival: '10:00 AM' },
  ],
  'E45': [
    { departure: '08:00 AM', arrival: '08:45 AM' },
    { departure: '09:00 AM', arrival: '09:45 AM' },
    { departure: '10:00 AM', arrival: '10:45 AM' },
  ],
  'N78': [
    { departure: '08:15 AM', arrival: '09:15 AM' },
    { departure: '09:15 AM', arrival: '10:15 AM' },
    { departure: '10:15 AM', arrival: '11:15 AM' },
  ],
};

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
  const [currentLocation, setCurrentLocation] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('journey');
  const [trackingJourney, setTrackingJourney] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [showFrequentLocations, setShowFrequentLocations] = useState(false);
  const [selectingFor, setSelectingFor] = useState(null); // 'from' or 'to'
  const [routeProgress, setRouteProgress] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [showLiveTrackingModal, setShowLiveTrackingModal] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState('45 min');
  const [showAlternateRoutes, setShowAlternateRoutes] = useState(false);
  const [weatherInfo, setWeatherInfo] = useState({ condition: 'Sunny', temperature: '28°C' });
  const [showTravelTips, setShowTravelTips] = useState(false);
  
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
      } catch (error) {
        setLocationError('Failed to fetch location');
      }
    })();

    // Start animations
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  // Pulse animation for live tracking
  useEffect(() => {
    if (trackingJourney) {
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

      // Simulate progress updates
      const interval = setInterval(() => {
        setRouteProgress(prev => {
          const newProgress = prev + 0.01;
          
          // Update progress animation
          Animated.timing(progressAnim, {
            toValue: newProgress > 1 ? 1 : newProgress,
            duration: 500,
            useNativeDriver: false,
          }).start();
          
          if (newProgress >= 0.33 && currentSegmentIndex === 0) {
            setCurrentSegmentIndex(1);
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: 11.4522, 
                longitude: 77.6937,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }, 1000);
            }
          }
          
          if (newProgress >= 0.66 && currentSegmentIndex === 1) {
            setCurrentSegmentIndex(2);
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: 11.3410, 
                longitude: 77.7172,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }, 1000);
            }
          }
          
          // Calculate remaining time
          const remainingPercentage = 1 - newProgress;
          const totalMinutes = 135; // 2h 15m in minutes
          const remainingMinutes = Math.round(remainingPercentage * totalMinutes);
          
          if (remainingMinutes > 60) {
            const hours = Math.floor(remainingMinutes / 60);
            const minutes = remainingMinutes % 60;
            setEstimatedTimeRemaining(`${hours}h ${minutes}m`);
          } else {
            setEstimatedTimeRemaining(`${remainingMinutes}m`);
          }
          
          return newProgress > 1 ? 1 : newProgress;
        });
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [trackingJourney, currentSegmentIndex]);

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

  const openFrequentLocations = (type) => {
    setSelectingFor(type);
    setShowFrequentLocations(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const selectFrequentLocation = (location) => {
    if (selectingFor === 'from') {
      setFromLocation(location.name);
    } else {
      setToLocation(location.name);
    }
    setShowFrequentLocations(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const planJourney = () => {
    if (!fromLocation || !toLocation) {
      Alert.alert('Missing Information', 'Please enter both starting point and destination');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Mock journey planning logic
    if (
      fromLocation.toLowerCase().includes('bit') &&
      toLocation.toLowerCase().includes('namakkal')
    ) {
      setJourneyPlan({
        segments: [
          {
            from: 'BIT College',
            to: 'Sathyamangalam',
            busNumber: 'S12',
            type: 'Express',
            duration: '30 min',
            eta: '8:30 AM',
            price: '₹35',
            occupancy: '65%',
            amenities: ['AC', 'WiFi'],
            coordinates: [
              { latitude: 11.3410, longitude: 77.7172 },
              { latitude: 11.4522, longitude: 77.6937 },
            ],
            stops: ['BIT Campus', 'Sathy Town', 'Sathy Bus Stand'],
          },
          {
            from: 'Sathyamangalam',
            to: 'Erode',
            busNumber: 'E45',
            type: 'Local',
            duration: '45 min',
            eta: '9:15 AM',
            price: '₹45',
            occupancy: '40%',
            amenities: ['Non-AC'],
            coordinates: [
              { latitude: 11.4522, longitude: 77.6937 },
              { latitude: 11.3410, longitude: 77.7172 },
            ],
            stops: ['Sathy Bus Stand', 'Bhavani', 'Erode Central'],
          },
          {
            from: 'Erode',
            to: 'Namakkal',
            busNumber: 'N78',
            type: 'Express',
            duration: '1 hr',
            eta: '10:15 AM',
            price: '₹60',
            occupancy: '80%',
            amenities: ['AC', 'USB Charging'],
            coordinates: [
              { latitude: 11.3410, longitude: 77.7172 },
              { latitude: 11.2213, longitude: 78.1677 },
            ],
            stops: ['Erode Central', 'Perundurai', 'Namakkal Bus Stand'],
          },
        ],
        totalDuration: '2 hr 15 min',
        totalPrice: '₹140',
        transfers: 2,
        carbonFootprint: '3.2 kg CO₂',
        alternateRoutes: [
          {
            name: 'Faster Route',
            duration: '1 hr 50 min',
            price: '₹190',
            transfers: 1,
            note: 'Includes premium express bus'
          },
          {
            name: 'Budget Route',
            duration: '2 hr 45 min',
            price: '₹100',
            transfers: 3,
            note: 'All non-AC buses'
          }
        ]
      });
    } else {
      Alert.alert('Route Not Found', 'No routes found for this journey. Try BIT to Namakkal.');
    }
  };

  const startJourney = () => {
    setTrackingJourney(true);
    setShowStartScreen(false);
    
    if (journeyAnimationRef.current) {
      journeyAnimationRef.current.play();
    }
    
    // Initial focus on first segment
    if (mapRef.current && journeyPlan?.segments?.[0]?.coordinates) {
      mapRef.current.animateToRegion({
        latitude: journeyPlan.segments[0].coordinates[0].latitude,
        longitude: journeyPlan.segments[0].coordinates[0].longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }, 1000);
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const showBusSchedule = (busNumber) => {
    setSelectedBus(busNumber);
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
      <View style={styles.topDestinationsContainer}>
        <Text style={styles.sectionTitle}>Popular Routes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularRoutes}>
          <TouchableOpacity 
            style={styles.popularRoute}
            onPress={() => {
              setFromLocation('BIT College');
              setToLocation('Namakkal');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.popularRouteGradient}>
              <MaterialIcons name="directions-bus" size={16} color="#fff" />
              <Text style={styles.popularRouteText}>BIT → Namakkal</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.popularRoute}
            onPress={() => {
              setFromLocation('BIT College');
              setToLocation('Erode');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <LinearGradient colors={['#FF9800', '#EF6C00']} style={styles.popularRouteGradient}>
              <MaterialIcons name="directions-bus" size={16} color="#fff" />
              <Text style={styles.popularRouteText}>BIT → Erode</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.popularRoute}
            onPress={() => {
              setFromLocation('BIT College');
              setToLocation('Coimbatore');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <LinearGradient colors={['#9C27B0', '#7B1FA2']} style={styles.popularRouteGradient}>
              <MaterialIcons name="directions-bus" size={16} color="#fff" />
              <Text style={styles.popularRouteText}>BIT → Coimbatore</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>

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
            <TouchableOpacity onPress={() => openFrequentLocations('from')}>
              <MaterialIcons name="bookmark" size={20} color={THEME_COLOR} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputContainer}>
            <MaterialIcons name="location-on" size={20} color="#777" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="To: Destination"
              value={toLocation}
              onChangeText={setToLocation}
            />
            <TouchableOpacity onPress={() => openFrequentLocations('to')}>
              <MaterialIcons name="bookmark" size={20} color={THEME_COLOR} />
            </TouchableOpacity>
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
        <Text style={styles.tipText}>• Book tickets in advance during peak hours</Text>
        <Text style={styles.tipText}>• Keep small change ready for bus fare</Text>
        <TouchableOpacity 
          style={styles.showMoreTips}
          onPress={() => setShowTravelTips(true)}
        >
          <Text style={styles.showMoreTipsText}>Show More Tips</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderJourneyPlan = () => (
    <View style={styles.journeyContainer}>
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
            {journeyPlan?.segments?.map((segment, index) =>
              segment.coordinates.map((coord, coordIndex) => (
                <Marker
                  key={`${index}-${coordIndex}`}
                  coordinate={coord}
                  title={coordIndex === 0 ? segment.from : segment.to}
                >
                  <View style={[
                    styles.markerContainer,
                    currentSegmentIndex === index && coordIndex === 0 && trackingJourney ? styles.activeMarker : {}
                  ]}>
                    {coordIndex === 0 ? (
                      <MaterialIcons name="directions-bus" size={18} color="#fff" />
                    ) : (
                      <MaterialIcons name="location-on" size={18} color="#fff" />
                    )}
                  </View>
                </Marker>
              ))
            )}
            {journeyPlan?.segments?.map((segment, index) => (
              <Polyline
                key={index}
                coordinates={segment.coordinates}
                strokeColor={currentSegmentIndex === index && trackingJourney ? ACCENT_COLOR : THEME_COLOR}
                strokeWidth={currentSegmentIndex === index && trackingJourney ? 6 : 4}
              />
            ))}
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
            <Text style={styles.journeyTitle}>{fromLocation} → {toLocation}</Text>
            <View style={styles.journeyStats}>
              <MaterialIcons name="access-time" size={14} color="#555" />
              <Text style={styles.journeyStatText}>{journeyPlan.totalDuration}</Text>
              <MaterialIcons name="multiple-stop" size={14} color="#555" />
              <Text style={styles.journeyStatText}>{journeyPlan.transfers} transfers</Text>
              <MaterialIcons name="account-balance-wallet" size={14} color="#555" />
              <Text style={styles.journeyStatText}>{journeyPlan.totalPrice}</Text>
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
                  { width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })}
                ]} 
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressStart}>{fromLocation}</Text>
              <Text style={styles.progressEnd}>{toLocation}</Text>
            </View>
          </View>
        )}
      </View>
      
      <View style={styles.roadmapContainer}>
        <Text style={styles.roadmapTitle}>Your Journey Roadmap</Text>
        <ScrollView style={styles.roadmap}>
          {journeyPlan.segments.map((segment, index) => (
            <View 
              key={index} 
              style={[
                styles.segment, 
                trackingJourney && index === currentSegmentIndex && styles.activeSegment
              ]}
            >
              <View style={styles.segmentHeader}>
                <View style={styles.segmentTitleContainer}>
                  {index === 0 && (
                    <View style={styles.startDot}>
                      <MaterialIcons name="trip-origin" size={16} color={THEME_COLOR} />
                    </View>
                  )}
                  
                  {index > 0 && (
                    <View style={styles.transferDot}>
                      <MaterialIcons name="change-history" size={16} color={WARNING_COLOR} />
                    </View>
                  )}
                  
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
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.busNumberButton}
                  onPress={() => showBusSchedule(segment.busNumber)}
                >
                  <Text style={styles.busNumber}>Bus {segment.busNumber}</Text>
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
              
              {index < journeyPlan.segments.length - 1 && (
                <View style={styles.waitingTimeContainer}>
                  <MaterialIcons name="hourglass-bottom" size={14} color="#777" />
                  <Text style={styles.waitingTime}>Waiting: ~10 min at {segment.to}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
      
      <View style={styles.actionBar}>
        <View style={styles.journeyInfoContainer}>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="leaf" size={18} color="#4CAF50" />
            <Text style={styles.infoText}>{journeyPlan.carbonFootprint}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="weather-partly-cloudy" size={18} color="#FF9800" />
            <Text style={styles.infoText}>{weatherInfo.condition}</Text>
          </View>
        </View>
        
        {!trackingJourney ? (
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
        ) : (
          <TouchableOpacity 
            style={styles.alternateRoutesButton}
            onPress={() => setShowAlternateRoutes(true)}
          >
            <LinearGradient
              colors={[THEME_COLOR, '#0d47a1']}
              style={styles.gradientButton}
            >
              <Text style={styles.alternateRoutesText}>Show Alternate Routes</Text>
              <MaterialIcons name="alt-route" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Bus Schedule Modal */}
      <Modal
        visible={showScheduleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bus {selectedBus} Schedule</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.scheduleList}>
              {selectedBus && BUS_SCHEDULES[selectedBus]?.map((schedule, index) => (
                <View key={index} style={styles.scheduleItem}>
                  <View style={styles.scheduleTimes}>
                    <View style={styles.scheduleTimeBlock}>
                      <Text style={styles.scheduleTimeLabel}>Departure</Text>
                      <Text style={styles.scheduleTime}>{schedule.departure}</Text>
                    </View>
                    <MaterialIcons name="arrow-forward" size={20} color="#777" />
                    <View style={styles.scheduleTimeBlock}>
                      <Text style={styles.scheduleTimeLabel}>Arrival</Text>
                      <Text style={styles.scheduleTime}>{schedule.arrival}</Text>
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
      
      {/* Live Tracking Modal */}
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
                    {journeyPlan?.segments[currentSegmentIndex]?.from} → {journeyPlan?.segments[currentSegmentIndex]?.to}
                  </Text>
                  <Text style={styles.liveTrackingBusInfo}>
                    Bus {journeyPlan?.segments[currentSegmentIndex]?.busNumber} ({journeyPlan?.segments[currentSegmentIndex]?.type})
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
                    <Text style={styles.liveStatValue}>{
                      currentSegmentIndex < journeyPlan?.segments.length - 1 
                        ? journeyPlan?.segments[currentSegmentIndex]?.stops[1] 
                        : 'Final Destination'
                    }</Text>
                  </View>
                </View>
                
                <View style={styles.liveNotifications}>
                  <View style={styles.notificationItem}>
                    <MaterialIcons name="notifications" size={16} color={WARNING_COLOR} />
                    <Text style={styles.notificationText}>Arrival in 5 minutes at next stop</Text>
                  </View>
                  
                  <View style={styles.notificationItem}>
                    <MaterialCommunityIcons name="weather-partly-cloudy" size={16} color="#FF9800" />
                    <Text style={styles.notificationText}>Expect light rain at destination</Text>
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
      
      {/* Frequent Locations Modal */}
      <Modal
        visible={showFrequentLocations}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFrequentLocations(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {selectingFor === 'from' ? 'Starting Point' : 'Destination'}
              </Text>
              <TouchableOpacity onPress={() => setShowFrequentLocations(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={FREQUENT_LOCATIONS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.locationItem}
                  onPress={() => selectFrequentLocation(item)}
                >
                  <MaterialIcons name="location-on" size={20} color={THEME_COLOR} />
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationName}>{item.name}</Text>
                    <Text style={styles.locationAddress}>{item.address}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#777" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
      
      {/* Alternate Routes Modal */}
      <Modal
        visible={showAlternateRoutes}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAlternateRoutes(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alternate Routes</Text>
              <TouchableOpacity onPress={() => setShowAlternateRoutes(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.alternateRoutesContent}>
              <View style={[styles.alternateRoute, styles.currentRoute]}>
                <View style={styles.alternateRouteHeader}>
                  <Text style={styles.alternateRouteTitle}>Current Route</Text>
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Active</Text>
                  </View>
                </View>
                
                <View style={styles.alternateRouteDetails}>
                  <View style={styles.alternateRouteDetail}>
                    <MaterialIcons name="access-time" size={16} color="#555" />
                    <Text style={styles.alternateRouteDetailText}>{journeyPlan.totalDuration}</Text>
                  </View>
                  <View style={styles.alternateRouteDetail}>
                    <MaterialIcons name="attach-money" size={16} color="#555" />
                    <Text style={styles.alternateRouteDetailText}>{journeyPlan.totalPrice}</Text>
                  </View>
                  <View style={styles.alternateRouteDetail}>
                    <MaterialIcons name="multiple-stop" size={16} color="#555" />
                    <Text style={styles.alternateRouteDetailText}>{journeyPlan.transfers} transfers</Text>
                  </View>
                </View>
              </View>
              
              {journeyPlan.alternateRoutes.map((route, index) => (
                <View key={index} style={styles.alternateRoute}>
                  <View style={styles.alternateRouteHeader}>
                    <Text style={styles.alternateRouteTitle}>{route.name}</Text>
                  </View>
                  
                  <View style={styles.alternateRouteDetails}>
                    <View style={styles.alternateRouteDetail}>
                      <MaterialIcons name="access-time" size={16} color="#555" />
                      <Text style={styles.alternateRouteDetailText}>{route.duration}</Text>
                    </View>
                    <View style={styles.alternateRouteDetail}>
                      <MaterialIcons name="attach-money" size={16} color="#555" />
                      <Text style={styles.alternateRouteDetailText}>{route.price}</Text>
                    </View>
                    <View style={styles.alternateRouteDetail}>
                      <MaterialIcons name="multiple-stop" size={16} color="#555" />
                      <Text style={styles.alternateRouteDetailText}>{route.transfers} transfers</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.alternateRouteNote}>{route.note}</Text>
                  
                  <TouchableOpacity style={styles.switchRouteButton}>
                    <Text style={styles.switchRouteText}>Switch to This Route</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Travel Tips Modal */}
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
                <Text style={styles.tipCategoryTitle}>Before Your Journey</Text>
                <View style={styles.tipItem}>
                  <MaterialIcons name="schedule" size={16} color={THEME_COLOR} />
                  <Text style={styles.tipItemText}>Check bus schedules ahead of time, especially during peak hours</Text>
                </View>
                <View style={styles.tipItem}>
                  <MaterialIcons name="account-balance-wallet" size={16} color={THEME_COLOR} />
                  <Text style={styles.tipItemText}>Keep exact change ready for ticket purchases</Text>
                </View>
                <View style={styles.tipItem}>
                  <MaterialIcons name="battery-charging-full" size={16} color={THEME_COLOR} />
                  <Text style={styles.tipItemText}>Ensure your phone is fully charged before departure</Text>
                </View>
              </View>
              
              <View style={styles.tipCategory}>
                <Text style={styles.tipCategoryTitle}>During Your Journey</Text>
                <View style={styles.tipItem}>
                  <MaterialIcons name="shopping-bag" size={16} color={THEME_COLOR} />
                  <Text style={styles.tipItemText}>Keep your belongings secure and within sight</Text>
                </View>
                <View style={styles.tipItem}>
                  <MaterialIcons name="map" size={16} color={THEME_COLOR} />
                  <Text style={styles.tipItemText}>Download offline maps for your destination area</Text>
                </View>
                <View style={styles.tipItem}>
                  <MaterialIcons name="notifications" size={16} color={THEME_COLOR} />
                  <Text style={styles.tipItemText}>Enable journey notifications to get timely alerts</Text>
                </View>
              </View>
              
              <View style={styles.tipCategory}>
                <Text style={styles.tipCategoryTitle}>Local Transport Etiquette</Text>
                <View style={styles.tipItem}>
                  <MaterialIcons name="accessibility" size={16} color={THEME_COLOR} />
                  <Text style={styles.tipItemText}>Offer seats to elderly, pregnant women, and differently-abled passengers</Text>
                </View>
                <View style={styles.tipItem}>
                  <MaterialIcons name="volume-up" size={16} color={THEME_COLOR} />
                  <Text style={styles.tipItemText}>Keep noise levels down during the journey</Text>
                </View>
                <View style={styles.tipItem}>
                  <MaterialIcons name="delete" size={16} color={THEME_COLOR} />
                  <Text style={styles.tipItemText}>Take all your trash with you when leaving the bus</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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

  // Start Screen Styles
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

  // Planner Container Styles
  plannerContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  topDestinationsContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  popularRoutes: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  popularRoute: {
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  popularRouteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  popularRouteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },

  // Location Inputs Styles
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
  
  // Journey Container Styles
  journeyContainer: {
    flex: 1,
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

  // Journey Summary Styles
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

  // Roadmap Container Styles
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
  transferDot: {
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
  busNumberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  busNumber: {
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
  waitingTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  waitingTime: {
    fontSize: 12,
    color: '#ff9800',
    marginLeft: 4,
  },

  // Action Bar Styles
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
  alternateRoutesButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  alternateRoutesText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },

  // Modal Container Styles
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

  // Bus Schedule Modal Styles
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

  // Live Tracking Modal Styles
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

  // Frequent Locations Modal Styles
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  locationDetails: {
    flex: 1,
    marginLeft: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    color: '#777',
  },

  // Alternate Routes Modal Styles
  alternateRoutesContent: {
    padding: 16,
  },
  alternateRoute: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  currentRoute: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  alternateRouteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alternateRouteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  currentBadge: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  alternateRouteDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  alternateRouteDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  alternateRouteDetailText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 4,
  },
  alternateRouteNote: {
    fontSize: 14,
    color: '#777',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  switchRouteButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  switchRouteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // Travel Tips Modal Styles
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

  // Marker Styles
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