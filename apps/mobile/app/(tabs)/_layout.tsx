import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';

export default function TabLayout() {
  const { user } = useAuth();
  const publicPortal = user?.role === 'STUDENT' || user?.role === 'PARENT';
  const workspaceTitle = user?.role === 'TEACHER' ? 'أدوات المعلم' : user?.role === 'STUDENT' ? 'واجباتي' : user?.role === 'PARENT' ? 'الأبناء' : 'المدرسة';

  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: BRAND.teal,
    tabBarInactiveTintColor: '#7C8998',
    tabBarLabelStyle: { fontSize: 10, fontWeight: '700', paddingBottom: 3 },
    tabBarStyle: { height: 62, paddingTop: 5, borderTopColor: BRAND.line, backgroundColor: '#FFFFFF' },
  }}>
    <Tabs.Screen name="index" options={{ title: 'الرئيسية', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} /> }} />
    <Tabs.Screen name="workspace" options={{ title: workspaceTitle, tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} /> }} />
    {publicPortal ? <Tabs.Screen name="chat" options={{ title: 'الرسائل', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={color} /> }} /> : <Tabs.Screen name="chat" options={{ href: null }} />}
    <Tabs.Screen name="assistant" options={{ title: 'مساعد AI', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={size} color={color} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'حسابي', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={size} color={color} /> }} />
  </Tabs>;
}
