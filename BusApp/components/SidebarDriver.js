import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../screens/UserContext';

const SidebarDriver = ({ visible, onClose, navigation }) => {
  const { user } = useContext(UserContext);
  const [activeMenuItem, setActiveMenuItem] = useState('Home');

  if (!visible) return null;

  const handleMenuItemPress = (menuItem) => {
    setActiveMenuItem(menuItem);
    switch (menuItem) {
      case 'Home':
        navigation.navigate('HomeScreenDriver');
        break;
      case 'Profile':
        navigation.navigate('ProfileScreen');
        break;
      case 'LostFound':
        navigation.navigate('LostFoundDriver');
        break;
      default:
        break;
    }
    onClose();
  };

  const handleSignOut = () => {
    setActiveMenuItem('Home'); // Reset menu item on sign-out
    navigation.navigate('Onboarding');
    onClose();
  };

  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        <View style={styles.header}>
          <Text style={styles.title}>Driver Dashboard</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.profileData?.name?.charAt(0)?.toUpperCase() || 'JD'}
            </Text>
          </View>
          <Text style={styles.userName}>
            {user?.profileData?.name || 'John Doe'}
          </Text>
          <Text style={styles.userEmail}>
            {user?.profileData?.contactNumber || 'john.doe@example.com'}
          </Text>
        </View>

        <ScrollView style={styles.menuItems}>
          <TouchableOpacity
            style={[
              styles.menuItem,
              activeMenuItem === 'Home' && styles.activeMenuItem,
            ]}
            onPress={() => handleMenuItemPress('Home')}
          >
            <Ionicons
              name="home"
              size={20}
              color={activeMenuItem === 'Home' ? '#1976d2' : '#555'}
            />
            <Text
              style={[
                styles.menuItemText,
                activeMenuItem === 'Home' && styles.activeMenuItemText,
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.menuItem,
              activeMenuItem === 'Profile' && styles.activeMenuItem,
            ]}
            onPress={() => handleMenuItemPress('Profile')}
          >
            <Ionicons
              name="person"
              size={20}
              color={activeMenuItem === 'Profile' ? '#1976d2' : '#555'}
            />
            <Text
              style={[
                styles.menuItemText,
                activeMenuItem === 'Profile' && styles.activeMenuItemText,
              ]}
            >
              Profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.menuItem,
              activeMenuItem === 'LostFound' && styles.activeMenuItem,
            ]}
            onPress={() => handleMenuItemPress('LostFound')}
          >
            <Ionicons
              name="search"
              size={20}
              color={activeMenuItem === 'LostFound' ? '#1976d2' : '#555'}
            />
            <Text
              style={[
                styles.menuItemText,
                activeMenuItem === 'LostFound' && styles.activeMenuItemText,
              ]}
            >
              Lost & Found
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out" size={20} color="#fff" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.overlay}
        onPress={onClose}
        activeOpacity={1}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
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

export default SidebarDriver;
