/**
 * Regenerate src/weapon-paints.ts from ByMykel CSGO-API skins.json
 *
 * Preserves existing enum keys and adds entries for newly released skins.
 * Run: bun run scripts/generate-weapon-paints.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const SKINS_URL =
    "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";
const OUTPUT_PATH = join(import.meta.dir, "..", "src", "weapon-paints.ts");

interface Skin {
    name: string;
    paint_index: string;
    pattern?: { name: string };
    weapon?: { name: string };
    phase?: string;
}

interface PaintEntry {
    key: string;
    index: number;
    comment: string;
    weaponGroup: string;
}

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

/** Keys that cannot be derived automatically from skins.json */
const KEY_OVERRIDES: Record<string, string> = {
    "758|AUG|Flame Jörmungandr": "AUG_FLAME_JRMUNGANDR",
    "757|Desert Eagle|Emerald Jörmungandr": "DESERT_EAGLE_EMERALD_JRMUNGANDR",
    "470|Desert Eagle|Sunset Storm 弐": "DESERT_EAGLE_SUNSET_STORM_470",
    "903|Dual Berettas|Elite 1.6": "DUAL_BERETTAS_ELITE_16",
    "1042|M249|O.S.I.P.R.": "M249_OSIPR",
    "126|MAC-10|Saibā Oni": "MAC_10_SAIB_ONI",
    "763|Negev|Mjölnir": "NEGEV_MJLNIR",
    "145|Nova|Wurst Hölle": "NOVA_WURST_HLLE",
    "1230|P250|Re.built": "P250_REBUILT",
    "759|P90|Astral Jörmungandr": "P90_ASTRAL_JRMUNGANDR",
    "1155|Sawed-Off|Kiss♥Love": "SAWED_OFF_KISSLOVE",
    "1194|UMP-45|K.O. Factory": "UMP_45_KO_FACTORY",
};

const GROUP_LABELS: Record<string, string> = {
    AK_47: "AK-47",
    AUG: "AUG",
    AWP: "AWP",
    BAYONET: "Bayonet",
    BLOODHOUND_GLOVES: "Bloodhound Gloves",
    BOWIE_KNIFE: "Bowie Knife",
    BROKEN_FANG_GLOVES: "Broken Fang Gloves",
    BUTTERFLY_KNIFE: "Butterfly Knife",
    CLASSIC_KNIFE: "Classic Knife",
    CZ75_AUTO: "CZ75-Auto",
    DESERT_EAGLE: "Desert Eagle",
    DRIVER_GLOVES: "Driver Gloves",
    DUAL_BERETTAS: "Dual Berettas",
    FALCHION_KNIFE: "Falchion Knife",
    FAMAS: "FAMAS",
    FIVE_SEVEN: "Five-SeveN",
    FLIP_KNIFE: "Flip Knife",
    G3SG1: "G3SG1",
    GALIL_AR: "Galil AR",
    GLOCK_18: "Glock-18",
    GUT_KNIFE: "Gut Knife",
    HAND_WRAPS: "Hand Wraps",
    HUNTSMAN_KNIFE: "Huntsman Knife",
    HYDRA_GLOVES: "Hydra Gloves",
    KARAMBIT: "Karambit",
    KUKRI_KNIFE: "Kukri Knife",
    M249: "M249",
    M4A1_S: "M4A1-S",
    M4A4: "M4A4",
    MAC_10: "MAC-10",
    MAG_7: "MAG-7",
    M9_BAYONET: "M9 Bayonet",
    MP5_SD: "MP5-SD",
    MP7: "MP7",
    MP9: "MP9",
    MOTO_GLOVES: "Moto Gloves",
    NAVAJA_KNIFE: "Navaja Knife",
    NEGEV: "Negev",
    NOVA: "Nova",
    NOMAD_KNIFE: "Nomad Knife",
    P2000: "P2000",
    P250: "P250",
    P90: "P90",
    PARACORD_KNIFE: "Paracord Knife",
    PP_BIZON: "PP-Bizon",
    R8_REVOLVER: "R8 Revolver",
    SAWED_OFF: "Sawed-Off",
    SCAR_20: "SCAR-20",
    SG_553: "SG 553",
    SHADOW_DAGGERS: "Shadow Daggers",
    SKELETON_KNIFE: "Skeleton Knife",
    SPECIALIST_GLOVES: "Specialist Gloves",
    SPORT_GLOVES: "Sport Gloves",
    SSG_08: "SSG 08",
    STILETTO_KNIFE: "Stiletto Knife",
    SURVIVAL_KNIFE: "Survival Knife",
    TALON_KNIFE: "Talon Knife",
    TEC_9: "Tec-9",
    UMP_45: "UMP-45",
    URSUS_KNIFE: "Ursus Knife",
    USP_S: "USP-S",
    XM1014: "XM1014",
    ZEUS_X27: "Zeus x27",
};

function sanitize(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[''']/g, "")
        .replace(/[^A-Za-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toUpperCase();
}

function getWeaponPrefix(skin: Skin): string {
    const weaponName = skin.weapon?.name?.replace(/^★\s*/, "") ?? "";
    return WEAPON_MAP[weaponName] ?? sanitize(weaponName);
}

function getPatternName(skin: Skin): string {
    return skin.pattern?.name ?? skin.name.split(" | ")[1] ?? "";
}

function getWeaponGroup(prefix: string): string {
    return GROUP_LABELS[prefix] ?? prefix.replace(/_/g, " ");
}

function getOverrideKey(skin: Skin): string | undefined {
    const idx = Number(skin.paint_index);
    const weapon = skin.weapon?.name?.replace(/^★\s*/, "") ?? "";
    const pattern = getPatternName(skin);
    return KEY_OVERRIDES[`${idx}|${weapon}|${pattern}`];
}

function buildDuplicateSuffixMap(skins: Skin[]): Map<string, Set<number>> {
    const groups = new Map<string, Set<number>>();

    for (const skin of skins) {
        const prefix = getWeaponPrefix(skin);
        const pattern = getPatternName(skin).toLowerCase();
        const key = `${prefix}|${pattern}`;
        const idx = Number(skin.paint_index);

        if (!groups.has(key)) {
            groups.set(key, new Set());
        }
        groups.get(key)!.add(idx);
    }

    return groups;
}

function generateKey(
    skin: Skin,
    duplicateGroups: Map<string, Set<number>>,
    usedKeys: Set<string>,
    existingKeysByIndex: Map<number, string>
): string {
    const override = getOverrideKey(skin);
    if (override) {
        return override;
    }

    const idx = Number(skin.paint_index);
    const existingKey = existingKeysByIndex.get(idx);
    if (existingKey) {
        return existingKey;
    }

    const prefix = getWeaponPrefix(skin);
    const pattern = getPatternName(skin);
    const groupKey = `${prefix}|${pattern.toLowerCase()}`;
    const duplicateIndices = [...(duplicateGroups.get(groupKey) ?? [idx])].sort((a, b) => a - b);
    let suffix = sanitize(pattern);

    if (duplicateIndices.length > 1) {
        const baseKey = `${prefix}_${suffix}`;
        const hasBase = usedKeys.has(baseKey) || existingKeysByIndex.has(idx);
        const firstIndex = duplicateIndices[0];

        if (usedKeys.has(baseKey)) {
            suffix = `${suffix}_${idx}`;
        } else if (hasBase && idx !== firstIndex) {
            suffix = `${suffix}_${idx}`;
        } else if (idx !== firstIndex && duplicateIndices.includes(firstIndex)) {
            // Keep the lowest paint index as the unsuffixed variant when possible.
            suffix = `${suffix}_${idx}`;
        }
    }

    let key = `${prefix}_${suffix}`;
    if (usedKeys.has(key)) {
        key = `${prefix}_${suffix}_${idx}`;
    }

    return key;
}

function parseExistingEntries(source: string): PaintEntry[] {
    const entries: PaintEntry[] = [];
    let currentGroup = "Default/Vanilla";

    for (const line of source.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") && !trimmed.includes("=")) {
            currentGroup = trimmed.replace(/^\/\/\s*/, "");
            continue;
        }

        const entryMatch = line.match(/^\s+([A-Z0-9_]+) = (\d+), \/\/ (.+)$/);
        if (entryMatch) {
            entries.push({
                key: entryMatch[1]!,
                index: Number(entryMatch[2]),
                comment: entryMatch[3]!,
                weaponGroup: currentGroup,
            });
        }
    }

    return entries;
}

function buildUtilityFunctions(): string {
    return `
/**
 * Type guard to check if a value is a valid WeaponPaint
 */
export function isWeaponPaint(value: any): value is WeaponPaint {
    return typeof value === 'number' && Object.values(WeaponPaint).includes(value);
}

/**
 * Get paint name from paint index
 */
export function getPaintName(paintIndex: number): string | undefined {
    const paintEntry = Object.entries(WeaponPaint).find(([, value]) => value === paintIndex);
    return paintEntry ? paintEntry[0] : undefined;
}

/**
 * Get paint index from paint name
 */
export function getPaintIndex(paintName: string): number | undefined {
    const upperName = paintName.toUpperCase();
    return WeaponPaint[upperName as keyof typeof WeaponPaint];
}

/**
 * Get all available paint names
 */
export function getAllPaintNames(): string[] {
    return Object.keys(WeaponPaint).filter(key => isNaN(Number(key)));
}

/**
 * Get all available paint indices
 */
export function getAllPaintIndices(): number[] {
    return Object.values(WeaponPaint).filter(value => typeof value === 'number') as number[];
}

/**
 * Search for paints by weapon name
 */
export function getPaintsByWeapon(weaponName: string): Array<{key: string, index: number}> {
    const upperWeapon = weaponName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const results: Array<{key: string, index: number}> = [];

    Object.entries(WeaponPaint).forEach(([key, value]) => {
        if (typeof value === 'number' && key.startsWith(upperWeapon)) {
            results.push({ key, index: value });
        }
    });

    return results.sort((a, b) => a.index - b.index);
}

/**
 * Search for paints by pattern name
 */
export function getPaintsByPattern(patternName: string): Array<{key: string, index: number}> {
    const upperPattern = patternName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const results: Array<{key: string, index: number}> = [];

    Object.entries(WeaponPaint).forEach(([key, value]) => {
        if (typeof value === 'number' && key.includes(upperPattern)) {
            results.push({ key, index: value });
        }
    });

    return results.sort((a, b) => a.index - b.index);
}
`;
}

async function main(): Promise<void> {
    const existingSource = readFileSync(OUTPUT_PATH, "utf8");
    const existingEntries = parseExistingEntries(existingSource);
    const existingKeys = new Set(existingEntries.map((entry) => entry.key));
    const existingIndices = new Set(existingEntries.map((entry) => entry.index));
    const existingKeysByIndex = new Map<number, string>();

    for (const entry of existingEntries) {
        if (!existingKeysByIndex.has(entry.index)) {
            existingKeysByIndex.set(entry.index, entry.key);
        }
    }

    const response = await fetch(SKINS_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch skins.json: ${response.status} ${response.statusText}`);
    }

    const skins = (await response.json()) as Skin[];
    const duplicateGroups = buildDuplicateSuffixMap(skins);
    const entriesByKey = new Map(existingEntries.map((entry) => [entry.key, entry]));
    const usedKeys = new Set(existingKeys);

    for (const skin of skins) {
        const idx = Number(skin.paint_index);
        if (Number.isNaN(idx)) {
            continue;
        }

        // Skip vanilla knife entries; VANILLA = 0 covers paint-less items.
        if (idx === 0 && skin.weapon?.name?.startsWith("★")) {
            continue;
        }

        if (existingIndices.has(idx)) {
            continue;
        }

        const key = generateKey(skin, duplicateGroups, usedKeys, existingKeysByIndex);
        if (entriesByKey.has(key)) {
            continue;
        }

        const prefix = getWeaponPrefix(skin);
        const pattern = getPatternName(skin);
        const entry: PaintEntry = {
            key,
            index: idx,
            comment: pattern,
            weaponGroup: `${getWeaponGroup(prefix)} Skins`,
        };

        entriesByKey.set(key, entry);
        usedKeys.add(key);
        existingIndices.add(idx);
    }

    const groupedEntries = new Map<string, PaintEntry[]>();
    const groupOrder: string[] = [];

    for (const entry of existingEntries) {
        if (!groupedEntries.has(entry.weaponGroup)) {
            groupedEntries.set(entry.weaponGroup, []);
            groupOrder.push(entry.weaponGroup);
        }
        groupedEntries.get(entry.weaponGroup)!.push(entry);
    }

    for (const entry of entriesByKey.values()) {
        if (existingKeys.has(entry.key)) {
            continue;
        }

        if (!groupedEntries.has(entry.weaponGroup)) {
            groupedEntries.set(entry.weaponGroup, []);
            groupOrder.push(entry.weaponGroup);
        }
        groupedEntries.get(entry.weaponGroup)!.push(entry);
    }

    for (const [group, entries] of groupedEntries) {
        const preserved = entries.filter((entry) => existingKeys.has(entry.key));
        const added = entries
            .filter((entry) => !existingKeys.has(entry.key))
            .sort((a, b) => a.index - b.index || a.key.localeCompare(b.key));
        groupedEntries.set(group, [...preserved, ...added]);
    }

    if (!entriesByKey.has("VANILLA")) {
        const vanillaEntry: PaintEntry = {
            key: "VANILLA",
            index: 0,
            comment: "Vanilla",
            weaponGroup: "Default/Vanilla",
        };
        entriesByKey.set("VANILLA", vanillaEntry);
        if (!groupedEntries.has("Default/Vanilla")) {
            groupedEntries.set("Default/Vanilla", []);
            groupOrder.unshift("Default/Vanilla");
        }
        groupedEntries.get("Default/Vanilla")!.unshift(vanillaEntry);
    }

    const lines: string[] = [
        "/**",
        " * CS2 weapon paint indices generated from ByMykel CSGO-API skins.json",
        " * This enum maps weapon-specific paint names to their paint index values.",
        " * Source: https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json",
        " */",
        "",
        "export enum WeaponPaint {",
    ];

    for (const group of groupOrder) {
        const entries = groupedEntries.get(group);
        if (!entries?.length) {
            continue;
        }

        lines.push(group === "Default/Vanilla" ? "    // Default/Vanilla" : `    // ${group}`);
        for (const entry of entries) {
            lines.push(`    ${entry.key} = ${entry.index}, // ${entry.comment}`);
        }
        lines.push("");
    }

    lines.push("}");
    lines.push(buildUtilityFunctions().trimStart());

    writeFileSync(OUTPUT_PATH, `${lines.join("\n").trimEnd()}\n`);
    console.log(`Generated ${entriesByKey.size} paint entries in ${OUTPUT_PATH}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
