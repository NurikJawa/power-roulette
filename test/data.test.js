const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = {};
require('../public/data.js');
const { UNIVERSES, UNIVERSAL_ROULETTES, PHASES } = window.POWER_DATA;

test('в каталоге 27 вселенных и присутствуют все заказанные', () => {
  assert.equal(UNIVERSES.length, 27);
  for (const id of ['jujutsu', 'gurren', 'eminence', 'attack-titan', 'bleach', 'death-note', 're-zero', 'evangelion', 'slime', 'ragnarok', 'parasyte', 'seven-deadly-sins']) {
    assert.ok(UNIVERSES.some(universe => universe.id === id), `Нет вселенной ${id}`);
  }
});

test('у каждой вселенной свои расы, пять сил и пять ультимейтов', () => {
  for (const universe of UNIVERSES) {
    assert.ok(universe.races.length >= 4, `${universe.name}: мало рас`);
    assert.equal(universe.powers.length, 5, `${universe.name}: должно быть пять сил`);
    assert.equal(new Set(universe.powers.map(power => power.id)).size, 5);
    assert.equal(universe.ultimates.length, 5, `${universe.name}: должно быть пять ультимейтов`);
    assert.equal(new Set(universe.ultimates.map(ultimate => ultimate.id)).size, 5, `${universe.name}: повторяются ультимейты`);
    assert.ok(universe.ultimates.every(ultimate => ultimate.cooldown >= 20), `${universe.name}: слишком короткий КД ульты`);
    assert.ok(universe.ultimates.every(ultimate => ultimate.type && ultimate.icon), `${universe.name}: ульта не доработана`);
    assert.ok(universe.battleStyle?.weapon && universe.battleStyle?.basic, `${universe.name}: нет личного оружия`);
  }
  assert.equal(new Set(UNIVERSES.flatMap(universe => universe.ultimates.map(ultimate => ultimate.id))).size, UNIVERSES.length * 5);
});

test('есть семь общих рулеток по пять результатов', () => {
  assert.equal(UNIVERSAL_ROULETTES.length, 7);
  assert.ok(UNIVERSAL_ROULETTES.every(roulette => roulette.options.length === 5));
  assert.equal(PHASES.length, 11);
  assert.equal(PHASES[3].id, 'ultimate');
  const heights = UNIVERSAL_ROULETTES.find(roulette => roulette.id === 'height').options;
  assert.ok(heights.every(option => !/15\s*метр/i.test(option.name)), 'Несбалансированный рост 15 метров не удалён');
});

test('все предметы имеют локальные PNG с ненулевым размером', () => {
  const files = [];
  for (const universe of UNIVERSES) {
    files.push(universe.icon, ...universe.ultimates.map(ultimate => ultimate.icon), ...universe.races.map(race => race.icon), ...universe.powers.map(power => power.icon));
  }
  for (const roulette of UNIVERSAL_ROULETTES) files.push(roulette.icon, ...roulette.options.map(option => option.icon));
  for (const file of new Set(files)) {
    const full = path.join(__dirname, '..', 'public', file);
    assert.ok(fs.existsSync(full), `Нет ${file}`);
    assert.ok(fs.statSync(full).size > 100, `Пустой ${file}`);
  }
});

test('расширение территории запирает ближайшую цель на пять секунд', () => {
  const domain = UNIVERSES.find(universe => universe.id === 'jujutsu').ultimates[0];
  assert.equal(domain.type, 'domain');
  assert.equal(domain.cage, true);
  assert.equal(domain.duration, 5);
  assert.equal(domain.damage, 15);
  assert.equal(domain.tickRate, .5);
});

test('новый фон арены установлен локально', () => {
  const arena = path.join(__dirname, '..', 'public', 'assets', 'arena-multiverse-v2.png');
  assert.ok(fs.existsSync(arena));
  assert.ok(fs.statSync(arena).size > 500000);
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

test('Тетрадь смерти использует ручной выбор и канонический таймер 40 секунд', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  assert.match(source, /function openDeathNote\(\)/);
  assert.match(source, /kind:"deathNote"/);
  assert.match(source, /at:b\.time\+40/);
  assert.match(source, /remaining>5/);
  assert.match(source, /deathNoteUsed/);
});
