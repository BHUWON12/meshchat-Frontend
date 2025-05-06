import React from 'react';
import { Tabs } from 'expo-router';
import { MessageSquare, Users, Bell, User, Settings, RadioTower } from 'lucide-react-native';
import Colors from '../../../constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: Colors.primary[600],
      tabBarInactiveTintColor: Colors.common.gray[500],
      tabBarStyle: {
        borderTopWidth: 1,
        borderTopColor: Colors.common.gray[200],
        backgroundColor: Colors.common.white,
        height: 60,
        paddingBottom: 10,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
      },
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: 'Connections',
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => (
            <Bell size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PingNear',
          tabBarIcon: ({ color, size }) => (
            <RadioTower size={size} color={color} />
          ),
        }}
      />
       <Tabs.Screen
        name="settings" // Requires app/(protected)/(tabs)/settings.tsx file
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="chat/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}