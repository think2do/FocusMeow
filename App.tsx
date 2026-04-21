import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View, Image, StyleSheet, Animated, Easing, Alert, TextInput, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path, Rect, Line } from 'react-native-svg';
import { APP_FONT_FAMILY } from './src/utils/appFont';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendVerificationCode, verifyCode, resetPassword as apiResetPassword } from './src/services/authApi';
import useGameState from './src/hooks/useGameState';
import { T } from './src/i18n/translations';
import { C, applyTheme } from './src/utils/theme';
import HomeScreen from './src/screens/HomeScreen';
import SelectScreen from './src/screens/SelectScreen';
import CollectionScreen from './src/screens/CollectionScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AIScreen from './src/screens/AIScreen';
import ChatScreen from './src/screens/ChatScreen';

export const GameContext = createContext(null);
export const useGame = () => useContext(GameContext);
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const TAB_BAR_HORIZONTAL_PADDING = 20;
const TAB_PILL_WIDTH = 74;
const TAB_PILL_HEIGHT = 52;

function TabIcon({ type, focused, label }) {
  const stroke = focused ? C.tabActive : C.tabInactive;
  const fill = focused ? C.activeTint : 'transparent';
  const common = { stroke, strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };

  const icon = (() => {
    switch (type) {
      case 'home':
        return (
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path d="M4.5 10.5 12 4l7.5 6.5" fill="none" {...common} />
            <Path d="M6.5 9.5V19h11V9.5" fill={fill} {...common} />
            <Rect x="10" y="13" width="4" height="6" rx="1.2" fill="none" {...common} />
          </Svg>
        );
      case 'chat':
        return (
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path d="M6 7.5h12a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3H12l-4.2 3v-3H6a3 3 0 0 1-3-3v-3a3 3 0 0 1 3-3Z" fill={fill} {...common} />
            <Circle cx="9" cy="12" r="0.9" fill={stroke} />
            <Circle cx="12" cy="12" r="0.9" fill={stroke} />
            <Circle cx="15" cy="12" r="0.9" fill={stroke} />
          </Svg>
        );
      case 'collection':
        return (
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Rect x="5" y="4" width="14" height="16" rx="2.4" fill={fill} {...common} />
            <Line x1="9" y1="4" x2="9" y2="20" {...common} />
            <Line x1="11.5" y1="8" x2="16" y2="8" {...common} />
            <Line x1="11.5" y1="11" x2="16" y2="11" {...common} />
          </Svg>
        );
      case 'ai':
        return (
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Rect x="6" y="7" width="12" height="10" rx="4" fill={fill} {...common} />
            <Line x1="12" y1="4" x2="12" y2="7" {...common} />
            <Circle cx="10" cy="12" r="1" fill={stroke} />
            <Circle cx="14" cy="12" r="1" fill={stroke} />
            <Path d="M9.5 15c.8.6 1.6.9 2.5.9s1.7-.3 2.5-.9" fill="none" {...common} />
          </Svg>
        );
      case 'stats':
        return (
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Line x1="5" y1="19" x2="19" y2="19" {...common} />
            <Rect x="6.5" y="12.5" width="2.8" height="6.5" rx="1.2" fill={focused ? C.primaryContainer : fill} {...common} />
            <Rect x="10.6" y="9.5" width="2.8" height="9.5" rx="1.2" fill={fill} {...common} />
            <Rect x="14.7" y="6.5" width="2.8" height="12.5" rx="1.2" fill={fill} {...common} />
          </Svg>
        );
      case 'settings':
      default:
        return (
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Circle cx="12" cy="12" r="3.1" fill={fill} {...common} />
            <Path d="M12 4.5v2.1M12 17.4v2.1M19.5 12h-2.1M6.6 12H4.5M17.3 6.7l-1.5 1.5M8.2 15.8l-1.5 1.5M17.3 17.3l-1.5-1.5M8.2 8.2 6.7 6.7" fill="none" {...common} />
          </Svg>
        );
    }
  })();

  return (
    <View style={tabIconStyles.wrap}>
      <View style={tabIconStyles.inner}>
        {icon}
        <Text style={[tabIconStyles.label, focused ? tabIconStyles.labelActive : tabIconStyles.labelIdle, { color: stroke }]}>{label}</Text>
      </View>
    </View>
  );
}

function FluidTabBar({ state, descriptors, navigation }) {
  const [barWidth, setBarWidth] = useState(0);
  const pillX = useRef(new Animated.Value(0)).current;
  const pillStretch = useRef(new Animated.Value(1)).current;
  const itemCount = state.routes.length;
  const contentWidth = Math.max(0, barWidth - (TAB_BAR_HORIZONTAL_PADDING * 2));
  const itemWidth = contentWidth > 0 ? contentWidth / itemCount : 0;

  useEffect(() => {
    if (!itemWidth) return;
    const nextX = TAB_BAR_HORIZONTAL_PADDING
      + (itemWidth * state.index)
      + ((itemWidth - TAB_PILL_WIDTH) / 2);
    Animated.parallel([
      Animated.spring(pillX, {
        toValue: nextX,
        stiffness: 170,
        damping: 22,
        mass: 0.82,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(pillStretch, {
          toValue: 1.12,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(pillStretch, {
          toValue: 1,
          stiffness: 150,
          damping: 18,
          mass: 0.75,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [itemWidth, pillStretch, pillX, state.index]);

  return (
    <View style={fluidTabStyles.shell}>
      <View
        style={[
          fluidTabStyles.bar,
          {
            backgroundColor: C.tabBar,
            borderTopColor: C.border,
          },
        ]}
        onLayout={event => setBarWidth(event.nativeEvent.layout.width)}
      >
        {barWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              fluidTabStyles.pill,
              {
                width: TAB_PILL_WIDTH,
                backgroundColor: C.primaryFixed,
                shadowColor: C.primary,
                transform: [
                  { translateX: pillX },
                  { scaleX: pillStretch },
                ],
              },
            ]}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.tabLabel || options.title || route.name;
          const type = options.tabType || route.name.toLowerCase();

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              activeOpacity={0.82}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[fluidTabStyles.item, itemWidth ? { width: itemWidth } : null]}
            >
              <TabIcon type={type} focused={focused} label={label} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  wrap: {
    width: 72,
    height: TAB_PILL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.2,
  },
  labelActive: {
    fontWeight: '800',
  },
  labelIdle: {
    fontWeight: '700',
  },
});

const fluidTabStyles = StyleSheet.create({
  shell: {
    height: 94,
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    paddingHorizontal: TAB_BAR_HORIZONTAL_PADDING,
    paddingTop: 15,
    paddingBottom: 14,
    borderTopWidth: 1,
  },
  pill: {
    position: 'absolute',
    top: 15,
    height: TAB_PILL_HEIGHT,
    borderRadius: 999,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  item: {
    height: TAB_PILL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen
        name="Select"
        component={SelectScreen}
        options={{
          animation: 'fade_from_bottom',
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
    </HomeStack.Navigator>
  );
}


function WelcomeScreen({ onLogin, onGuest, lang }) {
  const zh = lang === 'zh';
  const { login, register } = useAuth();
  const [step, setStep] = useState('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);
  // forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPwd, setConfirmNewPwd] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('@focusmeow_remember');
        if (saved) { const { email: e, password: p } = JSON.parse(saved); setEmail(e || ''); setPassword(p || ''); }
      } catch {}
    })();
  }, []);

  useEffect(() => () => clearInterval(countdownRef.current), []);

  const startCountdown = () => {
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(countdownRef.current); return 0; } return c - 1; });
    }, 1000);
  };

  const doLogin = async () => {
    if (!email.trim() || !password || password.length < 6) {
      Alert.alert(zh ? '提示' : 'Tip', zh ? '请填写完整信息' : 'Fill in all fields'); return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      await AsyncStorage.setItem('@focusmeow_remember', JSON.stringify({ email: email.trim(), password }));
      onLogin();
    } catch (e) { Alert.alert(zh ? '登录失败' : 'Login Failed', e.message); }
    finally { setLoading(false); }
  };

  const doSendRegisterCode = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入有效邮箱' : 'Enter a valid email'); return;
    }
    if (!password || password.length < 6) {
      Alert.alert(zh ? '提示' : 'Tip', zh ? '密码至少 6 位' : 'Password min 6 chars'); return;
    }
    if (!nickname.trim()) {
      Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入昵称' : 'Enter a nickname'); return;
    }
    setLoading(true);
    try {
      await sendVerificationCode(email.trim(), 'register');
      setStep('verify-register');
      startCountdown();
    } catch (e) { Alert.alert(zh ? '发送失败' : 'Send Failed', e.message); }
    finally { setLoading(false); }
  };

  const doVerifyRegister = async () => {
    if (otp.length !== 6) { Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入 6 位验证码' : 'Enter 6-digit code'); return; }
    setLoading(true);
    try {
      const { verifiedToken } = await verifyCode(email.trim(), otp, 'register');
      await register(email.trim(), password, nickname.trim(), verifiedToken);
      Alert.alert(zh ? '注册成功' : 'Success', zh ? '欢迎加入专注喵！' : 'Welcome to FocusMeow!');
      onLogin();
    } catch (e) { Alert.alert(zh ? '失败' : 'Failed', e.message); }
    finally { setLoading(false); }
  };

  const doSendResetCode = async () => {
    if (!resetEmail.trim() || !/\S+@\S+\.\S+/.test(resetEmail.trim())) {
      Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入有效邮箱' : 'Enter a valid email'); return;
    }
    setLoading(true);
    try {
      await sendVerificationCode(resetEmail.trim(), 'forgot');
      setStep('verify-reset');
      startCountdown();
    } catch (e) { Alert.alert(zh ? '发送失败' : 'Send Failed', e.message); }
    finally { setLoading(false); }
  };

  const doVerifyReset = async () => {
    if (resetOtp.length !== 6) { Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入 6 位验证码' : 'Enter 6-digit code'); return; }
    setLoading(true);
    try {
      const { verifiedToken } = await verifyCode(resetEmail.trim(), resetOtp, 'forgot');
      setResetToken(verifiedToken || '');
      setStep('new-password');
    } catch (e) { Alert.alert(zh ? '失败' : 'Failed', e.message); }
    finally { setLoading(false); }
  };

  const doResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert(zh ? '提示' : 'Tip', zh ? '密码至少 6 位' : 'Password min 6 chars'); return;
    }
    if (newPassword !== confirmNewPwd) {
      Alert.alert(zh ? '提示' : 'Tip', zh ? '两次密码不一致' : 'Passwords do not match'); return;
    }
    setLoading(true);
    try {
      await apiResetPassword({
        verifiedToken: resetToken,
        email: resetEmail.trim(),
        code: resetOtp,
        newPassword,
      });
      await AsyncStorage.removeItem('@focusmeow_remember');
      setEmail(resetEmail.trim());
      setPassword(newPassword);
      Alert.alert(zh ? '重置成功' : 'Success', zh ? '密码已重置，请重新登录' : 'Password reset. Please log in.', [{
        text: zh ? '好的' : 'OK',
        onPress: () => { setStep('login'); setResetEmail(''); setResetOtp(''); setResetToken(''); setNewPassword(''); setConfirmNewPwd(''); },
      }]);
    } catch (e) { Alert.alert(zh ? '失败' : 'Failed', e.message); }
    finally { setLoading(false); }
  };

  const inp = { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(180,150,130,0.18)', paddingHorizontal: 14, height: 50, fontSize: 15, color: '#332E2C', marginBottom: 12 };
  const btn = { backgroundColor: '#D06B6B', borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center' };
  const wrap = { flex: 1, backgroundColor: '#FBF5F0', justifyContent: 'center', padding: 32 };
  const back = { color: '#8C8480', fontSize: 14 };
  const backBtn = { marginBottom: 24 };
  const h1 = { fontSize: 26, fontWeight: '700', color: '#332E2C', marginBottom: 6 };
  const sub = { fontSize: 13, color: '#A09080', marginBottom: 28 };

  if (step === 'landing') return (
    <View style={{ flex: 1, backgroundColor: '#FBF5F0', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Image source={require('./src/assets/first_logo.png')} style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 20, borderWidth: 3, borderColor: '#e8940a' }} />
      <Text style={{ fontSize: 28, fontWeight: '900', color: '#D06B6B', marginBottom: 6 }}>{zh ? '专注喵' : 'FocusMeow'}</Text>
      <Text style={{ fontSize: 13, color: '#A09080', marginBottom: 40 }}>{zh ? '专注每一刻，陪伴每一天' : 'Focus every moment'}</Text>
      <TouchableOpacity style={[btn, { width: '100%', marginBottom: 12 }]} onPress={() => setStep('login')}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{zh ? '登录' : 'Login'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 14, height: 50, width: '100%', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1.5, borderColor: '#D06B6B' }} onPress={() => setStep('register')}>
        <Text style={{ color: '#D06B6B', fontSize: 17, fontWeight: '600' }}>{zh ? '注册' : 'Register'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onGuest}>
        <Text style={{ color: '#B0A090', fontSize: 14 }}>{zh ? '游客体验 >' : 'Guest mode >'}</Text>
      </TouchableOpacity>
    </View>
  );

  if (step === 'login') return (
    <View style={wrap}>
      <TouchableOpacity onPress={() => setStep('landing')} style={backBtn}><Text style={back}>{'< '}{zh ? '返回' : 'Back'}</Text></TouchableOpacity>
      <Text style={h1}>{zh ? '登录' : 'Login'}</Text>
      <Text style={sub}>{zh ? '欢迎回来～' : 'Welcome back~'}</Text>
      <TextInput style={inp} placeholder={zh ? '邮箱' : 'Email'} placeholderTextColor="#B0A090" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={inp} placeholder={zh ? '密码（至少 6 位）' : 'Password (min 6)'} placeholderTextColor="#B0A090" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      <TouchableOpacity onPress={() => setStep('forgot')} style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 }}>
        <Text style={{ color: '#D06B6B', fontSize: 13 }}>{zh ? '忘记密码？' : 'Forgot password?'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[btn, { opacity: loading ? 0.6 : 1 }]} onPress={doLogin} disabled={loading}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{loading ? '...' : (zh ? '登录' : 'Login')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (step === 'register') return (
    <View style={wrap}>
      <TouchableOpacity onPress={() => setStep('landing')} style={backBtn}><Text style={back}>{'< '}{zh ? '返回' : 'Back'}</Text></TouchableOpacity>
      <Text style={h1}>{zh ? '注册' : 'Register'}</Text>
      <Text style={sub}>{zh ? '创建你的专注喵账号' : 'Create your FocusMeow account'}</Text>
      <TextInput style={inp} placeholder={zh ? '昵称' : 'Nickname'} placeholderTextColor="#B0A090" value={nickname} onChangeText={setNickname} autoCapitalize="none" />
      <TextInput style={inp} placeholder={zh ? '邮箱' : 'Email'} placeholderTextColor="#B0A090" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={[inp, { marginBottom: 24 }]} placeholder={zh ? '密码（至少 6 位）' : 'Password (min 6)'} placeholderTextColor="#B0A090" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      <TouchableOpacity style={[btn, { opacity: loading ? 0.6 : 1 }]} onPress={doSendRegisterCode} disabled={loading}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{loading ? '...' : (zh ? '发送验证码' : 'Send Code')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (step === 'verify-register') return (
    <View style={wrap}>
      <TouchableOpacity onPress={() => { setStep('register'); setOtp(''); clearInterval(countdownRef.current); setCountdown(0); }} style={backBtn}><Text style={back}>{'< '}{zh ? '返回' : 'Back'}</Text></TouchableOpacity>
      <Text style={h1}>{zh ? '验证邮箱' : 'Verify Email'}</Text>
      <Text style={sub}>{zh ? `验证码已发送至 ${email}` : `Code sent to ${email}`}</Text>
      <TextInput style={[inp, { height: 60, fontSize: 28, fontWeight: '700', color: '#D06B6B', textAlign: 'center', letterSpacing: 12, marginBottom: 16 }]} placeholder="------" placeholderTextColor="#D0C0B0" value={otp} onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
      <TouchableOpacity style={[btn, { opacity: (loading || otp.length !== 6) ? 0.5 : 1, marginBottom: 16 }]} onPress={doVerifyRegister} disabled={loading || otp.length !== 6}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{loading ? '...' : (zh ? '验证并完成注册' : 'Verify & Register')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { if (countdown > 0) return; setOtp(''); doSendRegisterCode(); }} style={{ alignItems: 'center' }} disabled={countdown > 0}>
        <Text style={{ color: countdown > 0 ? '#B0A090' : '#D06B6B', fontSize: 14 }}>{countdown > 0 ? `${countdown}s ${zh ? '后重新发送' : 'to resend'}` : (zh ? '重新发送' : 'Resend')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (step === 'forgot') return (
    <View style={wrap}>
      <TouchableOpacity onPress={() => setStep('login')} style={backBtn}><Text style={back}>{'< '}{zh ? '返回' : 'Back'}</Text></TouchableOpacity>
      <Text style={h1}>{zh ? '找回密码' : 'Reset Password'}</Text>
      <Text style={sub}>{zh ? '输入注册邮箱，我们将发送验证码' : 'Enter your email to receive a reset code'}</Text>
      <TextInput style={[inp, { marginBottom: 24 }]} placeholder={zh ? '注册邮箱' : 'Registered email'} placeholderTextColor="#B0A090" value={resetEmail} onChangeText={setResetEmail} keyboardType="email-address" autoCapitalize="none" />
      <TouchableOpacity style={[btn, { opacity: loading ? 0.6 : 1 }]} onPress={doSendResetCode} disabled={loading}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{loading ? '...' : (zh ? '发送验证码' : 'Send Code')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (step === 'verify-reset') return (
    <View style={wrap}>
      <TouchableOpacity onPress={() => { setStep('forgot'); setResetOtp(''); clearInterval(countdownRef.current); setCountdown(0); }} style={backBtn}><Text style={back}>{'< '}{zh ? '返回' : 'Back'}</Text></TouchableOpacity>
      <Text style={h1}>{zh ? '输入验证码' : 'Enter Code'}</Text>
      <Text style={sub}>{zh ? `验证码已发送至 ${resetEmail}` : `Code sent to ${resetEmail}`}</Text>
      <TextInput style={[inp, { height: 60, fontSize: 28, fontWeight: '700', color: '#D06B6B', textAlign: 'center', letterSpacing: 12, marginBottom: 16 }]} placeholder="------" placeholderTextColor="#D0C0B0" value={resetOtp} onChangeText={v => setResetOtp(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
      <TouchableOpacity style={[btn, { opacity: (loading || resetOtp.length !== 6) ? 0.5 : 1, marginBottom: 16 }]} onPress={doVerifyReset} disabled={loading || resetOtp.length !== 6}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{loading ? '...' : (zh ? '验证' : 'Verify')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { if (countdown > 0) return; setResetOtp(''); doSendResetCode(); }} style={{ alignItems: 'center' }} disabled={countdown > 0}>
        <Text style={{ color: countdown > 0 ? '#B0A090' : '#D06B6B', fontSize: 14 }}>{countdown > 0 ? `${countdown}s ${zh ? '后重新发送' : 'to resend'}` : (zh ? '重新发送' : 'Resend')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (step === 'new-password') return (
    <View style={wrap}>
      <Text style={h1}>{zh ? '设置新密码' : 'New Password'}</Text>
      <Text style={sub}>{zh ? '请设置你的新密码' : 'Set your new password'}</Text>
      <TextInput style={inp} placeholder={zh ? '新密码（至少 6 位）' : 'New password (min 6)'} placeholderTextColor="#B0A090" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" />
      <TextInput style={[inp, { marginBottom: 24 }]} placeholder={zh ? '确认新密码' : 'Confirm new password'} placeholderTextColor="#B0A090" value={confirmNewPwd} onChangeText={setConfirmNewPwd} secureTextEntry autoCapitalize="none" />
      <TouchableOpacity style={[btn, { opacity: loading ? 0.6 : 1 }]} onPress={doResetPassword} disabled={loading}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{loading ? '...' : (zh ? '重置密码' : 'Reset Password')}</Text>
      </TouchableOpacity>
    </View>
  );

  return null;
}

export default function App() {
  const game = useGameState();
  const [isFocusing, setIsFocusing] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [appKey, setAppKey] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const resetApp = () => { setShowWelcome(true); setGuestMode(false); };
  const clearGuestData = () => {
    return new Promise(async (resolve) => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const toRemove = keys.filter(k => !k.includes('auth_token') && !k.includes('auth_user'));
        if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
      } catch {}
      if (game.resetAll) await game.resetAll();
      setAppKey(k => k + 1);
      setTimeout(resolve, 500);
    });
  };
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const t = (k) => T[game.lang]?.[k] || T.zh[k] || k;
  applyTheme(game.themeId);
  const st = createAppStyles(C);

  useEffect(() => {
    AsyncStorage.getItem('@focusmeow_auth_token').then(token => {
      if (token) setShowWelcome(false);
    });
  }, [logoOpacity, logoScale, textOpacity]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 600);
  }, [logoOpacity, logoScale, textOpacity]);

  useEffect(() => {
    if (game.loaded && !splashDone) {
      const timer = setTimeout(() => {
        Animated.timing(fadeOut, { toValue: 0, duration: 400, easing: Easing.ease, useNativeDriver: true }).start(() => setSplashDone(true));
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [fadeOut, game.loaded, splashDone]);

  if (!splashDone) return (
    <View style={st.ld}>
      <Animated.View style={{ opacity: fadeOut, alignItems: 'center' }}>
        <Animated.Image source={require('./src/assets/first_logo.png')} style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 24, borderWidth: 3, borderColor: C.primaryContainer, opacity: logoOpacity, transform: [{ scale: logoScale }] }} />
        <Animated.Text style={[st.title, { opacity: textOpacity }]}>专注喵</Animated.Text>
        <Animated.Text style={[st.sub, { opacity: textOpacity }]}>Focus Meow</Animated.Text>
      </Animated.View>
    </View>
  );
  if (splashDone && showWelcome && !guestMode) {
    return (
      <AuthProvider>
        <WelcomeScreen
          lang={game.lang}
          onLogin={() => setShowWelcome(false)}
          onGuest={async () => { await clearGuestData(); setGuestMode(true); setShowWelcome(false); }}
        />
      </AuthProvider>
    );
  }
  return (
    <AuthProvider><SafeAreaProvider key={appKey}>
      <GameContext.Provider value={{ ...game, t, isFocusing, setIsFocusing, guestMode, setGuestMode, resetApp }}>
        <NavigationContainer theme={{
          dark: false,
          fonts: {
            regular: { fontFamily: APP_FONT_FAMILY, fontWeight: '400' },
            medium: { fontFamily: APP_FONT_FAMILY, fontWeight: '500' },
            bold: { fontFamily: APP_FONT_FAMILY, fontWeight: '700' },
            heavy: { fontFamily: APP_FONT_FAMILY, fontWeight: '800' },
          },
          colors: { primary: C.primary, background: C.bg, card: C.surfaceContainerLowest, text: C.onSurface||C.text, border: C.border||C.cardBorder, notification: C.primaryContainer||C.primary },
        }}>
          <Tab.Navigator
            tabBar={(props) => (isFocusing ? null : <FluidTabBar {...props} />)}
            screenOptions={{ headerShown: false }}
          >
            <Tab.Screen
              name="Home"
              component={HomeStackScreen}
              options={{ tabType: 'home', tabLabel: t('home') }}
            />
            <Tab.Screen
              name="Chat"
              component={ChatScreen}
              options={{ tabType: 'chat', tabLabel: t('chat') }}
            />
            <Tab.Screen
              name="Collection"
              component={CollectionScreen}
              options={{ tabType: 'collection', tabLabel: t('book') }}
            />
            <Tab.Screen
              name="AI"
              component={AIScreen}
              options={{ tabType: 'ai', tabLabel: '记录' }}
            />
            <Tab.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ tabType: 'settings', tabLabel: t('settings') }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </GameContext.Provider>
    </SafeAreaProvider></AuthProvider>
  );
}
const createAppStyles = (C) => StyleSheet.create({
  ld: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.primary, fontSize: 36, fontWeight: '900', letterSpacing: 1 },
  sub: { color: C.tertiary||C.textSec, fontSize: 14, marginTop: 4 },
  lt: { color: C.onSurfaceVariant||C.textTri, fontSize: 13 },
});
