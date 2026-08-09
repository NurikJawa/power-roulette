const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = {};
require('../public/data.js');
const { UNIVERSES, UNIVERSAL_ROULETTES, PHASES } = window.POWER_DATA;

test('в каталоге 33 вселенные и присутствуют все заказанные', () => {
  assert.equal(UNIVERSES.length, 33);
  for (const id of ['jujutsu', 'gurren', 'eminence', 'attack-titan', 'bleach', 'death-note', 're-zero', 'evangelion', 'slime', 'ragnarok', 'parasyte', 'seven-deadly-sins', 'overlord', 'misfit', 'hellsing', 'gachiakuta', 'frieren', 'fate']) {
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

test('у всех 33 вселенных уникальный ЛКМ и настоящий профиль хитбокса', () => {
  const attacks = UNIVERSES.map(universe => universe.battleStyle?.attack);
  assert.ok(attacks.every(Boolean), 'Не у всех вселенных задан ЛКМ');
  assert.equal(new Set(attacks.map(attack => attack.visual)).size, UNIVERSES.length, 'Повторяются визуальные эффекты ЛКМ');
  assert.deepEqual([...new Set(attacks.map(attack => attack.shape))].sort(), ['burst', 'cone', 'line']);
  for (const [index, attack] of attacks.entries()) {
    assert.ok(attack.reach >= 110 && attack.reach <= 230, `${UNIVERSES[index].name}: дальность ЛКМ вне баланса`);
    assert.ok(attack.size > 0 && attack.recovery >= .55, `${UNIVERSES[index].name}: сломан хитбокс ЛКМ`);
    assert.ok(attack.damage >= .9 && attack.damage <= 1.1, `${UNIVERSES[index].name}: множитель ЛКМ вне баланса`);
  }
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  assert.match(source, /function basicHitTest\(/);
  assert.match(source, /type:"basicStrike"/);
  assert.match(source, /type:power\.basicVisual\?"basicHit":"hit"/);
});

test('есть семь общих рулеток по пять результатов', () => {
  assert.equal(UNIVERSAL_ROULETTES.length, 7);
  assert.ok(UNIVERSAL_ROULETTES.every(roulette => roulette.options.length === 5));
  assert.equal(PHASES.length, 11);
  assert.equal(PHASES[3].id, 'ultimate');
  const heights = UNIVERSAL_ROULETTES.find(roulette => roulette.id === 'height').options;
  assert.ok(heights.every(option => !/15\s*метр/i.test(option.name)), 'Несбалансированный рост 15 метров не удалён');
});

test('редкость общих характеристик зависит от пользы, а не от шанса выпадения', () => {
  const option = (rouletteId, optionId) => UNIVERSAL_ROULETTES.find(roulette => roulette.id === rouletteId).options.find(item => item.id === optionId);
  for (const [rouletteId, optionId] of [['strength', 'weak'], ['iq', 'instinct'], ['speed', 'slow'], ['durability', 'glass'], ['combat', 'rookie'], ['luck', 'cursed']]) {
    assert.equal(option(rouletteId, optionId).rarity, 'common', `${rouletteId}/${optionId} ошибочно считается редким`);
  }
  for (const [rouletteId, optionId] of [['strength', 'cosmic'], ['iq', 'omniscient'], ['speed', 'instant'], ['durability', 'absolute'], ['combat', 'war-god'], ['luck', 'plot-armor']]) {
    assert.equal(option(rouletteId, optionId).rarity, 'legendary', `${rouletteId}/${optionId} должен быть легендарным`);
  }
  assert.equal(option('height', 'tiny').rarity, 'rare', 'Маленькая цель имеет сильный бонус к уклонению, но не должна быть эпической');
  assert.ok(UNIVERSAL_ROULETTES.flatMap(roulette => roulette.options).every(item => ['common', 'rare', 'epic', 'legendary'].includes(item.rarity)));
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
  const deathNote = UNIVERSES.find(item => item.id === 'death-note');
  assert.equal(deathNote.ultimates.length, 5);
  assert.equal(deathNote.ultimates.filter(item => item.manualDeathNote).length, 1);
  assert.equal(deathNote.ultimates.find(item => item.manualDeathNote).name, 'ПРИГОВОР СМЕРТИ');
  assert.match(source, /function openDeathNote\(\)/);
  assert.match(source, /function isDeathNoteVerdict\(fighter\)/);
  assert.match(source, /kind:"deathNote"/);
  assert.match(source, /at:b\.time\+40/);
  assert.match(source, /remaining>5/);
  assert.match(source, /deathNoteUsed/);
  assert.doesNotMatch(source, /if\(fighter\.universe\.id==="death-note"\)return openDeathNote/);
});

test('большая комната ограничивает рендер, звук и сетевую нагрузку', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(source, /function crowdedBattle\(\)/);
  assert.match(source, /function battleRenderInterval\(host=false\)/);
  assert.match(source, /syncInterval=crowdedBattle\(\)\?180:150/);
  assert.match(source, /projectiles:b\.projectiles\.slice\(-48\)/);
  assert.match(source, /effects:b\.effects\.slice\(crowdedBattle\(\)\?-24:-32\)/);
  assert.doesNotMatch(source, /blood:b\.blood/);
  assert.match(source, /frameInterval=battleRenderInterval\(false\)/);
  assert.match(source, /maxChannels=limit\+\(priority\?4:0\)/);
  assert.match(source, /impactGap=crowdedBattle\(\)\?75:42/);
  assert.match(source, /fighter\.lastBasic=b\.time;send\(\{type:"attack_request",x,y\}\)/);
  assert.match(server, /bufferedAmount > 32 \* 1024/);
  assert.match(server, /raw\.length>96\*1024/);
  assert.match(server, /function allowAction\(client,key,gap\)/);
  assert.match(server, /broadcast\(room, message, ws, raw\)/);
});

test('способность E удерживается для прицела и отправляет сетевые координаты', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  assert.match(source, /function startPowerAim\(\)/);
  assert.match(source, /function drawPowerPreview\(\)/);
  assert.match(source, /send\(\{type:"power_request",x,y\}\)/);
  assert.match(source, /event\.code==="KeyE"/);
  assert.match(source, /releasePowerAim\(\)/);
});

test('рулетка имеет четыре редкости и отдельное кинематографичное выпадение', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'roulette-fx.css'), 'utf8');
  assert.match(source, /const DROP_RARITIES=\{common:/);
  assert.match(source, /function rarityForResult\(/);
  assert.match(source, /function triggerDropImpact\(/);
  assert.match(source, /lowFrequency_explosion/);
  assert.match(source, /resetDropImpact\(true\);state\.spinning=true/);
  assert.match(html, /id="dropCinematic"/);
  assert.match(html, /id="dropParticles"/);
  assert.match(css, /rarity-theme-legendary/);
  assert.match(css, /@keyframes drop-wave/);
  assert.match(css, /@keyframes screen-impact-hard/);
});

test('современная фиолетовая тема имеет независимое Canvas-небо, а звук колеса не наслаивается', () => {
  const root = path.join(__dirname, '..', 'public');
  const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const theme = fs.readFileSync(path.join(root, 'theme-v2.css'), 'utf8');
  assert.match(html, /href="theme-v2\.css"/);
  assert.doesNotMatch(html, /roulette-cosmos-v3/);
  assert.doesNotMatch(theme, /url\([^)]*roulette-cosmos-v3/);
  assert.equal((html.match(/data-void-sky/g) || []).length, 3, 'Canvas-небо должно быть на трёх основных экранах');
  assert.match(theme, /@keyframes void-nebula-drift/);
  assert.doesNotMatch(theme, /@keyframes void-stars-drift|@keyframes void-comet/);
  assert.match(source, /function makeVoidStar\(/);
  assert.match(source, /function spawnVoidMeteor\(/);
  assert.match(source, /time-voidSkyLastFrame>=42/);
  assert.match(source, /if\(fps<40\)/);
  assert.match(source, /ctx\.createLinearGradient\(tailX,tailY,meteor\.x,meteor\.y\)/);
  assert.match(source, /tailX=meteor\.x-ux\*meteor\.length/);
  assert.ok(Buffer.byteLength(theme) < 40000, 'Процедурный фон не должен раздувать CSS');
  assert.match(theme, /\.lite-fx/);
  assert.doesNotMatch(theme, /backdrop-filter:blur\([1-9]/);
  assert.match(source, /function startWheelAudio\(/);
  assert.match(source, /function playWheelTickAudio\(/);
  assert.match(source, /function stopWheelAudio\(/);
  assert.match(source, /wheel\.animate\?\.\(/);
  assert.match(source, /classList\.add\("is-spinning"\)/);
  assert.match(source, /watchdog=setTimeout\(finish,duration\+300\)/);
  assert.match(source, /stopWheelAudio\(\);done\(\)/);
});
