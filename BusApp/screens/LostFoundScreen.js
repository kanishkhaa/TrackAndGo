import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Sidebar from '../components/Sidebar';

const LostFoundScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('report'); // 'report', 'status', 'claim'
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('lost');
  const [isTipVisible, setIsTipVisible] = useState(true);

  // Form states
  const [itemDescription, setItemDescription] = useState('');
  const [itemType, setItemType] = useState('');
  const [itemColor, setItemColor] = useState('');
  const [itemBrand, setItemBrand] = useState('');
  const [uniqueIdentifiers, setUniqueIdentifiers] = useState('');
  const [date, setDate] = useState(''); // Manual input: YYYY-MM-DD
  const [time, setTime] = useState(''); // Manual input: HH:MM
  const [route, setRoute] = useState('');
  const [station, setStation] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Animation value for tip box
  const tipOpacity = new Animated.Value(1);

  // Predefined item types for quick selection
  const commonItemTypes = ['Wallet', 'Phone', 'Keys', 'Bag', 'Umbrella', 'Headphones', 'Laptop', 'Clothing', 'Other'];
  const [selectedItemType, setSelectedItemType] = useState(null);

  // Common routes for quick selection
  const commonRoutes = ['Bus 42', 'Bus 105', 'Train Line 1', 'Train Line 3', 'Metro A', 'Metro B', 'Tram 7'];

  // Common stations for quick selection
  const commonStations = ['Central Station', 'West End Terminal', 'North Square', 'Market Street', 'University Stop', 'Airport Terminal'];

  const [reportedItems, setReportedItems] = useState([]);
  const [matchedItems, setMatchedItems] = useState([]);

  // Sample data for demonstration
  useEffect(() => {
    // Simulate fetching data
    setIsLoading(true);
    setTimeout(() => {
      setReportedItems([
        {
          id: '1',
          description: 'Black leather wallet',
          type: 'Wallet',
          color: 'Black',
          brand: 'Coach',
          uniqueIdentifiers: 'Monogram "JD" inside',
          date: '2025-04-10',
          time: '14:30',
          route: 'Bus 42',
          station: 'Central Station',
          status: 'Pending',
          referenceNumber: 'LF-2025-001',
          image: 'https://example.com/wallet.jpg',
        },
        {
          id: '2',
          description: 'Blue umbrella with white polka dots',
          type: 'Umbrella',
          color: 'Blue',
          brand: 'Unknown',
          uniqueIdentifiers: 'White polka dots pattern',
          date: '2025-04-12',
          time: '09:15',
          route: 'Train Line 3',
          station: 'West End Terminal',
          status: 'Found',
          referenceNumber: 'LF-2025-002',
          image: null,
        },
      ]);

      setMatchedItems([
        {
          id: '1',
          lostItem: {
            description: 'Red headphones',
            referenceNumber: 'LF-2025-003',
            date: '2025-04-08',
          },
          foundItem: {
            storageLocation: 'Lost & Found Office, Central Station',
            referenceNumber: 'FF-2025-012',
            date: '2025-04-09',
          },
          status: 'Under Review',
          matchConfidence: 'High',
          matchDetails: 'Color, brand, and unique identifier match',
        },
      ]);

      // Sample notifications
      setNotifications([
        {
          id: '1',
          title: 'Item Match Found!',
          message: 'We found a possible match for your lost headphones (Ref: LF-2025-003)',
          time: '2 hours ago',
          isRead: false,
        },
        {
          id: '2',
          title: 'Status Update',
          message: 'Your lost wallet report has been processed (Ref: LF-2025-001)',
          time: '1 day ago',
          isRead: true,
        },
      ]);
      
      setIsLoading(false);
    }, 1000);

    // Animate tip box to fade out after 10 seconds
    setTimeout(() => {
      Animated.timing(tipOpacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => setIsTipVisible(false));
    }, 10000);
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate refreshing data
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const toggleSidebar = () => {
    setSidebarVisible(true);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const resetForm = () => {
    setItemDescription('');
    setItemType('');
    setSelectedItemType(null);
    setItemColor('');
    setItemBrand('');
    setUniqueIdentifiers('');
    setDate('');
    setTime('');
    setRoute('');
    setStation('');
    setContactInfo('');
    setImageUri(null);
  };

  const handleItemTypeSelect = (type) => {
    setSelectedItemType(type);
    setItemType(type);
  };

  const handleRouteSelect = (selectedRoute) => {
    setRoute(selectedRoute);
  };

  const handleStationSelect = (selectedStation) => {
    setStation(selectedStation);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!itemType || !itemDescription || !route || !station || !contactInfo) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    // Basic date format validation (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (date && !dateRegex.test(date)) {
      Alert.alert('Error', 'Please enter date in YYYY-MM-DD format');
      return;
    }

    // Basic time format validation (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (time && !timeRegex.test(time)) {
      Alert.alert('Error', 'Please enter time in HH:MM format');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      const newReferenceNumber = `LF-2025-${Math.floor(Math.random() * 1000)}`;

      Alert.alert(
        'Success!',
        `Your lost item report has been submitted successfully.\n\nReference number: ${newReferenceNumber}\n\nWe'll notify you if we find a match!`,
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              const newItem = {
                id: String(reportedItems.length + 1),
                description: itemDescription,
                type: itemType,
                color: itemColor,
                brand: itemBrand,
                uniqueIdentifiers,
                date: date || 'Unknown',
                time: time || 'Unknown',
                route,
                station,
                status: 'Pending',
                referenceNumber: newReferenceNumber,
                image: imageUri,
              };
              setReportedItems([...reportedItems, newItem]);
              setActiveTab('status');

              // Add notification about successful submission
              const newNotification = {
                id: `${notifications.length + 1}`,
                title: 'Report Submitted',
                message: `Your lost item report (${newReferenceNumber}) has been submitted successfully.`,
                time: 'Just now',
                isRead: false,
              };
              setNotifications([newNotification, ...notifications]);
            },
          },
        ]
      );
    }, 1500);
  };

  const handleStatusCheck = () => {
    if (!referenceNumber.trim()) {
      Alert.alert('Reference Number Required', 'Please enter a reference number to check status');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      const item = reportedItems.find((item) => item.referenceNumber === referenceNumber);

      if (item) {
        Alert.alert(
          'Item Status',
          `Reference: ${item.referenceNumber}\nDescription: ${item.description}\nStatus: ${item.status}\n${
            item.status === 'Found' ? 'Please go to the Claims tab to arrange pickup.' : ''
          }`
        );
      } else {
        Alert.alert('Not Found', 'No item found with this reference number');
      }
    }, 1000);
  };

  const handleClaimRequest = (itemId) => {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);

      Alert.alert(
        'Claim Requested',
        'Your claim request has been submitted. You will receive a confirmation code via email/SMS to verify your identity before pickup.',
        [{ text: 'OK' }]
      );

      // Update item status
      const updatedItems = matchedItems.map((item) =>
        item.id === itemId ? { ...item, status: 'Claim Requested' } : item
      );
      setMatchedItems(updatedItems);

      // Add notification about claim request
      const matchedItem = matchedItems.find(item => item.id === itemId);
      if (matchedItem) {
        const newNotification = {
          id: `${notifications.length + 1}`,
          title: 'Claim Requested',
          message: `Your claim request for ${matchedItem.lostItem.referenceNumber} has been submitted.`,
          time: 'Just now',
          isRead: false,
        };
        setNotifications([newNotification, ...notifications]);
      }
    }, 1000);
  };

  const markNotificationAsRead = (notificationId) => {
    const updatedNotifications = notifications.map(notification => 
      notification.id === notificationId ? {...notification, isRead: true} : notification
    );
    setNotifications(updatedNotifications);
  };

  const getUnreadNotificationsCount = () => {
    return notifications.filter(notification => !notification.isRead).length;
  };

  const renderReportForm = () => (
    <ScrollView 
      style={[styles.formContainer, isDarkMode && styles.darkModeBackground]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={[styles.formTitle, isDarkMode && styles.darkModeText]}>Report a Lost Item</Text>

      {isTipVisible && (
        <Animated.View style={[styles.tipBox, { opacity: tipOpacity }]}>
          <MaterialIcons name="lightbulb" size={20} color="#FFD700" />
          <Text style={styles.tipText}>
            Tip: Add as many details as possible to increase chances of finding your item!
          </Text>
          <TouchableOpacity onPress={() => setIsTipVisible(false)}>
            <MaterialIcons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={[styles.formGroup, { zIndex: 1000 }]}>
        <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Item Type*</Text>
        <View style={styles.quickSelectContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {commonItemTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.quickSelectItem,
                  selectedItemType === type && styles.quickSelectItemActive,
                  isDarkMode && styles.darkModeQuickSelectItem,
                  selectedItemType === type && isDarkMode && styles.darkModeQuickSelectItemActive
                ]}
                onPress={() => handleItemTypeSelect(type)}
              >
                <Text 
                  style={[
                    styles.quickSelectItemText,
                    selectedItemType === type && styles.quickSelectItemTextActive,
                    isDarkMode && styles.darkModeText
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <TextInput
          style={[styles.input, isDarkMode && styles.darkModeInput]}
          value={itemType}
          onChangeText={setItemType}
          placeholder="E.g. Wallet, Phone, Umbrella"
          placeholderTextColor={isDarkMode ? "#777" : "#aaa"}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Description*</Text>
        <TextInput
          style={[styles.input, styles.textArea, isDarkMode && styles.darkModeInput]}
          value={itemDescription}
          onChangeText={setItemDescription}
          placeholder="Detailed description of the item"
          placeholderTextColor={isDarkMode ? "#777" : "#aaa"}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Color</Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.darkModeInput]}
            value={itemColor}
            onChangeText={setItemColor}
            placeholder="Main color"
            placeholderTextColor={isDarkMode ? "#777" : "#aaa"}
          />
        </View>

        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Brand</Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.darkModeInput]}
            value={itemBrand}
            onChangeText={setItemBrand}
            placeholder="Brand if known"
            placeholderTextColor={isDarkMode ? "#777" : "#aaa"}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Unique Identifiers</Text>
        <TextInput
          style={[styles.input, isDarkMode && styles.darkModeInput]}
          value={uniqueIdentifiers}
          onChangeText={setUniqueIdentifiers}
          placeholder="Any distinguishing features, serial numbers, markings, etc."
          placeholderTextColor={isDarkMode ? "#777" : "#aaa"}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.darkModeInput]}
            value={date}
            onChangeText={setDate}
            placeholder="E.g. 2025-04-15"
            placeholderTextColor={isDarkMode ? "#777" : "#aaa"}
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Time (HH:MM)</Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.darkModeInput]}
            value={time}
            onChangeText={setTime}
            placeholder="E.g. 14:30"
            placeholderTextColor={isDarkMode ? "#777" : "#aaa"}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Route/Vehicle Number*</Text>
        <View style={styles.quickSelectContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {commonRoutes.map((commonRoute) => (
              <TouchableOpacity
                key={commonRoute}
                style={[
                  styles.quickSelectItem,
                  route === commonRoute && styles.quickSelectItemActive,
                  isDarkMode && styles.darkModeQuickSelectItem,
                  route === commonRoute && isDarkMode && styles.darkModeQuickSelectItemActive
                ]}
                onPress={() => handleRouteSelect(commonRoute)}
              >
                <Text 
                  style={[
                    styles.quickSelectItemText,
                    route === commonRoute && styles.quickSelectItemTextActive,
                    isDarkMode && styles.darkModeText
                  ]}
                >
                  {commonRoute}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <TextInput
          style={[styles.input, isDarkMode && styles.darkModeInput]}
          value={route}
          onChangeText={setRoute}
          placeholder="Bus/Train ID or Line Number"
          placeholderTextColor={isDarkMode ? "#777" : "#aaa"}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Station or Stop Name*</Text>
        <View style={styles.quickSelectContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {commonStations.map((commonStation) => (
              <TouchableOpacity
                key={commonStation}
                style={[
                  styles.quickSelectItem,
                  station === commonStation && styles.quickSelectItemActive,
                  isDarkMode && styles.darkModeQuickSelectItem,
                  station === commonStation && isDarkMode && styles.darkModeQuickSelectItemActive
                ]}
                onPress={() => handleStationSelect(commonStation)}
              >
                <Text 
                  style={[
                    styles.quickSelectItemText,
                    station === commonStation && styles.quickSelectItemTextActive,
                    isDarkMode && styles.darkModeText
                  ]}
                >
                  {commonStation}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <TextInput
          style={[styles.input, isDarkMode && styles.darkModeInput]}
          value={station}
          onChangeText={setStation}
          placeholder="Where item was lost"
          placeholderTextColor={isDarkMode ? "#777" : "#aaa"}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Contact Information*</Text>
        <TextInput
          style={[styles.input, isDarkMode && styles.darkModeInput]}
          value={contactInfo}
          onChangeText={setContactInfo}
          placeholder="Email or Phone Number"
          placeholderTextColor={isDarkMode ? "#777" : "#aaa"}
          keyboardType="email-address"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Upload Photo</Text>
        <View style={[styles.imageUploadContainer, isDarkMode && styles.darkModeImageUpload]}>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImageButton} onPress={() => setImageUri(null)}>
                <MaterialIcons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <MaterialIcons name="add-photo-alternate" size={24} color={isDarkMode ? "#90CAF9" : "#1976d2"} />
              <Text style={[styles.uploadButtonText, isDarkMode && { color: "#90CAF9" }]}>Select Image</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TouchableOpacity 
        disabled={isLoading} 
        onPress={handleSubmit} 
        style={[styles.submitButton, isLoading && { opacity: 0.7 }]}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderStatusChecker = () => (
    <ScrollView 
      style={[styles.formContainer, isDarkMode && styles.darkModeBackground]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={[styles.formTitle, isDarkMode && styles.darkModeText]}>Check Item Status</Text>

      <View style={[styles.segmentedControl, isDarkMode && styles.darkModeSegmentedControl]}>
        {['all', 'pending', 'found'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.segmentButton, 
              statusFilter === filter && styles.segmentButtonActive,
              isDarkMode && statusFilter === filter && styles.darkModeSegmentButtonActive
            ]}
            onPress={() => setStatusFilter(filter)}
          >
            <Text 
              style={[
                styles.segmentButtonText, 
                statusFilter === filter && styles.segmentButtonTextActive,
                isDarkMode && styles.darkModeText,
                isDarkMode && statusFilter === filter && styles.darkModeSegmentButtonTextActive
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Reference Number</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.darkModeInput]}
            value={referenceNumber}
            onChangeText={setReferenceNumber}
            placeholder="Enter reference number"
            placeholderTextColor={isDarkMode ? "#777" : "#aaa"}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleStatusCheck}>
            <Feather name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.sectionTitle, isDarkMode && styles.darkModeText]}>Your Reported Items</Text>

      {reportedItems.length > 0 ? (
        reportedItems
          .filter((item) => statusFilter === 'all' || item.status.toLowerCase() === statusFilter)
          .map((item) => (
            <View key={item.id} style={[styles.itemCard, isDarkMode && styles.darkModeItemCard]}>
              <View style={styles.itemCardHeader}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemTitle, isDarkMode && styles.darkModeText]}>{item.description}</Text>
                  <Text style={[styles.itemSubtitle, isDarkMode && styles.darkModeSubtitle]}>Ref: {item.referenceNumber}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'Pending' && styles.statusPending,
                    item.status === 'Found' && styles.statusFound,
                    item.status === 'Claimed' && styles.statusClaimed,
                    item.status === 'Under Review' && styles.statusReview,
                  ]}
                >
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.itemCardBody}>
                <View style={styles.itemDetail}>
                  <MaterialIcons name="category" size={16} color={isDarkMode ? "#bbb" : "#666"} />
                  <Text style={[styles.itemDetailText, isDarkMode && styles.darkModeDetailText]}>{item.type}</Text>
                </View>

                <View style={styles.itemDetail}>
                  <MaterialIcons name="location-on" size={16} color={isDarkMode ? "#bbb" : "#666"} />
                  <Text style={[styles.itemDetailText, isDarkMode && styles.darkModeDetailText]}>{item.station}</Text>
                </View>

                <View style={styles.itemDetail}>
                  <MaterialIcons name="directions-bus" size={16} color={isDarkMode ? "#bbb" : "#666"} />
                  <Text style={[styles.itemDetailText, isDarkMode && styles.darkModeDetailText]}>{item.route}</Text>
                </View>

                <View style={styles.itemDetail}>
                  <MaterialIcons name="event" size={16} color={isDarkMode ? "#bbb" : "#666"} />
                  <Text style={[styles.itemDetailText, isDarkMode && styles.darkModeDetailText]}>
                    {item.date} {item.time}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.viewDetailsButton, isDarkMode && styles.darkModeDetailsButton]}
                onPress={() => Alert.alert('Details', `Full details for ${item.referenceNumber}`)}
              >
                <Text style={[styles.viewDetailsButtonText, isDarkMode && { color: "#90CAF9" }]}>View Details</Text>
                <MaterialIcons name="chevron-right" size={20} color={isDarkMode ? "#90CAF9" : "#1976d2"} />
              </TouchableOpacity>
            </View>
          ))
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="package-variant-closed-remove" size={64} color={isDarkMode ? "#555" : "#ccc"} />
          <Text style={[styles.emptyStateText, isDarkMode && styles.darkModeText]}>No reported items yet</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderClaimProcess = () => (
    <ScrollView 
      style={[styles.formContainer, isDarkMode && styles.darkModeBackground]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={[styles.formTitle, isDarkMode && styles.darkModeText]}>Claim Your Item</Text>

      <View style={[styles.infoBox, isDarkMode && styles.darkModeInfoBox]}>
        <MaterialIcons name="info" size={20} color={isDarkMode ? "#90CAF9" : "#1976d2"} />
        <Text style={[styles.infoText, isDarkMode && styles.darkModeText]}>
          When a match is found for your lost item, it will appear here for you to claim. You'll need to verify your
          identity before claiming.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, isDarkMode && styles.darkModeText]}>Matched Items</Text>

      {matchedItems.length > 0 ? (
        matchedItems.map((match) => (
          <View key={match.id} style={[styles.matchCard, isDarkMode && styles.darkModeItemCard]}>
            <View style={styles.matchCardHeader}>
              <View style={styles.matchInfo}>
                <Text style={[styles.matchTitle, isDarkMode && styles.darkModeText]}>{match.lostItem.description}</Text>
                <View style={styles.matchConfidence}>
                  <Text style={[styles.matchConfidenceText, isDarkMode && styles.darkModeSubtitle]}>
                    Match Confidence: {match.matchConfidence}
                  </Text>
                  {match.matchConfidence === 'High' && <MaterialIcons name="verified" size={16} color="#4caf50" />}
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  match.status === 'Under Review' && styles.statusReview,
                  match.status === 'Claim Requested' && styles.statusPending,
                  match.status === 'Ready for Pickup' && styles.statusFound,
                  match.status === 'Claimed' && styles.statusClaimed,
                ]}
              >
                <Text style={styles.statusText}>{match.status}</Text>
              </View>
            </View>

            <View style={styles.matchCardBody}>
              <View style={styles.matchSection}>
                <Text style={[styles.matchSectionTitle, isDarkMode && styles.darkModeSubtitle]}>Lost Item:</Text>
                <View style={styles.matchDetail}>
                  <MaterialIcons name="tag" size={16} color={isDarkMode ? "#bbb" : "#666"} />
                  <Text style={[styles.matchDetailText, isDarkMode && styles.darkModeDetailText]}>Ref: {match.lostItem.referenceNumber}</Text>
                </View>
                <View style={styles.matchDetail}>
                  <MaterialIcons name="calendar-today" size={16} color={isDarkMode ? "#bbb" : "#666"} />
                  <Text style={[styles.matchDetailText, isDarkMode && styles.darkModeDetailText]}>Lost on: {match.lostItem.date}</Text>
                </View>
              </View>

              <View style={styles.matchSection}>
                <Text style={[styles.matchSectionTitle, isDarkMode && styles.darkModeSubtitle]}>Found Item:</Text>
                <View style={styles.matchDetail}>
                  <MaterialIcons name="tag" size={16} color={isDarkMode ? "#bbb" : "#666"} />
                  <Text style={[styles.matchDetailText, isDarkMode && styles.darkModeDetailText]}>Ref: {match.foundItem.referenceNumber}</Text>
                </View>
                <View style={styles.matchDetail}>
                  <MaterialIcons name="location-on" size={16} color={isDarkMode ? "#bbb" : "#666"} />
                  <Text style={[styles.matchDetailText, isDarkMode && styles.darkModeDetailText]}>{match.foundItem.storageLocation}</Text>
                </View>
              </View>
            </View>

            {match.status !== 'Claimed' && match.status !== 'Claim Requested' && (
              <TouchableOpacity
                style={[styles.claimButton, isDarkMode && { backgroundColor: "#0d47a1" }]}
                onPress={() => handleClaimRequest(match.id)}
              >
                <Text style={styles.claimButtonText}>Request Claim</Text>
              </TouchableOpacity>
            )}

            {match.status === 'Claim Requested' && (
              <View style={styles.claimRequestedInfo}>
                <MaterialIcons name="hourglass-bottom" size={16} color={isDarkMode ? "#90CAF9" : "#1976d2"} />
                <Text style={[styles.claimRequestedText, isDarkMode && { color: "#90CAF9" }]}>
                  Claim request is being processed
                </Text>
              </View>
            )}
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="package-variant-closed-remove" size={64} color={isDarkMode ? "#555" : "#ccc"} />
          <Text style={[styles.emptyStateText, isDarkMode && styles.darkModeText]}>No matched items found yet</Text>
        </View>
      )}

      <View style={[styles.infoBox, styles.pickupGuide, isDarkMode && styles.darkModeInfoBox]}>
        <Text style={[styles.pickupGuideTitle, isDarkMode && styles.darkModeText]}>How to Claim Your Item</Text>
        <View style={styles.pickupStep}>
          <View style={styles.pickupStepNumber}>
            <Text style={styles.pickupStepNumberText}>1</Text>
          </View>
          <Text style={[styles.pickupStepText, isDarkMode && styles.darkModeText]}>Request to claim your item</Text>
        </View>
        <View style={styles.pickupStep}>
          <View style={styles.pickupStepNumber}>
            <Text style={styles.pickupStepNumberText}>2</Text>
          </View>
          <Text style={[styles.pickupStepText, isDarkMode && styles.darkModeText]}>Receive verification code via email/SMS</Text>
        </View>
        <View style={styles.pickupStep}>
          <View style={styles.pickupStepNumber}>
            <Text style={styles.pickupStepNumberText}>3</Text>
          </View>
          <Text style={[styles.pickupStepText, isDarkMode && styles.darkModeText]}>Show ID and verification code at pickup location</Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkModeBackground]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.darkModeHeader]}>
        <TouchableOpacity onPress={toggleSidebar}>
          <Feather name="menu" size={24} color={isDarkMode ? "#fff" : "#333"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkModeText]}>Lost & Found</Text>
        <View style={styles.headerRightActions}>
          <TouchableOpacity onPress={toggleDarkMode} style={styles.iconButton}>
            {isDarkMode ? (
              <Feather name="sun" size={22} color="#fff" />
            ) : (
              <Feather name="moon" size={22} color="#333" />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setNotificationsVisible(true)} style={styles.iconButton}>
            <Feather name="bell" size={22} color={isDarkMode ? "#fff" : "#333"} />
            {getUnreadNotificationsCount() > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{getUnreadNotificationsCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabBar, isDarkMode && styles.darkModeTabBar]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'report' && styles.activeTabItem]}
          onPress={() => handleTabChange('report')}
        >
          <MaterialIcons 
            name="report-problem" 
            size={22} 
            color={activeTab === 'report' ? (isDarkMode ? "#90CAF9" : "#1976d2") : (isDarkMode ? "#aaa" : "#666")} 
          />
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'report' && styles.activeTabText,
              isDarkMode && styles.darkModeTabText,
              activeTab === 'report' && isDarkMode && styles.darkModeActiveTabText
            ]}
          >
            Report
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'status' && styles.activeTabItem]}
          onPress={() => handleTabChange('status')}
        >
          <MaterialIcons 
            name="search" 
            size={22} 
            color={activeTab === 'status' ? (isDarkMode ? "#90CAF9" : "#1976d2") : (isDarkMode ? "#aaa" : "#666")} 
          />
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'status' && styles.activeTabText,
              isDarkMode && styles.darkModeTabText,
              activeTab === 'status' && isDarkMode && styles.darkModeActiveTabText
            ]}
          >
            Status
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'claim' && styles.activeTabItem]}
          onPress={() => handleTabChange('claim')}
        >
          <MaterialIcons 
            name="check-circle" 
            size={22} 
            color={activeTab === 'claim' ? (isDarkMode ? "#90CAF9" : "#1976d2") : (isDarkMode ? "#aaa" : "#666")} 
          />
          <Text 
            style={[
              styles.tabText, 
              activeTab === 'claim' && styles.activeTabText,
              isDarkMode && styles.darkModeTabText,
              activeTab === 'claim' && isDarkMode && styles.darkModeActiveTabText
            ]}
          >
            Claim
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        {/* Content */}
        {activeTab === 'report' && renderReportForm()}
        {activeTab === 'status' && renderStatusChecker()}
        {activeTab === 'claim' && renderClaimProcess()}
      </KeyboardAvoidingView>

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
      )}

      {/* Notifications Modal */}
      <Modal
        visible={notificationsVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.notificationsModal, isDarkMode && styles.darkModeModal]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDarkMode && styles.darkModeText]}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotificationsVisible(false)}>
                <MaterialIcons name="close" size={24} color={isDarkMode ? "#fff" : "#333"} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.notificationsList}>
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <TouchableOpacity 
                    key={notification.id} 
                    style={[
                      styles.notificationItem,
                      !notification.isRead && styles.unreadNotification,
                      isDarkMode && styles.darkModeNotificationItem,
                      !notification.isRead && isDarkMode && styles.darkModeUnreadNotification
                    ]}
                    onPress={() => markNotificationAsRead(notification.id)}
                  >
                    <View style={styles.notificationContent}>
                      <Text style={[styles.notificationTitle, isDarkMode && styles.darkModeText]}>
                        {notification.title}
                      </Text>
                      <Text style={[styles.notificationMessage, isDarkMode && styles.darkModeSubtitle]}>
                        {notification.message}
                      </Text>
                      <Text style={[styles.notificationTime, isDarkMode && { color: "#aaa" }]}>
                        {notification.time}
                      </Text>
                    </View>
                    {!notification.isRead && (
                      <View style={styles.notificationDot} />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyNotifications}>
                  <MaterialIcons name="notifications-off" size={48} color={isDarkMode ? "#555" : "#ccc"} />
                  <Text style={[styles.emptyNotificationsText, isDarkMode && styles.darkModeText]}>
                    No notifications yet
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sidebar */}
      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        activeMenuItem={activeMenuItem}
        setActiveMenuItem={setActiveMenuItem}
        isDarkMode={isDarkMode}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  darkModeBackground: {
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  darkModeHeader: {
    backgroundColor: '#1e1e1e',
    shadowColor: '#000',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  darkModeText: {
    color: '#fff',
  },
  darkModeSubtitle: {
    color: '#aaa',
  },
  darkModeDetailText: {
    color: '#bbb',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 16,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f44336',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 1,
  },
  darkModeTabBar: {
    backgroundColor: '#1e1e1e',
    borderBottomColor: '#333',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  activeTabItem: {
    borderBottomWidth: 2,
    borderBottomColor: '#1976d2',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  darkModeTabText: {
    color: '#aaa',
  },
  activeTabText: {
    color: '#1976d2',
    fontWeight: '500',
  },
  darkModeActiveTabText: {
    color: '#90CAF9',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  darkModeInput: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
    color: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  submitButton: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  imageUploadContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
  },
  darkModeImageUpload: {
    borderColor: '#444',
    backgroundColor: '#2a2a2a',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#1976d2',
    marginLeft: 8,
    fontSize: 16,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#1976d2',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
    color: '#333',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  darkModeItemCard: {
    backgroundColor: '#2a2a2a',
    shadowColor: '#000',
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  statusPending: {
    backgroundColor: '#ffb74d',
  },
  statusFound: {
    backgroundColor: '#4caf50',
  },
  statusClaimed: {
    backgroundColor: '#9c27b0',
  },
  statusReview: {
    backgroundColor: '#2196f3',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  itemCardBody: {
    marginBottom: 12,
  },
  itemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  darkModeDetailsButton: {
    color: '#90CAF9',
  },
  viewDetailsButtonText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
    padding: 2,
  },
  darkModeSegmentedControl: {
    backgroundColor: '#333',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  darkModeSegmentButtonActive: {
    backgroundColor: '#444',
  },
  segmentButtonText: {
    fontSize: 14,
    color: '#666',
  },
  segmentButtonTextActive: {
    color: '#333',
    fontWeight: '500',
  },
  darkModeSegmentButtonTextActive: {
    color: '#fff',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  darkModeInfoBox: {
    backgroundColor: '#0d47a1',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  matchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  matchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  matchInfo: {
    flex: 1,
  },
  matchTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  matchConfidence: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchConfidenceText: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  matchCardBody: {
    marginBottom: 16,
  },
  matchSection: {
    marginBottom: 12,
  },
  matchSectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 6,
  },
  matchDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingLeft: 8,
  },
  matchDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  claimButton: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  claimRequestedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  claimRequestedText: {
    color: '#1976d2',
    marginLeft: 8,
    fontSize: 14,
  },
  pickupGuide: {
    flexDirection: 'column',
    backgroundColor: '#f5f5f5',
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  pickupGuideTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  pickupStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickupStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pickupStepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pickupStepText: {
    fontSize: 14,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  notificationsModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '80%',
    padding: 16,
  },
  darkModeModal: {
    backgroundColor: '#1e1e1e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  darkModeNotificationItem: {
    backgroundColor: '#1e1e1e',
    borderBottomColor: '#333',
  },
  unreadNotification: {
    backgroundColor: '#f5f9ff',
  },
  darkModeUnreadNotification: {
    backgroundColor: '#263238',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  notificationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1976d2',
    marginLeft: 8,
    alignSelf: 'center',
  },
  emptyNotifications: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyNotificationsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  quickSelectContainer: {
    marginBottom: 8,
  },
  quickSelectItem: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  darkModeQuickSelectItem: {
    backgroundColor: '#333',
  },
  quickSelectItemActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1976d2',
    borderWidth: 1,
  },
  darkModeQuickSelectItemActive: {
    backgroundColor: '#0d47a1',
    borderColor: '#90CAF9',
  },
  quickSelectItemText: {
    color: '#666',
    fontSize: 14,
  },
  quickSelectItemTextActive: {
    color: '#1976d2',
    fontWeight: '500',
  },
  tipBox: {
    backgroundColor: '#263238',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipText: {
    color: '#fff',
    flex: 1,
    marginHorizontal: 8,
    fontSize: 14,
  }
});

export default LostFoundScreen;