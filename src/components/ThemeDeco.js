import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Ellipse, Text as ST } from 'react-native-svg';
const W = Math.min(Dimensions.get('window').width, 480);

export function PinkDeco() {
  return (<View style={s.w}><Svg width={W} height={140} viewBox={`0 0 ${W} 140`}>
    {/* Pink clouds / bubbles */}
    <Ellipse cx={W*0.12} cy={40} rx={35} ry={28} fill="rgba(255,105,180,0.12)"/>
    <Ellipse cx={W*0.42} cy={55} rx={50} ry={35} fill="rgba(255,150,200,0.1)"/>
    <Ellipse cx={W*0.78} cy={38} rx={32} ry={25} fill="rgba(255,120,180,0.11)"/>
    <Ellipse cx={W*0.6} cy={85} rx={40} ry={28} fill="rgba(255,130,190,0.08)"/>
    {/* Rolling hills */}
    <Path d={`M0,140 L0,100 Q${W*0.12},75 ${W*0.25},95 Q${W*0.38},70 ${W*0.5},90 Q${W*0.62},68 ${W*0.75},92 Q${W*0.88},72 ${W},95 L${W},140 Z`} fill="rgba(255,130,180,0.1)"/>
    <Path d={`M0,140 L0,115 Q${W*0.15},95 ${W*0.3},110 Q${W*0.5},90 ${W*0.7},108 Q${W*0.85},92 ${W},110 L${W},140 Z`} fill="rgba(255,150,190,0.07)"/>
    {/* Floating elements */}
    <ST x={W*0.08} y={28} fontSize="16" opacity="0.18">🌸</ST>
    <ST x={W*0.32} y={40} fontSize="12" opacity="0.15">💗</ST>
    <ST x={W*0.55} y={25} fontSize="14" opacity="0.16">🌸</ST>
    <ST x={W*0.82} y={50} fontSize="10" opacity="0.13">💕</ST>
    <ST x={W*0.2} y={70} fontSize="11" opacity="0.12">🎀</ST>
    <ST x={W*0.7} y={72} fontSize="13" opacity="0.14">🌷</ST>
    <ST x={W*0.45} y={18} fontSize="10" opacity="0.1">✨</ST>
    <ST x={W*0.9} y={30} fontSize="9" opacity="0.1">💖</ST>
  </Svg></View>);
}

export function ForestDeco() {
  return (<View style={s.w}><Svg width={W} height={130} viewBox={`0 0 ${W} 130`}>
    <Path d={`M0,130 L0,70 Q${W*0.06},30 ${W*0.12},60 Q${W*0.18},20 ${W*0.25},50 Q${W*0.3},10 ${W*0.38},45 Q${W*0.44},15 ${W*0.5},40 Q${W*0.56},5 ${W*0.62},35 Q${W*0.7},15 ${W*0.75},45 Q${W*0.82},20 ${W*0.88},50 Q${W*0.94},30 ${W},55 L${W},130 Z`} fill="rgba(12,55,22,0.3)"/>
    <Path d={`M0,130 L0,90 Q${W*0.1},65 ${W*0.2},80 Q${W*0.3},55 ${W*0.4},75 Q${W*0.5},50 ${W*0.6},70 Q${W*0.7},55 ${W*0.8},75 Q${W*0.9},60 ${W},78 L${W},130 Z`} fill="rgba(15,65,28,0.22)"/>
    <Path d={`M0,130 L0,105 Q${W*0.15},88 ${W*0.3},100 Q${W*0.5},85 ${W*0.7},98 Q${W*0.85},90 ${W},100 L${W},130 Z`} fill="rgba(18,75,30,0.15)"/>
    <ST x={W*0.18} y={42} fontSize="14" opacity="0.15">🦋</ST>
    <ST x={W*0.72} y={35} fontSize="12" opacity="0.12">🦋</ST>
    <ST x={W*0.5} y={55} fontSize="10" opacity="0.1">🌸</ST>
  </Svg></View>);
}

export function BeachDeco() {
  return (<View style={s.w}><Svg width={W} height={130} viewBox={`0 0 ${W} 130`}>
    <Path d={`M0,55 Q${W*0.15},35 ${W*0.3},55 Q${W*0.45},75 ${W*0.6},55 Q${W*0.75},35 ${W*0.9},55 Q${W*0.95},65 ${W},55 L${W},130 L0,130 Z`} fill="rgba(30,100,150,0.18)"/>
    <Path d={`M0,70 Q${W*0.15},85 ${W*0.3},70 Q${W*0.45},55 ${W*0.6},70 Q${W*0.75},85 ${W*0.9},70 L${W},75 L${W},130 L0,130 Z`} fill="rgba(20,80,130,0.13)"/>
    <Path d={`M0,95 Q${W*0.25},85 ${W*0.5},95 Q${W*0.75},105 ${W},95 L${W},130 L0,130 Z`} fill="rgba(194,160,100,0.12)"/>
    <ST x={W*0.6} y={38} fontSize="16" opacity="0.1">🐬</ST>
    <ST x={W*0.25} y={82} fontSize="10" opacity="0.08">🐚</ST>
  </Svg></View>);
}

export function AuroraDeco() {
  return (<View style={s.w}><Svg width={W} height={130} viewBox={`0 0 ${W} 130`}>
    <Ellipse cx={W*0.5} cy={40} rx={W*0.55} ry={22} fill="rgba(120,0,255,0.07)"/>
    <Ellipse cx={W*0.45} cy={60} rx={W*0.5} ry={18} fill="rgba(160,50,255,0.06)"/>
    <Ellipse cx={W*0.55} cy={80} rx={W*0.45} ry={16} fill="rgba(100,20,220,0.05)"/>
    <Ellipse cx={W*0.4} cy={50} rx={W*0.3} ry={12} fill="rgba(180,80,255,0.04)"/>
    <ST x={W*0.3} y={30} fontSize="8" opacity="0.1">❄️</ST>
    <ST x={W*0.7} y={25} fontSize="6" opacity="0.08">✦</ST>
  </Svg></View>);
}

export function CosmosDeco() {
  const stars = [];
  for (let i=0;i<25;i++) { stars.push(<Circle key={i} cx={(i*37+13)%W} cy={10+(i*23+7)%100} r={i%3===0?1.5:1} fill={i%7===0?'#FFD700':'#fff'} opacity={0.1+(i%5)*0.06}/>); }
  return (<View style={s.w}><Svg width={W} height={130} viewBox={`0 0 ${W} 130`}>
    {stars}
    <Ellipse cx={W*0.2} cy={90} rx={25} ry={12} fill="rgba(100,50,200,0.06)"/>
    <Ellipse cx={W*0.75} cy={70} rx={18} ry={9} fill="rgba(50,100,200,0.05)"/>
    <ST x={W*0.7} y={40} fontSize="14" opacity="0.07">🪐</ST>
    <ST x={W*0.15} y={55} fontSize="8" opacity="0.05">🚀</ST>
  </Svg></View>);
}

const s = StyleSheet.create({ w: { position: 'absolute', bottom: 0, left: 0, right: 0, pointerEvents: 'none' } });
