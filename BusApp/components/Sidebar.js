import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../screens/UserContext';



const sidebarStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    flexDirection: 'row',
  },
  sidebar: {
    width: '75%',
    backgroundColor: '#fff',
    height: '100%',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 15,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  userInfo: {
    alignItems: 'center',
    paddingVertical: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#777',
  },
  menuItems: {
    flex: 1,
    marginVertical: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  activeMenuItem: {
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
  },
  activeMenuItemText: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  menuItemText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 15,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  signOutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
});

const Sidebar = ({ visible, activeMenuItem, onClose, onMenuItemPress, onSignOut }) => {
  const navigation = useNavigation();
  const { user } = useContext(UserContext);

  // Prevent Sidebar.js from rendering for drivers
  if (user?.role === 'driver') {
    console.warn('Sidebar.js attempted to render for a driver. Use SidebarDriver.js instead.');
    return null;
  }

  if (!visible) return null;

  const handleNavigation = (menuItem) => {
    if (onMenuItemPress) {
      onMenuItemPress(menuItem);
    }
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
      case 'chatbot':
      navigation.navigate('ChatbotScreen'); // 👈 Add this line
      break;
      default:
        break;
    }
    onClose();
  };

  const handleSignOutNavigation = () => {
    if (onSignOut) {
      onSignOut();
    }
    navigation.navigate('Onboarding');
    onClose();
  };

  const userName = user?.profileData?.name || 'John Doe';
  const userInitial = userName.charAt(0).toUpperCase();
  const userContact = user?.profileData?.contactNumber || 'john.doe@example.com';

  return (
    <View style={[sidebarStyles.container, { display: visible ? 'flex' : 'none' }]}>
      <View style={sidebarStyles.sidebar}>
        <View style={sidebarStyles.header}>
          <Text style={sidebarStyles.title}>TrackNGo</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={sidebarStyles.userInfo}>
          <View style={sidebarStyles.avatar}>
            <Text style={sidebarStyles.avatarText}>{userInitial}</Text>
          </View>
          <Text style={sidebarStyles.userName}>{userName}</Text>
          <Text style={sidebarStyles.userEmail}>{userContact}</Text>
        </View>

        <ScrollView style={sidebarStyles.menuItems}>
          <SidebarItem 
            label="Home"
            icon="home"
            menuItem="home"
            activeMenuItem={activeMenuItem}
            onPress={handleNavigation}
          />
          <SidebarItem 
            label="Subscription"
            icon="card"
            menuItem="subscription"
            activeMenuItem={activeMenuItem}
            onPress={handleNavigation}
          />
          <SidebarItem 
            label="Journey Planner"
            customIcon={<MaterialIcons name="directions-bus" size={20} color={activeMenuItem === 'journeyplanner' ? '#1976d2' : '#555'} />}
            menuItem="journeyplanner"
            activeMenuItem={activeMenuItem}
            onPress={handleNavigation}
          />
          <SidebarItem 
            label="Lost & Found"
            icon="search"
            menuItem="lost"
            activeMenuItem={activeMenuItem}
            onPress={handleNavigation}
          />
          <SidebarItem 
  label="Chatbot"
  icon="chatbubble-ellipses-outline"
  menuItem="chatbot"
  activeMenuItem={activeMenuItem}
  onPress={handleNavigation}
/>
          <SidebarItem 
            label="Settings"
            icon="settings"
            menuItem="settings"
            activeMenuItem={activeMenuItem}
            onPress={handleNavigation}
          />
        </ScrollView>

        <TouchableOpacity
          style={sidebarStyles.signOutButton}
          onPress={handleSignOutNavigation}
        >
          <Ionicons name="log-out" size={20} color="#fff" />
          <Text style={sidebarStyles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={sidebarStyles.overlay}
        onPress={onClose}
        activeOpacity={1}
      />
    </View>
  );
};

const SidebarItem = ({ label, icon, customIcon, menuItem, activeMenuItem, onPress }) => (
  <TouchableOpacity
    style={[
      sidebarStyles.menuItem,
      activeMenuItem === menuItem && sidebarStyles.activeMenuItem,
    ]}
    onPress={() => onPress(menuItem)}
  >
    {customIcon ? customIcon : (
      <Ionicons
        name={icon}
        size={20}
        color={activeMenuItem === menuItem ? '#1976d2' : '#555'}
      />
    )}
    <Text
      style={[
        sidebarStyles.menuItemText,
        activeMenuItem === menuItem && sidebarStyles.activeMenuItemText,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export default Sidebar;