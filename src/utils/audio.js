import { Image, NativeModules, Platform } from 'react-native';

export const DEFAULT_AUDIO_PREFS = {
  sfxEnabled: true,
  hapticsEnabled: true,
  ambientEnabled: false,
  ambientTrack: 'rain',
};

export const AMBIENT_TRACKS = [
  { key: 'rain', zh: '雨声', en: 'Rain' },
  { key: 'night', zh: '夜森林', en: 'Night Forest' },
  { key: 'bird', zh: '鸟鸣', en: 'Birds' },
];

const { AmbientAudio } = NativeModules;
const AMBIENT_ASSETS = {
  rain: require('../assets/audio/light-rain-loop.wav'),
  night: require('../assets/audio/night-forest-with-insects.wav'),
  bird: require('../assets/audio/bird-sound.wav'),
};
const SFX_ASSETS = {
  catSwitch: require('../assets/audio/cat-switch.wav'),
  petCat: require('../assets/audio/cat-pet-meow.wav'),
  teaseCat: require('../assets/audio/cat-tease-meow.mp3'),
  hungry: require('../assets/audio/focus-interrupt-hungry.wav'),
  dead: require('../assets/audio/focus-runaway-angry.wav'),
};

let runtimeAudioPrefs = { ...DEFAULT_AUDIO_PREFS };
let focusAmbientActive = false;
let currentAmbientTrack = null;

const resolveAmbientUri = (trackKey) => {
  const asset = AMBIENT_ASSETS[trackKey];
  if (!asset) return '';
  const resolved = Image.resolveAssetSource(asset);
  return resolved?.uri || '';
};

const resolveSfxUri = (event) => {
  const asset = SFX_ASSETS[event];
  if (!asset) return '';
  const resolved = Image.resolveAssetSource(asset);
  return resolved?.uri || '';
};

export function setAudioPreferences(nextPrefs = {}) {
  runtimeAudioPrefs = { ...runtimeAudioPrefs, ...nextPrefs };
}

export function getAudioPreferences() {
  return runtimeAudioPrefs;
}

export function isHapticsEnabled() {
  return runtimeAudioPrefs.hapticsEnabled !== false;
}

export function playSfx(event = 'tap') {
  if (!runtimeAudioPrefs.sfxEnabled) return;
  if (!SFX_ASSETS[event] || Platform.OS !== 'ios' || !AmbientAudio?.playSfx) return;
  try {
    AmbientAudio.playSfx(event, resolveSfxUri(event)).catch(error => {
      console.warn('[audio] play sfx failed', event, error);
    });
  } catch (error) {
    console.warn('[audio] play sfx failed', event, error);
  }
}

export async function stopAmbientPlayback() {
  currentAmbientTrack = null;
  if (Platform.OS !== 'ios' || !AmbientAudio?.stop) return;
  try {
    await AmbientAudio.stop();
  } catch (error) {
    console.warn('[audio] stop ambient failed', error);
  }
}

export async function playAmbientTrack(trackKey) {
  if (Platform.OS !== 'ios') return;
  const safeTrack = AMBIENT_ASSETS[trackKey] ? trackKey : DEFAULT_AUDIO_PREFS.ambientTrack;
  const uri = resolveAmbientUri(safeTrack) || '';
  try {
    if (AmbientAudio?.playTrack) {
      await AmbientAudio.playTrack(safeTrack, uri);
    } else if (AmbientAudio?.play) {
      if (!uri) return;
      await AmbientAudio.play(uri);
    } else {
      console.warn('[audio] AmbientAudio native module is unavailable');
      return;
    }
    currentAmbientTrack = safeTrack;
  } catch (error) {
    console.warn('[audio] play ambient failed', safeTrack, error);
  }
}

export function setFocusAmbientActive(active) {
  focusAmbientActive = !!active;
  syncAmbientPlayback(runtimeAudioPrefs, focusAmbientActive);
}

export async function syncAmbientPlayback(prefs = runtimeAudioPrefs, active = focusAmbientActive) {
  const safePrefs = { ...DEFAULT_AUDIO_PREFS, ...prefs };
  if (!safePrefs.ambientEnabled || !active) {
    await stopAmbientPlayback();
    return;
  }
  const targetTrack = AMBIENT_ASSETS[safePrefs.ambientTrack] ? safePrefs.ambientTrack : DEFAULT_AUDIO_PREFS.ambientTrack;
  if (currentAmbientTrack === targetTrack) return;
  await playAmbientTrack(targetTrack);
}
