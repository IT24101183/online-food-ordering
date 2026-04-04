import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onNavigate, destination }) => {
  useEffect(() => {
    // Show splash screen for 4 seconds then navigate to the persistent destination
    const timer = setTimeout(() => {
      onNavigate(destination || 'login');
    }, 4000);

    return () => clearTimeout(timer);
  }, [onNavigate, destination]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../Images/EatUp.jpg.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C8D9C6', // Adjusted background to match standard pale green
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '80%',
    height: '80%',
  },
});

export default SplashScreen;
