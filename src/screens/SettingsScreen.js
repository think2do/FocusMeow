import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Image, StyleSheet } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useGame } from '../../App';
import { maskEmail, maskPhone } from '../utils/helpers';
import { playFeedback } from '../utils/feedback';

export default function SettingsScreen() {
  const g = useGame();
  const { t, lang, setLang, profile, setProfile } = g;
  const [sec, setSec] = useState(null);
  const [fb, setFB] = useState('');
  const [sp, setSP] = useState(false);
  const [pe, setPE] = useState(null);
  const [ev, setEV] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const zh = lang === 'zh';

  const pickPhoto = () => {
    Alert.alert(
      zh ? '设置头像' : 'Set Avatar',
      zh ? '选择获取方式' : 'Choose method',
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: zh ? '📷 拍照' : '📷 Camera',
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
          text: zh ? '🖼 从相册选择' : '🖼 Gallery',
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
      <View style={s.rl}><Text style={{ fontSize: 20 }}>{icon}</Text><Text style={s.rla}>{label}</Text></View>
      {right}
    </TouchableOpacity>
  );

  const AvatarDisplay = ({ size = 56 }) => {
    if (isUri || isPhotoAvatar) {
      const uri = profile.avatar.startsWith('/') ? 'file://' + profile.avatar : profile.avatar;
      return (
        <View style={[s.av, { width: size, height: size, borderRadius: size / 2 }]}>
          <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        </View>
      );
    }
    return (
      <View style={[s.av, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ fontSize: size * 0.5 }}>{profile.avatar || '😺'}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100, paddingTop: 55 }}>
      <Text style={s.h}>{t('settingsTitle')}</Text>

      {/* Profile Card */}
      <TouchableOpacity style={s.pc} onPress={() => setSP(true)}>
        <TouchableOpacity onPress={pickPhoto} style={{ position: 'relative' }}>
          <AvatarDisplay size={56} />
          <View style={s.camBadge}><Text style={{ fontSize: 9 }}>📷</Text></View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={s.pn}>{profile.nickname}</Text><Text style={s.pu}>@{profile.username}</Text></View>
        <Text style={{ color: '#8C8480', fontSize: 16 }}>▶</Text>
      </TouchableOpacity>

      {/* Emoji avatars + photo upload button */}
      <View style={s.emr}>
        <Text style={s.eml}>{t('chooseAvatar')}</Text>
        {['😺','😸','😻','🐱','😼','🙀','😹','😽','🐈','👤'].map(a =>
          <TouchableOpacity key={a} style={[s.emb, !isUri && profile.avatar === a && s.emba]}
            onPress={() => { setProfile(p => ({ ...p, avatar: a, avatarType: 'emoji' })); playFeedback('tap'); }}>
            <Text style={{ fontSize: 16 }}>{a}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.emb, { backgroundColor: 'rgba(212,131,139,0.15)', borderColor: '#D06B6B' }]} onPress={pickPhoto}>
          <Text style={{ fontSize: 14 }}>📷</Text>
        </TouchableOpacity>
      </View>

      {/* Language */}
      <Row icon="🌐" label={t('langLabel')} right={
        <View style={s.lbs}>{[['zh','中文'],['en','EN']].map(([k, lb]) =>
          <TouchableOpacity key={k} style={[s.lb, lang === k && s.lba]} onPress={() => setLang(k)}>
            <Text style={[s.lbt, lang === k && { color: '#D06B6B' }]}>{lb}</Text>
          </TouchableOpacity>
        )}</View>
      } />

      {/* Feedback */}
      <Row icon="💬" label={t('feedbackLabel')} right={<Text style={s.arr}>{sec === 'fb' ? '▲' : '▼'}</Text>} onPress={() => setSec(sec === 'fb' ? null : 'fb')} />
      {sec === 'fb' && <View style={s.exp}>
        <TextInput style={s.ta} placeholder={t('feedbackPH')} placeholderTextColor="rgba(255,255,255,0.3)" value={fb} onChangeText={setFB} multiline numberOfLines={4} />
        <TouchableOpacity style={s.sbtn} onPress={() => { Alert.alert('', t('feedbackThanks')); setFB(''); setSec(null); }}><Text style={s.sbt}>{t('submit')}</Text></TouchableOpacity>
      </View>}

      <Row icon="📜" label={t('termsLabel')} right={<Text style={s.arr}>{sec === 'terms' ? '▲' : '▼'}</Text>} onPress={() => setSec(sec === 'terms' ? null : 'terms')} />
      {sec === 'terms' && <View style={s.exp}><Text style={s.lt}>{t('appName')} {t('termsLabel')}</Text><Text style={s.ld}>{t('termsDate')}</Text><Text style={s.lb2}>{t('termsBody')}</Text></View>}

      <Row icon="🔒" label={t('privacyLabel')} right={<Text style={s.arr}>{sec === 'priv' ? '▲' : '▼'}</Text>} onPress={() => setSec(sec === 'priv' ? null : 'priv')} />
      {sec === 'priv' && <View style={s.exp}><Text style={s.lt}>{t('appName')} {t('privacyLabel')}</Text><Text style={s.ld}>{t('termsDate')}</Text><Text style={s.lb2}>{t('privacyBody')}</Text></View>}

      <Row icon="📦" label={t('versionLabel')} right={<Text style={{ color: '#8C8480', fontSize: 13, fontWeight: '700' }}>v 1.3.0</Text>} />

      <View style={s.ai}><Text style={{ fontSize: 28 }}>🐱</Text><Text style={{ color: '#332E2C', fontSize: 13, fontWeight: '700', marginTop: 4 }}>{t('appName')}</Text><Text style={{ color: 'rgba(180,150,130,0.22)', fontSize: 10, marginTop: 4 }}>Made with ❤️</Text></View>

      {/* Profile Modal */}
      <Modal visible={sp} transparent animationType="fade"><View style={s.mb}><View style={s.mc}>
        <Text style={s.mt}>{t('profileTitle')}</Text>
        {!pe && <>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={pickPhoto} style={{ position: 'relative' }}>
              <AvatarDisplay size={72} />
              <View style={[s.camBadge, { width: 22, height: 22, bottom: 0, right: 0 }]}><Text style={{ fontSize: 11 }}>📷</Text></View>
            </TouchableOpacity>
            <Text style={{ color: '#8C8480', fontSize: 11, marginTop: 6 }}>{zh ? '点击更换头像' : 'Tap to change'}</Text>
          </View>
          <Row icon="👤" label={t('nickname')} right={<Text style={{ color: '#332E2C', fontSize: 13 }}>{profile.nickname}</Text>} onPress={() => { setPE('nick'); setEV({ v: profile.nickname }); }} />
          <Row icon="📧" label={t('email')} right={<Text style={s.dim}>{maskEmail(profile.email)}</Text>} onPress={() => { setPE('email'); setEV({}); }} />
          <Row icon="📱" label={t('phone')} right={<Text style={s.dim}>{profile.phone ? maskPhone(profile.phone) : t('notBound')}</Text>} />
          <Row icon="🔒" label={t('password')} right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.dim}>{showPwd ? profile.password : '••••••'}</Text>
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)}><Text style={{ fontSize: 14 }}>{showPwd ? '🙈' : '👁️'}</Text></TouchableOpacity>
            </View>
          } onPress={() => { setPE('pwd'); setEV({}); }} />
          <TouchableOpacity style={s.lo} onPress={() => { Alert.alert('', zh ? '已退出' : 'Logged out'); setSP(false); }}><Text style={s.lot}>{t('logout')}</Text></TouchableOpacity>
          <TouchableOpacity style={s.cb} onPress={() => { setSP(false); setPE(null); }}><Text style={s.cbt}>{t('close')}</Text></TouchableOpacity>
        </>}
        {pe === 'nick' && <><Text style={s.el}>{t('changeNick')}</Text>
          <TextInput style={s.ei} value={ev.v || ''} onChangeText={v => setEV({ v })} />
          <View style={s.ebs}><TouchableOpacity style={s.cb} onPress={() => setPE(null)}><Text style={s.cbt}>{t('cancel')}</Text></TouchableOpacity><TouchableOpacity style={s.sbtn} onPress={() => { setProfile(p => ({ ...p, nickname: ev.v })); setPE(null); Alert.alert('', t('saved')); }}><Text style={s.sbt}>{t('save')}</Text></TouchableOpacity></View>
        </>}
        {pe === 'email' && <><Text style={s.el}>{t('changeEmail')}</Text>
          <TextInput style={s.ei} placeholder={t('oldEmail')} placeholderTextColor="rgba(255,255,255,0.3)" />
          <TextInput style={[s.ei, { marginTop: 8 }]} placeholder={t('newEmail')} placeholderTextColor="rgba(255,255,255,0.3)" onChangeText={v => setEV({ v })} />
          <View style={s.ebs}><TouchableOpacity style={s.cb} onPress={() => setPE(null)}><Text style={s.cbt}>{t('cancel')}</Text></TouchableOpacity><TouchableOpacity style={s.sbtn} onPress={() => { if (ev.v) setProfile(p => ({ ...p, email: ev.v })); setPE(null); Alert.alert('', t('saved')); }}><Text style={s.sbt}>{t('confirm')}</Text></TouchableOpacity></View>
        </>}
        {pe === 'pwd' && <><Text style={s.el}>{t('changePwd')}</Text>
          <TextInput style={s.ei} placeholder={t('oldPwd')} placeholderTextColor="rgba(255,255,255,0.3)" secureTextEntry />
          <TextInput style={[s.ei, { marginTop: 8 }]} placeholder={t('newPwd')} placeholderTextColor="rgba(255,255,255,0.3)" secureTextEntry onChangeText={v => setEV({ v })} />
          <View style={s.ebs}><TouchableOpacity style={s.cb} onPress={() => setPE(null)}><Text style={s.cbt}>{t('cancel')}</Text></TouchableOpacity><TouchableOpacity style={s.sbtn} onPress={() => { if (ev.v) setProfile(p => ({ ...p, password: ev.v })); setPE(null); Alert.alert('', t('saved')); }}><Text style={s.sbt}>{t('confirm')}</Text></TouchableOpacity></View>
        </>}
      </View></View></Modal>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  h: { fontSize: 24, fontWeight: '900', color: '#D06B6B', marginBottom: 16 },
  pc: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(160,140,120,0.2)' },
  av: { backgroundColor: '#D06B6B', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  camBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#D06B6B', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FBF5F0' },
  pn: { color: '#332E2C', fontWeight: '700', fontSize: 16 }, pu: { color: '#8C8480', fontSize: 12 },
  emr: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16, alignItems: 'center' },
  eml: { color: '#8C8480', fontSize: 11, marginRight: 4, width: '100%', marginBottom: 4 },
  emb: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'rgba(160,140,120,0.2)', alignItems: 'center', justifyContent: 'center' },
  emba: { backgroundColor: 'rgba(212,131,139,0.18)', borderColor: '#D06B6B' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(160,140,120,0.2)' },
  rl: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rla: { color: '#332E2C', fontWeight: '600', fontSize: 14 },
  arr: { color: '#8C8480', fontSize: 14 },
  dim: { color: '#66615E', fontSize: 12 },
  lbs: { flexDirection: 'row', gap: 6 },
  lb: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'rgba(160,140,120,0.2)' },
  lba: { backgroundColor: 'rgba(212,131,139,0.18)', borderColor: '#D06B6B' },
  lbt: { color: '#66615E', fontSize: 12, fontWeight: '700' },
  exp: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: 16, marginTop: -12, marginBottom: 12, borderWidth: 1, borderColor: '#FFFFFF', borderTopWidth: 0 },
  ta: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'rgba(180,150,130,0.15)', borderRadius: 12, padding: 12, color: '#332E2C', fontSize: 14, textAlignVertical: 'top', minHeight: 80 },
  sbtn: { flex: 1, backgroundColor: '#D06B6B', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 10 },
  sbt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  lt: { color: '#332E2C', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  ld: { color: '#8C8480', fontSize: 11, marginBottom: 8 },
  lb2: { color: '#66615E', fontSize: 12, lineHeight: 20 },
  ai: { alignItems: 'center', paddingVertical: 20, opacity: 0.3 },
  mb: { flex: 1, backgroundColor: 'rgba(60,40,30,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  mc: { backgroundColor: '#FFF8F4', borderRadius: 22, padding: 24, width: '100%', maxWidth: 380 },
  mt: { color: '#332E2C', fontSize: 17, fontWeight: '800', marginBottom: 16 },
  el: { color: '#66615E', fontSize: 13, marginBottom: 12 },
  ei: { backgroundColor: 'rgba(180,150,130,0.08)', borderWidth: 1.5, borderColor: 'rgba(180,150,130,0.18)', borderRadius: 12, padding: 12, color: '#332E2C', fontSize: 15, fontWeight: '600' },
  ebs: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cb: { flex: 1, backgroundColor: 'rgba(180,150,130,0.15)', borderWidth: 1.5, borderColor: 'rgba(180,150,130,0.22)', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 8 },
  cbt: { color: '#332E2C', fontSize: 14, fontWeight: '600' },
  lo: { backgroundColor: 'rgba(212,100,106,0.12)', borderWidth: 1.5, borderColor: 'rgba(212,100,106,0.25)', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 8 },
  lot: { color: '#D4646A', fontSize: 14, fontWeight: '600' },
});
