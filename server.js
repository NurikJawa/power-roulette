"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { WebSocketServer, WebSocket } = require("ws");

const root = path.join(__dirname, "public");
const port = Number(process.env.PORT) || 3000;
const rooms = new Map();
const mime = {
  ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8", ".png":"image/png", ".ogg":"audio/ogg", ".md":"text/markdown; charset=utf-8"
};

function serve(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type":"application/json" }).end(JSON.stringify({ ok:true, rooms:rooms.size }));
    return;
  }
  const relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const file = path.resolve(root, relative);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) return res.writeHead(403).end("Forbidden");
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) return res.writeHead(404, { "content-type":"text/plain; charset=utf-8" }).end("Not found");
    res.writeHead(200, { "content-type":mime[path.extname(file).toLowerCase()] || "application/octet-stream", "cache-control":/\.(html|js|css)$/.test(file)?"no-cache":"public, max-age=86400" });
    fs.createReadStream(file).pipe(res);
  });
}

function cleanName(value) { return String(value || "Игрок").replace(/[<>]/g, "").trim().slice(0, 16) || "Игрок"; }
function cleanColor(value) { return /^#[0-9a-f]{6}$/i.test(value) ? value : "#d8ff45"; }
function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do { code = Array.from(crypto.randomBytes(5), byte => alphabet[byte % alphabet.length]).join(""); } while (rooms.has(code));
  return code;
}
function send(ws, payload) { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload)); }
function broadcast(room, payload, except = null) {
  const raw = JSON.stringify(payload);
  for (const client of room.clients.values()) {
    if (client.ws === except || client.ws.readyState !== WebSocket.OPEN) continue;
    // Battle frames are disposable: never build a seconds-long queue on a slower client.
    if (payload.type === "battle_state" && client.ws.bufferedAmount > 128 * 1024) continue;
    client.ws.send(raw);
  }
}
function roomState(room) {
  return { type:"room", code:room.code, hostId:room.hostId, started:room.started, players:[...room.clients.values()].map(client => client.player) };
}
function publish(room) { broadcast(room, roomState(room)); }
function leave(ws) {
  const room = rooms.get(ws.roomCode);
  if (!room) return;
  room.clients.delete(ws.clientId);
  ws.roomCode = null;
  if (!room.clients.size) return rooms.delete(room.code);
  if (room.hostId === ws.clientId) room.hostId = room.clients.keys().next().value;
  publish(room);
}

const server = http.createServer(serve);
const wss = new WebSocketServer({ server, maxPayload:512 * 1024 });
wss.on("connection", ws => {
  ws.clientId = crypto.randomUUID();
  ws.roomCode = null;
  send(ws, { type:"hello", clientId:ws.clientId });
  ws.on("message", raw => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }

    if (message.type === "create") {
      leave(ws);
      const code = makeCode();
      const room = { code, hostId:ws.clientId, started:false, clients:new Map() };
      ws.roomCode = code;
      room.clients.set(ws.clientId, { ws, player:{ id:ws.clientId, name:cleanName(message.name), color:cleanColor(message.color) } });
      rooms.set(code, room); publish(room); return;
    }
    if (message.type === "join") {
      leave(ws);
      const room = rooms.get(String(message.code || "").toUpperCase());
      if (!room) return send(ws, { type:"error", message:"Комната не найдена" });
      if (room.started) return send(ws, { type:"error", message:"Рулетка уже запущена" });
      if (room.clients.size >= 10) return send(ws, { type:"error", message:"В комнате уже 10 игроков" });
      ws.roomCode = room.code;
      room.clients.set(ws.clientId, { ws, player:{ id:ws.clientId, name:cleanName(message.name), color:cleanColor(message.color) } });
      publish(room); return;
    }

    const room = rooms.get(ws.roomCode);
    const client = room?.clients.get(ws.clientId);
    if (!room || !client) return;
    const isHost = room.hostId === ws.clientId;

    if (message.type === "profile" && !room.started) {
      client.player.name = cleanName(message.name); client.player.color = cleanColor(message.color); publish(room);
    } else if (message.type === "leave") {
      leave(ws); send(ws, { type:"left" });
    } else if (message.type === "start" && isHost && room.clients.size >= 2) {
      room.started = true; broadcast(room, { type:"start", players:message.players }); publish(room);
    } else if (message.type === "spin_request" && room.started) {
      send(room.clients.get(room.hostId)?.ws, { type:"spin_request", senderId:ws.clientId });
    } else if (message.type === "ability_request" && room.started) {
      send(room.clients.get(room.hostId)?.ws, { type:"ability_request", senderId:ws.clientId });
    } else if (message.type === "power_request" && room.started) {
      send(room.clients.get(room.hostId)?.ws, { type:"power_request", senderId:ws.clientId });
    } else if (message.type === "attack_request" && room.started) {
      const x=Math.max(0,Math.min(1100,Number(message.x)||0)),y=Math.max(0,Math.min(680,Number(message.y)||0));
      send(room.clients.get(room.hostId)?.ws, { type:"attack_request", senderId:ws.clientId, x, y });
    } else if (message.type === "power_feedback" && isHost && room.started) {
      send(room.clients.get(message.targetId)?.ws, { type:"power_feedback", message:String(message.message || "") });
    } else if (["spin_result","advance","battle_start","home"].includes(message.type) && isHost) {
      broadcast(room, message);
      if (message.type === "home") { room.started = false; publish(room); }
    } else if (message.type === "battle_state" && isHost && room.started) {
      broadcast(room, message, ws);
    } else if (message.type === "battle_end" && isHost && room.started) {
      broadcast(room, message, ws);
    }
  });
  ws.on("close", () => leave(ws));
  ws.on("error", () => {});
});

server.on("error", error => {
  if (error.code === "EADDRINUSE") console.error(`Порт ${port} занят. Открой уже запущенную игру или задай PORT.`);
  else console.error(error);
  process.exit(1);
});
server.listen(port, "0.0.0.0", () => console.log(`РУЛЕТКА СИЛЫ: http://localhost:${port}`));

module.exports = { server };
