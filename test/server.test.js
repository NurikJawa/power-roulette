const test = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');

process.env.PORT = '31987';
const { server } = require('../server');

function openClient() {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket('ws://127.0.0.1:31987');
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

function next(socket, type) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Нет сообщения ${type}`)), 2500);
    const listener = raw => {
      const value = JSON.parse(raw);
      if (value.type !== type) return;
      clearTimeout(timer); socket.off('message', listener); resolve(value);
    };
    socket.on('message', listener);
  });
}

test('комната создаётся, второй игрок входит и получает старт', async () => {
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  const first = await openClient();
  const second = await openClient();
  first.send(JSON.stringify({ type:'create', name:'Альфа', color:'#ff0000' }));
  const created = await next(first, 'room');
  second.send(JSON.stringify({ type:'join', code:created.code, name:'Бета', color:'#00ff00' }));
  const joined = await next(first, 'room');
  assert.equal(joined.players.length, 2);
  const started = next(second, 'start');
  first.send(JSON.stringify({ type:'start', players:joined.players }));
  assert.equal((await started).players.length, 2);
  const ability = next(first, 'ability_request');
  second.send(JSON.stringify({ type:'ability_request' }));
  assert.equal((await ability).senderId, joined.players[1].id);
  const power = next(first, 'power_request');
  second.send(JSON.stringify({ type:'power_request' }));
  assert.equal((await power).senderId, joined.players[1].id);
  const feedback = next(second, 'power_feedback');
  first.send(JSON.stringify({ type:'power_feedback', targetId:joined.players[1].id, message:'Слишком далеко' }));
  assert.equal((await feedback).message, 'Слишком далеко');
  const attack = next(first, 'attack_request');
  second.send(JSON.stringify({ type:'attack_request', x:400, y:300 }));
  const attackMessage = await attack;
  assert.deepEqual({x:attackMessage.x,y:attackMessage.y},{x:400,y:300});
  first.close(); second.close();
});

test('десять игроков входят, одиннадцатый получает отказ', async () => {
  const clients = [await openClient()];
  clients[0].send(JSON.stringify({ type:'create', name:'Игрок 1', color:'#111111' }));
  let room = await next(clients[0], 'room');
  for (let index = 2; index <= 10; index += 1) {
    const client = await openClient();
    clients.push(client);
    const update = next(clients[0], 'room');
    client.send(JSON.stringify({ type:'join', code:room.code, name:`Игрок ${index}`, color:'#222222' }));
    room = await update;
  }
  assert.equal(room.players.length, 10);
  const extra = await openClient();
  const rejected = next(extra, 'error');
  extra.send(JSON.stringify({ type:'join', code:room.code, name:'Лишний', color:'#333333' }));
  assert.match((await rejected).message, /10 игроков/);
  extra.close(); clients.forEach(client => client.close());
});

test.after(() => new Promise(resolve => server.close(resolve)));
