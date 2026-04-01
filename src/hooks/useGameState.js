import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STARTER } from '../data/gameData';
import { lvUp, rndNormal, rndRare, rareProb } from '../utils/helpers';

const KEY = 'focusmeow-v7';
const sv = async d => { try { await AsyncStorage.setItem(KEY, JSON.stringify(d)); } catch {} };
const ld = async () => { try { const r = await AsyncStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch { return null; } };

export default function useGameState() {
  const [cats, setCats] = useState([{ ...STARTER }]);
  const [completions, setComp] = useState(0);
  const [selCat, setSel] = useState(null);
  const [focusMin, setFM] = useState(25);
  const [timeLeft, setTL] = useState(0);
  const [totalTime, setTT] = useState(0);
  const [interrupts, setIntr] = useState(0);
  const [fState, setFS] = useState('idle');
  const [result, setRes] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState({ totalFocus: 0, totalComplete: 0 });
  const [accTime, setAT] = useState(0);
  const [accCount, setAC] = useState(0);
  const [collection, setColl] = useState({ normal: [], rare: [] });
  const [themeId, setTheme] = useState('default');
  const [lang, setLang] = useState('zh');
  const [profile, setProfile] = useState({ nickname: '猫咪爱好者', username: 'cat_lover', avatar: '😺', email: 'user@example.com', phone: '', password: '123456' });
  const [focusHistory, setFH] = useState([]);
  const [cat0DeathTime, setCat0Death] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => { (async () => {
    const d = await ld();
    if (d) {
      // Migrate removed breeds: british/exotic → sphynx, golden → devon, tuxedo → persian
      // Migrate rare: couple → couple (keep), twins → couple
      const lc = (d.cats || []).map(c => {
        let bid = c.breedId;
        if (bid === 'british' || bid === 'exotic') bid = 'sphynx';
        if (bid === 'golden') bid = 'devon';
        if (bid === 'tuxedo') bid = 'persian';
        let rt = c.rareType;
        if (rt === 'twins') { rt = 'couple'; bid = 'couple'; }
        if (rt === 'couple' && bid !== 'couple') bid = 'couple';
        if (rt === 'rainbow' && bid !== 'rainbow') bid = 'rainbow';
        if (rt === 'black' && bid !== 'black') bid = 'black';
        return { ...c, breedId: bid, rareType: rt, focusTime: c.focusTime || 0 };
      });
      setCats(lc.length > 0 ? lc : [{ ...STARTER }]);
      setComp(d.completions || 0); setStats(d.stats || { totalFocus: 0, totalComplete: 0 });
      setIntr(d.interrupts || 0);
      setAT(d.accTime || 0); setAC(d.accCount || 0);
      // Migrate collection: breeds + rare twins → couple
      let coll = d.collection || { normal: ['orange'], rare: [] };
      coll.normal = [...new Set((coll.normal || []).map(k => {
        if (k === 'british' || k === 'exotic') return 'sphynx';
        if (k === 'golden') return 'devon';
        if (k === 'tuxedo') return 'persian';
        return k;
      }))];
      coll.rare = [...new Set((coll.rare || []).map(k => k === 'twins' ? 'couple' : k))];
      setColl(coll); setTheme(d.themeId || 'default');
      if (d.lang) setLang(d.lang); if (d.profile) setProfile(d.profile);
      if (d.focusHistory) setFH(d.focusHistory);
      // 保底: 初始橘猫死亡5分钟后自动复活
      if (d.cat0DeathTime) {
        const elapsed = Date.now() - d.cat0DeathTime;
        if (elapsed >= 5 * 60 * 1000) {
          // 已过5分钟,复活cat-0
          const revived = (lc.length > 0 ? lc : [{ ...STARTER }]).map(c =>
            c.id === 'cat-0' && !c.alive ? { ...c, alive: true, xp: 0, level: 1 } : c
          );
          setCats(revived);
          setCat0Death(null);
        } else {
          setCat0Death(d.cat0DeathTime);
          // 剩余时间后复活
          setTimeout(() => {
            setCats(cs => cs.map(c => c.id === 'cat-0' && !c.alive ? { ...c, alive: true, xp: 0, level: 1 } : c));
            setCat0Death(null);
          }, 5 * 60 * 1000 - elapsed);
        }
      }
    } else { setCats([{ ...STARTER }]); setColl({ normal: ['orange'], rare: [] }); }
    setLoaded(true);
  })(); }, []);

  const persist = useCallback(async () => { await sv({ cats, completions, stats, interrupts, accTime, accCount, collection, themeId, lang, profile, focusHistory, cat0DeathTime }); }, [cats, completions, stats, interrupts, accTime, accCount, collection, themeId, lang, profile, focusHistory, cat0DeathTime]);
  useEffect(() => { if (loaded) persist(); }, [loaded, persist]);

  useEffect(() => {
    if (fState === 'running' && timeLeft > 0) { timerRef.current = setTimeout(() => setTL(t => t - 1), 1000); return () => clearTimeout(timerRef.current); }
  }, [fState, timeLeft]);

  const startFocus = () => { setTT(focusMin * 60); setTL(focusMin * 60); setFS('running'); startTimeRef.current = new Date(); };

  const addHistory = (completed, duration) => {
    const now = new Date();
    const record = { date: now.toISOString().split('T')[0], hour: startTimeRef.current ? startTimeRef.current.getHours() : now.getHours(), duration, planned: totalTime, completed, interrupted: !completed };
    setFH(h => [...h.slice(-200), record]);
  };

  const handleInterrupt = () => {
    clearTimeout(timerRef.current); setFS('idle');
    addHistory(false, totalTime - timeLeft);
    const ni = interrupts + 1; setIntr(ni);
    if (ni >= 2) {
      setCats(cs => cs.map(c => c.id === selCat ? { ...c, alive: false } : c));
      setRes({ type: 'dead', catId: selCat }); setIntr(0);
      // 保底: 初始橘猫(cat-0)死亡5分钟后自动复活
      if (selCat === 'cat-0') {
        setCat0Death(Date.now());
        setTimeout(() => {
          setCats(cs => cs.map(c => c.id === 'cat-0' && !c.alive ? { ...c, alive: true, xp: 0, level: 1 } : c));
          setCat0Death(null);
        }, 5 * 60 * 1000);
      }
    }
    else setRes({ type: 'hungry', catId: selCat, interrupts: ni });
  };

  const handleComplete = () => {
    clearTimeout(timerRef.current); setFS('idle');
    addHistory(true, totalTime);
    const nc = completions + 1; setComp(nc); setIntr(0);
    let upd = cats.map(c => { if (c.id === selCat && c.alive) { return { ...lvUp(c, 5), focusTime: (c.focusTime || 0) + totalTime }; } return c; });
    const nAT = accTime + totalTime, nAC = accCount + 1;
    let newCat = null, nColl = { ...collection };
    if (nAC >= 2) {
      const am = Math.floor(nAT / 60), rp = rareProb(am), isR = Math.random() < rp;
      if (isR) {
        const rc = rndRare();
        newCat = { id: `cat-${Date.now()}`, breedId: rc.breed1, name: rc.rareName, xp: 0, level: 1, alive: true, isRare: true, rareType: rc.rareType, breed2: rc.breed2, focusTime: 0 };
        if (!nColl.rare.includes(rc.rareType)) nColl.rare = [...nColl.rare, rc.rareType];
      } else {
        const n2 = rndNormal();
        newCat = { id: `cat-${Date.now()}`, breedId: n2.breedId, name: n2.name, xp: 0, level: 1, alive: true, isRare: false, focusTime: 0 };
        if (!nColl.normal.includes(n2.breedId)) nColl.normal = [...nColl.normal, n2.breedId];
      }
      upd = [...upd, newCat]; setAT(0); setAC(0);
    } else { setAT(nAT); setAC(nAC); }
    setCats(upd); setColl(nColl);
    setStats(s => ({ ...s, totalFocus: s.totalFocus + totalTime, totalComplete: s.totalComplete + 1 }));
    setRes({ type: 'success', catId: selCat, newCat, accCount: nAC >= 2 ? 0 : nAC });
  };

  return {
    cats, completions, selCat, focusMin, timeLeft, totalTime, interrupts, fState, result, loaded,
    stats, accTime, accCount, collection, themeId, lang, profile, focusHistory, cat0DeathTime,
    setCats, setSel, setFM, setRes, setTheme, setLang, setProfile,
    aliveCats: cats.filter(c => c.alive),
    startFocus, handleInterrupt, handleComplete,
    isTimerDone: fState === 'running' && timeLeft === 0,
  };
}
