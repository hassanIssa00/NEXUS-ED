import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { BRAND } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';

export default function TabLayout() {
  const { user } = useAuth();
  const workspaceTitle = user?.role === 'TEACHER' ? 'أدوات المعلم' : user?.role === 'STUDENT' ? 'واجباتي' : user?.role === 'PARENT' ? 'الأبناء' : user?.role === 'COUNSELOR' ? 'التوجيه' : user?.role === 'SUPERVISOR' ? 'الإشراف' : user?.role === 'ACCOUNTANT' ? 'المالية' : user?.role === 'HR' ? 'الموارد البشرية' : 'المدرسة';

  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: BRAND.teal,
    tabBarInactiveTintColor: '#84939E',
    tabBarLabelStyle: { fontSize: 9.5, fontWeight: '800', paddingBottom: 3, marginTop: 1 },
    tabBarIconStyle: { marginTop: 2 },
    tabBarStyle: { height: 72, paddingTop: 6, paddingBottom: 5, borderTopWidth: 1, borderTopColor: BRAND.line, backgroundColor: '#FFFFFF', elevation: 10, shadowColor: '#173149', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } },
  }}>
    <Tabs.Screen name="index" options={{ title: 'الرئيسية', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} /> }} />
    <Tabs.Screen name="workspace" options={{ title: workspaceTitle, tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} /> }} />
    <Tabs.Screen name="reports" options={{ title: 'التقارير', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={size} color={color} /> }} />
    <Tabs.Screen name="chat" options={{ title: 'الرسائل', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={color} /> }} />
    <Tabs.Screen name="portal-feature" options={{ href: null }} />
    <Tabs.Screen name="student-record" options={{ href: null }} />
    <Tabs.Screen name="assistant" options={{ title: 'مساعد AI', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={size} color={color} /> }} />
    <Tabs.Screen name="intake-survey" options={{ href: null }} />
    <Tabs.Screen name="profile" options={{ title: 'حسابي', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={size} color={color} /> }} />
  </Tabs>;
}
