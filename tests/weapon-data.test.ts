import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import snapshot from '../scripts/data/csgo-items.json';
import legacyPaints from '../scripts/data/legacy-paints.json';
import { buildCatalog, weaponPrefix, type Snapshot } from '../scripts/generate-weapon-paints';
import {
    WeaponType, WeaponPaint, getPaintsByWeapon, getPaintsByPattern,
    getPaintName, getPaintIndex, isWeaponType, createInspectUrl, decodeMaskedUrl
} from '../src';

const paints = readFileSync(resolve(__dirname, '../src/weapon-paints.ts'), 'utf8');
const types = readFileSync(resolve(__dirname, '../src/types.ts'), 'utf8');
const data = snapshot as Snapshot;

describe('ByMykel weapon data snapshot', () => {
    it('covers every base weapon and skin weapon defindex', () => {
        for (const weapon of data.weapons) expect(isWeaponType(weapon.def_index)).toBe(true);
        for (const skin of data.skins) expect(isWeaponType(skin.weapon.weapon_id)).toBe(true);
        expect(WeaponType.KUKRI_KNIFE).toBe(526);
        expect(WeaponType.BROKEN_FANG_GLOVES).toBe(4725);
        expect(WeaponType.GLOVES_CT).toBe(5029);
        expect(WeaponType.GLOVES_T).toBe(5028);
    });

    it('covers every weapon/paint pair, including paint indices shared by weapons', () => {
        for (const skin of data.skins) {
            if (skin.paint_index === null || Number(skin.paint_index) === 0) continue;
            expect(getPaintsByWeapon(skin.weapon.weapon_id).map(entry => entry.index))
                .toContain(Number(skin.paint_index));
        }
    });

    it('retains all historical paint names and values', () => {
        for (const [key, value] of Object.entries(legacyPaints)) expect(getPaintIndex(key)).toBe(value);
    });

    it('distinguishes Doppler phases without changing the old alias', () => {
        expect(WeaponPaint.BAYONET_DOPPLER).toBe(417);
        expect(WeaponPaint.BAYONET_DOPPLER_PHASE_1).toBe(418);
        expect(WeaponPaint.BAYONET_DOPPLER_PHASE_2).toBe(419);
        expect(WeaponPaint.BAYONET_DOPPLER_BLACK_PEARL).toBe(417);
    });

    it('disambiguates shared paint indices with a weapon defindex or name', () => {
        expect(getPaintName(44, WeaponType.AK_47)).toBe('AK_47_CASE_HARDENED');
        expect(getPaintName(44, WeaponType.KARAMBIT)).toBe('KARAMBIT_CASE_HARDENED');
        expect(getPaintName(44, 'Karambit')).toBe('KARAMBIT_CASE_HARDENED');
        expect(getPaintName(44, -1)).toBeUndefined();
        expect(getPaintsByWeapon('M4')).toEqual([]);
        expect(getPaintsByWeapon('')).toEqual([]);
        expect(getPaintsByWeapon('BOWIE')).toEqual(getPaintsByWeapon('Bowie Knife'));
    });

    it('handles normalized names and excludes numeric enum reverse mappings', () => {
        expect(getPaintIndex('44')).toBeUndefined();
        expect(getPaintIndex('toString')).toBeUndefined();
        expect(getPaintsByPattern('Jörmungandr').length).toBeGreaterThan(0);
        expect(getPaintsByPattern('')).toEqual([]);
        expect(weaponPrefix('★ Five-SeveN')).toBe('FIVE_SEVEN');
    });

    it('generates identical output offline, even if API arrays are reordered', () => {
        const first = buildCatalog(data, paints, types);
        expect(first.paints).toBe(paints);
        expect(first.types).toBe(types);
        expect(first.scopedPaints).toBe(readFileSync(resolve(__dirname, '../src/weapon-paint-types.ts'), 'utf8'));
        const reordered = buildCatalog({ ...data, skins: [...data.skins].reverse(), weapons: [...data.weapons].reverse() }, paints, types);
        expect(reordered).toEqual(first);
    });

    it('does not suppress a new weapon/paint pair because its index already exists', () => {
        const numericPaints = paints.replace(/^    ([A-Z0-9_]+) = [A-Z0-9_]+, \/\//gm,
            (_line, key: keyof typeof WeaponPaint) => `    ${key} = ${WeaponPaint[key]}, //`);
        const reduced = numericPaints.split('\n').filter(line => !/^    KUKRI_KNIFE_/.test(line)).join('\n');
        const result = buildCatalog(data, reduced, types);
        for (const skin of data.skins.filter(skin => skin.weapon.weapon_id === 526 && skin.paint_index !== null)) {
            expect(result.scopedPaints).toMatch(new RegExp(`        "?[A-Z0-9_]+"?: ${skin.paint_index},`));
        }
        expect(buildCatalog(data, result.paints, result.types).paints).toBe(result.paints);
    });

    it('fails on malformed upstream IDs instead of writing incomplete enums', () => {
        const bad = structuredClone(data);
        bad.skins[0].paint_index = 'not-a-number';
        expect(() => buildCatalog(bad, paints, types)).toThrow('Invalid paint_index');
        expect(() => buildCatalog({ ...data, skins: [] }, paints, types)).toThrow();
    });

    it('encodes newly covered weapon definitions', () => {
        const url = createInspectUrl({
            defindex: WeaponType.KUKRI_KNIFE, paintindex: WeaponPaint.KUKRI_KNIFE_FADE,
            paintseed: 42, paintwear: 0.01
        });
        expect(decodeMaskedUrl(url).defindex).toBe(526);
    });
});
