import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import Svg, { Circle, Ellipse, Rect, Path } from 'react-native-svg';
import { useGame } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import { N } from '../utils/helpers';
import { playFeedback } from '../utils/feedback';
import { C, THEME_OPTIONS } from '../utils/theme';
import CAT_IMAGES from '../data/catImages';
import { shareImageWithMessage } from '../utils/share';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 330);
const HERO_HEIGHT = Math.round(HERO_WIDTH * 1.08);
const HERO_GAP = 16;
const SIDE_INSET = Math.max(20, (SCREEN_WIDTH - HERO_WIDTH) / 2);
const SNAP_INTERVAL = HERO_WIDTH + HERO_GAP;
const MIN_FOCUS_MINUTES = 5;
const MAX_FOCUS_MINUTES = 120;
const FOCUS_STEP = 5;
const LEADERBOARD_SCOPES = ['day', 'week', 'month'];
const LEADERBOARD_SAMPLE_USERS = [
  { id: 'momo', name: 'momo考研', avatar: '🐱', minutes: { day: 40, week: 661, month: 2380 } },
  { id: 'xiaomao', name: '小湘湘', avatar: '🐈', minutes: { day: 10, week: 602, month: 2145 } },
  { id: 'yusi', name: '鱼鱼丝', avatar: '🐟', minutes: { day: 0, week: 594, month: 2010 } },
  { id: 'focat74519', name: 'Focat_74519', avatar: '🐈‍⬛', minutes: { day: 0, week: 585, month: 1886 } },
  { id: 'focat65258', name: 'Focat_65258', avatar: '🐾', minutes: { day: 0, week: 579, month: 1714 } },
  { id: 'weisheng', name: '微尘', avatar: '🌅', minutes: { day: 0, week: 572, month: 1628 } },
  { id: 'study', name: '小猫爱学习', avatar: '☕️', minutes: { day: 0, week: 540, month: 1480 } },
];
const TASK_OPTIONS = [
  { key: 'reading', labelKey: 'taskReading', fallbackZh: '阅读', fallbackEn: 'Reading' },
  { key: 'creating', labelKey: 'taskCreating', fallbackZh: '创作', fallbackEn: 'Creating' },
  { key: 'design', labelKey: 'taskDesign', fallbackZh: '设计', fallbackEn: 'Design' },
  { key: 'exam', labelKey: 'taskExam', fallbackZh: '备考', fallbackEn: 'Exam Prep' },
  { key: 'work', labelKey: 'taskWork', fallbackZh: '工作', fallbackEn: 'Work' },
  { key: 'practice', labelKey: 'taskPractice', fallbackZh: '刷题', fallbackEn: 'Practice' },
  { key: 'music', labelKey: 'taskMusic', fallbackZh: '听歌', fallbackEn: 'Music' },
  { key: 'review', labelKey: 'taskReview', fallbackZh: '复盘', fallbackEn: 'Review' },
  { key: 'meditation', labelKey: 'taskMeditation', fallbackZh: '冥想', fallbackEn: 'Meditation' },
  { key: 'coding', labelKey: 'taskCoding', fallbackZh: '编程', fallbackEn: 'Coding' },
];
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
const rewardIcon = require('../assets/reward.png');
const AVATAR_KEYS = Object.keys(AVATAR_IMAGES);
const splitSpeechPages = (text) => {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return [''];
  const sentenceParts = normalized.match(/[^。！？!?]+[。！？!?]?/g) || [normalized];
  const pages = [];
  sentenceParts.forEach((part) => {
    const sentence = part.trim();
    if (!sentence) return;
    if (sentence.length <= 18) {
      pages.push(sentence);
      return;
    }
    const clauseParts = sentence.match(/[^，、；,;]+[，、；,;]?/g) || [sentence];
    clauseParts.forEach((clause) => {
      const piece = clause.trim();
      if (!piece) return;
      if (piece.length <= 18) {
        pages.push(piece);
        return;
      }
      for (let i = 0; i < piece.length; i += 16) {
        pages.push(piece.slice(i, i + 16));
      }
    });
  });
  return pages.slice(0, 3);
};

function PawDot({ active, color, outline }) {
  const fill = active ? color : 'transparent';
  const stroke = active ? color : outline;
  const strokeWidth = active ? 0 : 1.3;
  return (
    <Svg width={20} height={18} viewBox="0 0 20 18">
      <Circle cx="4.1" cy="6.2" r="1.8" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      <Circle cx="8.2" cy="3.8" r="1.8" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      <Circle cx="11.8" cy="3.8" r="1.8" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      <Circle cx="15.9" cy="6.2" r="1.8" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      <Ellipse cx="10" cy="12.2" rx="4.6" ry="3.5" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    </Svg>
  );
}

function LeaderboardIcon({ color }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M6 19h12" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Rect x="5" y="10" width="4" height="7" rx="1.3" fill="none" stroke={color} strokeWidth={1.8} />
      <Rect x="10" y="6" width="4" height="11" rx="1.3" fill="none" stroke={color} strokeWidth={1.8} />
      <Rect x="15" y="12" width="4" height="5" rx="1.3" fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="M12 3 L12.5 4 L13.4 4.2 L12.7 4.9 L12.8 5.9 L12 5.5 L11.2 5.9 L11.3 4.9 L10.6 4.2 L11.5 4 L12 3 Z" fill={color} />
    </Svg>
  );
}

function HeaderAvatar({ profile, fallbackName, size = 34 }) {
  const isPngAvatar = profile?.avatarType === 'png' && profile?.avatar && AVATAR_KEYS.includes(profile.avatar);
  const isUriAvatar = profile?.avatarType === 'photo'
    && profile?.avatar
    && (profile.avatar.startsWith('file://') || profile.avatar.startsWith('/') || profile.avatar.startsWith('ph://'));
  const initial = String(fallbackName || '').trim().slice(0, 1).toUpperCase() || 'M';
  const rawAvatar = String(profile?.avatar || '');
  const fallbackAvatar = rawAvatar && rawAvatar.length <= 4 && !rawAvatar.startsWith('cat') ? rawAvatar : initial;

  if (isPngAvatar) {
    return <Image source={AVATAR_IMAGES[profile.avatar]} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  if (isUriAvatar) {
    const uri = profile.avatar.startsWith('/') ? `file://${profile.avatar}` : profile.avatar;
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[stylesFallbackAvatar.inner, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[stylesFallbackAvatar.initial, { fontSize: Math.max(15, size * 0.42) }]}>{fallbackAvatar}</Text>
    </View>
  );
}

function ProfileMenuIcon({ type, color }) {
  const stroke = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  if (type === 'lock') {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Rect x="5" y="10" width="14" height="10" rx="3" {...stroke} />
        <Path d="M8 10 V8 C8 5.8 9.6 4.2 12 4.2 C14.4 4.2 16 5.8 16 8 V10" {...stroke} />
        <Circle cx="12" cy="15" r="1" fill={color} />
      </Svg>
    );
  }
  if (type === 'cat') {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path d="M6.5 9 L7.5 5.5 L10.2 8 C11.4 7.6 12.6 7.6 13.8 8 L16.5 5.5 L17.5 9 C18.4 10.1 18.8 11.4 18.8 13 C18.8 16.4 16 18.8 12 18.8 C8 18.8 5.2 16.4 5.2 13 C5.2 11.4 5.6 10.1 6.5 9 Z" {...stroke} />
        <Circle cx="9.5" cy="12.5" r="0.8" fill={color} />
        <Circle cx="14.5" cy="12.5" r="0.8" fill={color} />
        <Path d="M10.5 15 C11.4 15.7 12.6 15.7 13.5 15" {...stroke} />
      </Svg>
    );
  }
  if (type === 'audio') {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path d="M5 10 H8 L12 6 V18 L8 14 H5 Z" {...stroke} />
        <Path d="M16 9 C17.2 10.2 17.2 13.8 16 15" {...stroke} />
        <Path d="M18.5 6.5 C21 9.4 21 14.6 18.5 17.5" {...stroke} />
      </Svg>
    );
  }
  if (type === 'theme') {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="7" {...stroke} />
        <Path d="M12 5 V19" {...stroke} />
        <Path d="M5 12 H19" {...stroke} />
      </Svg>
    );
  }
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Circle cx="12" cy="8" r="3" {...stroke} />
      <Path d="M5 20 C6.5 16.5 9 15 12 15 C15 15 17.5 16.5 19 20" {...stroke} />
    </Svg>
  );
}

const stylesFallbackAvatar = StyleSheet.create({
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  initial: {
    color: '#9A6A32',
    fontSize: 17,
    fontWeight: '900',
  },
});

const pad2 = value => String(value).padStart(2, '0');
const localDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const startOfWeek = (date = new Date()) => {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  next.setHours(0, 0, 0, 0);
  return next;
};

const isHistoryInScope = (item, scope) => {
  const itemDate = String(item?.date || '');
  if (!itemDate) return false;
  const now = new Date();
  if (scope === 'day') return itemDate === localDateKey(now);
  if (scope === 'week') return itemDate >= localDateKey(startOfWeek(now));
  return itemDate.startsWith(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}`);
};

const formatLeaderboardTime = (minutes, zh) => {
  const safe = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (zh) return hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

export default function HomeScreen({ navigation }) {
  const g = useGame();
  const { user } = useAuth();
  const s = createStyles(C);
  const { t, lang, aliveCats, cats: allCats = aliveCats, selCat, setSel, focusMin, setFM, currentFocusTask, startFocus, fState, getCompanionPrompts, recordCatInteraction, focusHistory = [], profile, audioPrefs, setAudioPrefs, themeId, setTheme, soulmateCatId } = g;
  const zh = lang === 'zh';
  const [helpModal, setHelpModal] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [leaderboardScope, setLeaderboardScope] = useState('day');
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [durationModalVisible, setDurationModalVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [heroFrame, setHeroFrame] = useState('sit1');
  const [heroMode, setHeroMode] = useState('idle');
  const [heroReactionFrame, setHeroReactionFrame] = useState('happy');
  const [idleTick, setIdleTick] = useState(0);
  const [reactionPrompt, setReactionPrompt] = useState(null);
  const [heartFeedbackVisible, setHeartFeedbackVisible] = useState(false);
  const [companionIndex, setCompanionIndex] = useState(0);
  const [speechPageIndex, setSpeechPageIndex] = useState(0);
  const [selectedTaskLabel, setSelectedTaskLabel] = useState('');
  const [appliedSuggestionKey, setAppliedSuggestionKey] = useState('');
  const [customTaskDraft, setCustomTaskDraft] = useState('');
  const [customDurationDraft, setCustomDurationDraft] = useState(String(focusMin || 25));
  const railRef = useRef(null);
  const currentIndexRef = useRef(0);
  const previewIndexRef = useRef(0);
  const lastSwitchSoundIndexRef = useRef(0);
  const lastHeroTapRef = useRef(0);
  const longPressTriggeredRef = useRef(false);
  const leaderboardClosingRef = useRef(false);
  const leaderboardTouchStartRef = useRef(null);
  const heartFeedbackRef = useRef(null);
  const heartFeedbackTimerRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const promptOpacity = useRef(new Animated.Value(0)).current;
  const taskGuideAnim = useRef(new Animated.Value(0)).current;

  const cats = useMemo(() => {
    return [...aliveCats].sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      const aTime = parseInt(String(a.id).replace('cat-', ''), 10) || 0;
      const bTime = parseInt(String(b.id).replace('cat-', ''), 10) || 0;
      return bTime - aTime;
    });
  }, [aliveCats]);

  useEffect(() => {
    if (cats.length === 0) {
      setCurrentIndex(0);
      currentIndexRef.current = 0;
      return;
    }
    if (currentIndex > cats.length - 1) {
      setCurrentIndex(cats.length - 1);
      currentIndexRef.current = cats.length - 1;
    }
  }, [cats, currentIndex]);

  useEffect(() => () => {
    if (heartFeedbackTimerRef.current) clearTimeout(heartFeedbackTimerRef.current);
  }, []);

  useEffect(() => {
    if (leaderboardVisible) leaderboardClosingRef.current = false;
  }, [leaderboardVisible]);

  useEffect(() => {
    if (!cats.length) return;
    const nextIndex = Math.max(0, cats.findIndex(cat => cat.id === selCat));
    if (nextIndex !== currentIndexRef.current) {
      currentIndexRef.current = nextIndex;
      previewIndexRef.current = nextIndex;
      lastSwitchSoundIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      requestAnimationFrame(() => {
        railRef.current?.scrollTo({ x: nextIndex * SNAP_INTERVAL, animated: false });
      });
    }
  }, [cats, selCat]);

  useEffect(() => {
    if (fState === 'running') {
      navigation.navigate('Select');
    }
  }, [fState, navigation]);

  const currentCat = cats[currentIndex] || cats[0] || null;
  const currentCatId = currentCat?.id || null;
  const currentCatName = N(currentCat?.name, lang) || (zh ? '小猫' : 'Kitty');
  const currentImages = currentCat ? (CAT_IMAGES[currentCat.breedId] || CAT_IMAGES.orange) : CAT_IMAGES.orange;
  const taskOptions = useMemo(() => TASK_OPTIONS.map(item => {
    const translated = t(item.labelKey);
    return {
      key: item.key,
      label: translated && translated !== item.labelKey
        ? translated
        : (zh ? item.fallbackZh : item.fallbackEn),
    };
  }), [t, zh]);
  const companionPrompts = useMemo(() => {
    const prompts = currentCat ? getCompanionPrompts?.(currentCat) : [];
    if (Array.isArray(prompts) && prompts.length) return prompts;
    return [{
      kind: 'fallback',
      badge: zh ? '陪伴模式' : 'Companion',
      title: zh ? `${currentCatName} 今天也在等你` : `${currentCatName} is here for you today`,
      text: zh ? '你可以先和我聊聊，或者直接开始一段轻松的专注。' : 'You can chat with me first, or start a gentle focus session.',
      action: 'focus',
      actionLabel: zh ? '开始专注' : 'Start focus',
    }];
  }, [currentCat, currentCatName, getCompanionPrompts, zh]);
  const currentUserName = useMemo(() => {
    const nickname = String(profile?.nickname || user?.nickname || user?.name || '').trim();
    if (nickname) return nickname;
    const emailName = String(user?.email || profile?.email || '').split('@')[0];
    return emailName || (zh ? '我' : 'Me');
  }, [profile, user, zh]);
  const accountEmail = String(user?.email || profile?.email || '').trim();
  const ownedCatCount = Array.isArray(allCats) ? allCats.length : aliveCats.length;
  const leaderboardRows = useMemo(() => {
    const userMinutes = Math.round(
      (focusHistory || [])
        .filter(item => item?.completed && isHistoryInScope(item, leaderboardScope))
        .reduce((sum, item) => sum + (Number(item.duration) || 0), 0) / 60,
    );
    const rows = [
      {
        id: 'me',
        name: currentUserName,
        avatar: '🐱',
        minutes: userMinutes,
        isMe: true,
      },
      ...LEADERBOARD_SAMPLE_USERS.map(item => ({
        id: item.id,
        name: item.name,
        avatar: item.avatar,
        minutes: item.minutes[leaderboardScope] || 0,
        isMe: false,
      })),
    ];
    return rows
      .sort((a, b) => b.minutes - a.minutes)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [currentUserName, focusHistory, leaderboardScope]);
  const activePrompt = reactionPrompt || companionPrompts[companionIndex] || companionPrompts[0];
  const isCurrentSoulmateCat = !!currentCatId && currentCatId === soulmateCatId;
  const soulmatePrompt = useMemo(() => {
    if (!isCurrentSoulmateCat) return null;
    return companionPrompts.find(prompt => prompt?.kind === 'soulmate-focus-plan') || companionPrompts[0] || null;
  }, [companionPrompts, isCurrentSoulmateCat]);
  const soulmatePromptKey = useMemo(() => (
    soulmatePrompt
      ? `${currentCatId || 'none'}:${soulmatePrompt.kind || 'prompt'}:${soulmatePrompt.recommendedTask || ''}:${soulmatePrompt.recommendedMinutes || ''}:${soulmatePrompt.text || ''}`
      : ''
  ), [currentCatId, soulmatePrompt]);
  const soulmateSuggestedTask = String(soulmatePrompt?.recommendedTask || '').trim();
  const soulmateSuggestedMinutes = Number(soulmatePrompt?.recommendedMinutes) || 0;
  const soulmateSuggestionApplied = !!soulmatePromptKey && appliedSuggestionKey === soulmatePromptKey;
  const focusTimeLabel = `${String(focusMin || 25).padStart(2, '0')}:00`;
  const effectiveTaskLabel = (selectedTaskLabel || currentFocusTask || '').trim();
  const displayTaskLabel = effectiveTaskLabel || (zh ? '今天想做什么？' : 'What do you want to do today?');

  useEffect(() => {
    if (!selectedTaskLabel && currentFocusTask) {
      setSelectedTaskLabel(currentFocusTask);
    }
  }, [currentFocusTask, selectedTaskLabel]);

  useEffect(() => {
    if (!currentCatId) return undefined;
    let wagStart;
    let wagEnd;
    let happyReset;
    let selectedReset;

    if (heroMode === 'happy') {
      setHeroFrame(heroReactionFrame || 'happy');
      happyReset = setTimeout(() => {
        setHeroMode('idle');
        setIdleTick(tick => tick + 1);
      }, 1400);
      return () => clearTimeout(happyReset);
    }

    if (heroMode === 'selected') {
      setHeroFrame('happy');
      selectedReset = setTimeout(() => {
        setHeroMode('idle');
        setHeroFrame('sit1');
        setIdleTick(tick => tick + 1);
      }, 1200);
      return () => {
        clearTimeout(selectedReset);
      };
    }

    setHeroFrame('sit1');
    wagStart = setTimeout(() => setHeroFrame('sit2'), 7600);
    wagEnd = setTimeout(() => {
      setHeroFrame('sit1');
      setIdleTick(tick => tick + 1);
    }, 8500);

    return () => {
      clearTimeout(wagStart);
      clearTimeout(wagEnd);
      clearTimeout(happyReset);
      clearTimeout(selectedReset);
    };
  }, [currentCatId, heroMode, heroReactionFrame, idleTick]);

  useEffect(() => {
    setCompanionIndex(0);
  }, [currentCatId, companionPrompts.length]);

  useEffect(() => {
    if (!reactionPrompt) return undefined;
    const timer = setTimeout(() => setReactionPrompt(null), 4200);
    return () => clearTimeout(timer);
  }, [reactionPrompt]);

  useEffect(() => {
    setAppliedSuggestionKey('');
  }, [soulmatePromptKey]);

  useEffect(() => {
    if (reactionPrompt || companionPrompts.length <= 1) return undefined;
    const timer = setInterval(() => {
      setCompanionIndex(index => (index + 1) % companionPrompts.length);
    }, 12000);
    return () => clearInterval(timer);
  }, [reactionPrompt, companionPrompts.length]);

  const heroSource = currentImages[heroFrame] || currentImages.sit1 || CAT_IMAGES.orange.sit1;
  const promptLine = activePrompt?.text || (zh ? '它蹭了蹭你的手，心情变好了' : 'Your kitty feels a little better now.');
  const speechLine = activePrompt?.speech || activePrompt?.title || promptLine;
  const speechPages = useMemo(() => splitSpeechPages(speechLine), [speechLine]);
  const displaySpeechLine = speechPages[speechPageIndex] || speechLine;

  useEffect(() => {
    setSpeechPageIndex(0);
    if (speechPages.length <= 1) return undefined;
    const timer = setInterval(() => {
      setSpeechPageIndex(index => (index + 1) % speechPages.length);
    }, 2600);
    return () => clearInterval(timer);
  }, [speechPages]);

  useEffect(() => {
    if (!speechLine) {
      promptOpacity.setValue(0);
      return undefined;
    }
    promptOpacity.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(promptOpacity, {
          toValue: 1,
          duration: 920,
          useNativeDriver: true,
        }),
        Animated.delay(3600),
        Animated.timing(promptOpacity, {
          toValue: 0,
          duration: 760,
          useNativeDriver: true,
        }),
        Animated.delay(3200),
      ])
    );
    animation.start();
    return () => {
      animation.stop();
      promptOpacity.stopAnimation();
      promptOpacity.setValue(0);
    };
  }, [currentCatId, speechLine, promptOpacity]);

  const shareScreenshot = async () => {
    try {
      await shareImageWithMessage({
        title: zh ? '专注喵' : 'Focus Meow',
        message: zh
          ? '我正在用 Focus Meow 和小猫一起专注。'
          : 'I am focusing with my kitty in Focus Meow.',
        imageSource: currentImages.happy || currentImages.sit1 || CAT_IMAGES.orange.sit1,
        filename: `focusmeow-home-${currentCat?.breedId || 'orange'}.png`,
      });
    } catch (error) {
      Alert.alert(zh ? '分享失败' : 'Share Failed', String(error?.message || error));
    }
  };

  const openCollectionTab = () => {
    setProfileMenuVisible(false);
    const parentNavigation = navigation.getParent?.();
    if (parentNavigation?.navigate) {
      parentNavigation.navigate('Collection');
      return;
    }
    navigation.navigate('Collection');
  };

  const openAccountModal = () => {
    setProfileMenuVisible(false);
    setAccountModalVisible(true);
  };

  const toggleAudioPref = (key) => {
    setAudioPrefs?.(prev => ({ ...prev, [key]: !prev?.[key] }));
    playFeedback('tap');
  };

  const applyThemeFromMenu = (nextThemeId) => {
    setTheme?.(nextThemeId);
    playFeedback('tap');
  };

  const resetHeroForSwitch = () => {
    setReactionPrompt(null);
    setHeroFrame('happy');
    setHeroMode('selected');
  };

  const previewSwitchToIndex = (nextIndex) => {
    if (nextIndex === currentIndexRef.current) return;
    currentIndexRef.current = nextIndex;
    setCurrentIndex(nextIndex);
    resetHeroForSwitch();
  };

  const playCatSwitchFeedback = (nextIndex) => {
    if (nextIndex === lastSwitchSoundIndexRef.current) return;
    lastSwitchSoundIndexRef.current = nextIndex;
    playFeedback('catSwitch');
  };

  const goToIndex = (nextIndex) => {
    if (!cats.length) return;
    const safeIndex = Math.max(0, Math.min(cats.length - 1, nextIndex));
    const changed = safeIndex !== currentIndexRef.current;
    railRef.current?.scrollTo({ x: safeIndex * SNAP_INTERVAL, animated: true });
    previewIndexRef.current = safeIndex;
    previewSwitchToIndex(safeIndex);
    if (changed) playCatSwitchFeedback(safeIndex);
    else playFeedback('tap');
  };

  const onRailScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.max(0, Math.min(cats.length - 1, Math.round(offsetX / SNAP_INTERVAL)));
    if (nextIndex !== previewIndexRef.current) {
      previewIndexRef.current = nextIndex;
      previewSwitchToIndex(nextIndex);
      playCatSwitchFeedback(nextIndex);
    }
  };

  const onMomentumEnd = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const safeIndex = Math.max(0, Math.min(cats.length - 1, Math.round(offsetX / SNAP_INTERVAL)));
    const targetCat = cats[safeIndex];
    setCurrentIndex(safeIndex);
    currentIndexRef.current = safeIndex;
    previewIndexRef.current = safeIndex;
    if (targetCat?.id && targetCat.id !== selCat) {
      setSel(targetCat.id);
    }
  };

  const openFocus = () => {
    if (!effectiveTaskLabel) {
      taskGuideAnim.stopAnimation();
      taskGuideAnim.setValue(0);
      Animated.sequence([
        Animated.timing(taskGuideAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(taskGuideAnim, { toValue: -1, duration: 80, useNativeDriver: true }),
        Animated.timing(taskGuideAnim, { toValue: 0.75, duration: 70, useNativeDriver: true }),
        Animated.timing(taskGuideAnim, { toValue: -0.5, duration: 70, useNativeDriver: true }),
        Animated.timing(taskGuideAnim, { toValue: 0, duration: 70, useNativeDriver: true }),
      ]).start();
      playFeedback('tap');
      return;
    }
    playFeedback('start');
    if (currentCatId && currentCatId !== selCat) {
      setSel(currentCatId);
    }
    startFocus(effectiveTaskLabel, focusMin || 25);
  };

  const updateFocusMinutes = useCallback((nextMinutes) => {
    const clamped = Math.max(MIN_FOCUS_MINUTES, Math.min(MAX_FOCUS_MINUTES, nextMinutes));
    if (clamped === focusMin) return;
    setFM(clamped);
    playFeedback('tap');
  }, [focusMin, setFM]);

  const openDurationModal = useCallback(() => {
    setCustomDurationDraft('');
    setDurationModalVisible(true);
  }, []);

  const applyCustomDuration = useCallback(() => {
    const parsed = parseInt(String(customDurationDraft || '').replace(/[^0-9]/g, ''), 10);
    if (!Number.isFinite(parsed)) return;
    updateFocusMinutes(parsed);
  }, [customDurationDraft, updateFocusMinutes]);

  const durationPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => (
      Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
    ),
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx >= 18) {
        updateFocusMinutes((focusMin || 25) + FOCUS_STEP);
      } else if (gestureState.dx <= -18) {
        updateFocusMinutes((focusMin || 25) - FOCUS_STEP);
      }
    },
  }), [focusMin, updateFocusMinutes]);

  const closeLeaderboardBySwipe = useCallback(() => {
    if (leaderboardClosingRef.current) return;
    leaderboardClosingRef.current = true;
    playFeedback('tap');
    setLeaderboardVisible(false);
  }, []);

  const onLeaderboardTouchStart = useCallback((event) => {
    const touch = event?.nativeEvent?.touches?.[0] || event?.nativeEvent;
    leaderboardTouchStartRef.current = touch
      ? { x: touch.pageX || 0, y: touch.pageY || 0 }
      : null;
  }, []);

  const onLeaderboardTouchMove = useCallback((event) => {
    const start = leaderboardTouchStartRef.current;
    if (!start || leaderboardClosingRef.current) return;
    const touch = event?.nativeEvent?.touches?.[0] || event?.nativeEvent;
    if (!touch) return;
    const dx = (touch.pageX || 0) - start.x;
    const dy = (touch.pageY || 0) - start.y;
    if (dx > 22 && Math.abs(dx) > Math.abs(dy) * 0.72) {
      closeLeaderboardBySwipe();
    }
  }, [closeLeaderboardBySwipe]);

  const leaderboardPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => (
      gestureState.dx > 4
      && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 0.85
    ),
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dx > 18 || gestureState.vx > 0.12) {
        closeLeaderboardBySwipe();
      }
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: (_, gestureState) => (
      gestureState.dx > 18 || gestureState.vx > 0.12
    ),
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > 18 || gestureState.vx > 0.12) {
        closeLeaderboardBySwipe();
      }
    },
  }), [closeLeaderboardBySwipe]);

  const pickOne = (items) => items[Math.floor(Math.random() * items.length)];

  const getInteractionCopy = (type) => {
    const name = currentCatName || (zh ? '小猫' : 'Kitty');
    if (type === 'pet') {
      return zh ? {
        title: pickOne([`${name} 靠近了你`, `${name} 放松下来了`, `${name} 记住了你的温柔`]),
        text: pickOne([
          '它轻轻蹭了蹭你的手，好像把这份关心都收进心里了。',
          '你的触碰让它安心了许多，尾巴也慢慢放松下来。',
          '它眯起眼睛贴近你，像是在认真回应你的陪伴。',
          '它感受到了你的关心，整只猫都变得软乎乎的。',
        ]),
      } : {
        title: pickOne([`${name} feels cared for`, `${name} settles beside you`, `${name} trusts your touch`]),
        text: pickOne([
          'Your gentle touch helps your kitty relax and feel safe.',
          'It leans into your hand, quietly soaking up the care.',
          'Your kitty softens a little, happy to be close to you.',
        ]),
      };
    }

    return zh ? {
      title: pickOne([`${name} 被逗开心了`, `${name} 精神起来了`, `${name} 想和你多玩一会儿`]),
      text: pickOne([
        '它被你逗得眼睛亮亮的，像是把小小的快乐都藏进尾巴里。',
        '它轻轻扑了过来，开心得连脚步都变得轻快了。',
        '它认真追着你的动作，像是在邀请你再陪它一会儿。',
        '它被你逗得活泼起来，连空气里都多了一点暖意。',
      ]),
    } : {
      title: pickOne([`${name} perks right up`, `${name} wants to play`, `${name} looks delighted`]),
      text: pickOne([
        'Your kitty brightens up, chasing the moment with playful little paws.',
        'It pounces softly, happy that you stayed to play.',
        'Your playful attention makes your kitty feel lively and loved.',
      ]),
    };
  };

  const triggerHappy = (type, feedbackEvent = 'tap') => {
    if (currentCatId && type) {
      recordCatInteraction?.({ catId: currentCatId, type });
    }
    if (heartFeedbackTimerRef.current) clearTimeout(heartFeedbackTimerRef.current);
    setHeroReactionFrame(type === 'pet' && currentCat?.breedId === 'orange' ? 'happy2' : 'happy');
    setHeartFeedbackVisible(true);
    requestAnimationFrame(() => {
      heartFeedbackRef.current?.reset?.();
      heartFeedbackRef.current?.play?.();
    });
    heartFeedbackTimerRef.current = setTimeout(() => {
      setHeartFeedbackVisible(false);
    }, 1350);
    const copy = getInteractionCopy(type);
    setReactionPrompt({
      kind: 'reaction',
      badge: zh ? '温柔回应' : 'Warm Reply',
      title: copy.title,
      text: copy.text,
      action: 'focus',
      actionLabel: zh ? '开始专注' : 'Start focus',
    });
    setHeroMode('happy');
    playFeedback(feedbackEvent);
  };

  const handleHeroPress = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastHeroTapRef.current < 260) {
      lastHeroTapRef.current = 0;
      triggerHappy('pet', 'petCat');
      return;
    }
    lastHeroTapRef.current = now;
  };

  const handleHeroLongPress = () => {
    longPressTriggeredRef.current = true;
    lastHeroTapRef.current = 0;
    triggerHappy('tease', 'teaseCat');
  };

  const applyPresetTask = (label) => {
    setSelectedTaskLabel(label);
    setCustomTaskDraft('');
    setTaskModalVisible(false);
    playFeedback('tap');
  };

  const applyCustomTask = () => {
    const next = customTaskDraft.trim();
    if (!next) return;
    setSelectedTaskLabel(next);
    setTaskModalVisible(false);
    playFeedback('tap');
  };

  const openChatTab = useCallback(() => {
    if (currentCatId && currentCatId !== selCat) {
      setSel(currentCatId);
    }
    const parentNavigation = navigation.getParent?.();
    if (parentNavigation?.navigate) {
      parentNavigation.navigate('Chat');
      return;
    }
    navigation.navigate('Chat');
  }, [currentCatId, navigation, selCat, setSel]);

  const applySoulmateSuggestion = useCallback((prompt) => {
    if (!prompt) return false;
    let applied = false;
    const nextTask = String(prompt?.recommendedTask || '').trim();
    const nextMinutes = Number(prompt?.recommendedMinutes) || 0;

    if (nextTask) {
      setSelectedTaskLabel(nextTask);
      setCustomTaskDraft('');
      applied = true;
    }
    if (nextMinutes > 0) {
      const clampedMinutes = Math.max(MIN_FOCUS_MINUTES, Math.min(MAX_FOCUS_MINUTES, nextMinutes));
      setFM(clampedMinutes);
      applied = true;
    }
    if (currentCatId && currentCatId !== selCat) {
      setSel(currentCatId);
    }
    if (applied && soulmatePromptKey) {
      setAppliedSuggestionKey(soulmatePromptKey);
    }
    return applied;
  }, [currentCatId, selCat, setFM, setSel, soulmatePromptKey]);

  const handleSoulmatePromptAction = useCallback(() => {
    if (!soulmatePrompt) return;
    if (soulmatePrompt.action === 'chat') {
      playFeedback('tap');
      openChatTab();
      return;
    }
    const applied = applySoulmateSuggestion(soulmatePrompt);
    if (applied) {
      playFeedback('tap');
      return;
    }
    playFeedback('tap');
    setTaskModalVisible(true);
  }, [applySoulmateSuggestion, openChatTab, soulmatePrompt]);

  return (
    <View style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.headerArea}>
          <View style={s.header}>
            <View style={s.brand}>
              <TouchableOpacity
                style={s.avatarButton}
                onPress={() => {
                  playFeedback('tap');
                  setProfileMenuVisible(visible => !visible);
                }}
                activeOpacity={0.84}
              >
                <HeaderAvatar profile={profile} fallbackName={currentUserName} />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.rankEntryBtn}
                onPress={() => {
                  playFeedback('tap');
                  setProfileMenuVisible(false);
                  setLeaderboardVisible(true);
                }}
                activeOpacity={0.82}
              >
                <LeaderboardIcon color={C.primary} />
              </TouchableOpacity>
            </View>

            <View style={s.headerRight}>
              <TouchableOpacity style={s.iconBtn} onPress={shareScreenshot} activeOpacity={0.82}>
                <Text style={s.shareIcon}>⤴</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => setHelpModal(true)} activeOpacity={0.82}>
                <Text style={s.helpText}>?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={s.centerStage}>
          <View style={s.taskSection}>
            <Animated.View
              style={[
                s.taskSelectorMotion,
                {
                  transform: [
                    {
                      translateX: taskGuideAnim.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: [-10, 0, 10],
                      }),
                    },
                    {
                      scale: taskGuideAnim.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: [0.992, 1, 1.018],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={s.taskSelector}
                onPress={() => setTaskModalVisible(true)}
                activeOpacity={0.84}
              >
                <Text style={[s.taskSelectorText, !effectiveTaskLabel && s.taskSelectorPlaceholder]} numberOfLines={1}>
                  {displayTaskLabel}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={s.heroSection}>
            <View style={s.heroRailWrap}>
              <Animated.ScrollView
                ref={railRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={SNAP_INTERVAL}
                snapToAlignment="start"
                contentContainerStyle={s.rail}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  {
                    useNativeDriver: true,
                    listener: onRailScroll,
                  }
                )}
                onMomentumScrollEnd={onMomentumEnd}
              >
                {cats.map((cat, index) => {
                  const active = index === currentIndex;
                  const slideImages = CAT_IMAGES[cat.breedId] || CAT_IMAGES.orange;
                  const slideSource = active ? heroSource : (slideImages.sit1 || CAT_IMAGES.orange.sit1);
                  const inputRange = [
                    (index - 1) * SNAP_INTERVAL,
                    index * SNAP_INTERVAL,
                    (index + 1) * SNAP_INTERVAL,
                  ];
                  const animatedOpacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.14, 1, 0.14],
                    extrapolate: 'clamp',
                  });
                  const animatedScale = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.92, 1, 0.92],
                    extrapolate: 'clamp',
                  });
                  const animatedTranslateY = scrollX.interpolate({
                    inputRange,
                    outputRange: [12, 0, 12],
                    extrapolate: 'clamp',
                  });
                  return (
                    <Animated.View
                      key={cat.id}
                      style={[
                        s.heroSlide,
                        !active && s.heroSlideSide,
                        {
                          opacity: animatedOpacity,
                          transform: [
                            { scale: animatedScale },
                            { translateY: animatedTranslateY },
                          ],
                        },
                      ]}
                    >
                      <Pressable
                        style={s.heroImageFrame}
                        onPress={active ? handleHeroPress : undefined}
                        onLongPress={active ? handleHeroLongPress : undefined}
                        onPressIn={() => {
                          longPressTriggeredRef.current = false;
                        }}
                        delayLongPress={340}
                      >
                        <Image source={slideSource} style={s.heroImage} resizeMode="cover" />
                        {active && cat.id === soulmateCatId ? (
                          <View style={s.soulmateHeroBadge}>
                            <Image source={rewardIcon} style={s.soulmateHeroReward} resizeMode="contain" />
                            <Text style={s.soulmateHeroBadgeText}>{zh ? '灵魂猫咪' : 'Soul Kitty'}</Text>
                          </View>
                        ) : null}
                        {active && heartFeedbackVisible ? (
                          <LottieView
                            ref={heartFeedbackRef}
                            source={require('../assets/hearts_feedback.json')}
                            autoPlay
                            loop={false}
                            style={s.heroHeartFeedback}
                            pointerEvents="none"
                          />
                        ) : null}
                        {active && cat.id === soulmateCatId ? (
                          <View style={s.heroPromptWrap}>
                            <Animated.View style={[s.heroPromptShell, { opacity: promptOpacity }]}>
                              <View style={s.heroPromptBar}>
                                <Text style={s.heroPromptText} numberOfLines={3} ellipsizeMode="tail">{displaySpeechLine}</Text>
                              </View>
                            </Animated.View>
                          </View>
                        ) : null}
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </Animated.ScrollView>
            </View>
          </View>

          {cats.length > 1 ? (
            <View style={s.pageDots}>
              {cats.map((cat, index) => {
                const active = index === currentIndex;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={s.pageDotButton}
                    onPress={() => goToIndex(index)}
                    activeOpacity={0.82}
                  >
                    <PawDot
                      active={active}
                      color={C.primary}
                      outline="rgba(171, 169, 164, 0.72)"
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {soulmatePrompt ? (
            <View style={s.soulmateSuggestSection}>
              <View style={s.soulmateSuggestCard}>
                <View style={s.soulmateSuggestHeader}>
                  <Text style={s.soulmateSuggestBadge}>{soulmatePrompt.badge || (zh ? '灵魂建议' : 'Soul Suggestion')}</Text>
                  {soulmateSuggestionApplied ? (
                    <Text style={s.soulmateSuggestApplied}>{zh ? '已套用' : 'Applied'}</Text>
                  ) : null}
                </View>
                <Text style={s.soulmateSuggestTitle}>{soulmatePrompt.title}</Text>
                <Text style={s.soulmateSuggestBody}>{soulmatePrompt.text}</Text>
                <View style={s.soulmateSuggestMetaRow}>
                  {soulmateSuggestedTask ? (
                    <View style={s.soulmateSuggestChip}>
                      <Text style={s.soulmateSuggestChipText}>
                        {zh ? `任务 · ${soulmateSuggestedTask}` : `Task · ${soulmateSuggestedTask}`}
                      </Text>
                    </View>
                  ) : null}
                  {soulmateSuggestedMinutes > 0 ? (
                    <View style={s.soulmateSuggestChip}>
                      <Text style={s.soulmateSuggestChipText}>
                        {zh ? `时长 · ${soulmateSuggestedMinutes} 分钟` : `${soulmateSuggestedMinutes} min`}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={[s.soulmateSuggestAction, soulmateSuggestionApplied && s.soulmateSuggestActionApplied]}
                  onPress={handleSoulmatePromptAction}
                  activeOpacity={0.88}
                >
                  <Text style={[s.soulmateSuggestActionText, soulmateSuggestionApplied && s.soulmateSuggestActionTextApplied]}>
                    {soulmateSuggestionApplied
                      ? (zh ? '建议已填入下方' : 'Plan added below')
                      : (soulmatePrompt.actionLabel || (zh ? '套用这份建议' : 'Apply this plan'))}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={s.durationSection}>
            <TouchableOpacity
              style={s.durationArrowBtn}
              onPress={() => updateFocusMinutes((focusMin || 25) - FOCUS_STEP)}
              activeOpacity={0.82}
            >
              <Text style={s.durationArrow}>‹</Text>
            </TouchableOpacity>
            <View style={s.durationCenter} {...durationPanResponder.panHandlers}>
              <TouchableOpacity activeOpacity={0.86} onPress={openDurationModal}>
                <Text style={s.durationValue}>{focusTimeLabel}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={s.durationArrowBtn}
              onPress={() => updateFocusMinutes((focusMin || 25) + FOCUS_STEP)}
              activeOpacity={0.82}
            >
              <Text style={s.durationArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={s.focusSection}>
            <TouchableOpacity onPress={openFocus} activeOpacity={0.9} style={s.focusBtnWrap}>
              <LinearGradient
                colors={[C.gradientStart, C.primary, C.gradientEnd]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={s.focusBtn}
              >
                <Text style={s.focusBtnText}>{t('startFocus').replace('🐾 ', '')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal visible={profileMenuVisible} transparent animationType="fade" onRequestClose={() => setProfileMenuVisible(false)}>
        <TouchableOpacity style={s.profileMenuLayer} activeOpacity={1} onPress={() => setProfileMenuVisible(false)}>
          <View style={s.profilePopover} onStartShouldSetResponder={() => true}>
            <TouchableOpacity style={s.profileAccountRow} onPress={openAccountModal} activeOpacity={0.82}>
              <View style={s.profileMiniAvatar}>
                <HeaderAvatar profile={profile} fallbackName={currentUserName} size={38} />
              </View>
              <View style={s.profileAccountTextWrap}>
                <Text style={s.profileName} numberOfLines={1}>{currentUserName}</Text>
                <Text style={s.profileEmail} numberOfLines={1}>{accountEmail || (zh ? '未绑定邮箱' : 'No email')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={s.profileMenuRow} onPress={openAccountModal} activeOpacity={0.82}>
              <View style={s.profileMenuIcon}><ProfileMenuIcon type="lock" color={C.primary} /></View>
              <Text style={s.profileMenuLabel}>{zh ? '修改密码' : 'Change Password'}</Text>
              <Text style={s.profileMenuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.profileMenuRow} onPress={openCollectionTab} activeOpacity={0.82}>
              <View style={s.profileMenuIcon}><ProfileMenuIcon type="cat" color={C.primary} /></View>
              <Text style={s.profileMenuLabel}>{zh ? '已有猫咪' : 'Owned Cats'}</Text>
              <Text style={s.profileMenuValue}>{ownedCatCount}</Text>
            </TouchableOpacity>

            <View style={[s.profileMenuRow, s.profileAudioRow]}>
              <View style={s.profileMenuIcon}><ProfileMenuIcon type="audio" color={C.primary} /></View>
              <Text style={s.profileMenuLabel}>{zh ? '音量调整' : 'Sound'}</Text>
              <View style={s.profileAudioActions}>
                <TouchableOpacity
                  style={[s.profileAudioChip, audioPrefs?.sfxEnabled && s.profileAudioChipActive]}
                  onPress={() => toggleAudioPref('sfxEnabled')}
                  activeOpacity={0.82}
                >
                  <Text style={[s.profileAudioChipText, audioPrefs?.sfxEnabled && s.profileAudioChipTextActive]}>{zh ? '音效' : 'SFX'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.profileAudioChip, audioPrefs?.hapticsEnabled && s.profileAudioChipActive]}
                  onPress={() => toggleAudioPref('hapticsEnabled')}
                  activeOpacity={0.82}
                >
                  <Text style={[s.profileAudioChipText, audioPrefs?.hapticsEnabled && s.profileAudioChipTextActive]}>{zh ? '触感' : 'Haptic'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[s.profileMenuRow, s.profileThemeRow]}>
              <View style={s.profileMenuIcon}><ProfileMenuIcon type="theme" color={C.primary} /></View>
              <Text style={s.profileMenuLabel}>{zh ? '主题色' : 'Theme'}</Text>
              <View style={s.profileThemeActions}>
                {THEME_OPTIONS.map(option => {
                  const active = (themeId || 'default') === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[s.profileThemeChip, active && s.profileThemeChipActive]}
                      onPress={() => applyThemeFromMenu(option.id)}
                      activeOpacity={0.84}
                    >
                      <View style={[s.profileThemeDot, { backgroundColor: option.primary }]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={helpModal} transparent animationType="fade" onRequestClose={() => setHelpModal(false)}>
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setHelpModal(false)}>
          <View style={s.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={s.modalTitle}>{zh ? '专注喵规则' : 'FocusMeow Rules'}</Text>
            <Text style={s.modalDesc}>
              {zh
                ? '每完成 2 次专注，就会随机获得一只新猫咪。累计专注时间越长，获得稀有猫咪的概率越高。'
                : 'Complete 2 focus sessions to earn a random cat. Longer total focus time increases rare cat odds.'}
            </Text>

            <View style={s.ruleTable}>
              <View style={[s.ruleRow, s.ruleHeader]}>
                <Text style={s.ruleHeaderText}>{zh ? '累积时长' : 'Time'}</Text>
                <Text style={s.ruleHeaderText}>{zh ? '普通' : 'Normal'}</Text>
                <Text style={s.ruleHeaderRare}>{zh ? '稀有' : 'Rare'}</Text>
              </View>
              {[
                [zh ? '30分钟以下' : '< 30 min', '95%', '5%'],
                [zh ? '30-60分钟' : '30-60 min', '90%', '10%'],
                [zh ? '60-90分钟' : '60-90 min', '85%', '15%'],
                [zh ? '90-120分钟' : '90-120 min', '75%', '25%'],
              ].map(([time, normal, rare], index) => (
                <View key={time} style={[s.ruleRow, index % 2 === 0 && s.ruleAlt]}>
                  <Text style={s.ruleCell}>{time}</Text>
                  <Text style={s.ruleCell}>{normal}</Text>
                  <Text style={s.ruleRare}>{rare}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={s.modalBtn} onPress={() => setHelpModal(false)}>
              <Text style={s.modalBtnText}>{t('gotIt')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={leaderboardVisible} transparent animationType="slide" onRequestClose={() => setLeaderboardVisible(false)}>
        <View style={s.leaderboardOverlay} onTouchStart={onLeaderboardTouchStart} onTouchMove={onLeaderboardTouchMove}>
          <View style={s.leaderboardSheet}>
            <View style={s.leaderboardHeader}>
              <TouchableOpacity style={s.leaderboardBackBtn} onPress={() => setLeaderboardVisible(false)} activeOpacity={0.82}>
                <Text style={s.leaderboardBackText}>‹</Text>
              </TouchableOpacity>
              <View style={s.leaderboardTabs}>
                {LEADERBOARD_SCOPES.map(scope => {
                  const active = leaderboardScope === scope;
                  const label = scope === 'day'
                    ? (zh ? '日榜' : 'Day')
                    : scope === 'week'
                      ? (zh ? '周榜' : 'Week')
                      : (zh ? '月榜' : 'Month');
                  return (
                    <TouchableOpacity key={scope} style={s.leaderboardTab} onPress={() => setLeaderboardScope(scope)} activeOpacity={0.84}>
                      <Text style={[s.leaderboardTabText, active && s.leaderboardTabTextActive]}>{label}</Text>
                      {active ? <View style={s.leaderboardTabLine} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={s.leaderboardHeaderSpacer} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.leaderboardContent}>
              <View style={s.leaderboardTopPodium}>
                {[leaderboardRows[1], leaderboardRows[0], leaderboardRows[2]].filter(Boolean).map((item) => (
                  <View
                    key={item.id}
                    style={[
                      s.podiumCard,
                      item.rank === 1 && s.podiumCardFirst,
                      item.rank === 2 && s.podiumCardSecond,
                      item.rank === 3 && s.podiumCardThird,
                    ]}
                  >
                    <Text style={s.podiumBadge}>Top {item.rank}</Text>
                    <Text style={s.podiumAvatar}>{item.avatar}</Text>
                    <Text style={s.podiumName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.podiumTime}>{formatLeaderboardTime(item.minutes, zh)}</Text>
                  </View>
                ))}
              </View>

              {leaderboardRows.slice(3).map(item => (
                <View key={item.id} style={[s.leaderboardRow, item.isMe && s.leaderboardRowMe]}>
                  <Text style={s.leaderboardRank}>{item.rank}</Text>
                  <Text style={s.leaderboardAvatar}>{item.avatar}</Text>
                  <View style={s.leaderboardUserInfo}>
                    <Text style={s.leaderboardUserName} numberOfLines={1}>
                      {item.name}{item.isMe ? (zh ? '（我）' : ' (Me)') : ''}
                    </Text>
                  </View>
                  <Text style={s.leaderboardTime}>{formatLeaderboardTime(item.minutes, zh)}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
          <View style={s.leaderboardSwipeEdge} {...leaderboardPanResponder.panHandlers} />
        </View>
      </Modal>

      <Modal visible={accountModalVisible} transparent animationType="fade" onRequestClose={() => setAccountModalVisible(false)}>
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setAccountModalVisible(false)}>
          <View style={s.accountModalCard} onStartShouldSetResponder={() => true}>
            <TouchableOpacity style={s.accountCloseBtn} onPress={() => setAccountModalVisible(false)} activeOpacity={0.82}>
              <Text style={s.accountCloseText}>×</Text>
            </TouchableOpacity>
            <View style={s.accountModalHeader}>
              <View style={s.accountModalAvatar}>
                <HeaderAvatar profile={profile} fallbackName={currentUserName} size={54} />
              </View>
              <View style={s.accountModalInfo}>
                <Text style={s.accountModalName} numberOfLines={1}>{currentUserName}</Text>
                <Text style={s.accountModalEmail} numberOfLines={1}>{accountEmail || (zh ? '暂未绑定邮箱' : 'No email linked')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.accountActionBtn}
              onPress={() => Alert.alert('', zh ? '请在登录页使用重置密码流程修改密码。' : 'Use the reset password flow on the login screen.')}
              activeOpacity={0.84}
            >
              <Text style={s.accountActionText}>{zh ? '修改密码' : 'Change Password'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={taskModalVisible} transparent animationType="fade" onRequestClose={() => setTaskModalVisible(false)}>
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setTaskModalVisible(false)}>
          <View style={s.taskModalCard} onStartShouldSetResponder={() => true}>
            <Text style={s.modalTitle}>{t('taskTitle').replace('📝 ', '')}</Text>
            <View style={s.taskOptionGrid}>
              {taskOptions.map(item => {
                const active = effectiveTaskLabel === item.label;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[s.taskOptionChip, active && s.taskOptionChipActive]}
                    onPress={() => applyPresetTask(item.label)}
                    activeOpacity={0.86}
                  >
                    <Text style={[s.taskOptionText, active && s.taskOptionTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={s.taskInput}
              placeholder={t('taskCustomPlaceholder')}
              placeholderTextColor={C.onSurfaceVariant}
              value={customTaskDraft}
              onChangeText={setCustomTaskDraft}
              maxLength={24}
            />
            <View style={s.taskModalActions}>
              <TouchableOpacity style={[s.modalBtn, s.modalActionBtn]} onPress={applyCustomTask}>
                <Text style={s.modalBtnText}>{zh ? '确定' : 'Confirm'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalSecondaryBtn, s.modalActionBtn]} onPress={() => setTaskModalVisible(false)}>
                <Text style={s.modalSecondaryText}>{zh ? '取消' : 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={durationModalVisible} transparent animationType="fade" onRequestClose={() => setDurationModalVisible(false)}>
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setDurationModalVisible(false)}>
          <View style={s.durationModalCard} onStartShouldSetResponder={() => true}>
            <Text style={s.modalTitle}>{zh ? '调整专注时长' : 'Adjust Duration'}</Text>
            <View style={s.durationModalStepper}>
              <TouchableOpacity
                style={s.durationModalStepBtn}
                onPress={() => updateFocusMinutes((focusMin || 25) - FOCUS_STEP)}
                activeOpacity={0.84}
              >
                <Text style={s.durationModalStepText}>−</Text>
              </TouchableOpacity>
              <Text style={s.durationModalValue}>{focusTimeLabel}</Text>
              <TouchableOpacity
                style={s.durationModalStepBtn}
                onPress={() => updateFocusMinutes((focusMin || 25) + FOCUS_STEP)}
                activeOpacity={0.84}
              >
                <Text style={s.durationModalStepText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={s.durationPresetRow}>
              {[15, 25, 45, 60].map(item => {
                const active = item === focusMin;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[s.durationPresetChip, active && s.durationPresetChipActive]}
                    onPress={() => {
                      setCustomDurationDraft('');
                      updateFocusMinutes(item);
                    }}
                    activeOpacity={0.84}
                  >
                    <Text style={[s.durationPresetText, active && s.durationPresetTextActive]}>{item}:00</Text>
                  </TouchableOpacity>
                );
              })}
              <View style={s.durationInlineInputWrap}>
                <TextInput
                  style={[s.durationInlineInput, !customDurationDraft && s.durationInlineInputEmpty]}
                  placeholder={zh ? '自定义' : 'Custom'}
                  placeholderTextColor={C.outline}
                  keyboardType="number-pad"
                  value={customDurationDraft}
                  onChangeText={(value) => setCustomDurationDraft(value.replace(/[^0-9]/g, '').slice(0, 3))}
                  maxLength={3}
                />
                <Text style={s.durationInlineUnit}>{zh ? '分钟' : 'min'}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.modalBtn}
              onPress={() => {
                applyCustomDuration();
                setDurationModalVisible(false);
              }}
            >
              <Text style={s.modalBtnText}>{zh ? '完成' : 'Done'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const createStyles = (C) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: {
    paddingTop: 68,
    paddingBottom: 48,
    flexGrow: 1,
  },
  headerArea: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(197, 158, 111, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#d8bc95',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    overflow: 'hidden',
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 1.25,
    borderColor: C.accentLine,
    backgroundColor: C.surfaceContainerLowest,
  },
  rankEntryBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.floatCard,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#d8bc95',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  brandName: {
    color: C.primary,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.floatCard,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#d8bc95',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  shareIcon: {
    color: C.primary,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 18,
  },
  helpText: {
    color: C.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  profileMenuLayer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  profilePopover: {
    position: 'absolute',
    left: 20,
    top: 104,
    width: Math.min(SCREEN_WIDTH - 40, 330),
    borderRadius: 24,
    padding: 14,
    backgroundColor: 'rgba(255,253,248,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(197, 158, 111, 0.24)',
    shadowColor: '#8f5f2f',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    zIndex: 20,
  },
  profileAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(143,116,88,0.12)',
  },
  profileMiniAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    padding: 2,
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.64)',
    borderWidth: 1,
    borderColor: 'rgba(197, 158, 111, 0.28)',
    overflow: 'hidden',
  },
  profileAccountTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: C.primary,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  profileEmail: {
    color: C.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  profileMenuRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  profileMenuIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
    backgroundColor: C.activeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMenuLabel: {
    flex: 1,
    color: C.onSurface,
    fontSize: 14,
    fontWeight: '700',
  },
  profileMenuArrow: {
    color: C.outline,
    fontSize: 20,
    lineHeight: 22,
  },
  profileMenuValue: {
    color: C.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  profileAudioRow: {
    alignItems: 'center',
  },
  profileAudioActions: {
    flexDirection: 'row',
    gap: 6,
  },
  profileAudioChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.border,
  },
  profileAudioChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  profileAudioChipText: {
    color: C.outline,
    fontSize: 11,
    fontWeight: '800',
  },
  profileAudioChipTextActive: {
    color: '#fff',
  },
  profileThemeRow: {
    alignItems: 'center',
  },
  profileThemeActions: {
    flexDirection: 'row',
    gap: 7,
  },
  profileThemeChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.border,
  },
  profileThemeChipActive: {
    borderColor: C.primary,
    backgroundColor: C.activeTint,
  },
  profileThemeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  centerStage: {
    width: '100%',
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 18,
  },
  taskSection: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    marginBottom: 24,
  },
  taskSelectorMotion: {
    width: '100%',
    alignItems: 'center',
  },
  taskSelector: {
    minWidth: 208,
    maxWidth: '92%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(192,152,112,0.34)',
    shadowColor: '#ffffff',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  taskSelectorText: {
    maxWidth: '100%',
    color: C.primary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  taskSelectorPlaceholder: {
    color: C.onSurfaceVariant,
    fontWeight: '600',
  },
  durationSection: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  durationArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  durationArrow: {
    color: C.primary,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '400',
    marginTop: -2,
  },
  durationCenter: {
    minWidth: 210,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  durationValue: {
    color: C.primary,
    fontSize: 56,
    lineHeight: 60,
    fontWeight: '800',
    letterSpacing: 1.4,
    fontVariant: ['tabular-nums'],
  },
  heroSection: {
    width: SCREEN_WIDTH,
    marginHorizontal: -20,
    minHeight: HERO_HEIGHT,
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroRailWrap: {
    position: 'relative',
    minHeight: HERO_HEIGHT,
    justifyContent: 'center',
    overflow: 'visible',
    width: '100%',
  },
  rail: {
    paddingLeft: SIDE_INSET,
    paddingRight: SIDE_INSET,
  },
  heroSlide: {
    width: HERO_WIDTH,
    height: HERO_HEIGHT,
    marginRight: HERO_GAP,
    borderRadius: 34,
    backgroundColor: '#fffefb',
    borderWidth: 1.5,
    borderColor: 'rgba(205,171,124,0.32)',
    shadowColor: '#e0bc8a',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    padding: 8,
  },
  heroSlideSide: {
    opacity: 0.08,
  },
  heroImageFrame: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#FFF7EA',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  soulmateHeroBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 244, 218, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(171, 112, 42, 0.24)',
    shadowColor: '#A86B24',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  soulmateHeroReward: {
    width: 18,
    height: 18,
  },
  soulmateHeroBadgeText: {
    color: C.primary,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  heroHeartFeedback: {
    position: 'absolute',
    width: '118%',
    height: '118%',
    left: '-9%',
    top: '-22%',
  },
  heroPromptWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    alignItems: 'center',
  },
  heroPromptShell: {
    maxWidth: '92%',
  },
  heroPromptBar: {
    width: '100%',
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.84)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#9f6d3d',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPromptText: {
    color: '#7A5231',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  pageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  pageDotButton: {
    width: 24,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soulmateSuggestSection: {
    width: '100%',
    maxWidth: 332,
    marginBottom: 18,
  },
  soulmateSuggestCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: 'rgba(255, 249, 239, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(192, 152, 112, 0.28)',
    shadowColor: '#C78A43',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  soulmateSuggestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 10,
  },
  soulmateSuggestBadge: {
    alignSelf: 'flex-start',
    color: C.primary,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 238, 210, 0.96)',
  },
  soulmateSuggestApplied: {
    color: C.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  soulmateSuggestTitle: {
    color: C.tertiary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  soulmateSuggestBody: {
    color: C.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 19,
  },
  soulmateSuggestMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  soulmateSuggestChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(192, 152, 112, 0.22)',
  },
  soulmateSuggestChipText: {
    color: C.primary,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  soulmateSuggestAction: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: 14,
  },
  soulmateSuggestActionApplied: {
    backgroundColor: C.surfaceContainerHigh,
  },
  soulmateSuggestActionText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  soulmateSuggestActionTextApplied: {
    color: C.primary,
  },
  focusSection: {
    width: '100%',
    paddingHorizontal: 18,
    marginTop: 0,
    marginBottom: 2,
    minHeight: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusBtnWrap: {
    width: 292,
    borderRadius: 999,
    overflow: 'visible',
    shadowColor: '#D58E45',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  focusBtn: {
    width: '100%',
    height: 58,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusBtnText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: 0,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fffdf8',
    borderRadius: 26,
    padding: 22,
    shadowColor: '#a14000',
    shadowOpacity: 0.12,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
  },
  taskModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fffdf8',
    borderRadius: 26,
    padding: 22,
    shadowColor: '#a14000',
    shadowOpacity: 0.12,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
  },
  accountModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fffdf8',
    borderRadius: 26,
    padding: 20,
    paddingTop: 28,
    shadowColor: '#8f5f2f',
    shadowOpacity: 0.14,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
  },
  accountCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168,100,36,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(168,100,36,0.14)',
    zIndex: 2,
  },
  accountCloseText: {
    color: C.primary,
    fontSize: 21,
    lineHeight: 23,
    fontWeight: '700',
    marginTop: -1,
  },
  accountModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingRight: 30,
  },
  accountModalAvatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 6,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(197, 158, 111, 0.28)',
    overflow: 'hidden',
  },
  accountModalInfo: {
    flex: 1,
    minWidth: 0,
  },
  accountModalName: {
    color: C.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  accountModalEmail: {
    color: C.onSurfaceVariant,
    fontSize: 12,
    marginTop: 4,
  },
  accountActionBtn: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    marginBottom: 10,
  },
  accountActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  modalTitle: {
    color: C.tertiary,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  modalDesc: {
    color: C.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  ruleTable: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  ruleRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  ruleHeader: { backgroundColor: C.surfaceContainerHigh },
  ruleAlt: { backgroundColor: C.surfaceContainerLow },
  ruleHeaderText: {
    flex: 1,
    textAlign: 'center',
    color: C.tertiary,
    fontSize: 12,
    fontWeight: '700',
  },
  ruleHeaderRare: {
    flex: 1,
    textAlign: 'center',
    color: C.primaryContainer,
    fontSize: 12,
    fontWeight: '800',
  },
  ruleCell: {
    flex: 1,
    textAlign: 'center',
    color: C.onSurfaceVariant,
    fontSize: 12,
  },
  ruleRare: {
    flex: 1,
    textAlign: 'center',
    color: C.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  modalBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryBtn: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  leaderboardOverlay: {
    flex: 1,
    backgroundColor: C.bg,
  },
  leaderboardSwipeEdge: {
    position: 'absolute',
    left: 0,
    top: 104,
    bottom: 0,
    width: 56,
    zIndex: 30,
  },
  leaderboardSheet: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: 58,
  },
  leaderboardHeader: {
    height: 46,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leaderboardBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardBackText: {
    color: C.onSurface,
    fontSize: 34,
    lineHeight: 34,
    fontWeight: '500',
  },
  leaderboardTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  leaderboardTab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 42,
    height: 40,
  },
  leaderboardTabText: {
    color: C.onSurfaceVariant,
    fontSize: 16,
    fontWeight: '800',
  },
  leaderboardTabTextActive: {
    color: C.onSurface,
  },
  leaderboardTabLine: {
    width: 22,
    height: 3,
    borderRadius: 999,
    backgroundColor: C.primary,
    marginTop: 5,
  },
  leaderboardHeaderSpacer: {
    width: 34,
  },
  leaderboardTicker: {
    marginTop: 6,
    height: 34,
    backgroundColor: '#191916',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  leaderboardTickerText: {
    color: '#F8EFE1',
    fontSize: 13,
    fontWeight: '700',
  },
  leaderboardContent: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 120,
  },
  leaderboardTopPodium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 18,
  },
  podiumCard: {
    flex: 1,
    minHeight: 132,
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: C.border,
  },
  podiumCardFirst: {
    minHeight: 158,
    backgroundColor: '#FFF4D9',
  },
  podiumCardSecond: {
    backgroundColor: '#E7FBFA',
  },
  podiumCardThird: {
    backgroundColor: '#FFF0D8',
  },
  podiumBadge: {
    color: C.primary,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 5,
  },
  podiumAvatar: {
    fontSize: 34,
    marginBottom: 6,
  },
  podiumName: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '900',
    maxWidth: '100%',
  },
  podiumTime: {
    color: C.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
  leaderboardRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  leaderboardRowMe: {
    backgroundColor: C.primaryFixed,
    borderRadius: 16,
    paddingHorizontal: 10,
    marginVertical: 3,
  },
  leaderboardRank: {
    width: 28,
    color: C.onSurfaceVariant,
    fontSize: 15,
    fontWeight: '800',
  },
  leaderboardAvatar: {
    width: 42,
    fontSize: 28,
    textAlign: 'center',
    marginRight: 8,
  },
  leaderboardUserInfo: {
    flex: 1,
  },
  leaderboardUserName: {
    color: C.onSurface,
    fontSize: 15,
    fontWeight: '800',
  },
  leaderboardTime: {
    color: C.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '800',
  },
  modalSecondaryText: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  taskOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  taskOptionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.border,
  },
  taskOptionChipActive: {
    backgroundColor: C.primaryFixed,
    borderColor: C.borderActive,
  },
  taskOptionText: {
    color: C.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '700',
  },
  taskOptionTextActive: {
    color: C.primary,
  },
  taskInput: {
    height: 48,
    borderRadius: 16,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    color: C.onSurface,
    fontSize: 14,
    marginBottom: 14,
  },
  taskModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActionBtn: {
    flex: 1,
  },
  durationModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fffdf8',
    borderRadius: 26,
    padding: 22,
    shadowColor: '#a14000',
    shadowOpacity: 0.12,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
  },
  durationModalStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  durationModalStepBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationModalStepText: {
    color: C.primary,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '500',
  },
  durationModalValue: {
    color: C.primary,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: 1.1,
    fontVariant: ['tabular-nums'],
  },
  durationPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
    alignItems: 'center',
  },
  durationPresetChip: {
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  durationPresetChipActive: {
    backgroundColor: C.primaryFixed,
    borderColor: C.borderActive,
  },
  durationPresetText: {
    color: C.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '700',
  },
  durationPresetTextActive: {
    color: C.primary,
  },
  durationInlineInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    minHeight: 44,
    minWidth: 122,
  },
  durationInlineInput: {
    width: 40,
    paddingVertical: 0,
    paddingHorizontal: 0,
    color: C.primary,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  durationInlineInputEmpty: {
    width: 58,
    color: C.outline,
    fontWeight: '600',
  },
  durationInlineUnit: {
    color: C.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  durationCustomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  durationCustomInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    color: C.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  durationCustomUnit: {
    color: C.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '700',
  },
  durationCustomApplyBtn: {
    minWidth: 72,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  durationCustomApplyText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
