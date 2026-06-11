// カードデータベース（全カードはオリジナルの創作。SEGA社のカード名・画像は使用していません）
//
// type: 'unit' | 'evo'(進化ユニット) | 'trigger' | 'intercept'
// color: 'red' | 'yellow' | 'blue' | 'green' | 'none'
// kw: 固定能力 'speedmove'(スピードムーブ) | 'penetrate'(貫通)
// summon/death: ユニットの効果（召喚時/破壊時）
// trig: トリガー/インターセプトの発動条件と効果
//   when: 'allySummon' | 'enemySummon' | 'allyDeath' | 'lifeDamage' | 'turnStart'
//         | 'battleAlly' | 'enemyAttack'

export const COLOR_NAMES = { red: '赤', yellow: '黄', blue: '青', green: '緑', none: '無' };
export const TYPE_NAMES = { unit: 'ユニット', evo: '進化', trigger: 'トリガー', intercept: 'インターセプト' };

export const CARDS = [
  // ========== 赤（火力・直接ダメージ） ==========
  { id: 'r01', name: '炎の小鬼', type: 'unit', color: 'red', cost: 1, bp: 3000,
    text: '能力を持たない。' },
  { id: 'r02', name: '緋竜の幼生', type: 'unit', color: 'red', cost: 2, bp: 4000,
    summon: [{ op: 'damage', t: 'enemyRandom', n: 2000 }],
    text: '【召喚時】ランダムな敵ユニット1体に2000ダメージ。' },
  { id: 'r03', name: '火砲兵', type: 'unit', color: 'red', cost: 2, bp: 3000,
    summon: [{ op: 'damage', t: 'enemyStrongest', n: 2000 }],
    text: '【召喚時】BPが最大の敵ユニットに2000ダメージ。' },
  { id: 'r04', name: 'ボルケーノゴーレム', type: 'unit', color: 'red', cost: 4, bp: 6000,
    text: '能力を持たない。' },
  { id: 'r05', name: '爆炎の魔導士', type: 'unit', color: 'red', cost: 3, bp: 4000,
    summon: [{ op: 'damage', t: 'enemyAll', n: 1000 }],
    text: '【召喚時】敵ユニット全体に1000ダメージ。' },
  { id: 'r06', name: '紅蓮竜', type: 'unit', color: 'red', cost: 5, bp: 7000,
    summon: [{ op: 'damage', t: 'enemyRandom', n: 4000 }],
    text: '【召喚時】ランダムな敵ユニット1体に4000ダメージ。' },
  { id: 'r07', name: 'イフリート', type: 'evo', color: 'red', cost: 6, bp: 8000,
    summon: [{ op: 'damage', t: 'enemyAll', n: 3000 }],
    text: '【進化】【召喚時】敵ユニット全体に3000ダメージ。' },
  { id: 'r08', name: '火炎放射', type: 'trigger', color: 'red', cost: 0,
    trig: { when: 'allySummon', ops: [{ op: 'damage', t: 'enemyRandom', n: 1000 }] },
    text: '【トリガー】自分のユニットを召喚した時、ランダムな敵ユニット1体に1000ダメージ。' },
  { id: 'r09', name: '烈火の一撃', type: 'intercept', color: 'red', cost: 1,
    trig: { when: 'battleAlly', ops: [{ op: 'battleBuff', n: 3000 }] },
    text: '【インターセプト/CP1】自分のユニットの戦闘時、そのユニットのBPを戦闘中+3000。' },
  { id: 'r10', name: '自爆装置', type: 'intercept', color: 'red', cost: 2,
    trig: { when: 'enemyAttack', ops: [{ op: 'damage', t: 'attacker', n: 4000 }] },
    text: '【インターセプト/CP2】敵ユニットのアタック時、そのユニットに4000ダメージ。' },

  // ========== 黄（行動権・妨害） ==========
  { id: 'y01', name: '雷精スパーク', type: 'unit', color: 'yellow', cost: 1, bp: 2000,
    summon: [{ op: 'exhaust', t: 'enemyRandom' }],
    text: '【召喚時】ランダムな敵ユニット1体の行動権を消費させる。' },
  { id: 'y02', name: 'イナズマウルフ', type: 'unit', color: 'yellow', cost: 2, bp: 4000,
    kw: ['speedmove'],
    text: '【スピードムーブ】召喚したターンでもアタックできる。' },
  { id: 'y03', name: '雷鳴の射手', type: 'unit', color: 'yellow', cost: 3, bp: 5000,
    summon: [{ op: 'exhaust', t: 'enemyStrongest' }],
    text: '【召喚時】BPが最大の敵ユニットの行動権を消費させる。' },
  { id: 'y04', name: 'ゴブリン略奪者', type: 'unit', color: 'yellow', cost: 2, bp: 3000,
    summon: [{ op: 'handDes', n: 1 }],
    text: '【召喚時】相手の手札をランダムに1枚捨てさせる。' },
  { id: 'y05', name: '嵐の巨人', type: 'unit', color: 'yellow', cost: 5, bp: 7000,
    summon: [{ op: 'exhaust', t: 'enemyAll' }],
    text: '【召喚時】敵ユニット全体の行動権を消費させる。' },
  { id: 'y06', name: 'サンダードラゴン', type: 'evo', color: 'yellow', cost: 5, bp: 7000,
    summon: [{ op: 'damage', t: 'enemyRandom', n: 3000 }],
    text: '【進化】【召喚時】ランダムな敵ユニット1体に3000ダメージ。' },
  { id: 'y07', name: '雷光', type: 'trigger', color: 'yellow', cost: 0,
    trig: { when: 'enemySummon', ops: [{ op: 'exhaust', t: 'ctxUnit' }] },
    text: '【トリガー】敵ユニットが召喚された時、そのユニットの行動権を消費させる。' },
  { id: 'y08', name: '目くらまし', type: 'intercept', color: 'yellow', cost: 1,
    trig: { when: 'enemyAttack', ops: [{ op: 'battleDebuff', n: 3000 }] },
    text: '【インターセプト/CP1】敵ユニットのアタック時、そのユニットのBPを戦闘中-3000。' },
  { id: 'y09', name: '速攻の号令', type: 'intercept', color: 'yellow', cost: 1,
    trig: { when: 'battleAlly', ops: [{ op: 'battleBuff', n: 2000 }, { op: 'draw', n: 1 }] },
    text: '【インターセプト/CP1】自分のユニットの戦闘時、BPを戦闘中+2000し、カードを1枚引く。' },
  { id: 'y10', name: 'ピクシー', type: 'unit', color: 'yellow', cost: 1, bp: 1000,
    summon: [{ op: 'draw', n: 1 }],
    text: '【召喚時】カードを1枚引く。' },

  // ========== 青（破壊・捨札利用） ==========
  { id: 'b01', name: '深海の使い', type: 'unit', color: 'blue', cost: 1, bp: 2000,
    death: [{ op: 'draw', n: 1 }],
    text: '【破壊時】カードを1枚引く。' },
  { id: 'b02', name: '屍術師', type: 'unit', color: 'blue', cost: 3, bp: 4000,
    summon: [{ op: 'salvage', n: 1 }],
    text: '【召喚時】自分の捨札からランダムに1枚を手札に加える。' },
  { id: 'b03', name: '毒蛇', type: 'unit', color: 'blue', cost: 2, bp: 3000,
    summon: [{ op: 'debuff', t: 'enemyRandom', n: 2000 }],
    text: '【召喚時】ランダムな敵ユニット1体のBPを-2000する。' },
  { id: 'b04', name: '深淵の魔導師', type: 'unit', color: 'blue', cost: 4, bp: 5000,
    summon: [{ op: 'destroy', t: 'enemyWeakest' }],
    text: '【召喚時】BPが最小の敵ユニットを破壊する。' },
  { id: 'b05', name: 'リヴァイアサン', type: 'unit', color: 'blue', cost: 6, bp: 8000,
    summon: [{ op: 'destroy', t: 'enemyStrongest' }],
    text: '【召喚時】BPが最大の敵ユニットを破壊する。' },
  { id: 'b06', name: '死神', type: 'evo', color: 'blue', cost: 5, bp: 6000,
    summon: [{ op: 'destroy', t: 'enemyRandom' }],
    text: '【進化】【召喚時】ランダムな敵ユニット1体を破壊する。' },
  { id: 'b07', name: '海妖の歌', type: 'trigger', color: 'blue', cost: 0,
    trig: { when: 'allyDeath', ops: [{ op: 'draw', n: 1 }] },
    text: '【トリガー】自分のユニットが破壊された時、カードを1枚引く。' },
  { id: 'b08', name: '深き淵より', type: 'trigger', color: 'blue', cost: 0,
    trig: { when: 'lifeDamage', ops: [{ op: 'salvage', n: 1 }] },
    text: '【トリガー】自分がライフダメージを受けた時、捨札からランダムに1枚を手札に加える。' },
  { id: 'b09', name: '冥府の渦', type: 'intercept', color: 'blue', cost: 2,
    trig: { when: 'enemyAttack', ops: [{ op: 'destroyAttacker', max: 4000 }] },
    text: '【インターセプト/CP2】敵ユニットのアタック時、そのユニットのBPが4000以下なら破壊する。' },
  { id: 'b10', name: 'クラーケン', type: 'unit', color: 'blue', cost: 5, bp: 6000,
    summon: [{ op: 'debuff', t: 'enemyAll', n: 1000 }],
    text: '【召喚時】敵ユニット全体のBPを-1000する。' },

  // ========== 緑（高BP・強化） ==========
  { id: 'g01', name: '森の小妖精', type: 'unit', color: 'green', cost: 1, bp: 2000,
    summon: [{ op: 'heal', t: 'allyAll' }],
    text: '【召喚時】味方ユニット全体のBPダメージを回復する。' },
  { id: 'g02', name: '樹人の戦士', type: 'unit', color: 'green', cost: 2, bp: 5000,
    text: '能力を持たない。' },
  { id: 'g03', name: '角獣', type: 'unit', color: 'green', cost: 3, bp: 6000,
    text: '能力を持たない。' },
  { id: 'g04', name: '森林の賢者', type: 'unit', color: 'green', cost: 3, bp: 4000,
    summon: [{ op: 'cp', n: 1 }],
    text: '【召喚時】CPを1得る。' },
  { id: 'g05', name: '大樹の巨人', type: 'unit', color: 'green', cost: 6, bp: 9000,
    text: '能力を持たない。' },
  { id: 'g06', name: 'ベヒモス', type: 'evo', color: 'green', cost: 6, bp: 9000,
    kw: ['penetrate'],
    text: '【進化】【貫通】戦闘に勝利した時、相手プレイヤーのライフに1ダメージ。' },
  { id: 'g07', name: '生命の躍動', type: 'trigger', color: 'green', cost: 0,
    trig: { when: 'allySummon', ops: [{ op: 'buff', t: 'ctxUnit', n: 1000 }] },
    text: '【トリガー】自分のユニットを召喚した時、そのユニットのBPを+1000する。' },
  { id: 'g08', name: '加護の風', type: 'intercept', color: 'green', cost: 1,
    trig: { when: 'battleAlly', ops: [{ op: 'battleBuff', n: 4000 }] },
    text: '【インターセプト/CP1】自分のユニットの戦闘時、そのユニットのBPを戦闘中+4000。' },
  { id: 'g09', name: '森の恵み', type: 'trigger', color: 'green', cost: 0,
    trig: { when: 'lifeDamage', ops: [{ op: 'cp', n: 1 }] },
    text: '【トリガー】自分がライフダメージを受けた時、CPを1得る。' },
  { id: 'g10', name: '翼竜', type: 'unit', color: 'green', cost: 4, bp: 6000,
    kw: ['penetrate'],
    text: '【貫通】戦闘に勝利した時、相手プレイヤーのライフに1ダメージ。' },

  // ========== 無（汎用） ==========
  { id: 'n01', name: '偵察ドローン', type: 'unit', color: 'none', cost: 1, bp: 1000,
    summon: [{ op: 'draw', n: 1 }],
    text: '【召喚時】カードを1枚引く。' },
  { id: 'n02', name: '強化外骨格', type: 'unit', color: 'none', cost: 3, bp: 5000,
    text: '能力を持たない。' },
  { id: 'n03', name: '機械仕掛けの巨兵', type: 'unit', color: 'none', cost: 7, bp: 10000,
    text: '能力を持たない。' },
  { id: 'n04', name: '補給部隊', type: 'unit', color: 'none', cost: 2, bp: 2000,
    summon: [{ op: 'cp', n: 1 }],
    text: '【召喚時】CPを1得る。' },
  { id: 'n05', name: 'エナジー充填', type: 'trigger', color: 'none', cost: 0,
    trig: { when: 'turnStart', ops: [{ op: 'cp', n: 1 }] },
    text: '【トリガー】自分のターン開始時、CPを1得る。' },
  { id: 'n06', name: '緊急回避', type: 'intercept', color: 'none', cost: 1,
    trig: { when: 'enemyAttack', ops: [{ op: 'battleDebuff', n: 2000 }] },
    text: '【インターセプト/CP1】敵ユニットのアタック時、そのユニットのBPを戦闘中-2000。' },
];

export const CARD_MAP = Object.fromEntries(CARDS.map(c => [c.id, c]));

function expand(counts) {
  const deck = [];
  for (const [id, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) deck.push(id);
  }
  return deck;
}

// プリセットデッキ（各40枚）
export const PRESET_DECKS = {
  '緋炎の猛攻（赤）': expand({
    r01: 3, r02: 3, r03: 3, r04: 3, r05: 3, r06: 3, r07: 2, r08: 3, r09: 3, r10: 2,
    n01: 3, n02: 3, n04: 3, n06: 3,
  }),
  '雷霆の支配（黄）': expand({
    y01: 3, y02: 3, y03: 3, y04: 3, y05: 2, y06: 2, y07: 3, y08: 3, y09: 3, y10: 3,
    n01: 3, n02: 3, n04: 3, n06: 3,
  }),
  '深淵の刻印（青）': expand({
    b01: 3, b02: 3, b03: 3, b04: 3, b05: 2, b06: 2, b07: 3, b08: 3, b09: 3, b10: 3,
    n01: 3, n02: 3, n04: 3, n06: 3,
  }),
  '大樹の咆哮（緑）': expand({
    g01: 3, g02: 3, g03: 3, g04: 3, g05: 2, g06: 2, g07: 3, g08: 3, g09: 3, g10: 3,
    n01: 3, n02: 3, n04: 3, n06: 3,
  }),
};

export const DECK_SIZE = 40;
export const MAX_COPIES = 3;

export function validateDeck(arr) {
  if (!Array.isArray(arr) || arr.length !== DECK_SIZE) return false;
  const counts = {};
  for (const id of arr) {
    if (!CARD_MAP[id]) return false;
    counts[id] = (counts[id] || 0) + 1;
    if (counts[id] > MAX_COPIES) return false;
  }
  return true;
}
