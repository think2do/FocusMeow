import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useGame } from '../../App';

export default function AIScreen() {
  const g = useGame();
  const { t, lang, focusHistory, stats } = g;
  const zh = lang === 'zh';
  const [period, setPeriod] = useState('week');

  const a = useMemo(() => {
    const h = focusHistory || [];
    if (h.length < 2) return null;
    const now = new Date();
    const daysBack = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const cutoff = new Date(now - daysBack * 864e5).toISOString().split('T')[0];
    const prev = new Date(now - daysBack * 2 * 864e5).toISOString().split('T')[0];
    const cur = h.filter(r => r.date >= cutoff);
    const pre = h.filter(r => r.date >= prev && r.date < cutoff);

    // Hourly distribution (0-23)
    const hourData = Array(24).fill(0);
    cur.forEach(r => { if (r.completed) hourData[r.hour] = (hourData[r.hour] || 0) + Math.round(r.duration / 60); });
    const maxHourMin = Math.max(...hourData, 1);

    // Best hour
    const hourMap = {};
    h.forEach(r => { if (!hourMap[r.hour]) hourMap[r.hour] = { total: 0, ok: 0 }; hourMap[r.hour].total++; if (r.completed) hourMap[r.hour].ok++; });
    let bestHr = -1, bestR = 0;
    Object.entries(hourMap).forEach(([hr, d]) => { const rate = d.total > 0 ? d.ok / d.total : 0; if (rate > bestR) { bestHr = parseInt(hr); bestR = rate; } });

    // Duration analysis
    const durMap = {};
    h.forEach(r => { const m = Math.round(r.planned / 60); const bk = m <= 10 ? '5-10' : m <= 20 ? '10-20' : m <= 35 ? '25-30' : m <= 50 ? '45-50' : '60+'; if (!durMap[bk]) durMap[bk] = { total: 0, ok: 0 }; durMap[bk].total++; if (r.completed) durMap[bk].ok++; });
    let bestDur = '', bestDR = 0;
    Object.entries(durMap).forEach(([d, v]) => { const r = v.total > 1 ? v.ok / v.total : 0; if (r > bestDR) { bestDur = d; bestDR = r; } });

    const cOk = cur.filter(r => r.completed).length, cT = cur.length;
    const cMin = Math.round(cur.filter(r => r.completed).reduce((s, r) => s + r.duration, 0) / 60);
    const pMin = Math.round(pre.filter(r => r.completed).reduce((s, r) => s + r.duration, 0) / 60);

    const dates = [...new Set(h.filter(r => r.completed).map(r => r.date))].sort().reverse();
    let streak = 0, cd = now.toISOString().split('T')[0];
    for (let i = 0; i < 60; i++) { if (dates.includes(cd)) streak++; else if (i > 0) break; const d2 = new Date(cd); d2.setDate(d2.getDate() - 1); cd = d2.toISOString().split('T')[0]; }

    return { hourData, maxHourMin, bestHr, bestR, durMap, bestDur, bestDR, cOk, cT, cMin, pMin, streak };
  }, [focusHistory, period]);

  const fH = h => h < 0 ? '--' : `${String(h).padStart(2, '0')}:00`;
  const periodLabel = { day: zh ? '今日' : 'Today', week: zh ? '本周' : 'Week', month: zh ? '本月' : 'Month' };

  if (!a) return (
    <ScrollView style={s.bg} contentContainerStyle={{ padding: 20, paddingTop: 55, alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
      <Text style={{ fontSize: 48 }}>🤖</Text>
      <Text style={s.h}>{zh ? '🧠 AI 分析报告' : '🧠 AI Analysis'}</Text>
      <Text style={s.empty}>{zh ? '完成至少2次专注后，AI将为你生成个性化建议' : 'Complete 2+ sessions for AI insights'}</Text>
    </ScrollView>
  );

  const cr = a.cT > 0 ? Math.round(a.cOk / a.cT * 100) : 0;
  const trend = a.cMin > a.pMin ? 'up' : a.cMin < a.pMin ? 'down' : 'same';

  return (
    <ScrollView style={s.bg} contentContainerStyle={{ padding: 20, paddingTop: 55, paddingBottom: 100 }}>
      <Text style={s.h}>{zh ? '🧠 AI 分析报告' : '🧠 AI Analysis'}</Text>

      {/* Period Toggle */}
      <View style={s.toggle}>
        {['day', 'week', 'month'].map(p => (
          <TouchableOpacity key={p} style={[s.togBtn, period === p && s.togActive]} onPress={() => setPeriod(p)}>
            <Text style={[s.togText, period === p && s.togTextA]}>{periodLabel[p]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Row */}
      <View style={s.card}>
        <Text style={s.ct}>{zh ? '📊 ' + periodLabel[period] + '报告' : '📊 ' + periodLabel[period] + ' Report'}</Text>
        <View style={s.row}>
          {[[a.cOk, zh ? '完成' : 'Done'], [a.cMin, zh ? '分钟' : 'Min'], [cr + '%', zh ? '完成率' : 'Rate'], [a.streak, zh ? '连续' : 'Streak']].map(([v, l], i) => (
            <View key={i} style={s.stat}><Text style={s.sv}>{v}</Text><Text style={s.sl}>{l}</Text></View>
          ))}
        </View>
        <View style={s.tr}>
          <Text style={{ fontSize: 16 }}>{trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️'}</Text>
          <Text style={s.tt}>{trend === 'up' ? (zh ? `比上期多${a.cMin - a.pMin}分钟` : `${a.cMin - a.pMin} more min`)
            : trend === 'down' ? (zh ? `比上期少${a.pMin - a.cMin}分钟` : `${a.pMin - a.cMin} fewer min`)
              : (zh ? '和上期持平' : 'Same as before')}</Text>
        </View>
      </View>

      {/* Hourly Bar Chart */}
      <View style={s.card}>
        <Text style={s.ct}>{zh ? '📊 时段分布图' : '📊 Hourly Distribution'}</Text>
        <View style={s.chartWrap}>
          <View style={s.yAxis}>
            <Text style={s.axisLabel}>{a.maxHourMin}m</Text>
            <Text style={s.axisLabel}>{Math.round(a.maxHourMin / 2)}m</Text>
            <Text style={s.axisLabel}>0</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chartScroll}>
            <View style={s.chart}>
              {a.hourData.map((min, hr) => (
                <View key={hr} style={s.barCol}>
                  <View style={[s.bar, { height: Math.max(2, (min / a.maxHourMin) * 100), backgroundColor: hr === a.bestHr ? '#D06B6B' : 'rgba(208,107,107,0.35)' }]} />
                  <Text style={s.barLabel}>{hr}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
        <Text style={s.chartHint}>{zh ? '← 左右滑动查看 →' : '← Scroll to see all →'}</Text>
      </View>

      {/* Best Time */}
      <View style={s.card}>
        <Text style={s.ct}>{zh ? '⏰ 最佳专注时段' : '⏰ Best Time'}</Text>
        <Text style={s.insight}>{zh ? `你在 ${fH(a.bestHr)} 效率最高（完成率${Math.round(a.bestR * 100)}%），建议把重要任务安排在这个时段。` : `Peak at ${fH(a.bestHr)} (${Math.round(a.bestR * 100)}%). Schedule key tasks here.`}</Text>
      </View>

      {/* Duration Analysis */}
      <View style={s.card}>
        <Text style={s.ct}>{zh ? '⏱ 时长分析' : '⏱ Duration'}</Text>
        {Object.entries(a.durMap).map(([d, v]) => {
          const r = v.total > 0 ? Math.round(v.ok / v.total * 100) : 0;
          return (<View key={d} style={s.dr}><Text style={s.dl}>{d}{zh ? '分' : 'm'}</Text><View style={s.db}><View style={[s.df, { width: `${r}%` }]} /></View><Text style={s.dp}>{r}%</Text></View>);
        })}
        {a.bestDur ? <Text style={s.insight}>{zh ? `${a.bestDur}分钟完成率最高（${Math.round(a.bestDR * 100)}%）。` : `Best at ${a.bestDur}min (${Math.round(a.bestDR * 100)}%).`}</Text> : null}
      </View>

      {/* Tips */}
      <View style={s.card}>
        <Text style={s.ct}>{zh ? '💡 AI 建议' : '💡 Suggestions'}</Text>
        {cr >= 80 && <View style={s.tip}><Text style={s.ti}>🌟</Text><Text style={s.tx}>{zh ? '完成率很高！尝试增加5-10分钟挑战自己。' : 'Great rate! Add 5-10 min to challenge yourself.'}</Text></View>}
        {cr > 0 && cr < 50 && <View style={s.tip}><Text style={s.ti}>💪</Text><Text style={s.tx}>{zh ? '建议先设15-20分钟，建立习惯后再增加。' : 'Start with 15-20 min, increase later.'}</Text></View>}
        {a.streak >= 3 && <View style={s.tip}><Text style={s.ti}>🔥</Text><Text style={s.tx}>{zh ? `连续${a.streak}天！坚持7天形成习惯。` : `${a.streak}-day streak! 7 days = habit.`}</Text></View>}
        {a.streak === 0 && <View style={s.tip}><Text style={s.ti}>🐾</Text><Text style={s.tx}>{zh ? '今天还没专注，小猫在等你！' : 'No focus today - cat is waiting!'}</Text></View>}
        <View style={s.tip}><Text style={s.ti}>📅</Text><Text style={s.tx}>{zh ? `每日计划：${fH(a.bestHr)} 专注 ${a.bestDur || '25'}分钟。` : `Plan: ${fH(a.bestHr)} for ${a.bestDur || '25'}min.`}</Text></View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#FBF5F0' },
  h: { fontSize: 24, fontWeight: '900', color: '#D06B6B', marginBottom: 6 },
  empty: { color: '#66615E', fontSize: 14, textAlign: 'center', marginTop: 16, lineHeight: 22, paddingHorizontal: 20 },
  toggle: { flexDirection: 'row', gap: 8, marginBottom: 18, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4, borderWidth: 1.5, borderColor: 'rgba(160,140,120,0.2)' },
  togBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  togActive: { backgroundColor: '#D06B6B' },
  togText: { color: '#66615E', fontSize: 13, fontWeight: '600' },
  togTextA: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1.5, borderColor: 'rgba(160,140,120,0.2)', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  ct: { color: '#332E2C', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: '#FBF5F0', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(160,140,120,0.15)' },
  sv: { color: '#D06B6B', fontSize: 20, fontWeight: '800' },
  sl: { color: '#66615E', fontSize: 10, marginTop: 2 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: '#FBF5F0', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(160,140,120,0.15)' },
  tt: { color: '#66615E', fontSize: 12, flex: 1, lineHeight: 18 },
  // Bar chart
  chartWrap: { flexDirection: 'row', height: 140 },
  yAxis: { width: 30, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 4, paddingBottom: 18 },
  axisLabel: { color: '#8C8480', fontSize: 9 },
  chartScroll: { flex: 1 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, paddingBottom: 18, gap: 4 },
  barCol: { alignItems: 'center', width: 20 },
  bar: { width: 14, borderRadius: 4, minHeight: 2 },
  barLabel: { color: '#8C8480', fontSize: 8, marginTop: 4 },
  chartHint: { color: '#A09890', fontSize: 10, textAlign: 'center', marginTop: 6 },
  insight: { color: '#66615E', fontSize: 13, lineHeight: 20, marginTop: 8 },
  dr: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dl: { color: '#66615E', fontSize: 11, width: 50 },
  db: { flex: 1, height: 8, backgroundColor: 'rgba(160,140,120,0.1)', borderRadius: 4, overflow: 'hidden' },
  df: { height: '100%', backgroundColor: '#D06B6B', borderRadius: 4 },
  dp: { color: '#332E2C', fontSize: 11, fontWeight: '700', width: 35, textAlign: 'right' },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FBF5F0', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(160,140,120,0.15)' },
  ti: { fontSize: 16, marginTop: 1 },
  tx: { color: '#66615E', fontSize: 13, flex: 1, lineHeight: 20 },
});
