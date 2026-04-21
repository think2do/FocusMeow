import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Alert, Animated, Dimensions, ActionSheetIOS, StyleSheet, Image, PanResponder } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import Voice from '@react-native-voice/voice';
import { useGame } from '../../App';
import { AppState } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { sendCompanionChat } from '../services/authApi';
import { useGuestAction as consumeGuestAction } from '../utils/guestLimits';
import CatAvatar from '../components/CatAvatar';
import { N } from '../utils/helpers';
import { buildActorId } from '../utils/identity';
import { getCatPersona } from '../data/catPersona';
import { C } from '../utils/theme';

const HISTORY_KEY = 'focusmeow-chat-history-v3';
const LEGACY_HISTORY_KEY = 'focusmeow-chat-history';
const LEGACY_V2_HISTORY_KEY = 'focusmeow-chat-history-v2';
const MAX_SAVED = 1;
const CHAT_SCHEMA_VERSION = 4;
const W = Dimensions.get('window').width;
const DRAWER_W = W * 0.7;

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
const pad2 = value => String(value).padStart(2, '0');
const localDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};
const trimText = (text, limit = 48) => {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > limit ? `${normalized.slice(0, limit)}...` : normalized;
};
const normalizeIndex = (value) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
};
const safeParseIndex = (raw) => {
  if (!raw) return [];
  try {
    return normalizeIndex(JSON.parse(raw));
  } catch {
    return [];
  }
};

export default function ChatScreen() {
  const g = useGame();
  const s = createStyles(C);
  const { user, clientId } = useAuth();
  const { lang, aliveCats, selCat, profile, companionMemory, focusHistory, recordChatMemory, archiveChatSummary, soulmateCatId } = g;
  const zh = lang === 'zh';
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [convId, setConvId] = useState('');
  const [chatCatId, setChatCatId] = useState(null);
  const [savedCats, setSavedCats] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [topic, setTopic] = useState('');
  const scrollRef = useRef(null);
  const voiceRef = useRef(false);
  const bar1 = useRef(new Animated.Value(8)).current;
  const bar2 = useRef(new Animated.Value(14)).current;
  const bar3 = useRef(new Animated.Value(8)).current;
  const prevCatRef = useRef(null);
  const storageReadyRef = useRef({ scope: '', promise: null });
  const msgsRef = useRef([]);
  const convIdRef = useRef("");
  const topicRef = useRef("");
  const aliveCatsRef = useRef(aliveCats);
  const langRef = useRef(lang);
  const companionMemoryRef = useRef(companionMemory);

  const leftX = useRef(new Animated.Value(-DRAWER_W)).current;
  const rightX = useRef(new Animated.Value(DRAWER_W)).current;
  const leftOpenRef = useRef(false);
  const rightOpenRef = useRef(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const openLeft = () => {
    leftOpenRef.current = true;
    setLeftOpen(true);
    Animated.spring(leftX, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
  };
  const closeLeft = () => {
    leftOpenRef.current = false;
    Animated.timing(leftX, { toValue: -DRAWER_W, duration: 220, useNativeDriver: true }).start(() => setLeftOpen(false));
  };
  const openRight = async () => {
    const idx = await loadIndex();
    setSavedCats(idx);
    rightOpenRef.current = true;
    setRightOpen(true);
    Animated.spring(rightX, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
  };
  const closeRight = () => {
    rightOpenRef.current = false;
    Animated.timing(rightX, { toValue: DRAWER_W, duration: 220, useNativeDriver: true }).start(() => setRightOpen(false));
  };

  // 左热区 PanResponder
  const leftPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !leftOpenRef.current,
    onMoveShouldSetPanResponder: (_, gs) => !leftOpenRef.current && gs.dx > 5 && Math.abs(gs.dy) < Math.abs(gs.dx),
    onPanResponderMove: (_, gs) => {
      const val = Math.min(0, -DRAWER_W + Math.max(0, gs.dx));
      leftX.setValue(val);
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dx > DRAWER_W * 0.35 || gs.vx > 0.5) openLeft();
      else closeLeft();
    },
  })).current;

  // 右热区 PanResponder
  const rightPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !rightOpenRef.current,
    onMoveShouldSetPanResponder: (_, gs) => !rightOpenRef.current && gs.dx < -5 && Math.abs(gs.dy) < Math.abs(gs.dx),
    onPanResponderMove: (_, gs) => {
      const val = Math.min(DRAWER_W, Math.max(0, DRAWER_W + gs.dx));
      rightX.setValue(val);
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dx < -DRAWER_W * 0.35 || gs.vx < -0.5) openRight();
      else closeRight();
    },
  })).current;

  const cat = aliveCats.find(c => c.id === (chatCatId || selCat)) || aliveCats[0];
  const catKey = cat?.id || 'cat-0';
  const catName = N(cat?.name, lang) || (zh ? '小橘' : 'Tabby');
  const breedId = cat?.isRare ? (cat?.rareType || 'orange') : (cat?.breedId || 'orange');
  const actorId = buildActorId(user, clientId, 'focusmeow_chat');
  const historyScope = user?.email ? `user:${user.email.trim().toLowerCase()}` : `device:${clientId || 'local'}`;
  const persona = getCatPersona(cat, lang);
  const catMemory = companionMemory?.catProfiles?.[catKey] || {};
  const todayKey = localDateKey();
  const isSoulmateCat = !!soulmateCatId && catKey === soulmateCatId;
  const recentFocus = (focusHistory || []).filter(item => item.catId === catKey).slice(-6);
  const todayFocus = (focusHistory || []).filter(item => item.date === todayKey && item.completed);
  const recentFocusMinutes = Math.max(0, Math.round(recentFocus.reduce((sum, item) => sum + (item.duration || 0), 0) / 60));
  const todayFocusMinutes = Math.max(0, Math.round(todayFocus.reduce((sum, item) => sum + (item.duration || 0), 0) / 60));
  const relationshipStage = catMemory.relationshipScore >= 12 ? 'close' : catMemory.relationshipScore >= 5 ? 'familiar' : 'new';

  useEffect(() => {
    aliveCatsRef.current = aliveCats;
  }, [aliveCats]);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    companionMemoryRef.current = companionMemory;
  }, [companionMemory]);

  useEffect(() => {
    msgsRef.current = msgs;
    convIdRef.current = convId;
    topicRef.current = topic;
  }, [msgs, convId, topic]);

  const getIndexStorageKey = useCallback(() => `${HISTORY_KEY}:${historyScope}:index`, [historyScope]);
  const getChatStorageKey = useCallback((cid) => `${HISTORY_KEY}:${historyScope}:cat:${cid}`, [historyScope]);
  const getChatStoragePrefix = useCallback(() => `${HISTORY_KEY}:${historyScope}:cat:`, [historyScope]);

  const buildArchivedIntro = useCallback((cid, fallbackTopic = '') => {
    const currentLang = langRef.current;
    const currentZh = currentLang === 'zh';
    const currentCats = aliveCatsRef.current || [];
    const nm = N(currentCats.find(c => c.id === cid)?.name, currentLang) || (currentZh ? '小橘' : 'Tabby');
    const archivedMemory = companionMemoryRef.current?.catProfiles?.[cid] || {};
    const memoryText = trimText(archivedMemory.archivedSummary || archivedMemory.lastShared || fallbackTopic || archivedMemory.lastTopic, 70);
    if (!memoryText) {
      return {
        id: Date.now(),
        from: 'cat',
        text: currentZh ? `喵~ 我是${nm}，想和你聊聊天！💕` : `Meow~ I'm ${nm}, let's chat! 💕`,
      };
    }
    const memoryTopic = trimText(archivedMemory.lastTopic || fallbackTopic, 16);
    return {
      id: Date.now(),
      from: 'cat',
      text: currentZh
        ? `喵~ 我还记得我们上次${memoryTopic ? `聊到「${memoryTopic}」` : '聊过的事'}：${memoryText} 这次还想继续吗？`
        : `Meow~ I still remember ${memoryTopic ? `we talked about "${memoryTopic}"` : 'our last chat'}: ${memoryText} Want to continue?`,
    };
  }, []);

  const buildArchiveSummary = useCallback((cid, data) => {
    const currentLang = langRef.current;
    const currentZh = currentLang === 'zh';
    const currentCats = aliveCatsRef.current || [];
    const nm = N(currentCats.find(c => c.id === cid)?.name, currentLang) || (currentZh ? '小猫' : 'kitty');
    const topicLabel = trimText(data?.topic, 16);
    const history = Array.isArray(data?.msgs) ? data.msgs : [];
    const lastUserText = trimText(history.filter(item => item?.from === 'user').slice(-1)[0]?.text, 26);
    const lastCatText = trimText(history.filter(item => item?.from === 'cat').slice(-1)[0]?.text, 28);
    if (currentZh) {
      if (topicLabel && lastUserText) return `上次你们聊到「${topicLabel}」，你提过“${lastUserText}”，${nm} 还记得。`;
      if (lastUserText) return `你上次和${nm}聊到“${lastUserText}”。`;
      if (lastCatText) return `${nm} 还记得上次它回应过你：“${lastCatText}”。`;
      if (topicLabel) return `你们上次聊到了「${topicLabel}」。`;
      return '';
    }
    if (topicLabel && lastUserText) return `Last time you talked about "${topicLabel}", and you mentioned "${lastUserText}". ${nm} still remembers.`;
    if (lastUserText) return `You last told ${nm} about "${lastUserText}".`;
    if (lastCatText) return `${nm} still remembers replying: "${lastCatText}".`;
    if (topicLabel) return `You last talked about "${topicLabel}".`;
    return '';
  }, []);

  const getCatStorageIdentity = useCallback((cid) => {
    const currentCats = aliveCatsRef.current || [];
    const currentCat = currentCats.find(item => item.id === cid);
    const identityKey = currentCat?.isRare
      ? (currentCat?.rareType || currentCat?.breedId || 'orange')
      : (currentCat?.breedId || 'orange');
    const identityPersona = getCatPersona(currentCat, langRef.current);

    return {
      catId: cid,
      identityKey,
      personaId: identityPersona?.id || identityKey,
      isRare: !!currentCat?.isRare,
    };
  }, []);

  const isValidChatPayload = useCallback((cid, parsed) => {
    if (!parsed || typeof parsed !== 'object') return false;
    if (parsed?.catId && parsed.catId !== cid) return false;

    const expected = getCatStorageIdentity(cid);
    if (!expected?.identityKey) return false;

    if (parsed?.schemaVersion !== CHAT_SCHEMA_VERSION) return false;
    if (parsed?.chatIdentity !== expected.identityKey) return false;
    if ((parsed?.personaId || '') !== expected.personaId) return false;

    return true;
  }, [getCatStorageIdentity]);

  const ensureChatStorageReady = useCallback(async () => {
    const storageScopeKey = `${historyScope}:soul:${soulmateCatId || 'none'}`;
    if (storageReadyRef.current.scope === storageScopeKey && storageReadyRef.current.promise) {
      return storageReadyRef.current.promise;
    }

    const run = (async () => {
      const indexKey = getIndexStorageKey();
      const chatPrefix = getChatStoragePrefix();
      const allKeys = await AsyncStorage.getAllKeys();
      const currentChatKeys = allKeys.filter(key => key.startsWith(chatPrefix));
      const legacyKeys = allKeys.filter((key) => {
        if (!key || key === indexKey || key.startsWith(chatPrefix)) return false;
        if (key === HISTORY_KEY || key === LEGACY_HISTORY_KEY) return true;
        if (key.startsWith(`${HISTORY_KEY}-`)) return true;
        if (key.startsWith(`${LEGACY_V2_HISTORY_KEY}-`)) return true;
        if (key.startsWith(`${LEGACY_HISTORY_KEY}-`)) return true;
        if (key.startsWith(`${LEGACY_HISTORY_KEY}:`) && (key.endsWith(':index') || key.includes(':cat:'))) return true;
        return false;
      });

      const currentPairs = currentChatKeys.length ? await AsyncStorage.multiGet(currentChatKeys) : [];
      const validEntries = [];
      const invalidCurrentKeys = [];

      currentPairs.forEach(([key, raw]) => {
        const cid = key.startsWith(chatPrefix) ? key.slice(chatPrefix.length) : '';
        if (!cid || !raw) {
          invalidCurrentKeys.push(key);
          return;
        }
        try {
          const parsed = JSON.parse(raw);
          if (!isValidChatPayload(cid, parsed)) {
            invalidCurrentKeys.push(key);
            return;
          }
          validEntries.push({
            cid,
            updatedAt: Number(parsed?.updatedAt || 0),
          });
        } catch {
          invalidCurrentKeys.push(key);
        }
      });

      const permanentEntries = soulmateCatId
        ? validEntries.filter(item => item.cid === soulmateCatId)
        : [];
      const storedIndex = safeParseIndex(await AsyncStorage.getItem(indexKey));
      const validIdSet = new Set(permanentEntries.map(item => item.cid));
      const keptIndex = storedIndex.filter(cid => validIdSet.has(cid));
      const appendedIndex = [...permanentEntries]
        .sort((a, b) => a.updatedAt - b.updatedAt)
        .map(item => item.cid)
        .filter(cid => !keptIndex.includes(cid));
      const nextIndex = [...keptIndex, ...appendedIndex].slice(-1);
      const keysToRemove = [...new Set([...legacyKeys, ...invalidCurrentKeys])];

      if (keysToRemove.length) {
        await AsyncStorage.multiRemove(keysToRemove);
      }

      const prevIndexJson = JSON.stringify(storedIndex);
      const nextIndexJson = JSON.stringify(nextIndex);
      if (prevIndexJson !== nextIndexJson) {
        await AsyncStorage.setItem(indexKey, nextIndexJson);
      }

    })().catch(() => {});

    storageReadyRef.current = { scope: storageScopeKey, promise: run };
    return run;
  }, [getChatStoragePrefix, getIndexStorageKey, historyScope, isValidChatPayload, soulmateCatId]);

  const loadIndex = useCallback(async () => {
    const indexKey = getIndexStorageKey();
    try {
      await ensureChatStorageReady();
      return safeParseIndex(await AsyncStorage.getItem(indexKey));
    } catch {
      return [];
    }
  }, [ensureChatStorageReady, getIndexStorageKey]);
  const saveIndex = useCallback(async (idx) => {
    try {
      const normalized = normalizeIndex(idx).slice(-MAX_SAVED);
      await AsyncStorage.setItem(getIndexStorageKey(), JSON.stringify(normalized));
    } catch {}
  }, [getIndexStorageKey]);
  const loadChatData = useCallback(async (cid) => {
    const currentKey = getChatStorageKey(cid);
    try {
      await ensureChatStorageReady();
      const current = await AsyncStorage.getItem(currentKey);
      if (!current) return null;
      const parsed = JSON.parse(current);
      if (isValidChatPayload(cid, parsed)) {
        if (cid === soulmateCatId) return parsed;
        if (parsed?.ephemeralDate === todayKey) return parsed;
      }
      await AsyncStorage.removeItem(currentKey);
      return null;
    } catch {
      return null;
    }
  }, [ensureChatStorageReady, getChatStorageKey, isValidChatPayload, soulmateCatId, todayKey]);
  const saveChatData = useCallback(async (cid, d) => {
    if (g.guestMode) return;
    try {
      const identity = getCatStorageIdentity(cid);
      const permanent = !!soulmateCatId && cid === soulmateCatId;
      const payload = {
        ...d,
        schemaVersion: CHAT_SCHEMA_VERSION,
        catId: cid,
        chatIdentity: identity.identityKey,
        personaId: identity.personaId,
        isRare: identity.isRare,
        memoryMode: permanent ? 'soulmate' : 'daily',
        ephemeralDate: permanent ? null : localDateKey(),
        updatedAt: Date.now(),
      };
      await AsyncStorage.setItem(getChatStorageKey(cid), JSON.stringify(payload));
    } catch {}
  }, [g.guestMode, getChatStorageKey, getCatStorageIdentity, soulmateCatId]);
  const deleteChatData = useCallback(async (cid) => {
    try {
      await AsyncStorage.multiRemove([
        getChatStorageKey(cid),
        `${HISTORY_KEY}-${cid}`,
        `${LEGACY_V2_HISTORY_KEY}-${cid}`,
        `${LEGACY_HISTORY_KEY}-${cid}`,
        `${LEGACY_HISTORY_KEY}:${historyScope}:cat:${cid}`,
      ]);
    } catch {}
  }, [getChatStorageKey, historyScope]);

  const loadChat = useCallback(async (cid) => {
    const data = await loadChatData(cid);
    if (data?.msgs?.length) {
      setMsgs(data.msgs || []);
      setConvId(data.convId || '');
      setTopic(data.topic || '');
      const idx = await loadIndex();
      setSavedCats(idx);
      return;
    }

    const archivedIntro = buildArchivedIntro(cid, data?.topic || '');
    setMsgs([archivedIntro]);
    setConvId('');
    setTopic(data?.topic || '');
    const idx = await loadIndex();
    setSavedCats(idx);
  }, [buildArchivedIntro, loadChatData, loadIndex]);

  const saveChatSession = useCallback(async (targetCatId, sessionMsgs, sessionConvId, sessionTopic) => {
    if (g.guestMode) return 'guest';
    const trimmedMsgs = (sessionMsgs || []).slice(-100);
    if (!targetCatId || trimmedMsgs.length <= 1) return 'skipped';
    const isPermanentChat = !!soulmateCatId && targetCatId === soulmateCatId;
    if (!isPermanentChat) {
      const idx = await loadIndex();
      const nextIdx = idx.filter(id => id !== targetCatId);
      if (nextIdx.length !== idx.length) await saveIndex(nextIdx);
      await saveChatData(targetCatId, { msgs: trimmedMsgs, convId: sessionConvId || '', topic: sessionTopic || '' });
      setSavedCats(nextIdx);
      return 'daily';
    }
    let idx = await loadIndex();
    let nextIdx = idx.filter(id => id !== targetCatId);
    const removedCatId = nextIdx.length >= 1 ? nextIdx[0] : null;

    if (removedCatId) {
      const removedData = await loadChatData(removedCatId);
      const removedSummary = buildArchiveSummary(removedCatId, removedData);
      const removedTopic = removedData?.topic || '';
      const removedCatName = N((aliveCatsRef.current || []).find(c => c.id === removedCatId)?.name, langRef.current) || '';
      if (removedSummary) {
        archiveChatSummary?.({
          catId: removedCatId,
          catName: removedCatName,
          summary: removedSummary,
          topic: removedTopic,
        });
      }
      await deleteChatData(removedCatId);
      nextIdx = nextIdx.slice(1);
    }

    nextIdx = [...nextIdx, targetCatId];
    await saveIndex(nextIdx);
    await saveChatData(targetCatId, { msgs: trimmedMsgs, convId: sessionConvId || '', topic: sessionTopic || '' });
    setSavedCats(nextIdx);
    return removedCatId ? 'archived' : 'saved';
  }, [archiveChatSummary, buildArchiveSummary, deleteChatData, g.guestMode, loadChatData, loadIndex, saveChatData, saveIndex, soulmateCatId]);

  const saveCurrentChat = useCallback(async (extraMsgs, extraConvId, extraTopic, targetCatId = catKey) => {
    const m = extraMsgs || msgs;
    const cv = extraConvId || convId;
    const tp = extraTopic || topic;
    return saveChatSession(targetCatId, m, cv, tp);
  }, [catKey, convId, msgs, saveChatSession, topic]);

  // Voice setup
  useEffect(() => {
    Voice.onSpeechResults = (e) => { if (e.value?.[0]) setInput(e.value[0]); };
    Voice.onSpeechEnd = () => { setIsListening(false); voiceRef.current = false; };
    Voice.onSpeechError = () => { setIsListening(false); voiceRef.current = false; };
    return () => { Voice.destroy().then(Voice.removeAllListeners); };
  }, []);

  const animateWave = () => {
    const wave = (anim, delay, min, max) => Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(anim, {toValue: max, duration: 300, useNativeDriver: false}), Animated.timing(anim, {toValue: min, duration: 300, useNativeDriver: false})]));
    Animated.parallel([wave(bar1, 0, 6, 18), wave(bar2, 150, 10, 22), wave(bar3, 300, 6, 18)]).start();
  };
  const stopAnimate = () => {
    bar1.stopAnimation(); bar2.stopAnimation(); bar3.stopAnimation();
    bar1.setValue(8); bar2.setValue(14); bar3.setValue(8);
  };
  const startVoice = async () => {
    if (voiceRef.current) return;
    try {
      voiceRef.current = true;
      setIsListening(true);
      setInput('');
      animateWave();
      await Voice.start('zh-CN');
    } catch {
      stopAnimate();
      setIsListening(false);
      voiceRef.current = false;
    }
  };
  const stopVoice = async () => {
    try { await Voice.stop(); } catch {} stopAnimate();
    setIsListening(false); voiceRef.current = false;
  };

  useEffect(() => {
    const prevKey = prevCatRef.current;
    if (prevKey && prevKey !== catKey && msgsRef.current.length > 1) {
      saveChatSession(prevKey, msgsRef.current, convIdRef.current, topicRef.current);
    }
    prevCatRef.current = catKey;
    if (g.guestMode) { setMsgs([]); setConvId(''); setTopic(''); return; }
    loadChat(catKey);
  }, [catKey, g.guestMode, loadChat, saveChatSession]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') saveCurrentChat();
    });
    return () => { saveCurrentChat(); sub.remove(); };
  }, [saveCurrentChat]);

  const maybeGenTopic = (allMsgs) => {
    if (topic) return topic;
    const userMsgs = allMsgs.filter(m => m.from === 'user');
    if (userMsgs.length >= 2) {
      const first2 = userMsgs.slice(0, 2).map(m => m.text).join(' ');
      return first2.length > 15 ? first2.slice(0, 15) + '...' : first2;
    }
    return '';
  };

  const switchCat = (newCatId) => { setChatCatId(newCatId); closeLeft(); closeRight(); };

  const handleLongPress = (msg) => {
    if (msg.from !== 'user') return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [zh ? '复制' : 'Copy', zh ? '撤回' : 'Recall', zh ? '取消' : 'Cancel'], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
        (idx) => {
          if (idx === 0) Clipboard.setString(msg.text);
          if (idx === 1) setMsgs(m => m.filter(x => x.id !== msg.id));
        }
      );
    }
  };

  const send = async () => {
    if (g.guestMode) { const ok = consumeGuestAction('chat'); if (!ok) { Alert.alert(zh ? '提示' : 'Limit', zh ? '游客每天只能发 5 条消息' : 'Guests: 5 messages/day'); return; } }
    if (!input.trim() || loading) return;
    const userText = input.trim();
    const userMsg = { id: Date.now(), from: 'user', text: userText };
    const updMsgs = [...msgs, userMsg];
    setMsgs(updMsgs); setInput(''); setLoading(true);
    try {
      const requestPayload = {
        inputs: {
          breed: breedId,
          name: catName,
          cat_id: catKey,
          is_rare: !!cat?.isRare,
          persona_id: persona.id,
          persona_archetype: persona.archetype,
          persona_tone: persona.tone,
          persona_style: persona.style,
          persona_focus_style: persona.focusStyle,
          persona_emotional_note: persona.emotionalNote,
          relationship_stage: relationshipStage,
          relationship_score: catMemory.relationshipScore || 0,
          last_mood: catMemory.lastMood || '',
          last_shared: catMemory.lastShared || '',
          last_reply: catMemory.lastReply || '',
          last_topic: catMemory.lastTopic || '',
          archived_summary: catMemory.archivedSummary || '',
          last_focus_task: catMemory.lastFocusTask || '',
          last_focus_result: catMemory.lastFocusResult || '',
          last_focus_at: catMemory.lastFocusAt || 0,
          chat_count: catMemory.chatCount || 0,
          recent_focus_minutes: recentFocusMinutes,
          today_focus_minutes: todayFocusMinutes,
          today_focus_count: todayFocus.length,
          preferred_task: companionMemory?.profile?.preferredTask || '',
          user_nickname: profile?.nickname || '',
          user_recent_mood: companionMemory?.profile?.lastMood || '',
          user_recent_shared: companionMemory?.profile?.lastShared || '',
          is_soulmate_cat: isSoulmateCat,
          memory_mode: isSoulmateCat ? 'long_term' : 'daily_reset',
          current_topic: topicRef.current || topic || '',
          app_scene: 'chat_companion',
        },
        query: userText,
        user: actorId,
        response_mode: 'blocking',
        conversation_id: convIdRef.current || convId || '',
      };
      let data = await sendCompanionChat(requestPayload);
      if (!data.answer) {
        data = await sendCompanionChat({
          ...requestPayload,
          conversation_id: '',
        });
      }
      if (data.answer) {
        const catMsg = { id: Date.now() + 1, from: 'cat', text: data.answer };
        const finalMsgs = [...updMsgs, catMsg];
        const newConvId = data.conversation_id || convIdRef.current || convId;
        const newTopic = maybeGenTopic(finalMsgs);
        setMsgs(finalMsgs); setConvId(newConvId); setTopic(newTopic); msgsRef.current = finalMsgs; convIdRef.current = newConvId; topicRef.current = newTopic;
        if (isSoulmateCat) {
          recordChatMemory?.({ catId: catKey, catName: cat?.name || catName, userText, catReply: data.answer });
        }
        await saveChatSession(catKey, finalMsgs, newConvId, newTopic);
      } else { setMsgs(m => [...m, { id: Date.now() + 1, from: 'cat', text: zh ? '喵...再说一次嘛~' : 'Meow... say again~' }]); }
    } catch { setMsgs(m => [...m, { id: Date.now() + 1, from: 'cat', text: zh ? '喵...网络不好～' : 'Meow... network~' }]); }
    setLoading(false);
  };

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={openLeft} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 4 }}>
            <CatAvatar breedId={cat?.breedId || 'orange'} level={cat?.level || 1} state="idle" size={36} isRare={cat?.isRare} rareType={cat?.rareType} rounded={18} displayMode="compact" />
            <View style={{ marginLeft: 10 }}>
              <View style={s.headerNameRow}>
                <Text style={s.headerName}>{catName}</Text>
                {isSoulmateCat ? <Text style={s.soulmateChatBadge}>{zh ? '灵魂' : 'Soul'}</Text> : null}
              </View>
              {topic ? <Text style={s.topicText} numberOfLines={1}>{topic}</Text> : <Text style={s.headerStatus}>{isSoulmateCat ? (zh ? '长期记忆已开启' : 'Long-term memory on') : (zh ? '今日聊天 · 明天重置' : 'Daily chat · resets tomorrow')}</Text>}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowRules(true)} style={[s.hdrBtn, { marginRight: 8 }]}><Text style={s.hdrBtnT}>?</Text></TouchableOpacity>
          <TouchableOpacity onPress={openRight} style={s.hdrBtn}><Text style={s.hdrBtnT}>📋</Text></TouchableOpacity>
        </View>

        {/* 消息区域 */}
        <View style={{ flex: 1 }}>
          <ScrollView style={s.msgArea} contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16 }}
            ref={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {msgs.map(msg => (
              <TouchableOpacity key={msg.id} activeOpacity={msg.from === 'user' ? 0.7 : 1}
                onLongPress={() => handleLongPress(msg)} delayLongPress={500}
                style={[s.bubble, msg.from === 'user' ? s.bubbleUser : s.bubbleCat]}>
                {msg.from === 'cat' && <View style={s.catIcon}><CatAvatar breedId={cat?.breedId || 'orange'} level={1} state="idle" size={52} isRare={cat?.isRare} rareType={cat?.rareType} rounded={8} displayMode="compact" /></View>}
                <View style={[s.msgBox, msg.from === 'user' ? s.msgUser : s.msgCat]}>
                  <Text style={[s.msgText, msg.from === 'user' && { color: '#fff' }]} selectable>{msg.text}</Text>
                </View>
                {msg.from === 'user' && (
                  <View style={{ marginLeft: 8, marginBottom: 2, width: 52, height: 52, borderRadius: 12, backgroundColor: C.avatarBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {profile && profile.avatarType === 'png' && AVATAR_KEYS.includes(profile.avatar)
                      ? <Image source={AVATAR_IMAGES[profile.avatar]} style={{ width: 52, height: 52, borderRadius: 12 }} />
                      : profile && profile.avatarType === 'photo' && profile.avatar
                      ? <Image source={{ uri: profile.avatar.startsWith('/') ? 'file://' + profile.avatar : profile.avatar }} style={{ width: 52, height: 52, borderRadius: 12 }} />
                      : <Text style={{ fontSize: 20 }}>{(profile && profile.avatar) || '😺'}</Text>}
                  </View>
                )}
              </TouchableOpacity>
            ))}
            {loading && (
              <View style={[s.bubble, s.bubbleCat]}>
                <View style={s.catIcon}><CatAvatar breedId={cat?.breedId || 'orange'} level={1} state="idle" size={52} isRare={cat?.isRare} rareType={cat?.rareType} rounded={8} displayMode="compact" /></View>
                <View style={[s.msgBox, s.msgCat, { paddingVertical: 10 }]}><ActivityIndicator size="small" color={C.primary} /></View>
              </View>
            )}
          </ScrollView>

          {/* 左热区：透明，覆盖左边缘，绑定左划手势 */}
          <Animated.View style={s.leftHotzone} {...leftPan.panHandlers} />

          {/* 右热区：透明，覆盖右边缘，绑定右划手势 */}
          <Animated.View style={s.rightHotzone} {...rightPan.panHandlers} />
        </View>

        {/* 输入栏 */}
        <View style={s.inputBar}>
          <TouchableOpacity onLongPress={startVoice} onPressOut={stopVoice} style={[s.voiceBtn, isListening && s.voiceBtnActive]} activeOpacity={0.7}><View style={{ alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 3, width: 22, height: 22 }}><Animated.View style={{ width: 3, height: bar1, borderRadius: 2, backgroundColor: isListening ? C.primary : C.outline }} /><Animated.View style={{ width: 3, height: bar2, borderRadius: 2, backgroundColor: isListening ? C.primary : C.outline }} /><Animated.View style={{ width: 3, height: bar3, borderRadius: 2, backgroundColor: isListening ? C.primary : C.outline }} /></View></TouchableOpacity>
          <TextInput style={[s.input, { maxHeight: 80 }]} value={input} onChangeText={setInput}
            placeholder={zh ? '和小猫说说话...' : 'Say something...'} placeholderTextColor={C.outline}
            returnKeyType="send" onSubmitEditing={send} editable={!loading}
            multiline blurOnSubmit textContentType="none" autoCorrect={false} />
          <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
            onPress={send} disabled={!input.trim() || loading}>
            <Text style={s.sendText}>{zh ? '发送' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 左抽屉：猫咪列表 */}
      {leftOpen && <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={closeLeft} />}
      <Animated.View style={[s.drawer, s.drawerLeft, { transform: [{ translateX: leftX }] }]}>
        <Text style={s.drawerTitle}>{zh ? '🐾 选择猫咪' : '🐾 Cats'}</Text>
        <Text style={s.drawerHint}>{zh ? '点击切换聊天对象' : 'Tap to switch'}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {aliveCats.map(c => (
            <TouchableOpacity key={c.id} style={[s.drawerItem, c.id === catKey && s.drawerItemActive]} onPress={() => switchCat(c.id)}>
              <CatAvatar breedId={c.breedId} level={c.level} state="idle" size={40} isRare={c.isRare} rareType={c.rareType} rounded={20} displayMode="compact" />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={s.drawerName}>{N(c.name, lang)}</Text>
                <Text style={s.drawerLv}>{c.id === soulmateCatId ? (zh ? '灵魂猫咪 · 长期记忆' : 'Soul Kitty · long memory') : `Lv.${c.level}`}</Text>
              </View>
              {c.id === catKey && <View style={s.activeDot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* 右抽屉：历史对话 */}
      {rightOpen && <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={closeRight} />}
      <Animated.View style={[s.drawer, s.drawerRight, { transform: [{ translateX: rightX }] }]}>
        <Text style={s.drawerTitle}>{zh ? '💬 历史对话' : '💬 History'}</Text>
        <Text style={s.drawerSub}>{zh ? '仅灵魂猫咪保留完整长期聊天' : 'Only Soul Kitty keeps full chat history'}</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {savedCats.length === 0
            ? <Text style={s.emptyHist}>{zh ? '暂无历史' : 'No history'}</Text>
            : [...savedCats].reverse().map(cid => {
                const c = aliveCats.find(x => x.id === cid);
                if (!c) return null;
                return (
                  <TouchableOpacity key={cid} style={[s.drawerItem, cid === catKey && s.drawerItemActive]} onPress={() => switchCat(cid)}>
                    <CatAvatar breedId={c.breedId} level={c.level} state="idle" size={40} isRare={c.isRare} rareType={c.rareType} rounded={20} displayMode="compact" />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={s.drawerName}>{N(c.name, lang)}</Text>
                      {cid === catKey && <Text style={s.activeTxt}>{zh ? '当前' : 'Active'}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })
          }
        </ScrollView>
      </Animated.View>

      {/* 使用说明 Modal */}
      <Modal visible={showRules} transparent animationType="fade">
        <TouchableOpacity style={s.mb} activeOpacity={1} onPress={() => setShowRules(false)}>
          <View style={s.mc} onStartShouldSetResponder={() => true}>
            <Text style={s.mt}>{zh ? '📋 谈心使用指南' : '📋 Chat Guide'}</Text>
            <View style={s.ruleSection}>
              <Text style={s.ruleH}>{zh ? '💬 对话功能' : '💬 Chat'}</Text>
              <Text style={s.ruleT}>{zh ? '• 点击发送或按回车键发消息\n• 长按自己的消息可撤回或复制' : '• Tap Send or press Enter\n• Long-press to recall/copy'}</Text>
            </View>
            <View style={s.ruleSection}>
              <Text style={s.ruleH}>{zh ? '🐾 切换猫咪' : '🐾 Switch Cat'}</Text>
              <Text style={s.ruleT}>{zh ? '• 从左侧边缘往右拖出猫咪列表\n• 点击任意猫咪切换对话' : '• Drag from left edge to open cat list\n• Tap any cat to switch'}</Text>
            </View>
            <View style={s.ruleSection}>
              <Text style={s.ruleH}>{zh ? '📋 历史记录' : '📋 History'}</Text>
              <Text style={s.ruleT}>{zh ? '• 从右侧边缘往左拖出灵魂猫咪历史\n• 只有灵魂猫咪完整保存聊天，其它猫咪第二天自动重置' : '• Drag from right edge for Soul Kitty history\n• Only Soul Kitty keeps full chat; other cats reset tomorrow'}</Text>
            </View>
            <TouchableOpacity style={s.cb} onPress={() => setShowRules(false)}><Text style={s.cbt}>{zh ? '知道了' : 'Got it'}</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const createStyles = (C) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 55, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surfaceContainerLowest },
  headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerName: { color: C.onSurface, fontSize: 15, fontWeight: '700' },
  soulmateChatBadge: { color: C.primary, fontSize: 9, fontWeight: '900', backgroundColor: C.primaryFixed, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  headerStatus: { color: C.success, fontSize: 10, marginTop: 1 },
  topicText: { color: C.outline, fontSize: 10, marginTop: 1, maxWidth: 150 },
  hdrBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  hdrBtnT: { color: C.onSurfaceVariant, fontSize: 14, fontWeight: '800' },
  msgArea: { flex: 1 },
  bubble: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  bubbleUser: { justifyContent: 'flex-end' },
  bubbleCat: { justifyContent: 'flex-start' },
  catIcon: { marginRight: 8, marginBottom: 2, borderRadius: 10, overflow: "hidden" },
  msgBox: { maxWidth: "72%", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 18 },
  msgUser: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  msgCat: { backgroundColor: C.surfaceContainerLowest, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.inputBorder, paddingHorizontal: 10, paddingVertical: 7 },
  msgText: { color: C.onSurface, fontSize: 15, lineHeight: 20 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 8, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surfaceContainerLowest },
  input: { flex: 1, backgroundColor: C.surfaceContainerLow, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: C.onSurface, fontSize: 14, marginRight: 10, borderWidth: 1.5, borderColor: C.inputBorder },
  sendBtn: { backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, marginBottom: 2 },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  voiceBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surfaceContainerLow, alignItems: "center", justifyContent: "center", marginRight: 8, borderWidth: 1.5, borderColor: C.border },
  voiceBtnActive: { backgroundColor: C.activeTint, borderColor: C.primary },
  leftHotzone: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 30, zIndex: 5 },
  rightHotzone: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 30, zIndex: 5 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(40,30,20,0.4)', zIndex: 10 },
  drawer: { position: 'absolute', top: 0, bottom: 0, width: DRAWER_W, backgroundColor: C.surface, zIndex: 20, paddingTop: 70, paddingHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 15, shadowOffset: { width: 0, height: 0 } },
  drawerLeft: { left: 0, borderRightWidth: 1, borderRightColor: C.border },
  drawerRight: { right: 0, borderLeftWidth: 1, borderLeftColor: C.border },
  drawerTitle: { color: C.onSurface, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  drawerHint: { color: C.outline, fontSize: 11, marginBottom: 14 },
  drawerSub: { color: C.outline, fontSize: 12, marginBottom: 14 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, marginBottom: 6, backgroundColor: C.surfaceContainerLowest, borderWidth: 1, borderColor: C.border },
  drawerItemActive: { borderColor: C.primary, backgroundColor: C.activeTint },
  drawerName: { color: C.onSurface, fontWeight: '600', fontSize: 14 },
  drawerLv: { color: C.outline, fontSize: 10, marginTop: 1 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  activeTxt: { color: C.primary, fontSize: 10, fontWeight: '700', marginTop: 1 },
  emptyHist: { color: C.outline, fontSize: 13, paddingVertical: 20, paddingLeft: 4, textAlign: 'left' },
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
