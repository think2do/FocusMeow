import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, PanResponder, Alert, Modal, Image } from 'react-native';
import { useGame } from '../../App';
import CatAvatar from '../components/CatAvatar';
import { N, fmtShort, xpFor, totXp } from '../utils/helpers';
import { BREEDS, RARES } from '../data/gameData';
import { C } from '../utils/theme';

const TABS = ['warehouse', 'normal', 'rare'];
const SOULMATE_CONFIRM_SECONDS = 5;
const rewardIcon = require('../assets/reward.png');
const pad2 = value => String(value).padStart(2, '0');
const localDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export default function CollectionScreen() {
  const g = useGame();
  const {
    t,
    lang,
    cats = [],
    collection = { normal: [], rare: [] },
    requestCatRescue,
    rescueRequiredSessions = 2,
    rescueMinSeconds = 30 * 60,
    soulmateCatId,
    soulmateSetDate,
    setSoulmateCatId,
  } = g;
  const s = createStyles(C);
  const [tab, setTab] = useState('warehouse');
  const [pendingSoulmateCat, setPendingSoulmateCat] = useState(null);
  const [soulmateCountdown, setSoulmateCountdown] = useState(SOULMATE_CONFIRM_SECONDS);
  const tabRef = useRef('warehouse');
  const zh = lang === 'zh';
  const aliveCount = cats.filter(cat => cat.alive && !cat.runaway).length;
  const runawayCount = cats.filter(cat => cat.runaway).length;

  const switchTab = (direction) => {
    const index = TABS.indexOf(tabRef.current);
    const nextIndex = Math.max(0, Math.min(TABS.length - 1, index + direction));
    const nextTab = TABS[nextIndex];
    tabRef.current = nextTab;
    setTab(nextTab);
  };

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 20 && Math.abs(gs.dy) < Math.abs(gs.dx),
    onPanResponderRelease: (_, gs) => {
      if (gs.dx < -40) switchTab(1);
      if (gs.dx > 40) switchTab(-1);
    },
  })).current;

  useEffect(() => {
    if (!pendingSoulmateCat) return undefined;
    setSoulmateCountdown(SOULMATE_CONFIRM_SECONDS);
    const timer = setInterval(() => {
      setSoulmateCountdown(value => {
        if (value <= 1) {
          clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pendingSoulmateCat]);

  const requestSetSoulmate = (cat) => {
    if (!cat || cat.runaway || cat.id === soulmateCatId) return;
    const today = localDateKey();
    if (soulmateSetDate === today && soulmateCatId && soulmateCatId !== cat.id) {
      Alert.alert(
        zh ? '今天已经设定过啦' : 'Already set today',
        zh
          ? '灵魂猫咪一天只能更改一次。为了让它稳定记住你，明天再更换吧。'
          : 'Soul Kitty can only be changed once per day so its memory stays stable. You can change it tomorrow.'
      );
      return;
    }
    setPendingSoulmateCat(cat);
  };

  const confirmSoulmate = () => {
    if (!pendingSoulmateCat || soulmateCountdown > 0) return;
    const result = setSoulmateCatId?.(pendingSoulmateCat.id);
    if (result?.ok === false) {
      Alert.alert(
        zh ? '今天已经设定过啦' : 'Already set today',
        zh ? '灵魂猫咪一天只能更改一次，明天再来吧。' : 'Soul Kitty can only be changed once per day. Try again tomorrow.'
      );
      return;
    }
    setPendingSoulmateCat(null);
  };

  const startRescue = (cat) => {
    if (!cat?.runaway) return;
    const quest = cat.rescueQuest;
    if (quest?.active) {
      Alert.alert(
        zh ? '找回任务进行中' : 'Rescue in progress',
        zh
          ? `已完成 ${quest.progress || 0}/${rescueRequiredSessions} 次。每次需要至少 ${Math.round(rescueMinSeconds / 60)} 分钟专注。`
          : `${quest.progress || 0}/${rescueRequiredSessions} done. Each session needs at least ${Math.round(rescueMinSeconds / 60)} minutes.`
      );
      return;
    }
    Alert.alert(
      zh ? `找回 ${N(cat.name, lang)}` : `Rescue ${N(cat.name, lang)}`,
      zh
        ? `接取后，完成 ${rescueRequiredSessions} 次至少 ${Math.round(rescueMinSeconds / 60)} 分钟的专注，就能把它找回家。`
        : `After accepting, complete ${rescueRequiredSessions} focus sessions of at least ${Math.round(rescueMinSeconds / 60)} minutes to bring this cat home.`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: zh ? '接取任务' : 'Accept',
          onPress: () => requestCatRescue?.(cat.id),
        },
      ]
    );
  };

  const renderWarehouse = () => (
    <View>
      <Text style={s.sectionTitle}>{zh ? '猫咪仓库' : 'Cat Warehouse'}</Text>
      <Text style={s.sectionHint}>
        {zh
          ? `现有 ${cats.length} 只 · 在家 ${aliveCount} 只${runawayCount ? ` · 离家 ${runawayCount} 只` : ''}`
          : `${cats.length} total · ${aliveCount} home${runawayCount ? ` · ${runawayCount} away` : ''}`}
      </Text>
      <View style={s.warehouseList}>
        {cats.map(cat => {
          const px = Math.max(0, (cat.xp || 0) - totXp(cat.level || 1));
          const nx = xpFor(cat.level || 1);
          const quest = cat.rescueQuest;
          const isSoulmate = cat.id === soulmateCatId;
          const statusText = cat.runaway
            ? quest?.active
              ? (zh ? `找回中 ${quest.progress || 0}/${rescueRequiredSessions}` : `Rescue ${quest.progress || 0}/${rescueRequiredSessions}`)
              : (zh ? '离家出走 · 点击找回' : 'Away · tap to rescue')
            : isSoulmate
              ? (zh ? '灵魂陪伴中' : 'Soul bonded')
              : (zh ? '在家' : 'Home');
          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={cat.runaway ? 0.75 : 1}
              onPress={() => startRescue(cat)}
              style={[s.catRow, cat.runaway && s.catRowRunaway, isSoulmate && s.catRowSoulmate]}
            >
              <View style={[s.catAvatar, cat.runaway && s.catAvatarRunaway]}>
                <CatAvatar
                  breedId={cat.breedId}
                  level={cat.level || 1}
                  state={cat.runaway ? 'left' : 'idle'}
                  size={58}
                  rounded={12}
                  isRare={cat.isRare}
                  rareType={cat.rareType}
                  breed2={cat.breed2}
                />
                {isSoulmate ? <View style={s.soulmateAvatarRing} /> : null}
                {isSoulmate ? <Image source={rewardIcon} style={s.soulmateReward} resizeMode="contain" /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.rowTop}>
                  <Text style={s.catName}>{N(cat.name, lang)}</Text>
                  <Text style={[s.statusBadge, cat.runaway && s.statusBadgeRunaway, isSoulmate && s.statusBadgeSoulmate]}>{statusText}</Text>
                </View>
                <Text style={s.meta}>
                  Lv.{cat.level || 1} · {cat.isRare ? t('rareL') : (BREEDS.find(item => item.id === cat.breedId) ? N(BREEDS.find(item => item.id === cat.breedId).name, lang) : cat.breedId)} · {fmtShort(cat.focusTime || 0)}
                </Text>
                <View style={s.xpBar}>
                  <View style={[s.xpFill, { width: `${cat.runaway ? 0 : Math.min(100, (px / nx) * 100)}%` }]} />
                </View>
                {!cat.runaway ? (
                  <TouchableOpacity
                    style={[s.soulmateBtn, isSoulmate && s.soulmateBtnActive]}
                    activeOpacity={0.84}
                    onPress={() => requestSetSoulmate(cat)}
                  >
                    <Text style={[s.soulmateBtnText, isSoulmate && s.soulmateBtnTextActive]}>
                      {isSoulmate ? (zh ? '已设为灵魂猫咪' : 'Soul Kitty') : (zh ? '设为灵魂猫咪' : 'Set as Soul Kitty')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 100, paddingTop: 70 }} {...pan.panHandlers}>
        <Text style={s.h}>{zh ? '🐾 猫咪' : '🐾 Cats'}</Text>
        <Text style={s.sub}>{collection.normal.length}/{BREEDS.length} {t('normal')} · {collection.rare.length}/{RARES.length} {t('rare')}</Text>
        <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, tab === 'warehouse' && s.tabActive]} onPress={() => { tabRef.current = 'warehouse'; setTab('warehouse'); }}><Text style={[s.tabT, tab === 'warehouse' && s.tabTActive]}>{zh ? '仓库' : 'Warehouse'}</Text></TouchableOpacity>
          <TouchableOpacity style={[s.tab, tab === 'normal' && s.tabActive]} onPress={() => { tabRef.current = 'normal'; setTab('normal'); }}><Text style={[s.tabT, tab === 'normal' && s.tabTActive]}>{zh ? '普通图鉴' : 'Normal'}</Text></TouchableOpacity>
          <TouchableOpacity style={[s.tab, tab === 'rare' && s.tabActive]} onPress={() => { tabRef.current = 'rare'; setTab('rare'); }}><Text style={[s.tabT, tab === 'rare' && s.tabTActive]}>{zh ? '稀有图鉴' : 'Rare'}</Text></TouchableOpacity>
        </View>
        <Text style={s.swipeHint}>
          {zh ? '左右滑动切换仓库 / 普通 / 稀有' : 'Swipe to switch Warehouse / Normal / Rare'}
        </Text>
        {tab === 'warehouse' && renderWarehouse()}
        {tab === 'normal' && (<View style={s.grid}>{BREEDS.map(breed => {
          const ul = collection.normal.includes(breed.id);
          return (<View key={breed.id} style={[s.card, ul ? s.cardUl : s.cardLock]}>
            {ul ? (<View style={s.ci}><CatAvatar breedId={breed.id} level={1} state="idle" size={72} rounded={14} displayMode="compact" /><Text style={s.bn}>{N(breed.name, lang)}</Text><Text style={s.btag}>{zh ? '已收集' : 'Collected'}</Text></View>)
            : (<View style={s.ci}><View style={s.lc}><Text style={s.lq}>?</Text></View><Text style={s.ln}>???</Text><Text style={s.lt}>{zh ? '未收集' : 'Locked'}</Text></View>)}
          </View>);
        })}</View>)}
        {tab === 'rare' && (<View style={s.grid}>{RARES.map(rt => {
          const ul = collection.rare.includes(rt.id);
          return (<View key={rt.id} style={[s.card, ul ? s.cardR : s.cardLock]}>
            {ul ? (<View style={s.ci}><CatAvatar breedId={rt.id} level={1} state="idle" size={72} isRare rareType={rt.id} rounded={14} displayMode="compact" /><Text style={s.rn}>{N(rt.name, lang)}</Text><Text style={s.rtag}>{t('rareL')}</Text></View>)
            : (<View style={s.ci}><View style={s.lc}><Text style={s.lq}>?</Text></View><View style={s.rb}><Text style={s.rbt}>{t('rareL')}</Text></View><Text style={s.ln}>???</Text></View>)}
          </View>);
        })}</View>)}
      </ScrollView>
      <Modal visible={!!pendingSoulmateCat} transparent animationType="fade" onRequestClose={() => setPendingSoulmateCat(null)}>
        <View style={s.soulmateModalBackdrop}>
          <View style={s.soulmateModalCard}>
            <Image source={rewardIcon} style={s.soulmateModalReward} resizeMode="contain" />
            <Text style={s.soulmateModalTitle}>{zh ? '设为灵魂猫咪？' : 'Set as Soul Kitty?'}</Text>
            <Text style={s.soulmateModalDesc}>
              {zh
                ? `你每天只能更改一次灵魂猫咪。确认后，${N(pendingSoulmateCat?.name, lang)} 会完整保存聊天，并逐渐记住你的专注习惯。`
                : `You can change Soul Kitty only once per day. After confirming, ${N(pendingSoulmateCat?.name, lang)} will keep full chats and learn your focus rhythm.`}
            </Text>
            <View style={s.soulmateModalActions}>
              <TouchableOpacity style={s.soulmateCancelBtn} onPress={() => setPendingSoulmateCat(null)}>
                <Text style={s.soulmateCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.soulmateConfirmBtn, soulmateCountdown > 0 && s.soulmateConfirmBtnDisabled]}
                disabled={soulmateCountdown > 0}
                onPress={confirmSoulmate}
              >
                <Text style={s.soulmateConfirmText}>
                  {soulmateCountdown > 0 ? `${soulmateCountdown}s` : (zh ? '确认设定' : 'Confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (C) => StyleSheet.create({
  h:{fontSize:24,fontWeight:'900',color:C.tertiary,marginBottom:6},
  sub:{color:C.onSurfaceVariant,fontSize:12,marginBottom:16},
  swipeHint:{color:C.outline,fontSize:11,textAlign:'center',marginBottom:14},
  tabs:{flexDirection:'row',gap:6,marginBottom:10,backgroundColor:C.surfaceContainerLow,borderRadius:9999,padding:4,borderWidth:1,borderColor:C.border},
  tab:{flex:1,paddingVertical:10,alignItems:'center',borderRadius:9999},
  tabActive:{backgroundColor:C.primary},
  tabT:{color:C.onSurfaceVariant,fontSize:12,fontWeight:'700'},
  tabTActive:{color:'#fff',fontWeight:'900'},
  sectionTitle:{color:C.tertiary,fontSize:17,fontWeight:'900',marginBottom:4},
  sectionHint:{color:C.onSurfaceVariant,fontSize:12,marginBottom:12},
  warehouseList:{gap:10},
  catRow:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:C.surfaceContainerLowest,borderRadius:18,padding:12,borderWidth:1.3,borderColor:C.border,shadowColor:C.shadow.shadowColor,shadowOpacity:0.04,shadowRadius:12,shadowOffset:{width:0,height:5}},
  catRowRunaway:{borderColor:'rgba(208,107,107,0.35)',borderStyle:'dashed',backgroundColor:'rgba(255,255,255,0.72)'},
  catRowSoulmate:{borderColor:'rgba(171,112,42,0.35)',backgroundColor:'rgba(255,247,228,0.88)'},
  catAvatar:{width:58,height:58,alignItems:'center',justifyContent:'center'},
  catAvatarRunaway:{opacity:0.35},
  soulmateAvatarRing:{position:'absolute',left:-3,top:-3,right:-3,bottom:-3,borderRadius:16,borderWidth:1.4,borderColor:'rgba(171,112,42,0.45)'},
  soulmateReward:{position:'absolute',right:-7,top:-8,width:24,height:24},
  rowTop:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:4},
  catName:{flex:1,color:C.tertiary,fontWeight:'900',fontSize:15},
  statusBadge:{color:C.primary,fontSize:10,fontWeight:'800',backgroundColor:C.primaryFixed,paddingHorizontal:8,paddingVertical:3,borderRadius:999,overflow:'hidden'},
  statusBadgeRunaway:{color:C.error,backgroundColor:C.errorContainer},
  statusBadgeSoulmate:{color:'#8A551E',backgroundColor:'#FFF1CF'},
  meta:{color:C.onSurfaceVariant,fontSize:11,marginBottom:7},
  xpBar:{height:6,backgroundColor:C.surfaceContainerHigh,borderRadius:999,overflow:'hidden'},
  xpFill:{height:'100%',backgroundColor:C.primaryContainer,borderRadius:999},
  soulmateBtn:{alignSelf:'flex-start',marginTop:9,paddingHorizontal:12,paddingVertical:6,borderRadius:999,backgroundColor:C.surfaceContainerLow,borderWidth:1,borderColor:C.border},
  soulmateBtnActive:{backgroundColor:C.primary,borderColor:C.primary},
  soulmateBtnText:{color:C.primary,fontSize:11,fontWeight:'900'},
  soulmateBtnTextActive:{color:'#fff'},
  soulmateModalBackdrop:{flex:1,backgroundColor:'rgba(28,20,13,0.42)',alignItems:'center',justifyContent:'center',padding:24},
  soulmateModalCard:{width:'100%',maxWidth:340,borderRadius:28,backgroundColor:C.surfaceContainerLowest,paddingHorizontal:22,paddingTop:24,paddingBottom:18,alignItems:'center',shadowColor:'#6F441E',shadowOpacity:0.16,shadowRadius:28,shadowOffset:{width:0,height:14}},
  soulmateModalReward:{width:78,height:78,marginBottom:10},
  soulmateModalTitle:{color:C.tertiary,fontSize:20,fontWeight:'900',marginBottom:8},
  soulmateModalDesc:{color:C.onSurfaceVariant,fontSize:13,lineHeight:20,textAlign:'center',marginBottom:18},
  soulmateModalActions:{width:'100%',flexDirection:'row',gap:10},
  soulmateCancelBtn:{flex:1,height:46,borderRadius:16,backgroundColor:C.surfaceContainerLow,alignItems:'center',justifyContent:'center'},
  soulmateCancelText:{color:C.tertiary,fontSize:14,fontWeight:'800'},
  soulmateConfirmBtn:{flex:1,height:46,borderRadius:16,backgroundColor:C.primary,alignItems:'center',justifyContent:'center'},
  soulmateConfirmBtnDisabled:{opacity:0.55},
  soulmateConfirmText:{color:'#fff',fontSize:14,fontWeight:'900'},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  card:{width:'31%',alignItems:'center',paddingVertical:18,paddingHorizontal:8,borderRadius:20,minHeight:155,borderWidth:1.5},
  cardUl:{backgroundColor:C.surfaceContainerLowest,borderColor:C.borderActive,shadowColor:C.shadow.shadowColor,shadowOpacity:0.06,shadowRadius:12,shadowOffset:{width:0,height:4}},
  cardLock:{backgroundColor:C.surfaceContainerLow,borderColor:C.borderDashed,borderStyle:'dashed'},
  cardR:{backgroundColor:C.primaryFixed,borderColor:'rgba(243,156,18,0.35)'},
  ci:{alignItems:'center',justifyContent:'center',flex:1},
  bn:{color:C.tertiary,fontWeight:'700',fontSize:14,marginTop:10},btag:{color:C.primary,fontSize:11,fontWeight:'600',marginTop:5},
  lc:{width:72,height:72,alignItems:'center',justifyContent:'center',backgroundColor:C.surfaceContainerHigh,borderRadius:36},lq:{fontSize:28,fontWeight:'800',color:C.outline},
  ln:{color:C.outline,fontSize:12,marginTop:8,fontWeight:'600'},lt:{color:C.outline,fontSize:10,marginTop:4},
  rn:{color:C.primaryContainer,fontWeight:'700',fontSize:14,marginTop:8},rtag:{color:C.primaryContainer,fontSize:11,fontWeight:'600',marginTop:5},
  rb:{backgroundColor:'rgba(243,156,18,0.15)',paddingHorizontal:8,paddingVertical:2,borderRadius:8,marginBottom:4},rbt:{color:C.primaryContainer,fontSize:10,fontWeight:'700'},
});
