/* Fan-made balanced interpretations. Every universe is normalized for one arena. */
(() => {
const icon = name => `assets/icons/${name}.png`;
const raceIcon = name => {
  const value = name.toLowerCase();
  if (/титан|великан|дракон|монстр|ному|химера/.test(value)) return 'race-giant';
  if (/демон|проклят|пуст|арранкар|гуль|дух|гомункул/.test(value)) return 'race-demon';
  if (/андроид|ганмен|антиспираль/.test(value)) return 'race-machine';
  if (/вампир|бог смерти|синигами|квинси|эспер|эльф|маг|оцуцуки|лунариан/.test(value)) return 'race-mystic';
  if (/аккерман|саян|охотник|истребитель|золдик|шиноби|воин|следователь|шифтер/.test(value)) return 'race-fighter';
  return 'race-human';
};
const race = (name, hp, damage, speed, size, armor, trait) => ({ name, hp, damage, speed, size, armor, trait, icon: icon(raceIcon(name)) });
const power = (id, name, damage, cooldown, range, type, description, extra = {}) => ({ id, name, damage, cooldown, range, type, description, icon: icon(id), ...extra });
const universe = (id, name, subtitle, color, emblem, races, powers) => ({ id, name, subtitle, color, icon: icon(emblem), races, powers });

const UNIVERSES = [
  universe('opm','Ванпанчмен','Герои, монстры и эсперы','#ffcc34','opm',[
    race('Человек',1,1,1,1,.02,'Стабильные характеристики'),race('Эспер',.94,.98,1.07,.95,.01,'Сильнее контроль и дальние атаки'),race('Модифицированный',1.12,1.06,.94,1.05,.07,'Крепкое тело'),race('Монстр',1.22,1.12,.88,1.13,.05,'Много HP, крупная цель')],[
    power('tatsumaki','Телекинез Тацумаки',42,4.8,280,'control','Притягивает цель и бросает её в стену.',{knockback:310}),power('serious-punch','Серьёзный удар',68,8.5,74,'melee','Редкий сокрушительный удар с огромной отдачей.',{knockback:390}),power('incineration','Испепеляющая пушка',34,3.8,360,'projectile','Быстрый энергетический залп с ожогом.',{dot:5}),power('atomic-slash','Атомный разрез',29,2.8,105,'melee','Серия быстрых режущих атак.',{multi:3}),power('regeneration','Регенерация монстра',25,5.5,95,'drain','Контактная атака лечит владельца.',{lifesteal:.45})]),

  universe('death-note','Тетрадь смерти','Люди и боги смерти','#dedbd0','death-note',[
    race('Человек',.94,1,1.03,.98,.01,'Высокая подвижность'),race('Детектив',.9,.94,1.06,.96,.01,'Повышенный IQ'),race('Владелец тетради',.96,1.03,1,.98,.02,'Сильнее эффекты метки'),race('Бог смерти',1.18,1.08,.92,1.12,.09,'Больше HP и брони')],[
    power('death-notebook','Тетрадь смерти',36,9,500,'mark','Записывает имя: через 5 секунд наносит 180 урона, а цель ниже 18% HP погибает.',{execute:.18,delayed:180}),power('shinigami-eyes','Глаза бога смерти',24,3.8,420,'precision','Всегда выбирает самого раненого и чаще критует.',{crit:.2}),power('apple-bargain','Сделка с Рюком',30,4.2,240,'drain','Крадёт здоровье отмеченного врага.',{lifesteal:.55}),power('perfect-plan','Идеальный план L',27,3.1,350,'counter','Уклоняется перед ответной атакой.',{dodge:.18}),power('memory-gambit','Отказ от тетради',45,6.2,300,'shield','Сбрасывает контроль и получает временный щит.',{shield:90})]),

  universe('jojo','JoJo’s Bizarre Adventure','Люди, вампиры и стенды','#c85cff','jojo',[
    race('Человек',1,1,1,1,.02,'Стабильный пользователь'),race('Хамон-мастер',1.04,1.03,1.05,1,.03,'Регенерация от дыхания'),race('Вампир',1.18,1.1,.96,1.06,.06,'Вампиризм и высокая живучесть'),race('Каменный человек',1.12,1.05,.91,1.04,.12,'Высокая броня')],[
    power('star-platinum','Star Platinum',36,3,90,'melee','Точные быстрые удары.',{multi:4,crit:.12}),power('the-world','The World',31,6.8,190,'control','Останавливает движение врагов на короткое время.',{stun:1.5}),power('crazy-diamond','Crazy Diamond',30,4.5,95,'heal','Удар и восстановление собственного тела.',{heal:55}),power('killer-queen','Killer Queen',44,5.7,240,'bomb','Превращает касание в отложенный взрыв.',{area:95}),power('gold-experience','Gold Experience',33,4.4,190,'drain','Жизненная энергия наносит урон и лечит.',{lifesteal:.5})]),

  universe('dragon-ball','Dragon Ball','Ки, саяны и боевые формы','#ff8a2b','dragon-ball',[
    race('Человек',.94,.95,1.05,.98,.01,'Быстрый, но хрупкий'),race('Саянин',1.1,1.1,1.04,1.03,.04,'Становится сильнее при низком HP'),race('Намекианец',1.16,.98,.94,1.08,.07,'Пассивная регенерация'),race('Андроид',1.08,1.03,1,.99,.11,'Стабильная энергия'),race('Раса Фризы',1.05,1.09,1.07,1,.05,'Высокая скорость и урон')],[
    power('kamehameha','Камехамеха',42,5.4,440,'beam','Мощный луч ки через всю арену.'),power('ultra-instinct','Ультра-инстинкт',27,4.8,120,'counter','Автоматическое уклонение и контрудар.',{dodge:.25}),power('final-flash','Final Flash',54,7,460,'beam','Долгая зарядка, высокий урон.'),power('destructo-disc','Разрушающий диск',39,5.3,390,'projectile','Игнорирует часть брони.',{armorPen:.65}),power('special-beam','Маканкасаппо',45,6.1,430,'projectile','Пробивающий точечный луч.',{armorPen:.8})]),

  universe('naruto','Naruto','Шиноби, кланы и хвостатые','#ff7957','naruto',[
    race('Шиноби',1,1,1.05,.98,.02,'Быстрые перемещения'),race('Учиха',.98,1.07,1.04,.98,.02,'Выше критический шанс'),race('Узумаки',1.18,1.02,.98,1,.04,'Большой запас жизненной силы'),race('Джинчурики',1.16,1.1,.98,1.06,.05,'Усиление при низком HP'),race('Ооцуцуки',1.12,1.08,1.06,1.03,.08,'Редкая сбалансированная раса')],[
    power('rasengan','Расенган',35,3.6,100,'melee','Вращающийся удар с сильным отбрасыванием.',{knockback:250}),power('chidori','Чидори',39,4.2,155,'dash','Скоростной пробивающий рывок.',{armorPen:.55}),power('amaterasu','Аматэрасу',27,5.8,360,'dot','Чёрное пламя продолжает наносить урон.',{dot:8}),power('sand-defense','Абсолютная защита песка',25,5,230,'shield','Атака песком и защитный барьер.',{shield:75}),power('flying-raijin','Летящий бог грома',31,4.6,500,'teleport','Мгновенно появляется возле цели и атакует.')]),

  universe('bleach','Bleach','Души, синигами, пустые и квинси','#62d8ff','bleach',[
    race('Синигами',1,1.03,1.02,1,.04,'Баланс занпакто и скорости'),race('Квинси',.94,1.05,1.06,.97,.02,'Сильнее дальние атаки'),race('Арранкар',1.12,1.07,.98,1.04,.08,'Иерро снижает урон'),race('Вайзард',1.05,1.08,1.04,1,.05,'Маска усиливает атаку'),race('Фуллбрингер',.98,1,1.07,.98,.03,'Манипуляция душами предметов')],[
    power('zangetsu','Тэнса Зангэцу',37,3.7,220,'dash','Быстрый Гэцуга Тэнсё.'),power('senbonzakura','Сэнбонзакура Кагэёси',31,4.7,310,'area','Тысячи лезвий атакуют область.',{area:125}),power('kyoka-suigetsu','Кёка Суйгецу',25,6.2,340,'control','Иллюзия сбивает направление и открывает цель.',{stun:1.2}),power('ryujin-jakka','Рюдзин Дзякка',42,5.8,230,'dot','Огненный разрез с длительным ожогом.',{dot:7}),power('vollstandig','Квинси: Фольштендиг',35,4.5,400,'projectile','Залп духовных стрел с пробитием.',{multi:3,armorPen:.35})]),

  universe('one-piece','One Piece','Пираты, фрукты и хаки','#39c7ff','one-piece',[
    race('Человек',1,1,1,1,.02,'Универсальный пират'),race('Рыболюд',1.14,1.07,.93,1.08,.07,'Сила и прочность'),race('Великан',1.32,1.12,.77,1.35,.07,'Огромные HP и радиус'),race('Лунарианец',1.12,1.07,1.02,1.05,.12,'Огненная защита'),race('Минк',.96,1.02,1.12,.94,.02,'Высокая скорость')],[
    power('nika','Резина: Ника',34,4,145,'bounce','Непредсказуемый растягивающийся удар.',{knockback:280}),power('ope-ope','Ope Ope no Mi',30,5.6,330,'teleport','Меняет позиции и наносит внутренний урон.',{armorPen:.7}),power('gura-gura','Gura Gura no Mi',48,6.7,210,'area','Землетрясение поражает всех рядом.',{area:145}),power('magma-fruit','Magu Magu no Mi',40,5.4,320,'dot','Магмовый снаряд оставляет ожог.',{dot:7}),power('conqueror-haki','Королевское хаки',29,6,260,'control','Оглушает ближайших врагов.',{stun:1.35,area:150})]),

  universe('jujutsu','Магическая битва','Проклятая энергия и техники','#735cff','jujutsu',[
    race('Человек',.96,.96,1.03,.98,.01,'Обычный носитель энергии'),race('Маг',1,1.04,1.02,1,.03,'Контроль проклятой энергии'),race('Проклятие',1.16,1.06,.94,1.08,.07,'Регенерация и живучесть'),race('Картина смерти',1.1,1.04,.98,1.03,.06,'Ядовитая кровь'),race('Небесное ограничение',1.05,1.11,1.1,1,.04,'Физическое усиление без техники')],[
    power('limitless','Бесконечность',35,6.3,360,'shield','Притяжение «Синего» и защитная бесконечность.',{shield:95,knockback:180}),power('ten-shadows','Десять теней',34,4.8,300,'projectile','Теневая атака без помощников: шикигами представлен единым ударом.'),power('shrine','Рассекающая кухня',39,4.7,250,'area','Серия невидимых разрезов.',{multi:3,area:105}),power('boogie-woogie','Boogie Woogie',28,4,320,'teleport','Меняется местами с целью и контратакует.'),power('blood-piercing','Пронзающая кровь',41,5,400,'projectile','Сверхзвуковой пробивающий выстрел.',{armorPen:.6})]),

  universe('demon-slayer','Клинок, рассекающий демонов','Дыхания и демоническая кровь','#3ad0ac','demon-slayer',[
    race('Человек',.96,.96,1,.98,.01,'Обычная физика'),race('Истребитель',1,1.04,1.06,.98,.03,'Техника дыхания'),race('Демон',1.14,1.07,.98,1.04,.06,'Регенерация'),race('Высшая луна',1.18,1.1,1.02,1.06,.08,'Редкая сильная раса')],[
    power('sun-breathing','Дыхание солнца',39,4.2,125,'melee','Серия огненных разрезов.',{multi:3}),power('water-breathing','Дыхание воды',31,3.4,130,'dash','Плавная быстрая атака.'),power('thunder-breathing','Дыхание грома',42,5,230,'dash','Мгновенный рывок к цели.'),power('blood-sickles','Кровавые серпы',35,4.5,330,'projectile','Два ядовитых серпа.',{multi:2,dot:5}),power('compass-needle','Компас Аказы',32,4.1,150,'counter','Чувствует атаку и отвечает ударом.',{dodge:.16})]),

  universe('attack-titan','Атака титанов','Люди и силы Девяти титанов','#df5a48','attack-titan',[
    race('Человек',.9,.94,1.1,.85,.01,'Маленькая цель и высокая скорость'),race('Аккерман',1,1.09,1.13,.9,.03,'Боевой инстинкт'),race('Элдиец',1,1,1,.95,.02,'Может получить силу титана'),race('Чистый титан',1.2,1.07,.83,1.25,.04,'Большой и живучий'),race('Шифтер',1.15,1.08,.92,1.18,.07,'Регенерация и броня')],[
    power('attack-titan-power','Атакующий титан',38,4,120,'melee','Сильная рукопашная атака и напор.',{knockback:230}),power('female-titan','Женская особь',34,4.2,150,'counter','Гибкий стиль, закалка и контратака.',{dodge:.12,shield:35}),power('armored-titan','Бронированный титан',32,4.6,115,'shield','Таран с мощной бронёй.',{shield:100,knockback:270}),power('colossal-titan','Колоссальный титан',58,8,210,'area','Взрыв трансформации и горячий пар.',{area:170}),power('war-hammer-titan','Титан-молотобоец',44,5.8,300,'projectile','Создаёт оружие из закалки на расстоянии.',{armorPen:.45})]),

  universe('mha','Моя геройская академия','Причуды героев и злодеев','#f4d73e','mha',[
    race('Без причуды',.94,.92,1,.98,.01,'Слабее, но удачливее'),race('Носитель причуды',1,1.03,1,1,.02,'Стабильная сила'),race('Мутант',1.12,1.05,.94,1.08,.06,'Усиленное тело'),race('Ному',1.2,1.08,.9,1.12,.08,'Регенерация и HP')],[
    power('one-for-all','One For All',43,5,140,'dash','Усиленный удар и скоростной рывок.',{knockback:290}),power('decay','Разложение',32,5.4,135,'dot','Касание наносит продолжительный урон.',{dot:10}),power('half-cold-hot','Лёд и пламя',35,4.5,310,'control','Замедляет, затем обжигает.',{stun:.8,dot:5}),power('explosion-quirk','Взрыв',37,4.2,260,'bomb','Манёвренный взрыв по области.',{area:90}),power('dark-shadow','Тёмная тень',34,4.6,220,'melee','Теневая конечность атакует без отдельного помощника.')]),

  universe('hunter','Hunter × Hunter','Нэн и его типы','#50d895','hunter',[
    race('Человек',1,1,1,1,.02,'Сбалансирован'),race('Охотник',1.03,1.03,1.04,.99,.03,'Боевой опыт'),race('Химера',1.15,1.08,.96,1.08,.07,'Усиленное тело'),race('Золдик',.98,1.05,1.1,.96,.03,'Скорость убийцы')],[
    power('bungee-gum','Bungee Gum',29,3.5,260,'control','Притягивает противника и меняет траекторию.',{knockback:-180}),power('jajanken','Jajanken: Камень',43,5.2,95,'melee','Заряженный удар вблизи.'),power('godspeed','Божественная скорость',28,3.2,180,'dash','Очень частые быстрые атаки.'),power('skill-hunter','Skill Hunter',34,5.5,280,'counter','Копирует тип последней полученной атаки.'),power('dragon-dive','Dragon Dive',36,6,340,'area','Дождь энергии по области.',{area:140})]),

  universe('chainsaw','Человек-бензопила','Люди, демоны и гибриды','#f05a45','chainsaw',[
    race('Человек',.94,.96,1.04,.98,.01,'Подвижный охотник'),race('Одержимый',1.08,1.04,1.01,1.02,.04,'Демоническая кровь'),race('Гибрид',1.14,1.08,.99,1.05,.06,'Регенерация через урон'),race('Демон',1.18,1.07,.94,1.1,.07,'Высокая живучесть')],[
    power('chainsaw-rush','Бензопильный рывок',37,3.8,150,'dash','Серия режущих ударов.',{multi:3,lifesteal:.15}),power('blood-hammer','Кровавый молот',39,4.8,180,'melee','Тяжёлое оружие из крови.',{knockback:240}),power('control-chain','Цепь контроля',29,5.5,320,'control','Обездвиживает цель.',{stun:1.3}),power('future-sight','Будущее зрение',25,4.3,200,'counter','Уклонение и точная контратака.',{dodge:.2}),power('curse-nail','Проклятый гвоздь',46,6.4,230,'mark','Три попадания вызывают большой урон.',{delayed:85})]),

  universe('black-clover','Чёрный клевер','Магия, эльфы и демоны','#8dd85e','black-clover',[
    race('Человек',1,1,1,1,.02,'Обычный маг'),race('Эльф',1.06,1.07,1.05,1,.04,'Большой запас маны'),race('Демон',1.17,1.09,.93,1.1,.09,'Сила и броня'),race('Гибрид',1.09,1.06,1.02,1.02,.05,'Смешанные способности')],[
    power('anti-magic','Антимагия',36,4,145,'melee','Игнорирует щиты и часть брони.',{armorPen:.8,shieldBreak:true}),power('wind-spirit','Дух ветра',33,3.9,360,'projectile','Быстрый дальний поток ветра.'),power('dark-magic','Тёмная магия',44,5.8,310,'beam','Медленный пробивающий разрез.',{armorPen:.6}),power('time-magic','Магия времени',27,6.2,270,'control','Замедляет цель и ускоряет владельца.',{stun:1.4}),power('dream-magic','Магия снов',31,5,250,'control','Сбивает направление нескольких врагов.',{area:120})]),

  universe('solo-leveling','Поднятие уровня в одиночку','Охотники, монархи и правители','#786cff','solo-leveling',[
    race('Человек',.94,.94,1,.98,.01,'Обычный человек'),race('Охотник',1,1.03,1.03,1,.03,'Пробуждённый боец'),race('Монарх',1.16,1.09,.98,1.08,.08,'Высокая сила'),race('Правитель',1.12,1.06,1.02,1.05,.09,'Защита и контроль')],[
    power('rulers-authority','Власть правителя',36,4.5,300,'control','Телекинетический захват и бросок.',{knockback:280}),power('dagger-rush','Рывок с кинжалами',34,3.3,170,'dash','Быстрая серия ближних атак.',{multi:2}),power('domain-monarch','Владения монарха',32,5.4,180,'area','Усиливает владельца и давит врагов.',{area:125}),power('mutilation','Увечье',42,5,120,'melee','Мощный критический разрез.',{crit:.18}),power('shadow-exchange','Обмен тенью',29,4.1,500,'teleport','Телепорт к цели без вызова помощников.')]),

  universe('fullmetal','Стальной алхимик','Алхимия и гомункулы','#e0b63d','fullmetal',[
    race('Человек',1,1,1,1,.02,'Стабильное тело'),race('Алхимик',.98,1.03,1.01,.98,.03,'Быстрая трансмутация'),race('Гомункул',1.16,1.05,.96,1.04,.08,'Камень даёт регенерацию'),race('Химера',1.1,1.04,1.03,1.06,.05,'Усиленные чувства')],[
    power('earth-alchemy','Алхимия земли',34,4,260,'projectile','Каменные пики из пола.'),power('flame-alchemy','Огненная алхимия',40,5,330,'dot','Точный взрыв и ожог.',{dot:6}),power('deconstruction','Разложение Шрама',38,4.5,110,'melee','Разрушает материал при касании.',{armorPen:.7}),power('ultimate-shield','Абсолютный щит',29,5.4,120,'shield','Углеродная броня и контрудар.',{shield:105}),power('homunculus-eye','Глаз гомункула',33,4.2,180,'precision','Повышенная точность и критический шанс.',{crit:.2})]),

  universe('tokyo-ghoul','Токийский гуль','Люди, гули и кагуне','#ef5472','tokyo-ghoul',[
    race('Человек',.93,.94,1.05,.97,.01,'Высокая скорость'),race('Следователь',1,1.02,1.04,1,.04,'Квинке и подготовка'),race('Полугуль',1.1,1.07,1.04,1.02,.05,'Баланс силы и контроля'),race('Гуль',1.16,1.08,.98,1.06,.07,'Регенерация и HP')],[
    power('rinkaku','Ринкаку',35,3.8,190,'drain','Гибкие щупальца и восстановление.',{lifesteal:.35}),power('ukaku','Укаку',31,3.5,350,'projectile','Быстрые кристаллические снаряды.',{multi:3}),power('koukaku','Коукаку',38,4.8,110,'shield','Тяжёлая броня и удар.',{shield:70}),power('bikaku','Бикаку',34,3.9,150,'melee','Сбалансированная хвостовая атака.'),power('kakuja','Какуджа',45,6,145,'area','Временная броня и сильный круговой удар.',{area:105,shield:45})]),

  universe('mob','Моб Психо 100','Эсперы и духи','#64e4d2','mob',[
    race('Человек',.96,.94,1.02,.98,.01,'Обычный человек'),race('Эспер',.98,1.04,1.05,.98,.02,'Психическая сила'),race('Дух',1.06,1.03,1.08,.95,.05,'Сложнее попасть'),race('Проклятый дух',1.13,1.07,.94,1.07,.07,'Живучая сущность')],[
    power('psychic-barrier','Психический барьер',28,4.5,260,'shield','Щит и телекинетический толчок.',{shield:95,knockback:170}),power('mob-100','Взрыв 100%',46,6.3,270,'area','Мощный эмоциональный выброс.',{area:150}),power('spirit-drain','Поглощение духов',31,4.6,180,'drain','Крадёт энергию цели.',{lifesteal:.42}),power('plant-control','Контроль растений',30,3.9,310,'control','Корни ненадолго удерживают цель.',{stun:.9}),power('telekinetic-crush','Психический пресс',39,5,300,'control','Сжимает и бросает врага.',{knockback:260})]),

  universe('gurren','Гуррен-Лаганн','Спиральная сила и ганмены','#ff4338','gurren',[
    race('Человек',.96,.98,1.03,.98,.01,'Пилот со стабильными статами'),race('Спиральный воин',1.08,1.08,1.04,1.02,.04,'Усиливается при низком HP'),race('Зверочеловек',1.1,1.04,.97,1.06,.06,'Крепкое тело'),race('Антиспираль',1.12,1.07,.96,1.05,.1,'Высокая защита, медленнее')],[
    power('lagann-impact','Lagann Impact',35,3.8,125,'dash','Буровой таран в ближнем бою.',{armorPen:.45}),power('giga-drill','Giga Drill Break',48,6.2,210,'dash','Огромный бур с сильным пробитием.',{armorPen:.7,knockback:300}),power('arc-gurren','Arc-Gurren Punch',42,5.6,250,'projectile','Дальний усиленный удар.'),power('super-galaxy','Super Galaxy Spin',38,6.5,230,'area','Спиральный импульс по области.',{area:145}),power('tengen-toppa','Tengen Toppa Break',60,9,300,'beam','Сильнейшая форма нормализована ареной: огромный урон, очень долгий КД.')]),

  universe('eminence','Восхождение в тени','Мечники, магия и Теневой сад','#7c68ff','eminence',[
    race('Человек',1,1,1,1,.02,'Обычный магический мечник'),race('Эльф',1.03,1.04,1.05,1,.04,'Точная магия'),race('Зверочеловек',1.1,1.07,1.04,1.05,.05,'Сила и скорость'),race('Одержимый',1.12,1.05,.98,1.04,.07,'Высокая магическая выносливость'),race('Вампир',1.16,1.07,.96,1.03,.08,'Вампиризм')],[
    power('i-am-atomic','I Am Atomic',58,8.5,350,'area','Сконцентрированный взрыв магии. Огромный КД.',{area:175}),power('slime-sword','Слизевой меч',34,3.5,155,'melee','Гибкое оружие меняет длину и форму.'),power('shadow-step','Шаг из тени',31,3.8,500,'teleport','Телепорт и точный удар в спину.',{crit:.14}),power('magic-overdrive','Перегрузка магии',39,5,270,'beam','Плотный фиолетовый луч.'),power('blood-queen','Кровавая королева',33,4.8,190,'drain','Кровавая атака восстанавливает HP.',{lifesteal:.48})]),

  universe('fairy-tail','Fairy Tail','Маги, драконы и духи','#e8679c','fairy-tail',[
    race('Человек',1,1,1,1,.02,'Стабильный маг'),race('Убийца драконов',1.1,1.08,1.03,1.03,.05,'Сильное тело и стихия'),race('Демон Эфира',1.14,1.07,.96,1.07,.08,'Высокая живучесть'),race('Дракон',1.24,1.1,.84,1.24,.1,'Много HP, большая цель')],[
    power('fire-dragon','Рёв огненного дракона',40,5,330,'beam','Огненное дыхание с ожогом.',{dot:6}),power('ice-make','Ice Make',34,4.2,260,'control','Лёд замедляет и ранит.',{stun:.8}),power('requip','Requip: Доспех',31,4.5,160,'shield','Смена доспеха даёт щит и удар.',{shield:80}),power('heavenly-body','Магия небесных тел',43,5.8,360,'projectile','Быстрая звёздная атака.'),power('fairy-law','Fairy Law',51,8,300,'area','Редкая мощная атака по области.',{area:155})])
];

const ULTIMATES = {
  'opm': {id:'ultimate-opm',name:'СЕРЬЁЗНЫЙ РЕЖИМ',cooldown:32,duration:1.4,type:'nova',damage:170,description:'Ударная волна проходит через всю арену.'},
  'death-note': {id:'ultimate-death-note',name:'ПРИГОВОР ТЕТРАДИ',cooldown:36,duration:5,type:'execute',damage:230,description:'Имя самого раненого врага появляется в тетради.'},
  'jojo': {id:'ultimate-jojo',name:'ZA WARUDO',cooldown:34,duration:4,type:'timeStop',damage:65,description:'Все противники полностью застывают, владелец продолжает бой.'},
  'dragon-ball': {id:'ultimate-dragon-ball',name:'СУПЕР-САЯН',cooldown:32,duration:9,type:'buff',damage:1.45,speed:1.45,description:'Золотая аура резко усиливает скорость и урон.'},
  'naruto': {id:'ultimate-naruto',name:'ШАРИНГАН',cooldown:30,duration:7,type:'sharingan',slow:.38,dodge:.25,description:'Все враги замедляются, движения читаются заранее.'},
  'bleach': {id:'ultimate-bleach',name:'БАНКАЙ',cooldown:31,duration:6,type:'bladeStorm',damage:34,description:'Арена заполняется серией духовных разрезов.'},
  'one-piece': {id:'ultimate-one-piece',name:'GEAR FIFTH',cooldown:32,duration:9,type:'buff',damage:1.3,speed:1.32,description:'Ника меняет физику ударов и увеличивает отдачу.'},
  'jujutsu': {id:'ultimate-jujutsu',name:'РАСШИРЕНИЕ ТЕРРИТОРИИ',cooldown:34,duration:6,type:'domain',damage:28,slow:.55,description:'Гарантированные атаки внутри личной территории.'},
  'demon-slayer': {id:'ultimate-demon-slayer',name:'МЕТКА ИСТРЕБИТЕЛЯ',cooldown:29,duration:9,type:'buff',damage:1.32,speed:1.38,description:'Темп дыхания и скорость клинка достигают предела.'},
  'attack-titan': {id:'ultimate-attack-titan',name:'ГУД ЗЕМЛИ',cooldown:36,duration:4,type:'rumbling',damage:120,description:'Земля дрожит, всех врагов сбивает ударной волной.'},
  'mha': {id:'ultimate-mha',name:'PLUS ULTRA',cooldown:29,duration:8,type:'buff',damage:1.4,speed:1.25,description:'Последний предел силы героя.'},
  'hunter': {id:'ultimate-hunter',name:'EMPEROR TIME',cooldown:32,duration:8,type:'buff',damage:1.28,speed:1.3,description:'Все параметры Нэн временно достигают максимума.'},
  'chainsaw': {id:'ultimate-chainsaw',name:'ГЕРОЙ АДА',cooldown:31,duration:7,type:'berserk',damage:1.35,heal:.35,description:'Каждый удар восстанавливает здоровье.'},
  'black-clover': {id:'ultimate-black-clover',name:'ЕДИНЕНИЕ С ДЬЯВОЛОМ',cooldown:32,duration:8,type:'armorBreak',damage:1.3,description:'Антимагия временно отменяет щиты и броню.'},
  'solo-leveling': {id:'ultimate-solo-leveling',name:'ВЛАДЕНИЯ МОНАРХА',cooldown:33,duration:7,type:'domain',damage:24,slow:.68,description:'Тёмное поле давит врагов без призыва помощников.'},
  'fullmetal': {id:'ultimate-fullmetal',name:'ФИЛОСОФСКИЙ КАМЕНЬ',cooldown:34,duration:8,type:'alchemy',damage:1.25,heal:260,description:'Мгновенное лечение и усиленная трансмутация.'},
  'tokyo-ghoul': {id:'ultimate-tokyo-ghoul',name:'ПОЛНАЯ КАКУДЖА',cooldown:30,duration:8,type:'berserk',damage:1.3,heal:.28,description:'Кагуне покрывает тело бронёй и крадёт здоровье.'},
  'mob': {id:'ultimate-mob',name:'ЭМОЦИИ 100%',cooldown:34,duration:2,type:'nova',damage:145,description:'Психическая энергия взрывается вокруг владельца.'},
  'gurren': {id:'ultimate-gurren',name:'СПИРАЛЬНЫЙ ПРЕДЕЛ',cooldown:35,duration:9,type:'buff',damage:1.48,speed:1.2,description:'Воля превращается в гигантский спиральный импульс.'},
  'eminence': {id:'ultimate-eminence',name:'I AM ATOMIC',cooldown:38,duration:2.5,type:'atomic',damage:210,description:'Фиолетовый взрыв накрывает почти всю арену.'},
  'fairy-tail': {id:'ultimate-fairy-tail',name:'DRAGON FORCE',cooldown:31,duration:8,type:'buff',damage:1.36,speed:1.28,description:'Драконья энергия усиливает тело и магию.'}
};

for (const item of UNIVERSES) {
  item.ultimate = ULTIMATES[item.id];
  item.ultimate.icon = icon(item.ultimate.id);
}

const UNIVERSAL_ROULETTES = [
  {id:'strength',name:'ФИЗИЧЕСКАЯ СИЛА',icon:icon('stat-strength'),options:[
    {id:'weak',name:'Слабая',label:'×0.82 урон',weight:18,stats:{damage:.82},icon:icon('strength-1')},{id:'trained',name:'Тренированная',label:'×1.00 урон',weight:31,stats:{damage:1},icon:icon('strength-2')},{id:'superhuman',name:'Сверхчеловеческая',label:'×1.18 урон',weight:27,stats:{damage:1.18},icon:icon('strength-3')},{id:'monstrous',name:'Монструозная',label:'×1.38 урон',weight:18,stats:{damage:1.38},icon:icon('strength-4')},{id:'cosmic',name:'Космическая',label:'×1.62 урон',weight:6,stats:{damage:1.62},icon:icon('strength-5')}]},
  {id:'iq',name:'IQ И ТАКТИКА',icon:icon('stat-iq'),options:[
    {id:'instinct',name:'Чистый инстинкт',label:'IQ 70',weight:15,stats:{cooldown:1.1,crit:0},icon:icon('iq-1')},{id:'average',name:'Обычный ум',label:'IQ 105',weight:31,stats:{cooldown:1},icon:icon('iq-2')},{id:'smart',name:'Стратег',label:'IQ 150',weight:29,stats:{cooldown:.94,crit:.04},icon:icon('iq-3')},{id:'genius',name:'Гений',label:'IQ 220',weight:19,stats:{cooldown:.87,crit:.08},icon:icon('iq-4')},{id:'omniscient',name:'Сверхразум',label:'IQ 400+',weight:6,stats:{cooldown:.78,crit:.13},icon:icon('iq-5')}]},
  {id:'speed',name:'СКОРОСТЬ',icon:icon('stat-speed'),options:[
    {id:'slow',name:'Медленная',label:'80% темпа',weight:14,stats:{speed:.8},icon:icon('speed-1')},{id:'normal',name:'Обычная',label:'100% темпа',weight:32,stats:{speed:1},icon:icon('speed-2')},{id:'sonic',name:'Звуковая',label:'118% темпа',weight:29,stats:{speed:1.18},icon:icon('speed-3')},{id:'light',name:'Световая',label:'138% темпа',weight:19,stats:{speed:1.38},icon:icon('speed-4')},{id:'instant',name:'Мгновенная',label:'155% темпа',weight:6,stats:{speed:1.55},icon:icon('speed-5')}]},
  {id:'durability',name:'ПРОЧНОСТЬ',icon:icon('stat-durability'),options:[
    {id:'glass',name:'Стеклянная',label:'800 базовых HP',weight:13,stats:{hp:.8,armor:0},icon:icon('durability-1')},{id:'normal',name:'Человеческая',label:'1000 базовых HP',weight:32,stats:{hp:1,armor:.02},icon:icon('durability-2')},{id:'steel',name:'Стальная',label:'1120 HP · 5% броня',weight:29,stats:{hp:1.12,armor:.05},icon:icon('durability-3')},{id:'diamond',name:'Алмазная',label:'1260 HP · 9% броня',weight:20,stats:{hp:1.26,armor:.09},icon:icon('durability-4')},{id:'absolute',name:'Абсолютная',label:'1400 HP · 13% броня',weight:6,stats:{hp:1.4,armor:.13},icon:icon('durability-5')}]},
  {id:'height',name:'РОСТ',icon:icon('stat-height'),options:[
    {id:'tiny',name:'60 см',label:'Малая цель · −18% HP',weight:8,stats:{size:.58,hp:.82,speed:1.12},icon:icon('height-1')},{id:'short',name:'155 см',label:'Быстрее на 5%',weight:22,stats:{size:.88,hp:.95,speed:1.05},icon:icon('height-2')},{id:'average',name:'180 см',label:'Без изменений',weight:39,stats:{size:1,hp:1,speed:1},icon:icon('height-3')},{id:'giant',name:'3 метра',label:'+18% HP · больше радиус',weight:23,stats:{size:1.3,hp:1.18,speed:.9},icon:icon('height-4')},{id:'tall',name:'230 см',label:'+10% HP · −4% скорость',weight:8,stats:{size:1.12,hp:1.1,speed:.96},icon:icon('height-5')}]},
  {id:'combat',name:'БОЕВОЙ ОПЫТ',icon:icon('stat-combat'),options:[
    {id:'rookie',name:'Новичок',label:'Без бонуса',weight:17,stats:{crit:0,dodge:0},icon:icon('combat-1')},{id:'soldier',name:'Боец',label:'+3% крит',weight:31,stats:{crit:.03,dodge:.01},icon:icon('combat-2')},{id:'master',name:'Мастер',label:'+7% крит · 3% уклон',weight:27,stats:{crit:.07,dodge:.03},icon:icon('combat-3')},{id:'legend',name:'Легенда',label:'+11% крит · 6% уклон',weight:19,stats:{crit:.11,dodge:.06},icon:icon('combat-4')},{id:'war-god',name:'Бог войны',label:'+16% крит · 9% уклон',weight:6,stats:{crit:.16,dodge:.09},icon:icon('combat-5')}]},
  {id:'luck',name:'УДАЧА',icon:icon('stat-luck'),options:[
    {id:'cursed',name:'Проклятая',label:'−5% крит',weight:12,stats:{crit:-.05},icon:icon('luck-1')},{id:'ordinary',name:'Обычная',label:'Без изменений',weight:34,stats:{},icon:icon('luck-2')},{id:'lucky',name:'Везучая',label:'+4% уклон',weight:29,stats:{dodge:.04},icon:icon('luck-3')},{id:'blessed',name:'Благословенная',label:'+8% крит и уклон',weight:19,stats:{dodge:.08,crit:.08},icon:icon('luck-4')},{id:'plot-armor',name:'Сюжетная броня',label:'Одно возрождение с 18% HP',weight:6,stats:{revive:true},icon:icon('luck-5')}]}];

const PHASES = [
  {id:'universe',name:'ВСЕЛЕННАЯ',short:'ВЕРС',type:'universe'},
  {id:'race',name:'РАСА ВСЕЛЕННОЙ',short:'РАСА',type:'race'},
  {id:'power',name:'УНИКАЛЬНАЯ СИЛА',short:'СИЛА',type:'power'},
  ...UNIVERSAL_ROULETTES.map(item=>({id:item.id,name:item.name,short:item.name.split(' ')[0],type:'universal'}))
];

window.POWER_DATA = { UNIVERSES, UNIVERSAL_ROULETTES, PHASES };
})();
