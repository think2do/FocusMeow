import { BREEDS, RARES } from '../data/gameData';

// ── XP ──
export const xpFor = lv => lv * 10;
export const totXp = lv => { let t = 0; for (let i = 1; i < lv; i++) t += i * 10; return t; };
export const lvUp = (cat, addXp) => {
  const nx = cat.xp + addXp; let nl = cat.level, xa = nx, nd = xpFor(nl);
  while (xa >= nd) { xa -= nd; nl++; nd = xpFor(nl); }
  return { ...cat, xp: nx, level: nl };
};

// ── Format ──
export const N = (obj, lang) => typeof obj === 'string' ? obj : (obj?.[lang] || obj?.zh || '');
export const fmtT = (s, lang) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h${m}m` : lang === 'en' ? `${m} min` : `${m}分钟`; };
export const fmtShort = s => { if (!s) return '0m'; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h${m}m` : `${m}m`; };

export const maskPhone = p => (!p || p.length < 7) ? p : p.slice(0, 3) + '****' + p.slice(-4);
export const maskEmail = e => { if (!e) return ''; const [u, d] = e.split('@'); return u.slice(0, 2) + '***@' + (d || ''); };

// ── Cute Random Names ──
const ZH_FIRST = ['小','阿','大','胖','瘦','花','毛','豆','糖','奶','团','球','圆','萌','咪','喵','棉','雪','乖','甜','嘟','软','萱','悠','可','妞','宝','酱','饼','橙','桃','梅','柚','栗','芋','薯','莓','瓜','果','米'];
const ZH_SECOND = ['团子','丸子','包子','饺子','年糕','布丁','麻薯','豆腐','汤圆','可乐','奶茶','拿铁','摩卡','抹茶','芒果','草莓','蓝莓','椰子','西瓜','蜜桃','葡萄','芝士','曲奇','泡芙','慕斯','松饼','仙贝','雪球','花卷','馒头','煎饼','薯条','披萨','寿司','饭团','棉花','云朵','星星','月亮','太阳','彩虹','泡泡','糯米','芝麻','花生','核桃','杏仁','腰果','棒棒糖','冰淇淋','巧克力','棉花糖','焦糖','奶酪','酸奶','果冻','软糖','麦芽糖','蛋挞','甜甜圈'];
const EN_FIRST = ['Mr','Ms','Sir','Lady','Little','Big','Baby','Captain','Professor','General','Duke','Princess','Prince','Lord','Baron'];
const EN_SECOND = ['Whiskers','Mittens','Pudding','Mochi','Biscuit','Cookie','Noodle','Tofu','Waffle','Pancake','Muffin','Cupcake','Brownie','Donut','Pretzel','Churro','Dumpling','Taco','Nacho','Pickle','Pepper','Ginger','Cinnamon','Nutmeg','Clover','Pebble','Marble','Button','Ziggy','Cosmo','Luna','Nova','Pixel','Spark','Blitz','Fizz','Jazz','Rumble','Twinkle','Snowy','Fluffy','Fuzzy','Poppy','Sunny','Misty','Shadow','Storm','Breeze','Peach','Mango','Lemon','Berry','Cherry','Olive','Maple','Willow','Sage','Basil','Latte','Mocha','Coco','Chai','Oreo','Pumpkin','Truffle','Wonton','Sushi','Ramen'];

function rndName() {
  const zf = ZH_FIRST[Math.floor(Math.random() * ZH_FIRST.length)];
  const zs = ZH_SECOND[Math.floor(Math.random() * ZH_SECOND.length)];
  // 50% chance: prefix + noun, 50% just noun
  const zh = Math.random() < 0.5 ? zf + zs : zs;
  const ef = EN_FIRST[Math.floor(Math.random() * EN_FIRST.length)];
  const es = EN_SECOND[Math.floor(Math.random() * EN_SECOND.length)];
  const en = Math.random() < 0.5 ? `${ef} ${es}` : es;
  return { zh, en };
}

// ── Gacha ──
export function rndNormal() {
  const b = BREEDS[Math.floor(Math.random() * BREEDS.length)];
  return { breedId: b.id, name: rndName() };
}
export function rndRare() {
  const rt = RARES[Math.floor(Math.random() * RARES.length)];
  return { rareType: rt.id, rareName: rndName(), breed1: rt.id, breed2: rt.id };
}
export function rareProb(m) { if (m >= 90) return 0.25; if (m >= 60) return 0.15; if (m >= 30) return 0.10; return 0.05; }
