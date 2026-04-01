import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, AppState, Alert, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { useGame } from '../../App';
import CatAvatar from '../components/CatAvatar';
import CircularTimer from '../components/CircularTimer';
import { N, xpFor, totXp } from '../utils/helpers';
import { playFeedback } from '../utils/feedback';

const CHEERS = {
  zh: [
    '太棒了！专注力满分 🌟',
    '小猫为你骄傲喵～ 😺',
    '坚持就是胜利，你做到了！💪',
    '每一次专注都让你更强大 🚀',
    '今天的你比昨天更优秀！✨',
    '专注的你闪闪发光 🌈',
    '再接再厉，你是最棒的！🎯',
    '小猫吃饱啦，谢谢主人 🐟',
    '优秀！保持这个节奏 🔥',
    '又完成一次，离目标更近了 🏆',
    '你的专注力让小猫很安心 💕',
    '厉害！继续加油喵～ 🐾',
  ],
  en: [
    'Amazing focus! You nailed it 🌟',
    'Your cat is proud of you 😺',
    'Persistence pays off! 💪',
    'Every session makes you stronger 🚀',
    'Better than yesterday! ✨',
    'You shine when you focus 🌈',
    'Keep it up, you\'re the best! 🎯',
    'Cat is full, thanks hooman 🐟',
    'Excellent! Keep this rhythm 🔥',
    'One step closer to your goal 🏆',
    'Your focus keeps kitty happy 💕',
    'Impressive! Keep going 🐾',
  ],
};

export default function SelectScreen() {
  const g = useGame();
  const nav = useNavigation();
  const { t, lang, aliveCats, selCat, setSel, focusMin, setFM, fState, startFocus, handleInterrupt, handleComplete, timeLeft, totalTime, interrupts, result, setRes, cats, isTimerDone, setIsFocusing } = g;
  const [sub, setSub] = useState('select');
  const [cm, setCM] = useState('');
  const [bgWarning, setBgWarn] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const bgTimerRef = useRef(null);

  useEffect(() => {
    if (sub === 'focus') setIsFocusing(true);
    else setIsFocusing(false);
    return () => setIsFocusing(false);
  }, [sub]);

  useEffect(() => {
    if (isTimerDone && sub === 'focus') { playFeedback('complete'); handleComplete(); setSub('result'); }
  }, [isTimerDone, sub]);

  useEffect(() => {
    if (sub !== 'focus') return;
    const subscription = AppState.addEventListener('change', nextState => {
      if (appStateRef.current === 'active' && (nextState === 'background' || nextState === 'inactive')) {
        setBgWarn(true); playFeedback('hungry');
        bgTimerRef.current = setTimeout(() => {}, 10000);
      }
      if (nextState === 'active' && appStateRef.current !== 'active') {
        clearTimeout(bgTimerRef.current);
        if (bgWarning) {
          Alert.alert(lang==='zh'?'⚠️ 你离开了！':'⚠️ You left!', lang==='zh'?'专注期间离开会让猫咪挨饿哦！':'Leaving makes your cat hungry!', [{text:lang==='zh'?'知道了':'OK'}]);
          setBgWarn(false);
        }
      }
      appStateRef.current = nextState;
    });
    return () => { subscription.remove(); clearTimeout(bgTimerRef.current); };
  }, [sub, bgWarning, lang]);

  const doStart = () => { playFeedback('start'); startFocus(); setSub('focus'); };
  const doInterrupt = () => {
    Alert.alert(lang==='zh'?'⚠️ 确定放弃？':'⚠️ Give up?', lang==='zh'?'猫咪会饿肚子的... 🥺':'Cat will go hungry... 🥺',
      [{text:lang==='zh'?'继续专注':'Keep Going',style:'cancel'},
       {text:lang==='zh'?'放弃':'Give Up',style:'destructive',onPress:()=>{playFeedback(interrupts>=1?'dead':'hungry');handleInterrupt();setSub('result');}}]);
  };

  if (sub==='select') return (
    <ScrollView style={s.c} contentContainerStyle={{padding:20,paddingBottom:100,paddingTop:55}}>
      <Text style={s.h}>{t('selectCat')}</Text><Text style={s.sub}>{t('selectSub')}</Text>
      <View style={s.grid}>{aliveCats.slice(0, 9).map(cat=>{
        const px=cat.xp-totXp(cat.level),nx=xpFor(cat.level);
        return (<TouchableOpacity key={cat.id} style={[s.card,selCat===cat.id&&s.sel]} onPress={()=>{playFeedback('tap');setSel(cat.id);}}>
          <CatAvatar breedId={cat.breedId} level={cat.level} state="idle" size={76} isRare={cat.isRare} rareType={cat.rareType} breed2={cat.breed2} rounded={12}/>
          <Text style={s.cn} numberOfLines={1}>{N(cat.name,lang)}</Text>
          <View style={s.xb}><View style={[s.xf,{width:`${Math.min(100,(px/nx)*100)}%`}]}/></View>
        </TouchableOpacity>);
      })}</View>
      <Text style={[s.h,{fontSize:15,marginTop:16}]}>{t('focusTime')}</Text>
      <View style={s.ps}>{[['h10m',10],['h30m',30],['h45m',45],['h1h',60]].map(([k,m])=>
        <TouchableOpacity key={m} style={[s.p,focusMin===m&&!cm&&s.pa]} onPress={()=>{playFeedback('tap');setFM(m);setCM('');}}>
          <Text style={[s.pt,focusMin===m&&!cm&&{color:'#332E2C'}]}>{t(k)}</Text>
        </TouchableOpacity>
      )}</View>
      <TextInput style={s.inp} placeholder={t('custom')} placeholderTextColor="rgba(255,255,255,0.3)" keyboardType="number-pad" value={cm} onChangeText={v=>{setCM(v);if(v)setFM(parseInt(v)||5);}}/>
      <View style={{flexDirection:'row',gap:10}}>
        <TouchableOpacity style={[s.btn2,{flex:1}]} onPress={()=>nav.goBack()}><Text style={s.bt2}>{t('back')}</Text></TouchableOpacity>
        <TouchableOpacity style={[s.btn,{flex:2,opacity:selCat?1:0.5}]} disabled={!selCat} onPress={doStart}><Text style={s.bt}>{t('start')} {focusMin}{t('min')}</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (sub==='focus') {
    const cat=cats.find(c=>c.id===selCat);
    const prog=totalTime>0?(totalTime-timeLeft)/totalTime:0;
    const encourageZh = ['加油喵！','你最棒！','专注中...','继续保持！','快完成啦！','别放弃喵~','太厉害了！','稳住！'];
    const encourageEn = ['Keep going!','You rock!','Focusing...','Almost there!','Stay strong!','Great job!','Dont stop!','You got this!'];
    const encList = lang==='zh' ? encourageZh : encourageEn;
    const encText = encList[Math.floor(timeLeft / 15) % encList.length];
    return (
      <View style={[s.c,{backgroundColor:'#FBF5F0'}]}>
        {bgWarning&&<View style={s.bgWarn}><Text style={s.bgWarnText}>{lang==='zh'?'🐱 别走！猫咪需要你！':'🐱 Stay! Cat needs you!'}</Text></View>}
        {/* Top bar */}
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingTop:55,paddingBottom:10}}>
          <View style={{flexDirection:'row',alignItems:'center'}}>
            <Image source={require('../assets/first_logo.png')} style={{width:28,height:28,borderRadius:14,marginRight:8}} />
            <Text style={{color:'#332E2C',fontSize:15,fontWeight:'700'}}>Focus Meow</Text>
          </View>
          <Text style={{color:'#D06B6B',fontSize:14,fontWeight:'700'}}>{encText}</Text>
        </View>
        {/* Timer */}
        <View style={{flex:1,alignItems:'center',justifyContent:'center',paddingBottom:40}}>
          <CircularTimer progress={prog} timeLeft={timeLeft} size={240}/>
          <View style={{marginTop:28}}>
            <CatAvatar breedId={cat?.breedId||'orange'} level={cat?.level||1} state="eating" size={180} rounded={22} isRare={cat?.isRare} rareType={cat?.rareType} breed2={cat?.breed2}/>
          </View>
          <Text style={{color:'#332E2C',fontWeight:'700',fontSize:18,marginTop:16}}>{N(cat?.name,lang)} {t('eating')}</Text>
          <Text style={{color:'#66615E',fontSize:13,textAlign:'center',marginTop:10,maxWidth:260,lineHeight:20}}>{interrupts===0?t('keepFocus'):t('warnDie')}</Text>
          <TouchableOpacity style={s.danger} onPress={doInterrupt}><Text style={s.dangerT}>{t('giveUp')}</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  if (sub==='result'&&result) {
    const cat=cats.find(c=>c.id===result.catId);
    const cheer = result.type==='success' ? CHEERS[lang]?.[Math.floor(Math.random() * CHEERS[lang].length)] || '' : '';
    return (
      <ScrollView style={s.c} contentContainerStyle={{padding:20,alignItems:'center',justifyContent:'center',minHeight:'100%'}}>
        {result.type==='success'&&<View style={{alignItems:'center',width:'100%'}}>
          <LottieView source={require('../assets/celebrate.json')} autoPlay loop={false} style={{width:280,height:280,position:'absolute',top:-80}} />
          <Text style={{color:'#332E2C',fontSize:22,fontWeight:'800',marginTop:10,marginBottom:16}}>{t('complete')}</Text>
          <CatAvatar breedId={cat?.breedId||'orange'} level={cat?.level||1} state="complete" size={120} rounded={16}/>
          <Text style={{color:'#D06B6B',fontWeight:'700',marginTop:14,marginBottom:6}}>{N(cat?.name,lang)} +5 XP</Text>
          <Text style={s.cheer}>{cheer}</Text>
          {result.newCat&&<View style={[s.rc,{borderColor:'rgba(196,154,108,0.25)',marginTop:12}]}><CatAvatar breedId={result.newCat.breedId} level={1} state="complete" size={50} rounded={10}/><Text style={{color:'#B8863A',fontWeight:'700',flex:1,marginLeft:10}}>{result.newCat.isRare?t('rareCat'):t('newCat')} {N(result.newCat.name,lang)}</Text></View>}
        </View>}
        {result.type==='hungry'&&<View style={{alignItems:'center'}}>
          <LottieView source={require('../assets/ewwww_shit.json')} autoPlay loop={false} style={{width:200,height:200,position:'absolute',top:-60}} />
          <Text style={{color:'#E8A0A0',fontSize:22,fontWeight:'800',marginTop:10,marginBottom:16}}>{t('hungryTitle')}</Text><CatAvatar breedId={cat?.breedId||'orange'} level={cat?.level||1} state="hungry" size={130} rounded={16}/><Text style={{color:'#C04848',fontWeight:'600',marginTop:14}}>{N(cat?.name,lang)} {t('hungryMsg')}</Text></View>}
        {result.type==='dead'&&<View style={{alignItems:'center'}}>
          <LottieView source={require('../assets/ewwww_shit.json')} autoPlay loop={false} style={{width:200,height:200,position:'absolute',top:-60}} />
          <Text style={{color:'#C04848',fontSize:22,fontWeight:'800',marginTop:10,marginBottom:16}}>{t('deadTitle')}</Text><CatAvatar breedId={cat?.breedId||'orange'} level={cat?.level||1} state="dead" size={130} rounded={16}/><Text style={{color:'#66615E',fontWeight:'600',marginTop:14}}>{N(cat?.name,lang)} {t('deadMsg')}</Text>{result.catId==='cat-0'&&<Text style={{color:'#E8A0A0',fontSize:12,textAlign:'center',marginTop:10}}>{lang==='zh'?'💫 初始小橘5分钟后会复活哦～':'💫 Starter cat revives in 5 min~'}</Text>}</View>}
        <View style={{flexDirection:'row',gap:10,marginTop:24,width:'100%'}}>
          <TouchableOpacity style={[s.btn2,{flex:1}]} onPress={()=>{setRes(null);setSub('select');nav.goBack();}}><Text style={s.bt2}>{t('goHome')}</Text></TouchableOpacity>
          <TouchableOpacity style={[s.btn,{flex:1}]} onPress={()=>{setRes(null);setSub('select');}}><Text style={s.bt}>{t('again')}</Text></TouchableOpacity>
        </View>
      </ScrollView>
    );
  }
  return <View style={s.c}><Text style={{color:'#332E2C'}}>Loading...</Text></View>;
}

const s = StyleSheet.create({
  c:{flex:1},h:{fontSize:24,fontWeight:'900',color:'#D06B6B',marginBottom:3},
  sub:{color:'#66615E',fontSize:12,marginBottom:16},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:16},
  card:{width:'30%',backgroundColor:'rgba(180,150,130,0.08)',borderWidth:1.5,borderColor:'rgba(180,150,130,0.15)',borderRadius:16,padding:10,alignItems:'center'},
  sel:{borderColor:'#D06B6B',backgroundColor:'rgba(212,131,139,0.12)'},
  cn:{color:'#332E2C',fontWeight:'700',fontSize:11,marginTop:2},
  xb:{width:'88%',height:5,backgroundColor:'rgba(180,150,130,0.12)',borderRadius:10,overflow:'hidden',marginTop:4},
  xf:{height:'100%',backgroundColor:'#D06B6B',borderRadius:10},
  ps:{flexDirection:'row',gap:8,marginBottom:12},
  p:{backgroundColor:'rgba(180,150,130,0.08)',borderWidth:1.5,borderColor:'rgba(180,150,130,0.18)',borderRadius:12,paddingVertical:10,paddingHorizontal:16},
  pa:{borderColor:'#D06B6B',backgroundColor:'rgba(212,131,139,0.15)'},
  pt:{color:'#332E2C',fontSize:13,fontWeight:'600'},
  inp:{backgroundColor:'rgba(180,150,130,0.08)',borderWidth:1.5,borderColor:'rgba(180,150,130,0.18)',borderRadius:12,padding:12,color:'#332E2C',fontSize:15,marginBottom:22},
  btn:{backgroundColor:'#D06B6B',borderRadius:14,padding:14,alignItems:'center'},
  bt:{color:'#fff',fontSize:16,fontWeight:'700'},
  btn2:{backgroundColor:'rgba(180,150,130,0.15)',borderWidth:1.5,borderColor:'rgba(180,150,130,0.22)',borderRadius:12,padding:12,alignItems:'center'},
  bt2:{color:'#332E2C',fontSize:14,fontWeight:'600'},
  danger:{backgroundColor:'rgba(212,100,106,0.12)',borderWidth:1.5,borderColor:'rgba(212,100,106,0.25)',borderRadius:12,paddingVertical:12,paddingHorizontal:24,marginTop:20},
  dangerT:{color:'#D4646A',fontSize:14,fontWeight:'600'},
  rc:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'rgba(180,150,130,0.12)',borderRadius:14,padding:12,marginVertical:4,width:'100%'},
  lockInfo:{backgroundColor:'#FFFFFF',borderRadius:10,paddingVertical:6,paddingHorizontal:14,marginTop:12},
  lockText:{color:'#8C8480',fontSize:11},
  bgWarn:{position:'absolute',top:60,left:20,right:20,backgroundColor:'rgba(212,100,106,0.12)',borderWidth:1,borderColor:'rgba(212,100,106,0.25)',borderRadius:14,padding:12,zIndex:10,alignItems:'center'},
  bgWarnText:{color:'#D4646A',fontSize:14,fontWeight:'700'},
  cheer:{color:'#66615E',fontSize:14,textAlign:'center',marginTop:4,marginBottom:8,lineHeight:22,paddingHorizontal:20,fontStyle:'italic'},
});
