// ============================================
// GymTrack Pro - Navigation System
// ============================================
import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors, fontSize, fontWeight } from '../theme';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/DashboardScreen';
import AdminClientsScreen from '../screens/admin/ClientsScreen';
import AdminTrainersScreen from '../screens/admin/TrainersScreen';
import GymQRScreen from '../screens/admin/GymQRScreen';
import NotificationsScreen from '../screens/admin/NotificationsScreen';

// Trainer Screens
import TrainerDashboardScreen from '../screens/trainer/DashboardScreen';
import TrainerClientsScreen from '../screens/trainer/MyClientsScreen';
import TrainerAttendanceScreen from '../screens/trainer/MyAttendanceScreen';

// Client Screens
import ClientDashboardScreen from '../screens/client/DashboardScreen';
import ClientAttendanceScreen from '../screens/client/AttendanceScreen';
import ClientRoutineScreen from '../screens/client/MyRoutineScreen';
import ClientProfileScreen from '../screens/client/ProfileScreen';

// Shared Screens
import ScanQRScreen from '../screens/shared/ScanQRScreen';

const AuthStack = createNativeStackNavigator();
const AdminTab = createBottomTabNavigator();
const TrainerTab = createBottomTabNavigator();
const ClientTab = createBottomTabNavigator();

// --- Auth Navigator ---
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// Tab bar styling
const tabScreenOptions = {
  headerShown: false,
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarLabelStyle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
};

// --- Admin Navigator ---
function AdminNavigator() {
  return (
    <AdminTab.Navigator screenOptions={tabScreenOptions}>
      <AdminTab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <AdminTab.Screen
        name="Clients"
        component={AdminClientsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <AdminTab.Screen
        name="GymQR"
        component={GymQRScreen}
        options={{
          tabBarLabel: 'QR Code',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="qr-code" size={size} color={color} />
          ),
        }}
      />
      <AdminTab.Screen
        name="Trainers"
        component={AdminTrainersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" size={size} color={color} />
          ),
        }}
      />
      <AdminTab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
        }}
      />
    </AdminTab.Navigator>
  );
}

// --- Trainer Navigator ---
function TrainerNavigator() {
  return (
    <TrainerTab.Navigator screenOptions={tabScreenOptions}>
      <TrainerTab.Screen
        name="Dashboard"
        component={TrainerDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <TrainerTab.Screen
        name="ScanQR"
        component={ScanQRScreen}
        options={{
          tabBarLabel: 'Scan QR',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="qr-code" size={size} color={color} />
          ),
        }}
      />
      <TrainerTab.Screen
        name="MyClients"
        component={TrainerClientsScreen}
        options={{
          tabBarLabel: 'My Clients',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <TrainerTab.Screen
        name="MyAttendance"
        component={TrainerAttendanceScreen}
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <TrainerTab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
        }}
      />
    </TrainerTab.Navigator>
  );
}

// --- Client Navigator ---
function ClientNavigator() {
  return (
    <ClientTab.Navigator screenOptions={tabScreenOptions}>
      <ClientTab.Screen
        name="Dashboard"
        component={ClientDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <ClientTab.Screen
        name="ScanQR"
        component={ScanQRScreen}
        options={{
          tabBarLabel: 'Scan QR',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="qr-code" size={size} color={color} />
          ),
        }}
      />
      <ClientTab.Screen
        name="Attendance"
        component={ClientAttendanceScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <ClientTab.Screen
        name="MyRoutine"
        component={ClientRoutineScreen}
        options={{
          tabBarLabel: 'Routine',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" size={size} color={color} />
          ),
        }}
      />
      <ClientTab.Screen
        name="Profile"
        component={ClientProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </ClientTab.Navigator>
  );
}

// --- Root Navigator ---
export default function AppNavigator() {
  const { session, role, isLoading } = useAuth();

  if (isLoading || (session && !role)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!session ? (
        <AuthNavigator />
      ) : role === 'admin' ? (
        <AdminNavigator />
      ) : role === 'trainer' ? (
        <TrainerNavigator />
      ) : (
        <ClientNavigator />
      )}
    </NavigationContainer>
  );
}
