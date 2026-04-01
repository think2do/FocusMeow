import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View, Image, StyleSheet, Animated, Easing } from 'react-native';
import useGameState from './src/hooks/useGameState';
import { T } from './src/i18n/translations';
import { C } from './src/utils/theme';
import HomeScreen from './src/screens/HomeScreen';
import SelectScreen from './src/screens/SelectScreen';
import CollectionScreen from './src/screens/CollectionScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AIScreen from './src/screens/AIScreen';
import ChatScreen from './src/screens/ChatScreen';

export const GameContext = createContext(null);
export const useGame = () => useContext(GameContext);
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
function TI({ emoji }) { return <Text style={{ fontSize: 18 }}>{emoji}</Text>; }

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="Select" component={SelectScreen} options={{ animation: 'slide_from_bottom' }} />
    </HomeStack.Navigator>
  );
}

export default function App() {
  const game = useGameState();
  const [isFocusing, setIsFocusing] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const t = (k) => T[game.lang]?.[k] || T.zh[k] || k;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 600);
  }, []);

  useEffect(() => {
    if (game.loaded && !splashDone) {
      const timer = setTimeout(() => {
        Animated.timing(fadeOut, { toValue: 0, duration: 400, easing: Easing.ease, useNativeDriver: true }).start(() => setSplashDone(true));
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [game.loaded]);

  if (!splashDone) return (
    <View style={st.ld}>
      <Animated.View style={{ opacity: fadeOut, alignItems: 'center' }}>
        <Animated.Image source={require('./src/assets/first_logo.png')} style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 24, opacity: logoOpacity, transform: [{ scale: logoScale }] }} />
        <Animated.Text style={[st.title, { opacity: textOpacity }]}>专注喵</Animated.Text>
        <Animated.Text style={[st.sub, { opacity: textOpacity }]}>Focus Meow</Animated.Text>
        <Animated.Text style={[st.lt, { opacity: textOpacity, marginTop: 30 }]}>{t('loading')}</Animated.Text>
      </Animated.View>
    </View>
  );
  return (
    <SafeAreaProvider>
      <GameContext.Provider value={{ ...game, t, isFocusing, setIsFocusing }}>
        <NavigationContainer theme={{
          dark: false,
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '800' },
          },
          colors: { primary: C.primary, background: C.bg, card: C.tabBar, text: C.text, border: C.cardBorder, notification: C.primary },
        }}>
          <Tab.Navigator screenOptions={{
            headerShown: false,
            tabBarStyle: isFocusing ? { display: 'none' } : { backgroundColor: C.tabBar, borderTopColor: C.cardBorder, borderTopWidth: 1, height: 80, paddingBottom: 20, paddingTop: 8 },
            tabBarActiveTintColor: C.tabActive, tabBarInactiveTintColor: C.tabInactive,
            tabBarLabelStyle: { fontSize: 9, fontWeight: '600' },
          }}>
            <Tab.Screen name="Home" component={HomeStackScreen} options={{ tabBarLabel: t('home'), tabBarIcon: () => <TI emoji="🏡" /> }} />
            <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarLabel: t('chat'), tabBarIcon: () => <TI emoji="💬" /> }} />
            <Tab.Screen name="Collection" component={CollectionScreen} options={{ tabBarLabel: t('book'), tabBarIcon: () => <TI emoji="📖" /> }} />
            <Tab.Screen name="AI" component={AIScreen} options={{ tabBarLabel: 'AI', tabBarIcon: () => <TI emoji="🧠" /> }} />
            <Tab.Screen name="Stats" component={StatsScreen} options={{ tabBarLabel: t('record'), tabBarIcon: () => <TI emoji="📊" /> }} />
            <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: t('settings'), tabBarIcon: () => <TI emoji="⚙️" /> }} />
          </Tab.Navigator>
        </NavigationContainer>
      </GameContext.Provider>
    </SafeAreaProvider>
  );
}
const st = StyleSheet.create({
  ld: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.primary, fontSize: 32, fontWeight: '900' },
  sub: { color: C.textSec, fontSize: 14, marginTop: 4 },
  lt: { color: C.textTri, fontSize: 13 },
});
