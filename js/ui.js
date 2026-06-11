// 共通UIユーティリティ

import { CARD_MAP, TYPE_NAMES } from './cards.js?v=4';

export function show(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.toggle('active', s.id === 'screen-' + id);
  });
}

let toastTimer = null;
export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

// カードDOMを生成
// data: {hidden:true} | 手札カード{id,lv} | フィールドユニット{uid,id,lv,bp,dmg,act,sick}
export function cardEl(data, opts = {}) {
  const div = document.createElement('div');
  if (!data || data.hidden) {
    div.className = 'card back ' + (opts.cls || '');
    return div;
  }
  const card = CARD_MAP[data.id];
  const lv = data.lv || 1;
  div.className = `card ${card.color} ${opts.cls || ''}`;
  if (lv > 1) div.classList.add('lv' + lv);

  const isUnit = data.uid !== undefined;
  const hasBp = card.bp !== undefined;
  const bpMax = isUnit ? data.bp : (hasBp ? card.bp + 1000 * (lv - 1) : null);
  const bpCur = isUnit ? Math.max(0, data.bp - data.dmg) : bpMax;

  div.innerHTML = `
    <div class="c-cost">${card.cost}</div>
    <div class="c-type">${TYPE_NAMES[card.type]}</div>
    <div class="c-name">${card.name}</div>
    ${hasBp ? `<div class="c-bp">${bpCur}</div>` : ''}
    ${hasBp ? `<div class="c-lv">LV${lv}</div>` : ''}`;

  if (isUnit) {
    if (!data.act) div.classList.add('exhausted');
    else if (data.sick) div.classList.add('sick');
    if (data.dmg > 0) div.classList.add('damaged');
  }
  div.title = `${card.name}\n${card.text}`;
  return div;
}
