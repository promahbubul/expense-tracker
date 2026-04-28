import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const splashGraphic = require('../../assets/splash.gif');

export function LaunchSplash() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 10), paddingBottom: Math.max(insets.bottom, 12) }]}>
      <StatusBar style="dark" />
      <Image source={splashGraphic} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
  },
  image: {
    width: 220,
    height: 220,
  },
});
