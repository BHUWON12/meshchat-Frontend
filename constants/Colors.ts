// constants/Colors.ts

const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export default {
  light: {
    text: '#000',
    background: '#f5f8f6',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: '#0a1c13',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
  },
  primary: {
    50: '#f0f9f1',
    100: '#dcf1df',
    200: '#bbdfc1',
    300: '#8ec99c',
    400: '#5eac76',
    500: '#3a8f58',
    600: '#277542',
    700: '#205c36',
    800: '#1b492c',
    900: '#173d26',
    950: '#0a1c13',
  },
  accent: {
    green: '#27ae60',
    emerald: '#2ecc71',
    mint: '#00b894',
    lime: '#a3ff00',
  },
  common: {
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    success: '#10b981', // Individual success color
    warning: '#f59e0b', // Individual warning color
    error: '#ef4444',   // Individual error color
    info: '#3b82f6',    // Individual info color (this is a blue)

    // --- ADD THIS BLUE SCALE TO COMMON ---
    blue: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Using the info color value here
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
    // --- END ADD BLUE SCALE ---
  },
  chat: {
    sent: ['#27ae60', '#2ecc71'],
    received: ['#f5f8f6', '#ffffff'],
    info: ['#e5e7eb', '#f3f4f6'],
  },
  connection: {
    online: '#10b981', // Matches common.success
    offline: '#9ca3af', // Matches common.gray[400]
    pending: '#f59e0b', // Matches common.warning
  }
};