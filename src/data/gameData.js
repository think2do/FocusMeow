export const BREEDS = [
  {id:"ragdoll",name:{zh:"布偶猫",en:"Ragdoll"},body:"#FFF5EE",accent:"#B8A090",ear:"#C4AA96"},
  {id:"orange",name:{zh:"橘猫",en:"Tabby"},body:"#F4A460",accent:"#E8883A",ear:"#D4844A"},
  {id:"maine",name:{zh:"缅因猫",en:"Maine Coon"},body:"#A0856C",accent:"#7A6450",ear:"#8B7560"},
  {id:"siamese",name:{zh:"暹罗猫",en:"Siamese"},body:"#FAF0E6",accent:"#8B7355",ear:"#A08060"},
  {id:"sphynx",name:{zh:"无毛猫",en:"Sphynx"},body:"#F5D5C8",accent:"#E0B0A0",ear:"#E8C0B0"},
  {id:"blue",name:{zh:"蓝猫",en:"Blue"},body:"#7B9EBF",accent:"#5A7D9A",ear:"#6A8EAF"},
  {id:"devon",name:{zh:"德文猫",en:"Devon Rex"},body:"#C4A882",accent:"#8B7355",ear:"#D4B896"},
  {id:"persian",name:{zh:"波斯猫",en:"Persian"},body:"#C8A87C",accent:"#A08060",ear:"#B89870"},
  {id:"garfield",name:{zh:"加菲猫",en:"Garfield"},body:"#E8922A",accent:"#C47020",ear:"#D48030"},
];
export const RARES = [
  {id:"couple",name:{zh:"情侣猫",en:"Couple"},emoji:"💕"},
  {id:"rainbow",name:{zh:"彩虹猫",en:"Rainbow"},emoji:"🌈"},
  {id:"black",name:{zh:"黑猫",en:"Black Cat"},emoji:"🐈‍⬛"},
];
export const THEMES = [
  {id:"default",name:{zh:"经典",en:"Classic"},emoji:"🌙",unlock:1},
  {id:"pink",name:{zh:"粉粉",en:"Pink"},emoji:"🌸",unlock:1},
  {id:"forest",name:{zh:"森林",en:"Forest"},emoji:"🌲",unlock:2},
  {id:"beach",name:{zh:"海滩",en:"Beach"},emoji:"🏖️",unlock:3},
  {id:"aurora",name:{zh:"极光",en:"Aurora"},emoji:"🌌",unlock:4},
  {id:"cosmos",name:{zh:"星空",en:"Cosmos"},emoji:"✨",unlock:5},
];
export const STARTER = {
  id:"cat-0",breedId:"orange",
  name:{zh:"小橘",en:"Mochi"},xp:0,level:1,alive:true,
  isRare:false,focusTime:0,
};
export const SOUNDS = {
  start:'start',complete:'complete',newCat:'newCat',rareCat:'rareCat',
  hungry:'hungry',dead:'dead',tap:'tap',
};
