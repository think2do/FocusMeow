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

// 部分品种图片需要放大以填满画面
const BREED_SCALE = { devon: 1.35, persian: 1.35, maine: 1.25 };

export default function PngCatAvatar({ breedId = 'orange', state = 'idle', size = 120, rounded = 0 }) {
  const imgs = CAT_IMAGES[breedId] || CAT_IMAGES.orange;
  const scale = BREED_SCALE[breedId] || 1.0;
  const imgSize = size * scale;
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
  }, []);

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
      case 'dead':
        setFrame(imgs.die);
        break;
      default:
        setFrame(imgs.sit1);
    }

    return clearAllTimers;
  }, [state, imgs]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderRadius: rounded, overflow: rounded ? 'hidden' : 'visible' }}>
      <Image source={frame} style={{ width: imgSize, height: imgSize, backgroundColor: 'transparent' }} resizeMode="contain" />
    </View>
  );
}
