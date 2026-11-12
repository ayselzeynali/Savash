// TABRIZ WORLD WebRTC signaling server.
// HTTPS/WSS must be terminated by the hosting platform or a trusted reverse proxy.
// Issue short-lived JWTs only from a trusted backend after checking order/shop ownership.
'use strict';
const http = require('node:http');
const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');

const PORT = Number(process.env.PORT || 8080);
const JWT_SECRET = process.env.CALL_JWT_SECRET;
const MAX_CALL_SECONDS = Number(process.env.MAX_CALL_SECONDS || 3600);
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('CALL_JWT_SECRET must be set to a random secret of at least 32 characters.');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, service: 'tabriz-world-voice-signaling' }));
  }
  res.writeHead(404); res.end('Not found');
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });

const rooms = new Map(); // roomId -> Map(role -> websocket)
function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}
function leave(ws) {
  const room = rooms.get(ws.roomId);
  if (!room) return;
  if (room.get(ws.role) === ws) room.delete(ws.role);
  for (const other of room.values()) send(other, { type: 'peer-left' });
  if (room.size === 0) rooms.delete(ws.roomId);
}
server.on('upgrade', (req, socket, head) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/signal') throw new Error('bad path');
    const token = url.searchParams.get('token');
    if (!token) throw new Error('missing token');
    const claims = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'], issuer: 'tabriz-world', audience: 'voice-call' });
    const roomId = String(claims.room_id || '');
    const role = String(claims.role || '');
    const userId = String(claims.sub || '');
    if (!/^[A-Za-z0-9_-]{6,100}$/.test(roomId) || !userId || !['buyer','seller'].includes(role)) throw new Error('invalid claims');
    wss.handleUpgrade(req, socket, head, ws => {
      ws.roomId = roomId; ws.role = role; ws.userId = userId;
      ws.callTimer = setTimeout(() => ws.close(4008, 'Call time limit reached'), MAX_CALL_SECONDS * 1000);
      wss.emit('connection', ws);
    });
  } catch {
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
    socket.destroy();
  }
});
wss.on('connection', ws => {
  let room = rooms.get(ws.roomId);
  if (!room) { room = new Map(); rooms.set(ws.roomId, room); }
  if (room.has(ws.role) || room.size >= 2) {
    ws.close(4009, 'Room is full'); return;
  }
  const other = [...room.values()][0];
  room.set(ws.role, ws);
  if (other) {
    send(other, { type: 'peer-joined' });
    send(ws, { type: 'peer-joined' });
  }
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { ws.close(4002, 'Invalid JSON'); return; }
    if (!msg || !['description','ice'].includes(msg.type)) { ws.close(4003, 'Unsupported message'); return; }
    const target = [...room.values()].find(client => client !== ws);
    if (!target) return;
    if (msg.type === 'description') {
      const d = msg.description;
      if (!d || !['offer','answer'].includes(d.type) || typeof d.sdp !== 'string' || d.sdp.length > 12000) return;
      send(target, { type: 'description', description: { type: d.type, sdp: d.sdp } });
    } else {
      const c = msg.candidate;
      if (!c || typeof c.candidate !== 'string' || c.candidate.length > 2048) return;
      send(target, { type: 'ice', candidate: c });
    }
  });
  ws.on('close', () => { clearTimeout(ws.callTimer); leave(ws); });
  ws.on('error', () => { clearTimeout(ws.callTimer); leave(ws); });
});
server.listen(PORT, '0.0.0.0', () => console.log('Voice signaling listening on port ' + PORT));
