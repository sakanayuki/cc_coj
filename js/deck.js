// デッキ構築画面

import { CARDS, CARD_MAP, DECK_SIZE, MAX_COPIES } from './cards.js?v=4';
import { cardEl, toast } from './ui.js?v=4';
import * as storage from './storage.js?v=4';

const $ = (id) => document.getElementById(id);
const COLOR_ORDER = { red: 0, yellow: 1, blue: 2, green: 3, none: 4 };

let cur = [];      // 現在編集中のデッキ（cardIdの配列）
let filter = 'all';

export function initDeckScreen() {
  $('deck-filters').addEventListener('click', (e) => {
    const b = e.target.closest('.filter-btn');
    if (!b) return;
    filter = b.dataset.color;
    document.querySelectorAll('.filter-btn').forEach(x =>
      x.classList.toggle('active', x === b));
    renderPool();
  });

  $('deck-select').addEventListener('change', () => {
    const name = $('deck-select').value;
    if (!name) return;
    const decks = storage.allDecks();
    if (decks[name]) {
      cur = decks[name].slice();
      $('deck-name').value = name.replace(/^★ /, '');
      renderAll();
    }
  });

  $('btn-deck-save').addEventListener('click', () => {
    const name = $('deck-name').value.trim();
    if (!name) { toast('デッキ名を入力してください'); return; }
    if (cur.length !== DECK_SIZE) {
      toast(`デッキは${DECK_SIZE}枚ちょうどにしてください（現在${cur.length}枚）`);
      return;
    }
    storage.saveDeck(name, cur.slice());
    refreshSelect(name);
    toast(`「${name}」を保存しました`);
  });

  $('btn-deck-clear').addEventListener('click', () => {
    cur = [];
    renderAll();
  });

  $('btn-deck-delete').addEventListener('click', () => {
    const name = $('deck-name').value.trim();
    const saved = storage.loadSavedDecks();
    if (!saved[name]) { toast('その名前の保存デッキはありません'); return; }
    if (!confirm(`「${name}」を削除しますか？`)) return;
    storage.deleteDeck(name);
    refreshSelect();
    toast('削除しました');
  });
}

export function openDeckScreen() {
  refreshSelect();
  renderAll();
}

function refreshSelect(selected) {
  const sel = $('deck-select');
  sel.innerHTML = '<option value="">― デッキを読み込む ―</option>';
  for (const name of Object.keys(storage.allDecks())) {
    const op = document.createElement('option');
    op.value = name;
    op.textContent = name;
    if (selected && name === selected) op.selected = true;
    sel.appendChild(op);
  }
}

function renderAll() {
  renderPool();
  renderList();
}

function countOf(id) {
  return cur.filter(x => x === id).length;
}

function renderPool() {
  const grid = $('pool-grid');
  grid.innerHTML = '';
  const cards = CARDS.filter(c => filter === 'all' || c.color === filter);
  for (const card of cards) {
    const wrap = document.createElement('div');
    wrap.className = 'pool-card-wrap';
    const c = cardEl({ id: card.id, lv: 1 });
    const n = countOf(card.id);
    if (n > 0) {
      const badge = document.createElement('div');
      badge.className = 'pool-count';
      badge.textContent = n;
      wrap.appendChild(badge);
    }
    wrap.prepend(c);
    wrap.addEventListener('click', () => addCard(card.id));
    grid.appendChild(wrap);
  }
}

function addCard(id) {
  if (cur.length >= DECK_SIZE) { toast(`デッキは${DECK_SIZE}枚までです`); return; }
  if (countOf(id) >= MAX_COPIES) { toast(`同名カードは${MAX_COPIES}枚までです`); return; }
  cur.push(id);
  renderAll();
}

function renderList() {
  const counter = $('deck-count');
  counter.textContent = `${cur.length} / ${DECK_SIZE}`;
  counter.classList.toggle('full', cur.length === DECK_SIZE);

  const list = $('deck-list');
  list.innerHTML = '';
  const counts = {};
  for (const id of cur) counts[id] = (counts[id] || 0) + 1;
  const ids = Object.keys(counts).sort((a, b) => {
    const ca = CARD_MAP[a], cb = CARD_MAP[b];
    return (COLOR_ORDER[ca.color] - COLOR_ORDER[cb.color]) ||
      (ca.cost - cb.cost) || a.localeCompare(b);
  });
  for (const id of ids) {
    const card = CARD_MAP[id];
    const row = document.createElement('div');
    row.className = `deck-row ${card.color}`;
    row.title = card.text;
    row.innerHTML = `
      <span class="dr-cost">${card.cost}</span>
      <span class="dr-name">${card.name}</span>
      <span class="dr-n">×${counts[id]}</span>`;
    row.addEventListener('click', () => {
      cur.splice(cur.indexOf(id), 1);
      renderAll();
    });
    list.appendChild(row);
  }
}
