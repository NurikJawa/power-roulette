const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = {};
require('../public/data.js');
const { UNIVERSES, UNIVERSAL_ROULETTES, PHASES } = window.POWER_DATA;

test('в каталоге не меньше 15 вселенных и присутствуют заказанные', () => {
  assert.ok(UNIVERSES.length >= 15);
  for (const id of ['jujutsu', 'gurren', 'eminence', 'attack-titan', 'bleach']) {
    assert.ok(UNIVERSES.some(universe => universe.id === id), `Нет вселенной ${id}`);
  }
});

test('у каждой вселенной свои расы и ровно пять сил', () => {
  for (const universe of UNIVERSES) {
    assert.ok(universe.races.length >= 4, `${universe.name}: мало рас`);
    assert.equal(universe.powers.length, 5, `${universe.name}: должно быть пять сил`);
    assert.equal(new Set(universe.powers.map(power => power.id)).size, 5);
    assert.ok(universe.ultimate, `${universe.name}: нет активной ульты на F`);
    assert.ok(universe.ultimate.cooldown >= 20, `${universe.name}: слишком короткий КД ульты`);
    assert.ok(universe.ultimate.type, `${universe.name}: не задан тип ульты`);
  }
  assert.equal(new Set(UNIVERSES.map(universe => universe.ultimate.id)).size, UNIVERSES.length);
});

test('есть семь общих рулеток по пять результатов', () => {
  assert.equal(UNIVERSAL_ROULETTES.length, 7);
  assert.ok(UNIVERSAL_ROULETTES.every(roulette => roulette.options.length === 5));
  assert.equal(PHASES.length, 10);
  const heights = UNIVERSAL_ROULETTES.find(roulette => roulette.id === 'height').options;
  assert.ok(heights.every(option => !/15\s*метр/i.test(option.name)), 'Несбалансированный рост 15 метров не удалён');
});

test('все предметы имеют локальные PNG с ненулевым размером', () => {
  const files = [];
  for (const universe of UNIVERSES) {
    files.push(universe.icon, universe.ultimate.icon, ...universe.races.map(race => race.icon), ...universe.powers.map(power => power.icon));
  }
  for (const roulette of UNIVERSAL_ROULETTES) files.push(roulette.icon, ...roulette.options.map(option => option.icon));
  for (const file of new Set(files)) {
    const full = path.join(__dirname, '..', 'public', file);
    assert.ok(fs.existsSync(full), `Нет ${file}`);
    assert.ok(fs.statSync(full).size > 100, `Пустой ${file}`);
  }
});

test('баланс сил не допускает нулевого урона или мгновенного спама', () => {
  for (const power of UNIVERSES.flatMap(universe => universe.powers)) {
    assert.ok(power.damage >= 20 && power.damage <= 70, `${power.name}: урон вне диапазона`);
    assert.ok(power.cooldown >= 2.5, `${power.name}: слишком короткий КД`);
  }
});

test('локальный набор звуков способностей установлен полностью', () => {
  const directory = path.join(__dirname, '..', 'public', 'assets', 'sounds', 'abilities');
  const audio = fs.readdirSync(directory).filter(file => file.endsWith('.ogg'));
  assert.ok(audio.length >= 90, `Найдено только ${audio.length} звуков способностей`);
  for (const file of audio) assert.ok(fs.statSync(path.join(directory, file)).size > 500, `Пустой звук ${file}`);
  const music = path.join(__dirname, '..', 'public', 'assets', 'sounds', 'battle-music.ogg');
  assert.ok(fs.existsSync(music) && fs.statSync(music).size > 100000, 'Нет полноценной боевой музыки');
});
