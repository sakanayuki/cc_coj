// アプリ全体の制御（画面遷移・マッチング・対戦の同期・リザルト）
//
// 対戦はホスト権威型:
//   ホスト(seat 0)がゲームエンジンを実行し、ゲスト(seat 1)はアクションを送信、
//   ホストが検証して全体の状態（相手の手札等は隠した形）を配信する。

import { validateDeck } from './cards.js';
import { createGame, applyAction, redact } from './engine.js';
import * as net from './net.js';
import * as storage from './storage.js';
import * as battle from './battle.js';
import { initDeckScreen, openDeckScreen } from './deck.js';
import { show, toast } from './ui.js';

const $ = (id) => document.getElementById(id);

const app = {
  seat: 0,
  role: null,      // 'host' | 'guest'
  master: null,    // ホストのみ保持する正式なゲーム状態
  view: null,      // 描画用（隠蔽済み）状態
  name: 'PLAYER',
  deck: null,
  inBattle: false,
  resultShown: false,
};

// ===== タイトル / 共通遷移 =====

$('btn-to-rules').addEventListener('click', () => show('rules'));
$('btn-to-deck').addEventListener('click', () => { openDeckScreen(); show('deck'); });
$('btn-to-match').addEventListener('click', () => { openMatchScreen(); show('match'); });

document.querySelectorAll('[data-back]').forEach(b =>
  b.addEventListener('click', () => { net.destroy(); show('title'); }));

initDeckScreen();
battle.initBattleScreen();

// ===== マッチング =====

function openMatchScreen() {
  $('match-name').value = storage.loadPlayerName();
  const sel = $('match-deck');
  sel.innerHTML = '';
  for (const name of Object.keys(storage.allDecks())) {
    const op = document.createElement('option');
    op.value = name;
    op.textContent = name;
    sel.appendChild(op);
  }
  $('room-code-wrap').hidden = true;
  setStatus('');
}

function setStatus(msg) {
  $('match-status').textContent = msg;
}

function prepare() {
  app.name = $('match-name').value.trim() || 'PLAYER';
  storage.savePlayerName(app.name);
  const deckName = $('match-deck').value;
  const decks = storage.allDecks();
  app.deck = decks[deckName];
  if (!validateDeck(app.deck)) {
    toast('40枚の正しいデッキを選択してください');
    return false;
  }
  app.master = null;
  app.view = null;
  app.inBattle = false;
  app.resultShown = false;
  net.setHandlers(netHandlers);
  return true;
}

$('btn-host').addEventListener('click', () => {
  if (!prepare()) return;
  app.role = 'host';
  app.seat = 0;
  setStatus('ID発行中…');
  net.hostRoom((code) => {
    $('room-code').textContent = code;
    $('room-code-wrap').hidden = false;
    setStatus('相手の接続を待っています… このIDを相手に伝えてください');
  });
});

$('btn-copy-code').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('room-code').textContent);
    toast('IDをコピーしました');
  } catch {
    toast('コピーできませんでした。手動でメモしてください');
  }
});

$('btn-join').addEventListener('click', () => {
  const code = $('join-code').value.trim().toUpperCase();
  if (code.length !== 6) { toast('6文字のIDを入力してください'); return; }
  if (!prepare()) return;
  app.role = 'guest';
  app.seat = 1;
  setStatus('接続中…');
  net.joinRoom(code);
});

// ===== 通信ハンドラ =====

const netHandlers = {
  open() {
    if (app.role === 'guest') {
      net.send({ type: 'hello', name: app.name, deck: app.deck });
      setStatus('接続しました。対戦データを待っています…');
    } else {
      setStatus('相手が接続しました。対戦を開始します…');
    }
  },

  data(d) {
    if (!d || typeof d !== 'object') return;
    switch (d.type) {
      case 'hello': // ホストのみ受信
        if (app.role !== 'host' || app.master) return;
        if (!validateDeck(d.deck)) {
          net.send({ type: 'reject' });
          setStatus('相手のデッキが不正なため対戦できません');
          return;
        }
        app.master = createGame(
          app.deck, d.deck,
          [app.name, String(d.name || 'GUEST').slice(0, 12)]
        );
        net.send({ type: 'start', state: redact(app.master, 1) });
        startBattle(redact(app.master, 0));
        break;

      case 'start': // ゲストのみ受信
        if (app.role !== 'guest') return;
        startBattle(d.state);
        break;

      case 'act': // ホストのみ受信
        if (app.role !== 'host' || !app.master) return;
        applyAction(app.master, 1, d.action);
        broadcast();
        break;

      case 'state': // ゲストのみ受信
        if (app.role !== 'guest') return;
        app.view = d.state;
        battle.render(app.view);
        checkOver();
        break;

      case 'reject':
        setStatus('デッキが不正と判定され、接続が拒否されました');
        net.destroy();
        break;
    }
  },

  close() {
    if (app.inBattle && app.view && app.view.winner === null) {
      showResultCustom(true, '相手との接続が切断されました');
    } else if (!app.inBattle) {
      setStatus('接続が切断されました');
    }
  },

  error(e) {
    const messages = {
      'peer-unavailable': 'そのIDの相手が見つかりません。IDを確認してください',
      'network': 'シグナリングサーバーに接続できません。回線を確認してください',
      'browser-incompatible': 'このブラウザはWebRTCに対応していません',
    };
    const msg = messages[e?.type] || `通信エラー: ${e?.type || e}`;
    if (app.inBattle) toast(msg);
    else setStatus(msg);
  },
};

// ===== 対戦制御 =====

function startBattle(initialView) {
  app.view = initialView;
  app.inBattle = true;
  app.resultShown = false;
  battle.setup(dispatch, app.seat);
  show('battle');
  battle.render(app.view);
}

function dispatch(action) {
  if (!app.inBattle) return;
  if (app.role === 'host') {
    applyAction(app.master, 0, action);
    broadcast();
  } else {
    net.send({ type: 'act', action });
  }
}

function broadcast() {
  net.send({ type: 'state', state: redact(app.master, 1) });
  app.view = redact(app.master, 0);
  battle.render(app.view);
  checkOver();
}

function checkOver() {
  if (app.view && app.view.phase === 'over' && !app.resultShown) {
    app.resultShown = true;
    setTimeout(showResult, 1500);
  }
}

// ===== リザルト =====

function showResult() {
  const v = app.view;
  const outcome = v.winner === app.seat ? 'win' : 'lose';
  fillResult(outcome, v.reason, [
    `経過ターン: ${Math.min(Math.ceil(v.turn / 2), 10)}`,
    `あなたの残りライフ: ${Math.max(0, v.players[app.seat].life)}`,
    `相手の残りライフ: ${Math.max(0, v.players[1 - app.seat].life)}`,
  ]);
}

function showResultCustom(win, reason) {
  app.resultShown = true;
  fillResult(win ? 'win' : 'lose', reason, []);
}

function fillResult(outcome, reason, stats) {
  app.inBattle = false;
  const title = $('result-title');
  title.textContent = { win: 'WIN', lose: 'LOSE', draw: 'DRAW' }[outcome];
  title.className = 'result-title ' + (outcome === 'draw' ? 'win' : outcome);
  $('result-reason').textContent = reason;
  $('result-stats').innerHTML = stats.map(s => `<div>${s}</div>`).join('');
  show('result');
}

$('btn-result-title').addEventListener('click', () => {
  net.destroy();
  app.master = null;
  app.view = null;
  app.inBattle = false;
  show('title');
});

// 対戦中のリロード/離脱を確認
window.addEventListener('beforeunload', (e) => {
  if (app.inBattle && app.view && app.view.winner === null) {
    e.preventDefault();
    e.returnValue = '';
  }
});
