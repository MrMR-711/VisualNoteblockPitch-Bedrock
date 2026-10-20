/**
 * ============================================================================
 *  Visual Noteblock Pitch — Minecraft Bedrock 26.0+ (@minecraft/server 2.0.0)
 * ============================================================================
 *  Logic overview (mirrors the vanilla note block):
 *   - Right-click / tap        -> cycle pitch 0..24, play the new note
 *   - Redstone rising edge     -> play the stored note
 *     (via minecraft:redstone_consumer + onRedstoneUpdate, vanilla-accurate)
 *   - Instrument               -> looked up from the block DIRECTLY BELOW
 *   - Player/mob head ABOVE    -> plays the mob sound instead of an instrument
 *   - Solid block above        -> muted, like vanilla
 *   - Pitch value              -> 2^((note - 12) / 12)  (two full octaves)
 * ============================================================================
 */

import { world, system, MolangVariableMap } from "@minecraft/server";

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const BLOCK_ID = "notey:visual_noteblock_pitch";
// NOTE: Bedrock limits block-state arrays to 16 values, so the 25-note pitch
// is stored in two states: octave (0-1) and semitone (0-12).
// note = octave * 13 + semitone  (0..24, exactly vanilla's two octaves)
const OCTAVE_STATE = "notey:octave";
const SEMITONE_STATE = "notey:semitone";
const MAX_NOTE = 24;
const NOTE_VOLUME = 3.0; // vanilla note blocks are audible up to ~48 blocks

/** Flip to true to dump diagnostics into the content log. */
const DEBUG = false;

function debug(message) {
    if (DEBUG) console.warn(`[VisualNoteblockPitch] ${message}`);
}

// ---------------------------------------------------------------------------
//  Instrument selection — block below the note block (Java/Bedrock table)
// ---------------------------------------------------------------------------

/** Blocks with a unique, exact-match instrument. */
/**
 * Exact-match blocks -> instrument sound.
 * Source of truth: official minecraft.wiki "Note Block" instruments table
 * (Java + Bedrock column) cross-checked with per-block infobox fields.
 * Nothing here is guessed; blocks not listed anywhere fall through to harp.
 */
const EXACT_INSTRUMENTS = new Map([
    ["minecraft:gold_block", "note.bell"],
    ["minecraft:iron_block", "note.iron_xylophone"],
    ["minecraft:clay", "note.flute"],
    // Flute �" Bedrock-only extras per the official table:
    ["minecraft:honeycomb_block", "note.flute"],
    ["minecraft:monster_egg", "note.flute"], // infested blocks (a single block id with states on BE)
    ["minecraft:resin_block", "note.flute"],
    ["minecraft:packed_ice", "note.chime"],
    ["minecraft:bone_block", "note.xylophone"],
    ["minecraft:soul_sand", "note.cow_bell"], // NOTE: soul SOIL is harp, not cow bell
    ["minecraft:emerald_block", "note.bit"],
    ["minecraft:hay_block", "note.banjo"],
    ["minecraft:glowstone", "note.pling"],
    ["minecraft:heavy_core", "note.snare"],
    ["minecraft:pumpkin", "note.didgeridoo"],
    ["minecraft:carved_pumpkin", "note.didgeridoo"],
    ["minecraft:lit_pumpkin", "note.didgeridoo"],
    ["minecraft:beacon", "note.hat"],
    ["minecraft:conduit", "note.hat"],
    ["minecraft:sea_lantern", "note.hat"],
]);

// --------------------------------------------------------------------------
//  Copper -> trumpet family (added in Bedrock 26.10 / Java 26.x; cut copper
//  slab+stairs joined in 26.20). Waxed variants keep the instrument of their
//  oxidation stage. Pure copper door/trapdoor/grate/bulb/lantern = harp.
// --------------------------------------------------------------------------

const TRUMPET_COPPER_FORMS = new Set([
    "copper_block", "cut_copper", "chiseled_copper",
    "cut_copper_slab", "cut_copper_double_slab", "cut_copper_stairs",
]);

const COPPER_STAGES = [
    ["oxidized_", "note.trumpet_oxidized"],
    ["weathered_", "note.trumpet_weathered"],
    ["exposed_", "note.trumpet_exposed"],
];

/**
 * @param {string} id Block id without the "minecraft:" namespace.
 * @returns {?string} note.trumpet* sound id, or null when not a trumpet block.
 */
function copperTrumpet(id) {
    let s = id;
    if (s.startsWith("waxed_")) s = s.slice("waxed_".length); // waxed = frozen stage
    for (const [prefix, sound] of COPPER_STAGES) {
        if (s.startsWith(prefix)) {
            const base = s.slice(prefix.length);
            // The plain block drops "_block" in its oxidized variants:
            // "oxidized_copper" IS the oxidized copper block.
            return (base === "copper" || TRUMPET_COPPER_FORMS.has(base)) ? sound : null;
        }
    }
    // "waxed_copper" is the waxed copper block (no "_block" suffix either).
    return (s === "copper" || TRUMPET_COPPER_FORMS.has(s)) ? "note.trumpet" : null;
}

// Snare = sand material: sand, red sand, suspicious sand/gravel, gravel,
// concrete powder. (Sandstone family is a BASS-DRUM block, see stone list.)
const SNARE_KEYWORDS = ["gravel", "concrete_powder"];

// Bass drum = stone/material "stone" family + documented extras.
// NOTE: on Bedrock the bass drum event is note.bd (note.bass is the string bass!).
const BASEDRUM_KEYWORDS = [
    "stone", "cobble", "deepslate", "blackstone", "basalt", "obsidian", "netherrack",
    "nylium", "brick", "end_stone", "quartz", "purpur", "prismarine",
    "granite", "diorite", "andesite", "polished", "tuff",
    "terracotta", "concrete", "_ore", "ancient_debris", "coral", "magma", "raw_",
    "furnace", "smoker", "observer", "stonecutter", "respawn_anchor", "bedrock",
];

/**
 * Blocks whose id matches a keyword but are NOT bass drum (verified harp).
 * Kept exact so "redstone_ore" / "deepslate_redstone_ore" still match "_ore" -> note.bd.
 */
const BASEDRUM_EXCLUSIONS = new Set([
    "minecraft:redstone_block", "minecraft:redstone_lamp", "minecraft:redstone_torch",
    "minecraft:lodestone", "minecraft:grindstone",
]);

// Wood extras: documented wooden utility/decoration blocks without wood in the id.
const EXTRA_WOODEN = new Set([
    "minecraft:crafting_table", "minecraft:bookshelf", "minecraft:chiseled_bookshelf",
    "minecraft:chest", "minecraft:trapped_chest", "minecraft:barrel",
    "minecraft:jukebox", "minecraft:note_block", "minecraft:noteblock", "notey:visual_noteblock_pitch",
    "minecraft:composter", "minecraft:loom", "minecraft:cartography_table",
    "minecraft:fletching_table", "minecraft:smithing_table", "minecraft:lectern",
    "minecraft:beehive", "minecraft:bee_nest", "minecraft:bamboo_block",
    "minecraft:daylight_detector",
]);

const WOOD_KEYWORDS = ["planks", "_log", "_wood", "_stem", "_hyphae", "bamboo_mosaic"];

/**
 * Decides the instrument sound id from the block under the note block.
 * Mirrors vanilla priority: exact specials -> copper trumpets -> wool/guitar
 * -> snare -> hat/glass -> bass drum -> bass (wood) -> harp default.
 * @param {string} typeId The identifier of the block below.
 * @returns {string} A vanilla note-block sound event id.
 */
function getInstrument(typeId) {
    if (!typeId || typeId === "minecraft:air") return "note.harp";

    const exact = EXACT_INSTRUMENTS.get(typeId);
    if (exact) return exact;

    return copperTrumpet(typeId.replace("minecraft:", ""))
        ?? checkMaterials(typeId);
}

/** Material-family fallback chain after the exact specials. */
function checkMaterials(typeId) {
    if (typeId.includes("wool")) return "note.guitar";

    // sand family, but NOT sandstone (that is a bass drum block in vanilla)
    const isSand = (typeId.includes("sand") && !typeId.includes("sandstone"))
        || SNARE_KEYWORDS.some((k) => typeId.includes(k));
    if (isSand) return "note.snare";

    if (typeId.includes("glass")) return "note.hat";

    const isBasedrum = !BASEDRUM_EXCLUSIONS.has(typeId)
        && BASEDRUM_KEYWORDS.some((k) => typeId.includes(k));
    if (isBasedrum) return "note.bd";

    // Wood: utility blocks, wood keywords, then wooden "product forms" whose
    // ids carry no wood marker. Everything stone/metal was already handled
    // above, so remaining slabs/stairs/fences/etc. are wooden.
    if (EXTRA_WOODEN.has(typeId) || WOOD_KEYWORDS.some((k) => typeId.includes(k))) return "note.bass";
    if (typeId.includes("sign") || typeId.includes("shelf")) return "note.bass";
    if (typeId.includes("fence") || typeId.includes("_gate")) return "note.bass";
    if ((typeId.includes("door") || typeId.includes("trapdoor"))
        && !typeId.includes("iron") && !typeId.includes("copper")) return "note.bass";
    if (typeId.includes("button")) return "note.bass";
    if (typeId.includes("pressure_plate") && !typeId.includes("weighted")) return "note.bass";
    if (typeId.includes("_slab") || typeId.includes("_stairs")) return "note.bass";

    return "note.harp";
}

// ---------------------------------------------------------------------------
//  Mob/player head playing (head on top overrides the instrument, like Java)
// ---------------------------------------------------------------------------

/**
 * @param {string} typeId Identifier of the block above the note block.
 * @returns {string|undefined} Mob sound id, or undefined when it is not a head.
 */
function getHeadSound(typeId) {
    if (!typeId) return undefined;
    const isHead = typeId.includes("skull") || typeId.includes("_head");
    if (!isHead) return undefined;
    if (typeId.includes("wither_skeleton")) return "note.wither_skeleton";
    if (typeId.includes("skeleton")) return "note.skeleton";
    if (typeId.includes("zombie")) return "note.zombie";
    if (typeId.includes("creeper")) return "note.creeper";
    if (typeId.includes("dragon")) return "note.enderdragon";
    if (typeId.includes("piglin")) return "note.piglin";
    return undefined;
}

// ---------------------------------------------------------------------------
//  Core "play the note" routine
// ---------------------------------------------------------------------------

/**
 * Fetches a block at an offset without throwing (unloaded chunk / out of
 * world). We deliberately avoid Block.above()/below() so this also works on
 * API versions where those helpers are unavailable.
 */
function getBlockAt(block, dx, dy, dz) {
    try {
        return block.dimension.getBlock({ x: block.x + dx, y: block.y + dy, z: block.z + dz });
    } catch {
        return undefined;
    }
}

/**
 * Plays the note stored in the block state, choosing instrument from the
 * block below and respecting the vanilla "block above mutes the note" rule.
 * @param {import("@minecraft/server").Block} block
 * @returns {boolean} true when a sound was actually emitted.
 */
function playNote(block) {
    const note = getNote(block.permutation);
    const center = { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 };

    const above = getBlockAt(block, 0, 1, 0);

    // 1) Mob head on top -> mob sound (pitch-independent, like vanilla).
    const headSound = above ? getHeadSound(above.typeId) : undefined;
    if (headSound) {
        block.dimension.playSound(headSound, center, { volume: NOTE_VOLUME });
        spawnNoteParticle(block, note);
        return true;
    }

    // 2) Anything above mutes the note (vanilla behaviour).
    if (!above || !above.isAir) {
        debug(`playNote muted at ${block.x},${block.y},${block.z} (above=${above?.typeId})`);
        return false;
    }

    const below = getBlockAt(block, 0, -1, 0);
    const instrument = getInstrument(below?.typeId);
    const pitch = Math.pow(2, (note - 12) / 12);

    block.dimension.playSound(instrument, center, { pitch, volume: NOTE_VOLUME });
    debug(`playNote ${instrument} note=${note} pitch=${pitch.toFixed(3)} at ${block.x},${block.y},${block.z}`);

    spawnNoteParticle(block, note);
    return true;
}

/**
 * Spawns the little colored music note floating out of the top face.
 * The vanilla minecraft:note_particle tints itself from the Molang variable
 * `note_color` (see Mojang's particles/note.json); spawning it WITHOUT that
 * variable is exactly what made the particle render black before.
 * Colors use the vanilla sine-curve mapping (noteParticleColor below).
 */
function spawnNoteParticle(block, note) {
    try {
        const { r, g, b } = noteParticleColor(note);
        const vars = new MolangVariableMap();
        vars.setColorRGB("note_color", { red: r, green: g, blue: b });
        block.dimension.spawnParticle(
            "minecraft:note_particle",
            { x: block.x + 0.5, y: block.y + 1.2, z: block.z + 0.5 },
            vars
        );
    } catch { /* particle is purely cosmetic */ }
}

/**
 * Vanilla note-particle color for a note index, ported from the note block's
 * sine curve: three waves offset by thirds over f = note/24 (a full rainbow
 * across the two octaves).
 */
function noteParticleColor(note) {
    const f = note / 24.0;
    const wave = (x) => Math.max(0.0, Math.sin(x * Math.PI * 2.0) * 0.65 + 0.35);
    return { r: wave(f), g: wave(f + 1.0 / 3.0), b: wave(f + 2.0 / 3.0) };
}

function clampNote(note) {
    if (!Number.isFinite(note)) return 0;
    return Math.min(MAX_NOTE, Math.max(0, Math.trunc(note)));
}

/**
 * Reads the note (0-24) stored in the block's two states.
 * The semitone state spans 0-12 = THIRTEEN semitones per octave, so the
 * encoding is pitch = octave*13 + semitone (NOT *12 — using 12 made the
 * texture permutations skip one pitch in the second octave and reset early).
 * @param {import("@minecraft/server").BlockPermutation} permutation
 */
function getNote(permutation) {
    const octave = Number(permutation.getState(OCTAVE_STATE) ?? 0) === 1 ? 1 : 0;
    let semitone = Number(permutation.getState(SEMITONE_STATE) ?? 0);
    if (!Number.isFinite(semitone)) semitone = 0;
    semitone = Math.min(12, Math.max(0, Math.trunc(semitone)));
    return clampNote(octave * 13 + semitone);
}

/**
 * Writes a note (0-24) into the block states.
 * n <= 12 -> (octave 0, semitone n); n >= 13 -> (octave 1, semitone n-13).
 * @param {import("@minecraft/server").Block} block
 * @param {number} note
 */
function setNote(block, note) {
    const n = clampNote(note);
    const octave = n >= 13 ? 1 : 0;
    const semitone = n - octave * 13;
    block.setPermutation(
        block.permutation
            .withState(OCTAVE_STATE, octave)
            .withState(SEMITONE_STATE, semitone)
    );
}

function safeGet(block, fn) {
    try { return fn(block); } catch { return undefined; }
}

// ---------------------------------------------------------------------------
//  1) Manual tuning: right-click / tap cycles the pitch (0 -> 24 -> 0)
//
//  Tuning is handled by the onPlayerInteract custom-component hook below.
//  The mere PRESENCE of that hook makes the engine treat this block as an
//  "interactable" block (like a chest or crafting table), so right-clicking
//  it with a block in hand never starts a client-side placement prediction
//  (no ghost/rubber-banded block), exactly like the vanilla note block.
// ---------------------------------------------------------------------------

/** Small debounce so double-fired interact events don't skip two notes. */
const lastTune = new Map();

/**
 * Tunes the noteblock at `loc` for `player`: cycle the pitch, play it, and
 * show the note name on the action bar. Runs in a deferred (unrestricted)
 * context, so performing world mutations here is always safe.
 */
function tuneNoteBlock(dimension, loc, player) {
    let target;
    try {
        target = dimension.getBlock(loc);
    } catch {
        return; // chunk unloaded in the meantime
    }
    if (!target || target.typeId !== BLOCK_ID) return;

    // Debounce double-fired interact events (main hand + off hand).
    const tick = system.currentTick;
    const prev = lastTune.get(player.id);
    if (prev && prev.tick === tick && prev.x === loc.x && prev.y === loc.y && prev.z === loc.z) {
        return;
    }
    lastTune.set(player.id, { tick, x: loc.x, y: loc.y, z: loc.z });

    const next = (getNote(target.permutation) + 1) % (MAX_NOTE + 1);
    setNote(target, next);

    playNote(target);
    // No action-bar readout: the vanilla note block shows nothing when tuned,
    // so neither do we.
}

// ---------------------------------------------------------------------------
//  2) Redstone: rising-edge trigger with the native redstone_consumer +
//     onRedstoneUpdate event (stable since 26.0 / @minecraft/server 2.0.0).
//
//  NOTE: onRedstoneUpdate also fires on placement and chunk load, so we track
//  the last observed power per block and only ring on a 0 -> >0 transition.
// ---------------------------------------------------------------------------

/** Last known redstone power per noteblock location ("dim|x,y,z" -> power). */
const lastPower = new Map();

function keyOf(block) {
    return `${block.dimension.id}|${block.x},${block.y},${block.z}`;
}

system.beforeEvents.startup.subscribe((init) => {
    init.blockComponentRegistry.registerCustomComponent("notey:visual_pitch_redstone", {
        // IMPORTANT: having this hook at all makes the block "interactable",
        // which suppresses client-side block-placement prediction on right
        // click (no ghost blocks being flashed against the noteblock).
        onPlayerInteract(event) {
            const player = event.player;
            if (!player) return;

            // Sneak + interact keeps the normal behaviour (placing blocks
            // against it), exactly like the vanilla note block.
            if (player.isSneaking) return;

            const block = event.block;
            const loc = { x: block.x, y: block.y, z: block.z };
            system.run(() => tuneNoteBlock(block.dimension, loc, player));
        },

        // Seed the tracker when the block is placed so a powered placement
        // does not spam a note from the initial redstone update.
        onPlace(event) {
            const power = safeGet(event.block, (b) => b.getRedstonePower()) ?? 0;
            lastPower.set(keyOf(event.block), power);
        },

        onPlayerBreak(event) {
            lastPower.delete(keyOf(event.block));
        },

        onRedstoneUpdate(event) {
            const block = event.block;
            const key = keyOf(block);
            const now = event.powerLevel;
            const prev = lastPower.get(key);
            lastPower.set(key, now);

            // First time we ever see this block (e.g. chunk just loaded):
            // only record the power, never play.
            if (prev === undefined) return;

            // Rising edge: unpowered -> powered, exactly like vanilla.
            if (prev <= 0 && now > 0) {
                // Defer the actual playback to the end of the tick so it also
                // works if this hook ever runs in a restricted context.
                const loc = { x: block.x, y: block.y, z: block.z };
                system.run(() => {
                    try {
                        const target = block.dimension.getBlock(loc);
                        if (target && target.typeId === BLOCK_ID) playNote(target);
                    } catch { /* block gone or chunk unloaded */ }
                });
            }
        },
    });
});

// Clean the tracker when the block is destroyed by an explosion.
world.afterEvents.blockExplode.subscribe((event) => {
    const perm = event.explodedBlockPermutation;
    if (perm && perm.typeId === BLOCK_ID) {
        lastPower.delete(keyOf(event.block));
    }
});
