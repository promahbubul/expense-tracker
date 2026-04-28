import { Redirect, Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/icons';
import { useAuth } from '../../providers/AuthProvider';
import { useAppTheme } from '../../theme';

export default function TabsLayout() {
  const { user } = useAuth();
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: palette.bg },
        tabBarBackground: () => <View style={{ flex: 1, backgroundColor: palette.surface }} />,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopWidth: 0,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          width: '100%',
          marginHorizontal: 0,
          marginBottom: 0,
          height: 52 + bottomInset,
          paddingTop: 0,
          paddingBottom: bottomInset,
          borderTopColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          overflow: 'hidden',
        },
        tabBarItemStyle: {
          minHeight: 52,
        },
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused, color }) => <AppIcon name={focused ? 'home' : 'home-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          tabBarIcon: ({ focused, color }) => <AppIcon name={focused ? 'swap-horizontal' : 'swap-horizontal-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          tabBarIcon: ({ focused, color }) => <AppIcon name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          tabBarIcon: ({ focused, color }) => <AppIcon name={focused ? 'people' : 'people-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          tabBarIcon: ({ focused, color }) => <AppIcon name={focused ? 'stats-chart' : 'stats-chart-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarIcon: ({ focused, color }) => <AppIcon name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
