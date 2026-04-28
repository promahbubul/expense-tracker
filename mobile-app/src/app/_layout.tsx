import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LaunchSplash } from '../features/shell/LaunchSplash';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { ThemeProvider, useAppTheme } from '../theme';

function RootNavigator() {
  const { ready } = useAuth();
  const { palette } = useAppTheme();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!ready || !splashDone) {
    return <LaunchSplash />;
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
