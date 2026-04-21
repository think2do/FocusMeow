import React, { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { G, Ellipse, Path, Polygon, Circle, Line, Text as ST, Defs, LinearGradient, Stop } from 'react-native-svg';
import { BREEDS } from '../data/gameData';
import PngCatAvatar from './PngCatAvatar';
import { PNG_BREEDS } from '../data/catImages';

export default function CatAvatar({ breedId, level = 1, state = 'idle', size = 120, isRare, rareType, breed2, rounded = 0, displayMode = 'default' }) {
  // Use PNG sprites for normal breeds, or rare cats with PNG (black/rainbow/couple)
  if (PNG_BREEDS.includes(breedId)) {
    return <PngCatAvatar breedId={breedId} state={state} size={size} rounded={rounded} displayMode={displayMode} />;
  }

  // Map 'complete' state to 'happy' for SVG cats
  const svgState = state === 'complete' ? 'happy' : state;

  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (svgState === 'eating') {
      Animated.loop(Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(bob, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])).start();
      return () => bob.stopAnimation();
    } else bob.setValue(0);
  }, [svgState]);

  const breed = BREEDS.find(b => b.id === breedId) || BREEDS[0];
  const sc = Math.min(0.6 + level * 0.08, 1.0);

  const bc=breed.body, ac2=breed.accent, ec2=breed.ear;
  const tY=bob.interpolate({inputRange:[0,1],outputRange:[0,4]});
  const rot=bob.interpolate({inputRange:[0,0.5,1],outputRange:['0deg','-3deg','3deg']});

  const svg = (<Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    <Body cx={size/2} cy={size/2+6} breed={breed} bc={bc} ac={ac2} ec={ec2} sc={sc} level={level} state={svgState}/>
  </Svg>);

  if (svgState==='eating') return <Animated.View style={{transform:[{translateY:tY},{rotate:rot}]}}>{svg}</Animated.View>;
  return svg;
}

function Body({cx,cy,breed,bc,ac,ec,sc,level,state}) {
  const bDef = {
    ragdoll:  {bRx:0.54,bRy:0.44,hRx:0.58,hRy:0.50,earH:1.0, earW:0.58,eyeGap:8,eyeR:1.0, noseY:0.15,fluff:2},
    orange:   {bRx:0.56,bRy:0.46,hRx:0.60,hRy:0.52,earH:0.90,earW:0.55,eyeGap:8,eyeR:1.0, noseY:0.15,fluff:0},
    british:  {bRx:0.54,bRy:0.48,hRx:0.62,hRy:0.56,earH:0.75,earW:0.50,eyeGap:9,eyeR:1.2, noseY:0.12,fluff:0},
    maine:    {bRx:0.58,bRy:0.48,hRx:0.58,hRy:0.50,earH:1.20,earW:0.62,eyeGap:8,eyeR:0.9, noseY:0.16,fluff:4},
    siamese:  {bRx:0.48,bRy:0.40,hRx:0.55,hRy:0.48,earH:1.15,earW:0.62,eyeGap:9,eyeR:1.1, noseY:0.14,fluff:0},
    exotic:   {bRx:0.56,bRy:0.48,hRx:0.64,hRy:0.56,earH:0.70,earW:0.48,eyeGap:9,eyeR:1.4, noseY:0.10,fluff:0},
    blue:     {bRx:0.52,bRy:0.44,hRx:0.58,hRy:0.52,earH:0.85,earW:0.52,eyeGap:8,eyeR:1.1, noseY:0.14,fluff:0},
    golden:   {bRx:0.54,bRy:0.44,hRx:0.60,hRy:0.52,earH:0.90,earW:0.55,eyeGap:8,eyeR:1.0, noseY:0.15,fluff:1},
    tuxedo:   {bRx:0.52,bRy:0.42,hRx:0.56,hRy:0.48,earH:0.95,earW:0.56,eyeGap:7,eyeR:1.0, noseY:0.15,fluff:0},
    devon:    {bRx:0.50,bRy:0.40,hRx:0.54,hRy:0.46,earH:1.20,earW:0.64,eyeGap:9,eyeR:1.2, noseY:0.14,fluff:0},
    persian:  {bRx:0.58,bRy:0.48,hRx:0.64,hRy:0.56,earH:0.70,earW:0.48,eyeGap:8,eyeR:1.3, noseY:0.10,fluff:3},
    garfield: {bRx:0.60,bRy:0.50,hRx:0.64,hRy:0.58,earH:0.72,earW:0.48,eyeGap:8,eyeR:1.2, noseY:0.11,fluff:2},
  }[breed.id] || {bRx:0.54,bRy:0.44,hRx:0.58,hRy:0.50,earH:1.0,earW:0.58,eyeGap:8,eyeR:1.0,noseY:0.15,fluff:0};

  const bW=44*sc,bH=36*sc,hS=28*sc,eS=12*sc;
  const eyS=Math.max(3.5-level*0.1,2.2)*bDef.eyeR, puS=eyS*0.55;
  const isE=state==='eating',isHu=state==='hungry',isD=state==='dead',isHa=state==='happy'||state==='fed';
  const hY=cy-bH*0.28,fl=Math.min(bDef.fluff + (level>=4?2:level>=3?1:0), 4);
  const chO=level>=3?0.35:level>=2?0.2:0;
  const isBcH=typeof bc==='string'&&bc[0]==='#';
  const eGap=bDef.eyeGap*sc;

  return(<G>
    <Path d={`M${cx+bW*0.4},${cy+4} Q${cx+bW*0.4+20*sc*0.6},${cy-20*sc*0.3} ${cx+bW*0.35+20*sc},${cy-20*sc*0.7}`} fill="none" stroke={isBcH?bc:ac} strokeWidth={3*sc} strokeLinecap="round"/>
    <Ellipse cx={cx} cy={cy+4} rx={bW*bDef.bRx+fl} ry={bH*bDef.bRy+fl} fill={bc} stroke={ac} strokeWidth={0.5}/>
    {breed.id==='maine'&&<Ellipse cx={cx} cy={cy-2} rx={bW*0.35} ry={bH*0.25} fill={bc} stroke={ac} strokeWidth={0.3} opacity={0.7}/>}
    {breed.id==='tuxedo'&&<Ellipse cx={cx} cy={cy+6} rx={bW*0.3} ry={bH*0.3} fill="#333" opacity={0.85}/>}
    {breed.id==='ragdoll'&&<Ellipse cx={cx} cy={cy+2} rx={bW*0.28} ry={bH*0.22} fill="#fff" opacity={0.3}/>}
    {[-1,1].map(d=><Ellipse key={d} cx={cx+d*bW*0.28} cy={cy+bH*0.38} rx={5*sc} ry={3.5*sc} fill={isBcH?bc:ec} stroke={ac} strokeWidth={0.3}/>)}
    <Ellipse cx={cx} cy={hY} rx={hS*bDef.hRx+fl*0.5} ry={hS*bDef.hRy+fl*0.4} fill={bc} stroke={ac} strokeWidth={0.5}/>
    {breed.id==='siamese'&&<Ellipse cx={cx} cy={hY+4} rx={7*sc} ry={5*sc} fill={ac} opacity={0.5}/>}
    {breed.id==='exotic'&&<Ellipse cx={cx} cy={hY+3} rx={5*sc} ry={3*sc} fill={ac} opacity={0.2}/>}
    {[-1,1].map(d=><G key={`e${d}`}>
      <Polygon points={`${cx+d*hS*0.38},${hY-hS*0.3} ${cx+d*hS*bDef.earW},${hY-hS*0.3-eS*bDef.earH} ${cx+d*hS*0.12},${hY-hS*0.3-eS*0.5}`} fill={ec||bc} stroke={ac} strokeWidth={0.5}/>
      <Polygon points={`${cx+d*hS*0.38},${hY-hS*0.32} ${cx+d*hS*(bDef.earW-0.06)},${hY-hS*0.3-eS*(bDef.earH-0.2)} ${cx+d*hS*0.18},${hY-hS*0.3-eS*0.35}`} fill="#FFB6C1" opacity={0.5}/>
      {breed.id==='maine'&&<Line x1={cx+d*hS*(bDef.earW-0.05)} y1={hY-hS*0.3-eS*bDef.earH} x2={cx+d*hS*(bDef.earW+0.05)} y2={hY-hS*0.3-eS*(bDef.earH+0.15)} stroke={ec} strokeWidth={2*sc} strokeLinecap="round"/>}
    </G>)}
    {isD?[-1,1].map(d=><G key={d}><Line x1={cx+d*eGap-2.5} y1={hY-2.5} x2={cx+d*eGap+2.5} y2={hY+2.5} stroke="#666" strokeWidth={1.5} strokeLinecap="round"/><Line x1={cx+d*eGap+2.5} y1={hY-2.5} x2={cx+d*eGap-2.5} y2={hY+2.5} stroke="#666" strokeWidth={1.5} strokeLinecap="round"/></G>)
    :isHa?[-1,1].map(d=><Path key={d} d={`M${cx+d*eGap-eyS},${hY+1} Q${cx+d*eGap},${hY-3} ${cx+d*eGap+eyS},${hY+1}`} fill="none" stroke="#333" strokeWidth={1.5} strokeLinecap="round"/>)
    :[-1,1].map(d=><G key={d}>
      <Ellipse cx={cx+d*eGap} cy={hY} rx={eyS} ry={eyS*1.15} fill={isHu?'#FFD700':breed.id==='siamese'?'#4A90D9':breed.id==='blue'?'#5AAAE0':'#333'}/>
      <Ellipse cx={cx+d*eGap+0.5} cy={hY-0.5} rx={puS} ry={puS*(isHu?1.8:1.15)} fill="#111"/>
      <Circle cx={cx+d*eGap-1} cy={hY-1} r={1} fill="#fff"/>
      {(breed.id==='british'||breed.id==='exotic')&&<Circle cx={cx+d*eGap+1.5} cy={hY+1} r={0.6} fill="#fff" opacity={0.5}/>}
    </G>)}
    {breed.id==='exotic'?<Ellipse cx={cx} cy={hY+hS*bDef.noseY} rx={3.5*sc} ry={2.5*sc} fill="#FFB6C1"/>
    :<Polygon points={`${cx},${hY+hS*bDef.noseY} ${cx-2*sc},${hY+hS*(bDef.noseY+0.07)} ${cx+2*sc},${hY+hS*(bDef.noseY+0.07)}`} fill="#FFB6C1"/>}
    {isE?<G><Ellipse cx={cx} cy={hY+hS*0.32} rx={4*sc} ry={3*sc} fill="#FF6B6B"/><Ellipse cx={cx} cy={hY+hS*0.30} rx={2.5*sc} ry={1.5*sc} fill="#FF9999"/></G>
    :!isD&&<Path d={`M${cx-3*sc},${hY+hS*0.28} Q${cx},${hY+hS*0.36} ${cx+3*sc},${hY+hS*0.28}`} fill="none" stroke="#FF9999" strokeWidth={1} strokeLinecap="round"/>}
    {[-1,1].map(d=><G key={`w${d}`}>
      <Line x1={cx+d*4*sc} y1={hY+hS*0.20} x2={cx+d*(4*sc+14+level*1.5)} y2={hY+hS*0.16} stroke="#888" strokeWidth={0.6} opacity={0.35}/>
      <Line x1={cx+d*4*sc} y1={hY+hS*0.24} x2={cx+d*(4*sc+12+level*1.5)} y2={hY+hS*0.26} stroke="#888" strokeWidth={0.5} opacity={0.25}/>
      {(breed.id==='maine'||breed.id==='ragdoll')&&<Line x1={cx+d*4*sc} y1={hY+hS*0.17} x2={cx+d*(4*sc+10)} y2={hY+hS*0.12} stroke="#888" strokeWidth={0.4} opacity={0.2}/>}
    </G>)}
    {chO>0&&[-1,1].map(d=><Circle key={`c${d}`} cx={cx+d*12*sc} cy={hY+hS*0.18} r={3*sc} fill="#FFB6C1" opacity={chO}/>)}
    {isE&&<G>
      <Ellipse cx={cx} cy={cy+bH*0.5} rx={12*sc} ry={5*sc} fill="#FF9999" opacity={0.6}/>
      <Ellipse cx={cx} cy={cy+bH*0.48} rx={10*sc} ry={4*sc} fill="#FFE4E1"/>
      <Ellipse cx={cx} cy={cy+bH*0.47} rx={6*sc} ry={2.5*sc} fill="#FFCCAA" opacity={0.7}/>
      <ST x={cx-18*sc} y={hY-hS*0.4} fontSize={7} opacity={0.6}>🐟</ST>
      <ST x={cx+12*sc} y={hY-hS*0.5} fontSize={6} opacity={0.5}>✨</ST>
      <ST x={cx+16*sc} y={hY-hS*0.35} fontSize={5} opacity={0.4}>⭐</ST>
      <ST x={cx+bW*0.5} y={cy-5} fontSize={6} opacity={0.5}>♪</ST>
    </G>}
    {isHu&&<ST x={cx+18*sc} y={hY-hS*0.3} fontSize="10">💧</ST>}
    {isHa&&<><ST x={cx-22*sc} y={hY-hS*0.4} fontSize="9">✨</ST><ST x={cx+16*sc} y={hY-hS*0.5} fontSize="8">⭐</ST></>}
    {isD&&<ST x={cx-4} y={hY-hS*0.5} fontSize="14" opacity={0.6}>👻</ST>}
  </G>);
}
