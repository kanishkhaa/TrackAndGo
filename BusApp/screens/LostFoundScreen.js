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
import { Feather, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const API_URL = 'http://192.168.11.179:3000/api/lost-found';

const LostFoundScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('report');
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isTipVisible, setIsTipVisible] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Form states
  const [itemDescription, setItemDescription] = useState('');
  const [itemType, setItemType] = useState('');
  const [customItemType, setCustomItemType] = useState('');
  const [itemColor, setItemColor] = useState('');
  const [brand, setBrand] = useState('');
  const [uniqueIdentifiers, setUniqueIdentifiers] = useState('');
  const [dateLost, setDateLost] = useState('');
  const [timeLost, setTimeLost] = useState('');
  const [route, setRoute] = useState('');
  const [customRoute, setCustomRoute] = useState('');
  const [station, setStation] = useState('');
  const [customStation, setCustomStation] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [imageUri, setImageUri] = useState(null);

  // Animation value for tip box
  const tipOpacity = new Animated.Value(1);

  // Predefined item types, routes, and stations
  const commonItemTypes = ['Wallet', 'Phone', 'Keys', 'Bag', 'Umbrella', 'Headphones', 'Laptop', 'Clothing', 'Other'];
  const commonRoutes = ['Bus 42', 'Bus 105', 'Train Line 1', 'Train Line 3', 'Metro A', 'Metro B', 'Tram 7'];
  const commonStations = ['Central Station', 'West End Terminal', 'North Square', 'Market Street', 'University Stop', 'Airport Terminal'];
  const [selectedItemType, setSelectedItemType] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [activeMenuItem, setActiveMenuItem] = useState('lost');
  const [lostItems, setLostItems] = useState([]);
  const [claimRequests, setClaimRequests] = useState([]);

  useEffect(() => {
    fetchData();

    // Animate tip box
    setTimeout(() => {
      Animated.timing(tipOpacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => setIsTipVisible(false));
    }, 10000);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [lostResponse, claimsResponse, notificationsResponse] = await Promise.all([
        axios.get(`${API_URL}/lost`),
        axios.get(`${API_URL}/claims`),
        axios.get(`${API_URL}/notifications`),
      ]);

      setLostItems(lostResponse.data);
      setClaimRequests(claimsResponse.data);
      setNotifications(notificationsResponse.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData().then(() => setRefreshing(false));
  }, []);

  const toggleSidebar = () => { setSidebarVisible(prev => !prev); };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  const handleMenuItemPress = (menuItem) => {
    setActiveMenuItem(menuItem);
  };
  const handleSignOut = () => {
    setActiveMenuItem('home');
    navigation.navigate('Onboarding');
    setSidebarVisible(false);
  };
  const resetForm = () => {
    setItemDescription('');
    setItemType('');
    setCustomItemType('');
    setSelectedItemType(null);
    setItemColor('');
    setBrand('');
    setUniqueIdentifiers('');
    setDateLost('');
    setTimeLost('');
    setRoute('');
    setCustomRoute('');
    setSelectedRoute(null);
    setStation('');
    setCustomStation('');
    setSelectedStation(null);
    setContactInfo('');
    setImageUri(null);
  };

  const handleItemTypeSelect = (type) => {
    setSelectedItemType(type);
    setItemType(type);
    if (type !== 'Other') {
      setCustomItemType('');
    }
  };

  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
    setRoute(route);
    if (route !== 'Other') {
      setCustomRoute('');
    }
  };

  const handleStationSelect = (station) => {
    setSelectedStation(station);
    setStation(station);
    if (station !== 'Other') {
      setCustomStation('');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access photos');
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

  const handleSubmit = async () => {
    const finalItemType = selectedItemType === 'Other' ? customItemType : itemType;
    const finalRoute = selectedRoute === 'Other' ? customRoute : route;
    const finalStation = selectedStation === 'Other' ? customStation : station;

    if (!finalItemType || !itemDescription || !finalRoute || !finalStation || !contactInfo) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateLost && !dateRegex.test(dateLost)) {
      Alert.alert('Error', 'Please enter date in YYYY-MM-DD format');
      return;
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (timeLost && !timeRegex.test(timeLost)) {
      Alert.alert('Error', 'Please enter time in HH:MM format');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/lost`, {
        description: itemDescription,
        type: finalItemType,
        color: itemColor,
        brand,
        uniqueIdentifiers,
        date: dateLost,
        time: timeLost,
        route: finalRoute,
        station: finalStation,
        contactInfo,
        image: imageUri,
      });

      Alert.alert(
        'Success!',
        `Lost item reported successfully.\nReference number: ${response.data.referenceNumber}`,
        [{
          text: 'OK',
          onPress: () => {
            resetForm();
            fetchData();
            setActiveTab('lost');
          },
        }]
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to submit report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimRequest = async (claimId) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/claims/request/${claimId}`);
      Alert.alert('Success', 'Claim request submitted successfully');
      fetchData();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to submit claim request');
    } finally {
      setIsLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await axios.put(`${API_URL}/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error(error);
    }
  };

  const getUnreadNotificationsCount = () => {
    return notifications.filter(notification => !notification.isRead).length;
  };

  const renderReportForm = () => (
    <ScrollView
      style={[styles.formContainer, isDarkMode && styles.darkModeBackground]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={[styles.formTitle, isDarkMode && styles.darkModeText]}>Report Lost Item</Text>
      <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Item Type *</Text>
      <View style={styles.itemTypeContainer}>
        {commonItemTypes.map((type, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.itemTypeButton,
              selectedItemType === type && styles.selectedItemType,
              isDarkMode && styles.darkModeButton,
            ]}
            onPress={() => handleItemTypeSelect(type)}
          >
            <Text style={[styles.itemTypeText, isDarkMode && styles.darkModeText]}>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {selectedItemType === 'Other' && (
        <TextInput
          style={[styles.input, isDarkMode && styles.darkModeInput]}
          value={customItemType}
          onChangeText={setCustomItemType}
          placeholder="Enter custom item type"
          placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
        />
      )}

      <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Description *</Text>
      <TextInput
        style={[styles.input, isDarkMode && styles.darkModeInput]}
        value={itemDescription}
        onChangeText={setItemDescription}
        placeholder="e.g., Black leather wallet"
        placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
        multiline
      />

      <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Color</Text>
      <TextInput
        style={[styles.input, isDarkMode && styles.darkModeInput]}
        value={itemColor}
        onChangeText={setItemColor}
        placeholder="e.g., Black"
        placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
      />

      <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Brand</Text>
      <TextInput
        style={[styles.input, isDarkMode && styles.darkModeInput]}
        value={brand}
        onChangeText={setBrand}
        placeholder="e.g., Apple"
        placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
      />

      <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Unique Identifiers</Text>
      <TextInput
        style={[styles.input, isDarkMode && styles.darkModeInput]}
        value={uniqueIdentifiers}
        onChangeText={setUniqueIdentifiers}
        placeholder="e.g., Name tag, scratch on case"
        placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
        multiline
      />

<Text style={[styles.label, isDarkMode && styles.darkModeText]}>Route *</Text>
<View style={styles.itemTypeContainer}>
  {[...commonRoutes, 'Other'].map((route, index) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.itemTypeButton,
        selectedRoute === route && styles.selectedItemType,
        isDarkMode && styles.darkModeButton,
      ]}
      onPress={() => handleRouteSelect(route)}
    >
      <Text style={[styles.itemTypeText, isDarkMode && styles.darkModeText]}>{route}</Text>
    </TouchableOpacity>
  ))}
</View>

      {selectedRoute === 'Other' && (
        <TextInput
          style={[styles.input, isDarkMode && styles.darkModeInput]}
          value={customRoute}
          onChangeText={setCustomRoute}
          placeholder="Enter custom route"
          placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
        />
      )}

<Text style={[styles.label, isDarkMode && styles.darkModeText]}>Station *</Text>
<View style={styles.itemTypeContainer}>
  {[...commonStations, 'Other'].map((station, index) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.itemTypeButton,
        selectedStation === station && styles.selectedItemType,
        isDarkMode && styles.darkModeButton,
      ]}
      onPress={() => handleStationSelect(station)}
    >
      <Text style={[styles.itemTypeText, isDarkMode && styles.darkModeText]}>{station}</Text>
    </TouchableOpacity>
  ))}
</View>

      {selectedStation === 'Other' && (
        <TextInput
          style={[styles.input, isDarkMode && styles.darkModeInput]}
          value={customStation}
          onChangeText={setCustomStation}
          placeholder="Enter custom station"
          placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
        />
      )}

      <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Date Lost (YYYY-MM-DD)</Text>
      <TextInput
        style={[styles.input, isDarkMode && styles.darkModeInput]}
        value={dateLost}
        onChangeText={setDateLost}
        placeholder="e.g., 2025-05-01"
        placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
      />

      <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Time Lost (HH:MM)</Text>
      <TextInput
        style={[styles.input, isDarkMode && styles.darkModeInput]}
        value={timeLost}
        onChangeText={setTimeLost}
        placeholder="e.g., 14:30"
        placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
      />

      <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Contact Info *</Text>
      <TextInput
        style={[styles.input, isDarkMode && styles.darkModeInput]}
        value={contactInfo}
        onChangeText={setContactInfo}
        placeholder="e.g., email or phone"
        placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
      />

      <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Upload Image</Text>
      <TouchableOpacity style={[styles.uploadButton, isDarkMode && styles.darkModeButton]} onPress={pickImage}>
        <Text style={[styles.uploadButtonText, isDarkMode && styles.darkModeText]}>
          {imageUri ? 'Image Selected' : 'Choose Image'}
        </Text>
      </TouchableOpacity>
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.imagePreview} />
      )}

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderLostItems = () => (
    <ScrollView
      style={[styles.formContainer, isDarkMode && styles.darkModeBackground]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={[styles.formTitle, isDarkMode && styles.darkModeText]}>Lost Items</Text>
      {lostItems.length === 0 ? (
        <Text style={[styles.noItemsText, isDarkMode && styles.darkModeText]}>No items reported yet.</Text>
      ) : (
        lostItems.map((item) => (
          <View key={item._id} style={[styles.itemCard, isDarkMode && styles.darkModeCard]}>
            <Text style={[styles.itemText, isDarkMode && styles.darkModeText]}>
              Reference: {item.referenceNumber}
            </Text>
            <Text style={[styles.itemText, isDarkMode && styles.darkModeText]}>
              Description: {item.description}
            </Text>
            <Text style={[styles.itemText, isDarkMode && styles.darkModeText]}>
              Route: {item.route}
            </Text>
            <Text style={[styles.itemText, isDarkMode && styles.darkModeText]}>
              Station: {item.station}
            </Text>
            <Text style={[styles.itemText, isDarkMode && styles.darkModeText]}>
              Status: {item.status}
            </Text>
            {item.image && (
              <Image source={{ uri: item.image }} style={styles.itemImage} />
            )}
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderClaims = () => (
    <ScrollView
      style={[styles.formContainer, isDarkMode && styles.darkModeBackground]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={[styles.formTitle, isDarkMode && styles.darkModeText]}>Claim Requests</Text>
      {claimRequests.length === 0 ? (
        <Text style={[styles.noItemsText, isDarkMode && styles.darkModeText]}>No claim requests.</Text>
      ) : (
        claimRequests.map((claim) => (
          <View key={claim._id} style={[styles.itemCard, isDarkMode && styles.darkModeCard]}>
            <Text style={[styles.itemText, isDarkMode && styles.darkModeText]}>
              Lost Item Ref: {claim.lostItemRef}
            </Text>
            <Text style={[styles.itemText, isDarkMode && styles.darkModeText]}>
              Found Item Ref: {claim.foundItemRef}
            </Text>
            <Text style={[styles.itemText, isDarkMode && styles.darkModeText]}>
              Description: {claim.description}
            </Text>
            <Text style={[styles.itemText, isDarkMode && styles.darkModeText]}>
              Match Confidence: {claim.matchConfidence}
            </Text>
            <Text style={[styles.itemText, isDarkMode && styles.darkModeText]}>
              Status: {claim.status}
            </Text>
            {claim.status === 'Under Review' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.claimButton, isLoading && styles.disabledButton]}
                onPress={() => handleClaimRequest(claim._id)}
                disabled={isLoading}
              >
                <Text style={styles.actionButtonText}>Request Claim</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkModeBackground]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={[styles.header, isDarkMode && styles.darkModeHeader]}>
          <TouchableOpacity onPress={toggleSidebar}>
            <Feather name="menu" size={24} color={isDarkMode ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.darkModeText]}>Lost & Found</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => setNotificationsVisible(true)}>
              <Feather name="bell" size={24} color={isDarkMode ? '#fff' : '#000'} />
              {getUnreadNotificationsCount() > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{getUnreadNotificationsCount()}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleDarkMode}>
              <MaterialIcons
                name={isDarkMode ? 'light-mode' : 'dark-mode'}
                size={24}
                color={isDarkMode ? '#fff' : '#000'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {isTipVisible && (
          <Animated.View style={[styles.tipBox, { opacity: tipOpacity }, isDarkMode && styles.darkModeCard]}>
            <Text style={[styles.tipText, isDarkMode && styles.darkModeText]}>
              Tip: Provide detailed information to increase the chances of recovering your lost item!
            </Text>
            <TouchableOpacity onPress={() => setIsTipVisible(false)}>
              <Feather name="x" size={20} color={isDarkMode ? '#fff' : '#000'} />
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={[styles.tabContainer, isDarkMode && styles.darkModeBackground]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'report' && styles.activeTab, isDarkMode && styles.darkModeTab]}
            onPress={() => handleTabChange('report')}
          >
            <Text style={[styles.tabText, activeTab === 'report' && styles.activeTabText, isDarkMode && styles.darkModeText]}>
              Report
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'lost' && styles.activeTab, isDarkMode && styles.darkModeTab]}
            onPress={() => handleTabChange('lost')}
          >
            <Text style={[styles.tabText, activeTab === 'lost' && styles.activeTabText, isDarkMode && styles.darkModeText]}>
              Lost Items
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'claims' && styles.activeTab, isDarkMode && styles.darkModeTab]}
            onPress={() => handleTabChange('claims')}
          >
            <Text style={[styles.tabText, activeTab === 'claims' && styles.activeTabText, isDarkMode && styles.darkModeText]}>
              Claims
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'report' && renderReportForm()}
        {activeTab === 'lost' && renderLostItems()}
        {activeTab === 'claims' && renderClaims()}

        <Modal
          visible={notificationsVisible}
          animationType="slide"
          onRequestClose={() => setNotificationsVisible(false)}
        >
          <SafeAreaView style={[styles.modalContainer, isDarkMode && styles.darkModeBackground]}>
            <View style={[styles.modalHeader, isDarkMode && styles.darkModeHeader]}>
              <Text style={[styles.modalTitle, isDarkMode && styles.darkModeText]}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotificationsVisible(false)}>
                <Feather name="x" size={24} color={isDarkMode ? '#fff' : '#000'} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {notifications.length === 0 ? (
                <Text style={[styles.noItemsText, isDarkMode && styles.darkModeText]}>No notifications</Text>
              ) : (
                notifications.map((notification) => (
                  <TouchableOpacity
                    key={notification._id}
                    style={[styles.notificationItem, !notification.isRead && styles.unreadNotification, isDarkMode && styles.darkModeCard]}
                    onPress={() => markNotificationAsRead(notification._id)}
                  >
                    <Text style={[styles.notificationTitle, isDarkMode && styles.darkModeText]}>
                      {notification.title}
                    </Text>
                    <Text style={[styles.notificationText, isDarkMode && styles.darkModeText]}>
                      {notification.message}
                    </Text>
                    <Text style={[styles.notificationTime, isDarkMode && styles.darkModeText]}>
                      {new Date(notification.time).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        <Sidebar
  visible={sidebarVisible}
  activeMenuItem={activeMenuItem}
  onClose={() => setSidebarVisible(false)}
  onMenuItemPress={handleMenuItemPress}
  onSignOut={handleSignOut}
/>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  notificationBadge: {
    position: 'absolute',
    right: -8,
    top: -8,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tipBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e0f7fa',
    padding: 10,
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 8,
  },
  tipText: {
    flex: 1,
    color: '#00796b',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 100, // Extra padding to ensure submit button is fully visible
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  itemTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    gap: 10,
  },
  itemTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    backgroundColor: '#fff',
    minWidth: 100, // Ensure buttons are wide enough
  },
  selectedItemType: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  itemTypeText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  uploadButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
    resizeMode: 'cover',
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  itemCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemText: {
    fontSize: 14,
    marginBottom: 5,
  },
  itemImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 10,
  },
  noItemsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  claimButton: {
    backgroundColor: '#007bff',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  unreadNotification: {
    backgroundColor: '#e0f7fa',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  notificationText: {
    fontSize: 14,
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
  darkModeBackground: {
    backgroundColor: '#121212',
  },
  darkModeHeader: {
    backgroundColor: '#1f1f1f',
    borderBottomColor: '#333',
  },
  darkModeTab: {
    backgroundColor: '#1f1f1f',
  },
  darkModeText: {
    color: '#fff',
  },
  darkModeInput: {
    backgroundColor: '#1f1f1f',
    borderColor: '#444',
    color: '#fff',
  },
  darkModeButton: {
    backgroundColor: '#1f1f1f',
    borderColor: '#444',
  },
  darkModeCard: {
    backgroundColor: '#1f1f1f',
    shadowColor: '#fff',
  },
});

export default LostFoundScreen;