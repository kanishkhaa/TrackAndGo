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
import SidebarDriver from '../components/SidebarDriver';

const LostFoundDriver = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('report'); // 'report', 'found', 'claims'
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isTipVisible, setIsTipVisible] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Form states for reporting found items
  const [itemDescription, setItemDescription] = useState('');
  const [itemType, setItemType] = useState('');
  const [itemColor, setItemColor] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [dateFound, setDateFound] = useState(''); // Manual input: YYYY-MM-DD
  const [timeFound, setTimeFound] = useState(''); // Manual input: HH:MM
  const [imageUri, setImageUri] = useState(null);

  // Animation value for tip box
  const tipOpacity = new Animated.Value(1);

  // Predefined item types for quick selection
  const commonItemTypes = ['Wallet', 'Phone', 'Keys', 'Bag', 'Umbrella', 'Headphones', 'Laptop', 'Clothing', 'Other'];
  const [selectedItemType, setSelectedItemType] = useState(null);

  // Sample data for found items and claims
  const [foundItems, setFoundItems] = useState([]);
  const [claimRequests, setClaimRequests] = useState([]);

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      setFoundItems([
        {
          id: '1',
          description: 'Black leather wallet',
          type: 'Wallet',
          color: 'Black',
          vehicleNumber: 'Bus 42',
          storageLocation: 'Central Station Lost & Found',
          dateFound: '2025-04-10',
          timeFound: '14:30',
          status: 'Stored',
          referenceNumber: 'FF-2025-001',
          image: 'https://example.com/wallet.jpg',
        },
        {
          id: '2',
          description: 'Blue umbrella',
          type: 'Umbrella',
          color: 'Blue',
          vehicleNumber: 'Train Line 3',
          storageLocation: 'West End Terminal',
          dateFound: '2025-04-12',
          timeFound: '09:15',
          status: 'Claimed',
          referenceNumber: 'FF-2025-002',
          image: null,
        },
      ]);

      setClaimRequests([
        {
          id: '1',
          lostItemRef: 'LF-2025-003',
          foundItemRef: 'FF-2025-001',
          description: 'Black leather wallet',
          userContact: 'user@example.com',
          status: 'Pending',
          submittedDate: '2025-04-11',
        },
      ]);

      setNotifications([
        {
          id: '1',
          title: 'New Claim Request',
          message: 'A claim has been submitted for found item FF-2025-001',
          time: '2 hours ago',
          isRead: false,
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
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
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
    setVehicleNumber('');
    setStorageLocation('');
    setDateFound('');
    setTimeFound('');
    setImageUri(null);
  };

  const handleItemTypeSelect = (type) => {
    setSelectedItemType(type);
    setItemType(type);
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

  const handleSubmit = () => {
    if (!itemType || !itemDescription || !vehicleNumber || !storageLocation) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateFound && !dateRegex.test(dateFound)) {
      Alert.alert('Error', 'Please enter date in YYYY-MM-DD format');
      return;
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (timeFound && !timeRegex.test(timeFound)) {
      Alert.alert('Error', 'Please enter time in HH:MM format');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const newReferenceNumber = `FF-2025-${Math.floor(Math.random() * 1000)}`;

      Alert.alert(
        'Success!',
        `Found item reported successfully.\nReference number: ${newReferenceNumber}`,
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              const newItem = {
                id: String(foundItems.length + 1),
                description: itemDescription,
                type: itemType,
                color: itemColor,
                vehicleNumber,
                storageLocation,
                dateFound: dateFound || 'Unknown',
                timeFound: timeFound || 'Unknown',
                status: 'Stored',
                referenceNumber: newReferenceNumber,
                image: imageUri,
              };
              setFoundItems([...foundItems, newItem]);
              setActiveTab('found');

              const newNotification = {
                id: `${notifications.length + 1}`,
                title: 'Item Reported',
                message: `Found item ${newReferenceNumber} reported successfully.`,
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

  const handleClaimAction = (claimId, action) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const updatedClaims = claimRequests.map((claim) =>
        claim.id === claimId ? { ...claim, status: action === 'approve' ? 'Approved' : 'Rejected' } : claim
      );
      setClaimRequests(updatedClaims);

      const claim = claimRequests.find((c) => c.id === claimId);
      const newNotification = {
        id: `${notifications.length + 1}`,
        title: `Claim ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: `Claim for ${claim.foundItemRef} has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
        time: 'Just now',
        isRead: false,
      };
      setNotifications([newNotification, ...notifications]);

      Alert.alert(
        'Success',
        `Claim has been ${action === 'approve' ? 'approved' : 'rejected'}. User will be notified.`,
        [{ text: 'OK' }]
      );
    }, 1000);
  };

  const markNotificationAsRead = (notificationId) => {
    const updatedNotifications = notifications.map((notification) =>
      notification.id === notificationId ? { ...notification, isRead: true } : notification
    );
    setNotifications(updatedNotifications);
  };

  const getUnreadNotificationsCount = () => {
    return notifications.filter((notification) => !notification.isRead).length;
  };

  const renderReportForm = () => (
    <ScrollView
      style={[styles.formContainer, isDarkMode && styles.darkModeBackground]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={[styles.formTitle, isDarkMode && styles.darkModeText]}>Report Found Item</Text>

      {isTipVisible && (
        <Animated.View style={[styles.tipBox, { opacity: tipOpacity }]}>
          <MaterialIcons name="lightbulb" size={20} color="#FFD700" />
          <Text style={styles.tipText}>
            Tip: Include clear details and a photo to help identify the item!
          </Text>
          <TouchableOpacity onPress={() => setIsTipVisible(false)}>
            <MaterialIcons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={styles.formGroup}>
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
                  selectedItemType === type && isDarkMode && styles.darkModeQuickSelectItemActive,
                ]}
                onPress={() => handleItemTypeSelect(type)}
              >
                <Text
                  style={[
                    styles.quickSelectItemText,
                    selectedItemType === type && styles.quickSelectItemTextActive,
                    isDarkMode && styles.darkModeText,
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
          placeholder="E.g. Wallet, Phone"
          placeholderTextColor={isDarkMode ? '#777' : '#aaa'}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Description*</Text>
        <TextInput
          style={[styles.input, styles.textArea, isDarkMode && styles.darkModeInput]}
          value={itemDescription}
          onChangeText={setItemDescription}
          placeholder="Describe the item"
          placeholderTextColor={isDarkMode ? '#777' : '#aaa'}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Color</Text>
        <TextInput
          style={[styles.input, isDarkMode && styles.darkModeInput]}
          value={itemColor}
          onChangeText={setItemColor}
          placeholder="Main color"
          placeholderTextColor={isDarkMode ? '#777' : '#aaa'}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Vehicle Number*</Text>
        <TextInput
          style={[styles.input, isDarkMode && styles.darkModeInput]}
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          placeholder="E.g. Bus 42, Train Line 3"
          placeholderTextColor={isDarkMode ? '#777' : '#aaa'}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Storage Location*</Text>
        <TextInput
          style={[styles.input, isDarkMode && styles.darkModeInput]}
          value={storageLocation}
          onChangeText={setStorageLocation}
          placeholder="Where the item is stored"
          placeholderTextColor={isDarkMode ? '#777' : '#aaa'}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Date Found (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.darkModeInput]}
            value={dateFound}
            onChangeText={setDateFound}
            placeholder="E.g. 2025-04-15"
            placeholderTextColor={isDarkMode ? '#777' : '#aaa'}
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={[styles.label, isDarkMode && styles.darkModeText]}>Time Found (HH:MM)</Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.darkModeInput]}
            value={timeFound}
            onChangeText={setTimeFound}
            placeholder="E.g. 14:30"
            placeholderTextColor={isDarkMode ? '#777' : '#aaa'}
            keyboardType="numeric"
          />
        </View>
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
              <MaterialIcons
                name="add-photo-alternate"
                size={24}
                color={isDarkMode ? '#90CAF9' : '#1976d2'}
              />
              <Text style={[styles.uploadButtonText, isDarkMode && { color: '#90CAF9' }]}>
                Select Image
              </Text>
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

  const renderFoundItems = () => (
    <ScrollView
      style={[styles.formContainer, isDarkMode && styles.darkModeBackground]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={[styles.formTitle, isDarkMode && styles.darkModeText]}>Found Items</Text>

      {foundItems.length > 0 ? (
        foundItems.map((item) => (
          <View key={item.id} style={[styles.itemCard, isDarkMode && styles.darkModeItemCard]}>
            <View style={styles.itemCardHeader}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemTitle, isDarkMode && styles.darkModeText]}>
                  {item.description}
                </Text>
                <Text style={[styles.itemSubtitle, isDarkMode && styles.darkModeSubtitle]}>
                  Ref: {item.referenceNumber}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  item.status === 'Stored' && styles.statusStored,
                  item.status === 'Claimed' && styles.statusClaimed,
                ]}
              >
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.itemCardBody}>
              <View style={styles.itemDetail}>
                <MaterialIcons name="category" size={16} color={isDarkMode ? '#bbb' : '#666'} />
                <Text style={[styles.itemDetailText, isDarkMode && styles.darkModeDetailText]}>
                  {item.type}
                </Text>
              </View>
              <View style={styles.itemDetail}>
                <MaterialIcons name="directions-bus" size={16} color={isDarkMode ? '#bbb' : '#666'} />
                <Text style={[styles.itemDetailText, isDarkMode && styles.darkModeDetailText]}>
                  {item.vehicleNumber}
                </Text>
              </View>
              <View style={styles.itemDetail}>
                <MaterialIcons name="location-on" size={16} color={isDarkMode ? '#bbb' : '#666'} />
                <Text style={[styles.itemDetailText, isDarkMode && styles.darkModeDetailText]}>
                  {item.storageLocation}
                </Text>
              </View>
              <View style={styles.itemDetail}>
                <MaterialIcons name="event" size={16} color={isDarkMode ? '#bbb' : '#666'} />
                <Text style={[styles.itemDetailText, isDarkMode && styles.darkModeDetailText]}>
                  {item.dateFound} {item.timeFound}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.viewDetailsButton, isDarkMode && styles.darkModeDetailsButton]}
              onPress={() =>
                Alert.alert('Details', `Full details for ${item.referenceNumber}`)
              }
            >
              <Text style={[styles.viewDetailsButtonText, isDarkMode && { color: '#90CAF9' }]}>
                View Details
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={isDarkMode ? '#90CAF9' : '#1976d2'}
              />
            </TouchableOpacity>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons
            name="inventory"
            size={64}
            color={isDarkMode ? '#555' : '#ccc'}
          />
          <Text style={[styles.emptyStateText, isDarkMode && styles.darkModeText]}>
            No found items reported yet
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const renderClaims = () => (
    <ScrollView
      style={[styles.formContainer, isDarkMode && styles.darkModeBackground]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={[styles.formTitle, isDarkMode && styles.darkModeText]}>Claim Requests</Text>

      <View style={[styles.infoBox, isDarkMode && styles.darkModeInfoBox]}>
        <MaterialIcons name="info" size={20} color={isDarkMode ? '#90CAF9' : '#1976d2'} />
        <Text style={[styles.infoText, isDarkMode && styles.darkModeText]}>
          Review and approve or reject claim requests for found items.
        </Text>
      </View>

      {claimRequests.length > 0 ? (
        claimRequests.map((claim) => (
          <View key={claim.id} style={[styles.claimCard, isDarkMode && styles.darkModeItemCard]}>
            <View style={styles.claimCardHeader}>
              <View style={styles.claimInfo}>
                <Text style={[styles.claimTitle, isDarkMode && styles.darkModeText]}>
                  {claim.description}
                </Text>
                <Text style={[styles.claimSubtitle, isDarkMode && styles.darkModeSubtitle]}>
                  Found Ref: {claim.foundItemRef}
                </Text>
                <Text style={[styles.claimSubtitle, isDarkMode && styles.darkModeSubtitle]}>
                  Lost Ref: {claim.lostItemRef}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  claim.status === 'Pending' && styles.statusPending,
                  claim.status === 'Approved' && styles.statusApproved,
                  claim.status === 'Rejected' && styles.statusRejected,
                ]}
              >
                <Text style={styles.statusText}>{claim.status}</Text>
              </View>
            </View>

            <View style={styles.claimCardBody}>
              <View style={styles.claimDetail}>
                <MaterialIcons name="email" size={16} color={isDarkMode ? '#bbb' : '#666'} />
                <Text style={[styles.claimDetailText, isDarkMode && styles.darkModeDetailText]}>
                  {claim.userContact}
                </Text>
              </View>
              <View style={styles.claimDetail}>
                <MaterialIcons name="calendar-today" size={16} color={isDarkMode ? '#bbb' : '#666'} />
                <Text style={[styles.claimDetailText, isDarkMode && styles.darkModeDetailText]}>
                  Submitted: {claim.submittedDate}
                </Text>
              </View>
            </View>

            {claim.status === 'Pending' && (
              <View style={styles.claimActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleClaimAction(claim.id, 'approve')}
                >
                  <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleClaimAction(claim.id, 'reject')}
                >
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons
            name="assignment-turned-in"
            size={64}
            color={isDarkMode ? '#555' : '#ccc'}
          />
          <Text style={[styles.emptyStateText, isDarkMode && styles.darkModeText]}>
            No claim requests yet
          </Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkModeBackground]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.darkModeHeader]}>
        <TouchableOpacity onPress={toggleSidebar}>
          <Feather name="menu" size={24} color={isDarkMode ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkModeText]}>
          Staff Lost & Found
        </Text>
        <View style={styles.headerRightActions}>
          <TouchableOpacity onPress={toggleDarkMode} style={styles.iconButton}>
            {isDarkMode ? (
              <Feather name="sun" size={22} color="#fff" />
            ) : (
              <Feather name="moon" size={22} color="#333" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setNotificationsVisible(true)}
            style={styles.iconButton}
          >
            <Feather name="bell" size={22} color={isDarkMode ? '#fff' : '#333'} />
            {getUnreadNotificationsCount() > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {getUnreadNotificationsCount()}
                </Text>
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
            name="report"
            size={22}
            color={
              activeTab === 'report'
                ? isDarkMode
                  ? '#90CAF9'
                  : '#1976d2'
                : isDarkMode
                ? '#aaa'
                : '#666'
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'report' && styles.activeTabText,
              isDarkMode && styles.darkModeTabText,
              activeTab === 'report' && isDarkMode && styles.darkModeActiveTabText,
            ]}
          >
            Report Found
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'found' && styles.activeTabItem]}
          onPress={() => handleTabChange('found')}
        >
          <MaterialIcons
            name="inventory"
            size={22}
            color={
              activeTab === 'found'
                ? isDarkMode
                  ? '#90CAF9'
                  : '#1976d2'
                : isDarkMode
                ? '#aaa'
                : '#666'
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'found' && styles.activeTabText,
              isDarkMode && styles.darkModeTabText,
              activeTab === 'found' && isDarkMode && styles.darkModeActiveTabText,
            ]}
          >
            Found Items
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'claims' && styles.activeTabItem]}
          onPress={() => handleTabChange('claims')}
        >
          <MaterialIcons
            name="assignment-turned-in"
            size={22}
            color={
              activeTab === 'claims'
                ? isDarkMode
                  ? '#90CAF9'
                  : '#1976d2'
                : isDarkMode
                ? '#aaa'
                : '#666'
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'claims' && styles.activeTabText,
              isDarkMode && styles.darkModeTabText,
              activeTab === 'claims' && isDarkMode && styles.darkModeActiveTabText,
            ]}
          >
            Claims
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        {activeTab === 'report' && renderReportForm()}
        {activeTab === 'found' && renderFoundItems()}
        {activeTab === 'claims' && renderClaims()}
      </KeyboardAvoidingView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
      )}

      <Modal
        visible={notificationsVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.notificationsModal, isDarkMode && styles.darkModeModal]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDarkMode && styles.darkModeText]}>
                Notifications
              </Text>
              <TouchableOpacity onPress={() => setNotificationsVisible(false)}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={isDarkMode ? '#fff' : '#333'}
                />
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
                      !notification.isRead &&
                        isDarkMode &&
                        styles.darkModeUnreadNotification,
                    ]}
                    onPress={() => markNotificationAsRead(notification.id)}
                  >
                    <View style={styles.notificationContent}>
                      <Text
                        style={[styles.notificationTitle, isDarkMode && styles.darkModeText]}
                      >
                        {notification.title}
                      </Text>
                      <Text
                        style={[
                          styles.notificationMessage,
                          isDarkMode && styles.darkModeSubtitle,
                        ]}
                      >
                        {notification.message}
                      </Text>
                      <Text style={[styles.notificationTime, isDarkMode && { color: '#aaa' }]}>
                        {notification.time}
                      </Text>
                    </View>
                    {!notification.isRead && <View style={styles.notificationDot} />}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyNotifications}>
                  <MaterialIcons
                    name="notifications-off"
                    size={48}
                    color={isDarkMode ? '#555' : '#ccc'}
                  />
                  <Text
                    style={[styles.emptyNotificationsText, isDarkMode && styles.darkModeText]}
                  >
                    No notifications yet
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <SidebarDriver
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        navigation={navigation}
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
  statusStored: {
    backgroundColor: '#2196f3',
  },
  statusClaimed: {
    backgroundColor: '#4caf50',
  },
  statusPending: {
    backgroundColor: '#ffb74d',
  },
  statusApproved: {
    backgroundColor: '#4caf50',
  },
  statusRejected: {
    backgroundColor: '#f44336',
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
  claimCard: {
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
  claimCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  claimInfo: {
    flex: 1,
  },
  claimTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  claimSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  claimCardBody: {
    marginBottom: 12,
  },
  claimDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  claimDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  claimActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  approveButton: {
    backgroundColor: '#4caf50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  },
});

export default LostFoundDriver;