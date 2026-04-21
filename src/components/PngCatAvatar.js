import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Image, View } from 'react-native';
import CAT_IMAGES from '../data/catImages';

// Frame durations (ms)
const FRAME_MS = 100; // 10fps base
const IDLE_FRAMES = 10; // 10 frames per pose = 1000ms
const EAT_FRAMES = 6;  // 6 frames per pose = 600ms
const IDLE_HOLD = 10000; // sit-2 hold at end = 10s
const IDLE_WAIT = 10000; // wait before first wag = 10s
const HAPPY_DURATION = 1000; // happy flash = 1s

export default function PngCatAvatar({ breedId = 'orange', state = 'idle', size = 120, rounded = 0, displayMode = 'default' }) {
  const imgs = CAT_IMAGES[breedId] || CAT_IMAGES.orange;
  const compact = displayMode === 'compact';
  // Default mode protects the large focus/result cards from any clipping.
  // Compact mode is for small slots like Home/Chat/Collection where we want the cat to look larger
  // while still staying visually inside the rounded frame.
  const inset = rounded
    ? compact
      ? Math.max(1, Math.round(size * 0.02))
      : Math.max(2, Math.round(size * 0.04))
    : 0;
  const baseSize = Math.max(1, size - inset * 2);
  const compactScale = compact ? (breedId === 'persian' ? 1.2 : 1.12) : 1;
  const imgSize = Math.round(baseSize * compactScale);
  const [frame, setFrame] = useState(imgs.sit1);
  const timersRef = useRef([]);
  const mountedRef = useRef(true);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((callback, delay) => {
    const id = setTimeout(() => {
      if (mountedRef.current) callback();
    }, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // ── IDLE: sit-1 default, tail wag every 10s ──
  const startIdle = useCallback(() => {
    setFrame(imgs.sit1);

    const playTailWag = () => {
      if (!mountedRef.current) return;
      const steps = [
        [imgs.sit1, IDLE_FRAMES * FRAME_MS],
        [imgs.sit2, IDLE_FRAMES * FRAME_MS],
        [imgs.sit1, IDLE_FRAMES * FRAME_MS],
        [imgs.sit2, IDLE_FRAMES * FRAME_MS],
        [imgs.sit1, IDLE_FRAMES * FRAME_MS],
        [imgs.sit2, IDLE_HOLD],
      ];

      let delay = 0;
      steps.forEach(([img, dur]) => {
        schedule(() => setFrame(img), delay);
        delay += dur;
      });

      schedule(playTailWag, delay);
    };

    schedule(playTailWag, IDLE_WAIT);
  }, [imgs, schedule]);

  // ── EATING: eat-1→2→3→4 loop (6 frames each) ──
  const startEating = useCallback(() => {
    const eatFrames = [imgs.eat1, imgs.eat2, imgs.eat3, imgs.eat4];
    let index = 0;
    setFrame(eatFrames[0]);

    const tick = () => {
      if (!mountedRef.current) return;
      index = (index + 1) % eatFrames.length;
      setFrame(eatFrames[index]);
      schedule(tick, EAT_FRAMES * FRAME_MS);
    };
    schedule(tick, EAT_FRAMES * FRAME_MS);
  }, [imgs, schedule]);

  // ── State change handler ──
  useEffect(() => {
    clearAllTimers();

    switch (state) {
      case 'idle':
        startIdle();
        break;
      case 'eating':
        startEating();
        break;
      case 'happy':
        setFrame(imgs.happy);
        schedule(() => {
          setFrame(imgs.sit1);
          startIdle();
        }, HAPPY_DURATION);
        break;
      case 'complete':
        setFrame(imgs.eat5);
        break;
      case 'hungry':
        setFrame(imgs.hungry || imgs.die);
        break;
      case 'left':
        setFrame(imgs.left || imgs.hungry || imgs.sit2 || imgs.sit1);
        break;
      case 'dead':
        setFrame(imgs.die);
        break;
      default:
        setFrame(imgs.sit1);
    }

    return clearAllTimers;
  }, [clearAllTimers, imgs, schedule, startEating, startIdle, state]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderRadius: rounded, overflow: rounded ? 'hidden' : 'visible', padding: inset }}>
      <Image source={frame} style={{ width: imgSize, height: imgSize, backgroundColor: 'transparent' }} resizeMode="contain" />
    </View>
  );
}
