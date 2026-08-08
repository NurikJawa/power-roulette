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
  first.send(JSON.stringify({ type:'create', name:'Альфа', color:'#ff0000', appearance:{face:'visor',aura:'electric',accessory:'halo',pattern:'core'} }));
  const created = await next(first, 'room');
  second.send(JSON.stringify({ type:'join', code:created.code, name:'Бета', color:'#00ff00', appearance:{face:'bad-value',aura:'flame',accessory:'horns',pattern:'split'} }));
  const joined = await next(first, 'room');
  assert.equal(joined.players.length, 2);
  assert.deepEqual(joined.players[0].appearance,{face:'visor',aura:'electric',accessory:'halo',pattern:'core'});
  assert.deepEqual(joined.players[1].appearance,{face:'classic',aura:'flame',accessory:'horns',pattern:'split'});
  const profileUpdate = next(first, 'room');
  second.send(JSON.stringify({type:'profile',name:'Бета 2',color:'#112233',appearance:{face:'cyclops',aura:'shadow',accessory:'headband',pattern:'ring'}}));
  const updated = await profileUpdate;
  assert.equal(updated.players[1].name,'Бета 2');
  assert.equal(updated.players[1].appearance.face,'cyclops');
  const started = next(second, 'start');
  first.send(JSON.stringify({ type:'start', players:[] }));
  const startMessage=await started;
  assert.equal(startMessage.players.length, 2);
  assert.equal(startMessage.players[1].appearance.pattern,'ring');
  const ability = next(first, 'ability_request');
  second.send(JSON.stringify({ type:'ability_request' }));
  assert.equal((await ability).senderId, joined.players[1].id);
  const deathNote = next(first, 'death_note_request');
  second.send(JSON.stringify({ type:'death_note_request', targetId:0 }));
  assert.deepEqual(await deathNote, {type:'death_note_request',senderId:joined.players[1].id,targetId:0});
  const power = next(first, 'power_request');
  second.send(JSON.stringify({ type:'power_request', x:777, y:222 }));
  const aimedPower=await power;
  assert.deepEqual({senderId:aimedPower.senderId,x:aimedPower.x,y:aimedPower.y},{senderId:joined.players[1].id,x:777,y:222});
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
