import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import MobileAds from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Vibration, Platform } from 'react-native';

const AppContext = createContext({});
export const useAppContext = () => useContext(AppContext);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const SL_QUOTES_NOTIF = [
  { title: "ARISE", body: "Your daily quests await. The weak rest — hunters rise." },
  { title: "SYSTEM ALERT", body: "Penalty incoming. Complete your quests before midnight." },
  { title: "SHADOW MONARCH", body: "I alone level up. Have you completed your quests today?" },
  { title: "DAILY QUEST RESET", body: "New day. New quests. Arise, hunter." },
  { title: "SYSTEM", body: "Failure to complete the quest will incur an appropriate penalty." },
  { title: "ARISE", body: "Two hours have passed. Are you still grinding, hunter?" },
  { title: "SHADOW ARMY", body: "The shadows grow stronger every hour. Do not fall behind." },
];

export function AppProvider({ children }) {
  const [darkMode, setDarkMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  // Refs mirror state so triggerHaptic/playSound always read the latest value
  // without being affected by stale closures
  const hapticsRef = useRef(true);
  const soundRef = useRef(true);

  useEffect(() => {
    loadSettings();
    initUserData();
    requestAndSetupNotifications();
    // Initialize AdMob after a short delay to avoid race condition on startup
    const timer = setTimeout(() => {
      try { MobileAds().initialize(); } catch {}
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const initUserData = async () => {
    try {
      const existing = await AsyncStorage.getItem('user_data');
      if (!existing) {
        await AsyncStorage.setItem('user_data', JSON.stringify({
          username: 'Hunter',
          level: 1, xp: 0, totalXP: 0, streak: 0,
        }));
      }
    } catch {}
  };

  const loadSettings = async () => {
    try {
      const s = await AsyncStorage.getItem('app_settings');
      if (s) {
        const p = JSON.parse(s);
        setDarkMode(p.darkMode ?? true);
        setNotificationsEnabled(p.notifications ?? true);
        setHapticsEnabled(p.haptics ?? true);
        hapticsRef.current = p.haptics ?? true;
        setSoundEnabled(p.sound ?? true);
        soundRef.current = p.sound ?? true;
      }
    } catch {}
  };

  const saveSettings = async (key, value) => {
    try {
      const s = await AsyncStorage.getItem('app_settings');
      const p = s ? JSON.parse(s) : {};
      p[key] = value;
      await AsyncStorage.setItem('app_settings', JSON.stringify(p));
    } catch {}
  };

  const triggerHaptic = (type = 'light') => {
    if (!hapticsRef.current) return;
    try {
      if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (type === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
  };

  const playSound = (type = 'tap') => {
    if (!soundRef.current) return;
    if (!hapticsRef.current) return; // haptic toggle gates all physical feedback
    try {
      if (Platform.OS === 'android') {
        if (type === 'complete') {
          Vibration.vibrate([0, 40, 60, 40, 60, 80]);
        } else {
          Vibration.vibrate(30);
        }
      } else {
        if (type === 'complete') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.selectionAsync();
        }
      }
    } catch {}
  };

  const requestAndSetupNotifications = async () => {
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;
      // Only schedule if not already set up — prevents re-scheduling on every launch
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      if (scheduled.length === 0) {
        await scheduleEvery2Hours();
      }
    } catch {}
  };

  const scheduleEvery2Hours = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      const quote = SL_QUOTES_NOTIF[Math.floor(Math.random() * SL_QUOTES_NOTIF.length)];
      await Notifications.scheduleNotificationAsync({
        content: { title: quote.title, body: quote.body, sound: true },
        trigger: { seconds: 7200, repeats: true },
      });
    } catch {}
  };

  const cancelNotifications = async () => {
    try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch {}
  };

  const toggleDarkMode = async (val) => {
    setDarkMode(val);
    await saveSettings('darkMode', val);
    triggerHaptic('light');
  };

  const toggleNotifications = async (val) => {
    setNotificationsEnabled(val);
    await saveSettings('notifications', val);
    triggerHaptic('light');
    if (val) await scheduleEvery2Hours(); // force reschedule on manual enable
    else await cancelNotifications();
  };

  const toggleHaptics = async (val) => {
    // Toggle haptics before disabling so user feels the last vibration
    if (val) {
      hapticsRef.current = true;
      setHapticsEnabled(true);
      await saveSettings('haptics', true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      hapticsRef.current = false;
      setHapticsEnabled(false);
      await saveSettings('haptics', false);
    }
  };

  const toggleSound = async (val) => {
    soundRef.current = val;
    setSoundEnabled(val);
    await saveSettings('sound', val);
    if (val) {
      // Give immediate feedback when turning sound on — bypass the check since ref is already true
      if (Platform.OS === 'android') Vibration.vibrate([0, 40, 60, 40]);
    }
    // Haptic feedback for the toggle itself (not gated by sound toggle)
    triggerHaptic('light');
  };

  const theme = darkMode ? {
    bg: '#0A0A12', card: '#12121E', cardBorder: '#1E1E30',
    text: '#FFFFFF', textSub: '#AAAACC', textMuted: '#555577',
    accent: '#7B4FFF', accentLight: '#A78BFF',
    tabBg: '#0F0F1C', tabBorder: '#1E1E30',
    dark: true,
  } : {
    bg: '#F2F2FA', card: '#FFFFFF', cardBorder: '#E0E0EE',
    text: '#111122', textSub: '#444466', textMuted: '#888899',
    accent: '#7B4FFF', accentLight: '#5B2FFF',
    tabBg: '#FFFFFF', tabBorder: '#E0E0EE',
    dark: false,
  };

  return (
    <AppContext.Provider value={{
      darkMode, theme,
      notificationsEnabled, hapticsEnabled, soundEnabled,
      toggleDarkMode, toggleNotifications, toggleHaptics, toggleSound,
      triggerHaptic, playSound,
    }}>
      {children}
    </AppContext.Provider>
  );
}
