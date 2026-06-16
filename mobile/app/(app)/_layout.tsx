import { Tabs } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/auth.store';

function LogoutButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.logout}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Log out"
    >
      <Ionicons name="log-out-outline" size={18} color={colors.accent} />
      <Text style={styles.logoutLabel}>Logout</Text>
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  const token = useAuthStore((state) => state.token);
  const { logout } = useAuth();
  useSocket(token, logout);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerRight: () => <LogoutButton onPress={logout} />,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="overview"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Stocks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="chart" options={{ href: null, title: 'Chart' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  logoutLabel: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});
