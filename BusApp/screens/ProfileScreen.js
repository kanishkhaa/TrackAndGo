import React, { useState, useContext, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { UserContext } from './UserContext';
import SidebarDriver from '../components/SidebarDriver';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const { user, setUserProfile } = useContext(UserContext);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.profileData?.name || '',
    licenseNumber: user?.profileData?.licenseNumber || '',
    contactNumber: user?.profileData?.contactNumber || '',
    vehicleDetails: user?.profileData?.vehicleDetails || '',
    email: user?.profileData?.email || '',
    experience: user?.profileData?.experience || '',
  });
  const [editMode, setEditMode] = useState(!user?.profileComplete);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { name, licenseNumber, contactNumber, vehicleDetails } = formData;
    return name && licenseNumber && contactNumber && vehicleDetails;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please fill all required fields.');
      return;
    }

    setUserProfile(formData);
    setEditMode(false);
    Alert.alert('Success', 'Profile saved successfully!', [
      {
        text: 'OK',
        onPress: () => navigation.navigate('HomeScreenDriver'),
      },
    ]);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  // Close sidebar when navigating away
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setSidebarOpen(false);
    });
    return unsubscribe;
  }, [navigation]);

  const renderFormField = (icon, placeholder, field, keyboardType = 'default') => (
    <View style={styles.inputContainer}>
      <Ionicons name={icon} size={20} color="#4361EE" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={formData[field]}
        onChangeText={(text) => handleInputChange(field, text)}
        keyboardType={keyboardType}
        editable={editMode}
      />
    </View>
  );

  const isProfileComplete = user?.profileComplete && validateForm();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* Main Content */}
      <View style={[styles.mainContent, isSidebarOpen && { opacity: 0.7 }]}>
        <LinearGradient
          colors={['#f8f9fa', '#e9ecef']}
          style={styles.background}
        >
          {/* Header with menu */}
          <View style={styles.headerWithMenu}>
            <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
              <Ionicons name="menu" size={28} color="#4361EE" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Driver Profile</Text>
            <View style={styles.placeholder} />
          </View>
          
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {editMode ? (
              // Edit Mode - Form UI remains the same as it's working well
              <View style={styles.formContainer}>
                <Text style={styles.formTitle}>Complete Your Profile</Text>
                <Text style={styles.formSubtitle}>
                  Please provide your details to continue as a driver.
                </Text>
                
                <View style={styles.formCard}>
                  <Text style={styles.formSectionTitle}>Personal Information</Text>
                  {renderFormField('person', 'Full Name *', 'name')}
                  {renderFormField('mail', 'Email Address', 'email', 'email-address')}
                  {renderFormField('call', 'Contact Number *', 'contactNumber', 'phone-pad')}
                  
                  <Text style={[styles.formSectionTitle, {marginTop: 20}]}>Driver Details</Text>
                  {renderFormField('card', 'Driver\'s License Number *', 'licenseNumber')}
                  {renderFormField('bus', 'Vehicle Details (e.g., Bus Number) *', 'vehicleDetails')}
                  {renderFormField('time', 'Years of Experience', 'experience', 'numeric')}
                  
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleSubmit}
                  >
                    <LinearGradient
                      colors={['#4361EE', '#3A56DE']}
                      style={styles.buttonGradient}
                    >
                      <Text style={styles.buttonText}>Save Profile</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Profile View Mode - COMPLETELY REDESIGNED
              <View style={styles.profileViewContainer}>
                {/* Top Card with Avatar and Name */}
                <LinearGradient
                  colors={['#4361EE', '#3A56DE']}
                  style={styles.profileHeaderCard}
                >
                  <View style={styles.avatarWrapper}>
                    <Image
                      source={{ uri: 'https://via.placeholder.com/150' }}
                      style={styles.profileAvatar}
                    />
                    <View style={styles.profileStatusBadge}>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    </View>
                  </View>
                  
                  <Text style={styles.profileHeaderName}>{formData.name}</Text>
                  <View style={styles.driverIdContainer}>
                    <Ionicons name="shield-checkmark" size={16} color="#fff" />
                    <Text style={styles.driverIdText}>Driver ID: {formData.licenseNumber.slice(-6)}</Text>
                  </View>
                </LinearGradient>
                
                {/* Quick Stats Cards */}
                <View style={styles.statsContainer}>
                  <View style={styles.statCard}>
                    <Ionicons name="time-outline" size={28} color="#4361EE" />
                    <Text style={styles.statValue}>{formData.experience || '0'}</Text>
                    <Text style={styles.statLabel}>Years Exp.</Text>
                  </View>
                  
                  <View style={styles.statCard}>
                    <Ionicons name="star-outline" size={28} color="#4361EE" />
                    <Text style={styles.statValue}>4.8</Text>
                    <Text style={styles.statLabel}>Rating</Text>
                  </View>
                  
                  <View style={styles.statCard}>
                    <Ionicons name="car-outline" size={28} color="#4361EE" />
                    <Text style={styles.statValue}>125</Text>
                    <Text style={styles.statLabel}>Trips</Text>
                  </View>
                </View>
                
                {/* Details Card */}
                <View style={styles.detailsCard}>
                  <Text style={styles.detailsCardTitle}>Personal Information</Text>
                  
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons name="call-outline" size={20} color="#4361EE" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Phone Number</Text>
                      <Text style={styles.detailValue}>{formData.contactNumber}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.detailAction}
                      onPress={() => setEditMode(true)}
                    >
                      <Ionicons name="create-outline" size={18} color="#4361EE" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.detailDivider} />
                  
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons name="mail-outline" size={20} color="#4361EE" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Email Address</Text>
                      <Text style={styles.detailValue}>{formData.email || 'Not provided'}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.detailAction}
                      onPress={() => setEditMode(true)}
                    >
                      <Ionicons name="create-outline" size={18} color="#4361EE" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Vehicle Details Card */}
                <View style={styles.detailsCard}>
                  <Text style={styles.detailsCardTitle}>Vehicle Information</Text>
                  
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons name="bus-outline" size={20} color="#4361EE" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Vehicle Details</Text>
                      <Text style={styles.detailValue}>{formData.vehicleDetails}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.detailAction}
                      onPress={() => setEditMode(true)}
                    >
                      <Ionicons name="create-outline" size={18} color="#4361EE" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.detailDivider} />
                  
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons name="card-outline" size={20} color="#4361EE" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>License Number</Text>
                      <Text style={styles.detailValue}>{formData.licenseNumber}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.detailAction}
                      onPress={() => setEditMode(true)}
                    >
                      <Ionicons name="create-outline" size={18} color="#4361EE" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Edit Profile Button */}
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={() => setEditMode(true)}
                >
                  <LinearGradient
                    colors={['#4361EE', '#3A56DE']}
                    style={styles.editButtonGradient}
                  >
                    <Ionicons name="create-outline" size={20} color="#fff" style={{marginRight: 8}} />
                    <Text style={styles.editButtonText}>Edit Full Profile</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </View>

      {/* Sidebar */}
      <SidebarDriver
        visible={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navigation={navigation}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  background: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  headerWithMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  placeholder: {
    width: 28,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  
  // Form styles (keeping the same as they're working well)
  formContainer: {
    padding: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // NEW PROFILE VIEW STYLES
  profileViewContainer: {
    padding: 16,
  },
  profileHeaderCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  profileStatusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#22C55E',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileHeaderName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  driverIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  driverIdText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '500',
    fontSize: 14,
  },
  
  // Stats Section
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flex: 1,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  
  // Details Card
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
oligedRadius: 6,
    elevation: 2,
  },
  detailsCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(67, 97, 238, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  detailAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(67, 97, 238, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#eaeaea',
    marginVertical: 8,
  },
  
  // Edit Profile Button
  editProfileButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 24,
  },
  editButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;