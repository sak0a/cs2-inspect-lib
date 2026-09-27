import {
    WeaponPaints, WeaponPaint, WeaponType, createInspectUrl, decodeMaskedUrl,
    type PaintFor, type WeaponEconItem, type EconItem
} from '../src';
import snapshot from '../scripts/data/csgo-items.json';

function accept<T>(_value: T): void { /* Compile-time assertion checked by ts-jest and tsc. */ }

describe('Weapon-specific paints', () => {
    it('accepts shared finishes on each supported weapon without enum identity conflicts', () => {
        accept<PaintFor<WeaponType.AK_47>>(WeaponPaints.AK_47.CASE_HARDENED);
        accept<PaintFor<WeaponType.KARAMBIT>>(WeaponPaints.KARAMBIT.CASE_HARDENED);
        accept<PaintFor<WeaponType.AK_47>>(WeaponPaint.AK_47_CASE_HARDENED);
        accept<PaintFor<WeaponType.AK_47>>(44);
        expect(WeaponPaints.AK_47.CASE_HARDENED).toBe(WeaponPaints.KARAMBIT.CASE_HARDENED);
    });

    it('rejects paints unavailable on a weapon at compile time', () => {
        // @ts-expect-error Dragon Lore is not an AK-47 paint kit.
        accept<PaintFor<WeaponType.AK_47>>(WeaponPaints.AWP.DRAGON_LORE);
        // @ts-expect-error Unknown paint index is not part of the pinned AK-47 catalog.
        accept<PaintFor<WeaponType.AK_47>>(999999);
        // @ts-expect-error The scoped map does not expose another weapon's skin name.
        accept<number>(WeaponPaints.AK_47.DRAGON_LORE);
        // @ts-expect-error Reject a mismatched pair even when no generic weapon is specified.
        accept<WeaponEconItem>({ defindex: WeaponType.AK_47, paintindex: WeaponPaints.AWP.DRAGON_LORE, paintseed: 1, paintwear: 0.1 });
        // @ts-expect-error A union of weapons must retain the weapon/paint correlation.
        accept<WeaponEconItem<WeaponType.AK_47 | WeaponType.AWP>>({ defindex: WeaponType.AK_47, paintindex: WeaponPaints.AWP.DRAGON_LORE, paintseed: 1, paintwear: 0.1 });
        expect(WeaponPaints.AWP.DRAGON_LORE).toBe(344);
    });

    it('uses the existing encoder without conversion or casts', () => {
        const item = {
            defindex: WeaponType.AK_47,
            paintindex: WeaponPaints.AK_47.CASE_HARDENED,
            paintseed: 661,
            paintwear: 0.15
        } satisfies WeaponEconItem<WeaponType.AK_47>;
        accept<EconItem>(item);
        expect(decodeMaskedUrl(createInspectUrl(item)).paintindex).toBe(44);
        accept<WeaponEconItem>({ ...item, defindex: WeaponType.AWP, paintindex: WeaponPaints.AWP.DRAGON_LORE });
    });

    it('has no duplicate indices within a scoped map and covers every API pair', () => {
        for (const map of Object.values(WeaponPaints)) {
            const indices = Object.values(map);
            expect(new Set(indices).size).toBe(indices.length);
            expect(map.VANILLA).toBe(0);
        }
        for (const skin of snapshot.skins) {
            if (skin.paint_index === null) continue;
            const weaponName = WeaponType[skin.weapon.weapon_id] as keyof typeof WeaponPaints;
            expect(Object.values(WeaponPaints[weaponName])).toContain(Number(skin.paint_index));
        }
        expect(WeaponPaints.BAYONET.DOPPLER_PHASE_1).toBe(418);
    });

    it('keeps the flat enum and its numeric reverse mappings compatible', () => {
        expect(WeaponPaint.AK_47_CASE_HARDENED).toBe(44);
        expect(typeof WeaponPaint[44]).toBe('string');
        expect(Object.keys(WeaponPaints.AK_47).every(name => !/^\d+$/.test(name))).toBe(true);
    });
});
