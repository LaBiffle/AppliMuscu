import { Tabs } from 'expo-router';
import { Chrome as Home, Plus, Settings } from 'lucide-react-native';
import { usePathname } from 'expo-router';

export default function TabLayout() {
  const pathname = usePathname();
  const isSessionScreen = pathname.includes('/session/');

  return (
    <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: isSessionScreen ? { display: 'none' } : {
            backgroundColor: '#1a1a1a',
            borderTopColor: '#2a2a2a',
            borderTopWidth: 1,
            paddingBottom: 8,
            paddingTop: 8,
            height: 70,
          },
          tabBarActiveTintColor: '#22c55e',
          tabBarInactiveTintColor: '#6b7280',
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Programmes',
            tabBarIcon: ({ size, color }) => (
              <Home size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: 'Créer',
            tabBarIcon: ({ size, color }) => (
              <Plus size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Paramètres',
            tabBarIcon: ({ size, color }) => (
              <Settings size={size} color={color} />
            ),
          }}
        />
      </Tabs>
  );
}