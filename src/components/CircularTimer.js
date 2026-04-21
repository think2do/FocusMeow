import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { C } from '../utils/theme';
import { useGame } from '../../App';

const AC = Animated.createAnimatedComponent(Circle);

export default function CircularTimer({ progress, timeLeft, size = 240 }) {
  useGame();
  const cst = createStyles(C);
  const av = useRef(new Animated.Value(0)).current;
  const r = (size - 20) / 2, ci = 2 * Math.PI * r;
  const m = Math.floor(timeLeft / 60), s = timeLeft % 60;

  useEffect(() => {
    Animated.timing(av, { toValue: progress, duration: 1000, easing: Easing.linear, useNativeDriver: false }).start();
  }, [av, progress]);

  const off = av.interpolate({ inputRange: [0, 1], outputRange: [ci, 0] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }], position: 'absolute' }}>
        <Defs>
          <LinearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={C.primary} />
            <Stop offset="100%" stopColor={C.primaryContainer} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.surfaceContainerHigh} strokeWidth={10} />
        <AC cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#tg)" strokeWidth={12} strokeLinecap="round" strokeDasharray={ci} strokeDashoffset={off} />
      </Svg>
      <Text style={cst.t}>{`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`}</Text>
      <Text style={cst.label}>REMAINING</Text>
    </View>
  );
}
const createStyles = (C) => StyleSheet.create({
  t: { fontSize: 48, fontWeight: '800', color: C.onSurface, letterSpacing: 2 },
  label: { fontSize: 11, fontWeight: '600', color: C.outline, letterSpacing: 3, marginTop: 4 },
});
