// ゲームルールエンジン（ホスト側で権威的に実行される）
//
// 再現しているCODE OF JOKER ver1.0の基本ルール:
// - ライフ7。0になったら敗北
// - CPは自分のターン開始時に全回復し、上限が1ずつ増える（初期ターン2、最大7）
// - 毎ターン2枚ドロー。手札上限7枚（超過分は捨札へ）
// - フィールドは最大5体、トリガーゾーンは最大4枚
// - ユニットは召喚したターンはアタック不可（スピードムーブ/進化は可）。ブロックは可
// - 行動権: アタック/ブロックで消費、自分のターン開始時に回復
// - 戦闘はBP比較。負けた方は破壊、同値は相打ち。勝者はLVアップ(+1000/最大LV3)し
//   BPダメージが回復。LV3到達時は行動権も回復
// - ブロックされなかったアタックは相手ライフに1ダメージ
// - オーバーライド: 手札の同名カードを重ねるとLVアップし、1枚ドロー
// - 進化ユニット: 自分のユニットに重ねて召喚。行動権を引き継ぎ、出たターンに攻撃可
// - マリガン: 対戦開始時、手札を何度でも引き直し可能（両者確定で開始）

import { CARD_MAP } from './cards.js';

export const MAX_FIELD = 5;
export const MAX_TRIGGER = 4;
export const MAX_HAND = 7;
export const MAX_CP = 7;
export const START_LIFE = 7;
export const START_HAND = 4;
// 各プレイヤー10ターンずつ。後攻が10ターン目を終えたらライフが少ない方が敗北
// （ライフ同値の場合は後攻の勝ち）
export const ROUND_LIMIT = 10;

let uidSeq = 1;

const C = (id) => CARD_MAP[id];

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pushLog(state, msg) {
  state.log.push(msg);
  if (state.log.length > 80) state.log.shift();
}

function mkPlayer(deck) {
  return {
    life: START_LIFE, cpMax: 1, cp: 0,
    deck: shuffle(deck.slice()),
    hand: [], field: [], trigger: [], junk: [],
  };
}

export function createGame(deck0, deck1, names) {
  uidSeq = 1;
  const state = {
    phase: 'mulligan', // 'mulligan' | 'main' | 'block' | 'over'
    turn: 0,
    active: 0,
    winner: null,
    reason: '',
    battle: null,
    mull: [false, false],
    names,
    log: [],
    players: [mkPlayer(deck0), mkPlayer(deck1)],
  };
  drawN(state, 0, START_HAND, true);
  drawN(state, 1, START_HAND, true);
  pushLog(state, '対戦開始！ 手札を確認してください（何度でも引き直せます）');
  return state;
}

function drawN(state, seat, n, silent) {
  const p = state.players[seat];
  for (let i = 0; i < n; i++) {
    if (p.deck.length === 0) {
      pushLog(state, `${state.names[seat]}の山札が切れた（ドローできない）`);
      break;
    }
    const id = p.deck.pop();
    if (p.hand.length >= MAX_HAND) {
      p.junk.push(id);
      pushLog(state, `${state.names[seat]}は手札上限のため${C(id).name}を捨札にした`);
    } else {
      p.hand.push({ id, lv: 1 });
    }
  }
  if (!silent && n > 0) pushLog(state, `${state.names[seat]}はカードを引いた`);
}

function findUnit(state, seat, uid) {
  return state.players[seat].field.find(u => u.uid === uid) || null;
}

function effBp(u) {
  return Math.max(0, u.bp - u.dmg);
}

// ===== 効果オペレーション =====

function targets(state, seat, t, ctx) {
  const enemy = state.players[1 - seat].field;
  const ally = state.players[seat].field;
  switch (t) {
    case 'enemyAll': return enemy.slice().map(u => [1 - seat, u]);
    case 'enemyRandom': return enemy.length ? [[1 - seat, pick(enemy)]] : [];
    case 'enemyStrongest': {
      if (!enemy.length) return [];
      const u = enemy.reduce((a, b) => (effBp(b) > effBp(a) ? b : a));
      return [[1 - seat, u]];
    }
    case 'enemyWeakest': {
      if (!enemy.length) return [];
      const u = enemy.reduce((a, b) => (effBp(b) < effBp(a) ? b : a));
      return [[1 - seat, u]];
    }
    case 'allyAll': return ally.slice().map(u => [seat, u]);
    case 'self': return ctx.unit ? [[seat, ctx.unit]] : [];
    case 'ctxUnit': return ctx.unit ? [[ctx.unitSeat, ctx.unit]] : [];
    case 'attacker': return ctx.attacker ? [[ctx.attackerSeat, ctx.attacker]] : [];
    default: return [];
  }
}

function exec(state, seat, ops, ctx) {
  const p = state.players[seat];
  const o = state.players[1 - seat];
  for (const op of ops) {
    if (state.phase === 'over') return;
    switch (op.op) {
      case 'damage':
        for (const [ts, u] of targets(state, seat, op.t, ctx)) {
          damageUnit(state, ts, u, op.n);
        }
        break;
      case 'destroy':
        for (const [ts, u] of targets(state, seat, op.t, ctx)) {
          destroyUnit(state, ts, u);
        }
        break;
      case 'debuff':
        for (const [ts, u] of targets(state, seat, op.t, ctx)) {
          u.bp = Math.max(0, u.bp - op.n);
          pushLog(state, `${C(u.id).name}のBPが${op.n}下がった`);
          if (effBp(u) <= 0) destroyUnit(state, ts, u);
        }
        break;
      case 'buff':
        for (const [, u] of targets(state, seat, op.t, ctx)) {
          u.bp += op.n;
          pushLog(state, `${C(u.id).name}のBPが${op.n}上がった`);
        }
        break;
      case 'heal':
        for (const [, u] of targets(state, seat, op.t, ctx)) u.dmg = 0;
        break;
      case 'exhaust':
        for (const [, u] of targets(state, seat, op.t, ctx)) {
          u.act = false;
          pushLog(state, `${C(u.id).name}の行動権が消費された`);
        }
        break;
      case 'draw':
        drawN(state, seat, op.n);
        break;
      case 'cp':
        p.cp = Math.min(MAX_CP, p.cp + op.n);
        pushLog(state, `${state.names[seat]}はCPを${op.n}得た`);
        break;
      case 'handDes': {
        for (let i = 0; i < op.n && o.hand.length; i++) {
          const idx = Math.floor(Math.random() * o.hand.length);
          const [h] = o.hand.splice(idx, 1);
          o.junk.push(h.id);
          pushLog(state, `${state.names[1 - seat]}の手札から${C(h.id).name}が捨てられた`);
        }
        break;
      }
      case 'salvage': {
        for (let i = 0; i < op.n && p.junk.length && p.hand.length < MAX_HAND; i++) {
          const idx = Math.floor(Math.random() * p.junk.length);
          const [id] = p.junk.splice(idx, 1);
          p.hand.push({ id, lv: 1 });
          pushLog(state, `${state.names[seat]}は捨札から${C(id).name}を回収した`);
        }
        break;
      }
      case 'battleBuff':
        if (state.battle && ctx.side) {
          state.battle[ctx.side === 'a' ? 'abuff' : 'bbuff'] += op.n;
        }
        break;
      case 'battleDebuff':
        if (state.battle && ctx.side) {
          state.battle[ctx.side === 'a' ? 'bbuff' : 'abuff'] -= op.n;
        }
        break;
      case 'destroyAttacker':
        if (ctx.attacker && effBp(ctx.attacker) <= op.max) {
          destroyUnit(state, ctx.attackerSeat, ctx.attacker);
        }
        break;
    }
  }
}

function damageUnit(state, ownerSeat, u, n) {
  if (!findUnit(state, ownerSeat, u.uid)) return;
  u.dmg += n;
  pushLog(state, `${C(u.id).name}に${n}ダメージ（BP ${effBp(u)}）`);
  if (u.dmg >= u.bp) destroyUnit(state, ownerSeat, u);
}

function destroyUnit(state, seat, u) {
  const p = state.players[seat];
  const idx = p.field.findIndex(x => x.uid === u.uid);
  if (idx < 0) return;
  p.field.splice(idx, 1);
  p.junk.push(u.id);
  pushLog(state, `${state.names[seat]}の${C(u.id).name}が破壊された`);
  const card = C(u.id);
  if (card.death) exec(state, seat, card.death, { unit: u, unitSeat: seat });
  fireTriggers(state, seat, 'allyDeath', { unit: u, unitSeat: seat });
}

// トリガー/インターセプトの自動発動
// （簡略化: 条件を満たしCPが足りる場合は自動で発動する）
function fireTriggers(state, seat, when, ctx) {
  const p = state.players[seat];
  for (const t of p.trigger.slice()) {
    if (state.phase === 'over') return;
    const card = C(t.id);
    if (!card.trig || card.trig.when !== when) continue;
    const cost = card.type === 'intercept' ? card.cost : 0;
    if (p.cp < cost) continue;
    const i = p.trigger.indexOf(t);
    if (i < 0) continue;
    p.trigger.splice(i, 1);
    p.junk.push(t.id);
    p.cp -= cost;
    pushLog(state, `${state.names[seat]}の${card.name}が発動！`);
    exec(state, seat, card.trig.ops, ctx);
  }
}

function dealLife(state, seat, n) {
  const p = state.players[seat];
  p.life -= n;
  pushLog(state, `${state.names[seat]}のライフに${n}ダメージ！（残り${Math.max(0, p.life)}）`);
  if (p.life <= 0) {
    end(state, 1 - seat, 'ライフが0になった');
    return;
  }
  fireTriggers(state, seat, 'lifeDamage', {});
}

function end(state, winnerSeat, reason) {
  state.phase = 'over';
  state.winner = winnerSeat;
  state.reason = reason;
  state.battle = null;
  pushLog(state, `${state.names[winnerSeat]}の勝利！（${reason}）`);
}

function startTurn(state, seat) {
  state.active = seat;
  state.turn++;
  // 後攻（seat1）が10ターン目を終えた時点でライフ判定
  if (state.turn > ROUND_LIMIT * 2) {
    const [l0, l1] = [state.players[0].life, state.players[1].life];
    if (l0 === l1) {
      end(state, 1, `ターン上限（${ROUND_LIMIT}）到達・ライフ同値のため後攻の勝ち`);
    } else {
      end(state, l0 > l1 ? 0 : 1, `ターン上限（${ROUND_LIMIT}）到達・ライフが少ない方の敗北`);
    }
    return;
  }
  state.phase = 'main';
  state.battle = null;
  const p = state.players[seat];
  p.cpMax = Math.min(MAX_CP, p.cpMax + 1);
  p.cp = p.cpMax;
  for (const u of p.field) {
    u.act = true;
    u.sick = false;
  }
  pushLog(state, `―― ターン${Math.ceil(state.turn / 2)}/${ROUND_LIMIT}: ${state.names[seat]}のターン ――`);
  drawN(state, seat, 2);
  fireTriggers(state, seat, 'turnStart', {});
}

function summonUnit(state, seat, card, lv, replaceIdx, inheritAct) {
  const p = state.players[seat];
  const u = {
    uid: uidSeq++,
    id: card.id,
    lv,
    bp: card.bp + 1000 * (lv - 1),
    dmg: 0,
    act: inheritAct !== undefined ? inheritAct : true,
    sick: card.type === 'evo' ? false : !(card.kw || []).includes('speedmove'),
  };
  if (replaceIdx !== undefined) p.field[replaceIdx] = u;
  else p.field.push(u);
  pushLog(state, `${state.names[seat]}が${card.name}を召喚（LV${lv} / BP${u.bp}）`);
  if (card.summon) exec(state, seat, card.summon, { unit: u, unitSeat: seat });
  fireTriggers(state, seat, 'allySummon', { unit: u, unitSeat: seat });
  fireTriggers(state, 1 - seat, 'enemySummon', { unit: u, unitSeat: seat });
  return u;
}

function resolveBattle(state, blockerUid) {
  const atkSeat = state.active;
  const defSeat = 1 - atkSeat;
  const A = findUnit(state, atkSeat, state.battle.aUid);
  const endBattle = () => {
    state.battle = null;
    if (state.phase !== 'over') state.phase = 'main';
  };
  if (!A) { endBattle(); return; }

  state.battle.abuff = 0;
  state.battle.bbuff = 0;

  // 防御側の「敵アタック時」インターセプト
  fireTriggers(state, defSeat, 'enemyAttack', {
    attacker: A, attackerSeat: atkSeat, side: 'b',
  });
  if (!findUnit(state, atkSeat, A.uid) || state.phase === 'over') { endBattle(); return; }

  const B = blockerUid != null ? findUnit(state, defSeat, blockerUid) : null;

  if (!B) {
    pushLog(state, `${C(A.id).name}のアタックは通った！`);
    dealLife(state, defSeat, 1);
    endBattle();
    return;
  }

  B.act = false;
  pushLog(state, `${state.names[defSeat]}は${C(B.id).name}でブロック！`);

  // 戦闘時インターセプト（攻撃側→防御側の順で自動発動）
  fireTriggers(state, atkSeat, 'battleAlly', { unit: A, unitSeat: atkSeat, side: 'a' });
  fireTriggers(state, defSeat, 'battleAlly', { unit: B, unitSeat: defSeat, side: 'b' });

  const aAlive = findUnit(state, atkSeat, A.uid);
  const bAlive = findUnit(state, defSeat, B.uid);
  if (!aAlive || !bAlive || state.phase === 'over') { endBattle(); return; }

  const effA = effBp(A) + state.battle.abuff;
  const effB = effBp(B) + state.battle.bbuff;
  pushLog(state, `戦闘！ ${C(A.id).name}(BP${Math.max(0, effA)}) vs ${C(B.id).name}(BP${Math.max(0, effB)})`);

  if (effA === effB) {
    pushLog(state, '相打ち！');
    destroyUnit(state, atkSeat, A);
    destroyUnit(state, defSeat, B);
  } else {
    const aWins = effA > effB;
    const winner = aWins ? A : B;
    const winnerSeat = aWins ? atkSeat : defSeat;
    const loser = aWins ? B : A;
    const loserSeat = aWins ? defSeat : atkSeat;
    destroyUnit(state, loserSeat, loser);
    if (findUnit(state, winnerSeat, winner.uid)) {
      winnerLvUp(state, winner);
      if (aWins && (C(A.id).kw || []).includes('penetrate') && state.phase !== 'over') {
        pushLog(state, `${C(A.id).name}の【貫通】！`);
        dealLife(state, defSeat, 1);
      }
    }
  }
  endBattle();
}

function winnerLvUp(state, u) {
  if (u.lv < 3) {
    u.lv++;
    u.bp += 1000;
    pushLog(state, `${C(u.id).name}が戦闘に勝利しLV${u.lv}に！（BP${u.bp}）`);
    if (u.lv === 3) {
      u.act = true;
      pushLog(state, `${C(u.id).name}はLV3到達で行動権が回復！`);
    }
  } else {
    pushLog(state, `${C(u.id).name}が戦闘に勝利！`);
  }
  u.dmg = 0; // 勝利したユニットはBPが回復する
}

// ===== アクション適用 =====
// 戻り値: true=適用成功 / false=不正・無視
export function applyAction(state, seat, act) {
  if (!act || state.phase === 'over') return false;
  const p = state.players[seat];

  if (act.a === 'surrender') {
    end(state, 1 - seat, `${state.names[seat]}が投了`);
    return true;
  }

  if (state.phase === 'mulligan') {
    if (act.a === 'mulligan' && !state.mull[seat]) {
      p.deck.push(...p.hand.map(h => h.id));
      p.hand = [];
      shuffle(p.deck);
      drawN(state, seat, START_HAND, true);
      return true;
    }
    if (act.a === 'keep' && !state.mull[seat]) {
      state.mull[seat] = true;
      pushLog(state, `${state.names[seat]}は手札を確定した`);
      if (state.mull[0] && state.mull[1]) startTurn(state, 0);
      return true;
    }
    return false;
  }

  if (state.phase === 'main' && seat === state.active) {
    switch (act.a) {
      case 'playUnit': {
        const h = p.hand[act.hand];
        if (!h) return false;
        const card = C(h.id);
        if (card.type !== 'unit') return false;
        if (p.cp < card.cost || p.field.length >= MAX_FIELD) return false;
        p.cp -= card.cost;
        p.hand.splice(act.hand, 1);
        summonUnit(state, seat, card, h.lv);
        return true;
      }
      case 'evolve': {
        const h = p.hand[act.hand];
        if (!h) return false;
        const card = C(h.id);
        if (card.type !== 'evo') return false;
        const idx = p.field.findIndex(u => u.uid === act.target);
        if (idx < 0 || p.cp < card.cost) return false;
        const base = p.field[idx];
        if (C(base.id).type === 'evo') return false; // 進化の上に進化は不可
        p.cp -= card.cost;
        p.hand.splice(act.hand, 1);
        p.junk.push(base.id);
        pushLog(state, `${C(base.id).name}が進化！`);
        summonUnit(state, seat, card, h.lv, idx, base.act);
        return true;
      }
      case 'setTrigger': {
        const h = p.hand[act.hand];
        if (!h) return false;
        const card = C(h.id);
        if (card.type !== 'trigger' && card.type !== 'intercept') return false;
        if (p.trigger.length >= MAX_TRIGGER) return false;
        p.hand.splice(act.hand, 1);
        p.trigger.push({ id: h.id });
        pushLog(state, `${state.names[seat]}がカードをトリガーゾーンにセットした`);
        return true;
      }
      case 'override': {
        const h1 = p.hand[act.hand];
        const h2 = p.hand[act.hand2];
        if (!h1 || !h2 || act.hand === act.hand2) return false;
        if (h1.id !== h2.id) return false;
        if (Math.max(h1.lv, h2.lv) >= 3) return false;
        h1.lv = Math.min(3, Math.max(h1.lv, h2.lv) + 1);
        p.hand.splice(act.hand2, 1);
        p.junk.push(h2.id);
        pushLog(state, `${state.names[seat]}が${C(h1.id).name}をオーバーライド！（LV${h1.lv}）`);
        drawN(state, seat, 1);
        return true;
      }
      case 'attack': {
        const u = findUnit(state, seat, act.uid);
        if (!u || !u.act || u.sick) return false;
        u.act = false;
        state.battle = { aUid: u.uid, abuff: 0, bbuff: 0 };
        pushLog(state, `${state.names[seat]}の${C(u.id).name}がアタック！`);
        const defenders = state.players[1 - seat].field.filter(x => x.act);
        if (defenders.length === 0) {
          resolveBattle(state, null);
        } else {
          state.phase = 'block';
        }
        return true;
      }
      case 'endTurn':
        pushLog(state, `${state.names[seat]}はターンを終了した`);
        startTurn(state, 1 - seat);
        return true;
    }
    return false;
  }

  if (state.phase === 'block' && seat === 1 - state.active) {
    if (act.a === 'block') {
      const u = findUnit(state, seat, act.uid);
      if (!u || !u.act) return false;
      resolveBattle(state, u.uid);
      return true;
    }
    if (act.a === 'noBlock') {
      resolveBattle(state, null);
      return true;
    }
    return false;
  }

  return false;
}

// 相手に見せない情報を隠した状態を作る（手札・伏せカード・山札の中身）
export function redact(state, forSeat) {
  const s = structuredClone(state);
  s.players.forEach((p, i) => {
    p.deck = p.deck.length;
    if (i !== forSeat) {
      p.hand = p.hand.map(() => ({ hidden: true }));
      p.trigger = p.trigger.map(() => ({ hidden: true }));
    }
  });
  return s;
}
