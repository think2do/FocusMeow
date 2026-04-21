import { NativeModules, Platform } from 'react-native';

const { FocusSessionActivity } = NativeModules;

const pad2 = value => String(Math.max(0, value)).padStart(2, '0');

export const formatRemainingTime = (seconds = 0) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${pad2(minutes)}:${pad2(secs)}`;
};

const getElapsedSeconds = ({ durationSeconds = 0, timeLeft = 0, startedAt = 0 }) => {
  const duration = Math.max(0, Math.floor(Number(durationSeconds) || 0));
  if (!duration) return 0;

  if (startedAt) {
    return Math.min(duration, Math.max(0, Math.floor((Date.now() - Number(startedAt)) / 1000)));
  }

  return Math.min(duration, Math.max(0, duration - Math.floor(Number(timeLeft) || 0)));
};

const buildTitle = ({ lang = 'zh', timeLeft = 0 }) => {
  const prefix = lang === 'zh' ? '专注倒计时' : 'Focus countdown';
  return `${prefix} ${formatRemainingTime(timeLeft)}`;
};

const buildSubtitle = ({ lang = 'zh', task = '' }) => {
  const cleanTask = String(task || '').trim();
  if (!cleanTask) return lang === 'zh' ? 'Focus Meow 正在陪你专注' : 'Focus Meow is staying with you';
  return lang === 'zh' ? `当前任务：${cleanTask}` : `Task: ${cleanTask}`;
};

export async function startFocusActivity(options = {}) {
  if (Platform.OS !== 'ios' || !FocusSessionActivity?.start) return;
  const durationSeconds = Math.max(0, Math.floor(Number(options.durationSeconds) || 0));
  if (!durationSeconds) return;

  try {
    await FocusSessionActivity.start(
      buildTitle(options),
      buildSubtitle(options),
      durationSeconds,
      getElapsedSeconds(options)
    );
  } catch (error) {
    console.warn('[focusActivity] start failed', error);
  }
}

export async function updateFocusActivity(options = {}) {
  if (Platform.OS !== 'ios' || !FocusSessionActivity?.update) return;
  try {
    await FocusSessionActivity.update(
      buildTitle(options),
      buildSubtitle(options),
      Math.max(0, Math.floor(Number(options.durationSeconds) || 0)),
      getElapsedSeconds(options)
    );
  } catch (error) {
    console.warn('[focusActivity] update failed', error);
  }
}

export async function stopFocusActivity() {
  if (Platform.OS !== 'ios' || !FocusSessionActivity?.stop) return;
  try {
    await FocusSessionActivity.stop();
  } catch (error) {
    console.warn('[focusActivity] stop failed', error);
  }
}

export async function prepareFocusReminderPermission() {
  if (Platform.OS !== 'ios' || !FocusSessionActivity?.prepareReminderPermission) return false;
  try {
    return await FocusSessionActivity.prepareReminderPermission();
  } catch (error) {
    console.warn('[focusActivity] prepare reminder permission failed', error);
    return false;
  }
}

export async function sendFocusReminder({ title = '', body = '', delaySeconds = 1 } = {}) {
  if (Platform.OS !== 'ios' || !FocusSessionActivity?.remind) return false;
  const cleanTitle = String(title || '').trim();
  const cleanBody = String(body || '').trim();
  if (!cleanTitle || !cleanBody) return false;

  try {
    if (FocusSessionActivity?.remindAfter) {
      return await FocusSessionActivity.remindAfter(cleanTitle, cleanBody, Math.max(0.2, Number(delaySeconds) || 1));
    }
    return await FocusSessionActivity.remind(cleanTitle, cleanBody);
  } catch (error) {
    console.warn('[focusActivity] reminder failed', error);
    return false;
  }
}

export async function cancelFocusReminder() {
  if (Platform.OS !== 'ios' || !FocusSessionActivity?.cancelReminder) return false;
  try {
    return await FocusSessionActivity.cancelReminder();
  } catch (error) {
    console.warn('[focusActivity] cancel reminder failed', error);
    return false;
  }
}

export async function consumeDeviceLockDuringFocusFlag() {
  if (Platform.OS !== 'ios' || !FocusSessionActivity?.consumeDeviceLockFlag) return false;
  try {
    return await FocusSessionActivity.consumeDeviceLockFlag();
  } catch (error) {
    console.warn('[focusActivity] consume lock flag failed', error);
    return false;
  }
}

export async function consumeFocusInterruptionContext() {
  if (Platform.OS !== 'ios' || !FocusSessionActivity?.consumeFocusInterruptionContext) return 'none';
  try {
    return await FocusSessionActivity.consumeFocusInterruptionContext();
  } catch (error) {
    console.warn('[focusActivity] consume focus interruption context failed', error);
    return 'none';
  }
}
