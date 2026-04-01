import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useGame } from '../../App';
import CatAvatar from '../components/CatAvatar';
import { N, fmtT, fmtShort, xpFor, totXp } from '../utils/helpers';

export default function StatsScreen() {
  const g = useGame();
  const { t, lang, cats, stats } = g;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100, paddingTop: 55 }}>
      <Text style={s.h}>{t('recordTitle')}</Text>
      <View style={s.grid}>{[['🎯', stats.totalComplete, t('done')], ['⏱', fmtT(stats.totalFocus, lang), t('duration')], ['🐱', cats.length, t('cats')], ['⭐', Math.max(0, ...cats.map(c => c.level)), t('highest')]].map(([i, v, l], k) =>
        <View key={k} style={s.bc}><Text style={{ fontSize: 24 }}>{i}</Text><Text style={s.bv}>{v}</Text><Text style={s.bl}>{l}</Text></View>
      )}</View>
      <Text style={s.sec}>{t('allCats')} ({cats.length})</Text>
      {cats.map(cat => { const px = cat.xp - totXp(cat.level), nx = xpFor(cat.level); return (
        <View key={cat.id} style={[s.row, !cat.alive && { opacity: 0.5 }]}>
          <View style={s.avatarWrap}>
            <CatAvatar breedId={cat.breedId} level={cat.level}
              state={cat.alive ? 'idle' : 'dead'} size={48} rounded={10}
              isRare={cat.isRare} rareType={cat.rareType} breed2={cat.breed2} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.ri}><Text style={s.rn}>{N(cat.name, lang)}</Text><Text style={s.rl}>Lv.{cat.level}</Text>
              {cat.isRare && <Text style={s.rb}>{t('rareL')}</Text>}{!cat.alive && <Text style={{ color: '#D4646A', fontSize: 10 }}>💀</Text>}</View>
            <View style={s.xb}><View style={[s.xf, { width: `${cat.alive ? Math.min(100, (px / nx) * 100) : 0}%` }]} /></View>
            <View style={s.rb2}><Text style={s.xt}>{cat.alive ? `${px}/${nx} XP` : `${cat.xp} XP`}</Text><Text style={s.xt}>🕐 {fmtShort(cat.focusTime)}</Text></View>
          </View>
        </View>); })}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  h: { fontSize: 24, fontWeight: '900', color: '#D06B6B', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  bc: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(160,140,120,0.2)', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  bv: { color: '#332E2C', fontSize: 22, fontWeight: '800', marginTop: 2 }, bl: { color: '#66615E', fontSize: 11 },
  sec: { color: '#332E2C', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 8, borderWidth: 1.5, borderColor: 'rgba(160,140,120,0.2)' },
  avatarWrap: { width: 48, height: 48, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  ri: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' },
  rn: { color: '#332E2C', fontWeight: '700', fontSize: 13 }, rl: { color: '#8C8480', fontSize: 11 },
  rb: { color: '#B8863A', fontSize: 9, fontWeight: '700', backgroundColor: 'rgba(196,154,108,0.15)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  xb: { height: 5, backgroundColor: 'rgba(180,150,130,0.12)', borderRadius: 10, overflow: 'hidden' },
  xf: { height: '100%', backgroundColor: '#D06B6B', borderRadius: 10 },
  rb2: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  xt: { color: '#8C8480', fontSize: 10 },
});
