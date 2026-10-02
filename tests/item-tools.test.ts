import { compareItems, ITEM_DATA_VERSION, validateItemData, validateWireItem } from '../src/item-tools';
import { EconItem } from '../src/types';

const base: EconItem = { defindex: 7, paintindex: 801, paintseed: 0, paintwear: 0.1 };

describe('wire validation and versioned game validation', () => {
    it('reports the exact catalog revision independently of wire representability', () => {
        expect(ITEM_DATA_VERSION).toMatch(/^[a-f0-9]{40}$/);
        const unknown = { ...base, defindex: 0xFFFFFFFF, paintindex: 0xFFFFFFFF, paintwear: 2 };
        expect(validateWireItem(unknown)).toEqual({ valid: true, diagnostics: [], snapshot: ITEM_DATA_VERSION });
        expect(validateItemData(unknown).valid).toBe(false);
    });

    it('separates protobuf string representability from the default cosmetic name limit', () => {
        expect(validateWireItem({ ...base, customnames: ['名'.repeat(40)] }).valid).toBe(true);
    });
    it.each([0n, BigInt(Number.MAX_SAFE_INTEGER), 0xFFFFFFFFFFFFFFFFn])('accepts exact uint64 %s', itemid => {
        expect(validateWireItem({ ...base, itemid }).valid).toBe(true);
    });
    it.each([-1n, 1n << 64n, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, 0.5])('rejects unrepresentable uint64 %s', itemid => {
        const result = validateWireItem({ ...base, itemid });
        expect(result.valid).toBe(false);
        expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'WIRE_ENCODING', severity: 'error' }));
    });
    it.each([NaN, Infinity, -Infinity, 1e100])('rejects unrepresentable wear %s', paintwear => {
        expect(validateWireItem({ ...base, paintwear }).valid).toBe(false);
    });

    it('applies both paint-specific wear endpoints at float32 precision', () => {
        for (const paintwear of [0.05, Math.fround(0.05), 0.7, Math.fround(0.7)]) {
            expect(validateItemData({ ...base, paintwear }).valid).toBe(true);
        }
        for (const paintwear of [0.049, 0.701]) {
            const result = validateItemData({ ...base, paintwear });
            expect(result.valid).toBe(false);
            expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'WEAR_RANGE', path: 'paintwear' }));
        }
    });
    it('accepts known glove definitions present in the paint snapshot', () => {
        expect(validateItemData({ ...base, defindex: 5032, paintindex: 10010 }).valid).toBe(true);
    });
    it('distinguishes incompatible paints from unknown future catalog entries', () => {
        const mismatch = validateItemData({ ...base, paintindex: 10010 }, { mode: 'permissive' });
        expect(mismatch.valid).toBe(false);
        expect(mismatch.diagnostics).toContainEqual(expect.objectContaining({ code: 'INCOMPATIBLE_PAINT', severity: 'error' }));
        for (const item of [{ ...base, defindex: 999999 }, { ...base, paintindex: 999999 }]) {
            expect(validateItemData(item).valid).toBe(false);
            const result = validateItemData(item, { mode: 'permissive' });
            expect(result.valid).toBe(true);
            expect(result.diagnostics.length).toBeGreaterThan(0);
            expect(result.diagnostics.every(d => d.severity === 'warning')).toBe(true);
        }
    });
    it('does not make out-of-range wear valid in permissive mode', () => {
        expect(validateItemData({ ...base, paintwear: 2 }, { mode: 'permissive' }).valid).toBe(false);
    });
});

describe('semantic item comparisons', () => {
    it('compares float values at their actual float32 precision', () => {
        expect(compareItems({ paintwear: 0.1 }, { paintwear: Math.fround(0.1) })).toEqual([]);
        const sticker = { slot: 0, sticker_id: 1, wear: 0.1, scale: 0.2, rotation: 0.3, offset_x: 0.4, offset_y: 0.5, offset_z: 0.6 };
        const rounded = Object.fromEntries(Object.entries(sticker).map(([k, v]) => [k, Math.fround(v)]));
        expect(compareItems({ stickers: [sticker] }, { stickers: [rounded as typeof sticker] })).toEqual([]);
    });
    it('retains negative zero, missing fields, explicit undefined, zero, and empty values', () => {
        expect(compareItems({ paintwear: -0 }, { paintwear: 0 })).toHaveLength(1);
        for (const after of [{ customname: '' }, { quality: 0 }, { stickers: [] }, { customname: undefined }, { blobdata: new Uint8Array() }]) {
            expect(compareItems({}, after)).toEqual([expect.objectContaining({ beforePresent: false, afterPresent: true })]);
        }
        expect(compareItems({ customname: '' }, {})).toEqual([expect.objectContaining({ beforePresent: true, afterPresent: false })]);
    });
    it('compares exact uint64 values across numeric representations', () => {
        expect(compareItems({ itemid: 42 }, { itemid: 42n })).toEqual([]);
        expect(compareItems({ itemid: 0xFFFFFFFFFFFFFFFFn }, { itemid: 0xFFFFFFFFFFFFFFFEn })).toHaveLength(1);
    });
    it('reports nested attachment changes and preserves ordered repeated names', () => {
        const before: Partial<EconItem> = { keychains: [{ slot: 0, sticker_id: 2, offset_x: 0 }], customnames: ['名', '😀'] };
        const after: Partial<EconItem> = { keychains: [{ slot: 0, sticker_id: 3, offset_x: 1 }], customnames: ['😀', '名'] };
        expect(compareItems(before, after).map(d => d.path)).toEqual(['keychains.0.sticker_id', 'keychains.0.offset_x', 'customnames.0', 'customnames.1']);
    });
    it('compares opaque bytes by value, without changing either input', () => {
        const left = { blobdata: Uint8Array.of(0, 255, 1) };
        const right = { blobdata: Uint8Array.of(0, 255, 2) };
        expect(compareItems(left, { blobdata: left.blobdata.slice() })).toEqual([]);
        expect(compareItems(left, right)).toEqual([expect.objectContaining({ path: 'blobdata.2', before: 1, after: 2 })]);
        expect(left.blobdata).toEqual(Uint8Array.of(0, 255, 1));
    });
});

test('wire diagnostics identify malformed optional attachment properties instead of silently dropping them', () => {
    const result = validateWireItem({defindex:7,paintindex:0,paintseed:0,paintwear:0,stickers:[{slot:0,sticker_id:1,rotation:'wrong' as unknown as number}]});
    expect(result).toMatchObject({valid:false,diagnostics:[{path:'stickers.0.rotation',code:'WIRE_ENCODING'}]});
});
