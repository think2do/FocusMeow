import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { STARTER, BREEDS, RARES } from '../data/gameData';
import { lvUp, rndNormal, rndRare, rareProb, N } from '../utils/helpers';
import { DEFAULT_AUDIO_PREFS, setAudioPreferences, syncAmbientPlayback } from '../utils/audio';

const KEY = 'focusmeow-v7';
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const SESSION_PERSIST_INTERVAL_SECONDS = 15;
const SESSION_PERSIST_EAGER_SECONDS = 5;
const MAX_CHAT_MEMORY = 36;
const MAX_FOCUS_MEMORY = 60;
const MAX_INTERACTION_MEMORY = 48;
const RESCUE_REQUIRED_SESSIONS = 2;
const RESCUE_MIN_SECONDS = 30 * 60;
const FOCUS_GRACE_EXIT_SECONDS = 5;
const DEFAULT_PROFILE = {
  nickname: '猫咪爱好者',
  username: 'cat_lover',
  avatar: '😺',
  email: 'user@example.com',
  phone: '',
  password: '123456',
};
const EMPTY_PROFILE = {
  lastMood: 'neutral',
  lastShared: '',
  lastChatAt: 0,
  lastInteractionType: '',
  lastInteractionAt: 0,
  lastFocusTask: '',
  lastFocusResult: '',
  lastFocusAt: 0,
  preferredTask: '',
  completedSessions: 0,
  interruptedSessions: 0,
  taskCounts: {},
};
const EMPTY_CAT_PROFILE = {
  catName: '',
  lastMood: 'neutral',
  lastShared: '',
  lastReply: '',
  lastTopic: '',
  lastChatAt: 0,
  lastInteractionType: '',
  lastInteractionAt: 0,
  lastFocusTask: '',
  lastFocusResult: '',
  lastFocusAt: 0,
  relationshipScore: 0,
  chatCount: 0,
  archivedSummary: '',
  archivedAt: 0,
};
const EMPTY_MEMORY = { chats: [], focusMoments: [], interactions: [], profile: EMPTY_PROFILE, catProfiles: {} };

const logStateWarning = (scope, error) => {
  console.warn(`[useGameState] ${scope} failed`, error?.message || error);
};
const sv = async d => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(d));
  } catch (error) {
    logStateWarning('persist', error);
  }
};
const ld = async () => {
  try {
    const r = await AsyncStorage.getItem(KEY);
    return r ? JSON.parse(r) : null;
  } catch (error) {
    logStateWarning('load', error);
    return null;
  }
};
const pad2 = value => String(value).padStart(2, '0');
const localDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};
const getRemainingSeconds = (startedAt, totalSeconds, fallbackSeconds = 0) => {
  const total = Math.max(0, Number(totalSeconds) || 0);
  if (!startedAt || !total) return Math.max(0, Number(fallbackSeconds) || 0);
  const elapsed = Math.max(0, Math.floor((Date.now() - Number(startedAt)) / 1000));
  return Math.max(0, total - elapsed);
};
const parseLocalDateTime = (dateKey, hour = 0) => {
  if (typeof dateKey !== 'string') return 0;
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return 0;
  return new Date(year, month - 1, day, Number(hour) || 0, 0, 0, 0).getTime();
};
const normalizeInterruptMap = (savedMap, cats = [], legacyInterrupts = 0) => {
  const allowedIds = new Set((cats || []).map(cat => cat.id));
  if (savedMap && typeof savedMap === 'object' && !Array.isArray(savedMap)) {
    return Object.fromEntries(
      Object.entries(savedMap)
        .filter(([catId, count]) => allowedIds.has(catId) && Number(count) > 0)
        .map(([catId, count]) => [catId, Math.min(2, Math.max(0, Number(count) || 0))])
    );
  }
  if (legacyInterrupts > 0 && cats.length === 1) {
    return { [cats[0].id]: Math.min(2, Math.max(0, Number(legacyInterrupts) || 0)) };
  }
  return {};
};
const withProfileDefaults = (profile) => ({
  ...EMPTY_PROFILE,
  ...(profile || {}),
  taskCounts: profile?.taskCounts && typeof profile.taskCounts === 'object' ? profile.taskCounts : {},
});
const withCatProfileDefaults = (profile) => ({
  ...EMPTY_CAT_PROFILE,
  ...(profile || {}),
});
const normalizeCatProfiles = (catProfiles) => {
  if (!catProfiles || typeof catProfiles !== 'object' || Array.isArray(catProfiles)) return {};
  return Object.fromEntries(
    Object.entries(catProfiles).map(([catId, profile]) => [catId, withCatProfileDefaults(profile)])
  );
};
const getPreferredTask = (taskCounts) => (
  Object.entries(taskCounts || {})
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })[0]?.[0] || ''
);

const trimText = (text, limit = 26) => {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > limit ? `${normalized.slice(0, limit)}...` : normalized;
};

const inferMood = (text) => {
  const content = String(text || '').toLowerCase();
  if (!content) return 'neutral';
  if (/焦虑|紧张|压力|崩溃|烦|难过|委屈|低落|心慌|stress|anxious|overwhelmed|burnout|sad/.test(content)) return 'stress';
  if (/困|累|疲惫|没精神|想睡|tired|sleepy|exhausted|drained/.test(content)) return 'tired';
  if (/拖延|分心|专注不了|静不下|走神|procrast|distract|can't focus|cant focus/.test(content)) return 'distracted';
  if (/开心|高兴|顺利|满意|放松|喜欢|自豪|happy|great|excited|proud|good/.test(content)) return 'happy';
  return 'neutral';
};

const moodLabel = (mood, lang) => {
  const zhMap = {
    stress: '有点焦虑',
    tired: '有点累',
    distracted: '容易分心',
    happy: '心情不错',
    neutral: '想和我说说话',
  };
  const enMap = {
    stress: 'a little stressed',
    tired: 'a bit tired',
    distracted: 'a little distracted',
    happy: 'in a good mood',
    neutral: 'like talking',
  };
  return (lang === 'zh' ? zhMap : enMap)[mood] || (lang === 'zh' ? zhMap.neutral : enMap.neutral);
};

const asTimestamp = (entry) => {
  if (!entry) return 0;
  if (typeof entry.ts === 'number') return entry.ts;
  if (typeof entry.ts === 'string') return Date.parse(entry.ts) || 0;
  if (entry.date) {
    return parseLocalDateTime(entry.date, entry.hour);
  }
  return 0;
};

const withMemoryDefaults = (memory) => ({
  chats: Array.isArray(memory?.chats) ? memory.chats : [],
  focusMoments: Array.isArray(memory?.focusMoments) ? memory.focusMoments : [],
  interactions: Array.isArray(memory?.interactions) ? memory.interactions : [],
  profile: withProfileDefaults(memory?.profile),
  catProfiles: normalizeCatProfiles(memory?.catProfiles),
});
const getTimeSlot = (value = Date.now()) => {
  const hour = new Date(value).getHours();
  if (hour < 11) return 'morning';
  if (hour < 14) return 'noon';
  if (hour < 18) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'night';
};
const getRoutineHour = (items) => {
  const bucket = {};
  (items || []).forEach(item => {
    const hour = Number(item?.hour);
    if (Number.isFinite(hour) && hour >= 0 && hour <= 23) {
      bucket[hour] = (bucket[hour] || 0) + 1;
    }
  });
  const top = Object.entries(bucket).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return Math.abs(Number(a[0]) - 18) - Math.abs(Number(b[0]) - 18);
  })[0];
  if (!top || top[1] < 2) return null;
  return Number(top[0]);
};
const isNearHour = (baseHour, targetHour, diff = 1) => {
  if (!Number.isFinite(baseHour) || !Number.isFinite(targetHour)) return false;
  return Math.min(Math.abs(baseHour - targetHour), 24 - Math.abs(baseHour - targetHour)) <= diff;
};
const hashSeed = (value = '') => (
  Array.from(String(value)).reduce((sum, ch, index) => (sum + ch.charCodeAt(0) * (index + 1)) % 10007, 0)
);
const pickVariant = (items, seed, fallback = '') => (
  Array.isArray(items) && items.length ? items[Math.abs(seed) % items.length] : fallback
);

const getCatIdentityKey = (cat) => {
  if (!cat) return '';
  return cat.isRare ? `rare:${cat.rareType || cat.breedId}` : `normal:${cat.breedId}`;
};

const withCatStateDefaults = (cat) => {
  const runaway = !!cat?.runaway || cat?.alive === false;
  return {
    ...cat,
    alive: !runaway,
    runaway,
    runawayAt: runaway ? (cat?.runawayAt || Date.now()) : null,
    rescueQuest: runaway && cat?.rescueQuest
      ? {
          active: !!cat.rescueQuest.active,
          progress: Math.min(RESCUE_REQUIRED_SESSIONS, Math.max(0, Number(cat.rescueQuest.progress) || 0)),
          required: RESCUE_REQUIRED_SESSIONS,
          minSeconds: RESCUE_MIN_SECONDS,
        }
      : null,
    focusTime: cat?.focusTime || 0,
  };
};

const dedupeCatsByBreed = (items = []) => {
  const byKey = new Map();
  items.filter(Boolean).forEach(item => {
    const cat = withCatStateDefaults(item);
    const key = getCatIdentityKey(cat);
    if (!key) return;
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, cat);
      return;
    }
    const currentScore = (current.alive ? 1000000 : 0) + (current.level || 1) * 1000 + (current.xp || 0) + Math.floor((current.focusTime || 0) / 60);
    const nextScore = (cat.alive ? 1000000 : 0) + (cat.level || 1) * 1000 + (cat.xp || 0) + Math.floor((cat.focusTime || 0) / 60);
    byKey.set(key, {
      ...(nextScore > currentScore ? cat : current),
      focusTime: Math.max(current.focusTime || 0, cat.focusTime || 0),
    });
  });
  return Array.from(byKey.values());
};

const pickNormalCat = (ownedKeys) => {
  const available = BREEDS.map(item => item.id).filter(id => !ownedKeys.has(`normal:${id}`));
  if (!available.length) return null;
  for (let i = 0; i < 30; i += 1) {
    const cat = rndNormal();
    if (available.includes(cat.breedId)) return cat;
  }
  return { ...rndNormal(), breedId: available[Math.floor(Math.random() * available.length)] };
};

const pickRareCat = (ownedKeys) => {
  const available = RARES.map(item => item.id).filter(id => !ownedKeys.has(`rare:${id}`));
  if (!available.length) return null;
  for (let i = 0; i < 30; i += 1) {
    const cat = rndRare();
    if (available.includes(cat.rareType)) return cat;
  }
  const rareType = available[Math.floor(Math.random() * available.length)];
  const fallback = rndRare();
  return { ...fallback, rareType, breed1: rareType, breed2: rareType };
};

const uniqueByText = (items) => {
  const seen = new Set();
  return items.filter(item => {
    const key = `${item?.kind || ''}-${item?.text || ''}`;
    if (!item?.text || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function useGameState() {
  const [cats, setCats] = useState([{ ...STARTER }]);
  const [completions, setComp] = useState(0);
  const [selCat, setSel] = useState(null);
  const [focusMin, setFM] = useState(25);
  const [timeLeft, setTL] = useState(0);
  const [totalTime, setTT] = useState(0);
  const [interruptMap, setInterruptMap] = useState({});
  const [currentFocusTask, setCurrentFocusTask] = useState('');
  const [sessionStartedAt, setSessionStartedAt] = useState(null);
  const [fState, setFS] = useState('idle');
  const [result, setRes] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState({ totalFocus: 0, totalComplete: 0 });
  const [accTime, setAT] = useState(0);
  const [accCount, setAC] = useState(0);
  const [collection, setColl] = useState({ normal: [], rare: [] });
  const [themeId, setTheme] = useState('default');
  const [lang, setLang] = useState('zh');
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [focusHistory, setFH] = useState([]);
  const [cat0DeathTime, setCat0Death] = useState(null);
  const [companionMemory, setCompanionMemory] = useState(EMPTY_MEMORY);
  const [audioPrefs, setAudioPrefs] = useState(DEFAULT_AUDIO_PREFS);
  const [soulmateCatId, setSoulmateCatIdState] = useState(null);
  const [soulmateSetDate, setSoulmateSetDate] = useState('');
  const timerRef = useRef(null);
  const persistTimeoutRef = useRef(null);
  const snapshotRef = useRef(null);
  const startTimeRef = useRef(null);
  const focusTaskRef = useRef('');
  const interrupts = selCat ? (interruptMap[selCat] || 0) : 0;

  useEffect(() => { (async () => {
    const d = await ld();
    if (d) {
      // Migrate removed breeds: british/exotic → sphynx, golden → devon, tuxedo → persian
      // Migrate rare: couple → couple (keep), twins → couple
      const migratedCats = (d.cats || []).map(c => {
        let bid = c.breedId;
        if (bid === 'british' || bid === 'exotic') bid = 'sphynx';
        if (bid === 'golden') bid = 'devon';
        if (bid === 'tuxedo') bid = 'persian';
        let rt = c.rareType;
        if (rt === 'twins') { rt = 'couple'; bid = 'couple'; }
        if (rt === 'couple' && bid !== 'couple') bid = 'couple';
        if (rt === 'rainbow' && bid !== 'rainbow') bid = 'rainbow';
        if (rt === 'black' && bid !== 'black') bid = 'black';
        return { ...c, breedId: bid, rareType: rt, focusTime: c.focusTime || 0 };
      });
      const lc = dedupeCatsByBreed(migratedCats);
      const safeCats = lc.length > 0 ? lc : [{ ...STARTER }];
      const aliveLoadedCats = safeCats.filter(cat => cat.alive && !cat.runaway);
      setCats(safeCats);
      setComp(d.completions || 0);
      setStats(d.stats || { totalFocus: 0, totalComplete: 0 });
      setInterruptMap(normalizeInterruptMap(d.interruptMap, aliveLoadedCats, d.interrupts));
      setSel(aliveLoadedCats.some(cat => cat.id === d.selCat) ? d.selCat : (aliveLoadedCats[0]?.id || null));
      setFM(d.focusMin || 25);
      const restoredTotalTime = d.totalTime || 0;
      const restoredTimeLeft = getRemainingSeconds(d.sessionStartedAt, restoredTotalTime, d.timeLeft || 0);
      setTT(restoredTotalTime);
      setTL(restoredTimeLeft);
      setCurrentFocusTask(d.currentFocusTask || '');
      setSessionStartedAt(d.sessionStartedAt || null);
      if (d.fState === 'running' && aliveLoadedCats.some(cat => cat.id === d.selCat)) {
        setFS('running');
        startTimeRef.current = d.sessionStartedAt ? new Date(d.sessionStartedAt) : new Date();
        focusTaskRef.current = d.currentFocusTask || '';
      }
      setAT(d.accTime || 0);
      setAC(d.accCount || 0);
      let coll = d.collection || { normal: ['orange'], rare: [] };
      coll.normal = [...new Set((coll.normal || []).map(k => {
        if (k === 'british' || k === 'exotic') return 'sphynx';
        if (k === 'golden') return 'devon';
        if (k === 'tuxedo') return 'persian';
        return k;
      }))];
      coll.rare = [...new Set((coll.rare || []).map(k => k === 'twins' ? 'couple' : k))];
      safeCats.forEach(cat => {
        if (cat.isRare && cat.rareType && !coll.rare.includes(cat.rareType)) coll.rare.push(cat.rareType);
        if (!cat.isRare && cat.breedId && !coll.normal.includes(cat.breedId)) coll.normal.push(cat.breedId);
      });
      setColl(coll);
      setTheme(d.themeId || 'default');
      if (d.lang) setLang(d.lang);
      if (d.profile) setProfile(d.profile);
      if (d.focusHistory) setFH(d.focusHistory);
      if (d.companionMemory) setCompanionMemory(withMemoryDefaults(d.companionMemory));
      if (d.audioPrefs) setAudioPrefs({ ...DEFAULT_AUDIO_PREFS, ...d.audioPrefs });
      setSoulmateCatIdState(safeCats.some(cat => cat.id === d.soulmateCatId) ? d.soulmateCatId : null);
      setSoulmateSetDate(d.soulmateSetDate || '');
      setCat0Death(null);
    } else {
      setCats([{ ...STARTER }]);
      setColl({ normal: ['orange'], rare: [] });
    }
    setLoaded(true);
  })(); }, []);

  useEffect(() => {
    setInterruptMap(prev => {
      const aliveIds = new Set(cats.filter(cat => cat.alive && !cat.runaway).map(cat => cat.id));
      const next = Object.fromEntries(Object.entries(prev).filter(([catId, count]) => aliveIds.has(catId) && count > 0));
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length === nextKeys.length && prevKeys.every(key => prev[key] === next[key])) {
        return prev;
      }
      return next;
    });
  }, [cats]);

  useEffect(() => {
    if (!soulmateCatId) return;
    const exists = cats.some(cat => cat.id === soulmateCatId);
    if (!exists) setSoulmateCatIdState(null);
  }, [cats, soulmateCatId]);

  const setSoulmateCatId = useCallback((catId) => {
    const today = localDateKey();
    const requestedId = catId || null;
    if (
      requestedId
      && soulmateSetDate === today
      && soulmateCatId
      && soulmateCatId !== requestedId
    ) {
      return { ok: false, reason: 'daily_limit' };
    }
    const nextId = catId && cats.some(cat => cat.id === catId && cat.alive && !cat.runaway)
      ? catId
      : null;
    setSoulmateCatIdState(nextId);
    if (nextId) setSoulmateSetDate(today);
    return { ok: true, soulmateCatId: nextId };
  }, [cats, soulmateCatId, soulmateSetDate]);

  const buildSnapshot = useCallback(() => ({
      cats,
      completions,
      stats,
      interrupts,
      interruptMap,
      selCat,
      focusMin,
      timeLeft,
      totalTime,
      currentFocusTask,
      sessionStartedAt,
      fState,
      accTime,
      accCount,
      collection,
      themeId,
      lang,
      profile,
      focusHistory,
      cat0DeathTime,
      companionMemory,
      audioPrefs,
      soulmateCatId,
      soulmateSetDate,
    }), [cats, completions, stats, interrupts, interruptMap, selCat, focusMin, timeLeft, totalTime, currentFocusTask, sessionStartedAt, fState, accTime, accCount, collection, themeId, lang, profile, focusHistory, cat0DeathTime, companionMemory, audioPrefs, soulmateCatId, soulmateSetDate]);

  useEffect(() => {
    snapshotRef.current = buildSnapshot();
  }, [buildSnapshot]);

  const persistNow = useCallback(async () => {
    if (!snapshotRef.current) return;
    await sv(snapshotRef.current);
  }, []);

  const schedulePersist = useCallback((delay = 200) => {
    clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = setTimeout(() => {
      persistNow();
    }, delay);
  }, [persistNow]);

  useEffect(() => {
    if (!loaded) return;
    schedulePersist(200);
  }, [loaded, cats, completions, stats, interrupts, interruptMap, selCat, focusMin, totalTime, currentFocusTask, sessionStartedAt, fState, accTime, accCount, collection, themeId, lang, profile, focusHistory, cat0DeathTime, companionMemory, audioPrefs, soulmateCatId, soulmateSetDate, schedulePersist]);

  useEffect(() => {
    setAudioPreferences(audioPrefs);
    syncAmbientPlayback(audioPrefs);
  }, [audioPrefs]);

  useEffect(() => {
    if (!loaded || fState !== 'running') return;
    const shouldPersistTick = (
      timeLeft === totalTime
      || timeLeft <= SESSION_PERSIST_EAGER_SECONDS
      || timeLeft % SESSION_PERSIST_INTERVAL_SECONDS === 0
    );
    if (shouldPersistTick) {
      schedulePersist(timeLeft <= SESSION_PERSIST_EAGER_SECONDS ? 0 : 120);
    }
  }, [loaded, fState, timeLeft, totalTime, schedulePersist]);

  useEffect(() => {
    if (!loaded) return undefined;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') {
        clearTimeout(persistTimeoutRef.current);
        persistNow();
      }
    });
    return () => {
      clearTimeout(persistTimeoutRef.current);
      persistNow();
      sub.remove();
    };
  }, [loaded, persistNow]);

  const syncRunningTimer = useCallback(() => {
    if (fState !== 'running' || !sessionStartedAt || totalTime <= 0) return;
    const nextTimeLeft = getRemainingSeconds(sessionStartedAt, totalTime, 0);
    setTL(current => (current === nextTimeLeft ? current : nextTimeLeft));
  }, [fState, sessionStartedAt, totalTime]);

  useEffect(() => {
    if (fState !== 'running' || totalTime <= 0 || !sessionStartedAt) return undefined;
    syncRunningTimer();
    timerRef.current = setInterval(syncRunningTimer, 1000);
    return () => clearInterval(timerRef.current);
  }, [fState, sessionStartedAt, syncRunningTimer, totalTime]);

  const updateCompanionMemory = useCallback((updater) => {
    setCompanionMemory(prev => {
      const normalized = withMemoryDefaults(prev);
      const next = updater(normalized) || normalized;
      return {
        ...normalized,
        ...next,
        profile: withProfileDefaults(next.profile || normalized.profile),
        catProfiles: normalizeCatProfiles(next.catProfiles || normalized.catProfiles),
      };
    });
  }, []);

  const recordCatInteraction = useCallback(({ catId, type }) => {
    if (!catId || !type) return;
    const ts = Date.now();
    updateCompanionMemory(prev => {
      const catProfile = withCatProfileDefaults(prev.catProfiles?.[catId]);
      return ({
        interactions: [...prev.interactions, {
          id: `it-${ts}-${Math.random().toString(36).slice(2, 6)}`,
          catId,
          type,
          ts,
        }].slice(-MAX_INTERACTION_MEMORY),
        profile: {
          ...prev.profile,
          lastInteractionType: type,
          lastInteractionAt: ts,
        },
        catProfiles: {
          ...prev.catProfiles,
          [catId]: {
            ...catProfile,
            lastInteractionType: type,
            lastInteractionAt: ts,
            relationshipScore: catProfile.relationshipScore + 1,
          },
        },
      });
    });
  }, [updateCompanionMemory]);

  const recordChatMemory = useCallback(({ catId, catName, userText, catReply }) => {
    const cleanUserText = trimText(userText, 80);
    if (!catId || !cleanUserText) return;
    const ts = Date.now();
    const mood = inferMood(userText);
    const summary = trimText(userText, 22);
    updateCompanionMemory(prev => {
      const catProfile = withCatProfileDefaults(prev.catProfiles?.[catId]);
      return ({
        chats: [...prev.chats, {
          id: `chat-${ts}-${Math.random().toString(36).slice(2, 6)}`,
          catId,
          catName,
          userText: cleanUserText,
          catReply: trimText(catReply, 110),
          summary,
          mood,
          ts,
        }].slice(-MAX_CHAT_MEMORY),
        profile: {
          ...prev.profile,
          lastMood: mood,
          lastShared: summary,
          lastChatAt: ts,
        },
        catProfiles: {
          ...prev.catProfiles,
          [catId]: {
            ...catProfile,
            catName: catName || catProfile.catName,
            lastMood: mood,
            lastShared: summary,
            lastReply: trimText(catReply, 80),
            lastChatAt: ts,
            chatCount: catProfile.chatCount + 1,
            relationshipScore: catProfile.relationshipScore + 2,
          },
        },
      });
    });
  }, [updateCompanionMemory]);

  const archiveChatSummary = useCallback(({ catId, catName, summary, topic }) => {
    const cleanSummary = trimText(summary, 120);
    if (!catId || !cleanSummary) return;
    const ts = Date.now();
    updateCompanionMemory(prev => {
      const catProfile = withCatProfileDefaults(prev.catProfiles?.[catId]);
      return ({
        catProfiles: {
          ...prev.catProfiles,
          [catId]: {
            ...catProfile,
            catName: catName || catProfile.catName,
            lastTopic: topic || catProfile.lastTopic,
            archivedSummary: cleanSummary,
            archivedAt: ts,
          },
        },
      });
    });
  }, [updateCompanionMemory]);

  const recordFocusMoment = useCallback((item) => {
    const ts = item?.ts || Date.now();
    updateCompanionMemory(prev => {
      const nextTaskCounts = { ...prev.profile.taskCounts };
      const catId = item?.catId;
      const catProfile = withCatProfileDefaults(prev.catProfiles?.[catId]);
      if (item?.completed && item?.task) {
        nextTaskCounts[item.task] = (nextTaskCounts[item.task] || 0) + 1;
      }
      return {
        focusMoments: [...prev.focusMoments, item].slice(-MAX_FOCUS_MEMORY),
        profile: {
          ...prev.profile,
          lastFocusTask: item?.task || prev.profile.lastFocusTask,
          lastFocusResult: item?.result || '',
          lastFocusAt: ts,
          completedSessions: prev.profile.completedSessions + (item?.completed ? 1 : 0),
          interruptedSessions: prev.profile.interruptedSessions + (item?.completed ? 0 : 1),
          taskCounts: nextTaskCounts,
          preferredTask: getPreferredTask(nextTaskCounts) || prev.profile.preferredTask,
        },
        catProfiles: catId ? {
          ...prev.catProfiles,
          [catId]: {
            ...catProfile,
            catName: item?.catName || catProfile.catName,
            lastFocusTask: item?.task || catProfile.lastFocusTask,
            lastFocusResult: item?.result || catProfile.lastFocusResult,
            lastFocusAt: ts,
            relationshipScore: catProfile.relationshipScore + (item?.completed ? 2 : 1),
          },
        } : prev.catProfiles,
      };
    });
  }, [updateCompanionMemory]);

  const requestCatRescue = useCallback((catId) => {
    if (!catId) return;
    setCats(prev => prev.map(cat => {
      if (cat.id !== catId || !cat.runaway) return cat;
      return {
        ...cat,
        alive: false,
        runaway: true,
        runawayAt: cat.runawayAt || Date.now(),
        rescueQuest: {
          active: true,
          progress: Math.min(RESCUE_REQUIRED_SESSIONS, Math.max(0, Number(cat.rescueQuest?.progress) || 0)),
          required: RESCUE_REQUIRED_SESSIONS,
          minSeconds: RESCUE_MIN_SECONDS,
        },
      };
    }));
  }, []);

  const startFocus = (taskLabel = '', durationMinutes = focusMin) => {
    const nextTask = String(taskLabel || '').trim();
    const startedAt = Date.now();
    const nextMinutes = Math.min(120, Math.max(1, Number(durationMinutes) || focusMin || 25));
    const nextSeconds = nextMinutes * 60;
    focusTaskRef.current = nextTask;
    setCurrentFocusTask(nextTask);
    setFM(nextMinutes);
    setTT(nextSeconds);
    setTL(nextSeconds);
    setFS('running');
    setSessionStartedAt(startedAt);
    startTimeRef.current = new Date(startedAt);
  };

  const pauseFocusForSystemInterruption = useCallback((pausedMs = 0) => {
    const safePausedMs = Math.max(0, Math.floor(Number(pausedMs) || 0));
    if (fState !== 'running' || !sessionStartedAt || totalTime <= 0 || safePausedMs <= 0) {
      return null;
    }
    const nextStartedAt = Number(sessionStartedAt) + safePausedMs;
    const nextTimeLeft = getRemainingSeconds(nextStartedAt, totalTime, timeLeft);
    setSessionStartedAt(nextStartedAt);
    setTL(nextTimeLeft);
    startTimeRef.current = new Date(nextStartedAt);
    schedulePersist(0);
    return { startedAt: nextStartedAt, timeLeft: nextTimeLeft };
  }, [fState, schedulePersist, sessionStartedAt, timeLeft, totalTime]);

  const addHistory = useCallback((completed, duration) => {
    const now = new Date();
    const currentCat = cats.find(c => c.id === selCat);
    const record = {
      date: localDateKey(now),
      hour: startTimeRef.current ? startTimeRef.current.getHours() : now.getHours(),
      duration,
      planned: totalTime,
      completed,
      interrupted: !completed,
      task: focusTaskRef.current || '',
      catId: selCat,
      catName: currentCat?.name || null,
      ts: now.getTime(),
    };
    setFH(h => [...h.slice(-200), record]);
  }, [cats, selCat, totalTime]);

  const handleInterrupt = () => {
    clearInterval(timerRef.current);
    const elapsedSeconds = Math.max(
      0,
      totalTime - getRemainingSeconds(sessionStartedAt, totalTime, timeLeft),
    );
    if (elapsedSeconds < FOCUS_GRACE_EXIT_SECONDS) {
      setFS('idle');
      setTT(0);
      setTL(0);
      focusTaskRef.current = '';
      startTimeRef.current = null;
      setCurrentFocusTask('');
      setSessionStartedAt(null);
      setRes(null);
      return {
        graceExit: true,
        elapsedSeconds,
      };
    }
    setFS('idle');
    addHistory(false, totalTime - timeLeft);
    const currentCat = cats.find(c => c.id === selCat);
    const ni = (selCat ? interruptMap[selCat] || 0 : 0) + 1;
    recordFocusMoment({
      id: `focus-${Date.now()}`,
      catId: selCat,
      catName: currentCat?.name || null,
      task: focusTaskRef.current || '',
      planned: totalTime,
      duration: totalTime - timeLeft,
      completed: false,
      result: ni >= 2 ? 'runaway' : 'hungry',
      ts: Date.now(),
    });
    if (ni >= 2) {
      setInterruptMap(prev => {
        if (!selCat || !(selCat in prev)) return prev;
        const next = { ...prev };
        delete next[selCat];
        return next;
      });
      const runawayAt = Date.now();
      const nextCats = cats.map(c => c.id === selCat ? {
        ...c,
        alive: false,
        runaway: true,
        runawayAt,
        rescueQuest: null,
      } : c);
      setCats(nextCats);
      const nextSelected = nextCats.find(c => c.alive && !c.runaway)?.id || null;
      setSel(nextSelected);
      setRes({ type: 'dead', catId: selCat, cat: currentCat || null });
    } else {
      setInterruptMap(prev => ({ ...prev, [selCat]: ni }));
      setRes({ type: 'hungry', catId: selCat, cat: currentCat || null, interrupts: ni });
    }
    focusTaskRef.current = '';
    setCurrentFocusTask('');
    setSessionStartedAt(null);
    return {
      graceExit: false,
      elapsedSeconds,
    };
  };

  const handleFocusDistraction = useCallback((options = {}) => {
    if (fState !== 'running' || !selCat) {
      return {
        ended: false,
        runaway: false,
        resultType: null,
        interrupts: selCat ? (interruptMap[selCat] || 0) : 0,
      };
    }

    const currentCat = cats.find(c => c.id === selCat);
    const nextInterrupts = (interruptMap[selCat] || 0) + 1;
    const shouldEndSession = !!options.forceFail || nextInterrupts >= 2;

    if (!shouldEndSession) {
      setInterruptMap(prev => ({ ...prev, [selCat]: nextInterrupts }));
      schedulePersist(0);
      return {
        ended: false,
        runaway: false,
        resultType: null,
        interrupts: nextInterrupts,
      };
    }

    clearInterval(timerRef.current);
    setFS('idle');
    addHistory(false, totalTime - timeLeft);

    const becomesRunaway = nextInterrupts >= 2;
    recordFocusMoment({
      id: `focus-${Date.now()}`,
      catId: selCat,
      catName: currentCat?.name || null,
      task: focusTaskRef.current || '',
      planned: totalTime,
      duration: totalTime - timeLeft,
      completed: false,
      result: becomesRunaway ? 'runaway' : 'hungry',
      ts: Date.now(),
    });

    if (becomesRunaway) {
      setInterruptMap(prev => {
        if (!selCat || !(selCat in prev)) return prev;
        const next = { ...prev };
        delete next[selCat];
        return next;
      });
      const runawayAt = Date.now();
      const nextCats = cats.map(c => c.id === selCat ? {
        ...c,
        alive: false,
        runaway: true,
        runawayAt,
        rescueQuest: null,
      } : c);
      setCats(nextCats);
      setSel(nextCats.find(c => c.alive && !c.runaway)?.id || null);
      setRes({ type: 'dead', catId: selCat, cat: currentCat || null });
    } else {
      setInterruptMap(prev => ({ ...prev, [selCat]: nextInterrupts }));
      setRes({ type: 'hungry', catId: selCat, cat: currentCat || null, interrupts: nextInterrupts });
    }

    focusTaskRef.current = '';
    setCurrentFocusTask('');
    setSessionStartedAt(null);
    return {
      ended: true,
      runaway: becomesRunaway,
      resultType: becomesRunaway ? 'dead' : 'hungry',
      interrupts: nextInterrupts,
    };
  }, [addHistory, cats, fState, interruptMap, recordFocusMoment, schedulePersist, selCat, timeLeft, totalTime]);

  const handleComplete = () => {
    clearTimeout(timerRef.current);
    setFS('idle');
    addHistory(true, totalTime);
    const nc = completions + 1;
    setComp(nc);
    const currentCat = cats.find(c => c.id === selCat);
    setInterruptMap(prev => {
      if (!selCat || !prev[selCat]) return prev;
      const next = { ...prev };
      delete next[selCat];
      return next;
    });
    recordFocusMoment({
      id: `focus-${Date.now()}`,
      catId: selCat,
      catName: currentCat?.name || null,
      task: focusTaskRef.current || '',
      planned: totalTime,
      duration: totalTime,
      completed: true,
      result: 'success',
      ts: Date.now(),
    });
    const rescuedCats = [];
    const qualifiesForRescue = totalTime >= RESCUE_MIN_SECONDS;
    let upd = cats.map(c => {
      let next = c;
      if (c.id === selCat && c.alive && !c.runaway) {
        next = { ...lvUp(c, 5), focusTime: (c.focusTime || 0) + totalTime };
      }
      if (qualifiesForRescue && c.runaway && c.rescueQuest?.active) {
        const progress = Math.min(RESCUE_REQUIRED_SESSIONS, (Number(c.rescueQuest.progress) || 0) + 1);
        if (progress >= RESCUE_REQUIRED_SESSIONS) {
          next = {
            ...next,
            alive: true,
            runaway: false,
            runawayAt: null,
            rescueQuest: null,
          };
          rescuedCats.push(next);
        } else {
          next = {
            ...next,
            alive: false,
            runaway: true,
            rescueQuest: {
              ...c.rescueQuest,
              progress,
              required: RESCUE_REQUIRED_SESSIONS,
              minSeconds: RESCUE_MIN_SECONDS,
            },
          };
        }
      }
      return next;
    });
    const nAT = accTime + totalTime;
    const nAC = accCount + 1;
    let newCat = null;
    let nColl = { ...collection };
    if (nAC >= 2) {
      const am = Math.floor(nAT / 60);
      const rp = rareProb(am);
      const isR = Math.random() < rp;
      const ownedKeys = new Set(upd.map(getCatIdentityKey));
      const rareAvailable = RARES.some(item => !ownedKeys.has(`rare:${item.id}`));
      const normalAvailable = BREEDS.some(item => !ownedKeys.has(`normal:${item.id}`));
      if (isR && rareAvailable) {
        const rc = pickRareCat(ownedKeys);
        newCat = { id: `cat-${Date.now()}`, breedId: rc.breed1, name: rc.rareName, xp: 0, level: 1, alive: true, isRare: true, rareType: rc.rareType, breed2: rc.breed2, focusTime: 0 };
        if (!nColl.rare.includes(rc.rareType)) nColl.rare = [...nColl.rare, rc.rareType];
      } else if (normalAvailable) {
        const n2 = pickNormalCat(ownedKeys);
        newCat = { id: `cat-${Date.now()}`, breedId: n2.breedId, name: n2.name, xp: 0, level: 1, alive: true, isRare: false, focusTime: 0 };
        if (!nColl.normal.includes(n2.breedId)) nColl.normal = [...nColl.normal, n2.breedId];
      } else if (rareAvailable) {
        const rc = pickRareCat(ownedKeys);
        newCat = { id: `cat-${Date.now()}`, breedId: rc.breed1, name: rc.rareName, xp: 0, level: 1, alive: true, isRare: true, rareType: rc.rareType, breed2: rc.breed2, focusTime: 0 };
        if (!nColl.rare.includes(rc.rareType)) nColl.rare = [...nColl.rare, rc.rareType];
      }
      if (newCat) upd = [...upd, newCat];
      setAT(0);
      setAC(0);
    } else {
      setAT(nAT);
      setAC(nAC);
    }
    setCats(upd);
    setColl(nColl);
    setStats(s => ({ ...s, totalFocus: s.totalFocus + totalTime, totalComplete: s.totalComplete + 1 }));
    setRes({ type: 'success', catId: selCat, newCat, rescuedCats, accCount: nAC >= 2 ? 0 : nAC });
    focusTaskRef.current = '';
    setCurrentFocusTask('');
    setSessionStartedAt(null);
  };

  const getCompanionPrompts = useCallback((cat) => {
    const isZh = lang === 'zh';
    const now = Date.now();
    const nowDate = new Date(now);
    const currentHour = nowDate.getHours();
    const timeSlot = getTimeSlot(now);
    const catId = cat?.id || null;
    const isSoulmateCat = !!soulmateCatId && catId === soulmateCatId;
    const catName = N(cat?.name, lang) || (isZh ? '小猫' : 'kitty');
    const memoryProfile = withProfileDefaults(companionMemory.profile);
    const catProfile = withCatProfileDefaults(companionMemory.catProfiles?.[catId]);
    const chats = companionMemory.chats
      .filter(item => !catId || item.catId === catId)
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const focusMoments = companionMemory.focusMoments
      .filter(item => !catId || item.catId === catId)
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const interactions = companionMemory.interactions
      .filter(item => !catId || item.catId === catId)
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const allHistory = (focusHistory || []).map(item => ({ ...item, _ts: asTimestamp(item) })).filter(item => item._ts > 0);
    const recentWeekHistory = allHistory.filter(item => now - item._ts <= 7 * DAY_MS);
    const completedThisWeek = recentWeekHistory.filter(item => item.completed).length;
    const todayKey = localDateKey();
    const todayCompleted = (focusHistory || []).filter(item => item.date === todayKey && item.completed).length;
    const todayMinutes = Math.max(0, Math.round((focusHistory || []).filter(item => item.date === todayKey && item.completed).reduce((sum, item) => sum + item.duration, 0) / 60));
    const latestChat = chats[0];
    const latestFocus = focusMoments[0];
    const latestInteraction = interactions[0];
    const latestCompletedFocus = recentWeekHistory.filter(item => item.completed).sort((a, b) => b._ts - a._ts)[0];
    const catCompletedHistory = allHistory
      .filter(item => item.completed && (!catId || item.catId === catId))
      .sort((a, b) => b._ts - a._ts);
    const recentCompletedCatHistory = catCompletedHistory.filter(item => now - item._ts <= 14 * DAY_MS).slice(0, 10);
    const routineHour = getRoutineHour(recentWeekHistory.filter(item => item.completed).slice(-18));
    const touchedToday = (
      (catProfile.lastChatAt && localDateKey(catProfile.lastChatAt) === todayKey)
      || (catProfile.lastInteractionAt && localDateKey(catProfile.lastInteractionAt) === todayKey)
      || (catProfile.lastFocusAt && localDateKey(catProfile.lastFocusAt) === todayKey)
    );
    const latestCompletedTask = recentWeekHistory
      .filter(item => item.completed && item.task)
      .sort((a, b) => b._ts - a._ts)[0]?.task;
    const promptSeedBase = hashSeed([
      catId,
      todayKey,
      currentHour,
      timeSlot,
      catProfile.chatCount,
      catProfile.relationshipScore,
      todayCompleted,
      completedThisWeek,
      latestCompletedTask,
      memoryProfile.preferredTask,
    ].join('|'));
    const pick = (key, variants, fallback = '') => pickVariant(variants, promptSeedBase + hashSeed(key), fallback);
    const prompts = [];
    const roundedMinutes = (seconds, fallback = 15) => {
      const minutes = Math.round((Math.max(0, Number(seconds) || 0) / 60) / 5) * 5;
      return Math.max(5, Math.min(120, minutes || fallback));
    };

    if (isSoulmateCat) {
      const preferredTaskCounts = recentCompletedCatHistory.reduce((acc, item) => {
        const key = String(item?.task || '').trim();
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      const preferredDurationCounts = recentCompletedCatHistory.reduce((acc, item) => {
        const key = roundedMinutes(item?.duration, 0);
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      const suggestedTask = Object.entries(preferredTaskCounts)
        .sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1];
          const latestA = recentCompletedCatHistory.find(item => String(item?.task || '').trim() === a[0])?._ts || 0;
          const latestB = recentCompletedCatHistory.find(item => String(item?.task || '').trim() === b[0])?._ts || 0;
          return latestB - latestA;
        })[0]?.[0] || latestCompletedTask || memoryProfile.preferredTask || '';
      const suggestedMinutes = Number(
        Object.entries(preferredDurationCounts)
          .sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return Math.abs(Number(a[0]) - 25) - Math.abs(Number(b[0]) - 25);
          })[0]?.[0]
      ) || roundedMinutes(recentCompletedCatHistory[0]?.duration, completedThisWeek > 0 ? 25 : 15);
      const taskHits = suggestedTask
        ? recentCompletedCatHistory.filter(item => String(item?.task || '').trim() === suggestedTask).length
        : 0;
      const durationHits = recentCompletedCatHistory.filter(item => roundedMinutes(item?.duration, 0) === suggestedMinutes).length;
      let soulmateReason = '';

      if (suggestedTask && taskHits >= 2 && durationHits >= 2) {
        soulmateReason = isZh
          ? `最近你最常顺利完成的是「${suggestedTask}」的 ${suggestedMinutes} 分钟节奏，我先帮你把这个开头留好了。`
          : `Lately you complete "${suggestedTask}" most smoothly in ${suggestedMinutes}-minute rounds, so I saved that starting point for you.`;
      } else if (suggestedTask && taskHits >= 2) {
        soulmateReason = isZh
          ? `最近你在「${suggestedTask}」上最容易接上状态，我想先陪你从这里开始。`
          : `You have been finding your rhythm most easily with "${suggestedTask}", so I want to start there with you.`;
      } else if (durationHits >= 2) {
        soulmateReason = isZh
          ? `最近你更容易完成 ${suggestedMinutes} 分钟，我先给你留一个更稳的长度。`
          : `You have been finishing ${suggestedMinutes}-minute sessions more easily lately, so I saved a steadier length for you.`;
      } else if (completedThisWeek > 0) {
        soulmateReason = isZh
          ? `你这周已经完成了 ${completedThisWeek} 次专注，我们先沿着你熟悉的节奏继续。`
          : `You have already finished ${completedThisWeek} focus sessions this week, so let's continue with a rhythm you already know.`;
      } else {
        soulmateReason = isZh
          ? `今天我先替你把开头准备好，你只要轻轻接上就可以。`
          : `I prepared the opening for you today, so you only need to ease into it.`;
      }

      prompts.push({
        kind: 'soulmate-focus-plan',
        badge: isZh ? '灵魂建议' : 'Soul Suggestion',
        title: isZh ? `${catName} 先帮你把今天的开头准备好了` : `${catName} already prepared a gentle start for you`,
        speech: suggestedTask
          ? (isZh ? `要不要先做「${suggestedTask}」${suggestedMinutes} 分钟？` : `Want to start with "${suggestedTask}" for ${suggestedMinutes} minutes?`)
          : (isZh ? `要不要先来 ${suggestedMinutes} 分钟？` : `Want to start with ${suggestedMinutes} minutes first?`),
        text: soulmateReason,
        action: 'apply_focus_suggestion',
        actionLabel: isZh ? '套用这份建议' : 'Apply this plan',
        recommendedTask: suggestedTask,
        recommendedMinutes: suggestedMinutes,
        recommendationReason: soulmateReason,
        tone: 'warm',
      });
    }

    if (!todayCompleted && routineHour !== null && isNearHour(currentHour, routineHour, 1)) {
      prompts.push({
        kind: 'rhythm',
        badge: isZh ? '今日节奏' : 'Rhythm',
        title: isZh ? `${catName} 觉得差不多到你们的专注时间了` : `${catName} feels it is about your usual focus time`,
        speech: pick('rhythm-speech', isZh
          ? ['喵，我记得你差不多会在这个时候开始。', '差不多到你平时进入状态的时间啦。', '这个时间点，很像你慢慢安静下来的时候。']
          : ['Meow, I remember this is usually when you begin.', 'This feels like your usual time to settle in.', 'This is often when your focus rhythm starts.']),
        text: pick('rhythm-text', isZh
          ? ['今天不用一下做很多，先开一小段，把状态接上就很好。', '不用给自己太大压力，先把第一小段接起来就可以。', '如果你愿意，我们就从最轻的一段开始。']
          : ['You do not need a huge session today. A short start is enough to get back in rhythm.', 'No need to pressure yourself. A tiny first stretch is enough.', 'If you want, we can begin with the lightest possible session.']),
        action: 'focus',
        actionLabel: isZh ? '就现在开始' : 'Start now',
        tone: 'warm',
      });
    }

    if (todayCompleted > 0 && latestCompletedFocus && now - latestCompletedFocus._ts <= 4 * HOUR_MS) {
      prompts.push({
        kind: 'today-progress',
        badge: isZh ? '今天的你' : 'Today',
        title: isZh ? `${catName} 觉得你今天状态已经接上了` : `${catName} thinks your rhythm is back today`,
        speech: pick('today-progress-speech', isZh
          ? ['刚才那段做得不错，我还想再陪你一会儿。', '我感觉你今天已经慢慢进入状态了。', '今天这股劲头已经接上了，我们可以顺着走。']
          : ['That last session was nice. I can stay with you for one more.', 'I think your rhythm is coming back today.', 'Today already feels more settled for you.']),
        text: pick('today-progress-text', isZh
          ? [`你今天已经专注了 ${todayMinutes} 分钟，我们可以继续，也可以先聊两句再开始。`, `今天已经有 ${todayMinutes} 分钟进账了，要不要趁感觉还在，再收一小段？`, `你今天已经不算空转啦，再来一段或者先和我说两句都可以。`]
          : [`You already focused for ${todayMinutes} minutes today. We can continue, or chat a little before the next one.`, `You already logged ${todayMinutes} minutes today. Want one more short session?`, `You are not drifting today anymore. Another short round could fit well.`]),
        action: 'focus',
        actionLabel: isZh ? '再来一段' : 'One more',
        tone: 'playful',
      });
    }

    if (!touchedToday && catProfile.relationshipScore >= 4) {
      prompts.push({
        kind: 'bond-open',
        badge: isZh ? '陪伴关系' : 'Bond',
        title: isZh ? `${catName} 今天先来和你贴贴` : `${catName} wants to be close first today`,
        speech: isZh ? '你今天还没跟我打招呼呢，不过我先来找你啦。' : `You haven't said hi to me today, so I came first.`,
        text: isZh ? '要不要先摸摸它，或者让它陪你开始一小段专注。' : 'You can pet it first, or let it keep you company for a small focus session.',
        action: 'chat',
        actionLabel: isZh ? '先陪陪它' : 'Say hi first',
        tone: 'soft',
      });
    }

    if (!todayCompleted && latestCompletedFocus && now - latestCompletedFocus._ts >= 2 * DAY_MS) {
      prompts.push({
        kind: 'restart',
        badge: isZh ? '轻轻回来' : 'Ease Back',
        title: isZh ? `${catName} 想陪你慢慢把节奏找回来` : `${catName} wants to help you ease back in`,
        speech: isZh ? '这两天没关系，我们今天轻轻回来就好。' : `The last couple of days are okay. We can come back gently today.`,
        text: isZh ? '不用补作业一样追赶进度，先开始 10 到 15 分钟也很好。' : 'No need to catch up all at once. Even 10 to 15 minutes is enough.',
        action: 'focus',
        actionLabel: isZh ? '轻轻开始' : 'Start gently',
        tone: 'soft',
      });
    }

    if (!todayCompleted && !latestCompletedFocus) {
      const greetingMap = {
        morning: isZh ? '早呀，今天想先做哪件事？' : 'Morning. What should we begin with today?',
        noon: isZh ? '中午也可以只专注一小会儿。' : 'A tiny focus session at noon still counts.',
        afternoon: isZh ? '下午我们收一小段专注回来吧。' : 'This afternoon we can reclaim one small stretch of focus.',
        evening: isZh ? '今晚不用拼太狠，我们收个小尾巴就好。' : `No need to push too hard tonight. Let's just close one small loop.`,
        night: isZh ? '夜里也没关系，我们安静地待一会儿。' : 'Even at night, we can just sit with one calm session.',
      };
      prompts.push({
        kind: 'time-greeting',
        badge: isZh ? '在这里等你' : 'Here With You',
        title: isZh ? `${catName} 今天在陪你慢慢开始` : `${catName} is here to start gently with you`,
        speech: greetingMap[timeSlot],
        text: pick('time-greeting-text', isZh
          ? ['先不用想太多，选一个任务，我们一起把开头接上。', '今天先决定第一件事就好，后面的我陪你慢慢走。', '如果你还没想好做什么，我也可以先陪你理一下思路。']
          : [`No need to overthink it. Pick one task and let's just begin.`, `You only need to choose the first thing. I'll stay with you for the rest.`, `If you are not sure what to do yet, we can sort it out gently.`]),
        action: 'focus',
        actionLabel: isZh ? '选个任务' : 'Pick a task',
        tone: 'warm',
      });
    }

    if (!touchedToday && catProfile.relationshipScore >= 2) {
      prompts.push({
        kind: 'mood-checkin',
        badge: isZh ? '心情问候' : 'Mood Check',
        title: isZh ? `${catName} 想先问问你今天过得怎么样` : `${catName} wants to ask how you are doing today`,
        speech: pick('mood-checkin-speech', isZh
          ? ['你今天心里是什么天气呀？', '如果你现在有点乱，也可以先告诉我一句。', '今天是轻松一点，还是有点累呢？']
          : ['What kind of weather is inside your heart today?', 'If things feel messy right now, you can tell me first.', 'Does today feel light, or a little heavy?']),
        text: pick('mood-checkin-text', isZh
          ? ['最近如果是工作、学习或者感情上的事让你有点乱，我都愿意先听你说一句。', '你可以先说说今天的心情，也可以直接开始专注，我都会陪着你。', '如果你现在不太想做事，先告诉我你今天最累的是哪一部分也可以。']
          : ['If work, study, or relationship things feel tangled lately, I can listen first.', 'You can tell me how you feel today, or jump into focus. I will stay with you either way.', 'If you do not feel like doing much right now, tell me what feels heaviest first.']),
        action: 'chat',
        actionLabel: isZh ? '先说说看' : 'Talk first',
        tone: 'soft',
      });
    }

    if (latestChat && now - latestChat.ts <= 3 * DAY_MS && ['stress', 'tired', 'distracted'].includes(latestChat.mood)) {
      prompts.push({
        kind: 'comfort',
        badge: isZh ? '我记得你' : 'I remember',
        title: isZh ? `${catName} 记得你最近 ${moodLabel(latestChat.mood, lang)}` : `${catName} remembers you've been ${moodLabel(latestChat.mood, lang)}`,
        speech: isZh ? '先别急着变厉害，今天我们轻轻开始就很好。' : `You don't have to be amazing right away. A gentle start is enough today.`,
        text: isZh ? '今天不必一下子做到很多，我们先从一小段专注开始也很好。' : 'You do not have to do a lot today. A small focus session is already great.',
        action: 'focus',
        actionLabel: isZh ? '先专注一下' : 'Start small',
        tone: 'soft',
      });
    }

    if (!latestChat && memoryProfile.lastChatAt && now - memoryProfile.lastChatAt <= 3 * DAY_MS && ['stress', 'tired', 'distracted'].includes(memoryProfile.lastMood)) {
      prompts.push({
        kind: 'global-comfort',
        badge: isZh ? '我记得你' : 'I remember',
        title: isZh ? `${catName} 记得你最近 ${moodLabel(memoryProfile.lastMood, lang)}` : `${catName} remembers you've been ${moodLabel(memoryProfile.lastMood, lang)}`,
        speech: isZh ? '今天不用拼命，我会先把节奏放轻一点。' : `We don't need to push hard today. I'll keep the rhythm gentle.`,
        text: isZh ? '就算今天先从 10 分钟开始也很好，我会记得你已经很努力了。' : 'Even starting with 10 minutes today is enough. I know you have been trying.',
        action: 'focus',
        actionLabel: isZh ? '轻轻开始' : 'Start gently',
        tone: 'soft',
      });
    }

    if (latestFocus?.completed && now - latestFocus.ts <= 36 * HOUR_MS) {
      prompts.push({
        kind: 'praise',
        badge: isZh ? '专注反馈' : 'Focus Note',
        title: isZh ? `${catName} 还记得你上次坚持住了` : `${catName} remembers your last win`,
        speech: isZh ? '我还记得你上次坚持住的样子，真的很稳。' : `I still remember how steady you were last time.`,
        text: isZh
          ? `上次${latestFocus.task ? `「${latestFocus.task}」` : '那次专注'}完成得很好，我们今天继续保持这个节奏吧。`
          : `You did great in your last ${latestFocus.task || 'focus'} session. Let's keep the rhythm today.`,
        action: 'focus',
        actionLabel: isZh ? '继续保持' : 'Keep it up',
        tone: 'playful',
      });
    }

    if (latestFocus && !latestFocus.completed && now - latestFocus.ts <= 48 * HOUR_MS) {
      prompts.push({
        kind: 'retry',
        badge: isZh ? '小提醒' : 'Gentle Nudge',
        title: isZh ? `${catName} 想陪你把上次补回来` : `${catName} wants to help you try again`,
        speech: isZh ? '上次那段没接住也没关系，我还在这里。' : `It's okay that last time slipped. I'm still here with you.`,
        text: isZh
          ? `上次${latestFocus.task ? `「${latestFocus.task}」` : '那次专注'}没能坚持到最后，这次我们可以从更轻一点的时长开始。`
          : `Last time ${latestFocus.task || 'that session'} did not make it to the end. We can start lighter this time.`,
        action: 'focus',
        actionLabel: isZh ? '重新开始' : 'Try again',
        tone: 'soft',
      });
    }

    if (latestChat?.summary) {
      prompts.push({
        kind: 'memory',
        badge: isZh ? '聊天记忆' : 'Memory',
        title: isZh ? `${catName} 还记得你说过的话` : `${catName} still remembers what you shared`,
        speech: isZh ? '你上次说的话，我还一直记着。' : `I've still been holding onto what you said last time.`,
        text: isZh ? `你上次提到“${latestChat.summary}”，如果现在还想说，我会继续听。` : `You mentioned "${latestChat.summary}" before. If you want to continue, I'm here.`,
        action: 'chat',
        actionLabel: isZh ? '继续聊聊' : 'Keep chatting',
        tone: 'warm',
      });
    }

    if (!latestChat?.summary && catProfile.lastChatAt && (catProfile.archivedSummary || catProfile.lastShared) && now - catProfile.lastChatAt <= 7 * DAY_MS) {
      prompts.push({
        kind: 'cat-archive-memory',
        badge: isZh ? '聊天记忆' : 'Memory',
        title: isZh ? `${catName} 还记得你们上次聊到的事` : `${catName} still remembers your last chat`,
        speech: isZh ? '我们上次聊的事，我没有忘。' : `I haven't forgotten what we talked about last time.`,
        text: isZh
          ? `我还记得：${catProfile.archivedSummary || `你上次提到“${catProfile.lastShared}”`}。`
          : `I still remember: ${catProfile.archivedSummary || `you mentioned "${catProfile.lastShared}" last time`}.`,
        action: 'chat',
        actionLabel: isZh ? '继续聊聊' : 'Keep chatting',
        tone: 'warm',
      });
    }

    if (!todayCompleted && completedThisWeek > 0) {
      prompts.push({
        kind: 'nudge',
        badge: isZh ? '今日提醒' : 'Today',
        title: isZh ? `${catName} 在等你开启今天的专注` : `${catName} is waiting for today's focus`,
        speech: isZh ? '今天先开一小段就好，我会在旁边陪着你。' : `A small start today is enough. I'll stay beside you.`,
        text: isZh ? `你这周已经完成 ${completedThisWeek} 次专注了，今天先开始一小段也很好。` : `You've completed ${completedThisWeek} sessions this week. Even a short one today counts.`,
        action: 'focus',
        actionLabel: isZh ? '开始今天第一段' : 'Start today',
        tone: 'warm',
      });
    }

    if (!todayCompleted) {
      prompts.push({
        kind: 'science-tip',
        badge: isZh ? '专注建议' : 'Focus Tip',
        title: isZh ? `${catName} 给你一个更科学的小建议` : `${catName} has a science-backed tip for you`,
        speech: pick('science-tip-speech', isZh
          ? ['先别追求很久，先让自己顺利开始更重要。', '开始前把手机翻过去，会比硬撑更有用。', '先做 5 分钟，再决定要不要继续，也很科学哦。']
          : ['Starting matters more than making it long right away.', 'Turning your phone face down helps more than forcing yourself.', 'Doing just 5 minutes first is a real strategy too.']),
        text: pick('science-tip-text', isZh
          ? ['可以试试先定一个 5 到 10 分钟的小目标，开始之后再决定要不要加时。', '如果你容易分心，先把手机放远一点，再只做一个最小动作，会更容易进入状态。', '专注前先喝口水、深呼吸两次，再开始第一小段，身体会更容易切进来。']
          : ['Try setting a 5 to 10 minute mini-goal first, then decide if you want more.', 'If you are easily distracted, put your phone farther away and start with one tiny action.', 'Drink a little water and take two slow breaths before your first round.']),
        action: 'focus',
        actionLabel: isZh ? '按这个开始' : 'Use this tip',
        tone: 'warm',
      });
    }

    if (latestCompletedTask) {
      prompts.push({
        kind: 'task',
        badge: isZh ? '任务建议' : 'Task Tip',
        title: isZh ? `${catName} 觉得你最近很适合 ${latestCompletedTask}` : `${catName} thinks ${latestCompletedTask} fits you lately`,
        speech: isZh ? `我猜你现在做「${latestCompletedTask}」会比较顺。` : `I think "${latestCompletedTask}" might feel good for you right now.`,
        text: isZh ? `你最近在「${latestCompletedTask}」上的状态不错，要不要延续一下这个感觉？` : `You've been doing well with "${latestCompletedTask}". Want to continue that flow?`,
        action: 'focus',
        actionLabel: isZh ? '就做这个' : 'Use this task',
        tone: 'playful',
      });
    }

    if (!latestCompletedTask && memoryProfile.preferredTask) {
      prompts.push({
        kind: 'global-task',
        badge: isZh ? '任务记忆' : 'Task Memory',
        title: isZh ? `${catName} 记得你最近常在做 ${memoryProfile.preferredTask}` : `${catName} remembers you often work on ${memoryProfile.preferredTask}`,
        speech: isZh ? `最近你常做「${memoryProfile.preferredTask}」，我都记住啦。` : `You've been doing "${memoryProfile.preferredTask}" a lot lately. I noticed.`,
        text: isZh ? `你在「${memoryProfile.preferredTask}」上已经慢慢形成节奏了，要不要继续保持？` : `You have been building a rhythm with "${memoryProfile.preferredTask}". Want to continue?`,
        action: 'focus',
        actionLabel: isZh ? '继续这个任务' : 'Use this task',
        tone: 'playful',
      });
    }

    if (latestInteraction && now - latestInteraction.ts <= 6 * HOUR_MS) {
      prompts.push({
        kind: 'bond',
        badge: isZh ? '互动回应' : 'Bonding',
        title: isZh ? `${catName} 很喜欢你刚刚的陪伴` : `${catName} loved your company just now`,
        speech: isZh ? '刚才被你关心到之后，我整只猫都软下来了。' : `After you paid attention to me, I softened right away.`,
        text: isZh ? '被你关心到的感觉很好，所以我也想继续陪着你。' : 'Being cared for feels lovely, so I want to stay with you too.',
        action: 'chat',
        actionLabel: isZh ? '陪它说说话' : 'Talk to it',
        tone: 'soft',
      });
    }

    const defaults = isZh
      ? [{
          kind: 'welcome',
          badge: '陪伴模式',
          title: `${catName} 今天也在等你`,
          speech: timeSlot === 'night'
            ? '晚一点开始也没关系，我还在这里。'
            : '我今天也在，想陪你慢慢开始。',
          text: '你可以先和我聊聊近况，或者直接开始一段轻松的专注。',
          action: 'focus',
          actionLabel: '开始专注',
          tone: 'warm',
        }]
      : [{
          kind: 'welcome',
          badge: 'Companion',
          title: `${catName} is here for you today`,
          speech: timeSlot === 'night'
            ? `It's okay to start late. I'm still here with you.`
            : `I'm here today too, ready to ease into things with you.`,
          text: 'We can talk for a bit first, or jump into a gentle focus session.',
          action: 'focus',
          actionLabel: 'Start focus',
          tone: 'warm',
        }];

    return uniqueByText([...prompts, ...defaults]).slice(0, 5);
  }, [lang, focusHistory, companionMemory, soulmateCatId]);

  const resetAll = async (options = {}) => {
    const nextProfile = options?.profile
      ? { ...DEFAULT_PROFILE, ...options.profile }
      : DEFAULT_PROFILE;
    try {
      await AsyncStorage.removeItem(KEY);
    } catch (error) {
      logStateWarning('reset', error);
    }
    clearInterval(timerRef.current);
    clearTimeout(persistTimeoutRef.current);
    setCats([{ ...STARTER }]);
    setComp(0);
    setSel(null);
    setFM(25);
    setStats({ totalFocus: 0, totalComplete: 0 });
    setAT(0);
    setAC(0);
    setColl({ normal: ['orange'], rare: [] });
    setFH([]);
    setInterruptMap({});
    setCurrentFocusTask('');
    setSessionStartedAt(null);
    setCat0Death(null);
    setFS('idle');
    setRes(null);
    setTL(0);
    setTT(0);
    setProfile(nextProfile);
    setCompanionMemory(EMPTY_MEMORY);
    setSoulmateCatIdState(null);
    setSoulmateSetDate('');
    startTimeRef.current = null;
    snapshotRef.current = null;
    focusTaskRef.current = '';
  };

  return {
    cats, completions, selCat, focusMin, timeLeft, totalTime, interrupts, currentFocusTask, sessionStartedAt, fState, result, loaded,
    stats, accTime, accCount, collection, themeId, lang, profile, focusHistory, cat0DeathTime, companionMemory, audioPrefs, soulmateCatId, soulmateSetDate,
    setCats, setSel, setFM, setRes, setTheme, setLang, setProfile, setAudioPrefs, setSoulmateCatId,
    aliveCats: cats.filter(c => c.alive && !c.runaway),
    focusCats: cats.filter(c => c.alive && !c.runaway),
    startFocus, handleInterrupt, handleComplete, handleFocusDistraction, pauseFocusForSystemInterruption, requestCatRescue, resetAll,
    recordChatMemory, recordCatInteraction, archiveChatSummary, getCompanionPrompts,
    rescueRequiredSessions: RESCUE_REQUIRED_SESSIONS,
    rescueMinSeconds: RESCUE_MIN_SECONDS,
    isTimerDone: fState === 'running' && timeLeft === 0,
  };
}
