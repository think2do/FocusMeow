import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useGame } from '../../App';
import CatAvatar from '../components/CatAvatar';
import { N } from '../utils/helpers';
import { BREEDS, RARES } from '../data/gameData';

export default function CollectionScreen() {
  const g = useGame();
  const { t, lang, collection } = g;
  const [tab, setTab] = useState('normal');
  const zh = lang === 'zh';
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FBF5F0' }} contentContainerStyle={{ padding: 20, paddingBottom: 100, paddingTop: 55 }}>
      <Text style={s.h}>{t('bookTitle')}</Text>
      <Text style={s.sub}>{collection.normal.length}/{BREEDS.length} {t('normal')} · {collection.rare.length}/{RARES.length} {t('rare')}</Text>
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'normal' && s.tabNormalA]} onPress={() => setTab('normal')}>
          <Text style={[s.tabT, tab === 'normal' && { color: '#332E2C', fontWeight: '800' }]}>{t('normal')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'rare' && s.tabRareA]} onPress={() => setTab('rare')}>
          <Text style={[s.tabT, tab === 'rare' && { color: '#2C5282', fontWeight: '800' }]}>{t('rare')}</Text>
        </TouchableOpacity>
      </View>

      {tab === 'normal' && (
        <View style={s.grid}>
          {BREEDS.map(breed => {
            const ul = collection.normal.includes(breed.id);
            return (
              <View key={breed.id} style={[s.card, ul ? s.cardUl : s.cardLock]}>
                {ul ? (
                  <View style={s.cardInner}>
                    <CatAvatar breedId={breed.id} level={1} state="idle" size={72} rounded={14} />
                    <Text style={s.breedName}>{N(breed.name, lang)}</Text>
                    <Text style={s.breedTag}>✅ {zh ? '已收集' : 'Collected'}</Text>
                  </View>
                ) : (
                  <View style={s.cardInner}>
                    <View style={s.lockCircle}><Text style={s.lockQ}>?</Text></View>
                    <Text style={s.lockName}>???</Text>
                    <Text style={s.lockTag}>{zh ? '未收集' : 'Locked'}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {tab === 'rare' && (
        <View style={s.grid}>
          {RARES.map(rt => {
            const ul = collection.rare.includes(rt.id);
            return (
              <View key={rt.id} style={[s.card, ul ? s.cardRare : s.cardLock]}>
                {ul ? (
                  <View style={s.cardInner}>
                    <CatAvatar breedId={rt.id} level={1} state="idle" size={72} isRare rareType={rt.id} rounded={14} />
                    <Text style={s.rareName}>{N(rt.name, lang)}</Text>
                    <Text style={s.rareTag}>✨ {t('rareL')}</Text>
                  </View>
                ) : (
                  <View style={s.cardInner}>
                    <View style={s.lockCircle}><Text style={s.lockQ}>?</Text></View>
                    <View style={s.rareBadge}><Text style={s.rareBadgeT}>{t('rareL')}</Text></View>
                    <Text style={s.lockName}>???</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  h: { fontSize: 24, fontWeight: '900', color: '#D06B6B', marginBottom: 6 },
  sub: { color: '#66615E', fontSize: 12, marginBottom: 16 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  tab: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'rgba(160,140,120,0.2)', borderRadius: 12, padding: 10, alignItems: 'center' },
  tabNormalA: { borderColor: '#332E2C', backgroundColor: 'rgba(51,46,44,0.06)' },
  tabRareA: { borderColor: '#2C5282', backgroundColor: 'rgba(44,82,130,0.06)' },
  tabT: { color: '#66615E', fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '31%', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 8,
    backgroundColor: '#FFFFFF', borderWidth: 1.5,
    borderColor: 'rgba(160,140,120,0.2)', borderRadius: 18, minHeight: 155,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  cardUl: { borderColor: 'rgba(208,107,107,0.35)', borderStyle: 'solid' },
  cardLock: { borderColor: 'rgba(160,140,120,0.25)', borderStyle: 'dashed' },
  cardRare: { backgroundColor: 'rgba(196,154,108,0.06)', borderColor: 'rgba(184,134,58,0.3)', borderStyle: 'solid' },
  cardInner: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  breedName: { color: '#332E2C', fontWeight: '700', fontSize: 14, marginTop: 10 },
  breedTag: { color: '#D06B6B', fontSize: 11, fontWeight: '600', marginTop: 5 },
  lockCircle: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0EAE4', borderRadius: 36 },
  lockQ: { fontSize: 28, fontWeight: '800', color: '#8C8480' },
  lockName: { color: '#8C8480', fontSize: 12, marginTop: 8, fontWeight: '600' },
  lockTag: { color: '#A09890', fontSize: 10, marginTop: 4 },
  rareName: { color: '#B8863A', fontWeight: '700', fontSize: 14, marginTop: 8 },
  rareTag: { color: '#B8863A', fontSize: 11, fontWeight: '600', marginTop: 5 },
  rareBadge: { backgroundColor: 'rgba(196,154,108,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 4 },
  rareBadgeT: { color: '#B8863A', fontSize: 10, fontWeight: '700' },
});
