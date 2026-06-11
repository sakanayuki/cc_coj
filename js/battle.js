// 対戦画面のUI制御

import { CARD_MAP, TYPE_NAMES, COLOR_NAMES } from './cards.js';
import { MAX_TRIGGER, MAX_FIELD, ROUND_LIMIT } from './engine.js';
import { cardEl } from './ui.js';

let dispatch = () => {};
let mySeat = 0;
let view = null;
let pendingEvolve = null; // 進化対象選択中の手札index

const $ = (id) => document.getElementById(id);

export function setup(d, seat) {
  dispatch = (action) => { closeMenu(); d(action); };
  mySeat = seat;
  pendingEvolve = null;
  view = null;
}

export function render(v) {
  view = v;
  closeMenu();
  if (pendingEvolve !== null && view.phase !== 'main') pendingEvolve = null;
  doRender();
}

function isMyMain() {
  return view.phase === 'main' && view.active === mySeat;
}
function isMyBlock() {
  return view.phase === 'block' && view.active !== mySeat;
}

function doRender() {
  if (!view) return;
  const me = view.players[mySeat];
  const opp = view.players[1 - mySeat];
  const myName = view.names[mySeat];
  const oppName = view.names[1 - mySeat];

  renderBar($('opp-info'), oppName, opp, view.active === 1 - mySeat);
  renderBar($('my-info'), myName, me, view.active === mySeat);

  $('opp-piles').innerHTML =
    `<span>手札 ${opp.hand.length}</span><span>山札 ${opp.deck}</span><span>捨札 ${opp.junk.length}</span>`;
  $('my-piles').innerHTML =
    `<span>山札 ${me.deck}</span><span>捨札 ${me.junk.length}</span>`;

  renderTrigger($('opp-trigger'), opp.trigger);
  renderTrigger($('my-trigger'), me.trigger);

  renderField($('opp-field'), opp, 1 - mySeat);
  renderField($('my-field'), me, mySeat);
  renderHand();
  renderBanner();
  renderLog();
  renderButtons();
  renderMulligan();
}

function renderBar(el, name, p, isActive) {
  el.innerHTML = `
    <span class="pb-name">${esc(name)}</span>
    <span class="pb-life">LIFE ${'♥'.repeat(Math.max(0, p.life))}${'♡'.repeat(Math.max(0, 7 - p.life))}</span>
    <span class="pb-cp">CP ${'●'.repeat(p.cp)}${'○'.repeat(Math.max(0, p.cpMax - p.cp))} ${p.cp}/${p.cpMax}</span>
    ${isActive ? '<span class="pb-turn">◀ TURN</span>' : ''}`;
}

function renderTrigger(el, zone) {
  el.innerHTML = '';
  for (const t of zone) {
    el.appendChild(cardEl(t));
  }
  for (let i = zone.length; i < MAX_TRIGGER; i++) {
    const slot = document.createElement('div');
    slot.className = 'trigger-slot';
    el.appendChild(slot);
  }
}

function renderField(el, p, seat) {
  el.innerHTML = '';
  const attackerUid = view.battle ? view.battle.aUid : null;
  for (const u of p.field) {
    const c = cardEl(u);
    c.dataset.uid = u.uid;
    if (attackerUid === u.uid && seat === view.active) c.classList.add('attacking');
    if (seat === mySeat) {
      if (isMyMain() && pendingEvolve === null && u.act && !u.sick) c.classList.add('attackable');
      if (isMyBlock() && u.act) c.classList.add('blockable');
      if (pendingEvolve !== null && CARD_MAP[u.id].type !== 'evo') c.classList.add('evo-target');
      c.addEventListener('click', (e) => { e.stopPropagation(); onMyUnitClick(u.uid); });
    } else {
      c.addEventListener('click', (e) => { e.stopPropagation(); openInfoMenu(u.id, u.lv); });
    }
    el.appendChild(c);
  }
}

function renderHand() {
  const el = $('my-hand');
  el.innerHTML = '';
  const me = view.players[mySeat];
  me.hand.forEach((h, idx) => {
    const c = cardEl(h);
    const card = CARD_MAP[h.id];
    if (isMyMain()) {
      const canPlay =
        (card.type === 'unit' && me.cp >= card.cost && me.field.length < MAX_FIELD) ||
        (card.type === 'evo' && me.cp >= card.cost && me.field.some(u => CARD_MAP[u.id].type !== 'evo')) ||
        ((card.type === 'trigger' || card.type === 'intercept') && me.trigger.length < MAX_TRIGGER);
      if (canPlay) c.classList.add('playable');
    }
    c.addEventListener('click', (e) => { e.stopPropagation(); openHandMenu(idx); });
    el.appendChild(c);
  });
}

function renderBanner() {
  const b = $('battle-banner');
  const round = `【ターン ${Math.min(ROUND_LIMIT, Math.ceil(view.turn / 2))}/${ROUND_LIMIT}】`;
  if (view.phase === 'over') {
    b.textContent = '対戦終了';
  } else if (pendingEvolve !== null) {
    b.textContent = '進化させるユニットを選択してください（Escでキャンセル）';
  } else if (view.phase === 'block') {
    if (isMyBlock()) {
      const atk = view.players[view.active].field.find(u => u.uid === view.battle.aUid);
      const name = atk ? CARD_MAP[atk.id].name : '敵ユニット';
      b.textContent = `相手の${name}がアタック！ ブロックするユニットを選ぶか「ブロックしない」を押してください`;
    } else {
      b.textContent = '相手がブロックを選択中…';
    }
  } else if (view.phase === 'mulligan') {
    b.textContent = '手札の引き直しを選択中…';
  } else if (isMyMain()) {
    b.textContent = `${round} あなたのターン：カードをプレイするか、ユニットでアタック！`;
  } else {
    b.textContent = `${round} 相手のターンです…`;
  }
}

function renderLog() {
  const el = $('battle-log');
  el.innerHTML = view.log
    .map((l, i) => `<div class="${i >= view.log.length - 3 ? 'log-new' : ''}">${esc(l)}</div>`)
    .join('');
  el.scrollTop = el.scrollHeight;
}

function renderButtons() {
  $('btn-end-turn').disabled = !isMyMain();
  $('btn-no-block').hidden = !isMyBlock();
  $('btn-surrender').disabled = view.phase === 'over';
}

function renderMulligan() {
  const ov = $('mulligan-ov');
  if (view.phase !== 'mulligan') {
    ov.hidden = true;
    return;
  }
  ov.hidden = false;
  const handEl = $('mulligan-hand');
  handEl.innerHTML = '';
  for (const h of view.players[mySeat].hand) {
    handEl.appendChild(cardEl(h));
  }
  const done = view.mull[mySeat];
  $('btn-mulligan').hidden = done;
  $('btn-keep').hidden = done;
  $('mulligan-wait').hidden = !done;
}

// ===== クリック操作 =====

function onMyUnitClick(uid) {
  const me = view.players[mySeat];
  const u = me.field.find(x => x.uid === uid);
  if (!u) return;

  if (pendingEvolve !== null) {
    if (CARD_MAP[u.id].type === 'evo') return;
    const hi = pendingEvolve;
    pendingEvolve = null;
    dispatch({ a: 'evolve', hand: hi, target: uid });
    return;
  }
  if (isMyBlock()) {
    if (u.act) dispatch({ a: 'block', uid });
    return;
  }
  // 自ターン: アタックメニュー
  const opts = [];
  if (isMyMain()) {
    opts.push({
      label: 'アタック',
      ok: u.act && !u.sick,
      fn: () => dispatch({ a: 'attack', uid }),
    });
  }
  showMenu(CARD_MAP[u.id], u.lv, opts);
}

function openHandMenu(idx) {
  const me = view.players[mySeat];
  const h = me.hand[idx];
  if (!h) return;
  const card = CARD_MAP[h.id];
  const opts = [];

  if (isMyMain()) {
    if (card.type === 'unit') {
      opts.push({
        label: `召喚する（CP${card.cost}）`,
        ok: me.cp >= card.cost && me.field.length < MAX_FIELD,
        fn: () => dispatch({ a: 'playUnit', hand: idx }),
      });
    }
    if (card.type === 'evo') {
      opts.push({
        label: `進化召喚する（CP${card.cost}）`,
        ok: me.cp >= card.cost && me.field.some(u => CARD_MAP[u.id].type !== 'evo'),
        fn: () => { pendingEvolve = idx; closeMenu(); doRender(); },
      });
    }
    if (card.type === 'trigger' || card.type === 'intercept') {
      opts.push({
        label: 'トリガーゾーンにセット',
        ok: me.trigger.length < MAX_TRIGGER,
        fn: () => dispatch({ a: 'setTrigger', hand: idx }),
      });
    }
    const j = me.hand.findIndex((x, i) => i !== idx && x.id === h.id);
    if (j >= 0) {
      opts.push({
        label: `オーバーライド（LV${Math.min(3, Math.max(h.lv, me.hand[j].lv) + 1)}へ）`,
        ok: Math.max(h.lv, me.hand[j].lv) < 3,
        fn: () => dispatch({ a: 'override', hand: idx, hand2: j }),
      });
    }
  }
  showMenu(card, h.lv, opts);
}

function openInfoMenu(cardId, lv) {
  showMenu(CARD_MAP[cardId], lv, []);
}

function showMenu(card, lv, opts) {
  const m = $('card-menu');
  m.innerHTML = '';
  const name = document.createElement('div');
  name.className = 'cm-name';
  name.textContent = `${card.name}（LV${lv}）`;
  const info = document.createElement('div');
  info.className = 'cm-info';
  info.textContent =
    `${COLOR_NAMES[card.color]} / ${TYPE_NAMES[card.type]} / コスト${card.cost}` +
    (card.bp !== undefined ? ` / BP${card.bp + 1000 * (lv - 1)}` : '');
  const text = document.createElement('div');
  text.className = 'cm-text';
  text.textContent = card.text;
  m.append(name, info, text);

  for (const o of opts) {
    const b = document.createElement('button');
    b.className = 'btn btn-primary';
    b.textContent = o.label;
    b.disabled = !o.ok;
    b.addEventListener('click', (e) => { e.stopPropagation(); o.fn(); });
    m.appendChild(b);
  }
  const cancel = document.createElement('button');
  cancel.className = 'btn';
  cancel.textContent = '閉じる';
  cancel.addEventListener('click', (e) => { e.stopPropagation(); closeMenu(); });
  m.appendChild(cancel);

  m.hidden = false;
  m.style.left = `calc(50% - 135px)`;
  m.style.bottom = `170px`;
}

function closeMenu() {
  $('card-menu').hidden = true;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// 画面共通のイベント（1回だけ登録）
export function initBattleScreen() {
  $('btn-end-turn').addEventListener('click', () => dispatch({ a: 'endTurn' }));
  $('btn-no-block').addEventListener('click', () => dispatch({ a: 'noBlock' }));
  $('btn-surrender').addEventListener('click', () => {
    if (confirm('投了しますか？')) dispatch({ a: 'surrender' });
  });
  $('btn-mulligan').addEventListener('click', () => dispatch({ a: 'mulligan' }));
  $('btn-keep').addEventListener('click', () => dispatch({ a: 'keep' }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      pendingEvolve = null;
      closeMenu();
      if (view) doRender();
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.card-menu')) closeMenu();
  });
}
