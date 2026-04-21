import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Image, StyleSheet, Modal, Keyboard, BackHandler, AppState, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { useGame } from '../../App';
import { useGuestAction as consumeGuestAction } from '../utils/guestLimits';
import CatAvatar from '../components/CatAvatar';
import CircularTimer from '../components/CircularTimer';
import { N, xpFor, totXp } from '../utils/helpers';
import { playFeedback } from '../utils/feedback';
import { C } from '../utils/theme';
import { setFocusAmbientActive, syncAmbientPlayback } from '../utils/audio';
import { cancelFocusReminder, consumeFocusInterruptionContext, prepareFocusReminderPermission, sendFocusReminder, startFocusActivity, stopFocusActivity, updateFocusActivity } from '../utils/focusActivity';
import CAT_IMAGES from '../data/catImages';
import { shareImageWithMessage } from '../utils/share';

const CHEERS = {
  zh: ['太棒了！专注力满分 🌟','小猫为你骄傲喵～ 😺','坚持就是胜利，你做到了！💪','每一次专注都让你更强大 🚀','今天的你比昨天更优秀！✨','专注的你闪闪发光 🌈','再接再厉，你是最棒的！🎯','小猫吃饱啦，谢谢主人 🐟','优秀！保持这个节奏 🔥','又完成一次，离目标更近了 🏆','你的专注力让小猫很安心 💕','厉害！继续加油喵～ 🐾'],
  en: ['Amazing focus! You nailed it 🌟','Your cat is proud of you 😺','Persistence pays off! 💪','Every session makes you stronger 🚀','Better than yesterday! ✨','You shine when you focus 🌈','Keep it up, you are the best! 🎯','Cat is full, thanks hooman 🐟','Excellent! Keep this rhythm 🔥','One step closer to your goal 🏆','Your focus keeps kitty happy 💕','Impressive! Keep going 🐾'],
};

const TASK_OPTIONS = [
  { key: 'reading', labelKey: 'taskReading' },
  { key: 'creating', labelKey: 'taskCreating' },
  { key: 'design', labelKey: 'taskDesign' },
  { key: 'exam', labelKey: 'taskExam' },
  { key: 'work', labelKey: 'taskWork' },
  { key: 'meditation', labelKey: 'taskMeditation' },
  { key: 'coding', labelKey: 'taskCoding' },
  { key: 'custom', labelKey: 'taskCustom' },
];

const APP_SWITCH_WARNING_DELAY_SECONDS = 0.35;
const APP_SWITCH_DIRECT_FAIL_MS = 10000;
const FOCUS_GRACE_EXIT_SECONDS = 5;

export default function SelectScreen() {
  function clampFocusMinutes(value) {
    return Math.min(120, Math.max(1, value || 1));
  }

  const g = useGame();
  const ss = createStyles(C);
  const nav = useNavigation();
  const { t, lang, aliveCats, focusCats, selCat, setSel, focusMin, startFocus, handleInterrupt, handleComplete, handleFocusDistraction, pauseFocusForSystemInterruption, timeLeft, totalTime, interrupts, currentFocusTask, sessionStartedAt, fState, result, setRes, cats, isTimerDone, setIsFocusing, audioPrefs, setAudioPrefs } = g;
  const zh = lang === 'zh';
  const NORMAL_BREEDS = ['orange', 'ragdoll', 'blue', 'maine', 'siamese', 'sphynx', 'devon', 'persian', 'garfield'];
  const [sub, setSub] = useState('select');
  const [cm, setCM] = useState('');
  const [selectedMinutes, setSelectedMinutes] = useState(() => clampFocusMinutes(focusMin));
  const [timePicked, setTimePicked] = useState(false);
  const [taskMenuOpen, setTaskMenuOpen] = useState(false);
  const [taskKey, setTaskKey] = useState('');
  const [customTask, setCustomTask] = useState('');
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  const [catOrder, setCatOrder] = useState([]);
  const [musicMenuOpen, setMusicMenuOpen] = useState(false);
  const [ruleGuideOpen, setRuleGuideOpen] = useState(false);
  const [newCatModalVisible, setNewCatModalVisible] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const focusLeftAtRef = useRef(0);
  const focusEnteredBackgroundRef = useRef(false);
  const reminderPendingRef = useRef(false);
  const shownNewCatIdRef = useRef(null);
  const focusExitTimerRef = useRef(null);
  const newCatBackdropOpacity = useRef(new Animated.Value(0)).current;
  const newCatCardAnim = useRef(new Animated.Value(0)).current;
  const newCatAvatarAnim = useRef(new Animated.Value(0)).current;
  const focusExitAnim = useRef(new Animated.Value(1)).current;
  const [focusExiting, setFocusExiting] = useState(false);
  const [graceRemainingSeconds, setGraceRemainingSeconds] = useState(FOCUS_GRACE_EXIT_SECONDS);
  const canPickTime = !!selCat;
  const canPickTask = !!selCat && timePicked;
  const ambientOptions = useMemo(() => ([
    { key: 'off', label: t('off') },
    { key: 'rain', label: t('rain') },
    { key: 'night', label: t('nightForest') },
    { key: 'bird', label: t('birdSound') },
  ]), [t]);
  const orderedCats = useMemo(() => {
    const availableCats = focusCats || aliveCats;
    const map = new Map(availableCats.map(cat => [cat.id, cat]));
    const preserved = catOrder.map(id => map.get(id)).filter(Boolean);
    const remaining = availableCats.filter(cat => !catOrder.includes(cat.id));
    return [...preserved, ...remaining];
  }, [aliveCats, catOrder, focusCats]);
  const selectedTaskLabel = useMemo(() => {
    if (!taskKey) return '';
    if (taskKey === 'custom') return customTask.trim();
    const opt = TASK_OPTIONS.find(item => item.key === taskKey);
    return opt ? t(opt.labelKey) : '';
  }, [taskKey, customTask, t]);
  const isTaskValid = !!selectedTaskLabel;
  const canStart = !!selCat && timePicked && isTaskValid;
  const focusTaskLabel = selectedTaskLabel || currentFocusTask;
  const isLockedFocus = sub === 'focus';

  useEffect(() => {
    const newCatId = result?.newCat?.id;
    if (!newCatId) {
      shownNewCatIdRef.current = null;
      setNewCatModalVisible(false);
      newCatBackdropOpacity.setValue(0);
      newCatCardAnim.setValue(0);
      newCatAvatarAnim.setValue(0);
      return;
    }
    if (shownNewCatIdRef.current === newCatId) return;

    shownNewCatIdRef.current = newCatId;
    setNewCatModalVisible(true);
    newCatBackdropOpacity.setValue(0);
    newCatCardAnim.setValue(0);
    newCatAvatarAnim.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(newCatBackdropOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(newCatCardAnim, {
          toValue: 1,
          friction: 7,
          tension: 78,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(newCatAvatarAnim, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [newCatAvatarAnim, newCatBackdropOpacity, newCatCardAnim, result?.newCat?.id]);

  const closeNewCatModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(newCatBackdropOpacity, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(newCatCardAnim, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNewCatModalVisible(false);
    });
  }, [newCatBackdropOpacity, newCatCardAnim]);

  const isNormalCat = (cat) => NORMAL_BREEDS.includes(cat?.breedId) && !cat?.isRare;
  const isOrangeCat = (cat) => cat?.breedId === 'orange' && !cat?.isRare;
  const isRareCat = (cat) => !!cat?.isRare;
  const getCatName = (cat) => N(cat?.name, lang) || (zh ? '猫咪' : 'Kitty');
  const getHungryCopy = (cat) => {
    if (isOrangeCat(cat)) {
      return {
        title: zh ? '小橘饿坏了' : 'Mochi Is Hungry',
        message: zh ? '饿得委屈巴巴，正在等你回来...' : 'Mochi is hungry and waiting for you...',
      };
    }
    if (isNormalCat(cat)) {
      return {
        title: zh ? '猫咪饿晕了' : 'Kitty Fainted From Hunger',
        message: zh ? `${getCatName(cat)} 饿得晕乎乎的，正在等你回来...` : `${getCatName(cat)} got so hungry it almost fainted and is waiting for you...`,
      };
    }
    if (isRareCat(cat)) {
      return {
        title: zh ? '稀有猫咪饿晕了' : 'Rare Kitty Fainted From Hunger',
        message: zh ? `${getCatName(cat)} 饿得头晕眼花，正在等你回来...` : `${getCatName(cat)} got dizzy from hunger and is waiting for you...`,
      };
    }
    return {
      title: t('hungryTitle'),
      message: `${N(cat?.name, lang)} ${t('hungryMsg')}`,
    };
  };

  const getLeaveCopy = (cat) => {
    if (isOrangeCat(cat)) {
      return {
        title: zh ? '小橘离家出走了' : 'Mochi Ran Away',
        message: zh ? '它太饿太难过，先离开家了...' : 'Mochi got too hungry and ran away...',
      };
    }
    if (isNormalCat(cat)) {
      return {
        title: zh ? '猫咪离家出走了' : 'Kitty Ran Away',
        message: zh ? `${getCatName(cat)} 太委屈了，离家出走了...` : `${getCatName(cat)} felt too hurt and ran away...`,
      };
    }
    if (isRareCat(cat)) {
      return {
        title: zh ? '稀有猫咪离家出走了' : 'Rare Kitty Ran Away',
        message: zh ? `${getCatName(cat)} 太委屈了，离家出走了...` : `${getCatName(cat)} felt too hurt and ran away...`,
      };
    }
    return {
      title: t('deadTitle'),
      message: `${N(cat?.name, lang)} ${t('deadMsg')}`,
    };
  };

  const getAppSwitchReminderCopy = useCallback(() => {
    return {
      title: zh ? '快回来专注' : 'Back to focus',
      body: zh
        ? '小猫还在等你。长时间离开会导致本轮专注失败。'
        : 'Your kitty is waiting. Staying away too long will fail this session.',
    };
  }, [zh]);

  useEffect(() => { if (sub === 'focus') setIsFocusing(true); else setIsFocusing(false); return () => setIsFocusing(false); }, [sub, setIsFocusing]);
  useEffect(() => {
    const unsubscribe = nav.addListener('beforeRemove', (event) => {
      if (!isLockedFocus) return;
      event.preventDefault();
    });
    return unsubscribe;
  }, [isLockedFocus, nav]);

  useEffect(() => {
    if (!isLockedFocus) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [isLockedFocus]);

  useEffect(() => {
    if (!isLockedFocus) {
      appStateRef.current = AppState.currentState;
      focusLeftAtRef.current = 0;
      focusEnteredBackgroundRef.current = false;
      reminderPendingRef.current = false;
      cancelFocusReminder();
      return undefined;
    }

    prepareFocusReminderPermission();
    const subscription = AppState.addEventListener('change', async nextState => {
      const prevState = appStateRef.current;
      const now = Date.now();
      const leavingFocus = prevState === 'active' && (nextState === 'inactive' || nextState === 'background');
      const returningFocus = nextState === 'active' && focusLeftAtRef.current > 0;

      if (leavingFocus) {
        focusLeftAtRef.current = now;
        reminderPendingRef.current = true;
        const reminderCopy = getAppSwitchReminderCopy();
        sendFocusReminder({
          title: reminderCopy.title,
          body: reminderCopy.body,
          delaySeconds: APP_SWITCH_WARNING_DELAY_SECONDS,
        });
      }
      if (nextState === 'background') {
        focusEnteredBackgroundRef.current = true;
      }

      if (returningFocus && reminderPendingRef.current) {
        const awayMs = now - focusLeftAtRef.current;
        const enteredBackground = focusEnteredBackgroundRef.current;
        focusLeftAtRef.current = 0;
        focusEnteredBackgroundRef.current = false;
        reminderPendingRef.current = false;
        await cancelFocusReminder();
        const interruptionContext = await consumeFocusInterruptionContext();
        const isSystemInterruption = String(interruptionContext || '').startsWith('system');
        const systemPausedMs = isSystemInterruption
          ? Number(String(interruptionContext).split(':')[1]) || awayMs
          : 0;

        if (isSystemInterruption) {
          const paused = pauseFocusForSystemInterruption(systemPausedMs);
          if (paused) {
            updateFocusActivity({
              lang,
              task: focusTaskLabel,
              durationSeconds: totalTime,
              timeLeft: paused.timeLeft,
              startedAt: paused.startedAt,
            });
          }
        } else if (interruptionContext !== 'lock' && enteredBackground) {
          const shouldFailImmediately = awayMs > APP_SWITCH_DIRECT_FAIL_MS;
          const distractionResult = handleFocusDistraction({ forceFail: shouldFailImmediately });
          if (distractionResult?.ended) {
            playFeedback(distractionResult.runaway ? 'dead' : 'hungry');
            setSub('result');
            appStateRef.current = nextState;
            return;
          }
        }
      }

      appStateRef.current = nextState;
    });

    return () => {
      cancelFocusReminder();
      subscription.remove();
    };
  }, [focusTaskLabel, getAppSwitchReminderCopy, handleFocusDistraction, isLockedFocus, lang, pauseFocusForSystemInterruption, totalTime]);

  useEffect(() => { if (isTimerDone && sub === 'focus') { playFeedback('complete'); handleComplete(); setSub('result'); } }, [isTimerDone, sub, handleComplete]);
  useEffect(() => {
    if (fState === 'running' && totalTime > 0) {
      setSub('focus');
      setTimePicked(true);
    }
  }, [fState, totalTime]);
  useEffect(() => {
    if (sub !== 'select' || fState === 'running' || result) return;
    if (typeof nav.canGoBack === 'function' && nav.canGoBack()) {
      nav.goBack();
    } else {
      nav.navigate('HomeMain');
    }
  }, [fState, nav, result, sub]);
  useEffect(() => {
    if (sub !== 'select') return;
    if (!cm) {
      setSelectedMinutes(clampFocusMinutes(focusMin));
    }
  }, [cm, focusMin, sub]);
  useEffect(() => {
    if (!canPickTask) {
      setTaskMenuOpen(false);
      setTaskKey('');
      setCustomTask('');
    }
  }, [canPickTask]);
  useEffect(() => {
    setCatOrder(prev => {
      const aliveIds = (focusCats || aliveCats).map(cat => cat.id);
      const preserved = prev.filter(id => aliveIds.includes(id));
      const remaining = aliveIds.filter(id => !preserved.includes(id));
      return [...preserved, ...remaining];
    });
  }, [aliveCats, focusCats]);

  useEffect(() => {
    const active = sub === 'focus';
    setFocusAmbientActive(active);
    if (!active) setMusicMenuOpen(false);
    if (!active) setRuleGuideOpen(false);
    if (active) {
      syncAmbientPlayback(audioPrefs, true);
    }
    return () => {
      setFocusAmbientActive(false);
    };
  }, [sub, audioPrefs]);

  useEffect(() => {
    if (sub !== 'focus') return;
    setFocusExiting(false);
    focusExitAnim.setValue(1);
  }, [focusExitAnim, sub]);

  useEffect(() => () => {
    if (focusExitTimerRef.current) clearTimeout(focusExitTimerRef.current);
  }, []);

  useEffect(() => {
    if (sub !== 'focus' || !sessionStartedAt) {
      setGraceRemainingSeconds(0);
      return undefined;
    }
    const updateGraceCountdown = () => {
      const elapsedMs = Math.max(0, Date.now() - Number(sessionStartedAt));
      const remaining = Math.max(0, Math.ceil(((FOCUS_GRACE_EXIT_SECONDS * 1000) - elapsedMs) / 1000));
      setGraceRemainingSeconds(remaining);
    };
    updateGraceCountdown();
    const timer = setInterval(updateGraceCountdown, 250);
    return () => clearInterval(timer);
  }, [sessionStartedAt, sub]);

  useEffect(() => {
    if (sub !== 'focus' || totalTime <= 0) {
      stopFocusActivity();
      return undefined;
    }

    const payload = {
      lang,
      task: focusTaskLabel,
      durationSeconds: totalTime,
      timeLeft: totalTime,
      startedAt: sessionStartedAt,
    };
    startFocusActivity(payload);
    return () => {
      stopFocusActivity();
    };
  }, [focusTaskLabel, lang, sessionStartedAt, sub, totalTime]);

  useEffect(() => {
    if (sub !== 'focus' || totalTime <= 0) return;
    updateFocusActivity({
      lang,
      task: focusTaskLabel,
      durationSeconds: totalTime,
      timeLeft,
      startedAt: sessionStartedAt,
    });
  }, [focusTaskLabel, lang, sessionStartedAt, sub, timeLeft, totalTime]);

  const setAmbientChoice = (choice) => {
    playFeedback('tap');
    if (choice === 'off') {
      setAudioPrefs(prev => ({ ...prev, ambientEnabled: false }));
      return;
    }
    setAudioPrefs(prev => ({ ...prev, ambientEnabled: true, ambientTrack: choice }));
  };

  const shareResult = async () => {
    const resultCat = result?.cat || cats.find(c => c.id === result?.catId);
    const msgs = {
      success: zh ? `我刚完成了 ${focusMin} 分钟专注！🎉 专注喵陪我一起加油～` : `Just completed ${focusMin} min focus! 🎉 FocusMeow keeps me on track~`,
      hungry: isOrangeCat(resultCat)
        ? (zh ? `专注被打断了，小橘饿坏了...下次一定要坚持住 💪 #专注喵` : `Focus got interrupted and Mochi is hungry... I'll do better next time 💪 #FocusMeow`)
        : isNormalCat(resultCat)
        ? (zh ? `专注被打断了，${getCatName(resultCat)} 都饿晕了...下次一定要坚持住 💪 #专注喵` : `Focus got interrupted and ${getCatName(resultCat)} almost fainted from hunger... I'll do better next time 💪 #FocusMeow`)
        : isRareCat(resultCat)
        ? (zh ? `专注被打断了，${getCatName(resultCat)} 都饿晕了...下次一定要坚持住 💪 #专注喵` : `Focus got interrupted and ${getCatName(resultCat)} almost fainted from hunger... I'll do better next time 💪 #FocusMeow`)
        : (zh ? `专注被打断了...下次一定要坚持住 💪 #专注喵` : `Focus interrupted... will do better next time 💪 #FocusMeow`),
      dead: isOrangeCat(resultCat)
        ? (zh ? `这次没坚持住，小橘离家出走了，我要把它找回来！😤 #专注喵` : `I couldn't make it and Mochi ran away... I'll bring it back! 😤 #FocusMeow`)
        : isNormalCat(resultCat)
        ? (zh ? `这次没坚持住，${getCatName(resultCat)} 离家出走了，我要把它找回来！😤 #专注喵` : `I couldn't make it and ${getCatName(resultCat)} ran away... I'll bring it back! 😤 #FocusMeow`)
        : isRareCat(resultCat)
        ? (zh ? `这次没坚持住，${getCatName(resultCat)} 离家出走了，我要把它找回来！😤 #专注喵` : `I couldn't make it and ${getCatName(resultCat)} ran away... I'll bring it back! 😤 #FocusMeow`)
        : (zh ? `这次没坚持住，但我还会再来的！😤 #专注喵` : `Didn't make it, but I'll try again! 😤 #FocusMeow`),
    };
    const message = result ? (msgs[result.type] || msgs.success) : msgs.success;
    const shareSource = resultCat
      ? ((CAT_IMAGES[resultCat.breedId] || CAT_IMAGES.orange).happy
        || (CAT_IMAGES[resultCat.breedId] || CAT_IMAGES.orange).sit1
        || CAT_IMAGES.orange.sit1)
      : CAT_IMAGES.orange.happy || CAT_IMAGES.orange.sit1;
    try {
      await shareImageWithMessage({
        title: zh ? '专注喵分享' : 'Focus Meow Share',
        message,
        imageSource: shareSource,
        filename: `focusmeow-result-${resultCat?.breedId || 'orange'}.png`,
      });
    } catch(e) { Alert.alert("分享失败", String(e?.message || e)); }
  };

  const doStart = () => {
    if (!selCat) {
      Alert.alert(zh ? '提示' : 'Tip', t('chooseCatFirst'));
      return;
    }
    if (!timePicked) {
      Alert.alert(zh ? '提示' : 'Tip', t('chooseTimeFirst'));
      return;
    }
    if (!isTaskValid) {
      Alert.alert(zh ? '提示' : 'Tip', t('chooseTaskFirst'));
      return;
    }
    if (g.guestMode) {
      const ok = consumeGuestAction('focus');
      if (!ok) {
        Alert.alert(g.lang==='zh' ? '提示' : 'Limit', g.lang==='zh' ? '游客每天只能专注 2 次，注册解锁无限次数' : 'Guests: 2 focus sessions/day. Register for unlimited!');
        return;
      }
    }
    playFeedback('tap');
    startFocus(selectedTaskLabel, selectedMinutes);
    setTaskMenuOpen(false);
    setSub('focus');
  };
  const returnHomeAfterGraceExit = useCallback(() => {
    if (focusExiting) return;
    setFocusExiting(true);
    setIsFocusing(false);
    setMusicMenuOpen(false);
    setRuleGuideOpen(false);
    cancelFocusReminder();
    stopFocusActivity();

    Animated.timing(focusExitAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSub('select');
      focusExitTimerRef.current = setTimeout(() => {
        if (typeof nav.popToTop === 'function') {
          nav.popToTop();
        } else {
          nav.navigate('HomeMain');
        }
        focusExitAnim.setValue(1);
        setFocusExiting(false);
      }, 16);
    });
  }, [focusExiting, focusExitAnim, nav, setIsFocusing]);

  const doInterrupt = () => {
    if (focusExiting) return;
    const inGraceWindow = !!sessionStartedAt && (Date.now() - Number(sessionStartedAt) < 5000);
    const interruptResult = handleInterrupt();
    if (interruptResult?.graceExit || inGraceWindow) {
      playFeedback('tap');
      returnHomeAfterGraceExit();
      return;
    }
    playFeedback(interrupts >= 1 ? 'dead' : 'hungry');
    setSub('result');
  };
  const selectCatFromRail = (catId, moveToFront = false) => {
    playFeedback('tap');
    setSel(catId);
    if (moveToFront) {
      setCatOrder(prev => [catId, ...prev.filter(id => id !== catId)]);
    }
  };

  if (sub==='select') return (
    <>
      <ScrollView
        style={[ss.c,{backgroundColor:C.bg}]}
        contentContainerStyle={{padding:20,paddingBottom:110,paddingTop:70}}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={ss.h}>{t('selectCat')}</Text>
        <Text style={ss.sub}>{t('selectSub')}</Text>

        <View style={ss.flowCard}>
          <View style={ss.stepHeader}>
            <View style={ss.stepBadge}><Text style={ss.stepBadgeText}>1</Text></View>
            <View style={ss.stepHeaderBody}>
              <Text style={ss.stepTitle}>{t('step1')} · {t('selectCat').replace('🐾 ','')}</Text>
              <Text style={ss.stepHint}>{t('stepPickCat')}</Text>
            </View>
            <View style={ss.stepActions}>
              {selCat ? <Text style={ss.stepDone}>{zh ? '已选择' : 'Done'}</Text> : null}
              <TouchableOpacity style={ss.plusBtn} onPress={() => setCatPickerOpen(true)}>
                <Text style={ss.plusBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.catRail}>
            {orderedCats.map(cat=>{
              const px=cat.xp-totXp(cat.level),nx=xpFor(cat.level);
              return (
                <TouchableOpacity key={cat.id} style={[ss.railCard, cat.runaway && ss.runawayCard, selCat===cat.id&&ss.sel]} onPress={()=>selectCatFromRail(cat.id)}>
                  <View style={cat.runaway ? ss.runawayAvatar : null}>
                    <CatAvatar breedId={cat.breedId} level={cat.level} state={cat.runaway ? 'left' : 'idle'} size={76} isRare={cat.isRare} rareType={cat.rareType} breed2={cat.breed2} rounded={12}/>
                  </View>
                  <Text style={ss.cn} numberOfLines={1}>{N(cat.name,lang)}</Text>
                  {cat.runaway ? <Text style={ss.rescueTiny}>{zh ? '找回中' : 'Rescue'}</Text> : null}
                  <View style={ss.xb}><View style={[ss.xf,{width:`${Math.min(100,(px/nx)*100)}%`}]}/></View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={[ss.flowCard, !canPickTime && ss.flowCardDisabled]}>
          <View style={ss.stepHeader}>
            <View style={ss.stepBadge}><Text style={ss.stepBadgeText}>2</Text></View>
            <View style={ss.stepHeaderBody}>
              <Text style={ss.stepTitle}>{t('step2')} · {t('focusTime').replace('⏱ ','')}</Text>
              <Text style={ss.stepHint}>{canPickTime ? t('stepPickTime') : t('taskNeedCat')}</Text>
            </View>
            {timePicked ? <Text style={ss.stepDone}>{selectedMinutes}{t('min')}</Text> : null}
          </View>
          <View style={ss.ps}>{[['h10m',15],['h30m',30],['h45m',45],['h1h',60]].map(([k,m])=>
            <TouchableOpacity
              key={m}
              disabled={!canPickTime}
              style={[ss.p,selectedMinutes===m&&!cm&&timePicked&&ss.pa,!canPickTime&&ss.pDisabled]}
              onPress={()=>{
                playFeedback('tap');
                setSelectedMinutes(m);
                setCM('');
                setTimePicked(true);
              }}
            >
              <Text style={[ss.pt,selectedMinutes===m&&!cm&&timePicked&&{color:'#fff',fontWeight:'700'},!canPickTime&&ss.ptDisabled]}>{t(k)}</Text>
            </TouchableOpacity>
          )}</View>
          <TextInput
            editable={canPickTime}
            style={[ss.inp,!canPickTime&&ss.inpDisabled]}
            placeholder={`${t('custom')}（1-120）`}
            placeholderTextColor={C.outline}
            keyboardType="number-pad"
            value={cm}
            onChangeText={v=>{
              const digits = v.replace(/\D/g, '').slice(0, 3);
              setCM(digits);
              if(digits){
                setSelectedMinutes(clampFocusMinutes(parseInt(digits, 10)));
                setTimePicked(true);
              } else {
                setTimePicked(false);
              }
            }}
          />
        </View>

        <View style={[ss.flowCard, !canPickTask && ss.flowCardDisabled]}>
          <View style={ss.stepHeader}>
            <View style={ss.stepBadge}><Text style={ss.stepBadgeText}>3</Text></View>
            <View style={ss.stepHeaderBody}>
              <Text style={ss.stepTitle}>{t('step3')} · {t('taskTitle').replace('📝 ','')}</Text>
              <Text style={ss.stepHint}>{canPickTask ? t('stepPickTask') : t('taskNeedTime')}</Text>
            </View>
            {isTaskValid ? <Text style={ss.stepDone}>{selectedTaskLabel}</Text> : null}
          </View>
          <TouchableOpacity
            disabled={!canPickTask}
            style={[ss.dropdownTrigger,!canPickTask&&ss.inpDisabled,taskMenuOpen&&ss.dropdownTriggerOpen]}
            onPress={()=>{
              Keyboard.dismiss();
              playFeedback('tap');
              setTaskMenuOpen(v => !v);
            }}
          >
            <Text style={[ss.dropdownText,!selectedTaskLabel&&ss.dropdownPlaceholder,!canPickTask&&ss.ptDisabled]}>
              {selectedTaskLabel || t('taskPlaceholder')}
            </Text>
            <Text style={[ss.dropdownArrow,taskMenuOpen&&ss.dropdownArrowOpen]}>⌄</Text>
          </TouchableOpacity>
          {taskMenuOpen && canPickTask ? (
            <View style={ss.dropdownMenu}>
              {TASK_OPTIONS.map(item => {
                const active = taskKey === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[ss.dropdownOption,active&&ss.dropdownOptionActive]}
                    onPress={()=>{
                      playFeedback('tap');
                      setTaskKey(item.key);
                      if (item.key !== 'custom') setTaskMenuOpen(false);
                    }}
                  >
                    <Text style={[ss.dropdownOptionText,active&&ss.dropdownOptionTextActive]}>{t(item.labelKey)}</Text>
                    {active ? <Text style={ss.dropdownCheck}>✓</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
          {taskKey === 'custom' && canPickTask ? (
            <TextInput
              style={[ss.inp,{marginBottom:0,marginTop:10}]}
              placeholder={t('taskCustomPlaceholder')}
              placeholderTextColor={C.outline}
              value={customTask}
              onChangeText={setCustomTask}
            />
          ) : null}
        </View>

        <View style={{flexDirection:'row',gap:10}}>
          <TouchableOpacity style={[ss.btn2,{flex:1}]} onPress={()=>nav.goBack()}><Text style={ss.bt2}>{t('back')}</Text></TouchableOpacity>
          <TouchableOpacity style={[ss.btn,{flex:2,opacity:canStart?1:0.45}]} disabled={!canStart} onPress={doStart}>
            <Text style={ss.bt}>{t('start')} {selectedMinutes}{t('min')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={catPickerOpen} transparent animationType="fade" onRequestClose={() => setCatPickerOpen(false)}>
        <TouchableOpacity style={ss.modalBackdrop} activeOpacity={1} onPress={() => setCatPickerOpen(false)}>
          <View style={ss.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={ss.modalTitle}>{zh ? '选择猫咪' : 'Choose Cat'}</Text>
            <Text style={ss.modalSub}>{zh ? '选择后会自动放到第一位' : 'Selected cat will move to the first slot'}</Text>
            <ScrollView style={ss.modalList} showsVerticalScrollIndicator={false}>
              <View style={ss.modalGrid}>
                {orderedCats.map(cat => {
                  const px = cat.xp - totXp(cat.level);
                  const nx = xpFor(cat.level);
                  return (
                    <TouchableOpacity
                      key={cat.id}
	                      style={[ss.modalCatCard, cat.runaway && ss.runawayCard, selCat === cat.id && ss.sel]}
                      onPress={() => {
                        selectCatFromRail(cat.id, true);
                        setCatPickerOpen(false);
                      }}
                    >
	                      <View style={cat.runaway ? ss.runawayAvatar : null}>
	                        <CatAvatar breedId={cat.breedId} level={cat.level} state={cat.runaway ? 'left' : 'idle'} size={62} isRare={cat.isRare} rareType={cat.rareType} breed2={cat.breed2} rounded={12}/>
	                      </View>
	                      <Text style={ss.cn} numberOfLines={1}>{N(cat.name,lang)}</Text>
	                      {cat.runaway ? <Text style={ss.rescueTiny}>{zh ? '找回中' : 'Rescue'}</Text> : null}
                      <View style={ss.xb}><View style={[ss.xf,{width:`${Math.min(100,(px/nx)*100)}%`}]}/></View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <TouchableOpacity style={ss.modalCloseBtn} onPress={() => setCatPickerOpen(false)}>
              <Text style={ss.bt2}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );

  if (sub==='focus') {
    const cat=cats.find(c=>c.id===selCat);
    const prog=totalTime>0?(totalTime-timeLeft)/totalTime:0;
    const encList = lang==='zh' ? ['加油喵！','你最棒！','专注中...','继续保持！','快完成啦！','别放弃喵~','太厉害了！','稳住！'] : ['Keep going!','You rock!','Focusing...','Almost there!','Stay strong!','Great job!','Dont stop!','You got this!'];
    const encText = encList[Math.floor(timeLeft / 15) % encList.length];
    const warnText = interrupts === 0
      ? t('keepFocus')
      : isOrangeCat(cat)
      ? (lang === 'zh' ? '⚠️ 已中断1次，再中断小橘就会离家出走！' : '⚠️ Interrupted once. One more time and Mochi will run away!')
      : isNormalCat(cat)
      ? (lang === 'zh' ? '⚠️ 已中断1次，再中断一次猫咪就会离家出走！' : '⚠️ Interrupted once. One more time and your kitty will run away!')
      : isRareCat(cat)
      ? (lang === 'zh' ? '⚠️ 已中断1次，再中断一次稀有猫咪就会离家出走！' : '⚠️ Interrupted once. One more time and your rare kitty will run away!')
      : t('warnDie');
    const showGraceHint = graceRemainingSeconds > 0 && !focusExiting;
    const giveUpText = showGraceHint ? `${t('giveUp')} ${graceRemainingSeconds}s` : t('giveUp');
    const ruleLines = zh
      ? [
          '切出 App 后，小猫会立刻提醒你回来。',
          '10 秒内回来：记 1 次中断。',
          '本轮第 2 次切出：专注失败。',
          '单次离开超过 10 秒：直接失败。',
          '接听电话、语音或视频不算失败，倒计时会暂停，结束后继续。',
        ]
      : [
          'Leaving the app triggers a quick reminder.',
          'Back within 10s: counts as 1 interruption.',
          'Leaving a second time fails this session.',
          'Away for over 10s: fails immediately.',
          'Calls, voice, and video chats do not count; the timer pauses and resumes after.',
        ];
    return (
      <Animated.View
        style={[
          ss.c,
          {
            backgroundColor: C.bg,
            opacity: focusExitAnim,
            transform: [
              {
                translateY: focusExitAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
              {
                scale: focusExitAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.97, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingTop:70,paddingBottom:10}}>
          <View style={{flexDirection:'row',alignItems:'center'}}><Image source={require('../assets/first_logo.png')} style={{width:28,height:28,borderRadius:14,marginRight:8}} /><Text style={{color:C.primary,fontSize:15,fontWeight:'700'}}>Focus Meow</Text></View>
          <View style={ss.focusTopActions}>
            <TouchableOpacity
              style={ss.musicIconBtn}
              onPress={() => {
                playFeedback('tap');
                setMusicMenuOpen(false);
                setRuleGuideOpen(true);
              }}
            >
              <Text style={ss.ruleIconText}>?</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={ss.musicIconBtn}
              onPress={() => {
                playFeedback('tap');
                setRuleGuideOpen(false);
                setMusicMenuOpen(v => !v);
              }}
            >
              <Text style={ss.musicIconText}>{audioPrefs?.ambientEnabled ? '♫' : '🔇'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {musicMenuOpen ? (
          <View style={ss.focusMusicPanel}>
            <Text style={ss.focusMusicTitle}>{t('focusMusic')}</Text>
            <Text style={ss.focusMusicHint}>{encText}</Text>
            <View style={ss.focusAmbientBar}>
              {ambientOptions.map(item => {
                const active = item.key === 'off'
                  ? !audioPrefs?.ambientEnabled
                  : audioPrefs?.ambientEnabled && audioPrefs?.ambientTrack === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[ss.focusAmbientChip, active && ss.focusAmbientChipActive]}
                    onPress={() => {
                      setAmbientChoice(item.key);
                      setMusicMenuOpen(false);
                    }}
                  >
                    <Text style={[ss.focusAmbientText, active && ss.focusAmbientTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}
        <View style={{flex:1,alignItems:'center',justifyContent:'center',paddingBottom:40}}>
          {focusTaskLabel ? <Text style={ss.focusTaskTop}>{t('taskCurrent')}：{focusTaskLabel}</Text> : null}
          <CircularTimer progress={prog} timeLeft={timeLeft} size={240}/>
          <View style={{marginTop:28}}><CatAvatar breedId={cat?.breedId||'orange'} level={cat?.level||1} state="eating" size={140} rounded={22} isRare={cat?.isRare} rareType={cat?.rareType} breed2={cat?.breed2}/></View>
          <Text style={{color:C.tertiary,fontWeight:'700',fontSize:18,marginTop:16}}>{N(cat?.name,lang)} {t('eating')}</Text>
          <Text style={{color:C.onSurfaceVariant,fontSize:13,textAlign:'center',marginTop:10,maxWidth:260,lineHeight:20}}>{warnText}</Text>
          <TouchableOpacity style={[ss.danger, focusExiting && ss.dangerDisabled]} onPress={doInterrupt} disabled={focusExiting}><Text style={ss.dangerT}>{giveUpText}</Text></TouchableOpacity>
          {showGraceHint ? <Text style={ss.graceHint}>{zh ? '5s内退出可取消任务' : 'Exit within 5s to cancel this task'}</Text> : null}
        </View>
        <Modal visible={ruleGuideOpen} transparent animationType="fade" onRequestClose={() => setRuleGuideOpen(false)}>
          <TouchableOpacity style={ss.modalBackdrop} activeOpacity={1} onPress={() => setRuleGuideOpen(false)}>
            <View style={ss.focusRuleModalCard} onStartShouldSetResponder={() => true}>
              <Text style={ss.focusRuleModalTitle}>{zh ? '专注守护规则' : 'Focus guard rules'}</Text>
              {ruleLines.map((line, index) => (
                <View key={line} style={ss.ruleLine}>
                  <Text style={ss.ruleBullet}>{index + 1}</Text>
                  <Text style={ss.ruleText}>{line}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={ss.focusRuleCloseBtn}
                onPress={() => {
                  playFeedback('tap');
                  setRuleGuideOpen(false);
                }}
              >
                <Text style={ss.focusRuleCloseText}>{zh ? '我知道了' : 'Got it'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </Animated.View>
    );
  }

  if (sub==='result'&&result) {
    const cat=result.cat || cats.find(c=>c.id===result.catId);
    const newCat = result.newCat;
    const cheer = result.type==='success' ? CHEERS[lang]?.[Math.floor(Math.random()*CHEERS[lang].length)]||'' : '';
    const hungryCopy = getHungryCopy(cat);
    const leaveCopy = getLeaveCopy(cat);
    return (
      <View style={{flex:1,backgroundColor:C.bg}}><ScrollView style={{flex:1}} contentContainerStyle={{padding:20,alignItems:'center',justifyContent:'center',minHeight:'100%'}}>
        {result.type==='success'&&<View style={{alignItems:'center',width:'100%'}}>
          <LottieView source={require('../assets/celebrate.json')} autoPlay loop={false} style={{width:260,height:260,position:'absolute',top:-120}} pointerEvents='none' />
          <Text style={{color:C.tertiary,fontSize:22,fontWeight:'800',marginTop:10,marginBottom:16}}>{t('complete')}</Text>
          <CatAvatar breedId={cat?.breedId||'orange'} level={cat?.level||1} state="complete" size={150} rounded={16}/>
          <Text style={{color:C.primary,fontWeight:'700',marginTop:14,marginBottom:6}}>{N(cat?.name,lang)} +5 XP</Text>
          <Text style={ss.cheer}>{cheer}</Text>
	          {(result.rescuedCats || []).map(rescued => (
	            <View key={rescued.id} style={ss.rc}><CatAvatar breedId={rescued.breedId} level={rescued.level || 1} state="complete" size={50} rounded={10} isRare={rescued.isRare} rareType={rescued.rareType} breed2={rescued.breed2}/><Text style={{color:C.primaryContainer,fontWeight:'700',flex:1,marginLeft:10}}>{zh ? '找回猫咪' : 'Rescued'} {N(rescued.name,lang)}</Text></View>
	          ))}
        </View>}
        {result.type==='hungry'&&<View style={{alignItems:'center',paddingTop:60}}>
          <LottieView source={require('../assets/ewwww_shit.json')} autoPlay loop={false} style={{width:220,height:220,position:'absolute',top:-130}} pointerEvents='none' />
          <Text style={{color:C.tertiaryContainer,fontSize:22,fontWeight:'800',marginTop:10,marginBottom:16}}>{hungryCopy.title}</Text><CatAvatar breedId={cat?.breedId||'orange'} level={cat?.level||1} state="hungry" size={160} rounded={16}/><Text style={{color:C.error,fontWeight:'600',marginTop:20,fontSize:15}}>{hungryCopy.message}</Text></View>}
        {result.type==='dead'&&<View style={{alignItems:'center',paddingTop:60}}>
          <LottieView source={require('../assets/ewwww_shit.json')} autoPlay loop={false} style={{width:220,height:220,position:'absolute',top:-130}} pointerEvents='none' />
	          {leaveCopy.title ? <Text style={{color:C.error,fontSize:22,fontWeight:'800',marginTop:10,marginBottom:16}}>{leaveCopy.title}</Text> : null}<View style={{opacity:0.42}}><CatAvatar breedId={cat?.breedId||'orange'} level={cat?.level||1} state="left" size={160} rounded={16}/></View><Text style={{color:C.onSurfaceVariant,fontWeight:'600',marginTop:14,textAlign:'center',lineHeight:21}}>{leaveCopy.message}</Text><Text style={{color:C.tertiaryContainer,fontSize:12,textAlign:'center',marginTop:16}}>{lang==='zh'?'去「猫咪」里的猫咪仓库，可以接取找回任务。':'Open Cats > Cat Warehouse to start a rescue quest.'}</Text></View>}
        <View style={{flexDirection:'row',gap:10,marginTop:24,width:'100%'}}>
          <TouchableOpacity
            style={[ss.btn,{flex:1}]}
            onPress={() => {
              setRes(null);
              if (typeof nav.canGoBack === 'function' && nav.canGoBack()) {
                nav.goBack();
              } else {
                nav.navigate('HomeMain');
              }
            }}
          >
            <Text style={ss.bt}>{zh ? '返回首页' : 'Back Home'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[ss.btn2,{flex:1}]} onPress={shareResult}><Text style={ss.bt2}>{zh ? '分享' : 'Share'}</Text></TouchableOpacity>
        </View>
      </ScrollView>
        {newCat ? (
          <Modal visible={newCatModalVisible} transparent animationType="none" onRequestClose={closeNewCatModal}>
            <Animated.View style={[ss.newCatModalOverlay, { opacity: newCatBackdropOpacity }]}>
              <Animated.View
                style={[
                  ss.newCatModalCard,
                  {
                    transform: [
                      {
                        translateY: newCatCardAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [34, 0],
                        }),
                      },
                      {
                        scale: newCatCardAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.88, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LottieView
                  source={require('../assets/fireworks.json')}
                  autoPlay
                  loop={false}
                  style={ss.newCatFireworks}
                  pointerEvents="none"
                />
                <Text style={ss.newCatKicker}>{newCat.isRare ? t('rareCat') : t('newCat')}</Text>
                <Text style={ss.newCatTitle}>{zh ? '获得新猫咪' : 'New Kitty Unlocked'}</Text>
                <Animated.View
                  style={[
                    ss.newCatAvatarWrap,
                    {
                      transform: [
                        {
                          scale: newCatAvatarAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.72, 1],
                          }),
                        },
                        {
                          translateY: newCatAvatarAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [18, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <CatAvatar
                    breedId={newCat.breedId}
                    level={1}
                    state="complete"
                    size={210}
                    rounded={28}
                    isRare={newCat.isRare}
                    rareType={newCat.rareType}
                    breed2={newCat.breed2}
                  />
                </Animated.View>
                <Text style={ss.newCatName}>{N(newCat.name, lang)}</Text>
                <Text style={ss.newCatDesc}>
                  {zh ? '它已经加入你的猫咪仓库，之后可以一起专注啦。' : 'It has joined your cat collection and can focus with you now.'}
                </Text>
                <TouchableOpacity style={ss.newCatConfirmBtn} onPress={closeNewCatModal} activeOpacity={0.86}>
                  <Text style={ss.newCatConfirmText}>{zh ? '收下猫咪' : 'Claim Kitty'}</Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </Modal>
        ) : null}
      </View>
    );
  }
  return <View style={[ss.c,{backgroundColor:C.bg}]}><Text style={{color:C.onSurface}}>Loading...</Text></View>;
}

const createStyles = (C) => StyleSheet.create({
  c:{flex:1},h:{fontSize:24,fontWeight:'900',color:C.tertiary,marginBottom:3},sub:{color:C.onSurfaceVariant,fontSize:12,marginBottom:16},
  flowCard:{backgroundColor:C.surfaceContainerLowest,borderRadius:24,padding:16,marginBottom:16,borderWidth:1,borderColor:C.border,shadowColor:C.shadow.shadowColor,shadowOpacity:0.05,shadowRadius:14,shadowOffset:{width:0,height:6}},
  flowCardDisabled:{opacity:0.72},
  stepHeader:{flexDirection:'row',alignItems:'center',marginBottom:14},
  stepHeaderBody:{flex:1},
  stepActions:{flexDirection:'row',alignItems:'center',gap:8},
  stepBadge:{width:28,height:28,borderRadius:14,backgroundColor:C.primaryFixed,alignItems:'center',justifyContent:'center',marginRight:10},
  stepBadgeText:{color:C.primary,fontSize:13,fontWeight:'800'},
  stepTitle:{color:C.tertiary,fontSize:15,fontWeight:'800'},
  stepHint:{color:C.onSurfaceVariant,fontSize:12,marginTop:2},
  stepDone:{color:C.primary,fontSize:11,fontWeight:'700',backgroundColor:C.primaryFixed,paddingHorizontal:10,paddingVertical:5,borderRadius:999},
  plusBtn:{width:32,height:32,borderRadius:16,backgroundColor:C.surfaceContainerLow,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'},
  plusBtnText:{color:C.primary,fontSize:22,fontWeight:'500',lineHeight:24},
  catRail:{paddingRight:8},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  card:{width:'30%',backgroundColor:C.surfaceContainerLow,borderRadius:20,padding:10,alignItems:'center',borderWidth:1,borderColor:'transparent'},
  railCard:{width:112,backgroundColor:C.surfaceContainerLow,borderRadius:20,padding:10,alignItems:'center',borderWidth:1,borderColor:'transparent',marginRight:10},
  runawayCard:{borderColor:'rgba(208,107,107,0.28)',borderStyle:'dashed'},
  runawayAvatar:{opacity:0.38},
  rescueTiny:{color:C.error,fontSize:10,fontWeight:'700',marginTop:2},
  sel:{backgroundColor:C.primaryFixed},cn:{color:C.tertiary,fontWeight:'700',fontSize:11,marginTop:2},
  xb:{width:'88%',height:5,backgroundColor:C.surfaceContainerHigh,borderRadius:10,overflow:'hidden',marginTop:4},
  xf:{height:'100%',backgroundColor:C.primaryContainer,borderRadius:10},
  ps:{flexDirection:'row',gap:8,marginBottom:12},
  p:{backgroundColor:C.surfaceContainerHigh,borderRadius:16,paddingVertical:10,paddingHorizontal:16},
  pDisabled:{opacity:0.5},
  pa:{backgroundColor:C.primaryContainer},pt:{color:C.tertiary,fontSize:13,fontWeight:'600'},
  ptDisabled:{color:C.outline},
  inp:{backgroundColor:C.surfaceContainerLow,borderRadius:16,padding:12,color:C.onSurface,fontSize:15,marginBottom:0,borderWidth:1,borderColor:'transparent'},
  inpDisabled:{opacity:0.55},
  dropdownTrigger:{backgroundColor:C.surfaceContainerLow,borderRadius:16,paddingHorizontal:14,paddingVertical:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:'transparent'},
  dropdownTriggerOpen:{borderColor:C.primaryFixedDim},
  dropdownText:{color:C.onSurface,fontSize:15,flex:1,paddingRight:12},
  dropdownPlaceholder:{color:C.outline},
  dropdownArrow:{color:C.outline,fontSize:18,fontWeight:'700'},
  dropdownArrowOpen:{transform:[{rotate:'180deg'}]},
  dropdownMenu:{marginTop:10,backgroundColor:C.surfaceContainerLow,borderRadius:18,padding:6,borderWidth:1,borderColor:C.border},
  dropdownOption:{borderRadius:14,paddingHorizontal:12,paddingVertical:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  dropdownOptionActive:{backgroundColor:C.primaryFixed},
  dropdownOptionText:{color:C.onSurface,fontSize:14,fontWeight:'600'},
  dropdownOptionTextActive:{color:C.primary},
  dropdownCheck:{color:C.primary,fontSize:14,fontWeight:'800'},
  modalBackdrop:{flex:1,backgroundColor:C.overlay,justifyContent:'center',padding:20},
  modalCard:{backgroundColor:C.surfaceContainerLowest,borderRadius:24,padding:18,borderWidth:1,borderColor:C.border,shadowColor:C.shadow.shadowColor,shadowOpacity:0.08,shadowRadius:18,shadowOffset:{width:0,height:8}},
  modalTitle:{color:C.tertiary,fontSize:18,fontWeight:'800'},
  modalSub:{color:C.onSurfaceVariant,fontSize:12,marginTop:4,marginBottom:14},
  modalList:{maxHeight:420},
  modalGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  modalCatCard:{width:'31%',backgroundColor:C.surfaceContainerLow,borderRadius:18,padding:10,alignItems:'center',borderWidth:1,borderColor:'transparent'},
  modalCloseBtn:{backgroundColor:C.surfaceContainerHigh,borderRadius:16,padding:12,alignItems:'center',marginTop:14},
  btn:{backgroundColor:C.primary,borderRadius:9999,padding:14,alignItems:'center',shadowColor:C.primary,shadowOpacity:0.15,shadowRadius:20,shadowOffset:{width:0,height:10}},
  bt:{color:'#fff',fontSize:16,fontWeight:'700'},
  btn2:{backgroundColor:C.surfaceContainerHigh,borderRadius:16,padding:12,alignItems:'center'},bt2:{color:C.onSurface,fontSize:14,fontWeight:'600'},
  danger:{backgroundColor:C.secondaryContainer,borderRadius:9999,paddingVertical:12,paddingHorizontal:24,marginTop:20},
  dangerDisabled:{opacity:0.7},
  dangerT:{color:C.secondary,fontSize:14,fontWeight:'600'},
  graceHint:{color:C.onSurfaceVariant,fontSize:12,fontWeight:'600',marginTop:8},
  focusTopActions:{flexDirection:'row',alignItems:'center',gap:8},
  musicIconBtn:{width:40,height:40,borderRadius:20,backgroundColor:C.floatCard,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.border,shadowColor:C.shadow.shadowColor,shadowOpacity:0.08,shadowRadius:14,shadowOffset:{width:0,height:6}},
  musicIconText:{fontSize:18},
  ruleIconText:{fontSize:17,color:C.primary,fontWeight:'900'},
  focusMusicPanel:{marginHorizontal:20,marginTop:4,marginBottom:-6,backgroundColor:C.floatCard,borderRadius:20,paddingHorizontal:14,paddingVertical:12,borderWidth:1,borderColor:C.border,shadowColor:C.shadow.shadowColor,shadowOpacity:0.08,shadowRadius:16,shadowOffset:{width:0,height:6}},
  focusRuleModalCard:{width:'100%',maxWidth:360,backgroundColor:C.surface,borderRadius:26,paddingHorizontal:20,paddingTop:22,paddingBottom:18,shadowColor:C.shadow.shadowColor,shadowOpacity:0.14,shadowRadius:24,shadowOffset:{width:0,height:14}},
  focusRuleModalTitle:{color:C.tertiary,fontSize:18,fontWeight:'800',textAlign:'center',marginBottom:10},
  focusMusicTitle:{color:C.tertiary,fontSize:13,fontWeight:'700'},
  focusMusicHint:{color:C.onSurfaceVariant,fontSize:11,marginTop:4},
  ruleLine:{flexDirection:'row',alignItems:'flex-start',gap:8,marginTop:9},
  ruleBullet:{width:18,height:18,borderRadius:9,backgroundColor:C.primaryFixed,color:C.primary,fontSize:10,fontWeight:'900',textAlign:'center',lineHeight:18,overflow:'hidden'},
  ruleText:{flex:1,color:C.onSurfaceVariant,fontSize:12,lineHeight:18,fontWeight:'600'},
  focusRuleCloseBtn:{marginTop:18,height:46,borderRadius:16,backgroundColor:C.primary,alignItems:'center',justifyContent:'center'},
  focusRuleCloseText:{color:'#fff',fontSize:14,fontWeight:'800'},
  focusTaskTop:{color:C.primary,fontSize:13,fontWeight:'700',marginTop:-18,marginBottom:28,backgroundColor:C.primaryFixed,paddingHorizontal:12,paddingVertical:6,borderRadius:999},
  focusAmbientBar:{flexDirection:'row',gap:8,marginTop:10,flexWrap:'wrap'},
  focusAmbientChip:{backgroundColor:C.floatCard,borderRadius:999,paddingHorizontal:12,paddingVertical:7,borderWidth:1,borderColor:C.border},
  focusAmbientChipActive:{backgroundColor:C.primaryFixed,borderColor:C.primaryFixedDim},
  focusAmbientText:{color:C.tertiary,fontSize:12,fontWeight:'600'},
  focusAmbientTextActive:{color:C.primary,fontWeight:'700'},
  newCatModalOverlay:{
    flex:1,
    backgroundColor:'rgba(19,14,10,0.76)',
    alignItems:'center',
    justifyContent:'center',
    padding:22,
  },
  newCatModalCard:{
    width:'100%',
    maxWidth:360,
    minHeight:500,
    backgroundColor:C.surfaceContainerLowest,
    borderRadius:32,
    paddingHorizontal:24,
    paddingTop:30,
    paddingBottom:22,
    alignItems:'center',
    overflow:'hidden',
    borderWidth:1,
    borderColor:'rgba(255,255,255,0.58)',
    shadowColor:'#000',
    shadowOpacity:0.22,
    shadowRadius:28,
    shadowOffset:{width:0,height:18},
  },
  newCatFireworks:{
    position:'absolute',
    top:-62,
    width:430,
    height:430,
    opacity:0.96,
  },
  newCatKicker:{
    color:C.primary,
    fontSize:12,
    fontWeight:'900',
    letterSpacing:1.2,
    backgroundColor:C.primaryFixed,
    paddingHorizontal:14,
    paddingVertical:6,
    borderRadius:999,
    overflow:'hidden',
  },
  newCatTitle:{
    color:C.tertiary,
    fontSize:26,
    fontWeight:'900',
    marginTop:14,
    letterSpacing:0.5,
  },
  newCatAvatarWrap:{
    marginTop:22,
    width:238,
    height:238,
    borderRadius:34,
    alignItems:'center',
    justifyContent:'center',
    backgroundColor:C.primaryFixed,
    borderWidth:1,
    borderColor:C.border,
    shadowColor:C.primary,
    shadowOpacity:0.16,
    shadowRadius:28,
    shadowOffset:{width:0,height:12},
  },
  newCatName:{
    color:C.primary,
    fontSize:22,
    fontWeight:'900',
    marginTop:20,
  },
  newCatDesc:{
    color:C.onSurfaceVariant,
    fontSize:13,
    lineHeight:20,
    textAlign:'center',
    marginTop:8,
    paddingHorizontal:8,
  },
  newCatConfirmBtn:{
    marginTop:22,
    width:'100%',
    height:52,
    borderRadius:999,
    alignItems:'center',
    justifyContent:'center',
    backgroundColor:C.primary,
    shadowColor:C.primary,
    shadowOpacity:0.2,
    shadowRadius:18,
    shadowOffset:{width:0,height:10},
  },
  newCatConfirmText:{color:'#fff',fontSize:16,fontWeight:'900'},
  rc:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:C.surfaceContainerLowest,borderRadius:16,padding:12,marginVertical:4,width:'100%',marginTop:12,shadowColor:'#a14000',shadowOpacity:0.04,shadowRadius:12,shadowOffset:{width:0,height:6}},
  bgWarn:{position:'absolute',top:60,left:20,right:20,backgroundColor:C.errorContainer,borderRadius:16,padding:12,zIndex:10,alignItems:'center'},bgWarnText:{color:C.error,fontSize:14,fontWeight:'700'},
  shareBtn:{position:'absolute',top:60,right:20,zIndex:100,backgroundColor:C.surfaceContainerLowest,borderRadius:20,width:40,height:40,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:0.1,shadowRadius:8,shadowOffset:{width:0,height:2}},cheer:{color:C.onSurfaceVariant,fontSize:14,textAlign:'center',marginTop:4,marginBottom:8,lineHeight:22,paddingHorizontal:20,fontStyle:'italic'},
});
