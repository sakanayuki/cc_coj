// P2P通信（PeerJS / WebRTC）
// ホストが短いルームIDを発行し、相手はそのIDを入力して直接接続する。
// シグナリングにはPeerJSの公開クラウドブローカーを使用（GitHub Pagesで動作可能）。

const PREFIX = 'coj-clone-v1-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 紛らわしい文字を除外

let peer = null;
let conn = null;
let handlers = {};

function genCode(len = 6) {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

export function setHandlers(h) {
  handlers = h || {};
}

function wire(c) {
  c.on('open', () => handlers.open?.());
  c.on('data', (d) => handlers.data?.(d));
  c.on('close', () => handlers.close?.());
  c.on('error', (e) => handlers.error?.(e));
}

// ホスト: IDを発行して接続を待つ
export function hostRoom(onCode, retry = 0) {
  destroy();
  const code = genCode();
  peer = new Peer(PREFIX + code);
  peer.on('open', () => onCode(code));
  peer.on('connection', (c) => {
    if (conn) { c.close(); return; } // 1対1のみ
    conn = c;
    wire(c);
  });
  peer.on('error', (e) => {
    if (e.type === 'unavailable-id' && retry < 5) {
      hostRoom(onCode, retry + 1); // ID衝突時は再発行
    } else {
      handlers.error?.(e);
    }
  });
  peer.on('disconnected', () => {
    // ブローカーとの接続が切れても、確立済みのP2P接続は維持される
    try { peer.reconnect(); } catch { /* destroyed */ }
  });
}

// ゲスト: 相手のIDに接続する
export function joinRoom(code) {
  destroy();
  peer = new Peer();
  peer.on('open', () => {
    conn = peer.connect(PREFIX + code.trim().toUpperCase(), { reliable: true });
    wire(conn);
  });
  peer.on('error', (e) => handlers.error?.(e));
}

export function send(obj) {
  if (conn && conn.open) conn.send(obj);
}

export function isConnected() {
  return !!(conn && conn.open);
}

export function destroy() {
  try { peer?.destroy(); } catch { /* noop */ }
  peer = null;
  conn = null;
}
