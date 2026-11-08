// ============================================================================
// Mizan (ميزان) - 5-Tab Floating Bottom Navigation Bar
// Styled with Desert Orange, Warm Pearl, Charcoal and dynamic icons
// Tabs: Home | Bookkeeping | Invoicing | Tax & Filings | More
// ============================================================================

import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { colors } from '../../src/theme/tokens';
import { useLocale } from '../../src/context/LocaleContext';
import { AnimatedTabButton, AnimatedTabIcon } from '../../src/animations';

export default function TabsLayout() {
  const { t } = useLocale();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.neutral.textTertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarButton: (props) => <AnimatedTabButton {...props} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.home || 'Home',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              nameFilled="home"
              nameOutline="home-outline"
              focused={focused}
              color={color as string}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="books"
        options={{
          title: t.tabs.books || 'Bookkeeping',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              nameFilled="layers"
              nameOutline="layers-outline"
              focused={focused}
              color={color as string}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: t.tabs.invoicing || 'Invoicing',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              nameFilled="document-text"
              nameOutline="document-text-outline"
              focused={focused}
              color={color as string}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tax"
        options={{
          title: t.tabs.tax || 'Tax & Filings',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              nameFilled="pie-chart"
              nameOutline="pie-chart-outline"
              focused={focused}
              color={color as string}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.more || 'More',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              nameFilled="grid"
              nameOutline="grid-outline"
              focused={focused}
              color={color as string}
              size={22}
            />
          ),
        }}
      />
      {/* Retain learn as a secondary accessible route */}
      <Tabs.Screen
        name="learn"
        options={{
          href: null, // Hidden from bottom bar, accessed via In-app links
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.neutral.surface,
    borderTopColor: colors.neutral.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
