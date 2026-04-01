import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Image, StyleSheet } from 'react-native';
import Share from 'react-native-share';
import { useGame } from '../../App';
import CatAvatar from '../components/CatAvatar';
import { PinkDeco, ForestDeco, BeachDeco, AuroraDeco, CosmosDeco } from '../components/ThemeDeco';
import { N, fmtT } from '../utils/helpers';
import { playFeedback } from '../utils/feedback';
import { THEMES } from '../data/gameData';
import { C } from '../utils/theme';

export default function HomeScreen({ navigation }) {
  const g = useGame();
  const { t, lang, cats, aliveCats, stats, accCount, accTime, themeId, setTheme } = g;
  const [themeModal, setThemeModal] = useState(false);
  const [helpModal, setHelpModal] = useState(false);
  const [swapSlot, setSwapSlot] = useState(null);
  const [pinnedIds, setPinnedIds] = useState(null);

  const sortedCats = useMemo(() => {
    return [...aliveCats].sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      const aTime = parseInt(a.id.replace('cat-', '')) || 0;
      const bTime = parseInt(b.id.replace('cat-', '')) || 0;
      return bTime - aTime;
    });
  }, [aliveCats]);

  const homeSlots = useMemo(() => {
    if (pinnedIds) {
      return [0,1,2,3,4,5].map(i => {
        const pid = pinnedIds[i];
        if (pid) return aliveCats.find(c => c.id === pid) || null;
        return sortedCats[i] || null;
      });
    }
    return [0,1,2,3,4,5].map(i => sortedCats[i] || null);
  }, [sortedCats, pinnedIds, aliveCats]);

  const bgC = { default:C.bg, pink:'#FFF0F4', forest:'#F0F5EE', beach:'#F0F5FA', aurora:'#F2F0FA', cosmos:'#F0EEF5' };
  const zh = lang === 'zh';

  const swapCat = (slotIdx, catId) => {
    const newPins = pinnedIds ? [...pinnedIds] : homeSlots.map(c => c?.id || null);
    newPins[slotIdx] = catId;
    setPinnedIds(newPins);
    setSwapSlot(null);
    playFeedback('tap');
  };

  return (
    <View style={[s.root, { backgroundColor: bgC[themeId]||'#1A0F23' }]}>
      <ScrollView style={s.c} contentContainerStyle={s.cc}>
        <View style={s.hdr}>
          <View><View style={{flexDirection:'row',alignItems:'center'}}><Image source={require('../assets/first_logo.png')} style={{width:32,height:32,borderRadius:16,marginRight:10}} /><Text style={s.title}>{t('appName')}</Text></View><Text style={[s.sub,{marginTop:4}]}>{t('appSub')}</Text></View>
          <View style={s.btns}>
            <TouchableOpacity style={s.ib} onPress={()=>setThemeModal(true)}><Text style={s.ibt}>🎨</Text></TouchableOpacity>
            <TouchableOpacity style={s.ib} onPress={()=>setHelpModal(true)}><Text style={s.ibt}>?</Text></TouchableOpacity>
            <TouchableOpacity style={s.ib} onPress={()=>{const m=lang==="zh"?"我在专注喵已经专注了"+Math.floor(stats.totalFocus/60)+"分钟，收集了"+aliveCats.length+"只猫咪！快来和我一起专注吧 😺":"I focused "+Math.floor(stats.totalFocus/60)+" min and collected "+aliveCats.length+" cats in Focus Meow! 😺";Share.open({title:t("appName"),message:m}).catch(()=>{})}}><Text style={s.ibt}>📤</Text></TouchableOpacity>
          </View>
        </View>

        {/* Stats row */}
        <View style={s.sr}>{[[stats.totalComplete,t('done')],[fmtT(stats.totalFocus,lang),t('duration')],[aliveCats.length,t('cats')],[`${accCount}/2`,t('nextCat')]].map(([v,l],i)=>(
          <View key={i} style={s.sc}><Text style={s.sv}>{v}</Text><Text style={s.sl}>{l}</Text></View>
        ))}</View>

        <Text style={s.sec}>{t('kingdom')}</Text>

        {/* 6 slots: 2 rows x 3 columns */}
        <View style={s.kg}>
          {homeSlots.map((cat,i)=>(
            <TouchableOpacity key={i} style={[s.ks,cat&&s.ksf]} activeOpacity={0.7}
              onPress={()=>{ if(aliveCats.length>0) setSwapSlot(i); }}>
              {cat?(<View style={s.catWrap}>
                <CatAvatar breedId={cat.breedId} level={cat.level} state={'idle'} size={88} isRare={cat.isRare} rareType={cat.rareType} breed2={cat.breed2} rounded={14}/>
                <Text style={s.kn} numberOfLines={1}>{N(cat.name,lang)}</Text>
                <Text style={s.kl}>Lv.{cat.level}</Text>
              </View>):(<View style={s.catWrap}>
                <View style={s.ke}><Text style={s.kei}>🐾</Text></View>
                <Text style={s.kel}>{t('toCollect')}</Text>
              </View>)}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={()=>navigation.navigate('Select')} activeOpacity={0.8}>
          <View style={s.btn}><Text style={s.bnt}>{t('startFocus')}</Text></View>
        </TouchableOpacity>
        {accCount>0&&<Text style={s.acc}>{2-accCount}{t('moreN')}</Text>}
        <View style={s.tl}><Text style={s.tt}>{t('kingdomTitle')}</Text><Text style={s.ts}>{t('kingdomSub')}</Text></View>
        <View style={{height:140}}/>
      </ScrollView>

      {/* Theme deco at bottom */}
      {themeId==='pink'&&<PinkDeco/>}
      {themeId==='forest'&&<ForestDeco/>}
      {themeId==='beach'&&<BeachDeco/>}
      {themeId==='aurora'&&<AuroraDeco/>}
      {themeId==='cosmos'&&<CosmosDeco/>}

      {/* ══ HELP RULES MODAL ══ */}
      <Modal visible={helpModal} transparent animationType="fade">
        <TouchableOpacity style={s.mb} activeOpacity={1} onPress={()=>setHelpModal(false)}>
          <View style={s.mc} onStartShouldSetResponder={()=>true}>
            <Text style={s.mt}>{zh?'📖 获取猫咪规则':'📖 Cat Rules'}</Text>
            <Text style={s.helpDesc}>{zh?'每完成 2次 专注即可随机获得一只猫咪！概率取决于2次专注的累积时间：':'Get a random cat every 2 focus sessions! Probability depends on total time:'}</Text>
            <View style={s.helpTable}>
              <View style={s.helpRow}><Text style={s.helpH}>{zh?'累积时间':'Time'}</Text><Text style={s.helpH}>{zh?'普通':'Normal'}</Text><Text style={[s.helpH,{color:'#FFD700'}]}>{zh?'稀有':'Rare'}</Text></View>
              {[['< 30'+( zh?'分钟':'min'),'95%','5%'],['30-60'+(zh?'分钟':'min'),'90%','10%'],['60-90'+(zh?'分钟':'min'),'85%','15%'],['90-120'+(zh?'分钟':'min'),'75%','25%']].map(([time,n,r],i)=>(
                <View key={i} style={[s.helpRow,i%2===0&&{backgroundColor:'rgba(255,255,255,0.03)'}]}>
                  <Text style={s.helpCell}>{time}</Text>
                  <Text style={s.helpCell}>{n}</Text>
                  <Text style={[s.helpCell,{color:'#FFD700',fontWeight:'700'}]}>{r}</Text>
                </View>
              ))}
            </View>
            <Text style={s.helpSub}>{zh?'普通：9个经典品种\n稀有：情侣猫 💕 · 彩虹猫 🌈 · 黑猫 🐈‍⬛':'Normal: 9 classic breeds\nRare: Couple 💕 · Rainbow 🌈 · Black Cat 🐈‍⬛'}</Text>
            <TouchableOpacity style={s.helpBtn} onPress={()=>setHelpModal(false)}><Text style={s.helpBtnT}>{t('gotIt')}</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══ CAT SWAP MODAL ══ */}
      <Modal visible={swapSlot!==null} transparent animationType="fade">
        <TouchableOpacity style={s.mb} activeOpacity={1} onPress={()=>setSwapSlot(null)}>
          <View style={[s.mc,{maxHeight:'70%'}]} onStartShouldSetResponder={()=>true}>
            <Text style={s.mt}>{zh?'🐾 选择猫咪展示':'🐾 Choose Cat'}</Text>
            <Text style={s.ms}>{zh?'点击猫咪替换到王国框位':'Tap to place in kingdom slot'}</Text>
            <ScrollView style={{maxHeight:400}}>
              <View style={s.swapGrid}>{sortedCats.map(cat=>{
                const isShown = homeSlots.some(h=>h?.id===cat.id);
                return (
                  <TouchableOpacity key={cat.id} style={[s.swapCard,isShown&&s.swapActive]} onPress={()=>swapCat(swapSlot,cat.id)}>
                    <CatAvatar breedId={cat.breedId} level={cat.level} state="idle" size={48} isRare={cat.isRare} rareType={cat.rareType} breed2={cat.breed2} rounded={10}/>
                    <Text style={s.swapName} numberOfLines={1}>{N(cat.name,lang)}</Text>
                    <Text style={s.swapLv}>Lv.{cat.level}</Text>
                    {isShown&&<Text style={s.swapBadge}>{zh?'展示中':'Shown'}</Text>}
                  </TouchableOpacity>
                );
              })}</View>
            </ScrollView>
            <TouchableOpacity style={s.cb} onPress={()=>setSwapSlot(null)}><Text style={s.cbt}>{t('cancel')}</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══ THEME SELECTOR ══ */}
      <Modal visible={themeModal} transparent animationType="fade">
        <TouchableOpacity style={s.mb} activeOpacity={1} onPress={()=>setThemeModal(false)}>
          <View style={s.mc} onStartShouldSetResponder={()=>true}>
            <Text style={s.mt}>{t('themeTitle')}</Text>
            <View style={s.tg}>{THEMES.map(th=>{
              const ul=aliveCats.length>=th.unlock;
              return(<TouchableOpacity key={th.id} style={[s.tc,themeId===th.id&&s.tca,!ul&&{opacity:0.4}]} onPress={()=>{if(ul){setTheme(th.id);setThemeModal(false);}}}>
                <Text style={{fontSize:28}}>{th.emoji}</Text>
                <Text style={s.tn}>{N(th.name,lang)}</Text>
                {!ul&&<Text style={s.tu}>{t('needCats').replace('{n}',th.unlock)}</Text>}
                {themeId===th.id&&<Text style={s.tai}>{t('inUse')}</Text>}
              </TouchableOpacity>);
            })}</View>
            <TouchableOpacity style={s.cb} onPress={()=>setThemeModal(false)}><Text style={s.cbt}>{t('close')}</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:{flex:1},c:{flex:1,zIndex:1},cc:{padding:20,paddingBottom:100,paddingTop:55},
  hdr:{flexDirection:'row',justifyContent:'space-between',marginBottom:22},
  title:{fontSize:26,fontWeight:'900',color:'#D06B6B'},sub:{color:'#66615E',fontSize:12},
  btns:{flexDirection:'row',gap:6},
  ib:{width:34,height:34,borderRadius:17,backgroundColor:'#FFFFFF',borderWidth:1.5,borderColor:'rgba(160,140,120,0.25)',alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:0.06,shadowRadius:6,shadowOffset:{width:0,height:2}},
  ibt:{fontSize:14,color:'#332E2C',fontWeight:'800'},
  sr:{flexDirection:'row',gap:8,marginBottom:24},
  sc:{flex:1,backgroundColor:'#FFFFFF',borderRadius:14,padding:12,alignItems:'center',borderWidth:1.5,borderColor:'rgba(160,140,120,0.2)',shadowColor:'#000',shadowOpacity:0.06,shadowRadius:8,shadowOffset:{width:0,height:2}},
  sv:{color:'#332E2C',fontSize:16,fontWeight:'800'},sl:{color:'#66615E',fontSize:10,marginTop:2},
  sec:{color:'#332E2C',fontSize:15,fontWeight:'700',marginBottom:12},
  kg:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:20},
  ks:{width:'31%',backgroundColor:'#FFFFFF',borderWidth:1.5,borderStyle:'dashed',borderColor:'rgba(160,140,120,0.25)',borderRadius:18,padding:8,paddingTop:10,alignItems:'center',justifyContent:'center',minHeight:155,overflow:'hidden',shadowColor:'#000',shadowOpacity:0.06,shadowRadius:8,shadowOffset:{width:0,height:2}},
  ksf:{backgroundColor:'#FFFFFF',borderColor:'rgba(208,107,107,0.4)',borderStyle:'solid'},
  catWrap:{alignItems:'center',justifyContent:'center',overflow:'hidden',maxWidth:'100%'},
  kn:{color:'#332E2C',fontWeight:'700',fontSize:13,maxWidth:85,marginTop:6},
  kl:{color:'#8C8480',fontSize:11,marginTop:2},
  ke:{width:50,height:50,borderRadius:25,backgroundColor:'#F0EAE4',alignItems:'center',justifyContent:'center'},
  kei:{fontSize:20,opacity:0.3},kel:{color:'#8C8480',fontSize:10,marginTop:4},
  btn:{backgroundColor:'#D06B6B',borderRadius:22,padding:17,alignItems:'center',shadowColor:'#D06B6B',shadowOpacity:0.3,shadowRadius:12,shadowOffset:{width:0,height:6}},
  bnt:{color:'#fff',fontSize:18,fontWeight:'700',letterSpacing:1},
  acc:{textAlign:'center',color:'#66615E',fontSize:12,marginTop:10},
  tl:{alignItems:'center',marginTop:30},tt:{color:'#332E2C',fontSize:18,fontWeight:'800',marginBottom:8},ts:{color:'#66615E',fontSize:13},
  mb:{flex:1,backgroundColor:'rgba(40,30,20,0.55)',justifyContent:'center',alignItems:'center',padding:16},
  mc:{backgroundColor:'#FFF8F4',borderRadius:22,padding:24,width:'100%',maxWidth:380,shadowColor:'#000',shadowOpacity:0.1,shadowRadius:20,shadowOffset:{width:0,height:10}},
  mt:{color:'#332E2C',fontSize:17,fontWeight:'800',marginBottom:6},
  ms:{color:'#66615E',fontSize:12,marginBottom:16},
  cb:{backgroundColor:'#F0EAE4',borderWidth:1.5,borderColor:'rgba(160,140,120,0.15)',borderRadius:12,padding:12,alignItems:'center',marginTop:14},
  cbt:{color:'#332E2C',fontSize:14,fontWeight:'600'},
  helpDesc:{color:'#66615E',fontSize:13,lineHeight:20,marginBottom:14},
  helpTable:{borderRadius:12,overflow:'hidden',marginBottom:12,borderWidth:1,borderColor:'rgba(160,140,120,0.15)'},
  helpRow:{flexDirection:'row',paddingVertical:10,paddingHorizontal:12},
  helpH:{flex:1,color:'#332E2C',fontSize:12,fontWeight:'700',textAlign:'center'},
  helpCell:{flex:1,color:'#66615E',fontSize:12,textAlign:'center'},
  helpSub:{color:'#66615E',fontSize:12,lineHeight:20,marginBottom:12},
  helpBtn:{backgroundColor:'#D06B6B',borderRadius:12,padding:12,alignItems:'center'},
  helpBtnT:{color:'#fff',fontSize:14,fontWeight:'700'},
  swapGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,paddingBottom:10},
  swapCard:{width:'30%',backgroundColor:'#FFFFFF',borderWidth:1.5,borderColor:'rgba(160,140,120,0.15)',borderRadius:14,padding:8,alignItems:'center'},
  swapActive:{borderColor:'#D06B6B',backgroundColor:'rgba(208,107,107,0.1)'},
  swapName:{color:'#332E2C',fontWeight:'700',fontSize:10,marginTop:2,maxWidth:70},
  swapLv:{color:'#8C8480',fontSize:9},
  swapBadge:{color:'#D06B6B',fontSize:8,fontWeight:'700',marginTop:1},
  tg:{flexDirection:'row',flexWrap:'wrap',gap:10},
  tc:{width:'47%',padding:16,borderRadius:16,backgroundColor:'#FFFFFF',borderWidth:2,borderColor:'rgba(160,140,120,0.15)',alignItems:'center'},
  tca:{borderColor:'#D06B6B',backgroundColor:'rgba(208,107,107,0.1)'},
  tn:{color:'#332E2C',fontWeight:'700',fontSize:13,marginTop:4},
  tu:{color:'#8C8480',fontSize:10,marginTop:2},
  tai:{color:'#D06B6B',fontSize:10,marginTop:2},
});
