#!/usr/bin/env bash
set -euo pipefail

source_root="${1:?Pass the cloned game-icons repository path}"
project_root="$(cd "$(dirname "$0")/.." && pwd)"
target="$project_root/public/assets/icons"
mkdir -p "$target"

icon_names=$(node - "$project_root/public/data.js" <<'NODE'
global.window = {};
require(process.argv[2]);
const { UNIVERSES, UNIVERSAL_ROULETTES } = window.POWER_DATA;
const names = new Set(['race-human','race-fighter','race-mystic','race-demon','race-giant','race-machine']);
for (const universe of UNIVERSES) {
  names.add(universe.icon.split('/').pop().replace('.png',''));
  names.add(universe.ultimate.id);
  for (const power of universe.powers) names.add(power.id);
}
for (const roulette of UNIVERSAL_ROULETTES) {
  names.add(`stat-${roulette.id}`);
  roulette.options.forEach((option, index) => names.add(`${roulette.id}-${index + 1}`));
}
console.log([...names].join('\n'));
NODE
)

source_for() {
  case "$1" in
    race-human) echo "person";; race-fighter) echo "ninja-heroic-stance";; race-mystic) echo "wizard-face";;
    race-demon) echo "daemon-skull";; race-giant) echo "giant";; race-machine) echo "robot-golem";;
    opm|serious-punch|one-for-all|jajanken|star-platinum) echo "fist";;
    death-note|death-notebook) echo "death-note";; jojo) echo "stone-mask";; dragon-ball) echo "dragon-balls";;
    naruto) echo "ninja-mask";; bleach) echo "sword-hilt";; one-piece) echo "pirate-skull";;
    jujutsu) echo "evil-hand";; demon-slayer) echo "katana";; attack-titan) echo "giant";;
    mha) echo "mailed-fist";; hunter) echo "targeting";; chainsaw|chainsaw-rush) echo "chainsaw";;
    black-clover) echo "three-leaves";; solo-leveling|eminence) echo "shadow-grasp";;
    fullmetal) echo "pentacle";; tokyo-ghoul) echo "carnivore-mouth";; mob) echo "psychic-waves";;
    gurren) echo "drill";; fairy-tail) echo "fairy-wings";; re-zero) echo "crystal-wand";;
    evangelion) echo "robot-golem";; slime) echo "slime";; ragnarok) echo "thor-hammer";;
    parasyte) echo "tentacles-skull";; seven-deadly-sins) echo "seven-pointed-star";;
    ultimate-opm) echo "punch-blast";; ultimate-death-note) echo "death-note";; ultimate-jojo) echo "stopwatch";;
    ultimate-dragon-ball) echo "aura";; ultimate-naruto) echo "all-seeing-eye";; ultimate-bleach) echo "sword-array";;
    ultimate-one-piece) echo "spring";; ultimate-jujutsu) echo "pentacle";; ultimate-demon-slayer) echo "flaming-claw";;
    ultimate-attack-titan) echo "earth-crack";; ultimate-mha) echo "mailed-fist";; ultimate-hunter) echo "third-eye";;
    ultimate-chainsaw) echo "chainsaw";; ultimate-black-clover) echo "daemon-skull";; ultimate-solo-leveling) echo "shadow-grasp";;
    ultimate-fullmetal) echo "philosopher-bust";; ultimate-tokyo-ghoul) echo "tentacles-skull";; ultimate-mob) echo "psychic-waves";;
    ultimate-gurren) echo "drill";; ultimate-eminence) echo "atomic-slashes";; ultimate-fairy-tail) echo "dragon-head";;
    ultimate-re-zero) echo "cycle";; ultimate-evangelion) echo "robot-golem";; ultimate-slime) echo "dripping-goo";;
    ultimate-ragnarok) echo "hammer-drop";; ultimate-parasyte) echo "tentacle-strike";; ultimate-seven-deadly-sins) echo "daemon-skull";;
    return-by-death) echo "time-trap";; invisible-providence) echo "invisible-face";; el-huma) echo "ice-bolt";;
    oni-blood) echo "horned-helm";; shamak) echo "shadow-grasp";;
    at-field) echo "energy-shield";; progressive-knife) echo "stiletto";; positron-rifle) echo "laser-blast";;
    longinus-spear) echo "spear-hook";; eva-berserk) echo "robot-antennas";;
    predator) echo "carnivore-mouth";; great-sage) echo "brain";; beelzebuth) echo "black-hole-bolas";;
    megiddo) echo "sunbeams";; black-flame) echo "burning-skull";;
    volundr) echo "crossed-swords";; eyes-of-lord) echo "all-seeing-eye";; thors-hammer) echo "thor-hammer";;
    sky-eater) echo "halberd";; tandava-karma) echo "flaming-claw";;
    migi-blade) echo "severed-hand";; parasite-shield) echo "shield-reflect";; tentacle-barrage) echo "tentacle-strike";;
    parasite-senses) echo "six-eyes";; body-takeover) echo "internal-organ";;
    full-counter) echo "mirror-mirror";; snatch) echo "grab";; disaster) echo "root-tip";;
    creation) echo "stone-pile";; infinity) echo "infinity";;
    stat-strength|strength-*) echo "biceps";; stat-iq|iq-*) echo "brain";; stat-speed|speed-*) echo "sprint";;
    stat-durability|durability-*) echo "armor-vest";; stat-height|height-*) echo "body-height";;
    stat-combat|combat-*) echo "crossed-swords";; stat-luck|luck-*) echo "perspective-dice-six-faces-random";;
    *telekin*|tatsumaki|rulers-authority|limitless|psychic-*|mob-100) echo "psychic-waves";;
    *notebook*|memory-gambit) echo "notebook";; *eye*|ultra-instinct|perfect-plan|compass-needle|future-sight|homunculus-eye) echo "all-seeing-eye";;
    *punch*|lagann-impact|arc-gurren) echo "punch-blast";;
    incineration|kamehameha|final-flash|special-beam|magic-overdrive|heavenly-body) echo "laser-blast";;
    *slash*|zangetsu|senbonzakura|slime-sword|mutilation|anti-magic) echo "sword-slice";;
    regeneration|crazy-diamond|gold-experience|requip) echo "healing";;
    shinigami-eyes) echo "evil-eyes";; apple-bargain) echo "shiny-apple";;
    the-world|boogie-woogie|time-magic) echo "stopwatch";; killer-queen|explosion-quirk) echo "explosion-rays";;
    destructo-disc) echo "spinning-blades";; rasengan) echo "orb-wand";; chidori|thunder-breathing) echo "lightning-frequency";;
    amaterasu|ryujin-jakka|magma-fruit|sun-breathing|flame-alchemy|fire-dragon) echo "fire-ray";;
    sand-defense) echo "sandstorm";; flying-raijin|godspeed|shadow-step|shadow-exchange) echo "sprint";;
    vollstandig) echo "winged-arrow";; nika) echo "spring";; ope-ope) echo "teleport";;
    gura-gura|colossal-titan|super-galaxy|i-am-atomic|fairy-law) echo "explosion-rays";;
    conqueror-haki|domain-monarch) echo "aura";; ten-shadows|dark-shadow|dream-magic) echo "two-shadows";;
    shrine|curse-nail|deconstruction|decay) echo "cracked-glass";; blood-*|blood-piercing|blood-sickles) echo "bleeding-wound";;
    water-breathing) echo "water-splash";; attack-titan-power|female-titan|armored-titan) echo "giant";;
    war-hammer-titan|blood-hammer) echo "thor-hammer";; half-cold-hot|ice-make) echo "fire-ice";;
    bungee-gum) echo "rubber-band";; skill-hunter) echo "bookmark";; dragon-dive) echo "dragon-spiral";;
    control-chain) echo "chain-lightning";; anti-magic) echo "magic-axe";; wind-spirit) echo "wind-slap";;
    dark-magic|shadow-*) echo "shadow-grasp";; dagger-rush) echo "crossed-daggers";;
    earth-alchemy) echo "stone-pile";; ultimate-shield|psychic-barrier) echo "shield-reflect";;
    rinkaku|ukaku|koukaku|bikaku|kakuja) echo "tentacles-skull";; plant-control) echo "root-tip";;
    giga-drill|tengen-toppa) echo "drill";; blood-queen) echo "bleeding-eye";;
    *) echo "magic-swirl";;
  esac
}

while IFS= read -r output; do
  # This one is a dedicated public-domain Sharingan asset, not a Game-icons glyph.
  if [[ "$output" == "ultimate-naruto" && -s "$target/$output.png" ]]; then
    continue
  fi
  source_name=$(source_for "$output")
  source_file=$(find "$source_root" -type f -name "$source_name.svg" | head -n 1 || true)
  if [[ -z "$source_file" ]]; then
    source_name="fist"
    source_file=$(find "$source_root" -type f -name "fist.svg" | head -n 1)
  fi
  author=$(basename "$(dirname "$source_file")")
  curl -fsSL --retry 2 "https://game-icons.net/icons/ffffff/transparent/1x1/$author/$source_name.png" -o "$target/$output.png"
done <<< "$icon_names"

echo "Downloaded $(find "$target" -type f -name '*.png' | wc -l) transparent PNG icons."
