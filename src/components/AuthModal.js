import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../../App';
import { playFeedback } from '../utils/feedback';
import { sendVerificationCode, verifyCode, resetPassword } from '../services/authApi';

export default function AuthModal({ visible, onClose, onSuccess, onBack }) {
  const { login, register } = useAuth();
  const { lang } = useGame();
  const zh = lang === 'zh';
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [otp, setOtp] = useState('');
  const [verifiedToken, setVerifiedToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);

  useEffect(() => () => clearInterval(countdownRef.current), []);

  const startCountdown = () => {
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(countdownRef.current); return 0; } return c - 1; });
    }, 1000);
  };

  const resetForm = () => {
    setEmail(''); setPassword(''); setNickname(''); setConfirmPwd('');
    setOtp(''); setNewPwd(''); setVerifiedToken(''); setShowPwd(false);
    clearInterval(countdownRef.current); setCountdown(0);
  };
  const handleClose = () => { resetForm(); setMode('login'); onClose(); };

  // 注册第一步：发验证码
  const doSendRegisterCode = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) { Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入有效邮箱' : 'Invalid email'); return; }
    if (!password || password.length < 6) { Alert.alert(zh ? '提示' : 'Tip', zh ? '密码至少 6 位' : 'Password min 6 chars'); return; }
    if (!nickname.trim()) { Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入昵称' : 'Enter nickname'); return; }
    if (password !== confirmPwd) { Alert.alert(zh ? '提示' : 'Tip', zh ? '两次密码不一致' : 'Passwords do not match'); return; }
    setLoading(true);
    try {
      await sendVerificationCode(email.trim(), 'register');
      setMode('verify-register'); startCountdown();
    } catch (e) { Alert.alert(zh ? '发送失败' : 'Failed', e.message); }
    finally { setLoading(false); }
  };

  // 注册第二步：验证并完成注册
  const doVerifyAndRegister = async () => {
    if (otp.length !== 6) { Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入 6 位验证码' : 'Enter 6-digit code'); return; }
    setLoading(true);
    try {
      const { verifiedToken: vt } = await verifyCode(email.trim(), otp, 'register');
      await register(email.trim(), password, nickname.trim(), vt);
      playFeedback?.('success');
      Alert.alert(zh ? '注册成功' : 'Success', zh ? '欢迎加入专注喵！' : 'Welcome!', [{ text: zh ? '好的' : 'OK', onPress: () => { handleClose(); onSuccess?.(); } }]);
    } catch (e) { Alert.alert(zh ? '失败' : 'Failed', e.message); }
    finally { setLoading(false); }
  };

  // 登录
  const doLogin = async () => {
    setLoading(true);
    try {
      await login(email.trim(), password);
      playFeedback?.('success');
      handleClose(); onSuccess?.();
    } catch (e) { Alert.alert(zh ? '登录失败' : 'Login Failed', e.message || (zh ? '请稍后重试' : 'Please try again')); }
    finally { setLoading(false); }
  };

  // 找回密码第一步：发验证码
  const doSendForgotCode = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) { Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入有效邮箱' : 'Invalid email'); return; }
    setLoading(true);
    try {
      await sendVerificationCode(email.trim(), 'forgot');
      setMode('verify-forgot'); startCountdown();
    } catch (e) { Alert.alert(zh ? '发送失败' : 'Failed', e.message); }
    finally { setLoading(false); }
  };

  // 找回密码第二步：验证码 → 拿 verifiedToken
  const doVerifyForgotCode = async () => {
    if (otp.length !== 6) { Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入 6 位验证码' : 'Enter 6-digit code'); return; }
    setLoading(true);
    try {
      const { verifiedToken: vt } = await verifyCode(email.trim(), otp, 'forgot');
      setVerifiedToken(vt || '');
      setMode('reset-password');
    } catch (e) { Alert.alert(zh ? '失败' : 'Failed', e.message); }
    finally { setLoading(false); }
  };

  // 找回密码第三步：设置新密码
  const doResetPassword = async () => {
    if (!newPwd || newPwd.length < 6) { Alert.alert(zh ? '提示' : 'Tip', zh ? '密码至少 6 位' : 'Min 6 chars'); return; }
    setLoading(true);
    try {
      await resetPassword({
        verifiedToken,
        email: email.trim(),
        code: otp,
        newPassword: newPwd,
      });
      await AsyncStorage.removeItem('@focusmeow_remember');
      setPassword(newPwd);
      Alert.alert(zh ? '重置成功' : 'Success', zh ? '密码已重置，请重新登录' : 'Password reset, please login', [{ text: zh ? '去登录' : 'Login', onPress: () => { setNewPwd(''); setVerifiedToken(''); setMode('login'); } }]);
    } catch (e) { Alert.alert(zh ? '失败' : 'Failed', e.message); }
    finally { setLoading(false); }
  };

  const backAction = () => {
    if (mode === 'verify-register') { setMode('register'); setOtp(''); clearInterval(countdownRef.current); setCountdown(0); }
    else if (mode === 'forgot') { setMode('login'); resetForm(); }
    else if (mode === 'verify-forgot') { setMode('forgot'); setOtp(''); clearInterval(countdownRef.current); setCountdown(0); }
    else if (mode === 'reset-password') { setMode('verify-forgot'); }
    else { (onBack || handleClose)(); }
  };

  const titles = { login: zh ? '登录' : 'Login', register: zh ? '注册' : 'Register', 'verify-register': zh ? '验证邮箱' : 'Verify Email', forgot: zh ? '找回密码' : 'Forgot Password', 'verify-forgot': zh ? '输入验证码' : 'Enter Code', 'reset-password': zh ? '设置新密码' : 'New Password' };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={st.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <TouchableOpacity onPress={backAction} style={{ padding: 4 }}>
              <Text style={{ fontSize: 18, color: '#8C8480' }}>{'←'}</Text>
            </TouchableOpacity>
            <Text style={[st.title, { flex: 1, marginHorizontal: 8 }]}>{titles[mode]}</Text>
            <TouchableOpacity onPress={handleClose} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(180,150,130,0.15)', borderWidth: 1.5, borderColor: '#8C8480', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, color: '#8C8480' }}>X</Text>
            </TouchableOpacity>
          </View>

          {/* 登录 */}
          {mode === 'login' && <>
            <Text style={st.subtitle}>{zh ? '欢迎回来～ 🐾' : 'Welcome back~'}</Text>
            <View style={st.inputWrap}><TextInput style={st.input} placeholder={zh ? '邮箱' : 'Email'} placeholderTextColor="#ccc" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} /></View>
            <View style={st.inputWrap}>
              <TextInput style={[st.input, { flex: 1 }]} placeholder={zh ? '密码（至少 6 位）' : 'Password (min 6)'} placeholderTextColor="#ccc" value={password} onChangeText={setPassword} secureTextEntry={!showPwd} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={{ paddingLeft: 8 }}><Text style={{ fontSize: 14 }}>{showPwd ? '🙈' : '👁️'}</Text></TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { resetForm(); setMode('forgot'); }} style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
              <Text style={{ color: '#D06B6B', fontSize: 13 }}>{zh ? '忘记密码？' : 'Forgot password?'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.submitBtn, loading && { opacity: 0.6 }]} onPress={doLogin} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.submitText}>{zh ? '登录' : 'Login'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { resetForm(); setMode('register'); }} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: '#D06B6B', fontSize: 14 }}>{zh ? '没有账号？去注册' : 'No account? Register'}</Text>
            </TouchableOpacity>
          </>}

          {/* 注册第一步 */}
          {mode === 'register' && <>
            <Text style={st.subtitle}>{zh ? '创建你的专注喵账号 🐱' : 'Create your FocusMeow account'}</Text>
            <View style={st.inputWrap}><TextInput style={st.input} placeholder={zh ? '昵称' : 'Nickname'} placeholderTextColor="#ccc" value={nickname} onChangeText={setNickname} maxLength={20} autoCapitalize="none" /></View>
            <View style={st.inputWrap}><TextInput style={st.input} placeholder={zh ? '邮箱' : 'Email'} placeholderTextColor="#ccc" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} /></View>
            <View style={st.inputWrap}>
              <TextInput style={[st.input, { flex: 1 }]} placeholder={zh ? '密码（至少 6 位）' : 'Password (min 6)'} placeholderTextColor="#ccc" value={password} onChangeText={setPassword} secureTextEntry={!showPwd} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={{ paddingLeft: 8 }}><Text style={{ fontSize: 14 }}>{showPwd ? '🙈' : '👁️'}</Text></TouchableOpacity>
            </View>
            <View style={st.inputWrap}><TextInput style={st.input} placeholder={zh ? '确认密码' : 'Confirm Password'} placeholderTextColor="#ccc" value={confirmPwd} onChangeText={setConfirmPwd} secureTextEntry={!showPwd} autoCapitalize="none" /></View>
            <TouchableOpacity style={[st.submitBtn, loading && { opacity: 0.6 }]} onPress={doSendRegisterCode} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.submitText}>{zh ? '发送验证码' : 'Send Code'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { resetForm(); setMode('login'); }} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: '#D06B6B', fontSize: 14 }}>{zh ? '已有账号？去登录' : 'Have account? Login'}</Text>
            </TouchableOpacity>
          </>}

          {/* 注册第二步：OTP */}
          {mode === 'verify-register' && <>
            <Text style={st.subtitle}>{zh ? `验证码已发送至\n${email}` : `Code sent to\n${email}`}</Text>
            <TextInput style={[st.inputWrap, { height: 60, fontSize: 28, fontWeight: '700', color: '#D06B6B', textAlign: 'center', letterSpacing: 12, paddingHorizontal: 14, marginBottom: 16 }]} placeholder="------" placeholderTextColor="#D0C0B0" value={otp} onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
            <TouchableOpacity style={[st.submitBtn, (loading || otp.length !== 6) && { opacity: 0.5 }]} onPress={doVerifyAndRegister} disabled={loading || otp.length !== 6}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.submitText}>{zh ? '验证并完成注册' : 'Verify & Register'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (countdown > 0) return; setOtp(''); doSendRegisterCode(); }} style={{ marginTop: 16, alignItems: 'center' }} disabled={countdown > 0}>
              <Text style={{ color: countdown > 0 ? '#B0A090' : '#D06B6B', fontSize: 14 }}>{countdown > 0 ? `${countdown}s ${zh ? '后重新发送' : 'to resend'}` : (zh ? '重新发送' : 'Resend')}</Text>
            </TouchableOpacity>
          </>}

          {/* 找回密码第一步：输邮箱 */}
          {mode === 'forgot' && <>
            <Text style={st.subtitle}>{zh ? '输入注册邮箱，发送验证码 📬' : 'Enter your email to reset password'}</Text>
            <View style={st.inputWrap}><TextInput style={st.input} placeholder={zh ? '注册邮箱' : 'Email'} placeholderTextColor="#ccc" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} /></View>
            <TouchableOpacity style={[st.submitBtn, loading && { opacity: 0.6 }]} onPress={doSendForgotCode} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.submitText}>{zh ? '发送验证码' : 'Send Code'}</Text>}
            </TouchableOpacity>
          </>}

          {/* 找回密码第二步：输验证码 */}
          {mode === 'verify-forgot' && <>
            <Text style={st.subtitle}>{zh ? `验证码已发送至\n${email}` : `Code sent to\n${email}`}</Text>
            <TextInput style={[st.inputWrap, { height: 60, fontSize: 28, fontWeight: '700', color: '#D06B6B', textAlign: 'center', letterSpacing: 12, paddingHorizontal: 14, marginBottom: 16 }]} placeholder="------" placeholderTextColor="#D0C0B0" value={otp} onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
            <TouchableOpacity style={[st.submitBtn, (loading || otp.length !== 6) && { opacity: 0.5 }]} onPress={doVerifyForgotCode} disabled={loading || otp.length !== 6}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.submitText}>{zh ? '验证' : 'Verify'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (countdown > 0) return; setOtp(''); doSendForgotCode(); }} style={{ marginTop: 16, alignItems: 'center' }} disabled={countdown > 0}>
              <Text style={{ color: countdown > 0 ? '#B0A090' : '#D06B6B', fontSize: 14 }}>{countdown > 0 ? `${countdown}s ${zh ? '后重新发送' : 'to resend'}` : (zh ? '重新发送' : 'Resend')}</Text>
            </TouchableOpacity>
          </>}

          {/* 找回密码第三步：设新密码 */}
          {mode === 'reset-password' && <>
            <Text style={st.subtitle}>{zh ? '设置你的新密码 🔑' : 'Set your new password'}</Text>
            <View style={st.inputWrap}>
              <TextInput style={[st.input, { flex: 1 }]} placeholder={zh ? '新密码（至少 6 位）' : 'New password (min 6)'} placeholderTextColor="#ccc" value={newPwd} onChangeText={setNewPwd} secureTextEntry={!showPwd} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={{ paddingLeft: 8 }}><Text style={{ fontSize: 14 }}>{showPwd ? '🙈' : '👁️'}</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={[st.submitBtn, loading && { opacity: 0.6 }]} onPress={doResetPassword} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.submitText}>{zh ? '确认重置' : 'Reset Password'}</Text>}
            </TouchableOpacity>
          </>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  card: { width: '85%', maxWidth: 380, backgroundColor: '#FFF8F4', borderRadius: 22, paddingHorizontal: 28, paddingTop: 32, paddingBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12 },
  title: { fontSize: 26, fontWeight: '700', color: '#332E2C', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#A09080', textAlign: 'center', marginTop: 6, marginBottom: 24 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(180,150,130,0.18)', paddingHorizontal: 14, marginBottom: 14, height: 50 },
  input: { flex: 1, fontSize: 15, color: '#332E2C', padding: 0 },
  submitBtn: { backgroundColor: '#D06B6B', borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
});
