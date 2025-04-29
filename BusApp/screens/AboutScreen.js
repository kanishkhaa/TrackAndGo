import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Sidebar from '../components/Sidebar'; // Update this path based on your project structure
import { Ionicons } from '@expo/vector-icons';

export default function AboutScreen() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('about');

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleMenuItemPress = (id) => {
    setActiveMenuItem(id);
    setSidebarVisible(false); // Close sidebar after selection
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Sidebar Component */}
      <Sidebar
        visible={sidebarVisible}
        activeMenuItem={activeMenuItem}
        onClose={() => setSidebarVisible(false)}
        onMenuItemPress={handleMenuItemPress}
        onSignOut={() => console.log('Sign Out Pressed')}
      />

      {/* Top bar to trigger sidebar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleSidebar}>
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerText}>About</Text>
      </View>

      {/* Main content */}
      <View style={styles.container}>
        <Text style={styles.text}>About Screen</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f8f8',
    elevation: 4,
  },
  headerText: {
    fontSize: 20,
    marginLeft: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
  },
});
