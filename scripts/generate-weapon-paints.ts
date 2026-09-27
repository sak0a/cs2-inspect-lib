/** Refresh both enums from a pinned ByMykel API snapshot. Use --offline or --check in CI. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface Skin {
    id: string;
    name: string;
    paint_index: string | null;
    weapon: { name: string; weapon_id: number };
    pattern: { name: string } | null;
    phase?: string;
}
export interface BaseWeapon { id: string; name: string; def_index: number }
export interface Snapshot { source: string; commit: string; weapons: BaseWeapon[]; skins: Skin[] }
interface Entry { key: string; index: number; comment: string; weaponGroup: string }
const ROOT = resolve(__dirname, '..');
const DATA = resolve(ROOT, 'scripts/data/csgo-items.json');

const WEAPON_MAP: Record<string, string> = {
    "AK-47": "AK_47",
    AUG: "AUG",
    AWP: "AWP",
    Bayonet: "BAYONET",
    "Bowie Knife": "BOWIE_KNIFE",
    "Butterfly Knife": "BUTTERFLY_KNIFE",
    "Classic Knife": "CLASSIC_KNIFE",
    "CZ75-Auto": "CZ75_AUTO",
    "Desert Eagle": "DESERT_EAGLE",
    "Dual Berettas": "DUAL_BERETTAS",
    FAMAS: "FAMAS",
    "Falchion Knife": "FALCHION_KNIFE",
    "Five-SeveN": "FIVE_SEVEN",
    "Flip Knife": "FLIP_KNIFE",
    G3SG1: "G3SG1",
    "Galil AR": "GALIL_AR",
    "Glock-18": "GLOCK_18",
    "Gut Knife": "GUT_KNIFE",
    "Huntsman Knife": "HUNTSMAN_KNIFE",
    Karambit: "KARAMBIT",
    "Kukri Knife": "KUKRI_KNIFE",
    M4A4: "M4A4",
    "M4A1-S": "M4A1_S",
    "MAC-10": "MAC_10",
    "MAG-7": "MAG_7",
    "M9 Bayonet": "M9_BAYONET",
    "MP5-SD": "MP5_SD",
    MP7: "MP7",
    MP9: "MP9",
    Negev: "NEGEV",
    Nova: "NOVA",
    "Navaja Knife": "NAVAJA_KNIFE",
    "Nomad Knife": "NOMAD_KNIFE",
    P2000: "P2000",
    P250: "P250",
    P90: "P90",
    "PP-Bizon": "PP_BIZON",
    "Paracord Knife": "PARACORD_KNIFE",
    "R8 Revolver": "R8_REVOLVER",
    "Sawed-Off": "SAWED_OFF",
    "SCAR-20": "SCAR_20",
    "SG 553": "SG_553",
    "Shadow Daggers": "SHADOW_DAGGERS",
    "Skeleton Knife": "SKELETON_KNIFE",
    "SSG 08": "SSG_08",
    "Stiletto Knife": "STILETTO_KNIFE",
    "Survival Knife": "SURVIVAL_KNIFE",
    "Talon Knife": "TALON_KNIFE",
    "Tec-9": "TEC_9",
    "UMP-45": "UMP_45",
    "Ursus Knife": "URSUS_KNIFE",
    "USP-S": "USP_S",
    XM1014: "XM1014",
    "Zeus x27": "ZEUS_X27",
    "Hand Wraps": "HAND_WRAPS",
    "Moto Gloves": "MOTO_GLOVES",
    "Driver Gloves": "DRIVER_GLOVES",
    "Sport Gloves": "SPORT_GLOVES",
    "Specialist Gloves": "SPECIALIST_GLOVES",
    "Hydra Gloves": "HYDRA_GLOVES",
    "Bloodhound Gloves": "BLOODHOUND_GLOVES",
    "Broken Fang Gloves": "BROKEN_FANG_GLOVES",
};

export function sanitize(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/['’]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
}
export function weaponPrefix(name: string): string {
    const clean = name.replace(/^★\s*/, '');
    return WEAPON_MAP[clean] ?? sanitize(clean);
}
function uint(value: unknown, label: string): number {
    if ((typeof value !== 'number' && typeof value !== 'string') || value === '' ||
        !/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > 0xffffffff) {
        throw new Error(`Invalid ${label}: ${String(value)}`);
    }
    return Number(value);
}

export function buildCatalog(snapshot: Snapshot, paintSource: string, typeSource: string) {
    if (!Array.isArray(snapshot.skins) || !snapshot.skins.length ||
        !Array.isArray(snapshot.weapons) || !snapshot.weapons.length || !/^[a-f0-9]{40}$/.test(snapshot.commit)) {
        throw new Error('Invalid or empty API snapshot');
    }
    const entries = new Map<string, Entry>();
    let group = 'Default/Vanilla';
    for (const line of paintSource.split('\n')) {
        const heading = line.match(/^    \/\/ (.+)$/);
        if (heading) group = heading[1];
        const match = line.match(/^    ([A-Z0-9_]+) = ([A-Z0-9_]+), \/\/ (.*)$/);
        if (match) {
            const index = /^\d+$/.test(match[2]) ? Number(match[2]) : entries.get(match[2])?.index;
            if (index === undefined) throw new Error(`Unresolved paint alias: ${match[2]}`);
            entries.set(match[1], { key: match[1], index, comment: match[3], weaponGroup: group });
        }
    }
    if (!entries.has('VANILLA')) throw new Error('Missing existing paint enum');

    // Validate the whole dataset before rendering or writing either output.
    const weapons = new Map<number, string>();
    for (const w of snapshot.weapons) {
        if (!w.name) throw new Error('Missing base weapon name');
        const id = uint(w.def_index, 'def_index');
        if (weapons.has(id) && weapons.get(id) !== w.name) throw new Error(`Conflicting weapon ${id}`);
        weapons.set(id, w.name);
    }
    for (const skin of snapshot.skins) {
        if (!skin.weapon?.name || !skin.name) throw new Error('Missing skin weapon/name');
        const id = uint(skin.weapon.weapon_id, 'weapon_id');
        if (weapons.has(id) && weapons.get(id) !== skin.weapon.name) throw new Error(`Conflicting weapon ${id}`);
        weapons.set(id, skin.weapon.name);
        if (skin.paint_index !== null) uint(skin.paint_index, 'paint_index');
    }

    // Sort before assigning collision suffixes so API ordering never changes names.
    const skins = [...snapshot.skins].sort((a, b) =>
        a.weapon.weapon_id - b.weapon.weapon_id || Number(a.paint_index) - Number(b.paint_index) || a.id.localeCompare(b.id));
    const scopedPaints = new Map<number, Map<number, string>>();
    for (const skin of skins) {
        if (skin.paint_index === null || Number(skin.paint_index) === 0) continue;
        const index = Number(skin.paint_index);
        const pattern = skin.pattern?.name ?? skin.name.split(' | ')[1];
        if (!pattern || !sanitize(pattern)) throw new Error(`Missing pattern: ${skin.id}`);
        const prefix = weaponPrefix(skin.weapon.name);
        const base = `${prefix}_${sanitize(pattern)}${skin.phase ? '_' + sanitize(skin.phase) : ''}`;
        // Preserve historical names/values; create an explicit variant for collisions.
        let key = base;
        if (entries.has(key) && entries.get(key)!.index !== index) key = `${base}_${index}`;
        if (entries.has(key) && entries.get(key)!.index !== index) throw new Error(`Enum key collision: ${key}`);
        const weaponId = skin.weapon.weapon_id;
        if (!scopedPaints.has(weaponId)) scopedPaints.set(weaponId, new Map());
        if (!scopedPaints.get(weaponId)!.has(index)) {
            scopedPaints.get(weaponId)!.set(index, key.slice(prefix.length + 1));
        }
        if (!entries.has(key)) entries.set(key, {
            key, index, comment: `${pattern}${skin.phase ? ' (' + skin.phase + ')' : ''}`,
            weaponGroup: `${skin.weapon.name} Skins`
        });
    }

    const typeBlock = typeSource.match(/export enum WeaponType \{([\s\S]*?)\n\}/);
    if (!typeBlock) throw new Error('Missing WeaponType enum');
    const types = new Map<string, number>();
    for (const match of typeBlock[1].matchAll(/^    ([A-Z0-9_]+) = (\d+)/gm)) types.set(match[1], Number(match[2]));
    // Correct the two historical team-glove assignments using the API's explicit IDs.
    for (const [key, id] of [['GLOVES_T', 'base_weapon-t_gloves'], ['GLOVES_CT', 'base_weapon-ct_gloves']]) {
        const weapon = snapshot.weapons.find(w => w.id === id);
        if (!weapon) throw new Error(`Missing ${id}`);
        types.set(key, weapon.def_index);
    }
    for (const [id, name] of [...weapons].sort((a, b) => a[0] - b[0])) {
        if ([...types.values()].includes(id)) continue;
        const key = weaponPrefix(name);
        if (!key || (types.has(key) && types.get(key) !== id)) throw new Error(`Weapon name collision: ${name}`);
        types.set(key, id);
    }
    const prefixes = Object.fromEntries([...weapons].sort((a, b) => a[0] - b[0]).map(([id, name]) => [id, weaponPrefix(name)]));
    const aliases = Object.fromEntries([...types].map(([key, id]) => [key, prefixes[id]]).filter(([, prefix]) => prefix));
    const grouped = new Map<string, Entry[]>();
    for (const entry of entries.values()) {
        if (!grouped.has(entry.weaponGroup)) grouped.set(entry.weaponGroup, []);
        grouped.get(entry.weaponGroup)!.push(entry);
    }
    const lines = [
        '/**', ' * Generated from ByMykel/CSGO-API skins.json and base_weapons.json.',
        ` * Snapshot: ${snapshot.commit}`, ' * Regenerate: npm run generate:weapon-paints',
        ' * Existing enum names are retained; phase and normalized aliases are additive.', ' */', '', 'export enum WeaponPaint {'
    ];
    const firstNameByIndex = new Map<number, string>();
    for (const [label, values] of grouped) {
        lines.push(`    // ${label}`);
        for (const e of values) {
            const value = firstNameByIndex.get(e.index) ?? e.index;
            lines.push(`    ${e.key} = ${value}, // ${e.comment.replace(/[\r\n]/g, ' ')}`);
            if (!firstNameByIndex.has(e.index)) firstNameByIndex.set(e.index, e.key);
        }
        lines.push('');
    }
    lines.push('}', '', `const WEAPON_PREFIXES: Record<number, string> = ${JSON.stringify(prefixes, null, 4)};`,
        `const WEAPON_ALIASES: Record<string, string> = ${JSON.stringify(aliases, null, 4)};`,
        readFileSync(resolve(ROOT, 'scripts/templates/paint-helpers.txt'), 'utf8').trimEnd(), '');
    const typeEnum = 'export enum WeaponType {\n' + [...types].map(([key, id]) => `    ${key} = ${id},`).join('\n') + '\n}';
    const scoped = [
        '/** Generated weapon-specific paint maps; do not edit manually. */',
        "import type { EconItem, WeaponType } from './types';", '',
        '/** One name per paint kit, scoped to its weapon. No numeric reverse mappings. */',
        'export const WeaponPaints = {'
    ];
    for (const [name, id] of types) {
        scoped.push(`    ${name}: {`, '        VANILLA: 0,');
        for (const [index, key] of scopedPaints.get(id) ?? []) {
            const property = /^[A-Z_][A-Z0-9_]*$/.test(key) ? key : JSON.stringify(key);
            scoped.push(`        ${property}: ${index},`);
        }
        scoped.push('    },');
    }
    scoped.push('} as const;', '', '/** Valid paint indices for each weapon definition. */', 'export interface WeaponPaintByDefindex {');
    for (const [name, id] of types) {
        scoped.push(`    ${id}: typeof WeaponPaints.${name}[keyof typeof WeaponPaints.${name}];`);
    }
    scoped.push('}', '',
        '/** The numeric paint union for one weapon (or a union of weapons). */',
        'export type PaintFor<W extends WeaponType> = WeaponPaintByDefindex[W];', '',
        '/** A correlated weapon/paint pair; the default is a discriminated union of all known weapons. */',
        'export type WeaponEconItem<W extends WeaponType = WeaponType> = {',
        '    [K in W]: Omit<EconItem, "defindex" | "paintindex"> & { defindex: K; paintindex: PaintFor<K> }',
        '}[W];', '');
    return {
        scopedPaints: scoped.join('\n'),
        paints: lines.join('\n'),
        types: typeSource.replace(typeBlock[0], typeEnum),
        paintCount: entries.size, weaponCount: new Set(types.values()).size
    };
}

async function getJson(url: string): Promise<any> {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'cs2-inspect-lib' } });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${url}`);
    return response.json();
}
async function main() {
    const args = process.argv.slice(2);
    if (args.some(a => !['--offline', '--check'].includes(a))) throw new Error('Usage: generate-weapon-paints.ts [--offline|--check]');
    let snapshot: Snapshot;
    if (args.includes('--offline') || args.includes('--check')) {
        snapshot = JSON.parse(readFileSync(DATA, 'utf8'));
    } else {
        const { sha } = await getJson('https://api.github.com/repos/ByMykel/CSGO-API/commits/main');
        if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid upstream commit');
        const base = `https://raw.githubusercontent.com/ByMykel/CSGO-API/${sha}/public/api/en/`;
        const [skins, weapons] = await Promise.all([getJson(base + 'skins.json'), getJson(base + 'base_weapons.json')]);
        if (!Array.isArray(skins) || !Array.isArray(weapons)) throw new Error('Expected API arrays');
        snapshot = {
            source: 'ByMykel/CSGO-API', commit: sha,
            weapons: (weapons as BaseWeapon[]).map(({ id, name, def_index }) => ({ id, name, def_index })),
            skins: (skins as Skin[]).map(({ id, name, weapon, pattern, paint_index, phase }) => ({
                id, name, weapon, pattern, paint_index, ...(phase ? { phase } : {})
            }))
        };
    }
    const paintPath = resolve(ROOT, 'src/weapon-paints.ts');
    const typePath = resolve(ROOT, 'src/types.ts');
    const scopedPath = resolve(ROOT, 'src/weapon-paint-types.ts');
    const paints = readFileSync(paintPath, 'utf8');
    const types = readFileSync(typePath, 'utf8');
    const result = buildCatalog(snapshot, paints, types);
    if (args.includes('--check')) {
        if (result.paints !== paints || result.types !== types || result.scopedPaints !== readFileSync(scopedPath, 'utf8')) throw new Error('Generated enums are stale; run with --offline');
    } else {
        writeFileSync(paintPath, result.paints);
        writeFileSync(typePath, result.types);
        writeFileSync(scopedPath, result.scopedPaints);
        writeFileSync(DATA, JSON.stringify(snapshot, null, 2) + '\n');
    }
    console.log(`${snapshot.skins.length} skins, ${result.weaponCount} weapon IDs, ${result.paintCount} paint names; snapshot ${snapshot.commit}`);
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
