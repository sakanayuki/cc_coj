// エンジンの簡易自動テスト: node test/engine.test.mjs
import { CARDS, CARD_MAP, PRESET_DECKS, validateDeck } from '../js/cards.js';
import { createGame, applyAction, redact, START_LIFE, MAX_CP } from '../js/engine.js';

let failures = 0;
function ok(cond, msg) {
  if (!cond) { failures++; console.error('  NG:', msg); }
  else console.log('  ok:', msg);
}

console.log('== カードデータ ==');
ok(CARDS.length >= 40, `カードプール ${CARDS.length}種`);
for (const [name, d] of Object.entries(PRESET_DECKS)) {
  ok(validateDeck(d), `プリセット「${name}」は40枚で正しい`);
}
for (const c of CARDS) {
  ok(c.id && c.name && c.type && c.color !== undefined && c.cost !== undefined,
    `カード${c.id}の必須項目`);
  if (c.type === 'unit' || c.type === 'evo') ok(c.bp > 0, `${c.id}のBP`);
  if (c.type === 'trigger' || c.type === 'intercept') ok(!!c.trig, `${c.id}のtrig定義`);
}

console.log('== ゲーム進行 ==');
const decks = Object.values(PRESET_DECKS);
const state = createGame(decks[0], decks[1], ['HOST', 'GUEST']);
ok(state.phase === 'mulligan', '開始時はマリガンフェイズ');
ok(state.players[0].hand.length === 4 && state.players[1].hand.length === 4, '初期手札4枚');
ok(state.players[0].life === START_LIFE, 'ライフ7');

applyAction(state, 0, { a: 'mulligan' });
ok(state.players[0].hand.length === 4, 'マリガン後も手札4枚');
ok(state.players[0].deck.length === 36, 'マリガン後の山札36枚');

applyAction(state, 0, { a: 'keep' });
ok(state.phase === 'mulligan', '片方確定では開始しない');
applyAction(state, 1, { a: 'keep' });
ok(state.phase === 'main' && state.active === 0 && state.turn === 1, '両者確定でターン1開始');
ok(state.players[0].cp === 2 && state.players[0].cpMax === 2, 'ターン1はCP2');
ok(state.players[0].hand.length === 6, 'ターン開始で2枚ドロー');

// 不正アクションの拒否
ok(applyAction(state, 1, { a: 'endTurn' }) === false, '非手番プレイヤーの操作は拒否');
ok(applyAction(state, 0, { a: 'playUnit', hand: 99 }) === false, '存在しない手札は拒否');

// ターン上限のライフ判定
console.log('== ターン上限ルール ==');
{
  const s = createGame(decks[0], decks[1], ['先攻', '後攻']);
  applyAction(s, 0, { a: 'keep' });
  applyAction(s, 1, { a: 'keep' });
  let guard = 0;
  while (s.phase !== 'over' && guard++ < 100) {
    applyAction(s, s.active, { a: 'endTurn' });
  }
  ok(s.phase === 'over', '両者が何もしなくても決着する');
  ok(s.turn === 21, '後攻の10ターン目終了時に判定（21ターン目開始で判定）');
  ok(s.winner === 1, 'ライフ同値なら後攻の勝ち');
}

// ランダムシミュレーション: 大量のランダム対戦でエラー・不変条件違反がないこと
console.log('== ランダムシミュレーション ==');
function randomAction(s, seat) {
  const p = s.players[seat];
  const acts = [];
  if (s.phase === 'mulligan') return { a: 'keep' };
  if (s.phase === 'block') {
    for (const u of p.field) if (u.act) acts.push({ a: 'block', uid: u.uid });
    acts.push({ a: 'noBlock' });
  } else if (s.phase === 'main' && s.active === seat) {
    p.hand.forEach((h, i) => {
      const c = CARD_MAP[h.id];
      if (c.type === 'unit') acts.push({ a: 'playUnit', hand: i });
      if (c.type === 'evo' && p.field.length) {
        acts.push({ a: 'evolve', hand: i, target: p.field[0].uid });
      }
      if (c.type === 'trigger' || c.type === 'intercept') acts.push({ a: 'setTrigger', hand: i });
      const j = p.hand.findIndex((x, k) => k !== i && x.id === h.id);
      if (j >= 0) acts.push({ a: 'override', hand: i, hand2: j });
    });
    for (const u of p.field) if (u.act && !u.sick) acts.push({ a: 'attack', uid: u.uid });
    acts.push({ a: 'endTurn' });
    acts.push({ a: 'endTurn' }); // endTurnの選択率を上げて無限ターン化を防ぐ
  }
  return acts[Math.floor(Math.random() * acts.length)];
}

function invariants(s, label) {
  for (const [i, p] of s.players.entries()) {
    if (p.hand.length > 7) throw new Error(`${label}: 手札上限超過`);
    if (p.field.length > 5) throw new Error(`${label}: フィールド上限超過`);
    if (p.trigger.length > 4) throw new Error(`${label}: トリガーゾーン上限超過`);
    if (p.cp < 0 || p.cp > MAX_CP) throw new Error(`${label}: CP範囲外 ${p.cp}`);
    for (const u of p.field) {
      if (u.dmg >= u.bp && u.bp > 0) throw new Error(`${label}: 破壊済ユニットが残存`);
    }
    // 総カード数の保存（フィールドのユニット＋手札＋山札＋捨札＋トリガー = 40）
    const total = p.hand.length + p.deck.length + p.junk.length +
      p.field.length + p.trigger.length;
    if (s.phase !== 'over' && total !== 40) {
      throw new Error(`${label}: seat${i} カード総数が${total}（40のはず）`);
    }
  }
}

let finished = 0;
const GAMES = 300;
for (let g = 0; g < GAMES; g++) {
  const d0 = decks[g % decks.length];
  const d1 = decks[(g + 1) % decks.length];
  const s = createGame(d0, d1, ['A', 'B']);
  let steps = 0;
  while (s.phase !== 'over' && steps < 3000) {
    steps++;
    const seat = s.phase === 'mulligan'
      ? (s.mull[0] ? 1 : 0)
      : (s.phase === 'block' ? 1 - s.active : s.active);
    const act = randomAction(s, seat);
    if (act) applyAction(s, seat, act);
    invariants(s, `game${g} step${steps}`);
  }
  if (s.phase === 'over') finished++;
  // 隠蔽処理の検証
  const r = redact(s, 1);
  if (typeof r.players[0].deck !== 'number') throw new Error('redact: 山札が隠れていない');
  if (r.players[0].hand.some(h => h.id)) throw new Error('redact: 相手の手札が見えている');
  if (r.players[1].hand.length !== s.players[1].hand.length) throw new Error('redact: 自分の手札が壊れた');
}
ok(finished === GAMES, `${GAMES}戦のランダム対戦が全て決着（${finished}/${GAMES}）`);

if (failures) {
  console.error(`\n${failures}件の失敗`);
  process.exit(1);
}
console.log('\n全テストOK');
