import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Image, StyleSheet } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Svg, { Circle, Rect, Path, Line } from 'react-native-svg';
import { useGame } from '../../App';
import { maskEmail, maskPhone } from '../utils/helpers';
import { saveUserInfo, loadUserInfo } from '../services/authApi';
import { playFeedback } from '../utils/feedback';
import { C, THEME_OPTIONS } from '../utils/theme';


const AVATAR_IMAGES = {
  cat1: require('../assets/avatars/cat1.png'),
  cat2: require('../assets/avatars/cat2.png'),
  cat3: require('../assets/avatars/cat3.png'),
  cat4: require('../assets/avatars/cat4.png'),
  cat5: require('../assets/avatars/cat5.png'),
  cat6: require('../assets/avatars/cat6.png'),
  cat7: require('../assets/avatars/cat7.png'),
  dog: require('../assets/avatars/dog.png'),
  duck: require('../assets/avatars/duck.png'),
};
const AVATAR_KEYS = ['cat1','cat2','cat3','cat4','cat5','cat6','cat7','dog','duck'];

function SettingsIcon({ type, color = C.primary, size = 22 }) {
  const stroke = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  if (type === 'info') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="5" y="4" width="14" height="16" rx="3" {...stroke} />
        <Line x1="9" y1="9" x2="15" y2="9" {...stroke} />
        <Line x1="9" y1="13" x2="15" y2="13" {...stroke} />
        <Line x1="9" y1="17" x2="13" y2="17" {...stroke} />
      </Svg>
    );
  }
  if (type === 'globe') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="8" {...stroke} />
        <Line x1="4" y1="12" x2="20" y2="12" {...stroke} />
        <Path d="M12 4 C14.3 6.2 15.4 9 15.4 12 C15.4 15 14.3 17.8 12 20 C9.7 17.8 8.6 15 8.6 12 C8.6 9 9.7 6.2 12 4" {...stroke} />
      </Svg>
    );
  }
  if (type === 'theme') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 4 C7.6 4 4 7.1 4 11.2 C4 14.7 6.6 17.5 10.1 17.5 H11.2 C12.3 17.5 12.7 18.3 12.4 19.1 C12 20.3 13.1 21.1 14.3 20.5 C17.7 18.9 20 15.8 20 12 C20 7.6 16.4 4 12 4 Z" {...stroke} />
        <Circle cx="8.4" cy="10.4" r="0.9" fill={color} />
        <Circle cx="11.1" cy="8.4" r="0.9" fill={color} />
        <Circle cx="14.4" cy="9.2" r="0.9" fill={color} />
      </Svg>
    );
  }
  if (type === 'chat') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="4" y="5" width="16" height="12" rx="4" {...stroke} />
        <Path d="M8 17 V20 L12 17" {...stroke} />
        <Line x1="8" y1="11" x2="16" y2="11" {...stroke} />
      </Svg>
    );
  }
  if (type === 'audio') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M5 10 H8 L12 6 V18 L8 14 H5 Z" {...stroke} />
        <Path d="M16 9 C17.2 10.2 17.2 13.8 16 15" {...stroke} />
        <Path d="M18.5 6.5 C21 9.4 21 14.6 18.5 17.5" {...stroke} />
      </Svg>
    );
  }
  if (type === 'document') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="6" y="4" width="12" height="16" rx="2.5" {...stroke} />
        <Line x1="9" y1="9" x2="15" y2="9" {...stroke} />
        <Line x1="9" y1="13" x2="15" y2="13" {...stroke} />
        <Line x1="9" y1="17" x2="13" y2="17" {...stroke} />
      </Svg>
    );
  }
  if (type === 'lock') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="5" y="10" width="14" height="10" rx="3" {...stroke} />
        <Path d="M8 10 V8 C8 5.8 9.6 4.2 12 4.2 C14.4 4.2 16 5.8 16 8 V10" {...stroke} />
        <Circle cx="12" cy="15" r="1" fill={color} />
      </Svg>
    );
  }
  if (type === 'box') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M5 8 L12 4 L19 8 L12 12 Z" {...stroke} />
        <Path d="M5 8 V16 L12 20 L19 16 V8" {...stroke} />
        <Path d="M12 12 V20" {...stroke} />
      </Svg>
    );
  }
  if (type === 'reset') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M6 9 C7.2 6.6 9.4 5 12 5 C15.9 5 19 8.1 19 12 C19 15.9 15.9 19 12 19 C9.2 19 6.8 17.4 5.7 15" {...stroke} />
        <Path d="M6 5 V9 H10" {...stroke} />
      </Svg>
    );
  }
  if (type === 'camera') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="4" y="7" width="16" height="12" rx="3" {...stroke} />
        <Path d="M9 7 L10.2 5 H13.8 L15 7" {...stroke} />
        <Circle cx="12" cy="13" r="3" {...stroke} />
      </Svg>
    );
  }
  if (type === 'mail') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Rect x="4" y="6" width="16" height="12" rx="3" {...stroke} />
        <Path d="M5.5 8 L12 13 L18.5 8" {...stroke} />
      </Svg>
    );
  }
  if (type === 'phone') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M8 5 H16 C17.1 5 18 5.9 18 7 V17 C18 18.1 17.1 19 16 19 H8 C6.9 19 6 18.1 6 17 V7 C6 5.9 6.9 5 8 5 Z" {...stroke} />
        <Line x1="10" y1="16" x2="14" y2="16" {...stroke} />
      </Svg>
    );
  }
  if (type === 'eye' || type === 'eyeOff') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M4 12 C6 8.8 8.6 7.2 12 7.2 C15.4 7.2 18 8.8 20 12 C18 15.2 15.4 16.8 12 16.8 C8.6 16.8 6 15.2 4 12 Z" {...stroke} />
        <Circle cx="12" cy="12" r="2.2" {...stroke} />
        {type === 'eyeOff' ? <Line x1="5" y1="19" x2="19" y2="5" {...stroke} /> : null}
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="8" r="3" {...stroke} />
      <Path d="M5 20 C6.5 16.5 9 15 12 15 C15 15 17.5 16.5 19 20" {...stroke} />
    </Svg>
  );
}

export default function SettingsScreen() {
  const g = useGame();
  const { t, lang, setLang, profile, setProfile, guestMode, audioPrefs, setAudioPrefs, resetApp, resetAll, themeId, setTheme } = g;
  const { user, isLoggedIn, logout: authLogout } = useAuth();
  const s = createStyles(C);
  const [showAuth, setShowAuth] = useState(false);
  const [userInfo, setUserInfo] = useState({ birthday: "", gender: "", identity: "", height: "", weight: "", hobby: "" });
  const [showInfo, setShowInfo] = useState(false);

  React.useEffect(() => {
    if (user?.email) {
      loadUserInfo(user.email).then(data => {
        if (data) setUserInfo({ birthday: data.birthday||'', gender: data.gender||'', identity: data.identity||'', height: data.height||'', weight: data.weight||'', hobby: data.hobby||'' });
      });
    }
  }, [user?.email]);
  const [sec, setSec] = useState(null);
  const [fb, setFB] = useState('');
  const [sp, setSP] = useState(false);
  const [pe, setPE] = useState(null);
  const [ev, setEV] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [resettingProgress, setResettingProgress] = useState(false);
  const zh = lang === 'zh';
  const isPngAvatar = profile.avatarType === 'png' && profile.avatar && AVATAR_KEYS.includes(profile.avatar);

  const pickPhoto = () => {
    Alert.alert(
      zh ? '设置头像' : 'Set Avatar',
      zh ? '选择获取方式' : 'Choose method',
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: zh ? '拍照' : 'Camera',
          onPress: () => {
            launchCamera(
              { mediaType: 'photo', quality: 0.7, maxWidth: 300, maxHeight: 300, includeBase64: false },
              (resp) => {
                if (resp.didCancel || resp.errorCode) return;
                if (resp.assets && resp.assets[0]?.uri) {
                  setProfile(p => ({ ...p, avatar: resp.assets[0].uri, avatarType: 'photo' }));
                  playFeedback('tap');
                }
              }
            );
          }
        },
        {
          text: zh ? '从相册选择' : 'Gallery',
          onPress: () => {
            launchImageLibrary(
              { mediaType: 'photo', quality: 0.7, maxWidth: 300, maxHeight: 300, includeBase64: false },
              (resp) => {
                if (resp.didCancel || resp.errorCode) return;
                if (resp.assets && resp.assets[0]?.uri) {
                  setProfile(p => ({ ...p, avatar: resp.assets[0].uri, avatarType: 'photo' }));
                  playFeedback('tap');
                }
              }
            );
          }
        },
      ]
    );
  };

  const isPhotoAvatar = profile.avatarType === 'photo' && profile.avatar && profile.avatar.startsWith('/');
  const isUri = profile.avatar && (profile.avatar.startsWith('file://') || profile.avatar.startsWith('/') || profile.avatar.startsWith('ph://'));
  const Row = ({ icon, label, right, onPress }) => (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={s.rl}>
        <View style={s.rowIcon}>{React.isValidElement(icon) ? icon : <SettingsIcon type={icon} color={C.primary} />}</View>
        <Text style={s.rla}>{label}</Text>
      </View>
      {right}
    </TouchableOpacity>
  );

  const AvatarDisplay = ({ size = 56 }) => {
    if (isPngAvatar) {
      return (
        <View style={[s.av, { width: size, height: size, borderRadius: size * 0.22, backgroundColor: C.avatarBg }]}>
          <Image source={AVATAR_IMAGES[profile.avatar]} style={{ width: size, height: size, borderRadius: size * 0.22 }} />
        </View>
      );
    }
    if (isUri || isPhotoAvatar) {
      const uri = profile.avatar.startsWith('/') ? 'file://' + profile.avatar : profile.avatar;
      return (
        <View style={[s.av, { width: size, height: size, borderRadius: size * 0.22, backgroundColor: C.avatarBg }]}>
          <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size * 0.22 }} />
        </View>
      );
    }
    return (
      <View style={[s.av, { width: size, height: size, borderRadius: size * 0.22, backgroundColor: C.avatarBg }]}>
        <Text style={{ fontSize: size * 0.5 }}>{profile.avatar || '😺'}</Text>
      </View>
    );
  };

  const confirmResetProgress = () => {
    const accountLabel = user?.email || profile.email || (zh ? '当前账号' : 'current account');
    Alert.alert(
      zh ? '重新开始体验' : 'Reset Progress',
      zh
        ? `这会清空 ${accountLabel} 在当前设备上的猫咪、专注和陪伴数据，但不会退出登录。确认继续吗？`
        : `This clears the cat, focus, and companion data for ${accountLabel} on this device, but keeps the account signed in. Continue?`,
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: zh ? '确认清空' : 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setResettingProgress(true);
              await resetAll?.({
                profile: {
                  ...profile,
                  email: user?.email || profile.email,
                  username: user?.email ? user.email.split('@')[0] : profile.username,
                  nickname: user?.nickname || profile.nickname,
                },
              });
              Alert.alert('', zh ? '已清空当前进度，可以重新开始体验了。' : 'Progress cleared. You can start fresh now.');
            } finally {
              setResettingProgress(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100, paddingTop: 55 }}>
      <Text style={s.h}>{t('settingsTitle')}</Text>
      {guestMode && <View style={{ backgroundColor: C.subtleTint, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.accentLine }}><Text style={{ color: C.primary, fontSize: 12, textAlign: 'center' }}>{zh ? '\u4f60\u6b63\u5728\u6e38\u5ba2\u6a21\u5f0f\uff0c\u6570\u636e\u4e0d\u4f1a\u4fdd\u5b58\u3002\u6ce8\u518c\u8d26\u53f7\u53ef\u6c38\u4e45\u4fdd\u5b58\u4f60\u7684\u4e13\u6ce8\u8bb0\u5f55\u548c\u732b\u54aa\uff01' : 'Guest mode - data will not be saved. Register to keep your records!'}</Text></View>}

      {/* Profile Card */}
      <TouchableOpacity style={s.pc} onPress={() => setSP(true)}>
        <TouchableOpacity onPress={pickPhoto} style={{ position: 'relative' }}>
          <AvatarDisplay size={56} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={s.pn}>{profile.nickname}</Text><Text style={s.pu}>{zh ? '账号管理' : 'Account'}</Text></View>
        <Text style={{ color: C.outline, fontSize: 16 }}>▶</Text>
      </TouchableOpacity>

      {/* Emoji avatars + photo upload button */}


      {/* Avatar selector */}
      <View style={s.emr}>
        <Text style={s.eml}>{t('chooseAvatar')}</Text>
        <TouchableOpacity style={[s.emb, { backgroundColor: C.primaryFixed }]} onPress={pickPhoto}>
          <SettingsIcon type="camera" color={C.primary} size={18} />
        </TouchableOpacity>
        {AVATAR_KEYS.map(a =>
          <TouchableOpacity key={a} style={[s.emb, isPngAvatar && profile.avatar === a && s.emba]}
            onPress={() => { setProfile(p => ({ ...p, avatar: a, avatarType: 'png' })); }}>
            <Image source={AVATAR_IMAGES[a]} style={{width:28,height:28,borderRadius:14}} />
          </TouchableOpacity>
        )}
      </View>

      {/* Personal Info */}
      <Row icon="info" label={zh ? "个人信息" : "Personal Info"} right={<Text style={s.arr}>{showInfo ? "▲" : "▼"}</Text>} onPress={() => setShowInfo(!showInfo)} />
      {showInfo && <View style={[s.exp, { marginTop: -12 }]}>
        <View style={{ marginBottom: 10 }}><Text style={{ color: "#8C8480", fontSize: 12, marginBottom: 4 }}>{zh ? "生日" : "Birthday"}</Text><TextInput style={s.ei} placeholder="YYYY-MM-DD" placeholderTextColor="#B0A090" value={userInfo.birthday} onChangeText={v => setUserInfo(p => ({...p, birthday: v}))} /></View>
        <View style={{ marginBottom: 10 }}><Text style={{ color: "#8C8480", fontSize: 12, marginBottom: 4 }}>{zh ? "性别" : "Gender"}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>{(zh ? ["男","女","保密"] : ["Male","Female","Private"]).map(g => <TouchableOpacity key={g} style={[s.lb, userInfo.gender === g && s.lba, { flex: 1, alignItems: "center" }]} onPress={() => setUserInfo(p => ({...p, gender: g}))}><Text style={[s.lbt, userInfo.gender === g && { color: "#D06B6B" }]}>{g}</Text></TouchableOpacity>)}</View></View>
        <View style={{ marginBottom: 10 }}><Text style={{ color: "#8C8480", fontSize: 12, marginBottom: 4 }}>{zh ? "身份" : "Identity"}</Text><TextInput style={s.ei} placeholder={zh ? "如：学生、上班族" : "e.g. Student"} placeholderTextColor="#B0A090" value={userInfo.identity} onChangeText={v => setUserInfo(p => ({...p, identity: v}))} /></View>
        <View style={{ marginBottom: 10 }}><Text style={{ color: "#8C8480", fontSize: 12, marginBottom: 4 }}>{zh ? "身高 (cm)" : "Height (cm)"}</Text><TextInput style={s.ei} placeholder="***" placeholderTextColor="#B0A090" value={userInfo.height} onChangeText={v => setUserInfo(p => ({...p, height: v}))} keyboardType="numeric" /></View>
        <View style={{ marginBottom: 10 }}><Text style={{ color: "#8C8480", fontSize: 12, marginBottom: 4 }}>{zh ? "体重 (kg)" : "Weight (kg)"}</Text><TextInput style={s.ei} placeholder="***" placeholderTextColor="#B0A090" value={userInfo.weight} onChangeText={v => setUserInfo(p => ({...p, weight: v}))} keyboardType="numeric" /></View>
        <View style={{ marginBottom: 10 }}><Text style={{ color: "#8C8480", fontSize: 12, marginBottom: 4 }}>{zh ? "兴趣" : "Hobbies"}</Text><TextInput style={s.ei} placeholder={zh ? "如：阅读、运动" : "e.g. Reading"} placeholderTextColor="#B0A090" value={userInfo.hobby} onChangeText={v => setUserInfo(p => ({...p, hobby: v}))} /></View>
        <Text style={{ color: "#B0A090", fontSize: 11, textAlign: "center", marginTop: 8, fontStyle: "italic" }}>{zh ? '填写个人信息可以让你的猫咪更了解你' : 'Fill in your info so your cat knows you better'}</Text>
        <TouchableOpacity style={[s.sbtn, { marginTop: 12 }]} onPress={() => { if (user?.email) { saveUserInfo(user.email, userInfo); Alert.alert('', zh ? '保存成功' : 'Saved!'); } else { Alert.alert('', zh ? '请先登录' : 'Please login first'); } }}><Text style={s.sbt}>{zh ? '保存' : 'Save'}</Text></TouchableOpacity>
      </View>}

      {/* Language */}
      <Row icon="globe" label={t('langLabel')} right={
        <View style={s.lbs}>{[['zh','中文'],['en','EN']].map(([k, lb]) =>
          <TouchableOpacity key={k} style={[s.lb, lang === k && s.lba]} onPress={() => setLang(k)}>
            <Text style={[s.lbt, lang === k && { color: C.primary }]}>{lb}</Text>
          </TouchableOpacity>
        )}</View>
      } />

      <Row icon="theme" label={zh ? '主题色' : 'Theme Color'} right={<Text style={s.arr}>{sec === 'theme' ? '▲' : '▼'}</Text>} onPress={() => setSec(sec === 'theme' ? null : 'theme')} />
      {sec === 'theme' && (
        <View style={s.exp}>
          <View style={s.themeGrid}>
            {THEME_OPTIONS.map(option => {
              const active = themeId === option.id || (!themeId && option.id === 'default');
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[s.themeCard, active && s.themeCardActive]}
                  onPress={() => {
                    setTheme?.(option.id);
                    playFeedback('tap');
                  }}
                  activeOpacity={0.86}
                >
                  <View style={s.themeSwatchRow}>
                    <View style={[s.themeSwatch, { backgroundColor: option.primary }]} />
                    <View style={[s.themeSwatch, { backgroundColor: option.secondary }]} />
                    <View style={[s.themeSwatch, { backgroundColor: option.background, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }]} />
                  </View>
                  <Text style={[s.themeCardTitle, active && s.themeCardTitleActive]}>
                    {zh ? option.labelZh : option.labelEn}
                  </Text>
                  <Text style={s.themeCardMeta}>
                    {active ? (zh ? '当前使用中' : 'Active now') : (zh ? '点击切换' : 'Tap to apply')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Feedback */}
      <Row icon="chat" label={t('feedbackLabel')} right={<Text style={s.arr}>{sec === 'fb' ? '▲' : '▼'}</Text>} onPress={() => setSec(sec === 'fb' ? null : 'fb')} />
      {sec === 'fb' && <View style={s.exp}>
        <TextInput style={s.ta} placeholder={t('feedbackPH')} placeholderTextColor={C.outline} value={fb} onChangeText={setFB} multiline numberOfLines={4} />
        <TouchableOpacity style={s.sbtn} onPress={() => { Alert.alert('', t('feedbackThanks')); setFB(''); setSec(null); }}><Text style={s.sbt}>{t('submit')}</Text></TouchableOpacity>
      </View>}

      <Row icon="audio" label={t('audioLabel')} right={<Text style={s.arr}>{sec === 'audio' ? '▲' : '▼'}</Text>} onPress={() => setSec(sec === 'audio' ? null : 'audio')} />
      {sec === 'audio' && <View style={s.exp}>
        <View style={s.audioRow}>
          <Text style={s.audioLabel}>{t('sfxLabel')}</Text>
          <TouchableOpacity style={[s.lb, audioPrefs?.sfxEnabled && s.lba]} onPress={() => { playFeedback('tap'); setAudioPrefs(p => ({ ...p, sfxEnabled: !p.sfxEnabled })); }}>
            <Text style={[s.lbt, audioPrefs?.sfxEnabled && { color: C.primary }]}>{audioPrefs?.sfxEnabled ? (zh ? '开启' : 'On') : (zh ? '关闭' : 'Off')}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.audioRow}>
          <Text style={s.audioLabel}>{t('hapticsLabel')}</Text>
          <TouchableOpacity style={[s.lb, audioPrefs?.hapticsEnabled && s.lba]} onPress={() => { playFeedback('tap'); setAudioPrefs(p => ({ ...p, hapticsEnabled: !p.hapticsEnabled })); }}>
            <Text style={[s.lbt, audioPrefs?.hapticsEnabled && { color: C.primary }]}>{audioPrefs?.hapticsEnabled ? (zh ? '开启' : 'On') : (zh ? '关闭' : 'Off')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.audioHint}>{zh ? '专注音乐改为在专注页面右上角的音乐按钮里即时选择。' : 'Focus ambience is now selected from the music button on the focus screen.'}</Text>
      </View>}

      <Row icon="document" label={t('termsLabel')} right={<Text style={s.arr}>{sec === 'terms' ? '▲' : '▼'}</Text>} onPress={() => setSec(sec === 'terms' ? null : 'terms')} />
      {sec === 'terms' && <View style={s.exp}><Text style={s.lt}>{t('appName')} {t('termsLabel')}</Text><Text style={s.ld}>{t('termsDate')}</Text><Text style={s.lb2}>{t('termsBody')}</Text></View>}

      <Row icon="lock" label={t('privacyLabel')} right={<Text style={s.arr}>{sec === 'priv' ? '▲' : '▼'}</Text>} onPress={() => setSec(sec === 'priv' ? null : 'priv')} />
      {sec === 'priv' && <View style={s.exp}><Text style={s.lt}>{t('appName')} {t('privacyLabel')}</Text><Text style={s.ld}>{t('termsDate')}</Text><Text style={s.lb2}>{t('privacyBody')}</Text></View>}

      <Row icon="box" label={t('versionLabel')} right={<Text style={{ color: C.outline, fontSize: 13, fontWeight: '700' }}>v 1.3.0</Text>} />

      <TouchableOpacity style={[s.row, s.resetRow]} activeOpacity={0.82} onPress={confirmResetProgress} disabled={resettingProgress}>
        <View style={s.rl}>
          <View style={s.rowIcon}><SettingsIcon type="reset" color={C.error} /></View>
          <Text style={[s.rla, s.resetLabel]}>{zh ? '重新开始体验' : 'Reset Progress'}</Text>
        </View>
        <Text style={s.resetValue}>
          {resettingProgress ? (zh ? '处理中...' : 'Resetting...') : (zh ? '清空猫咪数据' : 'Clear data')}
        </Text>
      </TouchableOpacity>

      {/* Profile Modal */}
      <Modal visible={sp} transparent animationType="fade"><TouchableOpacity style={s.mb} activeOpacity={1} onPress={() => { setSP(false); setPE(null); }}><TouchableOpacity style={s.mc} activeOpacity={1} onPress={() => {}}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><Text style={[s.mt, { marginBottom: 0 }]}>{t('profileTitle')}</Text><TouchableOpacity onPress={() => { setSP(false); setPE(null); }} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(180,150,130,0.15)', borderWidth: 1.5, borderColor: '#8C8480', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 14, color: '#8C8480' }}>X</Text></TouchableOpacity></View>
        {!pe && <>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={pickPhoto} style={{ position: 'relative' }}>
              <AvatarDisplay size={72} />
            </TouchableOpacity>
            <Text style={{ color: '#8C8480', fontSize: 11, marginTop: 6 }}>{zh ? '点击更换头像' : 'Tap to change'}</Text>
          </View>
          <Row icon="account" label={t('nickname')} right={<Text style={{ color: '#332E2C', fontSize: 13 }}>{isLoggedIn ? (user.nickname || user.email) : ''}</Text>} onPress={() => { setPE('nick'); setEV({ v: profile.nickname }); }} />
          <Row icon="mail" label={t('email')} right={<Text style={s.dim}>{isLoggedIn ? maskEmail(user.email) : ''}</Text>} onPress={() => { setPE('email'); setEV({}); }} />
          <Row icon="phone" label={t('phone')} right={<Text style={s.dim}>{profile.phone ? maskPhone(profile.phone) : t('notBound')}</Text>} />
          <Row icon="lock" label={t('password')} right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.dim}>{showPwd ? profile.password : '••••••'}</Text>
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
                <SettingsIcon type={showPwd ? 'eyeOff' : 'eye'} color={C.outline} size={18} />
              </TouchableOpacity>
            </View>
          } onPress={() => { setPE('pwd'); setEV({}); }} />
          {isLoggedIn ? (
          <TouchableOpacity style={s.lo} onPress={() => { Alert.alert('', 'Confirm logout?', [{ text: 'Cancel', style: 'cancel' }, { text: 'OK', style: 'destructive', onPress: async () => { await authLogout(); playFeedback('light'); setSP(false); if (resetApp) resetApp(); } }]); }}><Text style={s.lot}>{t('logout')}</Text></TouchableOpacity>
          ) : (
          <TouchableOpacity style={[s.lo, { backgroundColor: '#D06B6B', borderColor: '#D06B6B' }]} onPress={() => { setSP(false); setTimeout(() => setShowAuth(true), 300); }}><Text style={[s.lot, { color: '#fff' }]}>{zh ? '登录 / 注册' : 'Login / Register'}</Text></TouchableOpacity>
          )}
        </>}
        {pe === 'nick' && <><Text style={s.el}>{t('changeNick')}</Text>
          <TextInput style={s.ei} value={ev.v || ''} onChangeText={v => setEV({ v })} />
          <View style={s.ebs}><TouchableOpacity style={s.cb} onPress={() => setPE(null)}><Text style={s.cbt}>{t('cancel')}</Text></TouchableOpacity><TouchableOpacity style={s.sbtn} onPress={() => { setProfile(p => ({ ...p, nickname: ev.v })); setPE(null); Alert.alert('', t('saved')); }}><Text style={s.sbt}>{t('save')}</Text></TouchableOpacity></View>
        </>}
        {pe === 'email' && <><Text style={s.el}>{t('changeEmail')}</Text>
          <TextInput style={s.ei} placeholder={t('oldEmail')} placeholderTextColor="#B0A090" />
          <TextInput style={[s.ei, { marginTop: 8 }]} placeholder={t('newEmail')} placeholderTextColor="#B0A090" onChangeText={v => setEV({ v })} />
          <View style={s.ebs}><TouchableOpacity style={s.cb} onPress={() => setPE(null)}><Text style={s.cbt}>{t('cancel')}</Text></TouchableOpacity><TouchableOpacity style={s.sbtn} onPress={() => { if (ev.v) setProfile(p => ({ ...p, email: ev.v })); setPE(null); Alert.alert('', t('saved')); }}><Text style={s.sbt}>{t('confirm')}</Text></TouchableOpacity></View>
        </>}
        {pe === 'pwd' && <><Text style={s.el}>{t('changePwd')}</Text>
          <TextInput style={s.ei} placeholder={t('oldPwd')} placeholderTextColor="#B0A090" secureTextEntry />
          <TextInput style={[s.ei, { marginTop: 8 }]} placeholder={t('newPwd')} placeholderTextColor="#B0A090" secureTextEntry onChangeText={v => setEV({ v })} />
          <View style={s.ebs}><TouchableOpacity style={s.cb} onPress={() => setPE(null)}><Text style={s.cbt}>{t('cancel')}</Text></TouchableOpacity><TouchableOpacity style={s.sbtn} onPress={() => { if (ev.v) setProfile(p => ({ ...p, password: ev.v })); setPE(null); Alert.alert('', t('saved')); }}><Text style={s.sbt}>{t('confirm')}</Text></TouchableOpacity></View>
        </>}
      </TouchableOpacity></TouchableOpacity></Modal>
      <AuthModal visible={showAuth} onClose={() => setShowAuth(false)} onSuccess={() => { setSP(false); }} onBack={() => { setShowAuth(false); setTimeout(() => setSP(true), 300); }} />
    </ScrollView>
  );
}
const createStyles = (C) => StyleSheet.create({
  h: { fontSize: 24, fontWeight: '900', color: C.primary, marginBottom: 16 },
  pc: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surfaceContainerLowest, borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  av: { backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pn: { color: C.onSurface, fontWeight: '700', fontSize: 16 }, pu: { color: C.outline, fontSize: 12 },
  emr: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16, alignItems: 'center' },
  eml: { color: C.outline, fontSize: 11, marginRight: 4, width: '100%', marginBottom: 4 },
  emb: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.surfaceContainerLowest, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  emba: { backgroundColor: C.activeTint, borderColor: C.primary },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surfaceContainerLowest, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  resetRow: { borderColor: C.errorContainer, backgroundColor: C.surfaceContainerLow },
  resetLabel: { color: C.error },
  resetValue: { color: C.error, fontSize: 12, fontWeight: '700' },
  rl: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rowIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.activeTint, alignItems: 'center', justifyContent: 'center' },
  rla: { color: C.onSurface, fontWeight: '600', fontSize: 14 },
  arr: { color: C.outline, fontSize: 14 },
  dim: { color: C.onSurfaceVariant, fontSize: 12 },
  lbs: { flexDirection: 'row', gap: 6 },
  lb: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10, backgroundColor: C.surfaceContainerLowest, borderWidth: 1.5, borderColor: C.border },
  lba: { backgroundColor: C.activeTint, borderColor: C.primary },
  lbt: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '700' },
  exp: { backgroundColor: C.surfaceContainerLowest, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: 16, marginTop: -12, marginBottom: 12, borderWidth: 1, borderColor: C.surfaceContainerLowest, borderTopWidth: 0 },
  audioRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  audioLabel: { color: C.onSurface, fontSize: 13, fontWeight: '600' },
  audioHint: { color: C.outline, fontSize: 11, lineHeight: 17, marginTop: 12 },
  ta: { backgroundColor: C.surfaceContainerLowest, borderWidth: 1.5, borderColor: C.inputBorder, borderRadius: 12, padding: 12, color: C.onSurface, fontSize: 14, textAlignVertical: 'top', minHeight: 80 },
  sbtn: { flex: 1, backgroundColor: C.primary, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 10 },
  sbt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  lt: { color: C.onSurface, fontWeight: '700', fontSize: 14, marginBottom: 4 },
  ld: { color: C.outline, fontSize: 11, marginBottom: 8 },
  lb2: { color: C.onSurfaceVariant, fontSize: 12, lineHeight: 20 },
  mb: { flex: 1, backgroundColor: C.overlay, justifyContent: 'center', alignItems: 'center', padding: 16 },
  mc: { backgroundColor: C.surface, borderRadius: 22, padding: 24, width: '100%', maxWidth: 380 },
  mt: { color: C.onSurface, fontSize: 17, fontWeight: '800', marginBottom: 16 },
  el: { color: C.onSurfaceVariant, fontSize: 13, marginBottom: 12 },
  ei: { backgroundColor: C.surfaceContainerLow, borderWidth: 1.5, borderColor: C.inputBorder, borderRadius: 12, padding: 12, color: C.onSurface, fontSize: 15, fontWeight: '600' },
  ebs: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cb: { flex: 1, backgroundColor: C.surfaceContainer, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 8 },
  cbt: { color: C.onSurface, fontSize: 14, fontWeight: '600' },
  lo: { backgroundColor: C.errorContainer, borderWidth: 1.5, borderColor: C.error, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 8 },
  lot: { color: C.error, fontSize: 14, fontWeight: '600' },
  themeGrid: { flexDirection: 'row', gap: 10 },
  themeCard: { flex: 1, backgroundColor: C.surfaceContainerLow, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, padding: 12 },
  themeCardActive: { borderColor: C.primary, backgroundColor: C.activeTint },
  themeSwatchRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  themeSwatch: { flex: 1, height: 28, borderRadius: 8 },
  themeCardTitle: { color: C.onSurface, fontSize: 13, fontWeight: '800' },
  themeCardTitleActive: { color: C.primary },
  themeCardMeta: { color: C.outline, fontSize: 11, marginTop: 6, lineHeight: 16 },
});
