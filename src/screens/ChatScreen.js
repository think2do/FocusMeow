import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Alert, Animated, Dimensions, ActionSheetIOS, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import { useGame } from '../../App';
import CatAvatar from '../components/CatAvatar';
import { N } from '../utils/helpers';

const DIFY_URL = 'https://api.dify.ai/v1/chat-messages';
const DIFY_KEY = 'YOUR_DIFY_API_KEY';
const HISTORY_KEY = 'focusmeow-chat-history';
const MAX_SAVED = 5;
const W = Dimensions.get('window').width;
const DRAWER_W = W * 0.7;

export default function ChatScreen() {
  const g = useGame();
  const { t, lang, aliveCats, selCat } = g;
  const zh = lang === 'zh';
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState('');
  const [chatCatId, setChatCatId] = useState(null);
  const [savedCats, setSavedCats] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [replaceForCat, setReplaceForCat] = useState(null);
  const [topic, setTopic] = useState('');
  const scrollRef = useRef(null);
  const prevCatRef = useRef(null);

  // Drawer animations
  const leftX = useRef(new Animated.Value(-DRAWER_W)).current;
  const rightX = useRef(new Animated.Value(W)).current;
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const openLeft = () => { setLeftOpen(true); Animated.spring(leftX, { toValue: 0, useNativeDriver: true, friction: 8 }).start(); };
  const closeLeft = () => { Animated.timing(leftX, { toValue: -DRAWER_W, duration: 250, useNativeDriver: true }).start(() => setLeftOpen(false)); };
  const openRight = async () => { const idx = await loadIndex(); setSavedCats(idx); setRightOpen(true); Animated.spring(rightX, { toValue: W - DRAWER_W, useNativeDriver: true, friction: 8 }).start(); };
  const closeRight = () => { Animated.timing(rightX, { toValue: W, duration: 250, useNativeDriver: true }).start(() => setRightOpen(false)); };

  const cat = aliveCats.find(c => c.id === (chatCatId || selCat)) || aliveCats[0];
  const catKey = cat?.id || 'cat-0';
  const catName = N(cat?.name, lang) || (zh ? '小橘' : 'Tabby');
  const breedId = cat?.isRare ? (cat?.rareType || 'orange') : (cat?.breedId || 'orange');

  // Storage helpers
  const loadIndex = useCallback(async () => { try { const r = await AsyncStorage.getItem(HISTORY_KEY); return r ? JSON.parse(r) : []; } catch { return []; } }, []);
  const saveIndex = useCallback(async (idx) => { try { await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(idx)); } catch {} }, []);
  const loadChatData = useCallback(async (cid) => { try { const r = await AsyncStorage.getItem(HISTORY_KEY + '-' + cid); return r ? JSON.parse(r) : null; } catch { return null; } }, []);
  const saveChatData = useCallback(async (cid, d) => { try { await AsyncStorage.setItem(HISTORY_KEY + '-' + cid, JSON.stringify(d)); } catch {} }, []);
  const deleteChatData = useCallback(async (cid) => { try { await AsyncStorage.removeItem(HISTORY_KEY + '-' + cid); } catch {} }, []);

  const loadChat = useCallback(async (cid) => {
    const data = await loadChatData(cid);
    if (data) { setMsgs(data.msgs || []); setConvId(data.convId || ''); setTopic(data.topic || ''); }
    else {
      const nm = N(aliveCats.find(c => c.id === cid)?.name, lang) || catName;
      setMsgs([{ id: Date.now(), from: 'cat', text: zh ? `喵~ 我是${nm}，想和你聊聊天！💕` : `Meow~ I'm ${nm}, let's chat! 💕` }]);
      setConvId(''); setTopic('');
    }
    const idx = await loadIndex(); setSavedCats(idx);
  }, [aliveCats, lang, zh, catName]);

  const saveCurrentChat = useCallback(async (extraMsgs, extraConvId, extraTopic) => {
    const m = extraMsgs || msgs; const cv = extraConvId || convId; const tp = extraTopic || topic;
    if (!m || m.length <= 1) return;
    const idx = await loadIndex();
    if (idx.includes(catKey)) { await saveChatData(catKey, { msgs: m.slice(-100), convId: cv, topic: tp }); return 'saved'; }
    if (idx.length >= MAX_SAVED) return 'full';
    await saveIndex([...idx, catKey]); await saveChatData(catKey, { msgs: m.slice(-100), convId: cv, topic: tp }); setSavedCats([...idx, catKey]); return 'saved';
  }, [msgs, convId, topic, catKey]);

  useEffect(() => { loadChat(catKey); }, [catKey]);
  useEffect(() => {
    if (prevCatRef.current && prevCatRef.current !== catKey) handleAutoSave();
    prevCatRef.current = catKey;
  }, [catKey]);

  const handleAutoSave = async () => {
    if (!msgs || msgs.length <= 1) return;
    const result = await saveCurrentChat();
    if (result === 'full') {
      Alert.alert(zh ? '💾 聊天记录已满' : '💾 History Full', zh ? `最多${MAX_SAVED}只，是否替换？` : `Max ${MAX_SAVED}. Replace?`,
        [{ text: zh ? '否' : 'No', style: 'cancel' }, { text: zh ? '是' : 'Yes', onPress: () => { setReplaceForCat(prevCatRef.current); setShowReplace(true); } }]);
    }
  };

  const doReplace = async (oldCid) => {
    const idx = await loadIndex();
    const newIdx = [...idx.filter(id => id !== oldCid), replaceForCat];
    await deleteChatData(oldCid); await saveIndex(newIdx);
    await saveChatData(replaceForCat, { msgs: msgs.slice(-100), convId, topic });
    setSavedCats(newIdx); setShowReplace(false); setReplaceForCat(null);
  };

  // Auto-generate topic after 2 rounds (4 messages)
  const maybeGenTopic = (allMsgs) => {
    if (topic) return topic;
    const userMsgs = allMsgs.filter(m => m.from === 'user');
    if (userMsgs.length >= 2) {
      const first2 = userMsgs.slice(0, 2).map(m => m.text).join(' ');
      const t2 = first2.length > 15 ? first2.slice(0, 15) + '...' : first2;
      return t2;
    }
    return '';
  };

  const switchCat = (newCatId) => { setChatCatId(newCatId); closeLeft(); closeRight(); };

  // Long press on user message
  const handleLongPress = (msg) => {
    if (msg.from !== 'user') return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [zh ? '复制' : 'Copy', zh ? '撤回' : 'Recall', zh ? '取消' : 'Cancel'], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
        (idx) => {
          if (idx === 0) {
            Clipboard.setString(msg.text);
          }
          if (idx === 1) setMsgs(m => m.filter(x => x.id !== msg.id));
        }
      );
    } else {
      Alert.alert('', '', [
        { text: zh ? '复制' : 'Copy', onPress: () => {} },
        { text: zh ? '撤回' : 'Recall', onPress: () => setMsgs(m => m.filter(x => x.id !== msg.id)), style: 'destructive' },
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    const userMsg = { id: Date.now(), from: 'user', text: userText };
    const updMsgs = [...msgs, userMsg];
    setMsgs(updMsgs); setInput(''); setLoading(true);
    try {
      const resp = await fetch(DIFY_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${DIFY_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: { breed: breedId, name: catName }, query: userText, user: 'focusmeow-user', response_mode: 'blocking', conversation_id: convId }),
      });
      const data = await resp.json();
      if (data.answer) {
        const catMsg = { id: Date.now() + 1, from: 'cat', text: data.answer };
        const finalMsgs = [...updMsgs, catMsg];
        const newConvId = data.conversation_id || convId;
        const newTopic = maybeGenTopic(finalMsgs);
        setMsgs(finalMsgs); setConvId(newConvId); setTopic(newTopic);
        const idx = await loadIndex();
        if (idx.includes(catKey)) await saveChatData(catKey, { msgs: finalMsgs.slice(-100), convId: newConvId, topic: newTopic });
      } else { setMsgs(m => [...m, { id: Date.now() + 1, from: 'cat', text: zh ? '喵...再说一次嘛~' : 'Meow... say again~' }]); }
    } catch { setMsgs(m => [...m, { id: Date.now() + 1, from: 'cat', text: zh ? '喵...网络不好～' : 'Meow... network~' }]); }
    setLoading(false);
  };

  const newChat = async () => {
    await saveCurrentChat();
    setConvId(''); setTopic('');
    setMsgs([{ id: Date.now(), from: 'cat', text: zh ? `喵~ 新聊天开始！` : `Meow~ Fresh chat!` }]);
  };

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={openLeft} style={s.hdrBtn}><Text style={s.hdrBtnT}>☰</Text></TouchableOpacity>
          <TouchableOpacity onPress={openLeft} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
            <CatAvatar breedId={cat?.breedId || 'orange'} level={cat?.level || 1} state="idle" size={36} isRare={cat?.isRare} rareType={cat?.rareType} rounded={18} />
            <View style={{ marginLeft: 10 }}>
              <Text style={s.headerName}>{catName}</Text>
              {topic ? <Text style={s.topicText} numberOfLines={1}>{topic}</Text> : <Text style={s.headerStatus}>{zh ? '在线' : 'Online'}</Text>}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowRules(true)} style={[s.hdrBtn, { marginRight: 8 }]}><Text style={s.hdrBtnT}>?</Text></TouchableOpacity>
          <TouchableOpacity onPress={openRight} style={s.hdrBtn}><Text style={s.hdrBtnT}>📋</Text></TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView style={s.msgArea} contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16 }}
          ref={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {msgs.map(msg => (
            <TouchableOpacity key={msg.id} activeOpacity={msg.from === 'user' ? 0.7 : 1}
              onLongPress={() => handleLongPress(msg)} delayLongPress={500}
              style={[s.bubble, msg.from === 'user' ? s.bubbleUser : s.bubbleCat]}>
              {msg.from === 'cat' && <View style={s.catIcon}><CatAvatar breedId={cat?.breedId || 'orange'} level={1} state="idle" size={32} isRare={cat?.isRare} rareType={cat?.rareType} rounded={16} /></View>}
              <View style={[s.msgBox, msg.from === 'user' ? s.msgUser : s.msgCat]}>
                <Text style={[s.msgText, msg.from === 'user' && { color: '#fff' }]} selectable>{msg.text}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {loading && <View style={[s.bubble, s.bubbleCat]}><View style={s.catIcon}><CatAvatar breedId={cat?.breedId || 'orange'} level={1} state="idle" size={32} isRare={cat?.isRare} rareType={cat?.rareType} rounded={16} /></View><View style={[s.msgBox, s.msgCat, { paddingVertical: 14 }]}><ActivityIndicator size="small" color="#D06B6B" /></View></View>}
        </ScrollView>

        {/* Input */}
        <View style={s.inputBar}>
          <TextInput style={[s.input, { maxHeight: 80 }]} value={input} onChangeText={setInput}
            placeholder={zh ? '和小猫说说话...' : 'Say something...'} placeholderTextColor="#8C8480"
            returnKeyType="send" onSubmitEditing={send} editable={!loading}
            multiline blurOnSubmit textContentType="none" autoCorrect={false} />
          <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
            onPress={send} disabled={!input.trim() || loading}>
            <Text style={s.sendText}>{zh ? '发送' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Left Drawer: Cat List */}
      {leftOpen && <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={closeLeft} />}
      <Animated.View style={[s.drawer, s.drawerLeft, { transform: [{ translateX: leftX }] }]}>
        <Text style={s.drawerTitle}>{zh ? '🐾 选择猫咪' : '🐾 Cats'}</Text>
        <ScrollView>
          {aliveCats.map(c => (
            <TouchableOpacity key={c.id} style={[s.drawerItem, c.id === catKey && s.drawerItemActive]} onPress={() => switchCat(c.id)}>
              <CatAvatar breedId={c.breedId} level={c.level} state="idle" size={40} isRare={c.isRare} rareType={c.rareType} rounded={20} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={s.drawerName}>{N(c.name, lang)}</Text>
                <Text style={s.drawerLv}>Lv.{c.level}</Text>
              </View>
              {c.id === catKey && <View style={s.activeDot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Right Drawer: History */}
      {rightOpen && <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={closeRight} />}
      <Animated.View style={[s.drawer, s.drawerRight, { transform: [{ translateX: rightX }] }]}>
        <Text style={s.drawerTitle}>{zh ? '💬 历史对话' : '💬 History'}</Text>
        <Text style={s.drawerSub}>{savedCats.length}/{MAX_SAVED} {zh ? '已保存' : 'saved'}</Text>
        <ScrollView>
          {savedCats.length === 0 && <Text style={s.emptyHist}>{zh ? '暂无历史' : 'No history'}</Text>}
          {savedCats.map(cid => {
            const c = aliveCats.find(x => x.id === cid);
            if (!c) return null;
            return (
              <TouchableOpacity key={cid} style={[s.drawerItem, cid === catKey && s.drawerItemActive]} onPress={() => switchCat(cid)}>
                <CatAvatar breedId={c.breedId} level={c.level} state="idle" size={40} isRare={c.isRare} rareType={c.rareType} rounded={20} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={s.drawerName}>{N(c.name, lang)}</Text>
                  {cid === catKey && <Text style={s.activeTxt}>{zh ? '当前' : 'Active'}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={s.newChatBtn} onPress={() => { closeRight(); newChat(); }}>
          <Text style={s.newChatText}>{zh ? '+ 新对话' : '+ New Chat'}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Rules Modal */}
      <Modal visible={showRules} transparent animationType="fade">
        <TouchableOpacity style={s.mb} activeOpacity={1} onPress={() => setShowRules(false)}>
          <View style={s.mc} onStartShouldSetResponder={() => true}>
            <Text style={s.mt}>{zh ? '📋 谈心使用指南' : '📋 Chat Guide'}</Text>
            <View style={s.ruleSection}>
              <Text style={s.ruleH}>{zh ? '💬 对话功能' : '💬 Chat'}</Text>
              <Text style={s.ruleT}>{zh ? '• 点击发送或按回车键发消息\n• 长按自己的消息可撤回或复制\n• 聊天 2 轮后自动生成对话主题' : '• Tap Send or press Enter\n• Long-press your message to recall/copy\n• Topic auto-generated after 2 rounds'}</Text>
            </View>
            <View style={s.ruleSection}>
              <Text style={s.ruleH}>{zh ? '🐾 切换猫咪' : '🐾 Switch Cat'}</Text>
              <Text style={s.ruleT}>{zh ? '• 从左侧边缘右滑打开猫咪列表\n• 点击任意猫咪开始新对话\n• 每只猫有独立的性格和记忆' : '• Swipe right from left edge for cat list\n• Tap any cat to start chatting\n• Each cat has unique personality'}</Text>
            </View>
            <View style={s.ruleSection}>
              <Text style={s.ruleH}>{zh ? '📋 历史记录' : '📋 History'}</Text>
              <Text style={s.ruleT}>{zh ? '• 从右侧边缘左滑查看历史\n• 最多保存 5 只猫的对话\n• 第 6 只需替换已有记录' : '• Swipe left from right edge for history\n• Max 5 cat chats saved\n• 6th requires replacing one'}</Text>
            </View>
            <TouchableOpacity style={s.cb} onPress={() => setShowRules(false)}><Text style={s.cbt}>{zh ? '知道了' : 'Got it'}</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Replace Modal */}
      <Modal visible={showReplace} transparent animationType="fade">
        <TouchableOpacity style={s.mb} activeOpacity={1} onPress={() => setShowReplace(false)}>
          <View style={s.mc} onStartShouldSetResponder={() => true}>
            <Text style={s.mt}>{zh ? '🔄 选择替换' : '🔄 Replace'}</Text>
            <Text style={s.ms}>{zh ? '被替换的聊天将被清除' : 'Replaced chat will be deleted'}</Text>
            {savedCats.map(cid => { const c = aliveCats.find(x => x.id === cid); if (!c) return null;
              return (<TouchableOpacity key={cid} style={s.drawerItem} onPress={() => doReplace(cid)}>
                <CatAvatar breedId={c.breedId} level={c.level} state="idle" size={36} isRare={c.isRare} rareType={c.rareType} rounded={18} />
                <Text style={[s.drawerName, { marginLeft: 10 }]}>{N(c.name, lang)}</Text>
              </TouchableOpacity>);
            })}
            <TouchableOpacity style={s.cb} onPress={() => setShowReplace(false)}><Text style={s.cbt}>{zh ? '取消' : 'Cancel'}</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FBF5F0' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 55, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(160,140,120,0.2)', backgroundColor: '#FFFFFF' },
  headerName: { color: '#332E2C', fontSize: 15, fontWeight: '700' },
  headerStatus: { color: '#5A9E6F', fontSize: 10, marginTop: 1 },
  topicText: { color: '#8C8480', fontSize: 10, marginTop: 1, maxWidth: 150 },
  hdrBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0EAE4', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(160,140,120,0.2)' },
  hdrBtnT: { color: '#66615E', fontSize: 14, fontWeight: '800' },
  msgArea: { flex: 1 },
  bubble: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  bubbleUser: { justifyContent: 'flex-end' },
  bubbleCat: { justifyContent: 'flex-start' },
  catIcon: { marginRight: 8, marginBottom: 2 },
  msgBox: { maxWidth: '72%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  msgUser: { backgroundColor: '#D06B6B', borderBottomRightRadius: 4 },
  msgCat: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(160,140,120,0.15)' },
  msgText: { color: '#332E2C', fontSize: 14, lineHeight: 22 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: 30, borderTopWidth: 1, borderTopColor: 'rgba(160,140,120,0.2)', backgroundColor: '#FFFFFF' },
  input: { flex: 1, backgroundColor: '#F5F0EB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#332E2C', fontSize: 14, marginRight: 10, borderWidth: 1.5, borderColor: 'rgba(160,140,120,0.25)' },
  sendBtn: { backgroundColor: '#D06B6B', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, marginBottom: 2 },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  // Drawers
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(40,30,20,0.4)', zIndex: 10 },
  drawer: { position: 'absolute', top: 0, bottom: 0, width: DRAWER_W, backgroundColor: '#FFF8F4', zIndex: 20, paddingTop: 60, paddingHorizontal: 16, borderColor: 'rgba(160,140,120,0.15)', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, shadowOffset: { width: 0, height: 0 } },
  drawerLeft: { left: 0, borderRightWidth: 1 },
  drawerRight: { right: 0, borderLeftWidth: 1 },
  drawerTitle: { color: '#332E2C', fontSize: 18, fontWeight: '800', marginBottom: 6 },
  drawerSub: { color: '#8C8480', fontSize: 11, marginBottom: 14 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, marginBottom: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(160,140,120,0.12)' },
  drawerItemActive: { borderColor: '#D06B6B', backgroundColor: 'rgba(208,107,107,0.06)' },
  drawerName: { color: '#332E2C', fontWeight: '600', fontSize: 14 },
  drawerLv: { color: '#8C8480', fontSize: 10, marginTop: 1 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D06B6B' },
  activeTxt: { color: '#D06B6B', fontSize: 10, fontWeight: '700', marginTop: 1 },
  emptyHist: { color: '#8C8480', textAlign: 'center', paddingVertical: 30 },
  newChatBtn: { backgroundColor: '#D06B6B', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 12, marginBottom: 30 },
  newChatText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  // Modals
  mb: { flex: 1, backgroundColor: 'rgba(40,30,20,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  mc: { backgroundColor: '#FFF8F4', borderRadius: 22, padding: 24, width: '100%', maxWidth: 380 },
  mt: { color: '#332E2C', fontSize: 17, fontWeight: '800', marginBottom: 12 },
  ms: { color: '#66615E', fontSize: 12, marginBottom: 14 },
  cb: { backgroundColor: '#F0EAE4', borderWidth: 1.5, borderColor: 'rgba(160,140,120,0.2)', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 12 },
  cbt: { color: '#332E2C', fontSize: 14, fontWeight: '600' },
  ruleSection: { marginBottom: 16 },
  ruleH: { color: '#332E2C', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  ruleT: { color: '#66615E', fontSize: 13, lineHeight: 22 },
});
