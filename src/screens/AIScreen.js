import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Path, Line, Text as SvgText } from 'react-native-svg';
import { useGame } from '../../App';
import { useAuth } from '../contexts/AuthContext';
import { sendCompanionChat } from '../services/authApi';
import { buildActorId } from '../utils/identity';
import { C } from '../utils/theme';

const DAILY_GOAL_KEY = 'focusmeow-daily-goals-v2';
const LEGACY_DAILY_GOAL_KEY = 'focusmeow-daily-goals-v1';
const WEEKLY_REPORT_DAYS = 7;
const SWIPE_ACTION_WIDTH = 78;
const SWIPE_ACTION_TOTAL_WIDTH = SWIPE_ACTION_WIDTH * 2;
const SWIPE_OPEN_THRESHOLD = SWIPE_ACTION_TOTAL_WIDTH * 0.24;
const TASK_COLORS = ['#FF8A65', '#F6BD60', '#7AC74F', '#43AA8B', '#4D96FF', '#8E7DBE', '#D96C8D', '#B08968'];
let s;
const DURATION_PRESETS = [15, 25, 45, 60, 90];
const MIN_RECORDED_SECONDS = 60;
const HOUR_PLOT_HEIGHT = 116;

const FOCUS_TASK_OPTIONS = [
  { key: 'reading', labelKey: 'taskReading', fallbackZh: '阅读', fallbackEn: 'Reading' },
  { key: 'creating', labelKey: 'taskCreating', fallbackZh: '创作', fallbackEn: 'Creating' },
  { key: 'design', labelKey: 'taskDesign', fallbackZh: '设计', fallbackEn: 'Design' },
  { key: 'exam', labelKey: 'taskExam', fallbackZh: '备考', fallbackEn: 'Exam Prep' },
  { key: 'work', labelKey: 'taskWork', fallbackZh: '工作', fallbackEn: 'Work' },
  { key: 'meditation', labelKey: 'taskMeditation', fallbackZh: '冥想', fallbackEn: 'Meditation' },
  { key: 'coding', labelKey: 'taskCoding', fallbackZh: '编程', fallbackEn: 'Coding' },
  { key: 'custom', labelKey: 'taskCustom', fallbackZh: '自定义', fallbackEn: 'Custom' },
];

const PRIORITY_OPTIONS = [
  { key: 'P0', shortLabel: 'P0', descZh: '重要紧急', descEn: 'Critical & Urgent', color: '#FF6B57' },
  { key: 'P1', shortLabel: 'P1', descZh: '重要不紧急', descEn: 'Important', color: '#2C7BE5' },
  { key: 'P2', shortLabel: 'P2', descZh: '紧急不重要', descEn: 'Urgent', color: '#F0A13E' },
  { key: 'P3', shortLabel: 'P3', descZh: '不紧急不重要', descEn: 'Low Priority', color: '#8B8B93' },
];

const pad2 = value => String(value).padStart(2, '0');
const priorityRankMap = { P0: 0, P1: 1, P2: 2, P3: 3 };

const clampDurationMinutes = (value) => Math.min(240, Math.max(1, Number(value) || 0));

const localDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const shiftDate = (value, days) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setDate(date.getDate() + days);
  return date;
};

const fromLocalDateKey = (dateKey) => {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const normalizeTaskKey = value => String(value || '').trim().toLowerCase();

const getTaskOptionLabel = (option, t, zh) => {
  if (!option) return zh ? '未命名任务' : 'Untitled Task';
  const translated = typeof t === 'function' ? t(option.labelKey) : '';
  if (translated && translated !== option.labelKey) return translated;
  return zh ? option.fallbackZh : option.fallbackEn;
};

const getPriorityMeta = (key, zh) => {
  const option = PRIORITY_OPTIONS.find(item => item.key === key);
  if (!option) return null;
  return {
    ...option,
    label: zh ? `${option.shortLabel} ${option.descZh}` : `${option.shortLabel} ${option.descEn}`,
  };
};

const sortGoals = (items) => {
  return [...items].sort((a, b) => {
    if (!!a.pinnedAt !== !!b.pinnedAt) return a.pinnedAt ? -1 : 1;
    if (a.pinnedAt && b.pinnedAt && a.pinnedAt !== b.pinnedAt) return b.pinnedAt - a.pinnedAt;
    const priorityDiff = (priorityRankMap[a.priority] ?? 99) - (priorityRankMap[b.priority] ?? 99);
    if (priorityDiff !== 0) return priorityDiff;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
};

const formatTaskName = (task, zh) => {
  const trimmed = String(task || '').trim();
  return trimmed || (zh ? '未命名任务' : 'Untitled Task');
};

const formatTaskDateLabel = (dateKey, zh) => {
  const date = fromLocalDateKey(dateKey);
  const todayKey = localDateKey();
  const yesterdayKey = localDateKey(shiftDate(new Date(), -1));
  const prefix = `${date.getMonth() + 1}/${date.getDate()}`;
  if (dateKey === todayKey) return zh ? `${prefix} 今天` : `${prefix} Today`;
  if (dateKey === yesterdayKey) return zh ? `${prefix} 昨天` : `${prefix} Yesterday`;
  return prefix;
};

const formatTaskDateHeading = (dateKey, zh) => {
  const date = fromLocalDateKey(dateKey);
  return zh
    ? `${date.getMonth() + 1}月${date.getDate()}日`
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatTaskDateButtonLabel = (dateKey, zh) => {
  const date = fromLocalDateKey(dateKey);
  return zh
    ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const shortenTaskLabel = (label, zh) => {
  const text = String(label || '').trim();
  const limit = zh ? 6 : 11;
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
};

const formatTaskPieTime = (segment, zh) => {
  if (!segment) return '';
  return zh
    ? `${segment.minutes}分钟`
    : `${segment.minutes}m`;
};

const formatTaskPieCallout = (segment, zh) => {
  if (!segment) return '';
  const shortLabel = shortenTaskLabel(segment.label, zh);
  return `${shortLabel} ${formatTaskPieTime(segment, zh)}`;
};

const isRecordableSession = (item) => (Number(item?.duration) || 0) > MIN_RECORDED_SECONDS;

const polarToCartesian = (cx, cy, radius, angleInDegrees) => {
  const angleInRadians = (angleInDegrees - 90) * (Math.PI / 180);
  return {
    x: cx + (radius * Math.cos(angleInRadians)),
    y: cy + (radius * Math.sin(angleInRadians)),
  };
};

const describeArc = (cx, cy, radius, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? '1' : '0';
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
  ].join(' ');
};

const createEmptyTaskForm = () => ({
  mode: 'create',
  editingId: null,
  taskKey: '',
  customTask: '',
  description: '',
  durationChoice: '25',
  customDuration: '',
  priority: '',
  taskMenuOpen: false,
  coreLocked: false,
});

const getGoalTaskLabel = (goal, t, zh) => {
  if (goal?.taskLabel) return goal.taskLabel;
  if (goal?.taskKey && goal.taskKey !== 'custom') {
    const option = FOCUS_TASK_OPTIONS.find(item => item.key === goal.taskKey);
    return getTaskOptionLabel(option, t, zh);
  }
  return formatTaskName(goal?.customTask || goal?.title, zh);
};

const normalizeStoredGoal = (rawGoal, t, zh) => {
  const goal = rawGoal || {};
  const taskKey = goal.taskKey || (goal.customTask ? 'custom' : '');
  const taskLabel = goal.taskLabel || getGoalTaskLabel(goal, t, zh);
  const durationMinutes = clampDurationMinutes(goal.durationMinutes || 25) || 25;
  return {
    id: goal.id || `goal-${Date.now()}`,
    taskKey,
    taskLabel,
    customTask: goal.customTask || '',
    description: goal.description || '',
    durationMinutes,
    priority: goal.priority || '',
    pinnedAt: goal.pinnedAt || null,
    createdAt: goal.createdAt || Date.now(),
    updatedAt: goal.updatedAt || goal.createdAt || Date.now(),
  };
};

const isSameGoalRecord = (rawItem, goal, t, zh) => {
  const current = normalizeStoredGoal(rawItem, t, zh);
  const target = normalizeStoredGoal(goal, t, zh);
  if (current.id && target.id && current.id === target.id) return true;
  if ((current.createdAt || 0) && (target.createdAt || 0) && current.createdAt === target.createdAt) return true;
  return (
    normalizeTaskKey(current.taskLabel) === normalizeTaskKey(target.taskLabel)
    && Number(current.durationMinutes || 0) === Number(target.durationMinutes || 0)
    && Number(current.updatedAt || 0) === Number(target.updatedAt || 0)
  );
};

const createTaskFormFromGoal = (goal, t, zh) => {
  const normalized = normalizeStoredGoal(goal, t, zh);
  const isPresetDuration = DURATION_PRESETS.includes(normalized.durationMinutes);
  return {
    mode: 'edit',
    editingId: normalized.id,
    taskKey: normalized.taskKey || '',
    customTask: normalized.taskKey === 'custom' ? normalized.customTask || normalized.taskLabel : '',
    description: normalized.description || '',
    durationChoice: isPresetDuration ? String(normalized.durationMinutes) : 'custom',
    customDuration: isPresetDuration ? '' : String(normalized.durationMinutes),
    priority: normalized.priority || '',
    taskMenuOpen: false,
    coreLocked: !!goal.completed,
  };
};

export default function AIScreen() {
  const g = useGame();
  s = createStyles(C);
  const { user, clientId } = useAuth();
  const { lang, focusHistory, t = (key) => key } = g;
  const zh = lang === 'zh';
  const actorId = buildActorId(user, clientId, 'focusmeow_ai');

  const [selectedDate, setSelectedDate] = useState(localDateKey());
  const [dailyGoals, setDailyGoals] = useState({});
  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState(createEmptyTaskForm());
  const [activeSwipeId, setActiveSwipeId] = useState(null);
  const [showTaskLegend, setShowTaskLegend] = useState(false);
  const [report, setReport] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const taskOptions = useMemo(() => (
    FOCUS_TASK_OPTIONS.map(option => ({
      ...option,
      label: getTaskOptionLabel(option, t, zh),
    }))
  ), [t, zh]);

  const priorityOptions = useMemo(() => (
    PRIORITY_OPTIONS.map(option => ({
      ...option,
      label: zh ? `${option.shortLabel} ${option.descZh}` : `${option.shortLabel} ${option.descEn}`,
    }))
  ), [zh]);

  useEffect(() => {
    let cancelled = false;

    const loadDailyGoals = async () => {
      try {
        const currentRaw = await AsyncStorage.getItem(DAILY_GOAL_KEY);
        const legacyRaw = currentRaw ? null : await AsyncStorage.getItem(LEGACY_DAILY_GOAL_KEY);
        const payload = currentRaw || legacyRaw;
        if (payload) {
          const parsed = JSON.parse(payload);
          if (!cancelled && parsed && typeof parsed === 'object') {
            setDailyGoals(parsed);
          }
        }
      } catch {
        // Ignore invalid cache and start fresh.
      } finally {
        if (!cancelled) {
          setGoalsLoaded(true);
        }
      }
    };

    loadDailyGoals();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistDailyGoals = useCallback(async (nextValue) => {
    setDailyGoals(nextValue);
    await AsyncStorage.setItem(DAILY_GOAL_KEY, JSON.stringify(nextValue));
  }, []);

  const recordableHistory = useMemo(() => (
    (focusHistory || []).filter(isRecordableSession)
  ), [focusHistory]);

  const dateOptions = useMemo(() => {
    const historyDates = recordableHistory.map(item => item.date).filter(Boolean);
    const goalDates = Object.keys(dailyGoals || {});
    const allDates = [...new Set([localDateKey(), ...historyDates, ...goalDates])].sort().reverse();
    return allDates.slice(0, 30);
  }, [dailyGoals, recordableHistory]);

  useEffect(() => {
    if (!dateOptions.length) return;
    if (!dateOptions.includes(selectedDate)) {
      setSelectedDate(dateOptions[0]);
    }
  }, [dateOptions, selectedDate]);

  useEffect(() => {
    setShowTaskLegend(false);
  }, [selectedDate]);

  const selectedRecords = useMemo(() => (
    recordableHistory.filter(item => item.date === selectedDate)
  ), [recordableHistory, selectedDate]);

  const selectedCompletedRecords = useMemo(() => (
    selectedRecords.filter(item => item.completed)
  ), [selectedRecords]);

  const selectedTotalMinutes = useMemo(() => (
    Math.round(selectedCompletedRecords.reduce((sum, item) => sum + (Number(item.duration) || 0), 0) / 60)
  ), [selectedCompletedRecords]);

  const selectedTaskSeconds = useMemo(() => {
    const taskMap = {};
    selectedCompletedRecords.forEach(item => {
      const key = normalizeTaskKey(item.task);
      if (!key) return;
      taskMap[key] = (taskMap[key] || 0) + (Number(item.duration) || 0);
    });
    return taskMap;
  }, [selectedCompletedRecords]);

  const selectedGoals = useMemo(() => {
    const rawGoals = Array.isArray(dailyGoals[selectedDate]) ? dailyGoals[selectedDate] : [];
    return sortGoals(rawGoals.map(item => {
      const normalized = normalizeStoredGoal(item, t, zh);
      const actualSeconds = selectedTaskSeconds[normalizeTaskKey(normalized.taskLabel)] || 0;
      return {
        ...normalized,
        actualSeconds,
        actualMinutes: Math.round(actualSeconds / 60),
        completed: actualSeconds >= (normalized.durationMinutes * 60),
      };
    }));
  }, [dailyGoals, selectedDate, selectedTaskSeconds, t, zh]);

  const goalProgress = useMemo(() => {
    const total = selectedGoals.length;
    const completed = selectedGoals.filter(item => item.completed).length;
    const targetMinutes = selectedGoals.reduce((sum, item) => sum + (Number(item.durationMinutes) || 0), 0);
    const actualMinutes = selectedGoals.reduce((sum, item) => (
      sum + Math.min(Number(item.actualMinutes) || 0, Number(item.durationMinutes) || 0)
    ), 0);
    const percent = targetMinutes > 0 ? Math.round((actualMinutes / targetMinutes) * 100) : 0;
    return { total, completed, percent, targetMinutes, actualMinutes };
  }, [selectedGoals]);

  const selectedTaskLabel = useMemo(() => {
    if (!taskForm.taskKey) return '';
    if (taskForm.taskKey === 'custom') return String(taskForm.customTask || '').trim();
    return taskOptions.find(option => option.key === taskForm.taskKey)?.label || '';
  }, [taskForm.customTask, taskForm.taskKey, taskOptions]);

  const selectedDurationMinutes = useMemo(() => {
    if (taskForm.durationChoice === 'custom') return clampDurationMinutes(taskForm.customDuration);
    return clampDurationMinutes(taskForm.durationChoice);
  }, [taskForm.customDuration, taskForm.durationChoice]);

  const isTaskFormValid = !!selectedTaskLabel && selectedDurationMinutes > 0;

  const taskBreakdown = useMemo(() => {
    const records = selectedRecords.filter(item => (Number(item?.duration) || 0) > 0);
    const totalSeconds = records.reduce((sum, item) => sum + Math.max(0, Number(item.duration) || 0), 0);
    const taskMap = {};
    records.forEach(item => {
      const label = formatTaskName(item.task, zh);
      taskMap[label] = (taskMap[label] || 0) + (Number(item.duration) || 0);
    });
    const segments = Object.entries(taskMap)
      .sort(([, aSeconds], [, bSeconds]) => bSeconds - aSeconds)
      .map(([label, seconds], index) => ({
        label,
        seconds,
        minutes: Math.max(1, Math.round(seconds / 60)),
        percent: totalSeconds > 0 ? Math.round((seconds / totalSeconds) * 100) : 0,
        color: TASK_COLORS[index % TASK_COLORS.length],
      }));
    return {
      totalSeconds,
      totalMinutes: Math.round(totalSeconds / 60),
      sessionCount: records.length,
      segments,
    };
  }, [selectedRecords, zh]);

  const hourlyData = useMemo(() => {
    const hours = Array(24).fill(0);
    selectedCompletedRecords.forEach(item => {
      hours[item.hour] = (hours[item.hour] || 0) + Math.round((Number(item.duration) || 0) / 60);
    });
    const maxMinutes = Math.max(...hours, 1);
    const bestMinutes = Math.max(...hours, 0);
    return {
      hours,
      maxMinutes,
      bestHour: bestMinutes > 0 ? hours.indexOf(bestMinutes) : -1,
    };
  }, [selectedCompletedRecords]);

  const hourlyAxisTicks = useMemo(() => {
    const max = Math.max(1, hourlyData.maxMinutes);
    return [max, Math.max(1, Math.round(max / 2)), 0];
  }, [hourlyData.maxMinutes]);

  const weeklyStats = useMemo(() => {
    const allHistory = recordableHistory;
    const cutoff = localDateKey(shiftDate(new Date(), -(WEEKLY_REPORT_DAYS - 1)));
    const current = allHistory.filter(item => item.date >= cutoff);
    const completed = current.filter(item => item.completed);
    const hourMap = {};
    current.forEach(item => {
      if (!hourMap[item.hour]) hourMap[item.hour] = { total: 0, ok: 0 };
      hourMap[item.hour].total += 1;
      if (item.completed) hourMap[item.hour].ok += 1;
    });
    let bestHour = -1;
    let bestRate = 0;
    Object.entries(hourMap).forEach(([hour, value]) => {
      const rate = value.total > 0 ? value.ok / value.total : 0;
      if (rate > bestRate) {
        bestHour = parseInt(hour, 10);
        bestRate = rate;
      }
    });
    const dates = [...new Set(allHistory.filter(item => item.completed).map(item => item.date))].sort().reverse();
    let streak = 0;
    let currentDate = localDateKey();
    for (let i = 0; i < 60; i += 1) {
      if (dates.includes(currentDate)) streak += 1;
      else if (i > 0) break;
      currentDate = localDateKey(shiftDate(fromLocalDateKey(currentDate), -1));
    }
    return {
      hasEnoughData: allHistory.length >= 2,
      completedCount: completed.length,
      totalCount: current.length,
      totalMinutes: Math.round(completed.reduce((sum, item) => sum + (Number(item.duration) || 0), 0) / 60),
      bestHour,
      bestRate,
      streak,
    };
  }, [recordableHistory]);

  const resetTaskForm = useCallback(() => {
    setTaskForm(createEmptyTaskForm());
  }, []);

  const closeTaskModal = useCallback(() => {
    setShowTaskModal(false);
    resetTaskForm();
  }, [resetTaskForm]);

  const openCreateTaskModal = useCallback(() => {
    setTaskForm(createEmptyTaskForm());
    setShowTaskModal(true);
  }, []);

  const openTaskDetail = useCallback((goal) => {
    setActiveSwipeId(null);
    setTaskForm(createTaskFormFromGoal(goal, t, zh));
    setShowTaskModal(true);
  }, [t, zh]);

  const saveTask = useCallback(async () => {
    if (!isTaskFormValid) return;
    const rawGoals = Array.isArray(dailyGoals[selectedDate]) ? dailyGoals[selectedDate].map(item => normalizeStoredGoal(item, t, zh)) : [];
    const currentItem = taskForm.mode === 'edit'
      ? rawGoals.find(item => item.id === taskForm.editingId)
      : null;
    const currentItemCompleted = !!currentItem && (
      (selectedTaskSeconds[normalizeTaskKey(currentItem.taskLabel)] || 0) >= (currentItem.durationMinutes * 60)
    );
    const shouldLockCore = taskForm.mode === 'edit' && (taskForm.coreLocked || currentItemCompleted);
    const nextTaskLabel = shouldLockCore
      ? currentItem?.taskLabel || selectedTaskLabel
      : selectedTaskLabel;
    const duplicate = rawGoals.find(item => (
      item.id !== taskForm.editingId && normalizeTaskKey(item.taskLabel) === normalizeTaskKey(nextTaskLabel)
    ));
    if (duplicate) {
      Alert.alert(
        zh ? '任务已存在' : 'Task already exists',
        zh ? '同一天里已经有同名任务了，换个名字试试。' : 'A task with the same name already exists for this day.',
      );
      return;
    }

    const timestamp = Date.now();
    const nextItem = {
      id: taskForm.editingId || `goal-${timestamp}`,
      taskKey: shouldLockCore ? currentItem?.taskKey || taskForm.taskKey : taskForm.taskKey,
      taskLabel: nextTaskLabel,
      customTask: shouldLockCore
        ? currentItem?.customTask || ''
        : taskForm.taskKey === 'custom'
          ? String(taskForm.customTask || '').trim()
          : '',
      description: String(taskForm.description || '').trim(),
      durationMinutes: shouldLockCore ? currentItem?.durationMinutes || selectedDurationMinutes : selectedDurationMinutes,
      priority: shouldLockCore ? currentItem?.priority || '' : taskForm.priority || '',
      pinnedAt: taskForm.mode === 'edit'
        ? currentItem?.pinnedAt || null
        : null,
      createdAt: taskForm.mode === 'edit'
        ? currentItem?.createdAt || timestamp
        : timestamp,
      updatedAt: timestamp,
    };

    const nextGoals = taskForm.mode === 'edit'
      ? rawGoals.map(item => (item.id === taskForm.editingId ? nextItem : item))
      : [...rawGoals, nextItem];

    await persistDailyGoals({
      ...dailyGoals,
      [selectedDate]: nextGoals,
    });
    closeTaskModal();
  }, [
    closeTaskModal,
    dailyGoals,
    isTaskFormValid,
    persistDailyGoals,
    selectedDate,
    selectedDurationMinutes,
    selectedTaskSeconds,
    selectedTaskLabel,
    t,
    taskForm,
    zh,
  ]);

  const deleteTask = useCallback((goal) => {
    Alert.alert(
      zh ? '删除任务' : 'Delete task',
      zh ? `确定删除「${goal.taskLabel}」吗？` : `Delete "${goal.taskLabel}"?`,
      [
        { text: zh ? '取消' : 'Cancel', style: 'cancel' },
        {
          text: zh ? '删除' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            const currentGoals = Array.isArray(dailyGoals[selectedDate]) ? dailyGoals[selectedDate] : [];
            const nextGoals = currentGoals.filter(item => !isSameGoalRecord(item, goal, t, zh));
            const nextValue = { ...dailyGoals };
            if (nextGoals.length) nextValue[selectedDate] = nextGoals;
            else delete nextValue[selectedDate];
            setActiveSwipeId(null);
            await persistDailyGoals(nextValue);
          },
        },
      ],
    );
  }, [dailyGoals, persistDailyGoals, selectedDate, t, zh]);

  const pinTask = useCallback(async (goal) => {
    if (goal.completed) {
      Alert.alert(
        zh ? '任务已完成' : 'Task completed',
        zh ? '已完成任务的优先级已锁定，不能再置顶。' : 'Completed tasks have locked priority and cannot be pinned.',
      );
      setActiveSwipeId(null);
      return;
    }
    const currentGoals = Array.isArray(dailyGoals[selectedDate]) ? dailyGoals[selectedDate].map(item => normalizeStoredGoal(item, t, zh)) : [];
    const pinnedAt = Date.now();
    const nextGoals = currentGoals.map(item => {
      if (item.id === goal.id) {
        return {
          ...item,
          priority: 'P0',
          pinnedAt,
          updatedAt: pinnedAt,
        };
      }
      if (item.pinnedAt) {
        return {
          ...item,
          pinnedAt: null,
          updatedAt: pinnedAt,
        };
      }
      return item;
    });
    setActiveSwipeId(null);
    await persistDailyGoals({
      ...dailyGoals,
      [selectedDate]: nextGoals,
    });
  }, [dailyGoals, persistDailyGoals, selectedDate, t, zh]);

  const genReport = useCallback(async () => {
    if (!weeklyStats.hasEnoughData) return;
    setReportLoading(true);
    setReport('');
    try {
      const summary = zh
        ? `最近7天完成${weeklyStats.completedCount}次专注，共${weeklyStats.totalMinutes}分钟，完成率${weeklyStats.totalCount > 0 ? Math.round((weeklyStats.completedCount / weeklyStats.totalCount) * 100) : 0}%，连续${weeklyStats.streak}天，最佳时段${weeklyStats.bestHour}点。`
        : `In the last 7 days the user completed ${weeklyStats.completedCount} sessions for ${weeklyStats.totalMinutes} minutes, with a completion rate of ${weeklyStats.totalCount > 0 ? Math.round((weeklyStats.completedCount / weeklyStats.totalCount) * 100) : 0}% and a ${weeklyStats.streak}-day streak. Best hour: ${weeklyStats.bestHour}.`;
      const prompt = zh
        ? `你是专注记录助手。基于这段周数据：${summary} 请用2到3句自然、温暖、具体的中文总结用户近况，并给一个下周建议，不要用列表。`
        : `You are a focus record coach. Based on this weekly data: ${summary} Give a warm, specific 2-3 sentence summary and one suggestion for next week. No bullet list.`;
      const data = await sendCompanionChat({
        inputs: { breed: 'orange', name: zh ? '记录助手' : 'Focus Record Coach' },
        query: prompt,
        user: actorId,
        response_mode: 'blocking',
        conversation_id: '',
      });
      setReport(data.answer || (zh ? '生成失败，请稍后再试' : 'Failed, try again later'));
    } catch {
      setReport(zh ? '网络错误，请稍后再试' : 'Network error');
    }
    setReportLoading(false);
  }, [actorId, weeklyStats, zh]);

  return (
    <ScrollView
      style={s.bg}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={() => setActiveSwipeId(null)}
    >
      <Text style={s.h}>{zh ? '专注记录' : 'Focus Records'}</Text>

      <View style={s.card}>
        <View style={s.cardHeadRow}>
          <View style={s.cardHeadText}>
            <Text style={s.ct}>{zh ? '今日专注目标' : 'Daily Focus Goals'}</Text>
            <Text style={s.cardSub}>{zh ? '添加今天的任务，并跟踪当日完成进度。' : 'Add tasks for the day and track your progress.'}</Text>
          </View>
        </View>

        <View style={s.goalActionRow}>
          <TouchableOpacity style={s.datePickerBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={s.datePickerBtnLabel}>{formatTaskDateButtonLabel(selectedDate, zh)}</Text>
            <Text style={s.datePickerBtnChevron}>▾</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addTaskBtn} onPress={openCreateTaskModal}>
            <Text style={s.addTaskBtnText}>{zh ? '+ 新建任务' : '+ New Task'}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.goalSummaryPanel}>
          <ProgressRing percent={goalProgress.percent} />
          <View style={s.goalSummaryText}>
            <Text style={s.goalSummaryTitle}>{zh ? '当日进度' : 'Daily Progress'}</Text>
            <Text style={s.goalSummaryDesc}>
              {goalProgress.targetMinutes > 0
                ? (zh
                  ? `已专注 ${goalProgress.actualMinutes}/${goalProgress.targetMinutes} 分钟`
                  : `${goalProgress.actualMinutes}/${goalProgress.targetMinutes} min focused`)
                : (zh ? '今天还没有任务，先新建一个吧' : 'No tasks yet, create one to start')}
            </Text>
            <View style={s.progBar}>
              <View style={[s.progFill, { width: `${goalProgress.percent}%` }]} />
            </View>
            <Text style={s.goalSummaryMeta}>
              {zh
                ? `已完成 ${goalProgress.completed}/${goalProgress.total} 个任务 · 当日完成 ${selectedCompletedRecords.length} 次专注，共 ${selectedTotalMinutes} 分钟`
                : `${goalProgress.completed}/${goalProgress.total} tasks done · ${selectedCompletedRecords.length} completed sessions, ${selectedTotalMinutes} min total`}
            </Text>
          </View>
        </View>

        <View style={s.sectionBlock}>
          <Text style={s.sectionTitle}>{zh ? '当日任务进度' : 'Task Progress'}</Text>
          {!goalsLoaded ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : selectedGoals.length ? (
            selectedGoals.map(item => (
              <SwipeableTaskRow
                key={item.id}
                zh={zh}
                item={item}
                activeSwipeId={activeSwipeId}
                setActiveSwipeId={setActiveSwipeId}
                onDetail={openTaskDetail}
                onPin={pinTask}
                onDelete={deleteTask}
              />
            ))
          ) : (
            <View style={s.emptyPanel}>
              <Text style={s.emptyPanelText}>{zh ? '这一天还没有任务，点击右上角「新建任务」开始记录。' : 'No tasks for this day yet. Tap "New Task" to add one.'}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={s.card}>
        <View style={s.cardHeadRow}>
          <View style={s.cardHeadText}>
            <Text style={s.ct}>{zh ? '专注任务分布' : 'Task Focus Breakdown'}</Text>
            <Text style={s.cardSub}>{zh ? `${formatTaskDateHeading(selectedDate, zh)}不同任务的时间占比` : `How time was split across tasks on ${formatTaskDateHeading(selectedDate, zh)}`}</Text>
          </View>
          {taskBreakdown.totalSeconds > 0 ? (
            <TouchableOpacity style={s.detailToggleBtn} onPress={() => setShowTaskLegend(prev => !prev)}>
              <Text style={s.detailToggleBtnText}>
                {showTaskLegend
                  ? (zh ? '收起' : 'Hide')
                  : (zh ? '详情' : 'Details')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {taskBreakdown.totalSeconds > 0 ? (
          <View style={s.taskChartWrap}>
            <TaskPieChart
              totalMinutes={taskBreakdown.totalMinutes}
              totalSeconds={taskBreakdown.totalSeconds}
              segments={taskBreakdown.segments}
              zh={zh}
            />
            {showTaskLegend ? (
              <View style={s.taskLegend}>
                {taskBreakdown.segments.map(segment => (
                  <View key={`${selectedDate}-${segment.label}`} style={s.taskLegendItem}>
                    <View style={[s.taskLegendDot, { backgroundColor: segment.color }]} />
                    <View style={s.taskLegendTextWrap}>
                      <Text style={s.taskLegendSingleLine} numberOfLines={1}>
                        <Text style={s.taskLegendLabel}>{segment.label}</Text>
                        <Text style={s.taskLegendMetaInline}>
                          {zh ? ` ${segment.minutes}分钟 ${segment.percent}%` : ` ${segment.minutes}m ${segment.percent}%`}
                        </Text>
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <View style={s.emptyPanel}>
            <Text style={s.emptyPanelText}>{zh ? '这一天还没有专注记录，暂时无法生成任务分布。' : 'No focus records for this day yet, so there is no task breakdown.'}</Text>
          </View>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.ct}>{zh ? '专注时段分布' : 'Hourly Focus Distribution'}</Text>
        <Text style={s.cardSub}>{zh ? `${formatTaskDateHeading(selectedDate, zh)}的专注时长分布` : `Focus minutes by hour on ${formatTaskDateHeading(selectedDate, zh)}`}</Text>
        {selectedCompletedRecords.length ? (
          <>
            <View style={s.hourChartWrap}>
              <View style={s.yAxis}>
                {hourlyAxisTicks.map((tick, index) => (
                  <View key={`${tick}-${index}`} style={s.yAxisTick}>
                    <Text style={s.axisLabel}>{tick > 0 ? `${tick}m` : '0'}</Text>
                  </View>
                ))}
              </View>
              <View style={s.chartPlotWrap}>
                <View style={s.yAxisLine} />
                <View style={s.xAxisLine} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chartScroll}>
                  <View style={s.chartRow}>
                    {hourlyData.hours.map((minutes, hour) => (
                      <View key={hour} style={s.barCol}>
                        <View style={s.barTrack}>
                          <View
                            style={[
                              s.bar,
                              {
                                height: Math.max(4, (minutes / hourlyData.maxMinutes) * HOUR_PLOT_HEIGHT),
                                backgroundColor: hour === hourlyData.bestHour ? C.primary : C.primaryContainer,
                              },
                            ]}
                          />
                        </View>
                        <Text style={s.barLabel}>{hour}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
            <Text style={s.hourHint}>
              {hourlyData.bestHour >= 0
                ? (zh ? `这一天你在 ${String(hourlyData.bestHour).padStart(2, '0')}:00 左右投入最多。` : `You spent the most focus time around ${String(hourlyData.bestHour).padStart(2, '0')}:00.`)
                : (zh ? '这一天还没有足够的时段数据。' : 'Not enough hourly data for this day yet.')}
            </Text>
          </>
        ) : (
          <View style={s.emptyPanel}>
            <Text style={s.emptyPanelText}>{zh ? '这一天还没有完成的专注记录，暂时无法生成时段分布。' : 'No completed sessions for this day yet, so there is no hourly distribution.'}</Text>
          </View>
        )}
      </View>

      <View style={s.card}>
        <View style={s.reportHeader}>
          <View style={s.cardHeadText}>
            <Text style={s.ct}>{zh ? '智能周报' : 'Smart Weekly Report'}</Text>
            <Text style={s.cardSub}>{zh ? '基于最近 7 天的专注记录生成总结。' : 'A summary based on your last 7 days of focus data.'}</Text>
          </View>
          <TouchableOpacity style={s.genBtn} onPress={genReport} disabled={reportLoading || !weeklyStats.hasEnoughData}>
            {reportLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.genBtnT}>{zh ? '生成' : 'Generate'}</Text>
            )}
          </TouchableOpacity>
        </View>
        {weeklyStats.hasEnoughData ? (
          report ? (
            <View style={s.reportBox}>
              <Text style={s.reportT}>{report}</Text>
            </View>
          ) : (
            <View style={s.reportPlaceholder}>
              <Text style={s.reportPlaceholderText}>
                {zh
                  ? `最近 7 天完成 ${weeklyStats.completedCount} 次专注，共 ${weeklyStats.totalMinutes} 分钟。点击右上角生成智能周报。`
                  : `You completed ${weeklyStats.completedCount} sessions for ${weeklyStats.totalMinutes} minutes in the last 7 days. Tap Generate for a summary.`}
              </Text>
            </View>
          )
        ) : (
          <View style={s.emptyPanel}>
            <Text style={s.emptyPanelText}>{zh ? '完成至少 2 次专注后，这里会生成智能周报。' : 'Complete at least 2 focus sessions and this card will generate a weekly report.'}</Text>
          </View>
        )}
      </View>

      {showDatePicker ? (
        <DatePickerModal
          zh={zh}
          visible={showDatePicker}
          selectedDate={selectedDate}
          dateOptions={dateOptions}
          onClose={() => setShowDatePicker(false)}
          onSelect={(dateKey) => {
            setSelectedDate(dateKey);
            setShowDatePicker(false);
          }}
        />
      ) : null}

      {showTaskModal ? (
        <TaskFormModal
          zh={zh}
          visible={showTaskModal}
          form={taskForm}
          setForm={setTaskForm}
          taskOptions={taskOptions}
          priorityOptions={priorityOptions}
          selectedTaskLabel={selectedTaskLabel}
          selectedDurationMinutes={selectedDurationMinutes}
          isValid={isTaskFormValid}
          isCoreLocked={taskForm.mode === 'edit' && !!taskForm.coreLocked}
          onClose={closeTaskModal}
          onSave={saveTask}
        />
      ) : null}
    </ScrollView>
  );
}

function ProgressRing({ percent }) {
  const size = 114;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - ((Math.max(0, Math.min(100, percent)) / 100) * circumference);

  return (
    <View style={s.progressRingWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={C.surfaceContainerHigh}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={C.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={[circumference, circumference]}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={s.progressRingCenter}>
        <Text style={s.progressRingValue}>{percent}%</Text>
      </View>
    </View>
  );
}

function SwipeableTaskRow({ item, zh, activeSwipeId, setActiveSwipeId, onDetail, onPin, onDelete }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const openedRef = useRef(false);

  const close = useCallback((clearActive = true) => {
    openedRef.current = false;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start();
    if (clearActive) {
      setActiveSwipeId(current => (current === item.id ? null : current));
    }
  }, [item.id, setActiveSwipeId, translateX]);

  const open = useCallback(() => {
    openedRef.current = true;
    setActiveSwipeId(item.id);
    Animated.spring(translateX, {
      toValue: -SWIPE_ACTION_TOTAL_WIDTH,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start();
  }, [item.id, setActiveSwipeId, translateX]);

  useEffect(() => {
    if (activeSwipeId !== item.id && openedRef.current) {
      close(false);
    }
  }, [activeSwipeId, close, item.id]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => (
      Math.abs(gestureState.dx) > 4 && Math.abs(gestureState.dx) > (Math.abs(gestureState.dy) * 0.85)
    ),
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      translateX.stopAnimation();
    },
    onPanResponderMove: (_, gestureState) => {
      const base = openedRef.current ? -SWIPE_ACTION_TOTAL_WIDTH : 0;
      const nextValue = Math.max(-SWIPE_ACTION_TOTAL_WIDTH, Math.min(0, base + gestureState.dx));
      translateX.setValue(nextValue);
    },
    onPanResponderRelease: (_, gestureState) => {
      translateX.stopAnimation((value) => {
        const projectedValue = Math.max(
          -SWIPE_ACTION_TOTAL_WIDTH,
          Math.min(0, value + (gestureState.vx * 36)),
        );
        const shouldOpen = projectedValue <= -SWIPE_OPEN_THRESHOLD || gestureState.vx < -0.18;
        if (shouldOpen) {
          open();
        } else {
          close();
        }
      });
    },
    onPanResponderTerminate: () => {
      if (openedRef.current) open();
      else close();
    },
  }), [close, open, translateX]);

  const priorityMeta = getPriorityMeta(item.priority, zh);

  return (
    <View style={s.swipeRowWrap}>
      <View style={s.swipeActionRail}>
        <TouchableOpacity
          style={[s.swipeActionBtn, s.swipeActionPin]}
          onPress={() => {
            close();
            requestAnimationFrame(() => {
              onPin(item);
            });
          }}
        >
          <Text style={s.swipeActionIcon}>↑</Text>
          <Text style={s.swipeActionLabel}>{zh ? '置顶' : 'Pin'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.swipeActionBtn, s.swipeActionDelete]}
          onPress={() => {
            close();
            requestAnimationFrame(() => {
              onDelete(item);
            });
          }}
        >
          <Text style={s.swipeActionIcon}>⌫</Text>
          <Text style={s.swipeActionLabel}>{zh ? '删除' : 'Delete'}</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[s.goalTaskSwipeCard, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          style={s.goalTaskRow}
          onPress={() => {
            if (openedRef.current) close();
            else onDetail(item);
          }}
        >
          <View style={[s.goalTaskDot, item.completed ? s.goalTaskDotDone : s.goalTaskDotTodo]} />
          <View style={s.goalTaskTextWrap}>
            <View style={s.goalTaskTopLine}>
              <Text style={s.goalTaskTitle} numberOfLines={1}>{item.taskLabel}</Text>
              <View style={s.goalTaskPillRow}>
                {priorityMeta ? (
                  <View style={[s.priorityPill, { backgroundColor: `${priorityMeta.color}18` }]}>
                    <Text style={[s.priorityPillText, { color: priorityMeta.color }]}>
                      {priorityMeta.shortLabel}
                    </Text>
                  </View>
                ) : null}
                {item.pinnedAt ? (
                  <View style={s.pinnedPill}>
                    <Text style={s.pinnedPillText}>{zh ? '置顶' : 'Pinned'}</Text>
                  </View>
                ) : null}
                <View style={[s.goalTaskBadge, item.completed ? s.goalTaskBadgeDone : s.goalTaskBadgeTodo]}>
                  <Text style={[s.goalTaskBadgeText, item.completed ? s.goalTaskBadgeTextDone : s.goalTaskBadgeTextTodo]}>
                    {item.completed ? (zh ? '完成' : 'Done') : (zh ? '待办' : 'Todo')}
                  </Text>
                </View>
              </View>
            </View>
            {!!item.description && (
              <Text style={s.goalTaskDesc} numberOfLines={1}>{item.description}</Text>
            )}
            <Text style={s.goalTaskMeta}>
              {zh
                ? `已专注 ${item.actualMinutes}/${item.durationMinutes} 分钟`
                : `${item.actualMinutes}/${item.durationMinutes} min focused`}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function TaskPieChart({ totalMinutes, totalSeconds, segments, zh }) {
  const width = 320;
  const height = 240;
  const centerX = width / 2;
  const centerY = 110;
  const strokeWidth = 26;
  const radius = 64;
  let startAngle = 0;

  const slices = segments.map((segment, index) => {
    const rawSweep = totalSeconds > 0 ? (segment.seconds / totalSeconds) * 360 : 0;
    const sweepAngle = segments.length === 1
      ? 360
      : index === segments.length - 1
        ? (360 - startAngle)
        : Math.max(1.2, rawSweep);
    const slice = {
      ...segment,
      startAngle,
      endAngle: startAngle + sweepAngle,
      midAngle: segments.length === 1 ? 20 : startAngle + (sweepAngle / 2),
    };
    startAngle += sweepAngle;
    return slice;
  });

  return (
    <View style={s.pieWrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Circle
          cx={centerX}
          cy={centerY}
          r={radius}
          stroke={C.surfaceContainerHighest}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {slices.map(slice => (
          slice.endAngle - slice.startAngle >= 359.9 ? (
            <Circle
              key={slice.label}
              cx={centerX}
              cy={centerY}
              r={radius}
              stroke={slice.color}
              strokeWidth={strokeWidth}
              fill="none"
            />
          ) : (
            <Path
              key={slice.label}
              d={describeArc(centerX, centerY, radius, slice.startAngle, slice.endAngle)}
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
            />
          )
        ))}
        {slices.map(slice => {
          const percentPoint = polarToCartesian(centerX, centerY, radius, slice.midAngle);
          const sweepAngle = slice.endAngle - slice.startAngle;
          const percentFontSize = sweepAngle < 26 ? 8 : sweepAngle < 42 ? 9 : 10;

          return (
            <SvgText
              key={`${slice.label}-percent`}
              x={percentPoint.x}
              y={percentPoint.y + 3}
              fontSize={String(percentFontSize)}
              fontWeight="800"
              fill="#FFFFFF"
              textAnchor="middle"
            >
              {`${slice.percent}%`}
            </SvgText>
          );
        })}
        {slices.map(slice => {
          const lineStart = polarToCartesian(centerX, centerY, radius + (strokeWidth / 2) + 2, slice.midAngle);
          const lineJoint = polarToCartesian(centerX, centerY, radius + 16, slice.midAngle);
          const isRight = lineJoint.x >= centerX;
          const bendY = lineJoint.y + (lineJoint.y >= centerY ? 8 : -8);
          const bendX = isRight ? Math.min(width - 46, lineJoint.x + 8) : Math.max(46, lineJoint.x - 8);
          const lineEndX = isRight ? Math.min(width - 28, bendX + 18) : Math.max(28, bendX - 18);
          const textAnchor = isRight ? 'start' : 'end';
          const textX = isRight ? lineEndX + 4 : lineEndX - 4;
          const textY = bendY + 4;

          return (
            <React.Fragment key={`${slice.label}-callout`}>
              <Line
                x1={lineStart.x}
                y1={lineStart.y}
                x2={lineJoint.x}
                y2={lineJoint.y}
                stroke={slice.color}
                strokeWidth={2}
              />
              <Line
                x1={lineJoint.x}
                y1={lineJoint.y}
                x2={bendX}
                y2={bendY}
                stroke={slice.color}
                strokeWidth={2}
              />
              <Line
                x1={bendX}
                y1={bendY}
                x2={lineEndX}
                y2={bendY}
                stroke={slice.color}
                strokeWidth={2}
              />
              <SvgText
                x={textX}
                y={textY}
                fontSize="10"
                fontWeight="700"
                fill={C.tertiary}
                textAnchor={textAnchor}
              >
                {formatTaskPieCallout(slice, zh)}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={s.pieCenter}>
        <Text style={s.pieTotal}>{totalMinutes}</Text>
        <Text style={s.pieUnit}>min</Text>
      </View>
    </View>
  );
}

function DatePickerModal({ zh, visible, selectedDate, dateOptions, onClose, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.dateModalOverlay} onPress={onClose}>
        <Pressable style={s.dateModalCard} onPress={() => {}}>
          <Text style={s.dateModalTitle}>{zh ? '选择查看日期' : 'Choose a date'}</Text>
          <ScrollView style={s.dateModalList} showsVerticalScrollIndicator={false}>
            {dateOptions.map(dateKey => {
              const active = dateKey === selectedDate;
              return (
                <TouchableOpacity
                  key={dateKey}
                  style={[s.dateOption, active && s.dateOptionActive]}
                  onPress={() => onSelect(dateKey)}
                >
                  <View>
                    <Text style={[s.dateOptionTitle, active && s.dateOptionTitleActive]}>
                      {formatTaskDateButtonLabel(dateKey, zh)}
                    </Text>
                    <Text style={[s.dateOptionSub, active && s.dateOptionSubActive]}>
                      {formatTaskDateLabel(dateKey, zh)}
                    </Text>
                  </View>
                  {active ? <Text style={s.dateOptionCheck}>✓</Text> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TaskFormModal({
  zh,
  visible,
  form,
  setForm,
  taskOptions,
  priorityOptions,
  selectedTaskLabel,
  selectedDurationMinutes,
  isValid,
  isCoreLocked,
  onClose,
  onSave,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.dateModalOverlay} onPress={onClose}>
        <Pressable style={s.taskModalCard} onPress={() => {}}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={s.dateModalTitle}>{form.mode === 'edit' ? (zh ? '任务详情' : 'Task Details') : (zh ? '新建任务' : 'New Task')}</Text>
            <Text style={s.taskModalHint} numberOfLines={1}>
              {isCoreLocked
                ? (zh ? '已完成，仅可修改描述。' : 'Done. Description only.')
                : (zh ? '任务和时长必填，其他选填。' : 'Task and duration required.')}
            </Text>

            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>{zh ? '专注任务 *' : 'Focus Task *'}</Text>
              <TouchableOpacity
                style={[
                  s.fieldSelector,
                  form.taskMenuOpen && s.fieldSelectorOpen,
                  isCoreLocked && s.fieldDisabled,
                ]}
                onPress={() => {
                  if (isCoreLocked) return;
                  setForm(prev => ({ ...prev, taskMenuOpen: !prev.taskMenuOpen }));
                }}
                disabled={isCoreLocked}
              >
                <Text style={[s.fieldSelectorText, !selectedTaskLabel && s.fieldPlaceholderText]}>
                  {selectedTaskLabel || (zh ? '请选择任务' : 'Select a task')}
                </Text>
                <Text style={s.fieldSelectorArrow}>{isCoreLocked ? (zh ? '锁定' : 'Locked') : form.taskMenuOpen ? '⌃' : '⌄'}</Text>
              </TouchableOpacity>
              {form.taskMenuOpen && !isCoreLocked ? (
                <View style={s.dropdownMenu}>
                  {taskOptions.map(option => {
                    const active = form.taskKey === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[s.dropdownOption, active && s.dropdownOptionActive]}
                        onPress={() => setForm(prev => ({
                          ...prev,
                          taskKey: option.key,
                          taskMenuOpen: option.key === 'custom',
                          customTask: option.key === 'custom' ? prev.customTask : '',
                        }))}
                      >
                        <Text style={[s.dropdownOptionText, active && s.dropdownOptionTextActive]}>{option.label}</Text>
                        {active ? <Text style={s.dropdownCheck}>✓</Text> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              {form.taskKey === 'custom' ? (
                <TextInput
                  style={[s.taskInput, isCoreLocked && s.fieldDisabled]}
                  placeholder={zh ? '输入自定义任务名' : 'Enter a custom task'}
                  placeholderTextColor="#B4ADA7"
                  value={form.customTask}
                  onChangeText={value => setForm(prev => ({ ...prev, customTask: value }))}
                  maxLength={30}
                  autoFocus={visible}
                  editable={!isCoreLocked}
                />
              ) : null}
            </View>

            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>{zh ? '任务描述' : 'Description'}</Text>
              <TextInput
                style={[s.taskInput, s.taskInputMulti]}
                placeholder={zh ? '补充这个任务的说明（可选）' : 'Add an optional description'}
                placeholderTextColor="#B4ADA7"
                value={form.description}
                onChangeText={value => setForm(prev => ({ ...prev, description: value }))}
                maxLength={50}
                multiline
              />
            </View>

            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>{zh ? '专注时长 *' : 'Focus Duration *'}</Text>
              <View style={s.durationChipRow}>
                {DURATION_PRESETS.map(minutes => {
                  const active = form.durationChoice === String(minutes);
                  return (
                    <TouchableOpacity
                      key={minutes}
                      style={[
                        s.durationChip,
                        active && s.durationChipActive,
                        isCoreLocked && s.durationChipDisabled,
                      ]}
                      onPress={() => setForm(prev => ({ ...prev, durationChoice: String(minutes), customDuration: '' }))}
                      disabled={isCoreLocked}
                    >
                      <Text style={[s.durationChipText, active && s.durationChipTextActive]}>{minutes}{zh ? '分' : 'm'}</Text>
                    </TouchableOpacity>
                  );
                })}
                <View style={s.durationCustomInline}>
                  <TouchableOpacity
                    style={[
                      s.durationChip,
                      form.durationChoice === 'custom' && s.durationChipActive,
                      isCoreLocked && s.durationChipDisabled,
                    ]}
                    onPress={() => setForm(prev => ({ ...prev, durationChoice: 'custom' }))}
                    disabled={isCoreLocked}
                  >
                    <Text style={[s.durationChipText, form.durationChoice === 'custom' && s.durationChipTextActive]}>
                      {zh ? '自定义' : 'Custom'}
                    </Text>
                  </TouchableOpacity>
                  {form.durationChoice === 'custom' ? (
                    <>
                      <TextInput
                        style={[s.taskInput, s.durationCustomInlineInput, isCoreLocked && s.fieldDisabled]}
                        placeholder={zh ? '分钟' : 'min'}
                        placeholderTextColor="#B4ADA7"
                        value={form.customDuration}
                        onChangeText={value => setForm(prev => ({ ...prev, customDuration: value.replace(/[^0-9]/g, '') }))}
                        keyboardType="number-pad"
                        maxLength={3}
                        editable={!isCoreLocked}
                      />
                      <Text style={s.durationCustomInlineSuffix}>{zh ? '分钟' : 'min'}</Text>
                    </>
                  ) : null}
                </View>
              </View>
              <Text style={s.fieldHelper}>
                {selectedDurationMinutes > 0
                  ? (zh ? `计划专注 ${selectedDurationMinutes} 分钟` : `Plan to focus for ${selectedDurationMinutes} min`)
                  : (zh ? '请输入有效的时长' : 'Enter a valid duration')}
              </Text>
            </View>

            <View style={s.fieldBlock}>
              <Text style={s.fieldLabel}>{zh ? '优先级' : 'Priority'}</Text>
              <View style={s.priorityGrid}>
                {priorityOptions.map(option => {
                  const active = form.priority === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        s.priorityCard,
                        active && s.priorityCardActive,
                        isCoreLocked && s.priorityCardDisabled,
                      ]}
                      onPress={() => setForm(prev => ({ ...prev, priority: active ? '' : option.key }))}
                      disabled={isCoreLocked}
                    >
                      <Text style={[s.priorityCardTitle, active && { color: option.color }]}>{option.shortLabel}</Text>
                      <Text style={s.priorityCardDesc} numberOfLines={1}>{zh ? option.descZh : option.descEn}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={s.taskModalActions}>
              <TouchableOpacity style={s.taskModalSecondary} onPress={onClose}>
                <Text style={s.taskModalSecondaryText}>{zh ? '取消' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.taskModalPrimary, !isValid && s.taskModalPrimaryDisabled]} onPress={onSave} disabled={!isValid}>
                <Text style={s.taskModalPrimaryText}>{form.mode === 'edit' ? (zh ? '保存修改' : 'Save') : (zh ? '创建任务' : 'Create')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (C) => StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 70, paddingBottom: 100 },
  h: { fontSize: 24, fontWeight: '900', color: C.tertiary, marginBottom: 16 },
  card: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadow.shadowColor,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeadText: { flex: 1 },
  ct: { color: C.tertiary, fontSize: 17, fontWeight: '800' },
  cardSub: { color: C.onSurfaceVariant, fontSize: 13, lineHeight: 22, marginTop: 8 },
  detailToggleBtn: {
    marginLeft: 12,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  detailToggleBtnText: { color: C.primary, fontSize: 13, fontWeight: '800' },
  goalActionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  datePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  datePickerBtnLabel: { color: C.tertiary, fontSize: 13, fontWeight: '700' },
  datePickerBtnChevron: { color: C.primary, fontSize: 16, fontWeight: '800', marginLeft: 12 },
  addTaskBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTaskBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  goalSummaryPanel: {
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: C.surfaceContainerLow,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  progressRingWrap: { width: 114, height: 114, justifyContent: 'center', alignItems: 'center' },
  progressRingCenter: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  progressRingValue: { color: C.tertiary, fontSize: 18, fontWeight: '900' },
  goalSummaryText: { flex: 1 },
  goalSummaryTitle: { color: C.tertiary, fontSize: 22, fontWeight: '900' },
  goalSummaryDesc: { color: C.onSurfaceVariant, fontSize: 15, lineHeight: 22, marginTop: 6 },
  progBar: {
    height: 10,
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 16,
  },
  progFill: { height: '100%', borderRadius: 999, backgroundColor: C.primary },
  goalSummaryMeta: { color: C.onSurfaceVariant, fontSize: 12, lineHeight: 18, marginTop: 10 },
  sectionBlock: { marginTop: 22 },
  sectionTitle: { color: C.tertiary, fontSize: 14, fontWeight: '800', marginBottom: 10 },
  swipeRowWrap: {
    position: 'relative',
    marginBottom: 10,
    overflow: 'hidden',
    borderRadius: 16,
  },
  swipeActionRail: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    width: SWIPE_ACTION_TOTAL_WIDTH,
  },
  swipeActionBtn: {
    width: SWIPE_ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  swipeActionPin: { backgroundColor: '#4A84F4' },
  swipeActionDelete: { backgroundColor: '#FF5A44' },
  swipeActionIcon: { color: '#fff', fontSize: 20, fontWeight: '900' },
  swipeActionLabel: { color: '#fff', fontSize: 13, fontWeight: '800' },
  goalTaskSwipeCard: { backgroundColor: 'transparent' },
  goalTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  goalTaskDot: { width: 10, height: 10, borderRadius: 999 },
  goalTaskDotDone: { backgroundColor: '#5A9E6F' },
  goalTaskDotTodo: { backgroundColor: '#D8D5D1' },
  goalTaskTextWrap: { flex: 1 },
  goalTaskTopLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalTaskTitle: { flex: 1, color: C.tertiary, fontSize: 14, fontWeight: '700' },
  goalTaskPillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  goalTaskDesc: { color: C.onSurfaceVariant, fontSize: 12, marginTop: 3 },
  goalTaskMeta: { color: C.onSurfaceVariant, fontSize: 12, marginTop: 3 },
  goalTaskBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  goalTaskBadgeDone: { backgroundColor: 'rgba(90,158,111,0.14)' },
  goalTaskBadgeTodo: { backgroundColor: 'rgba(163,154,145,0.14)' },
  goalTaskBadgeText: { fontSize: 11, fontWeight: '800' },
  goalTaskBadgeTextDone: { color: '#5A9E6F' },
  goalTaskBadgeTextTodo: { color: '#877F79' },
  priorityPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  priorityPillText: { fontSize: 10, fontWeight: '800' },
  pinnedPill: { backgroundColor: 'rgba(74,132,244,0.14)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  pinnedPillText: { color: '#4A84F4', fontSize: 10, fontWeight: '800' },
  emptyPanel: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyPanelText: { color: C.onSurfaceVariant, fontSize: 13, lineHeight: 22 },
  taskChartWrap: { alignItems: 'center', marginTop: 14 },
  pieWrap: { width: '100%', maxWidth: 320, height: 240, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  pieCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pieTotal: { color: C.tertiary, fontSize: 30, fontWeight: '900', lineHeight: 34 },
  pieUnit: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '700', marginTop: 2 },
  taskLegend: { width: '100%', gap: 10 },
  taskLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  taskLegendDot: { width: 12, height: 12, borderRadius: 999 },
  taskLegendTextWrap: { flex: 1 },
  taskLegendSingleLine: { color: C.tertiary, fontSize: 13, lineHeight: 18 },
  taskLegendLabel: { color: C.tertiary, fontSize: 13, fontWeight: '700' },
  taskLegendMetaInline: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '600' },
  hourChartWrap: { flexDirection: 'row', marginTop: 12, minHeight: 170 },
  yAxis: {
    width: 44,
    height: HOUR_PLOT_HEIGHT + 30,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
    paddingBottom: 22,
  },
  yAxisTick: { minHeight: 18, justifyContent: 'center' },
  axisLabel: { color: C.outline, fontSize: 11, textAlign: 'right', width: 28 },
  chartPlotWrap: {
    flex: 1,
    height: HOUR_PLOT_HEIGHT + 30,
    position: 'relative',
    paddingLeft: 10,
  },
  yAxisLine: {
    position: 'absolute',
    left: 10,
    top: 4,
    bottom: 22,
    width: 1,
    backgroundColor: C.border,
  },
  xAxisLine: {
    position: 'absolute',
    left: 10,
    right: 0,
    bottom: 22,
    height: 1,
    backgroundColor: C.border,
  },
  chartScroll: { flex: 1 },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: HOUR_PLOT_HEIGHT + 30,
    paddingLeft: 16,
    paddingRight: 6,
    gap: 6,
  },
  barCol: { width: 24, alignItems: 'center', justifyContent: 'flex-end' },
  barTrack: {
    width: 16,
    height: HOUR_PLOT_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: { width: 16, borderRadius: 999, minHeight: 4 },
  barLabel: { color: C.outline, fontSize: 9, marginTop: 6 },
  hourHint: { color: C.onSurfaceVariant, fontSize: 13, lineHeight: 22, marginTop: 14 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  genBtn: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 2 },
  genBtnT: { color: '#fff', fontSize: 13, fontWeight: '800' },
  reportBox: { marginTop: 14, backgroundColor: C.surfaceContainerLow, borderRadius: 14, padding: 14 },
  reportT: { color: C.tertiary, fontSize: 14, lineHeight: 22 },
  reportPlaceholder: {
    marginTop: 18,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  reportPlaceholderText: { color: C.onSurfaceVariant, fontSize: 13, lineHeight: 22 },
  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(28,24,20,0.28)', justifyContent: 'center', padding: 24 },
  dateModalCard: { backgroundColor: '#fff', borderRadius: 22, padding: 18, maxHeight: '72%', borderWidth: 1, borderColor: C.border },
  dateModalTitle: { color: C.tertiary, fontSize: 17, fontWeight: '800', marginBottom: 14 },
  dateModalList: { maxHeight: 380 },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: C.surfaceContainerLow,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dateOptionActive: { borderColor: C.primary, backgroundColor: 'rgba(242, 152, 95, 0.14)' },
  dateOptionTitle: { color: C.tertiary, fontSize: 14, fontWeight: '700' },
  dateOptionTitleActive: { color: C.primary },
  dateOptionSub: { color: C.onSurfaceVariant, fontSize: 11, marginTop: 3 },
  dateOptionSubActive: { color: C.primary },
  dateOptionCheck: { color: C.primary, fontSize: 16, fontWeight: '900' },
  taskModalCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    maxHeight: '86%',
  },
  taskModalHint: { color: C.onSurfaceVariant, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  fieldBlock: { marginBottom: 14 },
  fieldLabel: { color: C.tertiary, fontSize: 14, fontWeight: '800', marginBottom: 8 },
  fieldSelector: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldSelectorOpen: { borderColor: C.primary },
  fieldSelectorText: { color: C.tertiary, fontSize: 15, fontWeight: '600' },
  fieldPlaceholderText: { color: '#B4ADA7', fontWeight: '500' },
  fieldSelectorArrow: { color: C.primary, fontSize: 16, fontWeight: '800' },
  fieldDisabled: {
    opacity: 0.62,
    backgroundColor: C.surfaceContainerLowest,
  },
  dropdownMenu: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dropdownOptionActive: { backgroundColor: 'rgba(242, 152, 95, 0.12)' },
  dropdownOptionText: { color: C.tertiary, fontSize: 14, fontWeight: '600' },
  dropdownOptionTextActive: { color: C.primary, fontWeight: '700' },
  dropdownCheck: { color: C.primary, fontSize: 14, fontWeight: '900' },
  taskInput: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.tertiary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  taskInputMulti: {
    minHeight: 82,
    textAlignVertical: 'top',
  },
  durationChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.border,
  },
  durationChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  durationChipDisabled: { opacity: 0.62 },
  durationChipText: { color: C.tertiary, fontSize: 13, fontWeight: '700' },
  durationChipTextActive: { color: '#fff' },
  durationCustomInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationCustomInlineInput: {
    width: 72,
    height: 36,
    marginTop: 0,
    paddingHorizontal: 10,
    paddingVertical: 0,
    textAlign: 'center',
  },
  durationCustomInlineSuffix: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '700' },
  fieldHelper: { color: C.onSurfaceVariant, fontSize: 12, lineHeight: 18, marginTop: 8 },
  priorityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  priorityCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  priorityCardActive: { borderColor: C.primary, backgroundColor: 'rgba(242, 152, 95, 0.12)' },
  priorityCardDisabled: { opacity: 0.62 },
  priorityCardTitle: { color: C.tertiary, fontSize: 14, fontWeight: '800' },
  priorityCardDesc: { color: C.onSurfaceVariant, flex: 1, fontSize: 12, lineHeight: 16 },
  taskModalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  taskModalSecondary: {
    flex: 1,
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  taskModalSecondaryText: { color: C.onSurface, fontSize: 13, fontWeight: '700' },
  taskModalPrimary: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  taskModalPrimaryDisabled: { opacity: 0.45 },
  taskModalPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
