import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  FlatList,
  Animated,
  StatusBar
} from 'react-native';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

// Updated animation and color mapping based on your specifications
const onboardingData = [
  {
    id: '1',
    title: 'Real-Time Bus Tracking',
    description: 'Track your bus live with accurate arrival times and stop details.',
    animationSource: require('../assets/animations/live_tracking.json'),
    animationColor: '#4CAF50' // Green for first animation
  },
  {
    id: '2',
    title: 'Smart Notifications',
    description: 'Get alerts for bus arrivals, delays, and seat availability.',
    animationSource: require('../assets/animations/alerts.json'),
    animationColor: '#FF9800' // Orange for second animation
  },
  {
    id: '3',
    title: 'Safety-First Travel',
    description: 'Women-safe routes, night-safe paths, and wheelchair-friendly buses.',
    animationSource: require('../assets/animations/safety.json'),
    animationColor: '#2E7D32' // Dark green for third animation
  },
  {
    id: '4',
    title: 'Voice-Inclusive Navigation',
    description: 'Voice assistant support for accessible, hands-free commuting.',
    animationSource: require('../assets/animations/accessibility.json'),
    animationColor: '#1A237E' // Dark blue for fourth animation
  }
];

export default function OnboardingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleGetStarted = () => {
    // Changed navigation to go to RoleScreen instead of Main
    navigation.replace('RoleScreen');
  };

  const handleSkip = () => {
    // Also changed Skip to navigate to RoleScreen
    navigation.replace('RoleScreen');
  };

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = () => {
    if (currentIndex < onboardingData.length - 1) {
      slideRef.current.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleGetStarted();
    }
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.slide}>
        <View style={styles.animationContainer}>
          <LottieView
            source={item.animationSource}
            autoPlay
            loop
            style={styles.animation}
            colorFilters={[{
              keypath: "**",
              color: item.animationColor
            }]}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  const Paginator = () => {
    return (
      <View style={styles.paginationContainer}>
        {onboardingData.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 16, 8],
            extrapolate: 'clamp'
          });
          
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp'
          });
          
          // Use the animation color for the active dot
          const backgroundColor = scrollX.interpolate({
            inputRange,
            outputRange: ['#888', onboardingData[i].animationColor, '#888'],
            extrapolate: 'clamp'
          });

          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                { 
                  width: dotWidth, 
                  opacity, 
                  backgroundColor 
                }
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      
      {/* Header with skip button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={onboardingData}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={32}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={slideRef}
      />
      
      {/* Pagination dots - now directly on the screen without container */}
      <Paginator />
      
      {/* Next/Get Started Button - now directly on the screen without container */}
      <TouchableOpacity 
        style={[
          styles.nextButton, 
          {backgroundColor: onboardingData[currentIndex].animationColor}
        ]} 
        onPress={scrollTo}
      >
        <Text style={styles.nextButtonText}>
          {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    width: '100%',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#555',
    fontWeight: '600',
  },
  slide: {
    width,
    height: height - 200, // Reduce height to prevent overlap
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 140, // Add more padding at bottom to make room for buttons
  },
  animationContainer: {
    height: height * 0.45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  animation: {
    width: width * 0.8,
    height: width * 0.8,
  },
  textContainer: {
    paddingHorizontal: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontWeight: '800',
    fontSize: 28,
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  description: {
    fontWeight: '400',
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 130,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  nextButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    width: 180,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
});