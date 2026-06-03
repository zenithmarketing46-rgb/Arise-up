import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, TextInput, Modal, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFonts, CinzelDecorative_400Regular, CinzelDecorative_700Bold } from '@expo-google-fonts/cinzel-decorative';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import {
  BannerAd, BannerAdSize,
  InterstitialAd, AdEventType,
  RewardedAd, RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNITS } from '../ads/AdConfig';

const { width, height } = Dimensions.get('window');

const TASK_ICONS = [
  { key: 'run', component: (c) => <FontAwesome5 name="running" size={20} color={c} /> },
  { key: 'brain', component: (c) => <FontAwesome5 name="brain" size={18} color={c} /> },
  { key: 'water', component: (c) => <Ionicons name="water-outline" size={22} color={c} /> },
  { key: 'dumbbell', component: (c) => <MaterialCommunityIcons name="dumbbell" size={22} color={c} /> },
  { key: 'book', component: (c) => <Ionicons name="book-outline" size={22} color={c} /> },
  { key: 'target', component: (c) => <MaterialCommunityIcons name="target" size={22} color={c} /> },
  { key: 'sword', component: (c) => <MaterialCommunityIcons name="sword" size={22} color={c} /> },
  { key: 'heart', component: (c) => <Ionicons name="heart-outline" size={22} color={c} /> },
];

const getIcon = (key, size = 22, color = '#A78BFF') => {
  switch (key) {
    case 'run': return <FontAwesome5 name="running" size={size} color={color} />;
    case 'brain': return <FontAwesome5 name="brain" size={size - 2} color={color} />;
    case 'water': return <Ionicons name="water-outline" size={size} color={color} />;
    case 'dumbbell': return <MaterialCommunityIcons name="dumbbell" size={size} color={color} />;
    case 'book': return <Ionicons name="book-outline" size={size} color={color} />;
    case 'target': return <MaterialCommunityIcons name="target" size={size} color={color} />;
    case 'sword': return <MaterialCommunityIcons name="sword" size={size} color={color} />;
    case 'heart': return <Ionicons name="heart-outline" size={size} color={color} />;
    default: return <MaterialCommunityIcons name="sword" size={size} color={color} />;
  }
};

const SL_QUOTES = [
  { quote: "I alone am the honored one.", author: "Sung Jin-Woo" },
  { quote: "Arise. The shadow soldiers answer only to me.", author: "Shadow Monarch" },
  { quote: "From this moment on, I will only look forward.", author: "Sung Jin-Woo" },
  { quote: "The weak don't get to choose.", author: "Sung Jin-Woo" },
  { quote: "Every day you grow stronger. Every day you level up.", author: "System" },
];

const DEFAULT_TASKS = [
  { id: '1', title: 'Exercise', xp: 10, done: false, iconKey: 'run' },
  { id: '2', title: 'Study', xp: 10, done: false, iconKey: 'brain' },
  { id: '3', title: 'Hydration', xp: 10, done: false, iconKey: 'water' },
];

function QuestCompletedModal({ visible, task, onDone, theme }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const p1 = useRef(new Animated.Value(0)).current;
  const p2 = useRef(new Animated.Value(0)).current;
  const p3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      [scaleAnim, fadeAnim, p1, p2, p3].forEach(a => a.setValue(0));
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 70, friction: 8, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(p1, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(p2, { toValue: 1, duration: 1500, delay: 200, useNativeDriver: true }),
        Animated.timing(p3, { toValue: 1, duration: 1800, delay: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const mkP = (a, x, y) => ({
    opacity: a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] }),
    transform: [
      { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
      { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, y] }) },
      { scale: a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.5, 0.5] }) },
    ],
  });

  if (!task) return null;
  const t = theme;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.qOverlay, { opacity: fadeAnim }]}>
        {[[p1,-80,-120],[p2,80,-100],[p3,-40,-150],[p1,100,-80],[p2,-100,-60],[p3,60,-130]].map(([a,x,y],i) => (
          <Animated.View key={i} style={[styles.particle, mkP(a,x,y)]} />
        ))}
        <Animated.View style={[styles.qCard, { backgroundColor: t.card, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.checkWrap}>
            <View style={[styles.checkRing, { borderColor: t.accent }]} />
            <View style={[styles.checkCircle, { backgroundColor: t.card, borderColor: t.accent }]}>
              <Ionicons name="checkmark" size={32} color={t.accent} />
            </View>
          </View>
          <Text style={[styles.qTitle, { color: t.text }]}>Quest Completed</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={[styles.qXP, { color: t.accentLight }]}>+{task.xp} XP Earned</Text>
            <MaterialCommunityIcons name="crystal-ball" size={16} color={t.accentLight} style={{ marginLeft: 6 }} />
          </View>
          <Text style={[styles.qSub, { color: t.textMuted }]}>{task.title}</Text>
          <TouchableOpacity style={[styles.doneBtn, { borderColor: t.accent }]} onPress={onDone}>
            <Text style={[styles.doneBtnText, { color: t.text }]}>DONE</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function LevelUpModal({ visible, fromLevel, toLevel, onContinue }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const barAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      [fadeAnim, titleAnim, barAnim].forEach(a => a.setValue(0));
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(titleAnim, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
        Animated.timing(barAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
      ]).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [visible]);

  const titleScale = titleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const glowOp = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.luBg}>
        <Animated.View style={[styles.luGradTop, { opacity: glowOp }]} />
        <Animated.View style={[styles.luGradBottom, { opacity: glowOp }]} />
        <View style={styles.luGradMid} />
        <Animated.View style={[styles.luContent, { opacity: fadeAnim }]}>
          <Animated.Text style={[styles.luTitle, { transform: [{ scale: titleScale }] }]}>LEVEL UP</Animated.Text>
          <View style={styles.luLevelRow}>
            <Text style={styles.luLevelFrom}>Level {fromLevel}</Text>
            <Ionicons name="arrow-forward" size={22} color="#A78BFF" style={{ marginHorizontal: 12 }} />
            <Text style={styles.luLevelTo}>Level {toLevel}</Text>
          </View>
          <View style={styles.luBarBg}>
            <Animated.View style={[styles.luBarFill, { width: barWidth }]} />
          </View>
          <Text style={styles.luAchLabel}>ACHIEVEMENT UNLOCKED:</Text>
          <Text style={styles.luAchName}>PATHFINDER RISING</Text>
          <Text style={styles.luAchXP}>Progress: 1000 / 1000 XP</Text>
          <TouchableOpacity style={styles.luBtn} onPress={onContinue}>
            <Text style={styles.luBtnText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

function AllDoneView({ quote, cinzel, cinzelBold, theme, onAddTask, onShowRewarded, rewardedReady }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const t = theme;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.allDoneWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <View style={[styles.allDoneGlow, { backgroundColor: t.accent }]} />
      <MaterialCommunityIcons name="sword-cross" size={72} color={t.accent} style={{ marginBottom: 16 }} />
      <Text style={[styles.allDoneTitle, { fontFamily: cinzelBold, color: t.text }]}>ALL QUESTS{'\n'}COMPLETE</Text>
      <View style={[styles.allDoneCard, { backgroundColor: t.card, borderColor: t.accent + '44' }]}>
        <Ionicons name="chatbubble-outline" size={20} color={t.accent} style={{ marginBottom: 8 }} />
        <Text style={[styles.allDoneQuote, { fontFamily: cinzel, color: t.text }]}>"{quote.quote}"</Text>
        <Text style={[styles.allDoneAuthor, { color: t.accentLight }]}>— {quote.author}</Text>
      </View>
      <Text style={[styles.allDoneNextDay, { color: t.textMuted }]}>New quests unlock tomorrow. Rest, warrior.</Text>
      <TouchableOpacity
        style={[styles.newQuestBtn, { borderColor: t.accent, backgroundColor: t.card, marginTop: 20, width: '100%' }]}
        onPress={onAddTask}
      >
        <Ionicons name="add" size={20} color={t.text} style={{ marginRight: 8 }} />
        <Text style={[styles.newQuestText, { fontFamily: cinzel, color: t.text }]}>Add More Quests</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.newQuestBtn, { borderColor: t.accent + '88', backgroundColor: t.card, marginTop: 12, width: '100%', opacity: rewardedReady ? 1 : 0.5 }]}
        onPress={onShowRewarded}
      >
        <MaterialCommunityIcons name="play-circle-outline" size={20} color={t.accent} style={{ marginRight: 8 }} />
        <Text style={[styles.newQuestText, { fontFamily: cinzel, color: t.accentLight }]}>
          {rewardedReady ? 'Watch Ad — Earn 25 XP' : 'Loading Reward...'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function TaskCard({ task, onToggle, theme }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const t = theme;

  const handleToggle = () => {
    if (task.done) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onToggle(task);
  };

  return (
    <Animated.View style={[
      styles.taskCard,
      { backgroundColor: t.card, borderColor: t.cardBorder },
      task.done && { opacity: 0.45, borderColor: t.accent + '33' },
      { transform: [{ scale: scaleAnim }] }
    ]}>
      <View style={[styles.taskIconWrap, { backgroundColor: t.dark ? '#1E1E35' : '#EEEEFF' }]}>
        {getIcon(task.iconKey, 22, task.done ? t.textMuted : t.accentLight)}
      </View>
      <View style={styles.taskInfo}>
        <Text style={[styles.taskTitle, { color: t.text }, task.done && { color: t.textMuted, textDecorationLine: 'line-through' }]}>
          {task.title}
        </Text>
        <Text style={[styles.taskXP, { color: task.done ? t.textMuted : t.accent }]}>+{task.xp} XP</Text>
      </View>
      <TouchableOpacity onPress={handleToggle} style={[styles.squareCheck, { borderColor: t.accent }, task.done && { backgroundColor: t.accent }]}>
        {task.done && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
      </TouchableOpacity>
    </Animated.View>
  );
}

let interstitial = null;
let rewarded = null;
try {
  interstitial = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, { requestNonPersonalizedAdsOnly: false });
  rewarded = RewardedAd.createForAdRequest(AD_UNITS.rewarded, { requestNonPersonalizedAdsOnly: false });
} catch {}

export default function HomeScreen() {
  const { theme, triggerHaptic, playSound } = useAppContext();
  const t = theme;

  const [tasks, setTasks] = useState([]);
  const [userData, setUserData] = useState({ level: 1, xp: 0, totalXP: 0 });
  const [allDone, setAllDone] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(SL_QUOTES[0]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [newXP, setNewXP] = useState('10');
  const [selectedIconKey, setSelectedIconKey] = useState('sword');
  const [questModal, setQuestModal] = useState({ visible: false, task: null });
  const [levelUpModal, setLevelUpModal] = useState({ visible: false, from: 1, to: 2 });
  const [rewardedLoaded, setRewardedLoaded] = useState(false);

  const [fontsLoaded] = useFonts({ CinzelDecorative_400Regular, CinzelDecorative_700Bold });
  const cinzel = fontsLoaded ? 'CinzelDecorative_400Regular' : 'System';
  const cinzelBold = fontsLoaded ? 'CinzelDecorative_700Bold' : 'System';

  useEffect(() => {
    if (!rewarded) return () => {};
    const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardedLoaded(true));
    const unsubEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      const grantBonusXP = async () => {
        const raw = await AsyncStorage.getItem('user_data');
        const u = raw ? JSON.parse(raw) : { level: 1, totalXP: 0 };
        u.totalXP = (u.totalXP || 0) + 25;
        u.level = Math.floor(u.totalXP / 500) + 1;
        await AsyncStorage.setItem('user_data', JSON.stringify(u));
        setUserData(u);
        triggerHaptic('success');
      };
      grantBonusXP();
    });
    const unsubClosed = rewarded.addAdEventListener(RewardedAdEventType.CLOSED, () => {
      setRewardedLoaded(false);
      rewarded.load();
    });
    rewarded.load();
    return () => { unsubLoaded(); unsubEarned(); unsubClosed(); };
  }, []);

  const showRewardedAd = () => {
    if (!rewarded) return;
    if (rewardedLoaded) rewarded.show();
    else rewarded.load();
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const getTodayKey = () => new Date().toISOString().split('T')[0];

  const loadData = async () => {
    try {
      const today = getTodayKey();
      const lastDay = await AsyncStorage.getItem('last_task_day');
      let stored = await AsyncStorage.getItem('tasks');
      let taskList = stored ? JSON.parse(stored) : DEFAULT_TASKS;

      if (lastDay && lastDay !== today) {
        taskList = taskList.map(task => ({ ...task, done: false }));
        await AsyncStorage.setItem('tasks', JSON.stringify(taskList));
        await AsyncStorage.setItem('last_task_day', today);
      } else if (!lastDay) {
        await AsyncStorage.setItem('last_task_day', today);
      }
      if (!stored) await AsyncStorage.setItem('tasks', JSON.stringify(taskList));

      setTasks(taskList);
      const isDone = taskList.length > 0 && taskList.every(task => task.done);
      setAllDone(isDone);
      if (isDone) setCurrentQuote(SL_QUOTES[Math.floor(Math.random() * SL_QUOTES.length)]);

      const user = await AsyncStorage.getItem('user_data');
      if (user) setUserData(JSON.parse(user));
    } catch {}
  };

  const saveTasks = async (updated) => {
    setTasks(updated);
    await AsyncStorage.setItem('tasks', JSON.stringify(updated));
  };

  const toggleTask = async (task) => {
    if (task.done) return;
    triggerHaptic('medium');
    playSound('tap');
    const updated = tasks.map(t2 => t2.id === task.id ? { ...t2, done: true } : t2);
    await saveTasks(updated);
    setQuestModal({ visible: true, task });

    const user = await AsyncStorage.getItem('user_data');
    const u = user ? JSON.parse(user) : { level: 1, xp: 0, totalXP: 0 };
    const prevLevel = u.level || 1;
    // totalXP is cumulative lifetime XP — never reset
    u.totalXP = (u.totalXP || 0) + task.xp;
    // level is derived from totalXP — 1 level per 500 XP
    u.level = Math.floor(u.totalXP / 500) + 1;

    // Track daily XP history for chart
    const today = new Date().toISOString().split('T')[0];
    const historyRaw = await AsyncStorage.getItem('xp_daily_history');
    const historyDates = await AsyncStorage.getItem('xp_daily_dates');
    let history = historyRaw ? JSON.parse(historyRaw) : [];
    let dates = historyDates ? JSON.parse(historyDates) : [];
    const todayIdx = dates.indexOf(today);
    if (todayIdx >= 0) {
      history[todayIdx] = (history[todayIdx] || 0) + task.xp;
    } else {
      dates.push(today);
      history.push(task.xp);
      // Keep only last 7 days
      if (history.length > 7) { history = history.slice(-7); dates = dates.slice(-7); }
    }
    await AsyncStorage.setItem('xp_daily_history', JSON.stringify(history));
    await AsyncStorage.setItem('xp_daily_dates', JSON.stringify(dates));

    const allCompleted = updated.every(t2 => t2.done);
    if (allCompleted) {
      // Streak is calendar-date based — only increment once per day
      const todayStr = new Date().toISOString().split('T')[0];
      const lastStreakDay = u.lastStreakDay || null;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastStreakDay === todayStr) {
        // Already counted today — don't increment
      } else if (lastStreakDay === yesterdayStr) {
        // Completed yesterday too — continue streak
        u.streak = (u.streak || 0) + 1;
        u.lastStreakDay = todayStr;
      } else {
        // Missed a day or first time — reset to 1
        u.streak = 1;
        u.lastStreakDay = todayStr;
      }
      await AsyncStorage.setItem('user_data', JSON.stringify(u));
      setUserData(u);
      setAllDone(true);
      setCurrentQuote(SL_QUOTES[Math.floor(Math.random() * SL_QUOTES.length)]);
      triggerHaptic('success');
      playSound('complete');
      interstitial?.addAdEventListener(AdEventType.LOADED, () => interstitial?.show());
      interstitial?.addAdEventListener(AdEventType.ERROR, () => {});
      interstitial?.load();
      // Only show level up modal if user actually leveled up
      if (u.level > prevLevel) {
        setTimeout(() => {
          setQuestModal({ visible: false, task: null });
          setLevelUpModal({ visible: true, from: prevLevel, to: u.level });
        }, 1800);
      }
    } else {
      await AsyncStorage.setItem('user_data', JSON.stringify(u));
      setUserData(u);
    }
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    triggerHaptic('success');
    playSound('complete');
    const task = {
      id: Date.now().toString(),
      title: newTask.trim(),
      xp: parseInt(newXP) || 10,
      done: false,
      iconKey: selectedIconKey,
    };
    const updated = [...tasks, task];
    // Immediately update state — this triggers re-render instantly
    setTasks(updated);
    // If all-done screen was showing, adding a new undone task should hide it
    setAllDone(false);
    await AsyncStorage.setItem('tasks', JSON.stringify(updated));
    setNewTask(''); setNewXP('10'); setSelectedIconKey('sword');
    setModalVisible(false);
  };

  const level = userData.level || 1;
  const totalXP = userData.totalXP || 0;
  const xpInLevel = totalXP % 500;

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <Text style={[styles.appName, { fontFamily: cinzelBold, color: t.text }]}>ARISE</Text>
        </View>

        <View style={styles.levelRow}>
          <Text style={[styles.levelLabel, { color: t.textSub }]}>Level {level}</Text>
          <View style={[styles.levelBarBg, { backgroundColor: t.cardBorder }]}>
            <View style={[styles.levelBarFill, { width: `${(xpInLevel / 500) * 100}%`, backgroundColor: t.accent }]} />
          </View>
          <Text style={[styles.levelXP, { color: t.textSub }]}>{xpInLevel} / 500 XP</Text>
        </View>

        {allDone ? (
          <AllDoneView quote={currentQuote} cinzel={cinzel} cinzelBold={cinzelBold} theme={t}
            onAddTask={() => { triggerHaptic('light'); playSound('tap'); setModalVisible(true); }}
            onShowRewarded={showRewardedAd}
            rewardedReady={rewardedLoaded} />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { fontFamily: cinzelBold, color: t.text }]}>Today's Quests</Text>
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} onToggle={toggleTask} theme={t} />
            ))}
            <TouchableOpacity
              style={[styles.newQuestBtn, { borderColor: t.accent, backgroundColor: t.card }]}
              onPress={() => { triggerHaptic('light'); playSound('tap'); setModalVisible(true); }}
            >
              <Ionicons name="add" size={20} color={t.text} style={{ marginRight: 8 }} />
              <Text style={[styles.newQuestText, { fontFamily: cinzel, color: t.text }]}>New Quest</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
      <View style={{ alignItems: 'center', backgroundColor: t.bg }}>
        <BannerAd unitId={AD_UNITS.banner} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} onAdFailedToLoad={() => {}} />
      </View>

      <QuestCompletedModal visible={questModal.visible} task={questModal.task} theme={t}
        onDone={() => { triggerHaptic('light'); setQuestModal({ visible: false, task: null }); }} />

      <LevelUpModal visible={levelUpModal.visible} fromLevel={levelUpModal.from} toLevel={levelUpModal.to}
        onContinue={() => setLevelUpModal({ visible: false, from: 1, to: 2 })} />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.addOverlay}>
          <View style={[styles.addCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <Text style={[styles.addTitle, { fontFamily: cinzelBold, color: t.text }]}>NEW QUEST</Text>
            <TextInput style={[styles.addInput, { backgroundColor: t.bg, borderColor: t.cardBorder, color: t.text }]}
              placeholder="Quest name..." placeholderTextColor={t.textMuted} value={newTask} onChangeText={setNewTask} />
            <TextInput style={[styles.addInput, { backgroundColor: t.bg, borderColor: t.cardBorder, color: t.text }]}
              placeholder="XP reward (e.g. 10)" placeholderTextColor={t.textMuted} value={newXP} onChangeText={setNewXP} keyboardType="numeric" />
            <Text style={[styles.iconSelectLabel, { color: t.accent }]}>CHOOSE ICON</Text>
            <View style={styles.iconGrid}>
              {TASK_ICONS.map(item => (
                <TouchableOpacity key={item.key} onPress={() => setSelectedIconKey(item.key)}
                  style={[styles.iconBtn, { backgroundColor: t.bg, borderColor: selectedIconKey === item.key ? t.accent : t.cardBorder },
                    selectedIconKey === item.key && { backgroundColor: t.accent + '22' }]}>
                  {item.component(selectedIconKey === item.key ? '#FFFFFF' : t.textMuted)}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.addSubmit, { backgroundColor: t.accent }]} onPress={addTask}>
              <Text style={[styles.addSubmitText, { fontFamily: cinzelBold }]}>ADD QUEST</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addCancel} onPress={() => setModalVisible(false)}>
              <Text style={[styles.addCancelText, { color: t.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 20 },
  topBar: { paddingTop: 56, paddingBottom: 8, alignItems: 'center' },
  appName: { fontSize: 16, letterSpacing: 6, opacity: 0.7 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28, paddingHorizontal: 4 },
  levelLabel: { fontSize: 13, minWidth: 60 },
  levelBarBg: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  levelBarFill: { height: '100%', borderRadius: 2 },
  levelXP: { fontSize: 12, minWidth: 80, textAlign: 'right' },
  sectionTitle: { fontSize: 28, marginBottom: 20 },
  taskCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  taskIconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 20, fontWeight: '500', marginBottom: 2 },
  taskXP: { fontSize: 12, fontWeight: '600' },
  squareCheck: { width: 30, height: 30, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  newQuestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 14, paddingVertical: 16, marginTop: 8 },
  newQuestText: { fontSize: 16, letterSpacing: 1 },
  allDoneWrap: { alignItems: 'center', paddingTop: 20, paddingBottom: 40 },
  allDoneGlow: { position: 'absolute', top: 0, width: 300, height: 300, borderRadius: 150, opacity: 0.1 },
  allDoneTitle: { fontSize: 24, textAlign: 'center', letterSpacing: 3, marginBottom: 32, lineHeight: 36 },
  allDoneCard: { borderRadius: 16, padding: 24, borderWidth: 1, width: '100%', marginBottom: 20 },
  allDoneQuote: { fontSize: 16, lineHeight: 26, fontStyle: 'italic', marginBottom: 12 },
  allDoneAuthor: { fontSize: 13, textAlign: 'right' },
  allDoneNextDay: { fontSize: 13, textAlign: 'center' },
  qOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  particle: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#A78BFF' },
  qCard: { borderRadius: 24, padding: 32, alignItems: 'center', width: width * 0.82, borderWidth: 1, borderColor: '#7B4FFF55' },
  checkWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 20, width: 90, height: 90 },
  checkRing: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 2, opacity: 0.5 },
  checkCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  qTitle: { fontSize: 24, fontWeight: '700', marginBottom: 10 },
  qXP: { fontSize: 16, fontWeight: '700' },
  qSub: { fontSize: 13, marginBottom: 24 },
  doneBtn: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 48, backgroundColor: 'transparent' },
  doneBtnText: { fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  luBg: { flex: 1, backgroundColor: '#050510', justifyContent: 'center', alignItems: 'center' },
  luGradTop: { position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.5, backgroundColor: '#3B0FA0' },
  luGradBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.5, backgroundColor: '#1A0F6B' },
  luGradMid: { position: 'absolute', top: height * 0.2, left: -100, right: -100, height: height * 0.4, backgroundColor: '#5B0FBF', opacity: 0.15 },
  luContent: { alignItems: 'center', paddingHorizontal: 40 },
  luTitle: { fontSize: 52, fontWeight: '900', color: '#FFFFFF', letterSpacing: 6, textShadowColor: '#A78BFF', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 40, marginBottom: 28 },
  luLevelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  luLevelFrom: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  luLevelTo: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  luBarBg: { width: width * 0.7, height: 6, backgroundColor: '#1A1A2E', borderRadius: 3, overflow: 'hidden', marginBottom: 28 },
  luBarFill: { height: '100%', backgroundColor: '#7B4FFF', borderRadius: 3 },
  luAchLabel: { color: '#555577', fontSize: 11, letterSpacing: 2, marginBottom: 4 },
  luAchName: { color: '#A78BFF', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  luAchXP: { color: '#555577', fontSize: 13, marginBottom: 52 },
  luBtn: { borderWidth: 1.5, borderColor: '#7B4FFF', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 60, backgroundColor: '#12121E' },
  luBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  addOverlay: { flex: 1, backgroundColor: '#000000CC', justifyContent: 'flex-end' },
  addCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, borderTopWidth: 1 },
  addTitle: { fontSize: 13, letterSpacing: 3, marginBottom: 20, textAlign: 'center' },
  addInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 12 },
  iconSelectLabel: { fontSize: 9, letterSpacing: 2.5, marginBottom: 10 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  iconBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  addSubmit: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
  addSubmitText: { color: '#FFFFFF', fontSize: 12, letterSpacing: 2.5 },
  addCancel: { alignItems: 'center', paddingVertical: 12 },
  addCancelText: { fontSize: 14 },
});
