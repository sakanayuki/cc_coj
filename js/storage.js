// デッキの保存・読込（localStorage）

import { PRESET_DECKS } from './cards.js';

const KEY_DECKS = 'cojclone_decks';
const KEY_NAME = 'cojclone_name';

export function loadSavedDecks() {
  try {
    return JSON.parse(localStorage.getItem(KEY_DECKS)) || {};
  } catch {
    return {};
  }
}

export function saveDeck(name, cards) {
  const decks = loadSavedDecks();
  decks[name] = cards;
  localStorage.setItem(KEY_DECKS, JSON.stringify(decks));
}

export function deleteDeck(name) {
  const decks = loadSavedDecks();
  delete decks[name];
  localStorage.setItem(KEY_DECKS, JSON.stringify(decks));
}

// プリセット＋保存済みデッキの一覧 { 表示名: [cardIds] }
export function allDecks() {
  const out = {};
  for (const [name, deck] of Object.entries(PRESET_DECKS)) {
    out['★ ' + name] = deck;
  }
  for (const [name, deck] of Object.entries(loadSavedDecks())) {
    out[name] = deck;
  }
  return out;
}

export function loadPlayerName() {
  return localStorage.getItem(KEY_NAME) || '';
}

export function savePlayerName(name) {
  localStorage.setItem(KEY_NAME, name);
}
