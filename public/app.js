"use strict";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const { UNIVERSES, UNIVERSAL_ROULETTES, PHASES } = window.POWER_DATA;
const PLAYER_COLORS = ["#d8ff45","#ff5c4d","#55cfff","#a46bff","#ffcf3d","#ff74bc","#56ddb5","#ff934d","#86a8ff","#e7e3da"];
const state = {
  players:[], turn:0, phaseIndex:0, rotation:0, spinning:false, sound:true, speed:1,
  randomSeed:Date.now()>>>0, battle:null,
  multiplayer:{ socket:null, clientId:null, room:null, autoJoined:false, reconnectTimer:null, reconnectAttempt:0 }
};

const sounds = Object.fromEntries(["click","tick","reveal","phase","hit","heavy","block","ko","wheel-spin","sharingan","time-stop","ultimate","beam","domain","transform"].map(name => {
  const audio = new Audio(`assets/sounds/${name}.ogg`); audio.preload="auto"; return [name,audio];
}));
function playSound(name, volume=.4, rate=1) {
  if (!state.sound || !sounds[name]) return null;
  const sound=sounds[name].cloneNode(); sound.volume=volume; sound.playbackRate=rate; sound.play().catch(()=>{});return sound;
}
function playPathSound(path,volume=.4,rate=1,delay=0){if(!state.sound)return null;const play=()=>{const audio=new Audio(path);audio.volume=volume;audio.playbackRate=rate;audio.play().catch(()=>{});return audio};if(delay){setTimeout(play,delay);return null}return play()}
const battleMusic=new Audio("assets/sounds/battle-music.ogg");battleMusic.loop=true;battleMusic.volume=.19;battleMusic.preload="auto";
function startBattleMusic(){if(state.sound&&state.battle&&!state.battle.over){battleMusic.volume=.19;battleMusic.play().catch(()=>{})}}
function stopBattleMusic(){battleMusic.pause();battleMusic.currentTime=0}
let heartbeatContext=null,lastHeartbeatBeat=-1;
function playHeartbeat(intensity=0){
  if(!state.sound)return;const AudioEngine=window.AudioContext||window.webkitAudioContext;if(!AudioEngine)return;
  heartbeatContext||=new AudioEngine();heartbeatContext.resume?.().catch(()=>{});const start=heartbeatContext.currentTime+.01;
  for(const [offset,volume] of [[0,.72],[.16,.46]]){const oscillator=heartbeatContext.createOscillator(),gain=heartbeatContext.createGain(),filter=heartbeatContext.createBiquadFilter();oscillator.type="sine";oscillator.frequency.setValueAtTime(74+intensity*18,start+offset);oscillator.frequency.exponentialRampToValueAtTime(42,start+offset+.13);filter.type="lowpass";filter.frequency.value=180;gain.gain.setValueAtTime(.0001,start+offset);gain.gain.exponentialRampToValueAtTime(volume,start+offset+.018);gain.gain.exponentialRampToValueAtTime(.0001,start+offset+.16);oscillator.connect(filter).connect(gain).connect(heartbeatContext.destination);oscillator.start(start+offset);oscillator.stop(start+offset+.18)}
}
const ULTIMATE_AUDIO={
  "opm":"lowFrequency_explosion_001.ogg","death-note":"computerNoise_002.ogg","jojo":"doorClose_002.ogg","dragon-ball":"thrusterFire_004.ogg","naruto":"laserRetro_003.ogg","bleach":"rpg-sword-unsheathe5.ogg","one-piece":"impactSoft_medium_004.ogg","jujutsu":"forceField_004.ogg","demon-slayer":"rpg-swing3.ogg","attack-titan":"explosionCrunch_004.ogg","mha":"impactPunch_heavy_004.ogg","hunter":"laserSmall_003.ogg","chainsaw":"impactMetal_medium_004.ogg","black-clover":"laserLarge_004.ogg","solo-leveling":"spaceEngineLow_004.ogg","fullmetal":"rpg-magic1.ogg","tokyo-ghoul":"slime_001.ogg","mob":"lowFrequency_explosion_000.ogg","gurren":"thrusterFire_003.ogg","eminence":"laserLarge_003.ogg","fairy-tail":"rpg-spell.ogg","re-zero":"forceField_003.ogg","evangelion":"spaceEngineLarge_004.ogg","slime":"slime_000.ogg","ragnarok":"impactMetal_004.ogg","parasyte":"slime_001.ogg","seven-deadly-sins":"rpg-sword-unsheathe4.ogg","overlord":"computerNoise_003.ogg","misfit":"laserLarge_002.ogg","hellsing":"impactMetal_medium_003.ogg","gachiakuta":"impactSoft_medium_003.ogg","frieren":"forceField_001.ogg","fate":"rpg-sword-unsheathe3.ogg"
};
function ultimateVisualAudio(event){const visual=String(event.visual||"").toLowerCase(),hash=hashText(event.ultimateId||event.name),variant=String(hash%5).padStart(3,"0");if(/drill|meteor|steam/.test(visual))return `thrusterFire_${variant}.ogg`;if(/blade|slash|sword|kagune|chainsaw/.test(visual))return `rpg-swing${hash%3?hash%3+1:""}.ogg`;if(/cage|room|void|barrier|psychic/.test(visual))return `forceField_${variant}.ogg`;if(/clock|eyes|notebook|gate|paths/.test(visual))return `computerNoise_${String(hash%4).padStart(3,"0")}.ogg`;if(/fire|bomb|smash|debris|atomic/.test(visual))return `explosionCrunch_${variant}.ogg`;return `laserLarge_${variant}.ogg`}
function playUltimateSound(event){const file=ULTIMATE_AUDIO[event.universeId]||"explosionCrunch_003.ogg";playPathSound(`assets/sounds/abilities/${file}`,.7,.9+hashText(event.ultimateId||event.universeId)%24/100);setTimeout(()=>playPathSound(`assets/sounds/abilities/${ultimateVisualAudio(event)}`,.52,.86+hashText(event.name)%22/100),110);const accent=event.universeId==="naruto"?"sharingan":event.universeId==="jojo"?"time-stop":event.type==="domain"?"domain":event.type==="atomic"?"beam":"ultimate";setTimeout(()=>playSound(accent,.48),180)}
const abilityAudioCache=new Map();
const ABILITY_AUDIO={
  melee:[["impactPunch_medium",5],["impactPunch_heavy",5]],dash:[["thrusterFire",5],["laserRetro",5]],projectile:[["laserSmall",5],["laserRetro",5]],beam:[["laserLarge",5],["spaceEngineSmall",5]],bomb:[["explosionCrunch",5],["lowFrequency_explosion",2]],control:[["forceField",5],["computerNoise",4]],mark:[["computerNoise",4],["impactMetal_medium",5]],precision:[["laserRetro",5],["laserSmall",5]],dot:[["thrusterFire",5],["slime",2]],shield:[["forceField",5],["doorClose",3]],area:[["lowFrequency_explosion",2],["explosionCrunch",5]],drain:[["slime",2],["spaceEngineLow",5]],heal:[["forceField",5],["engineCircular",5]],counter:[["impactMetal_medium",5],["impactPunch_heavy",5]],bounce:[["impactSoft_medium",5],["laserRetro",5]],teleport:[["doorOpen",3],["engineCircular",5]]
};
function hashText(value){let hash=2166136261;for(const char of String(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return hash>>>0}
function playAbilitySound(power,universeId){
  if(!state.sound||!power)return;const hash=hashText(`${universeId}:${power.id}`),choices=ABILITY_AUDIO[power.type]||ABILITY_AUDIO.projectile,[family,count]=choices[hash%choices.length],variant=(hash>>>5)%count,path=`assets/sounds/abilities/${family}_${String(variant).padStart(3,"0")}.ogg`;
  if(!abilityAudioCache.has(path)){const base=new Audio(path);base.preload="auto";abilityAudioCache.set(path,base)}
  const audio=abilityAudioCache.get(path).cloneNode();audio.volume=["area","bomb"].includes(power.type)?0.48:0.34;audio.playbackRate=.8+(hash%401)/1000;audio.play().catch(()=>{});
}
function escapeHtml(value) { const node=document.createElement("div"); node.textContent=value; return node.innerHTML; }
function escapeAttr(value) { return String(value).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function showScreen(id) { $$(".screen").forEach(screen => screen.classList.toggle("active", screen.id===id)); }
function showToast(message) { const toast=$("#toast"); toast.textContent=message; toast.classList.add("show"); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove("show"),2400); }
function random() { state.randomSeed=(Math.imul(state.randomSeed,1664525)+1013904223)>>>0; return state.randomSeed/4294967296; }
function room() { return state.multiplayer.room; }
function isHost() { return !!room() && room().hostId===state.multiplayer.clientId; }
function send(payload) { if (state.multiplayer.socket?.readyState===WebSocket.OPEN) state.multiplayer.socket.send(JSON.stringify(payload)); }
const APPEARANCE_OPTIONS={face:["classic","fierce","cyclops","visor"],aura:["none","flame","electric","shadow"],accessory:["none","headband","horns","halo"],pattern:["solid","split","ring","core"]};
const DEFAULT_APPEARANCE={face:"classic",aura:"none",accessory:"none",pattern:"solid"};
function cleanAppearance(value={}){return Object.fromEntries(Object.entries(APPEARANCE_OPTIONS).map(([key,options])=>[key,options.includes(value?.[key])?value[key]:DEFAULT_APPEARANCE[key]]))}
function selectedAppearance(){return cleanAppearance({face:$("#faceStyle").value,aura:$("#auraStyle").value,accessory:$("#accessoryStyle").value,pattern:$("#patternStyle").value})}
function avatarMarkup(appearance,color,extraClass=""){const look=cleanAppearance(appearance);return `<div class="avatar-orb ${extraClass} face-${look.face} aura-${look.aura} accessory-${look.accessory} pattern-${look.pattern}" style="--avatar-color:${escapeAttr(color)}"><span class="avatar-aura"></span><span class="avatar-pattern"></span><span class="avatar-eyes"><i></i><i></i></span><span class="avatar-accessory"></span></div>`}
function updateAvatarPreview(){const preview=$("#lobbyAvatar"),look=selectedAppearance(),color=$("#lobbyColor").value;preview.className=`custom-orb face-${look.face} aura-${look.aura} accessory-${look.accessory} pattern-${look.pattern}`;preview.style.setProperty("--avatar-color",color);preview.innerHTML='<span class="avatar-aura"></span><span class="avatar-pattern"></span><span class="avatar-eyes"><i></i><i></i></span><span class="avatar-accessory"></span>'}
function currentProfile() {
  const name=$("#onlineName").value.trim()||"Игрок",color=$("#onlineColor").value,appearance=selectedAppearance();
  localStorage.setItem("powerRouletteName",name);localStorage.setItem("powerRouletteColor",color);localStorage.setItem("powerRouletteAppearance",JSON.stringify(appearance));return {name,color,appearance};
}

function connectMultiplayer() {
  clearTimeout(state.multiplayer.reconnectTimer);
  if ([WebSocket.OPEN,WebSocket.CONNECTING].includes(state.multiplayer.socket?.readyState)) return;
  const protocol=location.protocol==="https:"?"wss:":"ws:";
  const socket=new WebSocket(`${protocol}//${location.host}/ws`);state.multiplayer.socket=socket;
  socket.addEventListener("open",()=>{if(state.multiplayer.socket!==socket)return;state.multiplayer.reconnectAttempt=0;setRoomMessage("Сервер подключён")});
  socket.addEventListener("message",({data})=>{if(state.multiplayer.socket===socket)handleMessage(JSON.parse(data))});
  socket.addEventListener("close",()=>{
    if(state.multiplayer.socket!==socket)return;
    state.multiplayer.socket=null;
    const attempt=state.multiplayer.reconnectAttempt++,delay=Math.min(8000,750*2**Math.min(attempt,4));
    if(room())showToast("Связь потеряна — переподключаемся…");else setRoomMessage("Сервер просыпается — подключаемся…");
    state.multiplayer.reconnectTimer=setTimeout(connectMultiplayer,delay);
  });
}
function setRoomMessage(message,error=false) { $("#roomMessage").textContent=message; $("#roomMessage").classList.toggle("error",error); }
function handleMessage(message) {
  if (message.type==="hello") {
    state.multiplayer.clientId=message.clientId;
    const code=new URLSearchParams(location.search).get("room");
    if (code&&!state.multiplayer.autoJoined) { state.multiplayer.autoJoined=true; send({type:"join",code:code.toUpperCase(),...currentProfile()}); setRoomMessage("Подключаемся…"); }
  } else if (message.type==="room") {
    const wasHost=isHost(); state.multiplayer.room=message; renderLobby();
    if(state.battle&&!wasHost&&isHost()&&!state.battle.over){cancelAnimationFrame(state.battle.raf);for(const fighter of state.battle.fighters){if(Number.isFinite(fighter.netX)){fighter.x=fighter.netX;fighter.y=fighter.netY}fighter.dotOwner=state.battle.fighters.find(item=>item.id===fighter.dotOwnerId)||fighter.dotOwner||null}state.battle.last=performance.now();state.battle.accumulator=0;state.battle.raf=requestAnimationFrame(battleLoop);showToast("Ты стал ведущим боя");}
    if (!message.started && !["rouletteScreen","battleScreen"].some(id=>$("#"+id).classList.contains("active"))) showScreen("lobbyScreen");
  } else if (message.type==="error") setRoomMessage(message.message,true),showToast(message.message);
  else if (message.type==="left") { state.multiplayer.room=null; showScreen("menuScreen"); }
  else if (message.type==="start") beginRoulette(message.players);
  else if (message.type==="spin_request" && isHost()) hostSpinFor(message.senderId);
  else if (message.type==="ability_request" && isHost()) {
    const fighter=state.battle?.fighters.find(item=>item.clientId===message.senderId);
    if(fighter)activateUltimate(fighter);
  }
  else if (message.type==="death_note_request" && isHost()) {
    const fighter=state.battle?.fighters.find(item=>item.clientId===message.senderId);
    if(fighter)activateDeathNote(fighter,message.targetId,message.senderId);
  }
  else if (message.type==="power_request" && isHost()) {
    const fighter=state.battle?.fighters.find(item=>item.clientId===message.senderId);
    if(fighter)activatePowerFor(fighter,message.senderId,message.x,message.y);
  }
  else if (message.type==="attack_request" && isHost()) {
    const fighter=state.battle?.fighters.find(item=>item.clientId===message.senderId);
    if(fighter)performManualAttack(fighter,message.x,message.y);
  }
  else if (message.type==="power_feedback") {showToast(message.message);playSound("click",.32,.7);}
  else if (message.type==="spin_result") performSpin(message.itemId);
  else if (message.type==="advance") advancePhase();
  else if (message.type==="battle_start") startBattle(message.seed);
  else if (message.type==="battle_state" && !isHost()) applyBattleSnapshot(message.battle);
  else if (message.type==="battle_end" && !isHost()) finishBattle(message.winnerId);
  else if (message.type==="home") applyHome();
}

function renderLobby() {
  if (!room()) return;
  $("#roomCode").textContent=room().code;
  $("#onlinePlayers").innerHTML=room().players.map((player,index)=>`<div class="online-player ${player.id===state.multiplayer.clientId?"me":""}">${avatarMarkup(player.appearance,player.color,"player-orb")}<strong>${escapeHtml(player.name)}</strong><small>${index===0?"ВЕДУЩИЙ":`ИГРОК ${index+1}`}</small></div>`).join("");
  const button=$("#startRoulette"); button.disabled=!isHost()||room().players.length<2||room().started;
  button.classList.toggle("hidden",!isHost());
  $("#lobbyHint").textContent=isHost()?room().players.length<2?"Нужен ещё один игрок":`${room().players.length}/10 готовы. Запускай, когда все вошли.`:"Ждём запуска ведущего…";
}
function basePlayer(player,index) { return { id:index,clientId:player.id,name:player.name,color:player.color||PLAYER_COLORS[index],appearance:cleanAppearance(player.appearance),universe:null,race:null,power:null,ultimate:null,attrs:{},damageDone:0,kills:0 }; }
function beginRoulette(players) {
  state.players=players.map(basePlayer); state.turn=0; state.phaseIndex=0; state.rotation=0; state.spinning=false;
  resetDropImpact(true);
  $("#emptyResult").classList.remove("hidden"); $("#resultCard").classList.add("hidden");
  showScreen("rouletteScreen"); updatePhaseUi(); renderWheel(); renderTurnList(); playSound("phase",.55);
}

function currentPhase() { return PHASES[state.phaseIndex]; }
function universalRoulette(id) { return UNIVERSAL_ROULETTES.find(item=>item.id===id); }
function itemsFor(player=state.players[state.turn]) {
  const phase=currentPhase();
  if (phase.type==="universe") return UNIVERSES;
  if (phase.type==="race") return player?.universe?.races||[];
  if (phase.type==="power") return player?.universe?.powers||[];
  if (phase.type==="ultimate") return player?.universe?.ultimates||[];
  return universalRoulette(phase.id)?.options||[];
}
function itemKey(item) { return item.id||item.name; }
function weightedPick(items) {
  const total=items.reduce((sum,item)=>sum+(item.weight||1),0); let pick=random()*total;
  for (const item of items) { pick-=item.weight||1; if (pick<=0) return item; } return items.at(-1);
}
const DROP_RARITIES={common:{label:"ОБЫЧНЫЙ РЕЗУЛЬТАТ"},rare:{label:"РЕДКИЙ РЕЗУЛЬТАТ"},epic:{label:"ЭПИЧЕСКИЙ РЕЗУЛЬТАТ"},legendary:{label:"ЛЕГЕНДАРНОЕ ВЫПАДЕНИЕ"}};
const LEGENDARY_UNIVERSES=new Set(["opm","dragon-ball","gurren","slime","misfit"]),EPIC_UNIVERSES=new Set(["naruto","bleach","one-piece","jujutsu","attack-titan","solo-leveling","eminence","overlord","fate","ragnarok"]);
function rarityForResult(item,phase=currentPhase()){
  if(phase.type==="universal"){const weight=item.weight??99;return weight<=6?"legendary":weight<=20?"epic":weight<=29?"rare":"common"}
  if(phase.type==="universe")return LEGENDARY_UNIVERSES.has(item.id)?"legendary":EPIC_UNIVERSES.has(item.id)?"epic":"rare";
  if(phase.type==="race"){
    if(/Ооцуцуки|Истинный дракон|Божественный дух|Антиспираль|Монарх|Правитель|Высшая луна|Каменный человек|Бог$|Бог смерти/i.test(item.name))return "legendary";
    if(/Демон|Вампир|Шифтер|Лунариан|Арранкар|Саянин|Эльф|Гетероморф|Проклятие|Ева|Слуга/i.test(item.name))return "epic";
    const score=(item.hp||1)*(item.damage||1)*(item.speed||1)*(1+(item.armor||0)*2);return score>=1.34?"epic":score>=1.12?"rare":"common";
  }
  if(phase.type==="power"){
    const name=item.name||"",score=(item.damage||0)+(item.area||0)/10+(item.armorPen||0)*24+(item.multi||1)*2+(item.execute||0)*45+(item.delayed||0)/18+(item.lifesteal||0)*12;
    if(score>=67||/Серьёзный удар|I Am Atomic|Venuzdonoa|Excalibur|Fallen Down|Harkonnen|Колоссальный|Тетрадь смерти/i.test(name))return "legendary";
    if(score>=53||item.damage>=46||item.armorPen>=.7)return "epic";return score>=39?"rare":"common";
  }
  if(phase.type==="ultimate"){
    if(item.type==="atomic"||item.type==="execute"&&item.damage>=225||item.type==="nova"&&item.damage>=180||/GOAL OF ALL LIFE|VENUZDONOA|UNLIMITED BLADE WORKS|ТРЕТИЙ УДАР|АЗАТОТ|GIGA DRILL BREAK|I AM ATOMIC/i.test(item.name))return "legendary";
    return "epic";
  }
  return "common";
}
function resetDropImpact(resetTheme=false){const screen=$("#rouletteScreen"),cinematic=$("#dropCinematic");clearTimeout(resetDropImpact.timer);cinematic.className="drop-cinematic";screen.classList.remove("drop-rare","drop-epic","drop-legendary");if(resetTheme)screen.classList.remove("rarity-theme-rare","rarity-theme-epic","rarity-theme-legendary")}
function playDropSound(rarity,item){
  const hash=hashText(`${currentPhase().id}:${itemKey(item)}`);playSound("reveal",rarity==="legendary"?.82:rarity==="epic"?.7:.52,rarity==="legendary"?.78:1);
  if(rarity==="common")return;
  if(rarity==="rare"){playPathSound(`assets/sounds/abilities/forceField_${String(hash%5).padStart(3,"0")}.ogg`,.42,.98,40);return}
  playPathSound(`assets/sounds/abilities/impactPunch_heavy_${String(hash%5).padStart(3,"0")}.ogg`,rarity==="legendary"?.72:.56,rarity==="legendary"?.72:.88,30);
  playPathSound(`assets/sounds/abilities/${rarity==="legendary"?"lowFrequency_explosion":"forceField"}_${String(hash%(rarity==="legendary"?2:5)).padStart(3,"0")}.ogg`,rarity==="legendary"?.78:.5,.82,100);
  if(rarity==="legendary"){playPathSound(`assets/sounds/abilities/explosionCrunch_${String((hash>>>4)%5).padStart(3,"0")}.ogg`,.62,.76,190);playPathSound(`assets/sounds/abilities/laserLarge_${String((hash>>>8)%5).padStart(3,"0")}.ogg`,.48,.68,260)}
}
function triggerDropImpact(item,rarity){
  const screen=$("#rouletteScreen"),cinematic=$("#dropCinematic"),hash=hashText(itemKey(item));resetDropImpact(true);if(rarity!=="common")screen.classList.add(`rarity-theme-${rarity}`);screen.style.setProperty("--result-color",item.color||state.players[state.turn]?.universe?.color||"#ff5c4d");
  $("#dropRarity").textContent=DROP_RARITIES[rarity].label;$("#dropName").textContent=item.name;const colors=rarity==="legendary"?["#fff6af","#ffd54a","#ff7b31","#fff"]:rarity==="epic"?["#d9a4ff","#934dff","#ff64d4","#fff"]:["#8cecff","#4fbeff","#fff"];
  const count=rarity==="legendary"?42:rarity==="epic"?30:rarity==="rare"?18:0;$("#dropParticles").innerHTML=Array.from({length:count},(_,index)=>{const angle=(index/count*360+(hash%17)).toFixed(1),distance=180+(index*37+hash)%620,size=5+(index*11+hash)%22,delay=((index%7)*.018).toFixed(3),color=colors[index%colors.length];return `<i style="--angle:${angle}deg;--distance:${distance}px;--size:${size}px;--delay:${delay}s;--particle-color:${color}"></i>`}).join("");
  void cinematic.offsetWidth;cinematic.className=`drop-cinematic ${rarity} active`;if(rarity!=="common")screen.classList.add(`drop-${rarity}`);playDropSound(rarity,item);resetDropImpact.timer=setTimeout(()=>{cinematic.className="drop-cinematic";screen.classList.remove("drop-rare","drop-epic","drop-legendary")},rarity==="legendary"?2250:1850);
}
function renderWheel() {
  const items=itemsFor();
  const palette=["#17171c","#d8ff45","#ff5c4d","#8962ff","#f1cc37","#58ccef","#f3f0e7"];
  const slice=360/items.length,offset=-slice/2;
  const sectors=items.map((_,index)=>`${palette[index%palette.length]} ${index*slice}deg ${(index+1)*slice}deg`).join(",");
  const wheel=$("#wheel");wheel.style.background=`conic-gradient(from ${offset}deg,${sectors})`;wheel.dataset.segments=String(items.length);
  $("#wheelItems").innerHTML=items.map((item,index)=>`<div class="wheel-item" style="--angle:${index*360/items.length}deg;--item-size:${items.length>12?30:44}px" title="${escapeAttr(item.name)}"><img src="${item.icon}" alt=""></div>`).join("");
}
function renderTurnList() {
  $("#turnPlayers").innerHTML=state.players.map((player,index)=>{
    const result=resultForPhase(player); return `<div class="turn-row ${index===state.turn?"active":""} ${result?"done":""}"><span class="turn-dot" style="background:${player.color}"></span><div><strong>${escapeHtml(player.name)}</strong><small>${result?result.name:index===state.turn?"КРУТИТ":"ЖДЁТ"}</small></div>${result?`<img src="${result.icon}" alt="">`:`<span>${index===state.turn?"▶":""}</span>`}</div>`;
  }).join("");
  $("#currentPlayerName").textContent=state.players[state.turn]?.name||"ЭТАП ЗАВЕРШЁН"; updateAuthority();
}
function resultForPhase(player) {
  const id=currentPhase().id;if(id==="universe")return player.universe;if(id==="race")return player.race;if(id==="power")return player.power;if(id==="ultimate")return player.ultimate;return player.attrs[id];
}
function updatePhaseUi() {
  const phase=currentPhase(); $("#phaseNumber").textContent=`ЭТАП ${state.phaseIndex+1} ИЗ ${PHASES.length}`; $("#phaseName").textContent=phase.name;
  $("#phaseDots").innerHTML=PHASES.map((_,index)=>`<i class="${index<state.phaseIndex?"done":index===state.phaseIndex?"active":""}"></i>`).join("");
  $("#spinHint").textContent=phase.type==="race"?"В колесе только расы выпавшей вселенной":phase.type==="power"?"Пять уникальных сил именно этой вселенной":phase.type==="ultimate"?"Один из пяти ультимейтов этой вселенной попадёт на F":phase.type==="universal"?"Общая характеристика влияет на формулы боя":`${UNIVERSES.length} проработанных вселенных — решает случай`;
}
function updateAuthority() {
  const button=$("#spinButton"),player=state.players[state.turn],complete=state.turn>=state.players.length;
  const connected=room()?.players.some(item=>item.id===player?.clientId); const allowed=complete?isHost():player?.clientId===state.multiplayer.clientId||(isHost()&&!connected);
  button.disabled=state.spinning||!allowed;
  if (complete) { button.querySelector("span").textContent=state.phaseIndex===PHASES.length-1?"НАЧАТЬ БИТВУ":"СЛЕДУЮЩАЯ РУЛЕТКА"; button.querySelector("b").textContent=state.phaseIndex===PHASES.length-1?"⚔":"→"; }
  else { button.querySelector("span").textContent="КРУТИТЬ КОЛЕСО"; button.querySelector("b").textContent="↻"; }
}
function hostSpinFor(senderId) {
  if (state.spinning) return; const player=state.players[state.turn]; if (!player||player.clientId!==senderId) return;
  const result=weightedPick(itemsFor(player)); send({type:"spin_result",itemId:itemKey(result)});
}
function requestSpin() {
  if (state.spinning) return;
  if (state.turn>=state.players.length) {
    if (!isHost()) return;
    $("#spinButton").disabled=true;
    if (state.phaseIndex===PHASES.length-1) send({type:"battle_start",seed:crypto.getRandomValues(new Uint32Array(1))[0]}); else send({type:"advance"});
    return;
  }
  const player=state.players[state.turn],connected=room().players.some(item=>item.id===player.clientId);
  if (player.clientId!==state.multiplayer.clientId&&!(isHost()&&!connected)) return;
  if (isHost()) { $("#spinButton").disabled=true; const result=weightedPick(itemsFor(player)); send({type:"spin_result",itemId:itemKey(result)}); }
  else { send({type:"spin_request"}); $("#spinButton").disabled=true; $("#spinHint").textContent="Ведущий подтверждает вращение…"; }
}
function assignResult(player,item) {
  const id=currentPhase().id;if(id==="universe")player.universe=item;else if(id==="race")player.race=item;else if(id==="power")player.power=item;else if(id==="ultimate")player.ultimate=item;else player.attrs[id]=item;
}
function performSpin(forcedId) {
  if (state.spinning||state.turn>=state.players.length) return; const items=itemsFor(),item=items.find(value=>itemKey(value)===forcedId)||items[0];
  resetDropImpact(true);state.spinning=true; $("#spinButton").disabled=true; $("#spinHint").textContent="Колесо переписывает реальность…";
  const visible=items,index=Math.max(0,visible.findIndex(value=>itemKey(value)===forcedId)),slice=360/visible.length;
  const start=state.rotation,current=((start%360)+360)%360,target=(360-index*slice)%360;
  state.rotation=start+((target-current+360)%360)+5*360;
  animateWheel(start,state.rotation,4400,slice,()=>{
    const player=state.players[state.turn]; assignResult(player,item); showResult(item); state.turn++; state.spinning=false; renderTurnList();
    if(state.turn<state.players.length){renderWheel();$("#spinHint").textContent=`${player.name} получает: ${item.name}`;}else{$("#currentPlayerName").textContent=`«${currentPhase().name}» ЗАВЕРШЕНА`;$("#spinHint").textContent=state.phaseIndex===PHASES.length-1?"Все бойцы собраны. Пора на арену.":"Ведущий запускает следующую рулетку.";}
    updateAuthority();
  });
}
function animateWheel(start,end,duration,slice,done){
  const wheel=$("#wheel"),began=performance.now(),spinSounds=new Set();let lastSector=Math.floor(start/slice);
  const wheelSound=(name,volume,rate=1)=>{const sound=playSound(name,volume,rate);if(sound){spinSounds.add(sound);sound.addEventListener("ended",()=>spinSounds.delete(sound),{once:true});}};
  const stopWheelSounds=()=>{for(const sound of spinSounds){sound.pause();sound.currentTime=0}spinSounds.clear()};
  wheel.style.transition="none";wheelSound("wheel-spin",.28);
  function frame(now){
    const t=Math.min(1,(now-began)/duration),ease=1-Math.pow(1-t,3),angle=start+(end-start)*ease,sector=Math.floor(angle/slice);
    wheel.style.transform=`rotate(${angle}deg)`;
    if(sector!==lastSector&&t<.985){const pace=.78+Math.min(1.25,(sector-lastSector)*.08);wheelSound("tick",.18,pace);lastSector=sector;}
    if(t<1)requestAnimationFrame(frame);else{wheel.style.transform=`rotate(${end}deg)`;stopWheelSounds();done();}
  }
  requestAnimationFrame(frame);
}
function showResult(item) {
  const rarity=rarityForResult(item),card=$("#resultCard");$("#emptyResult").classList.add("hidden");card.classList.remove("hidden");card.className=`result-card rarity-${rarity}`;$("#resultRarity").textContent=DROP_RARITIES[rarity].label; $("#resultImage").src=item.icon; $("#resultName").textContent=item.name; $("#resultType").textContent=currentPhase().name;
  $("#resultDescription").textContent=item.description||item.trait||item.subtitle||item.label||"Результат будет учтён в бою.";
  $("#resultCard").style.setProperty("--result-color",item.color||state.players[Math.max(0,state.turn)]?.universe?.color||"#ff5c4d");
  const stats=[];if(item.damage)stats.push(item.damage<3?`УСИЛЕНИЕ ×${item.damage}`:`УРОН ${item.damage}`);if(item.tickRate)stats.push(`ТИК ${item.tickRate}с`);if(item.cooldown)stats.push(`КД ${item.cooldown}с`);if(item.range)stats.push(`ДАЛЬНОСТЬ ${item.range}`);if(item.hp)stats.push(`HP ×${item.hp}`);if(item.armor)stats.push(`БРОНЯ ${Math.round(item.armor*100)}%`);if(item.label)stats.push(item.label);
  $("#resultStats").innerHTML=stats.map(value=>`<span>${value}</span>`).join("");triggerDropImpact(item,rarity);
}
function advancePhase() {
  if (state.phaseIndex>=PHASES.length-1) return; state.phaseIndex++;state.turn=0;state.spinning=false;state.rotation=0;
  $("#wheel").style.transition="none";$("#wheel").style.transform="rotate(0deg)";
  resetDropImpact(true);$("#emptyResult").classList.remove("hidden");$("#resultCard").classList.add("hidden");updatePhaseUi();renderWheel();renderTurnList();playSound("phase",.55);
}

function showBuild() {
  const player=state.players.find(item=>item.clientId===state.multiplayer.clientId)||state.players[0]; if(!player)return;
  $("#buildName").textContent=player.name;
  const rows=[{label:"ВСЕЛЕННАЯ",item:player.universe},{label:"РАСА",item:player.race},{label:"УНИКАЛЬНАЯ СИЛА",item:player.power},{label:"УЛЬТИМЕЙТ НА F",item:player.ultimate},...UNIVERSAL_ROULETTES.map(r=>({label:r.name,item:player.attrs[r.id]}))].filter(row=>row.item);
  $("#buildContent").innerHTML=rows.map(row=>`<div class="build-row"><img src="${row.item.icon}" alt=""><div><small>${row.label}</small><strong>${escapeHtml(row.item.name)}</strong></div></div>`).join("");$("#buildModal").classList.remove("hidden");
}

// ---------------- Clean arena engine ----------------
const canvas=$("#arena"),ctx=canvas.getContext("2d"),images=new Map();
let lastUltimateEventId=0,lastActionEventId=0;
function imageFor(src){if(!images.has(src)){const image=new Image();image.src=src;images.set(src,image);}return images.get(src);}
let arenaBackdropCache=null;
function drawArenaBackdrop(W,H){
  const backdrop=imageFor("assets/arena-multiverse-v2.png");if(!arenaBackdropCache&&backdrop.complete&&backdrop.naturalWidth){const layer=document.createElement("canvas");layer.width=W;layer.height=H;const paint=layer.getContext("2d");paint.fillStyle="#06060a";paint.fillRect(0,0,W,H);paint.globalAlpha=.86;paint.drawImage(backdrop,0,0,W,H);paint.globalAlpha=1;const shade=paint.createRadialGradient(W/2,H/2,40,W/2,H/2,W*.65);shade.addColorStop(0,"rgba(5,7,14,.08)");shade.addColorStop(1,"rgba(2,2,6,.5)");paint.fillStyle=shade;paint.fillRect(0,0,W,H);paint.save();paint.translate(W/2,H/2);paint.strokeStyle="rgba(127,190,255,.12)";paint.lineWidth=1;for(let radius=70;radius<620;radius+=70){paint.beginPath();paint.ellipse(0,30,radius,radius*.54,0,0,Math.PI*2);paint.stroke()}for(let ray=0;ray<24;ray++){const angle=ray*Math.PI/12;paint.beginPath();paint.moveTo(Math.cos(angle)*35,30+Math.sin(angle)*20);paint.lineTo(Math.cos(angle)*650,30+Math.sin(angle)*350);paint.stroke()}paint.restore();arenaBackdropCache=layer}else if(!backdrop._arenaHook){backdrop._arenaHook=true;backdrop.addEventListener("load",()=>{arenaBackdropCache=null},{once:true})}if(arenaBackdropCache)ctx.drawImage(arenaBackdropCache,0,0);else{ctx.fillStyle="#06060a";ctx.fillRect(0,0,W,H)}}
function stat(player,id,key,fallback=1){return player.attrs[id]?.stats?.[key]??fallback;}
function addStat(player,key){return ["iq","combat","luck"].reduce((sum,id)=>sum+(player.attrs[id]?.stats?.[key]||0),0);}
function fighterUltimate(fighter){return fighter?.ultimate||fighter?.universe?.ultimate||null}
function startBattle(seed) {
  state.randomSeed=seed>>>0;state.speed=1;$("#battleSpeed").textContent="×1";$("#battleSpeed").disabled=!isHost();$("#winnerModal").classList.add("hidden");showScreen("battleScreen");
  const W=canvas.width,H=canvas.height,padding=92;
  const fighters=state.players.map((player,index)=>{
    const angle=index/state.players.length*Math.PI*2-Math.PI/2,r=player.race,p=player.power;
    const maxHp=Math.round(1000*r.hp*stat(player,"durability","hp")*stat(player,"height","hp"));
    const size=Math.max(17,Math.min(54,27*r.size*stat(player,"height","size"))),moveSpeed=112*r.speed*stat(player,"speed","speed")*stat(player,"height","speed");
    const direction=random()*Math.PI*2;
    return {...player,ultimate:player.ultimate||player.universe.ultimate,x:W/2+Math.cos(angle)*(W/2-padding),y:H/2+Math.sin(angle)*(H/2-padding),vx:Math.cos(direction)*moveSpeed,vy:Math.sin(direction)*moveSpeed,moveSpeed,radius:size,hp:maxHp,maxHp,armor:Math.min(.28,r.armor+stat(player,"durability","armor",0)),damageMult:r.damage*stat(player,"strength","damage"),cooldown:p.cooldown*stat(player,"iq","cooldown"),crit:Math.max(0,Math.min(.42,(p.crit||0)+addStat(player,"crit"))),dodge:Math.max(0,Math.min(.3,(p.dodge||0)+addStat(player,"dodge"))),alive:true,shield:0,lastPower:-99,lastBasic:-99,stunnedUntil:0,dotUntil:0,nextDot:0,dotDamage:0,dotOwner:null,reviveAvailable:!!player.attrs.luck?.stats?.revive,revives:0,damageDone:0,kills:0,attacks:0,hits:0,dodges:0,blocks:0,hitFlash:0,attackFlash:0,attackAngle:direction,ultimateReadyAt:0,ultimateActiveUntil:0,ultimateDamageMult:1,ultimateSpeedMult:1,ultimateLifesteal:0,ultimateDodge:0,slowedUntil:0,slowFactor:1,cagedUntil:0,cageOwnerId:null,cageColor:null,deathNoteUsed:false,deathNoteTargetId:null};
  });
  lastUltimateEventId=0;lastActionEventId=0;
  state.battle={fighters,projectiles:[],effects:[],blood:[],texts:[],delayed:[],ultimatePulses:[],ultimateEvent:null,ultimateEventId:0,actionEvents:[],actionEventId:0,feed:[],time:0,serverTime:0,last:performance.now(),accumulator:0,over:false,resultShown:false,lastSync:0,lastHudRender:0,powerAiming:false,aimX:W/2,aimY:H/2,zone:{left:8,right:W-8,top:8,bottom:H-8,start:50,duration:55,maxX:205,maxY:120,announced:false},raf:null};
  renderFighterList();addFeed("Бой начался. <b>Никаких помощников и ловушек.</b>");showBattleBanner("assets/icons/stat-combat.png","ЧИСТАЯ БИТВА","Только способности, отскоки и столкновения");
  startBattleMusic();
  state.battle.raf=requestAnimationFrame(isHost()?battleLoop:battleViewLoop);
}
function battleLoop(now) {
  const b=state.battle;if(!b)return;const dt=Math.min(.1,(now-b.last)/1000||0);b.last=now;b.accumulator+=dt*state.speed;
  while(!b.over&&b.accumulator>=1/60){updateBattle(1/60);b.time+=1/60;b.accumulator-=1/60;}drawBattle();syncBattle(now);b.raf=requestAnimationFrame(battleLoop);
}
function battleViewLoop(now) {const b=state.battle;if(!b)return;const dt=Math.min(.1,(now-b.last)/1000||0);b.last=now;if(!b.over){b.time+=dt;const correction=(b.serverTime??b.time)-b.time;b.time+=Math.max(-.08,Math.min(.08,correction))*Math.min(1,dt*8)}for(const fighter of b.fighters){if(!Number.isFinite(fighter.netX))continue;const blend=Math.min(1,dt*14);fighter.x+=(fighter.netX-fighter.x)*blend;fighter.y+=(fighter.netY-fighter.y)*blend}for(const shot of b.projectiles){shot.x+=shot.vx*dt;shot.y+=shot.vy*dt}b.effects.forEach(effect=>effect.life=Math.max(0,effect.life-dt));b.blood?.forEach(drop=>drop.life=Math.max(0,drop.life-dt));b.texts.forEach(text=>{text.life=Math.max(0,text.life-dt);text.y-=25*dt});drawBattle();b.raf=requestAnimationFrame(battleViewLoop);}
function updateBattle(dt) {
  const b=state.battle,alive=b.fighters.filter(f=>f.alive);updateZone();updateUltimates();
  for(const f of alive){
    f.hitFlash=Math.max(0,f.hitFlash-dt*4);f.attackFlash=Math.max(0,f.attackFlash-dt*3);
    if(f.dotUntil>b.time&&b.time>=f.nextDot){f.nextDot=b.time+1;dealDamage(f,f.dotDamage,f.dotOwner,{name:"длительный эффект",armorPen:0},false);}
    if(/Намекианец|Демон|Гуль|Вампир|Гомункул|Гибрид/.test(f.race.name)&&b.time>=(f.nextRegen||0)){f.nextRegen=b.time+1.5;f.hp=Math.min(f.maxHp,f.hp+Math.max(2,f.maxHp*.004));}
    if(b.time<f.stunnedUntil)continue;
    const active=b.time<f.ultimateActiveUntil,slowed=b.time<f.slowedUntil;
    const speed=f.moveSpeed*(active?f.ultimateSpeedMult:1)*(slowed?f.slowFactor:1),mag=Math.hypot(f.vx,f.vy)||1;f.vx=f.vx/mag*speed;f.vy=f.vy/mag*speed;f.x+=f.vx*dt;f.y+=f.vy*dt;bounceWalls(f);
  }
  for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++)resolveCollision(alive[i],alive[j]);
  updateProjectiles(dt);updateDelayed();
  b.effects.forEach(e=>e.life-=dt);b.effects=b.effects.filter(e=>e.life>0);b.blood.forEach(drop=>drop.life-=dt);b.blood=b.blood.filter(drop=>drop.life>0);b.texts.forEach(t=>{t.y-=25*dt;t.life-=dt});b.texts=b.texts.filter(t=>t.life>0);
  updateHud();const survivors=b.fighters.filter(f=>f.alive);if(survivors.length<=1&&!b.over)endBattle(survivors[0]||null);if(b.time>180&&!b.over)endBattle([...survivors].sort((a,c)=>c.hp-a.hp)[0]||null);
}
function updateZone() {
  const b=state.battle,z=b.zone,progress=Math.max(0,Math.min(1,(b.time-z.start)/z.duration)),ease=progress*progress*(3-2*progress);z.left=8+z.maxX*ease;z.right=canvas.width-8-z.maxX*ease;z.top=8+z.maxY*ease;z.bottom=canvas.height-8-z.maxY*ease;
  if(progress>0&&!z.announced){z.announced=true;addFeed("После 50 секунд <b>зона начинает сужаться</b>.");showBattleBanner("assets/icons/stat-speed.png","ЗОНА СУЖАЕТСЯ","Границы давят внутрь без молний и случайного урона");}
  $("#zoneStatus").textContent=progress<=0?`ЗОНА ЧЕРЕЗ ${Math.max(0,Math.ceil(50-b.time))}с`:progress<1?`ЗОНА: ${Math.round(progress*100)}%`:"ЗОНА: МАКСИМУМ";
}
function localFighter(){return state.battle?.fighters.find(f=>f.clientId===state.multiplayer.clientId)||null}
function attackStyle(fighter){return fighter.universe.battleStyle?.basic||"fist"}
function basicAttackProfile(fighter){return fighter.universe.battleStyle?.attack||{visual:"plainImpact",shape:"cone",reach:112,size:1,damage:1,knockback:105,recovery:.68,sound:"punch"}}
function playBasicSound(style,id=0,universeId="",soundType=""){
  const kind=soundType||({blade:"blade",chainsaw:"metal",kagune:"slime",gun:"metal",trash:"soft",drill:"drill",magic:"magic",psychic:"magic",ki:"laser",alchemy:"magic",notebook:"magic"}[style]||"punch"),hash=hashText(`${universeId}:${id}:${kind}`),variant=hash%5,rate=.82+(hash%37)/100;
  if(kind==="blade"){const bladeVariant=hash%3;playPathSound(`assets/sounds/abilities/rpg-swing${bladeVariant?bladeVariant+1:""}.ogg`,.48,rate);return}
  const families={punch:["impactPunch_medium",5],metal:["impactMetal_medium",5],soft:["impactSoft_medium",5],laser:["laserRetro",5],magic:["forceField",5],slime:["slime",2],drill:["thrusterFire",5]},[family,count]=families[kind]||families.punch,fileVariant=String(variant%count).padStart(3,"0");playPathSound(`assets/sounds/abilities/${family}_${fileVariant}.ogg`,.46,rate);
}
function basicHitTest(fighter,target,angle,profile,reach){
  const dx=target.x-fighter.x,dy=target.y-fighter.y,d=Math.hypot(dx,dy),forward=dx*Math.cos(angle)+dy*Math.sin(angle),side=Math.abs(-dx*Math.sin(angle)+dy*Math.cos(angle));
  if(profile.shape==="line")return forward>=-target.radius*.15&&forward<=reach+target.radius&&side<=profile.size+target.radius*.72;
  if(profile.shape==="burst"){const centerDistance=reach-profile.size*.68,cx=fighter.x+Math.cos(angle)*centerDistance,cy=fighter.y+Math.sin(angle)*centerDistance;return Math.hypot(target.x-cx,target.y-cy)<=profile.size+target.radius;}
  const targetAngle=Math.atan2(dy,dx),difference=Math.abs(Math.atan2(Math.sin(targetAngle-angle),Math.cos(targetAngle-angle))),tolerance=Math.atan2(target.radius*.8,d||1);return d<=reach+target.radius&&difference<=profile.size/2+tolerance;
}
function requestBasicAttack(x,y){const fighter=localFighter(),b=state.battle;if(!fighter?.alive||!b||b.over)return;if(isHost())performManualAttack(fighter,x,y);else send({type:"attack_request",x,y})}
function performManualAttack(fighter,aimX,aimY){
  const b=state.battle,profile=basicAttackProfile(fighter);if(!isHost()||!fighter?.alive||b.over||b.time-fighter.lastBasic<profile.recovery)return;fighter.lastBasic=b.time;fighter.attacks++;
  const angle=Math.atan2(aimY-fighter.y,aimX-fighter.x),style=attackStyle(fighter),reach=profile.reach+fighter.radius*.28,endX=fighter.x+Math.cos(angle)*reach,endY=fighter.y+Math.sin(angle)*reach,event={id:++b.actionEventId,kind:"basic",ownerId:fighter.id,style,universeId:fighter.universe.id,visual:profile.visual,sound:profile.sound};fighter.attackAngle=angle;b.actionEvents.push(event);b.actionEvents=b.actionEvents.slice(-16);lastActionEventId=event.id;playBasicSound(style,event.id,fighter.universe.id,profile.sound);
  b.effects.push({type:"basicStrike",visual:profile.visual,shape:profile.shape,size:profile.size,x:fighter.x,y:fighter.y,targetX:endX,targetY:endY,angle,color:fighter.universe.color,life:.52,maxLife:.52,radius:reach,reach});
  const victims=b.fighters.filter(target=>target.alive&&target!==fighter&&basicHitTest(fighter,target,angle,profile,reach));
  if(!victims.length){addText(endX,endY,"МИМО",fighter.color);return}const base=(20+random()*10)*fighter.damageMult*profile.damage*(b.time>120?1.45:b.time>90?1.2:1),attack={name:`ЛКМ · ${fighter.universe.name}`,armorPen:style==="gun"?.15:0,knockback:profile.knockback,basicVisual:profile.visual,basicAngle:angle};for(const target of victims)dealDamage(target,base,fighter,attack,random()<fighter.crit);
}
function powerFeedback(clientId,message){if(clientId===state.multiplayer.clientId){showToast(message);playSound("click",.32,.7)}else send({type:"power_feedback",targetId:clientId,message})}
function powerCastRange(fighter,power=fighter.power){const close=["melee","drain","counter","dash","bounce","teleport"].includes(power.type);return Math.min(520,(close?power.range+fighter.radius+36:power.range*1.45+fighter.radius))}
function aimedEnemy(fighter,enemies,aimX,aimY){
  const angle=Math.atan2(aimY-fighter.y,aimX-fighter.x),limit=powerCastRange(fighter);
  return enemies.map(target=>{const d=distance(fighter,target),targetAngle=Math.atan2(target.y-fighter.y,target.x-fighter.x),difference=Math.abs(Math.atan2(Math.sin(targetAngle-angle),Math.cos(targetAngle-angle))),tolerance=Math.max(.14,Math.atan2(target.radius+18,d));return {target,d,difference,tolerance}}).filter(item=>item.d<=limit+item.target.radius&&item.difference<=item.tolerance).sort((a,c)=>a.difference*900+a.d*.12-(c.difference*900+c.d*.12))[0]?.target||null;
}
function updateAimFromPointer(event){const b=state.battle;if(!b)return;const rect=canvas.getBoundingClientRect();b.aimX=Math.max(0,Math.min(canvas.width,(event.clientX-rect.left)*canvas.width/rect.width));b.aimY=Math.max(0,Math.min(canvas.height,(event.clientY-rect.top)*canvas.height/rect.height))}
function startPowerAim(){
  const fighter=localFighter(),b=state.battle;if(!fighter?.alive||!b||b.over)return;const remaining=fighter.cooldown-(b.time-fighter.lastPower);if(remaining>0)return showToast(`${fighter.power.name}: перезарядка ${remaining.toFixed(1)}с`);
  if(!Number.isFinite(b.aimX)||!Number.isFinite(b.aimY)){const range=powerCastRange(fighter);b.aimX=fighter.x+Math.cos(fighter.attackAngle)*range;b.aimY=fighter.y+Math.sin(fighter.attackAngle)*range}b.powerAiming=true;startBattleMusic();
}
function cancelPowerAim(){if(state.battle)state.battle.powerAiming=false}
function releasePowerAim(){const b=state.battle;if(!b?.powerAiming)return;b.powerAiming=false;requestPower(b.aimX,b.aimY)}
function requestPower(aimX,aimY){
  const fighter=localFighter(),b=state.battle;if(!fighter?.alive||!b||b.over)return;const x=Math.max(0,Math.min(canvas.width,Number(aimX)||0)),y=Math.max(0,Math.min(canvas.height,Number(aimY)||0));
  if(isHost())activatePowerFor(fighter,fighter.clientId,x,y);else send({type:"power_request",x,y});
}
function activatePowerFor(fighter,clientId,aimX,aimY){
  const b=state.battle;if(!isHost()||!b||b.over||!fighter?.alive)return;const remaining=fighter.cooldown-(b.time-fighter.lastPower);
  if(remaining>0)return powerFeedback(clientId,`${fighter.power.name}: перезарядка ${remaining.toFixed(1)}с`);
  const x=Math.max(0,Math.min(canvas.width,Number(aimX)||0)),y=Math.max(0,Math.min(canvas.height,Number(aimY)||0)),enemies=b.fighters.filter(target=>target.alive&&target!==fighter),target=aimedEnemy(fighter,enemies,x,y);
  fighter.attackAngle=Math.atan2(y-fighter.y,x-fighter.x);if(!target)return powerFeedback(clientId,`${fighter.power.name}: в направлении нет цели`);const result=tryPower(fighter,target);
  if(result==="range")powerFeedback(clientId,`${fighter.power.name}: цель вне показанной зоны`);
}
function requestUltimate(){
  const fighter=localFighter(),b=state.battle;if(!fighter||!fighter.alive||!b||b.over)return;
  if(fighter.universe.id==="death-note")return openDeathNote();
  if(b.time<fighter.ultimateReadyAt)return showToast(`Ульта будет готова через ${(fighter.ultimateReadyAt-b.time).toFixed(1)}с`);
  if(isHost())activateUltimate(fighter);else send({type:"ability_request"});
}
function openDeathNote(){
  const fighter=localFighter(),b=state.battle;if(!fighter?.alive||fighter.universe.id!=="death-note"||!b||b.over)return;
  if(fighter.deathNoteUsed)return showToast("Ты уже вписал одно имя в эту Тетрадь смерти");
  const targets=b.fighters.filter(target=>target.alive&&target!==fighter);if(!targets.length)return showToast("В тетради некому вынести приговор");
  $("#deathNoteTargets").innerHTML=targets.map(target=>`<button class="death-note-target" data-target-id="${target.id}"><span class="fighter-face" style="background:${escapeAttr(target.color)}"></span><span><b>${escapeHtml(target.name)}</b><small>${escapeHtml(target.universe.name)} · ${Math.ceil(target.hp)} HP</small></span><em>ВПИСАТЬ</em></button>`).join("");
  $("#deathNoteModal").classList.remove("hidden");
}
function closeDeathNote(){$("#deathNoteModal").classList.add("hidden")}
function chooseDeathNoteTarget(targetId){
  const fighter=localFighter();closeDeathNote();if(!fighter?.alive||fighter.deathNoteUsed)return;
  if(isHost())activateDeathNote(fighter,targetId,fighter.clientId);else send({type:"death_note_request",targetId});
}
function activateDeathNote(fighter,targetId,clientId=fighter?.clientId){
  const b=state.battle,target=b?.fighters.find(item=>item.id===Number(targetId));
  if(!isHost()||!b||b.over||!fighter?.alive||fighter.universe.id!=="death-note")return;
  if(fighter.deathNoteUsed)return powerFeedback(clientId,"Тетрадь уже использована в этом бою");
  if(!target?.alive||target===fighter)return powerFeedback(clientId,"Эта цель уже недоступна");
  fighter.deathNoteUsed=true;fighter.deathNoteTargetId=target.id;fighter.ultimateReadyAt=9999;
  const event={id:++b.ultimateEventId,ownerId:fighter.id,ownerName:fighter.name,universeId:"death-note",ultimateId:"death-note-verdict",color:"#dedbd0",icon:"assets/icons/death-notebook.png",name:"ТЕТРАДЬ СМЕРТИ",description:`Имя «${target.name}» записано. Сердце остановится через 40 секунд.`,type:"execute",visual:"notebook",at:b.time};
  b.ultimateEvent=event;lastUltimateEventId=event.id;showUltimateCinematic(event);addText(target.x,target.y,"ИМЯ ЗАПИСАНО","#f4f1e8");
  addFeed(`<b>${escapeHtml(fighter.name)}</b> открывает Тетрадь смерти и вписывает имя <b>${escapeHtml(target.name)}</b>. Приговор исполнится через 40 секунд.`);
  b.ultimatePulses.push({at:b.time+40,kind:"deathNote",ownerId:fighter.id,targetId:target.id,targetName:target.name,name:"Тетрадь смерти",visual:"notebook"});
  for(let ring=0;ring<5;ring++)b.effects.push({type:"ultimate",visual:"notebook",x:target.x,y:target.y,color:"#f4f1e8",life:.5+ring*.14,maxLife:.5+ring*.14,radius:35+ring*27});
}
function activateUltimate(fighter){
  const b=state.battle,ultimate=fighterUltimate(fighter);if(!isHost()||!b||b.over||!fighter?.alive||!ultimate||b.time<fighter.ultimateReadyAt)return;
  if(fighter.universe.id==="death-note")return powerFeedback(fighter.clientId,"Нажми F и выбери имя в Тетради смерти");
  fighter.ultimateReadyAt=b.time+ultimate.cooldown;fighter.ultimateActiveUntil=b.time+ultimate.duration;
  fighter.ultimateDamageMult=1;fighter.ultimateSpeedMult=1;fighter.ultimateLifesteal=0;fighter.ultimateDodge=0;
  const event={id:++b.ultimateEventId,ownerId:fighter.id,ownerName:fighter.name,universeId:fighter.universe.id,ultimateId:ultimate.id,color:fighter.universe.color,icon:ultimate.icon,name:ultimate.name,description:ultimate.description,type:ultimate.type,visual:ultimate.visual,at:b.time};
  b.ultimateEvent=event;lastUltimateEventId=event.id;showUltimateCinematic(event);
  addFeed(`<b>${escapeHtml(fighter.name)}</b> активирует <b>${escapeHtml(ultimate.name)}</b>`);
  const enemies=b.fighters.filter(target=>target.alive&&target!==fighter),power={name:ultimate.name,armorPen:.45,knockback:230,ultimate:true};
  if(["nova","rumbling","atomic"].includes(ultimate.type)){
    const scale=ultimate.type==="atomic"?1.15:1;
    for(const target of enemies)dealDamage(target,ultimate.damage*scale,fighter,power,false);
  }else if(ultimate.type==="execute"){
    const target=[...enemies].sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0];
    if(target){addText(target.x,target.y,"ИМЯ ЗАПИСАНО","#f4f1e8");b.ultimatePulses.push({at:b.time+ultimate.duration,kind:"execute",ownerId:fighter.id,targetId:target.id,damage:ultimate.damage,name:ultimate.name});}
  }else if(ultimate.type==="timeStop"){
    for(const target of enemies){target.stunnedUntil=Math.max(target.stunnedUntil,b.time+ultimate.duration);dealDamage(target,ultimate.damage,fighter,{...power,knockback:0},false);}
  }else if(ultimate.type==="sharingan"){
    fighter.ultimateDodge=ultimate.dodge||.25;
    for(const target of enemies){target.slowedUntil=Math.max(target.slowedUntil,b.time+ultimate.duration);target.slowFactor=ultimate.slow||.4;addText(target.x,target.y,"ЗАМЕДЛЕНИЕ","#ff4747");}
  }else if(ultimate.type==="domain"&&ultimate.cage){
    const target=nearestEnemy(fighter,enemies),tickRate=ultimate.tickRate||.5,pulses=Math.max(1,Math.floor(ultimate.duration/tickRate));
    if(target){target.stunnedUntil=Math.max(target.stunnedUntil,b.time+ultimate.duration);target.cagedUntil=b.time+ultimate.duration;target.cageOwnerId=fighter.id;target.cageColor=fighter.universe.color;addText(target.x,target.y,"ЗАПЕРТ В ТЕРРИТОРИИ",fighter.universe.color);for(let index=0;index<pulses;index++)b.ultimatePulses.push({at:b.time+tickRate*(index+1),kind:"cage",ownerId:fighter.id,targetId:target.id,damage:ultimate.damage||15,name:ultimate.name,visual:ultimate.visual});}
  }else if(["bladeStorm","domain"].includes(ultimate.type)){
    const pulses=ultimate.type==="bladeStorm"?6:5;
    for(let index=0;index<pulses;index++)b.ultimatePulses.push({at:b.time+.45+index*.72,kind:"wave",ownerId:fighter.id,damage:ultimate.damage,name:ultimate.name,slow:ultimate.slow||0,visual:ultimate.visual});
  }else if(["buff","berserk","armorBreak"].includes(ultimate.type)){
    fighter.ultimateDamageMult=ultimate.damage||1.3;fighter.ultimateSpeedMult=ultimate.speed||1.18;fighter.ultimateLifesteal=ultimate.heal||0;fighter.ultimateDodge=ultimate.dodge||0;
    if(ultimate.type==="armorBreak")fighter.shield=Math.max(fighter.shield,ultimate.shield||70);
  }else if(ultimate.type==="alchemy"){
    fighter.hp=Math.min(fighter.maxHp,fighter.hp+(ultimate.heal||220));fighter.ultimateDamageMult=ultimate.damage||1.25;fighter.shield=Math.max(fighter.shield,ultimate.shield||110);addText(fighter.x,fighter.y,`+${ultimate.heal||220} HP`,"#d8ff45");
  }
  for(let ring=0;ring<5;ring++)b.effects.push({type:"ultimate",visual:ultimate.visual,x:fighter.x,y:fighter.y,color:fighter.universe.color,life:.5+ring*.14,maxLife:.5+ring*.14,radius:35+ring*32});
}
function updateUltimates(){
  const b=state.battle;if(!b?.ultimatePulses)return;
  for(const pulse of b.ultimatePulses){
    if(pulse.done||b.time<pulse.at)continue;pulse.done=true;
    const owner=b.fighters.find(f=>f.id===pulse.ownerId);
    if(pulse.kind==="deathNote"){
      const target=b.fighters.find(f=>f.id===pulse.targetId);if(!target?.alive||!owner)continue;target.reviveAvailable=false;target.hp=0;knockOut(target,owner,{name:"Тетрадь смерти"},true);
    }else if(!owner?.alive)continue;
    else if(pulse.kind==="execute"){
      const target=b.fighters.find(f=>f.id===pulse.targetId);if(!target?.alive)continue;
      const damage=target.hp/target.maxHp<=.38?target.hp+1:pulse.damage;dealDamage(target,damage,owner,{name:pulse.name,armorPen:1,ultimate:true},false);
    }else if(pulse.kind==="cage"){
      const target=b.fighters.find(f=>f.id===pulse.targetId);if(!target?.alive)continue;dealDamage(target,pulse.damage,owner,{name:pulse.name,armorPen:.35,knockback:0,ultimate:true,sureHit:true},false);b.effects.push({type:"cagePulse",visual:pulse.visual,x:target.x,y:target.y,color:owner.universe.color,life:.38,maxLife:.38,radius:target.radius+22});
    }else{
      for(const target of b.fighters.filter(f=>f.alive&&f!==owner)){
        dealDamage(target,pulse.damage,owner,{name:pulse.name,armorPen:.55,knockback:90,ultimate:true},false);
        if(pulse.slow){target.slowedUntil=Math.max(target.slowedUntil,b.time+1.2);target.slowFactor=pulse.slow;}
      }
      b.effects.push({type:"ultimate",x:owner.x,y:owner.y,color:owner.universe.color,life:.7,maxLife:.7,radius:45});
    }
  }
  b.ultimatePulses=b.ultimatePulses.filter(pulse=>!pulse.done);
}
function showUltimateCinematic(event){
  if(!event)return;const panel=$("#ultimateCinematic");
  const visual=String(event.visual||"energy").replace(/[^a-z0-9_-]/gi,"");panel.className=`ultimate-cinematic ${event.universeId} visual-${visual}`;panel.style.setProperty("--ultimate-color",event.color||"#9b65ff");
  $("#ultimateImage").src=event.icon;$("#ultimateOwner").textContent=`${event.ownerName} · АКТИВАЦИЯ F`;$("#ultimateName").textContent=event.name;$("#ultimateDescription").textContent=event.description;
  battleMusic.volume=.07;playUltimateSound(event);const shell=$(".arena-shell");shell?.classList.remove("impact");requestAnimationFrame(()=>shell?.classList.add("impact"));
  clearTimeout(showUltimateCinematic.timer);showUltimateCinematic.timer=setTimeout(()=>{panel.className="ultimate-cinematic hidden";shell?.classList.remove("impact");if(state.sound)battleMusic.volume=.19},1950);
}
function bounceWalls(f){const z=state.battle.zone;if(f.x<z.left+f.radius){f.x=z.left+f.radius;f.vx=Math.abs(f.vx)}if(f.x>z.right-f.radius){f.x=z.right-f.radius;f.vx=-Math.abs(f.vx)}if(f.y<z.top+f.radius){f.y=z.top+f.radius;f.vy=Math.abs(f.vy)}if(f.y>z.bottom-f.radius){f.y=z.bottom-f.radius;f.vy=-Math.abs(f.vy)}}
function nearestEnemy(f,list){return list.filter(x=>x!==f&&x.alive).sort((a,b)=>distance(f,a)-distance(f,b))[0]||null}function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function resolveCollision(a,b){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.radius+b.radius;if(!d||d>=min)return;const nx=dx/d,ny=dy/d,overlap=min-d;a.x-=nx*overlap/2;a.y-=ny*overlap/2;b.x+=nx*overlap/2;b.y+=ny*overlap/2;const va=a.vx*nx+a.vy*ny,vb=b.vx*nx+b.vy*ny,diff=vb-va;a.vx+=diff*nx;a.vy+=diff*ny;b.vx-=diff*nx;b.vy-=diff*ny}
function basicAttack(attacker,target){const b=state.battle;if(!attacker.alive||!target.alive||b.time-attacker.lastBasic<1.25)return;attacker.lastBasic=b.time;attacker.attacks++;const zenkai=/Саянин/.test(attacker.race.name)&&attacker.hp/attacker.maxHp<.35?1.2:1,base=(20+random()*10)*attacker.damageMult*zenkai*(b.time>120?1.45:b.time>90?1.2:1);dealDamage(target,base,attacker,{name:"обычный удар",armorPen:0,knockback:90},random()<attacker.crit)}
function abilityVisual(power){const value=`${power.id} ${power.name}`.toLowerCase();if(/casull|jackal|harkonnen|пистолет|винтов|пушк/.test(value))return "gun";if(/3r|umbrella|zanka|ripper|mankira|жизненн|зонт|посох занки|ножниц/.test(value))return "graffiti";if(/zoltraak|excalibur|fallen.down|jio.graze/.test(value))return "runeBeam";if(/gate.babylon/.test(value))return "swordRain";if(/drill|spiral|бур|спирал/.test(value))return "drill";if(/chainsaw|бензопил/.test(value))return "chainsaw";if(/kagune|rinkaku|ukaku|koukaku|bikaku|кагун|parasite|migi|паразит|миги|щупал|black.dog|баскерв/.test(value))return "kagune";if(/notebook|shinigami|тетрад|приговор/.test(value))return "notebook";if(/alchemy|transmut|алхим|трансмута|source|исток/.test(value))return "alchemy";if(/sun|fire|flame|magma|огн|солн/.test(value)&&/breath|slash|sword|blade|katana|клин|меч|дыхани/.test(value))return "fireBlade";if(/water|вода|водн/.test(value)&&/breath|slash|sword|blade|katana|клин|меч|дыхани/.test(value))return "waterBlade";if(/thunder|lightning|chidori|electric|молн|гром/.test(value))return "lightning";if(/slash|sword|blade|katana|zangetsu|breath|claw|dagger|knife|spear|volundr|клин|меч|дыхани|копь|вёльунд|venu|gae.bolg|bayonet|штык/.test(value))return "blade";if(/fire|flame|magma|atomic|explosion|bomb|огн|взрыв/.test(value))return "explosion";if(/shadow|dark|curse|тен|тьм/.test(value))return "shadow";if(/psychic|telekin|mind|domain|at-field|псих|телекин|demon.eyes|глаз/.test(value))return "psychic";return power.type}
function emitActionEvent(attacker,target){
  const b=state.battle,power=attacker.power,event={id:++b.actionEventId,ownerId:attacker.id,powerId:power.id,type:power.type,universeId:attacker.universe.id};attacker.attackAngle=Math.atan2((target?.y??attacker.y)-attacker.y,(target?.x??attacker.x)-attacker.x);b.actionEvents.push(event);b.actionEvents=b.actionEvents.slice(-16);lastActionEventId=event.id;playAbilitySound(power,attacker.universe.id);
  b.effects.push({type:"cast",powerType:power.type,visual:abilityVisual(power),x:attacker.x,y:attacker.y,targetX:target?.x??attacker.x,targetY:target?.y??attacker.y,color:attacker.universe.color,life:.62,maxLife:.62,radius:attacker.radius+8});addText(attacker.x,attacker.y+attacker.radius+36,power.name.toUpperCase(),attacker.universe.color);
}
function tryPower(attacker,target){const b=state.battle,p=attacker.power;if(b.time-attacker.lastPower<attacker.cooldown)return "cooldown";const d=distance(attacker,target),selfCast=["heal","shield"].includes(p.type),bodyReach=attacker.radius+target.radius;if(!selfCast&&["melee","drain","counter","dash","bounce","teleport"].includes(p.type)&&d>p.range+bodyReach)return "range";const ranged=["projectile","beam","bomb","control","mark","precision","dot","area"].includes(p.type);if(ranged&&d>p.range*1.45+bodyReach)return "range";attacker.lastPower=b.time;attacker.attacks++;attacker.attackFlash=1;emitActionEvent(attacker,target);
  if(p.type==="dash"){const angle=Math.atan2(target.y-attacker.y,target.x-attacker.x),travel=Math.min(145,Math.max(20,d-target.radius-attacker.radius-5));attacker.x+=Math.cos(angle)*travel;attacker.y+=Math.sin(angle)*travel;attacker.vx=Math.cos(angle)*attacker.moveSpeed*1.8;attacker.vy=Math.sin(angle)*attacker.moveSpeed*1.8;state.battle.effects.push({type:"dash",x:attacker.x-Math.cos(angle)*travel,y:attacker.y-Math.sin(angle)*travel,targetX:attacker.x,targetY:attacker.y,color:attacker.universe.color,life:.4,maxLife:.4,radius:attacker.radius})}
  if(p.type==="teleport"){const angle=random()*Math.PI*2;attacker.x=target.x+Math.cos(angle)*(target.radius+attacker.radius+8);attacker.y=target.y+Math.sin(angle)*(target.radius+attacker.radius+8)}
  if(["projectile","beam","bomb","dot","mark","precision"].includes(p.type)){shootPower(attacker,target);return "ok"}
  if(p.type==="shield")attacker.shield=Math.min(180,attacker.shield+(p.shield||70));if(p.type==="heal")attacker.hp=Math.min(attacker.maxHp,attacker.hp+(p.heal||55));
  const multiplier=(p.multi?1+(p.multi-1)*.12:1)*(b.time>120?1.45:b.time>90?1.2:1),damage=p.damage*.78*attacker.damageMult*multiplier*(.9+random()*.2);
  const targets=p.area?b.fighters.filter(f=>f.alive&&f!==attacker&&distance(target,f)<p.area):[target];for(const victim of targets)dealDamage(victim,damage,attacker,p,random()<attacker.crit);
  return "ok";
}
function shootPower(attacker,target){const p=attacker.power,angle=Math.atan2(target.y-attacker.y,target.x-attacker.x),speed=p.type==="beam"?470:p.type==="mark"?540:p.type==="bomb"?310:360;state.battle.projectiles.push({x:attacker.x,y:attacker.y,startX:attacker.x,startY:attacker.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,ownerId:attacker.id,powerId:p.id,powerType:p.type,color:attacker.universe.color,life:Math.max(1.35,p.range/speed+1.1),maxLife:Math.max(1.35,p.range/speed+1.1),angle,radius:p.type==="beam"?18:p.type==="bomb"?15:11});}
function updateProjectiles(dt){const b=state.battle,alive=b.fighters.filter(f=>f.alive);for(const shot of b.projectiles){shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;const owner=b.fighters.find(f=>f.id===shot.ownerId),p=owner?.power;if(!owner||!p)continue;for(const target of alive){if(target.id===owner.id||shot.hit)continue;if(distance(shot,target)<target.radius+shot.radius){shot.hit=true;const damage=p.damage*.78*owner.damageMult*(b.time>120?1.45:b.time>90?1.2:1)*(.9+random()*.2);if(p.type==="mark"||p.delayed){b.delayed.push({at:b.time+5,targetId:target.id,ownerId:owner.id,powerId:p.id,damage:p.delayed||damage*1.8});addText(target.x,target.y,"МЕТКА",p.color||"#fff");}else if(p.area){for(const victim of alive)if(victim!==owner&&distance(target,victim)<p.area)dealDamage(victim,damage,owner,p,random()<owner.crit)}else dealDamage(target,damage,owner,p,random()<owner.crit);}}}b.projectiles=b.projectiles.filter(p=>p.life>0&&!p.hit&&p.x>-30&&p.x<canvas.width+30&&p.y>-30&&p.y<canvas.height+30)}
function updateDelayed(){const b=state.battle;for(const event of b.delayed){if(event.done||b.time<event.at)continue;event.done=true;const target=b.fighters.find(f=>f.id===event.targetId),owner=b.fighters.find(f=>f.id===event.ownerId),p=owner?.power;if(!target?.alive||!owner)continue;if(p.execute&&target.hp/target.maxHp<=p.execute)dealDamage(target,target.hp+1,owner,{...p,armorPen:1},false);else dealDamage(target,event.damage,owner,{...p,armorPen:.7},false)}b.delayed=b.delayed.filter(e=>!e.done)}
function addBlood(target,damage=20,fatal=false){
  const b=state.battle;if(!b?.blood)return;const amount=fatal?18:Math.max(2,Math.min(7,Math.ceil(damage/16)));
  for(let index=0;index<amount;index++){const angle=Math.random()*Math.PI*2,distance=(fatal?18:8)+Math.random()*(fatal?72:34),size=(fatal?4:2)+Math.random()*(fatal?10:6),life=(fatal?4.8:2.2)+Math.random()*2;b.blood.push({x:target.x+Math.cos(angle)*distance,y:target.y+Math.sin(angle)*distance*.62,size,angle:Math.random()*Math.PI,life,maxLife:life});}b.blood=b.blood.slice(-96);
}
function dealDamage(target,raw,attacker,power,critical){if(!target.alive)return;const b=state.battle,attackerUltimate=b.time<attacker.ultimateActiveUntil,targetUltimate=b.time<target.ultimateActiveUntil,effectiveDodge=Math.min(.65,target.dodge+(targetUltimate?target.ultimateDodge:0));if(!power.sureHit&&random()<effectiveDodge){target.dodges++;addText(target.x,target.y,"УКЛОН",target.color);b.effects.push({type:"dodge",x:target.x,y:target.y,color:target.color,life:.35,maxLife:.35});return}const armorPen=attackerUltimate&&fighterUltimate(attacker)?.type==="armorBreak"?1:(power.armorPen||0);let damage=raw*(attackerUltimate?attacker.ultimateDamageMult:1)*(1-target.armor*(1-armorPen));if(critical)damage*=1.55;if(target.shield>0){const blocked=Math.min(target.shield,damage);target.shield-=blocked;damage-=blocked;target.blocks++;if(blocked>0)playSound("block",.24)}damage=Math.max(0,damage);target.hp-=damage;target.hitFlash=1;attacker.damageDone+=damage;attacker.hits++;if(damage>0)addBlood(target,damage);const lifesteal=(power.lifesteal||0)+(attackerUltimate?attacker.ultimateLifesteal:0);if(lifesteal)attacker.hp=Math.min(attacker.maxHp,attacker.hp+damage*lifesteal);if(power.dot){target.dotUntil=b.time+4;target.dotDamage=power.dot;target.dotOwner=attacker;target.nextDot=b.time+1}if(power.stun)target.stunnedUntil=Math.max(target.stunnedUntil,b.time+power.stun);if(power.knockback){const angle=Math.atan2(target.y-attacker.y,target.x-attacker.x),force=power.knockback;target.vx+=Math.cos(angle)*force;target.vy+=Math.sin(angle)*force}addText(target.x,target.y,`${critical?"КРИТ ":""}-${Math.round(damage)}`,critical?"#ffe95b":"#fff");b.effects.push({type:power.basicVisual?"basicHit":"hit",visual:power.basicVisual,angle:power.basicAngle??attacker.attackAngle,x:target.x,y:target.y,color:attacker.universe.color,life:power.basicVisual?.5:.32,maxLife:power.basicVisual?.5:.32,radius:target.radius+18});playSound(damage>55?"heavy":"hit",Math.min(.55,.16+damage/220),.9+random()*.18);if(target.hp<=0)knockOut(target,attacker,power)}
function knockOut(target,attacker,power,ignoreRevive=false){if(target.reviveAvailable&&!ignoreRevive){target.reviveAvailable=false;target.revives++;target.hp=target.maxHp*.18;target.shield=60;target.stunnedUntil=state.battle.time+1;addFeed(`<b>${escapeHtml(target.name)}</b> спасается сюжетной бронёй`);return}target.hp=0;target.alive=false;addBlood(target,120,true);attacker.kills++;playSound("ko",.7);if(power.name==="Тетрадь смерти")addFeed(`Сердце <b>${escapeHtml(target.name)}</b> остановилось через 40 секунд после записи имени.`,true);else addFeed(`<b>${escapeHtml(attacker.name)}</b> выбивает ${escapeHtml(target.name)} силой «${escapeHtml(power.name)}»`,true)}
function addText(x,y,text,color){state.battle.texts.push({x,y,text,color,life:.8})}
function addFeed(html,ko=false){const b=state.battle;b.feed.unshift({html,ko,time:b.time});b.feed=b.feed.slice(0,9);renderFeed()}
function renderFeed(){$("#battleFeed").innerHTML=state.battle.feed.map(item=>`<div class="feed-item ${item.ko?"ko":""}">${item.html}<br><small>${formatTime(item.time)}</small></div>`).join("")}
function renderFighterList(){$("#fightersList").innerHTML=state.battle.fighters.map(f=>`<div class="fighter-row" id="fighter-${f.id}" style="--fighter:${f.color}"><span class="fighter-face" style="background:${f.color}"></span><div><strong>${escapeHtml(f.name)}</strong><small>${escapeHtml(f.universe.name)} · ${Math.ceil(f.hp)} HP</small><div class="mini-hp"><i></i></div></div><img src="${f.power.icon}" title="${escapeAttr(f.power.name)}" alt=""></div>`).join("");updateHud(true)}
function updateHud(force=false){const b=state.battle;if(!b)return;const now=performance.now();if(!force&&now-(b.lastHudRender||0)<80)return;b.lastHudRender=now;$("#battleTimer").textContent=formatTime(b.time);$("#aliveCount").textContent=b.fighters.filter(f=>f.alive).length;for(const f of b.fighters){const row=$(`#fighter-${f.id}`);if(!row)continue;row.classList.toggle("dead",!f.alive);row.querySelector(".mini-hp i").style.width=`${Math.max(0,f.hp/f.maxHp*100)}%`;row.querySelector("small").textContent=`${f.universe.name} · ${Math.ceil(Math.max(0,f.hp))} HP`}renderSkillHud();renderAbilityHud()}
function renderSkillHud(){
  const hud=$("#skillHud"),fighter=localFighter(),b=state.battle;if(!fighter||!b){hud.classList.add("hidden");return}const power=fighter.power,remaining=Math.max(0,fighter.cooldown-(b.time-fighter.lastPower)),ready=fighter.alive&&remaining<=0;
  hud.classList.remove("hidden");hud.classList.toggle("ready",ready&&!b.powerAiming);hud.classList.toggle("aiming",b.powerAiming);hud.classList.toggle("disabled",!fighter.alive);hud.style.setProperty("--ability-color",fighter.universe.color);$("#skillIcon").src=power.icon;$("#skillName").textContent=power.name;$("#skillBar").style.width=`${ready?100:Math.max(0,(1-remaining/fighter.cooldown)*100)}%`;$("#skillStatus").textContent=!fighter.alive?"БОЕЦ ВЫБЫЛ":b.powerAiming?"ОТПУСТИ E — УДАРИТЬ ПО ТРАЕКТОРИИ":ready?"ЗАЖМИ E — ПРИЦЕЛИТЬСЯ":`ПЕРЕЗАРЯДКА ${remaining.toFixed(1)}с`;
}
function renderAbilityHud(){
  const hud=$("#abilityHud"),fighter=localFighter(),b=state.battle;if(!fighter||!b){hud.classList.add("hidden");return}
  if(fighter.universe.id==="death-note"){
    const pending=b.ultimatePulses.find(pulse=>pulse.kind==="deathNote"&&!pulse.done&&pulse.ownerId===fighter.id),remaining=pending?Math.max(0,pending.at-b.time):0,ready=fighter.alive&&!fighter.deathNoteUsed;
    hud.classList.remove("hidden");hud.classList.toggle("ready",ready);hud.classList.toggle("disabled",!fighter.alive||fighter.deathNoteUsed);hud.style.setProperty("--ability-color","#dedbd0");$("#abilityIcon").src="assets/icons/death-notebook.png";$("#abilityName").textContent="ТЕТРАДЬ СМЕРТИ";$("#abilityBar").style.width=`${ready?100:0}%`;$("#abilityStatus").textContent=!fighter.alive?"БОЕЦ ВЫБЫЛ":pending?`ИМЯ ЗАПИСАНО · ${Math.ceil(remaining)}с`:fighter.deathNoteUsed?"ТЕТРАДЬ ИСПОЛЬЗОВАНА":"F — ОТКРЫТЬ ДНЕВНИК";return;
  }
  const ultimate=fighterUltimate(fighter),remaining=Math.max(0,fighter.ultimateReadyAt-b.time),active=b.time<fighter.ultimateActiveUntil,ready=fighter.alive&&!active&&remaining<=0;
  hud.classList.remove("hidden");hud.classList.toggle("ready",ready);hud.classList.toggle("disabled",!fighter.alive);hud.style.setProperty("--ability-color",fighter.universe.color);
  $("#abilityIcon").src=ultimate.icon;$("#abilityName").textContent=ultimate.name;
  $("#abilityBar").style.width=`${ready||active?100:Math.max(0,(1-remaining/ultimate.cooldown)*100)}%`;
  $("#abilityStatus").textContent=!fighter.alive?"БОЕЦ ВЫБЫЛ":active?`АКТИВНО ${(fighter.ultimateActiveUntil-b.time).toFixed(1)}с`:ready?"F — АКТИВИРОВАТЬ":`ПЕРЕЗАРЯДКА ${remaining.toFixed(1)}с`;
}
function updateDeathNoteWarning(){
  const b=state.battle,fighter=localFighter(),warning=$("#deathNoteWarning");if(!b||!fighter){warning.classList.add("hidden");return}
  const pulse=b.ultimatePulses.find(item=>item.kind==="deathNote"&&!item.done&&item.targetId===fighter.id),remaining=pulse?.at-b.time;
  if(!fighter.alive||!Number.isFinite(remaining)||remaining<=0||remaining>5){warning.classList.add("hidden");lastHeartbeatBeat=-1;return}
  const intensity=Math.max(0,Math.min(1,1-remaining/5));warning.classList.remove("hidden");warning.style.setProperty("--death-intensity",intensity.toFixed(3));$("#deathNoteCountdown").textContent=Math.max(1,Math.ceil(remaining));
  if(lastHeartbeatBeat<0||b.time>=lastHeartbeatBeat){playHeartbeat(intensity);lastHeartbeatBeat=b.time+(.78-intensity*.38)}
}
const FIGHTER_SYNC_KEYS=["vx","vy","hp","alive","shield","lastPower","lastBasic","attackAngle","stunnedUntil","dotUntil","nextDot","dotDamage","nextRegen","reviveAvailable","revives","damageDone","kills","attacks","hits","dodges","blocks","hitFlash","attackFlash","ultimateReadyAt","ultimateActiveUntil","ultimateDamageMult","ultimateSpeedMult","ultimateLifesteal","ultimateDodge","slowedUntil","slowFactor","cagedUntil","cageOwnerId","cageColor","deathNoteUsed","deathNoteTargetId"];
function compactFighter(fighter){const value={id:fighter.id,x:Math.round(fighter.x*10)/10,y:Math.round(fighter.y*10)/10,dotOwnerId:fighter.dotOwner?.id??fighter.dotOwnerId??null};for(const key of FIGHTER_SYNC_KEYS)value[key]=fighter[key];return value}
function syncBattle(now){
  const b=state.battle;if(!isHost()||now-b.lastSync<80)return;b.lastSync=now;
  send({type:"battle_state",battle:{time:b.time,over:b.over,randomSeed:state.randomSeed,zone:b.zone,fighters:b.fighters.map(compactFighter),projectiles:b.projectiles,effects:b.effects,blood:b.blood,texts:b.texts,delayed:b.delayed,ultimatePulses:b.ultimatePulses,ultimateEvent:b.ultimateEvent,ultimateEventId:b.ultimateEventId,actionEvents:b.actionEvents,actionEventId:b.actionEventId,feed:b.feed}});
}
function applyBattleSnapshot(snapshot){
  const b=state.battle;if(!b||!snapshot)return;const event=snapshot.ultimateEvent;
  b.serverTime=snapshot.time;if(Math.abs(b.time-snapshot.time)>1)b.time=snapshot.time;b.over=snapshot.over;b.zone=snapshot.zone;state.randomSeed=snapshot.randomSeed??state.randomSeed;
  for(const remote of snapshot.fighters){const fighter=b.fighters.find(item=>item.id===remote.id);if(!fighter)continue;const dx=remote.x-fighter.x,dy=remote.y-fighter.y;if(!Number.isFinite(fighter.netX)||Math.hypot(dx,dy)>220){fighter.x=remote.x;fighter.y=remote.y}fighter.netX=remote.x;fighter.netY=remote.y;for(const key of FIGHTER_SYNC_KEYS)fighter[key]=remote[key];fighter.dotOwnerId=remote.dotOwnerId;}
  b.projectiles=snapshot.projectiles||[];b.effects=snapshot.effects||[];b.blood=snapshot.blood||[];b.texts=snapshot.texts||[];b.delayed=snapshot.delayed||[];b.ultimatePulses=snapshot.ultimatePulses||[];b.ultimateEvent=event;b.ultimateEventId=snapshot.ultimateEventId||0;b.actionEvents=snapshot.actionEvents||[];b.actionEventId=snapshot.actionEventId||0;
  for(const action of b.actionEvents){if(action.id<=lastActionEventId)continue;const owner=b.fighters.find(fighter=>fighter.id===action.ownerId);if(action.kind==="basic")playBasicSound(action.style,action.id,action.universeId,action.sound);else if(owner)playAbilitySound(owner.power,action.universeId);lastActionEventId=Math.max(lastActionEventId,action.id)}
  const feed=snapshot.feed||[],feedKey=feed.map(item=>`${item.time}:${item.html}`).join("|");if(feedKey!==b.feedKey){b.feed=feed;b.feedKey=feedKey;renderFeed()}
  if(event?.id>lastUltimateEventId){lastUltimateEventId=event.id;showUltimateCinematic(event)}
}

function drawBattle(){
  const b=state.battle;if(!b)return;const W=canvas.width,H=canvas.height;drawArenaBackdrop(W,H);
  const z=b.zone,danger=ctx.createLinearGradient(0,0,W,H);danger.addColorStop(0,"rgba(255,35,55,.2)");danger.addColorStop(.5,"rgba(68,12,22,.08)");danger.addColorStop(1,"rgba(167,42,255,.18)");ctx.fillStyle=danger;ctx.fillRect(0,0,z.left,H);ctx.fillRect(z.right,0,W-z.right,H);ctx.fillRect(z.left,0,z.right-z.left,z.top);ctx.fillRect(z.left,z.bottom,z.right-z.left,H-z.bottom);ctx.strokeStyle=z.announced?"#ff4b58":"rgba(167,208,255,.42)";ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=z.announced?18:7;ctx.lineWidth=5;ctx.strokeRect(z.left,z.top,z.right-z.left,z.bottom-z.top);ctx.shadowBlur=0;
  drawBlood();for(const f of b.fighters)if(f.alive&&f.cagedUntil>b.time)drawCage(f);for(const shot of b.projectiles)drawProjectile(shot);for(const f of b.fighters)if(f.alive)drawFighter(f);drawPowerPreview();for(const effect of b.effects)drawEffect(effect);for(const text of b.texts){ctx.globalAlpha=Math.max(0,text.life/.8);ctx.fillStyle=text.color;ctx.font="700 15px Rubik";ctx.textAlign="center";ctx.shadowColor="#000";ctx.shadowBlur=5;ctx.fillText(text.text,text.x,text.y);ctx.globalAlpha=1;ctx.shadowBlur=0}updateHud();updateDeathNoteWarning();
}
function drawPowerPreview(){
  const b=state.battle,fighter=localFighter();if(!b?.powerAiming||!fighter?.alive)return;const power=fighter.power,angle=Math.atan2(b.aimY-fighter.y,b.aimX-fighter.x),range=powerCastRange(fighter),endX=fighter.x+Math.cos(angle)*range,endY=fighter.y+Math.sin(angle)*range,enemies=b.fighters.filter(target=>target.alive&&target!==fighter),target=aimedEnemy(fighter,enemies,b.aimX,b.aimY),close=["melee","drain","counter","dash","bounce","teleport"].includes(power.type),impactX=target?.x??endX,impactY=target?.y??endY,color=target?fighter.universe.color:"#ff5c4d";
  ctx.save();ctx.lineCap="round";ctx.lineJoin="round";ctx.shadowColor=color;ctx.shadowBlur=18;
  if(close){ctx.fillStyle=`${color}24`;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(fighter.x,fighter.y);ctx.arc(fighter.x,fighter.y,range,angle-.24,angle+.24);ctx.closePath();ctx.fill();ctx.stroke()}
  ctx.strokeStyle=color;ctx.lineWidth=8;ctx.globalAlpha=.16;ctx.beginPath();ctx.moveTo(fighter.x,fighter.y);ctx.lineTo(impactX,impactY);ctx.stroke();ctx.globalAlpha=.9;ctx.lineWidth=2;ctx.setLineDash([13,10]);ctx.lineDashOffset=-b.time*85;ctx.beginPath();ctx.moveTo(fighter.x,fighter.y);ctx.lineTo(impactX,impactY);ctx.stroke();ctx.setLineDash([]);
  for(let step=1;step<=4;step++){const ratio=step/5,x=fighter.x+(impactX-fighter.x)*ratio,y=fighter.y+(impactY-fighter.y)*ratio;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=.45+step*.1;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-7,-5);ctx.lineTo(-4,0);ctx.lineTo(-7,5);ctx.closePath();ctx.fill();ctx.restore()}
  const radius=power.area||target?.radius+18||28;ctx.globalAlpha=.9;ctx.strokeStyle=color;ctx.fillStyle=`${color}20`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(impactX,impactY,Math.max(24,Math.min(155,radius)),0,Math.PI*2);ctx.fill();ctx.stroke();for(const rotation of [0,Math.PI/2]){ctx.beginPath();ctx.moveTo(impactX+Math.cos(rotation)*12,impactY+Math.sin(rotation)*12);ctx.lineTo(impactX+Math.cos(rotation)*38,impactY+Math.sin(rotation)*38);ctx.moveTo(impactX-Math.cos(rotation)*12,impactY-Math.sin(rotation)*12);ctx.lineTo(impactX-Math.cos(rotation)*38,impactY-Math.sin(rotation)*38);ctx.stroke()}
  ctx.fillStyle="#fff";ctx.font="700 10px Rubik";ctx.textAlign="center";ctx.shadowColor="#000";ctx.shadowBlur=6;ctx.fillText(target?`ОТПУСТИ E · ${target.name}`:"НЕТ ЦЕЛИ В ЛИНИИ",impactX,impactY+Math.max(42,radius)+18);ctx.restore();
}
function drawBlood(){
  const drops=state.battle?.blood||[];ctx.save();ctx.fillStyle="#8d0715";ctx.shadowColor="#330006";ctx.shadowBlur=3;
  for(const drop of drops){const fade=Math.max(0,Math.min(1,drop.life/drop.maxLife));ctx.globalAlpha=Math.min(.78,fade*.9);ctx.save();ctx.translate(drop.x,drop.y);ctx.rotate(drop.angle);ctx.beginPath();ctx.ellipse(0,0,drop.size*1.55,drop.size*.72,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha*=.7;ctx.beginPath();ctx.arc(drop.size*1.8,-drop.size*.25,drop.size*.35,0,Math.PI*2);ctx.fill();ctx.restore()}
  ctx.restore();
}
function drawCage(f){
  const time=state.battle.time,color=f.cageColor||"#985dff",radius=f.radius+31;ctx.save();ctx.translate(f.x,f.y);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=18;ctx.globalAlpha=.72;ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,-f.radius*.1,radius,radius*.36,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(0,f.radius*.45,radius,radius*.36,0,0,Math.PI*2);ctx.stroke();for(let bar=0;bar<10;bar++){const angle=bar*Math.PI*2/10+time*.25,x=Math.cos(angle)*radius,y=Math.sin(angle)*radius*.35;ctx.globalAlpha=.35+.55*(Math.sin(angle)+1)/2;ctx.lineWidth=3+2*(Math.sin(angle)+1)/2;ctx.beginPath();ctx.moveTo(x,y-f.radius*.75);ctx.lineTo(x,y+f.radius*.7);ctx.stroke()}ctx.rotate(-time*.8);ctx.setLineDash([6,8]);ctx.beginPath();ctx.arc(0,0,radius+9,0,Math.PI*2);ctx.stroke();ctx.restore();
}
function drawWeapon(f){
  let weapon=f.universe.battleStyle?.weapon||"fist";const powerId=f.power?.id||"";
  if(powerId==="shalltear-lance")weapon="bloodLance";else if(powerId==="cocytus-frost")weapon="frostBlade";else if(powerId==="harkonnen")weapon="harkonnenRifle";else if(powerId==="anderson-bayonets")weapon="holyBayonets";else if(powerId==="enjin-umbrella")weapon="umbrella";else if(powerId==="zanka-stick")weapon="giverStaff";else if(powerId==="riyo-ripper")weapon="ripperScissors";else if(powerId==="jabber-mankira")weapon="mankira";else if(powerId==="stark-strike")weapon="battleAxe";else if(powerId==="gae-bolg")weapon="redSpear";else if(powerId==="rho-aias")weapon="flowerShield";else if(powerId==="gate-babylon")weapon="portalBlade";
  const isAiming=state.battle?.powerAiming&&f.clientId===state.multiplayer.clientId,angle=isAiming?Math.atan2(state.battle.aimY-f.y,state.battle.aimX-f.x):Number.isFinite(f.attackAngle)?f.attackAngle:Math.atan2(f.vy,f.vx),swing=f.attackFlash*Math.sin((1-f.attackFlash)*Math.PI)*.85,r=f.radius;ctx.save();ctx.rotate(angle+swing);ctx.translate(r*.66,0);ctx.strokeStyle="#fff";ctx.fillStyle=f.universe.color;ctx.shadowColor=f.universe.color;ctx.shadowBlur=13;ctx.lineCap="round";ctx.lineJoin="round";
  if(["katana","nichirin","cursedBlade","slimeSword","slimeBlade"].includes(weapon)){ctx.lineWidth=weapon==="nichirin"?5:7;ctx.beginPath();ctx.moveTo(-r*.1,0);ctx.lineTo(r*1.55,0);ctx.stroke();ctx.strokeStyle=weapon==="nichirin"?"#ff713f":weapon==="slimeBlade"?"#62f0df":"#fff";ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#17171c";ctx.fillRect(-r*.28,-5,r*.36,10)}
  else if(["dualBlade","dualDagger"].includes(weapon)){for(const side of [-1,1]){ctx.save();ctx.translate(0,side*r*.3);ctx.rotate(side*.13);ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(r*(weapon==="dualDagger"?1.05:1.45),0);ctx.stroke();ctx.restore()}}
  else if(weapon==="kunai"){ctx.beginPath();ctx.moveTo(r*1.25,0);ctx.lineTo(r*.5,-r*.28);ctx.lineTo(r*.5,r*.28);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(r*.15,0,r*.13,0,Math.PI*2);ctx.stroke()}
  else if(weapon==="notebook"){ctx.rotate(-.14);ctx.fillStyle="#08080b";ctx.strokeStyle="#eee";ctx.lineWidth=2;ctx.fillRect(0,-r*.48,r*.9,r*.96);ctx.strokeRect(0,-r*.48,r*.9,r*.96);ctx.font=`${Math.max(6,r*.19)}px Russo`;ctx.fillStyle="#fff";ctx.textAlign="center";ctx.fillText("NOTE",r*.45,2)}
  else if(weapon==="iceStaff"){ctx.strokeStyle="#caedff";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-r*.16,0);ctx.lineTo(r*1.25,0);ctx.stroke();ctx.translate(r*1.32,0);ctx.rotate(state.battle.time*.7);ctx.fillStyle="#65d9ff";ctx.beginPath();for(let point=0;point<8;point++){const angle=point*Math.PI/4,length=point%2?r*.22:r*.42;ctx.lineTo(Math.cos(angle)*length,Math.sin(angle)*length)}ctx.closePath();ctx.fill();ctx.stroke()}
  else if(weapon==="progressiveKnife"){ctx.fillStyle="#caff38";ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-r*.14);ctx.lineTo(r*1.18,-r*.3);ctx.lineTo(r*1.52,0);ctx.lineTo(r*1.18,r*.3);ctx.lineTo(0,r*.14);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle="#111";for(let notch=1;notch<5;notch++){ctx.beginPath();ctx.moveTo(r*(.18+notch*.2),-r*.17);ctx.lineTo(r*(.27+notch*.2),r*.17);ctx.stroke()}}
  else if(weapon==="volundr"){ctx.strokeStyle="#4b2b18";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-r*.15,0);ctx.lineTo(r*1.25,0);ctx.stroke();ctx.translate(r*1.15,0);ctx.fillStyle="#e9aa35";ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(-r*.18,-r*.55,r*.72,r*1.1,5);ctx.fill();ctx.stroke()}
  else if(weapon==="parasiteBlade"){ctx.fillStyle="#9d0f34";ctx.strokeStyle="#ff6d86";ctx.lineWidth=3;for(const side of [-1,0,1]){ctx.beginPath();ctx.moveTo(0,side*r*.18);ctx.quadraticCurveTo(r*.75,side*r*.5,r*(1.55-Math.abs(side)*.18),side*r*.18);ctx.quadraticCurveTo(r*.82,side*r*.12,0,side*r*.18);ctx.fill();ctx.stroke()}}
  else if(weapon==="sacredTreasure"){ctx.fillStyle="#33134f";ctx.strokeStyle="#f3c8ff";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-r*.2);ctx.lineTo(r*1.42,-r*.13);ctx.lineTo(r*1.72,0);ctx.lineTo(r*1.42,r*.13);ctx.lineTo(0,r*.2);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="#ffd869";ctx.beginPath();ctx.arc(r*.05,0,r*.23,0,Math.PI*2);ctx.fill();ctx.stroke()}
  else if(["bloodLance","redSpear"].includes(weapon)){ctx.strokeStyle=weapon==="redSpear"?"#e51b3e":"#9a173e";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-r*.2,0);ctx.lineTo(r*1.62,0);ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(r*2.05,0);ctx.lineTo(r*1.48,-r*.34);ctx.lineTo(r*1.62,0);ctx.lineTo(r*1.48,r*.34);ctx.closePath();ctx.fill();ctx.stroke()}
  else if(weapon==="frostBlade"){ctx.fillStyle="#94ebff";ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-r*.18);ctx.lineTo(r*1.55,-r*.34);ctx.lineTo(r*1.85,0);ctx.lineTo(r*1.55,r*.34);ctx.lineTo(0,r*.18);ctx.closePath();ctx.fill();ctx.stroke();for(let chip=0;chip<3;chip++){ctx.beginPath();ctx.moveTo(r*(.45+chip*.35),-r*.22);ctx.lineTo(r*(.6+chip*.35),r*.08);ctx.stroke()}}
  else if(weapon==="guildStaff"){ctx.strokeStyle="#5d3224";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-r*.2,0);ctx.lineTo(r*1.35,0);ctx.stroke();ctx.translate(r*1.38,0);ctx.strokeStyle="#d6b854";ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,r*.42,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#7d50ff";ctx.beginPath();ctx.arc(0,0,r*.24+Math.sin(state.battle.time*5)*2,0,Math.PI*2);ctx.fill();for(const side of [-1,1]){ctx.fillStyle="#eee";ctx.beginPath();ctx.arc(-r*.02,side*r*.5,r*.14,0,Math.PI*2);ctx.fill()}}
  else if(weapon==="venuSword"){ctx.fillStyle="#1a0b23";ctx.strokeStyle="#ff4b9e";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-r*.22);ctx.lineTo(r*1.6,-r*.38);ctx.lineTo(r*1.92,0);ctx.lineTo(r*1.6,r*.38);ctx.lineTo(0,r*.22);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle="#fff";ctx.lineWidth=1;for(let rune=0;rune<4;rune++){ctx.beginPath();ctx.arc(r*(.42+rune*.32),0,r*.1,0,Math.PI*2);ctx.stroke()}}
  else if(weapon==="dualPistols"){for(const side of [-1,1]){ctx.save();ctx.translate(0,side*r*.31);ctx.fillStyle=side<0?"#d9d9dc":"#111117";ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(0,-r*.12,r*1.1,r*.24,3);ctx.fill();ctx.stroke();ctx.fillRect(r*.15,side<0?0:-r*.02,r*.22,side<0?r*.32:r*.28);ctx.restore()}}
  else if(weapon==="harkonnenRifle"){ctx.fillStyle="#292b30";ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(-r*.1,-r*.24,r*1.75,r*.48,5);ctx.fill();ctx.stroke();ctx.fillStyle="#bd1f35";ctx.fillRect(r*.25,-r*.12,r*.8,r*.24);ctx.strokeStyle="#ffd54a";ctx.beginPath();ctx.moveTo(r*1.65,0);ctx.lineTo(r*1.95,0);ctx.stroke()}
  else if(weapon==="holyBayonets"){for(const side of [-1,1]){ctx.save();ctx.translate(0,side*r*.28);ctx.strokeStyle="#fff";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(r*1.4,0);ctx.stroke();ctx.fillStyle="#ffe999";ctx.beginPath();ctx.moveTo(r*1.7,0);ctx.lineTo(r*1.35,-r*.15);ctx.lineTo(r*1.35,r*.15);ctx.closePath();ctx.fill();ctx.restore()}}
  else if(weapon==="vitalInstrument"){ctx.fillStyle="#202126";ctx.strokeStyle="#d8ff45";ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-r*.05,-r*.48,r*.86,r*.96,8);ctx.fill();ctx.stroke();ctx.fillStyle="#ff4fc8";ctx.beginPath();ctx.arc(r*.38,0,r*.23,0,Math.PI*2);ctx.fill();ctx.stroke()}
  else if(weapon==="umbrella"){ctx.strokeStyle="#ececf2";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-r*.15,0);ctx.lineTo(r*1.5,0);ctx.stroke();ctx.fillStyle="#d8ff45";ctx.strokeStyle="#111";ctx.lineWidth=2;ctx.beginPath();ctx.arc(r*1.5,0,r*.7,-Math.PI/2,Math.PI/2);ctx.closePath();ctx.fill();ctx.stroke()}
  else if(weapon==="giverStaff"){ctx.strokeStyle="#c5ee47";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-r*.25,0);ctx.lineTo(r*1.72,0);ctx.stroke();ctx.strokeStyle="#ff4fc8";ctx.lineWidth=3;for(let band=0;band<4;band++){ctx.beginPath();ctx.moveTo(r*(.3+band*.34),-r*.18);ctx.lineTo(r*(.43+band*.34),r*.18);ctx.stroke()}}
  else if(weapon==="ripperScissors"){for(const side of [-1,1]){ctx.save();ctx.rotate(side*.17);ctx.strokeStyle=side<0?"#ff4fc8":"#d8ff45";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(r*.2,0);ctx.lineTo(r*1.62,side*r*.13);ctx.stroke();ctx.beginPath();ctx.arc(0,side*r*.16,r*.25,0,Math.PI*2);ctx.stroke();ctx.restore()}}
  else if(weapon==="mankira"){ctx.fillStyle="#56ed73";ctx.strokeStyle="#19191d";ctx.lineWidth=3;for(let claw=-1;claw<=1;claw++){ctx.beginPath();ctx.moveTo(0,claw*r*.22);ctx.quadraticCurveTo(r*.8,claw*r*.4,r*1.5,claw*r*.22);ctx.lineTo(r*.78,claw*r*.1);ctx.closePath();ctx.fill();ctx.stroke()}}
  else if(weapon==="mageStaff"){ctx.strokeStyle="#805632";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-r*.2,0);ctx.lineTo(r*1.35,0);ctx.stroke();ctx.translate(r*1.42,0);ctx.strokeStyle="#dff8ff";ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,r*.4,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#70dfff";ctx.beginPath();ctx.arc(0,0,r*.18,0,Math.PI*2);ctx.fill()}
  else if(weapon==="battleAxe"){ctx.strokeStyle="#5d3420";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-r*.2,0);ctx.lineTo(r*1.55,0);ctx.stroke();ctx.translate(r*1.35,0);ctx.fillStyle="#d8e7eb";ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-r*.15,-r*.65);ctx.quadraticCurveTo(r*.65,-r*.48,r*.62,0);ctx.quadraticCurveTo(r*.65,r*.48,-r*.15,r*.65);ctx.closePath();ctx.fill();ctx.stroke()}
  else if(weapon==="nobleBlade"){ctx.fillStyle="#f5d85e";ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-r*.14);ctx.lineTo(r*1.55,-r*.22);ctx.lineTo(r*1.88,0);ctx.lineTo(r*1.55,r*.22);ctx.lineTo(0,r*.14);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle="#4b75ff";ctx.beginPath();ctx.moveTo(r*.35,0);ctx.lineTo(r*1.48,0);ctx.stroke()}
  else if(weapon==="flowerShield"){ctx.translate(r*.5,0);ctx.fillStyle="#c75dff55";ctx.strokeStyle="#ffb8ff";ctx.lineWidth=3;for(let petal=0;petal<7;petal++){ctx.save();ctx.rotate(petal*Math.PI*2/7);ctx.beginPath();ctx.ellipse(r*.35,0,r*.42,r*.18,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}}
  else if(weapon==="portalBlade"){ctx.strokeStyle="#ffd95a";ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(r*.25,0,r*.25,r*.58,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle="#fff";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(r*.2,0);ctx.lineTo(r*1.55,0);ctx.stroke()}
  else if(["ki","psychic","magicSeal"].includes(weapon)){ctx.globalAlpha=.68;ctx.lineWidth=3;for(let ring=0;ring<3;ring++){ctx.beginPath();ctx.arc(r*.45,0,r*(.26+ring*.16)+Math.sin(state.battle.time*5+ring)*3,0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1;ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(r*.45,0,r*.16,0,Math.PI*2);ctx.fill()}
  else if(weapon==="chainsaw"){ctx.fillStyle="#3a3a42";ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(0,-r*.27,r*1.45,r*.54,6);ctx.fill();ctx.stroke();for(let tooth=0;tooth<7;tooth++){const x=r*.12+tooth*r*.19;ctx.beginPath();ctx.moveTo(x,-r*.29);ctx.lineTo(x+r*.09,-r*.46);ctx.lineTo(x+r*.14,-r*.27);ctx.stroke()}}
  else if(weapon==="greatsword"){ctx.fillStyle="#23232b";ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-r*.2);ctx.lineTo(r*1.55,-r*.42);ctx.lineTo(r*1.85,0);ctx.lineTo(r*1.55,r*.42);ctx.lineTo(0,r*.2);ctx.closePath();ctx.fill();ctx.stroke()}
  else if(weapon==="drill"){ctx.fillStyle=f.universe.color;ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(r*1.8,0);ctx.lineTo(0,-r*.48);ctx.lineTo(0,r*.48);ctx.closePath();ctx.fill();ctx.stroke();for(let turn=0;turn<4;turn++){const x=turn*r*.4;ctx.beginPath();ctx.moveTo(x,-r*(.46-turn*.1));ctx.lineTo(x+r*.38,r*(.36-turn*.07));ctx.stroke()}}
  else if(weapon==="kagune"){for(const side of [-1,0,1]){ctx.lineWidth=7-Math.abs(side)*2;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(r*.65,side*r*.8,r*1.45,side*r*.55);ctx.stroke()}}
  else if(weapon==="nenCard"){ctx.rotate(.22);ctx.fillStyle="#f7f2df";ctx.strokeStyle="#111";ctx.lineWidth=2;ctx.fillRect(0,-r*.35,r*.65,r*.7);ctx.strokeRect(0,-r*.35,r*.65,r*.7);ctx.fillStyle=f.universe.color;ctx.fillRect(r*.25,-r*.12,r*.16,r*.24)}
  else {ctx.fillStyle=weapon==="hakiFist"?"#24242c":f.universe.color;ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.beginPath();ctx.arc(r*.38,0,r*.35,0,Math.PI*2);ctx.fill();ctx.stroke();for(let knuckle=-1;knuckle<=1;knuckle++){ctx.beginPath();ctx.arc(r*.63,knuckle*r*.16,r*.11,0,Math.PI*2);ctx.fill()}}
  ctx.restore();
}
function drawFighter(f){
  const look=cleanAppearance(f.appearance),time=state.battle.time,r=f.radius;ctx.save();ctx.translate(f.x,f.y);if(look.aura!=="none"){ctx.save();ctx.globalAlpha=.5;ctx.strokeStyle=look.aura==="flame"?"#ff6538":look.aura==="electric"?"#61eaff":"#9b58ff";ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=18;ctx.lineWidth=look.aura==="electric"?3:7;ctx.setLineDash(look.aura==="electric"?[4,7]:[]);ctx.rotate(time*(look.aura==="shadow"?-.8:1.4));ctx.beginPath();ctx.arc(0,0,r+9+Math.sin(time*6)*3,0,Math.PI*2);ctx.stroke();ctx.restore()}drawWeapon(f);ctx.shadowColor=f.universe.color;ctx.shadowBlur=f.attackFlash>0?28:12;ctx.fillStyle=f.hitFlash>0?"#fff":f.color;ctx.strokeStyle="#050507";ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.stroke();if(look.pattern==="split"){ctx.save();ctx.beginPath();ctx.arc(0,0,r-3,-1.1,1.1);ctx.lineTo(0,0);ctx.closePath();ctx.fillStyle="rgba(255,255,255,.28)";ctx.fill();ctx.restore()}else if(look.pattern==="ring"){ctx.strokeStyle="rgba(255,255,255,.62)";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r*.68,0,Math.PI*2);ctx.stroke()}else if(look.pattern==="core"){ctx.fillStyle="#fff";ctx.shadowColor="#fff";ctx.shadowBlur=12;ctx.beginPath();ctx.arc(0,r*.38,r*.15,0,Math.PI*2);ctx.fill()}if(f.shield>0){ctx.strokeStyle="#7de8ff";ctx.lineWidth=4;ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(0,0,r+7,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
  if(look.face==="visor"){const grad=ctx.createLinearGradient(-r*.45,0,r*.45,0);grad.addColorStop(0,"#65eaff");grad.addColorStop(.5,"#fff");grad.addColorStop(1,"#ff65db");ctx.fillStyle=grad;ctx.strokeStyle="#111";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-r*.48,-r*.3,r*.96,r*.28,4);ctx.fill();ctx.stroke()}else{const eyes=look.face==="cyclops"?[0]:[-r*.28,r*.28];for(const [index,ex] of eyes.entries()){ctx.save();if(look.face==="fierce")ctx.rotate((index?-.2:.2));ctx.fillStyle="#fff";ctx.strokeStyle="#111";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(ex,-r*.12,look.face==="cyclops"?r*.2:r*.17,r*.25,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#111";ctx.beginPath();ctx.arc(ex+2,-r*.1,Math.max(2,r*.06),0,Math.PI*2);ctx.fill();ctx.restore()}}
  if(look.accessory==="headband"){ctx.fillStyle="#15151b";ctx.strokeStyle="#050507";ctx.lineWidth=2;ctx.fillRect(-r*.95,-r*.64,r*1.9,r*.25);ctx.strokeRect(-r*.95,-r*.64,r*1.9,r*.25)}else if(look.accessory==="horns"){ctx.fillStyle="#f2e8d0";for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*r*.25,-r*.75);ctx.lineTo(side*r*.75,-r*1.35);ctx.lineTo(side*r*.66,-r*.52);ctx.closePath();ctx.fill()}}else if(look.accessory==="halo"){ctx.strokeStyle="#ffe66d";ctx.shadowColor="#ffe66d";ctx.shadowBlur=12;ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,-r*1.25,r*.65,r*.18,0,0,Math.PI*2);ctx.stroke()}
  const emblem=imageFor(f.universe.icon);if(emblem.complete)ctx.drawImage(emblem,-r*.36,r*.23,r*.72,r*.72);ctx.restore();ctx.font="700 11px Rubik";const w=Math.max(76,ctx.measureText(f.name).width+16),x=f.x-w/2,y=f.y-r-25;ctx.fillStyle="#050507";ctx.fillRect(x-2,y-2,w+4,10);ctx.fillStyle=f.hp/f.maxHp>.5?f.color:f.hp/f.maxHp>.25?"#ffcb42":"#ff5c4d";ctx.fillRect(x,y,w*Math.max(0,f.hp/f.maxHp),6);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.fillText(f.name,f.x,y-5);
}
function drawProjectile(shot){
  const owner=state.battle.fighters.find(f=>f.id===shot.ownerId),power=owner?.power,image=power?imageFor(power.icon):null,color=shot.color||owner?.universe.color||"#fff",type=shot.powerType||power?.type||"projectile",trail=type==="beam"?150:type==="mark"?95:type==="bomb"?42:72;
  ctx.save();ctx.translate(shot.x,shot.y);ctx.rotate(shot.angle);ctx.lineCap="round";ctx.shadowColor=color;ctx.shadowBlur=26;
  const gradient=ctx.createLinearGradient(-trail,0,14,0);gradient.addColorStop(0,"transparent");gradient.addColorStop(.7,color);gradient.addColorStop(1,"#fff");ctx.strokeStyle=gradient;
  if(type==="beam"){ctx.lineWidth=18;ctx.globalAlpha=.32;ctx.beginPath();ctx.moveTo(-trail,0);ctx.lineTo(8,0);ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=6;ctx.strokeStyle="#fff";ctx.beginPath();ctx.moveTo(-trail*.78,0);ctx.lineTo(12,0);ctx.stroke();}
  else{ctx.lineWidth=type==="bomb"?9:5;ctx.beginPath();ctx.moveTo(-trail,0);ctx.lineTo(4,0);ctx.stroke();}
  if(type==="bomb"){ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,15+Math.sin((shot.life||0)*18)*3,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.stroke();}
  else if(image?.complete)ctx.drawImage(image,-22,-22,44,44);else{ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill()}
  ctx.restore();
}
function drawBasicAttackEffect(e,progress,alpha){
  const reach=e.reach||e.radius||120,size=e.size||24,visual=e.visual||"plainImpact",hit=e.type==="basicHit",hash=hashText(visual),head=reach*Math.min(1,progress*2.35),accent={deathInk:"#f3f0df",getsugaArc:"#64d8ff",breathingArc:"#ff7b35",antiMagicCrescent:"#b85cff",dragonFlame:"#ff6a2f",iceRune:"#9eeeff",volundSpark:"#ffd448",sacredArc:"#ffe285",deathMagic:"#a987ff",demonRune:"#ff4778",silverBullet:"#f5f5f7",graffitiJunk:"#d8ff45",zoltraakSpark:"#bff6ff",nobleSlash:"#ffd95e"}[visual]||e.color;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.angle||0);ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle=accent;ctx.fillStyle=accent;ctx.shadowColor=accent;ctx.shadowBlur=18;
  const stroke=(x1,y1,x2,y2,width=4,color=accent)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()};
  const arc=(radius,start,end,width=7,color=accent)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(0,0,radius,start,end);ctx.stroke()};
  if(hit){
    ctx.rotate(-(e.angle||0));const rays=6+hash%6,spin=(hash%2?1:-1)*progress*.8;ctx.rotate(spin);for(let ray=0;ray<rays;ray++){const angle=ray*Math.PI*2/rays,inner=7+(hash%4),outer=(e.radius||38)*(1+progress*.8)+(ray%3)*6;ctx.globalAlpha=alpha*(ray%2?.72:1);ctx.strokeStyle=ray%3===0?"#fff":accent;ctx.lineWidth=ray%3===0?5:2;ctx.beginPath();ctx.moveTo(Math.cos(angle)*inner,Math.sin(angle)*inner);ctx.lineTo(Math.cos(angle)*outer,Math.sin(angle)*outer);ctx.stroke()}ctx.globalAlpha=alpha*.8;ctx.setLineDash([5+(hash%5),4]);ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,13+progress*(25+hash%18),0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);if(/Ink|Rune|Magic|cursed|death|zoltraak/i.test(visual)){ctx.rotate(progress*Math.PI);for(let point=0;point<4+(hash%3);point++){const angle=point*Math.PI*2/(4+hash%3);stroke(0,0,Math.cos(angle)*24,Math.sin(angle)*24,2,point%2?"#fff":accent)}}else if(/Bullet|Bolt|Card/i.test(visual)){stroke(-28,0,31,0,7,"#fff");stroke(-39,0,24,0,2,accent)}else if(/Arc|Slash|Scythe|Crescent|Knife|Cross/i.test(visual)){arc(31,-2.5,-.35,9,accent);arc(25,.4,2.55,3,"#fff")}else if(/kagune|parasite|slime/i.test(visual)){for(let arm=-2;arm<=2;arm++){ctx.lineWidth=6-Math.abs(arm);ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(arm*12,-25,arm*20,32);ctx.stroke()}}ctx.restore();return;
  }
  ctx.save();ctx.globalAlpha=alpha*.17;ctx.fillStyle=accent;ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.setLineDash([9,7]);ctx.lineDashOffset=-progress*45;if(e.shape==="line"){ctx.beginPath();ctx.roundRect(0,-size,reach,size*2,Math.min(18,size));ctx.fill();ctx.stroke()}else if(e.shape==="burst"){const center=reach-size*.68;ctx.beginPath();ctx.arc(center,0,size,0,Math.PI*2);ctx.fill();ctx.stroke();stroke(0,0,center,0,2,"#fff")}else{ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,reach,-size/2,size/2);ctx.closePath();ctx.fill();ctx.stroke()}ctx.setLineDash([]);ctx.restore();
  ctx.globalAlpha=alpha;
  switch(visual){
    case "seriousShockwave":for(let wave=0;wave<4;wave++)arc(Math.max(16,head-wave*17),-.55,.55,12-wave*2,wave===2?"#fff":accent);break;
    case "deathInk":ctx.strokeStyle="#f5f2e8";ctx.lineWidth=5;ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(0,0);for(let step=1;step<=9;step++)ctx.lineTo(head*step/9,(step%2?1:-1)*(7+step));ctx.stroke();ctx.setLineDash([]);for(let drop=0;drop<5;drop++){ctx.beginPath();ctx.arc(head*(.35+drop*.12),(drop-2)*7,2+drop%2,0,Math.PI*2);ctx.fill()}break;
    case "oraRush":for(let fist=0;fist<7;fist++){const ratio=(fist+1)/7,x=head*ratio,y=(fist%2?1:-1)*(8+fist*3);ctx.fillStyle=fist%3===0?"#fff":accent;ctx.beginPath();ctx.arc(x,y,8+fist%2*3,0,Math.PI*2);ctx.fill();stroke(x-22,y,x-7,y,5)}break;
    case "kiBolt":stroke(0,0,head,0,18,`${accent}66`);stroke(0,0,head,0,5,"#fff");ctx.beginPath();ctx.arc(head,0,13+Math.sin(progress*24)*3,0,Math.PI*2);ctx.fill();break;
    case "kunaiArc":for(const offset of [-.3,0,.3]){ctx.save();ctx.rotate(offset);stroke(18,0,head,0,3,"#fff");ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(head+14,0);ctx.lineTo(head-3,-7);ctx.lineTo(head-3,7);ctx.closePath();ctx.fill();ctx.restore()}break;
    case "getsugaArc":arc(Math.max(20,head),-.42,.42,22,accent);arc(Math.max(14,head-7),-.39,.39,5,"#fff");break;
    case "rubberWhip":ctx.lineWidth=15;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(head*.25,-42,head*.68,43,head,0);ctx.stroke();ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.stroke();break;
    case "cursedBurst":for(let ring=0;ring<4;ring++){ctx.strokeStyle=ring%2?"#111":"#9258ff";ctx.lineWidth=10-ring*2;ctx.beginPath();ctx.arc(reach-size*.68,0,Math.max(8,head/reach*size-ring*8),0,Math.PI*2);ctx.stroke()}break;
    case "breathingArc":for(let wave=0;wave<4;wave++){ctx.strokeStyle=wave%2?"#ff7a2f":"#54d8ff";ctx.lineWidth=12-wave*2;ctx.beginPath();ctx.arc(0,0,Math.max(18,head-wave*11),-.62,.62);ctx.stroke()}break;
    case "odmCross":for(const side of [-1,1]){ctx.save();ctx.rotate(side*.26);stroke(12,0,head,0,8,side<0?"#fff":accent);ctx.restore()}for(let spark=-2;spark<=2;spark++)stroke(head*.7,spark*7,head,spark*2,2);break;
    case "smashWind":for(let lane=-2;lane<=2;lane++){ctx.lineWidth=10-Math.abs(lane)*2;ctx.beginPath();ctx.moveTo(8,lane*4);ctx.quadraticCurveTo(head*.55,lane*24,head,lane*10);ctx.stroke()}arc(Math.max(18,head),-.48,.48,4,"#fff");break;
    case "nenCard":for(let card=0;card<5;card++){ctx.save();ctx.translate(head*(.35+card*.13),(card-2)*11);ctx.rotate((card-2)*.12);ctx.fillStyle=card%2?"#f7f1df":accent;ctx.fillRect(-9,-13,18,26);ctx.strokeStyle="#17171c";ctx.lineWidth=2;ctx.strokeRect(-9,-13,18,26);ctx.restore()}break;
    case "chainsawTrack":stroke(0,0,head,0,16,"#3d3d44");stroke(0,0,head,0,3,"#fff");for(let tooth=0;tooth<10;tooth++){const x=head*(.1+tooth*.09);stroke(x,0,x+8,(tooth%2?1:-1)*12,3,accent)}break;
    case "antiMagicCrescent":arc(Math.max(18,head),-.46,.46,24,"#120d18");arc(Math.max(16,head-3),-.45,.45,6,accent);for(let shard=-2;shard<=2;shard++)stroke(head*.65,shard*7,head,shard*15,2,"#fff");break;
    case "daggerCross":for(const side of [-1,1]){ctx.save();ctx.rotate(side*.34);stroke(8,0,head,0,8,side<0?"#b461ff":"#fff");ctx.restore()}break;
    case "alchemySpikes":stroke(0,0,head,0,3,"#fff");for(let spike=1;spike<=6;spike++){const x=head*spike/7,height=12+spike%3*9;ctx.beginPath();ctx.moveTo(x-10,0);ctx.lineTo(x,-height);ctx.lineTo(x+10,0);ctx.closePath();ctx.fill();ctx.stroke()}break;
    case "kaguneFan":for(let arm=-2;arm<=2;arm++){ctx.lineWidth=10-Math.abs(arm);ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(head*.52,arm*26,head,arm*14);ctx.stroke()}break;
    case "psychicPalm":for(let ring=0;ring<5;ring++){ctx.lineWidth=7-ring;ctx.beginPath();ctx.arc(reach-size*.68,0,Math.max(5,head/reach*size+ring*11),0,Math.PI*2);ctx.stroke()}for(let finger=-2;finger<=2;finger++)stroke(reach-size*.68,finger*5,reach-size*.1,finger*12,3,"#fff");break;
    case "drillSpiral":stroke(0,0,head,0,4,"#fff");for(let turn=0;turn<6;turn++){const x=head*(.15+turn*.14),radius=7+turn*3;ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x,0,radius*.45,radius,0,0,Math.PI*2);ctx.stroke()}ctx.beginPath();ctx.moveTo(head+18,0);ctx.lineTo(head-9,-18);ctx.lineTo(head-9,18);ctx.closePath();ctx.fill();break;
    case "slimeCrescent":arc(Math.max(18,head),-.45,.45,18,"#9b5dff");for(let drop=0;drop<5;drop++){ctx.fillStyle=drop%2?"#fff":accent;ctx.beginPath();ctx.arc(head*(.45+drop*.1),(drop-2)*9,3+drop%2*2,0,Math.PI*2);ctx.fill()}break;
    case "dragonFlame":for(let flame=-2;flame<=2;flame++){ctx.fillStyle=flame%2?"#ffd84b":"#ff542f";ctx.beginPath();ctx.moveTo(5,flame*4);ctx.quadraticCurveTo(head*.6,flame*18,head,(flame%2?1:-1)*8);ctx.quadraticCurveTo(head*.55,flame*7,5,flame*4);ctx.fill()}break;
    case "iceRune":stroke(0,0,head,0,7,"#dffaff");for(let rune=1;rune<=5;rune++){const x=head*rune/6;for(let arm=0;arm<4;arm++){const a=arm*Math.PI/2;stroke(x,0,x+Math.cos(a)*13,Math.sin(a)*13,2,accent)}}break;
    case "evaKnife":stroke(0,0,head,0,13,"#caff38");stroke(0,0,head,0,3,"#fff");for(let notch=0;notch<7;notch++){const x=head*(.16+notch*.1);stroke(x,-7,x+8,8,2,"#131318")}break;
    case "slimeSplash":arc(Math.max(15,head),-.7,.7,19,accent);for(let drop=0;drop<8;drop++){const a=-.72+drop*.2,r=head*(.62+drop%3*.1);ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,3+drop%3,0,Math.PI*2);ctx.fill()}break;
    case "volundSpark":stroke(0,0,head,0,12,"#d49a32");for(let bolt=-2;bolt<=2;bolt++){ctx.strokeStyle=bolt%2?"#fff":"#ffd448";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(head*.25,bolt*6);ctx.lineTo(head*.5+bolt*5,-bolt*11);ctx.lineTo(head*.72,bolt*8);ctx.lineTo(head,0);ctx.stroke()}break;
    case "parasiteScythe":for(let blade=-2;blade<=2;blade++){ctx.lineWidth=9-Math.abs(blade);ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(head*.6,blade*30,head,blade*11);ctx.quadraticCurveTo(head*.78,blade*4,head*.35,blade*10);ctx.stroke()}break;
    case "sacredArc":arc(Math.max(18,head),-.52,.52,17,accent);arc(Math.max(12,head-9),-.48,.48,3,"#fff");for(let rune=-2;rune<=2;rune++){ctx.save();ctx.translate(head*.63,rune*11);ctx.rotate(progress+rune);ctx.strokeRect(-5,-5,10,10);ctx.restore()}break;
    case "deathMagic":for(let ring=0;ring<4;ring++){ctx.strokeStyle=ring%2?"#111":accent;ctx.lineWidth=9-ring;ctx.beginPath();ctx.arc(reach-size*.68,0,Math.max(6,head/reach*size+ring*10),0,Math.PI*2);ctx.stroke()}ctx.fillStyle="#fff";for(const eye of [-1,1]){ctx.beginPath();ctx.arc(reach-size*.68+eye*13,-5,5,0,Math.PI*2);ctx.fill()}break;
    case "demonRune":stroke(0,0,head,0,15,`${accent}77`);stroke(0,0,head,0,3,"#fff");for(let rune=1;rune<=4;rune++){const x=head*rune/5;ctx.save();ctx.translate(x,0);ctx.rotate(progress*3+rune);ctx.lineWidth=3;ctx.strokeRect(-11,-11,22,22);ctx.restore()}break;
    case "silverBullet":for(const lane of [-1,1]){stroke(0,lane*7,head,lane*7,4,lane<0?"#fff":accent);ctx.fillStyle="#ffd14c";ctx.beginPath();ctx.arc(head,lane*7,7,0,Math.PI*2);ctx.fill()}for(let casing=0;casing<3;casing++){ctx.save();ctx.translate(head*(.2+casing*.18),-18-casing*4);ctx.rotate(progress*8+casing);ctx.fillRect(-4,-2,8,4);ctx.restore()}break;
    case "graffitiJunk":for(let tag=0;tag<6;tag++){ctx.strokeStyle=["#d8ff45","#ff4fc8","#54d9ff","#fff"][tag%4];ctx.lineWidth=8-tag;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(head*.35,(tag-2.5)*13);ctx.lineTo(head*.7,(tag%2?1:-1)*22);ctx.lineTo(head,(tag-2.5)*7);ctx.stroke()}for(let junk=0;junk<4;junk++){ctx.save();ctx.translate(head*(.45+junk*.13),(junk-1.5)*15);ctx.rotate(progress*9+junk);ctx.fillRect(-7,-5,14,10);ctx.restore()}break;
    case "zoltraakSpark":stroke(0,0,head,0,20,`${accent}55`);stroke(0,0,head,0,5,"#fff");for(let hex=1;hex<=4;hex++){const x=head*hex/5,r=9+hex;ctx.beginPath();for(let side=0;side<6;side++){const a=side*Math.PI/3;side?ctx.lineTo(x+Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(x+Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.stroke()}break;
    case "nobleSlash":arc(Math.max(18,head),-.4,.4,20,"#ffd95e");arc(Math.max(13,head-6),-.38,.38,5,"#fff");ctx.strokeStyle="#4f7dff";ctx.lineWidth=3;for(let ray=-2;ray<=2;ray++)stroke(head*.45,ray*5,head,ray*12,3,ray%2?"#fff":"#4f7dff");break;
    default:stroke(0,0,head,0,10,accent);
  }
  ctx.restore();
}
function drawEffect(e){
  const progress=1-e.life/e.maxLife,base=e.radius||20,alpha=Math.max(0,e.life/e.maxLife);ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=e.color;ctx.fillStyle=e.color;ctx.shadowColor=e.color;ctx.shadowBlur=e.type==="ultimate"?24:14;
  if(e.type==="basicStrike"||e.type==="basicHit"){
    drawBasicAttackEffect(e,progress,alpha);
  }else if(e.type==="aim"){
    ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,base*(.7+progress*.3),0,Math.PI*2);ctx.stroke();for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){ctx.beginPath();ctx.moveTo(e.x+dx*base*.55,e.y+dy*base*.55);ctx.lineTo(e.x+dx*base*1.35,e.y+dy*base*1.35);ctx.stroke()}
  }else if(e.type==="slash"){
    ctx.translate(e.x,e.y);ctx.rotate(e.angle);ctx.lineCap="round";for(let line=0;line<3;line++){ctx.strokeStyle=line===1?"#fff":e.color;ctx.lineWidth=line===1?5:12-line*3;ctx.globalAlpha=alpha*(line===1?1:.42);ctx.beginPath();ctx.arc(0,0,base-line*10,-.82,.82);ctx.stroke()}
  }else if(e.type==="punch"){
    ctx.translate(e.x,e.y);ctx.rotate(e.angle);ctx.lineCap="round";for(let line=-2;line<=2;line++){ctx.globalAlpha=alpha*(1-Math.abs(line)*.12);ctx.lineWidth=8-Math.abs(line);ctx.beginPath();ctx.moveTo(base*.18,line*7);ctx.lineTo(base*(.75+progress*.25),line*13);ctx.stroke()}
  }else if(e.type==="drill"){
    ctx.translate(e.x,e.y);ctx.rotate(e.angle);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(base*(.95+progress*.2),0);ctx.lineTo(base*.15,-base*.33);ctx.lineTo(base*.15,base*.33);ctx.closePath();ctx.stroke();for(let turn=0;turn<5;turn++){const x=base*(.16+turn*.15);ctx.beginPath();ctx.ellipse(x,0,base*(.13-turn*.017),base*(.34-turn*.05),0,0,Math.PI*2);ctx.stroke()}ctx.strokeStyle="#fff";ctx.beginPath();ctx.moveTo(base*.1,0);ctx.lineTo(base*1.05,0);ctx.stroke();
  }else if(e.type==="chainsaw"){
    ctx.translate(e.x,e.y);ctx.rotate(e.angle);ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(base*.12,0);ctx.lineTo(base,0);ctx.stroke();ctx.strokeStyle="#fff";ctx.lineWidth=2;for(let tooth=0;tooth<10;tooth++){const x=base*(.16+tooth*.085),side=tooth%2?1:-1;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+base*.045,side*base*.18);ctx.stroke()}
  }else if(e.type==="weapon"){
    ctx.translate(e.x,e.y);ctx.rotate(e.angle);ctx.lineCap="round";if(["magic","psychic","ki","alchemy","notebook"].includes(e.visual)){for(let ring=0;ring<4;ring++){ctx.globalAlpha=alpha*(1-ring*.14);ctx.lineWidth=5-ring;ctx.beginPath();ctx.arc(base*(.45+progress*.35),0,base*(.18+ring*.12+progress*.2),0,Math.PI*2);ctx.stroke()}for(let ray=-2;ray<=2;ray++){ctx.beginPath();ctx.moveTo(base*.15,ray*6);ctx.lineTo(base*(.92+progress*.12),ray*13);ctx.stroke()}}else if(e.visual==="gun"){ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(base*.15,0);ctx.lineTo(base*(1+progress*.35),0);ctx.stroke();ctx.fillStyle="#ffd75a";ctx.globalAlpha=alpha;ctx.beginPath();ctx.moveTo(base*.25,0);ctx.lineTo(base*.02,-base*.22);ctx.lineTo(base*.02,base*.22);ctx.closePath();ctx.fill();for(let spark=0;spark<4;spark++){ctx.strokeStyle=e.color;ctx.beginPath();ctx.moveTo(base*.92,0);ctx.lineTo(base*(1.08+spark*.05),(spark-1.5)*base*.12);ctx.stroke()}}else if(e.visual==="trash"){for(let shard=0;shard<7;shard++){ctx.strokeStyle=shard%2?"#ff4fc8":"#d8ff45";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(base*.12,0);ctx.lineTo(base*(.45+shard*.08),(shard-3)*base*.1);ctx.lineTo(base*(.72+shard*.05),(shard%2?1:-1)*base*.2);ctx.stroke()}}else if(e.visual==="kagune"){for(let arm=-2;arm<=2;arm++){ctx.lineWidth=8-Math.abs(arm);ctx.beginPath();ctx.moveTo(base*.1,0);ctx.quadraticCurveTo(base*.55,arm*base*.18,base,arm*base*.1);ctx.stroke()}}else{ctx.lineWidth=9;ctx.beginPath();ctx.arc(0,0,base,-.8,.8);ctx.stroke()}
  }else if(e.type==="cagePulse"){
    ctx.translate(e.x,e.y);ctx.rotate(progress*Math.PI);ctx.lineWidth=5;for(let side=0;side<6;side++){const angle=side*Math.PI/3;ctx.beginPath();ctx.moveTo(Math.cos(angle)*base*.45,Math.sin(angle)*base*.45);ctx.lineTo(Math.cos(angle)*base*(1+progress*.35),Math.sin(angle)*base*(1+progress*.35));ctx.stroke()}ctx.beginPath();ctx.arc(0,0,base*(.65+progress*.45),0,Math.PI*2);ctx.stroke();
  }else if(e.type==="cast"){
    const visual=e.visual||e.powerType,castAngle=Math.atan2(e.targetY-e.y,e.targetX-e.x),castDistance=Math.hypot(e.targetX-e.x,e.targetY-e.y);ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,base+progress*35,0,Math.PI*2);ctx.stroke();
    if(["blade","fireBlade","waterBlade"].includes(visual)){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(castAngle);ctx.lineCap="round";ctx.strokeStyle=visual==="fireBlade"?"#ff7a21":visual==="waterBlade"?"#42dfff":e.color;ctx.shadowColor=ctx.strokeStyle;for(let line=0;line<4;line++){ctx.globalAlpha=alpha*(1-line*.16);ctx.lineWidth=14-line*3;ctx.beginPath();ctx.arc(0,0,Math.min(175,base+80)-line*8,-.9,.9);ctx.stroke()}ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.stroke();ctx.restore()}
    else if(visual==="gun"){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(castAngle);ctx.strokeStyle="#fff";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(base*.25,0);ctx.lineTo(castDistance,0);ctx.stroke();ctx.strokeStyle=e.color;ctx.lineWidth=2;for(let trail=-1;trail<=1;trail++){ctx.beginPath();ctx.moveTo(base*.2,trail*7);ctx.lineTo(castDistance,trail*2);ctx.stroke()}ctx.fillStyle="#ffe66d";ctx.beginPath();ctx.arc(castDistance,0,10+progress*24,0,Math.PI*2);ctx.fill();ctx.restore()}
    else if(visual==="graffiti"){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(castAngle);for(let stroke=0;stroke<7;stroke++){ctx.strokeStyle=["#d8ff45","#ff4fc8","#52d9ff","#fff"][stroke%4];ctx.lineWidth=8-stroke*.65;ctx.beginPath();ctx.moveTo(base*.15,Math.sin(stroke)*8);ctx.quadraticCurveTo(castDistance*.5,(stroke-3)*16,castDistance,Math.cos(stroke)*15);ctx.stroke()}ctx.fillStyle="#141419";for(let shard=0;shard<6;shard++){ctx.save();ctx.translate(castDistance*(.35+shard*.1),(shard-2.5)*12);ctx.rotate(progress*5+shard);ctx.fillRect(-7,-4,14,8);ctx.restore()}ctx.restore()}
    else if(visual==="runeBeam"){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(castAngle);for(let ring=0;ring<4;ring++){const x=base*(.5+ring*.6);ctx.strokeStyle=ring%2?"#fff":e.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,0,base*(.35+ring*.08),0,Math.PI*2);ctx.stroke()}ctx.strokeStyle="#fff";ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(base*.2,0);ctx.lineTo(castDistance,0);ctx.stroke();ctx.strokeStyle=e.color;ctx.lineWidth=22;ctx.globalAlpha=alpha*.28;ctx.stroke();ctx.restore()}
    else if(visual==="swordRain"){ctx.save();ctx.translate(e.targetX,e.targetY);ctx.rotate(castAngle);for(let sword=-3;sword<=3;sword++){ctx.save();ctx.translate(-base*.5,sword*13);ctx.strokeStyle=sword%2?"#fff":"#f7c948";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-base*.7,0);ctx.lineTo(base*.72+progress*base*.55,0);ctx.stroke();ctx.fillStyle="#f7c948";ctx.beginPath();ctx.moveTo(base*.9+progress*base*.55,0);ctx.lineTo(base*.62+progress*base*.55,-6);ctx.lineTo(base*.62+progress*base*.55,6);ctx.closePath();ctx.fill();ctx.restore()}ctx.restore()}
    else if(visual==="lightning"){ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(e.x,e.y);for(let step=1;step<=8;step++){const ratio=step/8,offset=step===8?0:(step%2?15:-15);ctx.lineTo(e.x+(e.targetX-e.x)*ratio+Math.cos(castAngle+Math.PI/2)*offset,e.y+(e.targetY-e.y)*ratio+Math.sin(castAngle+Math.PI/2)*offset)}ctx.stroke();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke()}
    else if(visual==="explosion"){for(let ring=0;ring<4;ring++){ctx.globalAlpha=alpha*(1-ring*.18);ctx.lineWidth=10-ring*2;ctx.beginPath();ctx.arc(e.targetX,e.targetY,18+progress*(55+ring*18),0,Math.PI*2);ctx.stroke()}}
    else if(visual==="shadow"){for(let ray=0;ray<7;ray++){const angle=ray*Math.PI*2/7+progress*2;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.quadraticCurveTo(e.x+Math.cos(angle)*70,e.y+Math.sin(angle)*70,e.targetX,e.targetY);ctx.stroke()}}
    else if(visual==="psychic"){for(let ring=0;ring<4;ring++){ctx.lineWidth=5-ring;ctx.beginPath();ctx.arc(e.targetX,e.targetY,base+ring*18+progress*45,0,Math.PI*2);ctx.stroke()}}
    else if(visual==="drill"){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(castAngle);ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(Math.min(castDistance,base+125),0);ctx.lineTo(base*.2,-base*.42);ctx.lineTo(base*.2,base*.42);ctx.closePath();ctx.stroke();for(let turn=0;turn<5;turn++){ctx.beginPath();ctx.ellipse(base*(.24+turn*.42),0,base*(.14+turn*.03),base*(.39-turn*.05),0,0,Math.PI*2);ctx.stroke()}ctx.restore()}
    else if(visual==="chainsaw"){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(castAngle);ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(base*.2,0);ctx.lineTo(Math.min(castDistance,base+120),0);ctx.stroke();ctx.strokeStyle="#fff";ctx.lineWidth=2;for(let tooth=0;tooth<10;tooth++){const x=base*.25+tooth*base*.15;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+base*.08,(tooth%2?1:-1)*base*.2);ctx.stroke()}ctx.restore()}
    else if(visual==="kagune"){for(let arm=-2;arm<=2;arm++){ctx.lineWidth=9-Math.abs(arm);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.quadraticCurveTo((e.x+e.targetX)/2+Math.sin(arm)*45,(e.y+e.targetY)/2+arm*22,e.targetX,e.targetY+arm*8);ctx.stroke()}}
    else if(visual==="notebook"){ctx.lineWidth=4;ctx.strokeRect(e.targetX-base*.45,e.targetY-base*.34,base*.9,base*.68);ctx.beginPath();ctx.moveTo(e.targetX-base*.3,e.targetY-base*.12);ctx.lineTo(e.targetX+base*.3,e.targetY-base*.12);ctx.moveTo(e.targetX-base*.3,e.targetY+base*.08);ctx.lineTo(e.targetX+base*.18,e.targetY+base*.08);ctx.stroke();ctx.beginPath();ctx.arc(e.targetX,e.targetY,base+progress*38,0,Math.PI*2);ctx.stroke()}
    else if(visual==="alchemy"){ctx.save();ctx.translate(e.targetX,e.targetY);ctx.rotate(progress*Math.PI);ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,base+progress*34,0,Math.PI*2);ctx.stroke();for(let point=0;point<6;point++){const angle=point*Math.PI/3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(angle)*(base+30),Math.sin(angle)*(base+30));ctx.stroke()}ctx.restore()}
    if(["beam","control","mark","precision","dot"].includes(e.powerType)&&castDistance>10){ctx.globalAlpha=alpha*.55;ctx.setLineDash([10,8]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.targetX,e.targetY);ctx.stroke()}
  }else if(e.type==="dash"){
    ctx.lineCap="round";ctx.lineWidth=18*alpha;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.targetX,e.targetY);ctx.stroke();ctx.globalAlpha=alpha*.7;ctx.strokeStyle="#fff";ctx.lineWidth=4;ctx.stroke();
  }else{
    ctx.lineWidth=(e.type==="ultimate"?10:5)*(1-progress);ctx.beginPath();ctx.arc(e.x,e.y,base+progress*(e.type==="ultimate"?210:58),0,Math.PI*2);ctx.stroke();
    if(e.type==="ultimate"&&e.visual){ctx.translate(e.x,e.y);ctx.rotate(progress*Math.PI*2);const spikes=/drill|blade|slash|sword|kagune/i.test(e.visual)?12:/fire|meteor|atomic|smash/i.test(e.visual)?18:8;for(let ray=0;ray<spikes;ray++){const angle=ray*Math.PI*2/spikes,inner=base+progress*35,outer=inner+45+progress*75;ctx.globalAlpha=alpha*.55;ctx.lineWidth=ray%3===0?6:2;ctx.beginPath();ctx.moveTo(Math.cos(angle)*inner,Math.sin(angle)*inner);ctx.lineTo(Math.cos(angle)*outer,Math.sin(angle)*outer);ctx.stroke()}}
    if(e.type==="hit")for(let ray=0;ray<6;ray++){const angle=ray*Math.PI/3;ctx.beginPath();ctx.moveTo(e.x+Math.cos(angle)*12,e.y+Math.sin(angle)*12);ctx.lineTo(e.x+Math.cos(angle)*(28+progress*32),e.y+Math.sin(angle)*(28+progress*32));ctx.stroke()}
  }
  ctx.restore();
}
function showBattleBanner(src,title,text){const banner=$("#battleBanner");banner.querySelector("img").src=src;banner.querySelector("b").textContent=title;banner.querySelector("span").textContent=text;banner.classList.remove("hidden");clearTimeout(showBattleBanner.timer);showBattleBanner.timer=setTimeout(()=>banner.classList.add("hidden"),3200)}
function endBattle(winner){const b=state.battle;b.over=true;setTimeout(()=>{finishBattle(winner?.id??null);send({type:"battle_end",winnerId:winner?.id??null})},700)}
function finishBattle(winnerId){const b=state.battle;if(!b||b.resultShown)return;b.resultShown=true;b.over=true;stopBattleMusic();const winner=b.fighters.find(f=>f.id===winnerId)||[...b.fighters].sort((a,c)=>c.hp-a.hp)[0];if(!winner)return;$("#winnerName").textContent=winner.name;$("#winnerOrb").style.background=winner.color;$("#winnerOrb img").src=winner.power.icon;$("#winnerLoadout").textContent=`${winner.universe.name} · ${winner.race.name} · ${winner.power.name} · ${fighterUltimate(winner).name} · ${Math.ceil(winner.hp)} HP осталось`;$("#matchStats").innerHTML=[...b.fighters].sort((a,c)=>c.damageDone-a.damageDone).map((f,index)=>`<div class="match-row"><span>#${index+1}</span><b>${escapeHtml(f.name)}</b><span>${Math.round(f.damageDone)} урона</span><span>${f.kills} KO</span><b>${Math.ceil(Math.max(0,f.hp))} HP</b></div>`).join("");$("#playAgain").classList.toggle("hidden",!isHost());$("#winnerModal").classList.remove("hidden");playSound("reveal",.75)}
function formatTime(seconds){const m=Math.floor(seconds/60).toString().padStart(2,"0"),s=Math.floor(seconds%60).toString().padStart(2,"0");return `${m}:${s}`}
function applyHome(){if(state.battle?.raf)cancelAnimationFrame(state.battle.raf);stopBattleMusic();state.battle=null;$("#winnerModal").classList.add("hidden");$("#deathNoteModal").classList.add("hidden");$("#deathNoteWarning").classList.add("hidden");showScreen("lobbyScreen");renderLobby()}

// ---------------- Interface events ----------------
$("#createRoom").addEventListener("click",()=>{if(state.multiplayer.socket?.readyState!==WebSocket.OPEN)return setRoomMessage("Сервер ещё подключается",true);send({type:"create",...currentProfile()});setRoomMessage("Создаём комнату…")});
$("#joinRoom").addEventListener("click",()=>{const code=$("#roomCodeInput").value.trim().toUpperCase();if(code.length!==5)return setRoomMessage("В коде должно быть 5 символов",true);if(state.multiplayer.socket?.readyState!==WebSocket.OPEN)return setRoomMessage("Сервер ещё подключается",true);send({type:"join",code,...currentProfile()});setRoomMessage("Подключаемся…")});
$("#roomCodeInput").addEventListener("input",event=>event.target.value=event.target.value.toUpperCase().replace(/[^A-Z2-9]/g,"").slice(0,5));
$("#startRoulette").addEventListener("click",()=>{if(!isHost()||room().players.length<2)return;send({type:"start",players:room().players})});
$("#spinButton").addEventListener("click",requestSpin);$("#openBuild").addEventListener("click",showBuild);$("#closeBuild").addEventListener("click",()=>$("#buildModal").classList.add("hidden"));
$("#copyInvite").addEventListener("click",async()=>{const url=`${location.origin}${location.pathname}?room=${room().code}`;try{await navigator.clipboard.writeText(url);showToast("Ссылка скопирована")}catch{showToast(`Код: ${room().code}`)}});
$$('[data-rules]').forEach(button=>button.addEventListener("click",()=>$("#rulesModal").classList.remove("hidden")));$$('[data-close-rules]').forEach(button=>button.addEventListener("click",()=>$("#rulesModal").classList.add("hidden")));
$$('[data-home]').forEach(button=>button.addEventListener("click",()=>{if(isHost())send({type:"home"})}));
[$("#soundToggle"),$("#battleSound")].forEach(button=>button.addEventListener("click",()=>{state.sound=!state.sound;[$("#soundToggle"),$("#battleSound")].forEach(item=>item.textContent=state.sound?"♪":"×");if(state.sound)startBattleMusic();else battleMusic.pause()}));
$("#battleSpeed").addEventListener("click",()=>{if(!isHost())return;state.speed=state.speed===1?1.5:state.speed===1.5?2:1;$("#battleSpeed").textContent=`×${state.speed}`});
$("#skillHud").addEventListener("pointerdown",event=>{event.preventDefault();startPowerAim();event.currentTarget.setPointerCapture?.(event.pointerId)});
$("#skillHud").addEventListener("pointerup",event=>{event.preventDefault();releasePowerAim()});
$("#skillHud").addEventListener("pointercancel",cancelPowerAim);
$("#abilityHud").addEventListener("click",requestUltimate);
$("#closeDeathNote").addEventListener("click",closeDeathNote);
$("#deathNoteModal").addEventListener("click",event=>{if(event.target===$("#deathNoteModal"))closeDeathNote()});
$("#deathNoteTargets").addEventListener("click",event=>{const button=event.target.closest("[data-target-id]");if(button)chooseDeathNoteTarget(Number(button.dataset.targetId))});
canvas.addEventListener("pointermove",updateAimFromPointer);
canvas.addEventListener("pointerdown",event=>{if(event.button!==0||!$("#battleScreen").classList.contains("active"))return;event.preventDefault();updateAimFromPointer(event);startBattleMusic();if(!state.battle?.powerAiming)requestBasicAttack(state.battle.aimX,state.battle.aimY)});
window.addEventListener("keydown",event=>{if(!["KeyE","KeyF"].includes(event.code)||event.repeat||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;if($("#battleScreen").classList.contains("active")){event.preventDefault();if(event.code==="KeyE")startPowerAim();else requestUltimate();}});
window.addEventListener("keyup",event=>{if(event.code==="KeyE"&&$("#battleScreen").classList.contains("active")){event.preventDefault();releasePowerAim()}});
window.addEventListener("blur",cancelPowerAim);
$("#playAgain").addEventListener("click",()=>{if(isHost())send({type:"home"})});
$("#onlineName").addEventListener("change",()=>{if(room())send({type:"profile",...currentProfile()})});
$("#onlineColor").addEventListener("change",()=>{$("#lobbyColor").value=$("#onlineColor").value;updateAvatarPreview();if(room())send({type:"profile",...currentProfile()})});
const appearanceControls=[$("#faceStyle"),$("#auraStyle"),$("#accessoryStyle"),$("#patternStyle")];
for(const input of appearanceControls)input.addEventListener("change",()=>{updateAvatarPreview();if(room())send({type:"profile",...currentProfile()})});
$("#lobbyColor").addEventListener("change",()=>{$("#onlineColor").value=$("#lobbyColor").value;updateAvatarPreview();if(room())send({type:"profile",...currentProfile()})});

$("#onlineName").value=localStorage.getItem("powerRouletteName")||"Shadow";$("#onlineColor").value=localStorage.getItem("powerRouletteColor")||PLAYER_COLORS[Math.floor(Math.random()*PLAYER_COLORS.length)];$("#lobbyColor").value=$("#onlineColor").value;
let savedAppearance=DEFAULT_APPEARANCE;try{savedAppearance=cleanAppearance(JSON.parse(localStorage.getItem("powerRouletteAppearance")||"{}"))}catch{}
for(const [key,value] of Object.entries(savedAppearance))$({face:"#faceStyle",aura:"#auraStyle",accessory:"#accessoryStyle",pattern:"#patternStyle"}[key]).value=value;updateAvatarPreview();
$("#universeTicker").innerHTML=UNIVERSES.map(item=>`<div class="ticker-item" title="${escapeAttr(item.name)}" style="border-color:${item.color}"><img src="${item.icon}" alt=""></div>`).join("");
connectMultiplayer();
