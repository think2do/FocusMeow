import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../../App';
import { playFeedback } from '../utils/feedback';
import { sendVerificationCode, verifyCode } from '../services/authApi';

export default function AuthModal({ visible, onClose, onSuccess, onBack }) {
  const { login, register } = useAuth();
  const { lang } = useGame();
  const zh = lang === 'zh';
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [otp, setOtp] = useState('');
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
    setOtp(''); setShowPwd(false); clearInterval(countdownRef.current); setCountdown(0);
  };
  const handleClose = () => { resetForm(); setMode('login'); onClose(); };

  const doSendRegisterCode = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入有效邮箱' : 'Invalid email'); return;
    }
    if (!password || password.length < 6) {
      Alert.alert(zh ? '提示' : 'Tip', zh ? '密码至少 6 位' : 'Password min 6 chars'); return;
    }
    if (!nickname.trim()) {
      Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入昵称' : 'Enter nickname'); return;
    }
    if (password !== confirmPwd) {
      Alert.alert(zh ? '提示' : 'Tip', zh ? '两次密码不一致' : 'Passwords do not match'); return;
    }
    setLoading(true);
    try {
      await sendVerificationCode(email.trim(), 'register');
      setMode('verify-register');
      startCountdown();
    } catch (e) { Alert.alert(zh ? '发送失败' : 'Failed', e.message); }
    finally { setLoading(false); }
  };

  const doVerifyAndRegister = async () => {
    if (otp.length !== 6) { Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入 6 位验证码' : 'Enter 6-digit code'); return; }
    setLoading(true);
    try {
      const { verifiedToken } = await verifyCode(email.trim(), otp, 'register');
      await register(email.trim(), password, nickname.trim(), verifiedToken);
      playFeedback?.('success');
      Alert.alert(zh ? '注册成功' : 'Success', zh ? '欢迎加入专注喵！' : 'Welcome!', [{
        text: zh ? '好的' : 'OK',
        onPress: () => { handleClose(); onSuccess?.(); },
      }]);
    } catch (e) { Alert.alert(zh ? '失败' : 'Failed', e.message); }
    finally { setLoading(false); }
  };

  const doLogin = async () => {
    setLoading(true);
    try {
      await login(email.trim(), password);
      playFeedback?.('success');
      handleClose();
      onSuccess?.();
    } catch (e) {
      Alert.alert(zh ? '登录失败' : 'Login Failed', e.message || (zh ? '请稍后重试' : 'Please try again'));
    } finally { setLoading(false); }
  };

  const backAction = mode === 'verify-register'
    ? () => { setMode('register'); setOtp(''); clearInterval(countdownRef.current); setCountdown(0); }
    : (onBack || handleClose);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={st.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.card}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <TouchableOpacity onPress={backAction} style={{ padding: 4 }}>
              <Text style={{ fontSize: 18, color: '#8C8480' }}>{'←'}</Text>
            </TouchableOpacity>
            <Text style={[st.title, { flex: 1, marginHorizontal: 8 }]}>
              {mode === 'login' ? (zh ? '登录' : 'Login')
                : mode === 'register' ? (zh ? '注册' : 'Register')
                : (zh ? '验证邮箱' : 'Verify Email')}
            </Text>
            <TouchableOpacity onPress={handleClose} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(180,150,130,0.15)', borderWidth: 1.5, borderColor: '#8C8480', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, color: '#8C8480' }}>X</Text>
            </TouchableOpacity>
          </View>

          {/* Login */}
          {mode === 'login' && <>
            <Text style={st.subtitle}>{zh ? '欢迎回来～ 🐾' : 'Welcome back~'}</Text>
            <View style={st.inputWrap}>
              <TextInput style={st.input} placeholder={zh ? '邮箱' : 'Email'} placeholderTextColor="#ccc" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>
            <View style={st.inputWrap}>
              <TextInput style={[st.input, { flex: 1 }]} placeholder={zh ? '密码（至少 6 位）' : 'Password (min 6)'} placeholderTextColor="#ccc" value={password} onChangeText={setPassword} secureTextEntry={!showPwd} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={{ paddingLeft: 8 }}>
                <Text style={{ fontSize: 14 }}>{showPwd ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[st.submitBtn, loading && { opacity: 0.6 }]} onPress={doLogin} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.submitText}>{zh ? '登录' : 'Login'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { resetForm(); setMode('register'); }} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: '#D06B6B', fontSize: 14 }}>{zh ? '没有账号？去注册' : 'No account? Register'}</Text>
            </TouchableOpacity>
          </>}

          {/* Register — step 1 */}
          {mode === 'register' && <>
            <Text style={st.subtitle}>{zh ? '创建你的专注喵账号 🐱' : 'Create your FocusMeow account'}</Text>
            <View style={st.inputWrap}>
              <TextInput style={st.input} placeholder={zh ? '昵称' : 'Nickname'} placeholderTextColor="#ccc" value={nickname} onChangeText={setNickname} maxLength={20} autoCapitalize="none" />
            </View>
            <View style={st.inputWrap}>
              <TextInput style={st.input} placeholder={zh ? '邮箱' : 'Email'} placeholderTextColor="#ccc" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>
            <View style={st.inputWrap}>
              <TextInput style={[st.input, { flex: 1 }]} placeholder={zh ? '密码（至少 6 位）' : 'Password (min 6)'} placeholderTextColor="#ccc" value={password} onChangeText={setPassword} secureTextEntry={!showPwd} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={{ paddingLeft: 8 }}>
                <Text style={{ fontSize: 14 }}>{showPwd ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            <View style={st.inputWrap}>
              <TextInput style={st.input} placeholder={zh ? '确认密码' : 'Confirm Password'} placeholderTextColor="#ccc" value={confirmPwd} onChangeText={setConfirmPwd} secureTextEntry={!showPwd} autoCapitalize="none" />
            </View>
            <TouchableOpacity style={[st.submitBtn, loading && { opacity: 0.6 }]} onPress={doSendRegisterCode} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.submitText}>{zh ? '发送验证码' : 'Send Code'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { resetForm(); setMode('login'); }} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: '#D06B6B', fontSize: 14 }}>{zh ? '已有账号？去登录' : 'Have account? Login'}</Text>
            </TouchableOpacity>
          </>}

          {/* Register — step 2: OTP */}
          {mode === 'verify-register' && <>
            <Text style={st.subtitle}>{zh ? `验证码已发送至 ${email}` : `Code sent to ${email}`}</Text>
            <TextInput
              style={[st.inputWrap, { height: 60, fontSize: 28, fontWeight: '700', color: '#D06B6B', textAlign: 'center', letterSpacing: 12, paddingHorizontal: 14, marginBottom: 16 }]}
              placeholder="------" placeholderTextColor="#D0C0B0"
              value={otp} onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad" maxLength={6}
            />
            <TouchableOpacity style={[st.submitBtn, (loading || otp.length !== 6) && { opacity: 0.5 }]} onPress={doVerifyAndRegister} disabled={loading || otp.length !== 6}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.submitText}>{zh ? '验证并完成注册' : 'Verify & Register'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (countdown > 0) return; setOtp(''); doSendRegisterCode(); }} style={{ marginTop: 16, alignItems: 'center' }} disabled={countdown > 0}>
              <Text style={{ color: countdown > 0 ? '#B0A090' : '#D06B6B', fontSize: 14 }}>
                {countdown > 0 ? `${countdown}s ${zh ? '后重新发送' : 'to resend'}` : (zh ? '重新发送' : 'Resend')}
              </Text>
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
