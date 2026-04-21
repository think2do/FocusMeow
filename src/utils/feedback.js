import { Vibration } from 'react-native';
import { isHapticsEnabled, playSfx } from './audio';

const VIBRATE = {
  tap: 10,
  short: 50,
  medium: 100,
  long: 200,
  double: [0, 80, 60, 80],
  triple: [0, 60, 40, 60, 40, 60],
  success: [0, 50, 30, 100],
  sad: [0, 200, 100, 200],
};

export function vibrate(type = 'short') {
  if (!isHapticsEnabled()) return;
  try {
    const pattern = VIBRATE[type] || VIBRATE.short;
    Vibration.vibrate(pattern);
  } catch (e) {}
}

export function playFeedback(event) {
  playSfx(event);
  switch (event) {
    case 'start': vibrate('medium'); break;
    case 'complete': vibrate('success'); break;
    case 'hungry': vibrate('short'); break;
    case 'dead': vibrate('sad'); break;
    default: break;
  }
}
