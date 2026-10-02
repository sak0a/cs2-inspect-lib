import { diagnoseInspectLink } from '../src/diagnostics';
import { createInspectUrl } from '../src/core';
import { InspectDocument } from '../src/inspect-document';
import { ITEM_DATA_VERSION } from '../src/item-tools';

const base = { defindex: 7, paintindex: 44, paintseed: 1, paintwear: 0.1 };

describe('structured link diagnostics', () => {
    it.each([
        ['S76561198000000000A123D456', 'inventory'],
        ['M123456789A123D456', 'market']
    ])('identifies legacy link %s without contacting Steam', (link, type) => {
        expect(diagnoseInspectLink(link)).toEqual({ type, requiresSteam: true, valid: true, diagnostics: [], snapshot: ITEM_DATA_VERSION });
    });
    it('rejects uint64 overflow in every legacy coordinate', () => {
        const maximum = '18446744073709551615';
        const overflow = '18446744073709551616';
        expect(diagnoseInspectLink(`S${maximum}A${maximum}D${maximum}`).valid).toBe(true);
        for (const input of [`S${overflow}A1D1`, `M${overflow}A1D1`, `S1A${overflow}D1`, `S1A1D${overflow}`]) {
            expect(diagnoseInspectLink(input).valid).toBe(false);
        }
    });
    it('identifies and validates local embedded items', () => {
        const result = diagnoseInspectLink(createInspectUrl(base));
        expect(result).toEqual(expect.objectContaining({ type: 'embedded', requiresSteam: false, valid: true, diagnostics: [], snapshot: ITEM_DATA_VERSION }));
        expect(result.item).toEqual(expect.objectContaining({ ...base, paintwear: Math.fround(base.paintwear) }));
    });
    it.each(['', 'not a link', 'SbadA123D456'])('returns URL failures without throwing for %s', input => {
        const result = diagnoseInspectLink(input);
        expect(result.type).toBe('invalid');
        expect(result.valid).toBe(false);
        expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'URL_PARSE', severity: 'error' }));
    });
    it('distinguishes framing/decode errors from game-data errors', () => {
        const malformed = diagnoseInspectLink('000102030405');
        expect(malformed.type).toBe('embedded');
        expect(malformed.diagnostics).toContainEqual(expect.objectContaining({ code: 'WIRE_DECODE' }));
        const game = diagnoseInspectLink(createInspectUrl({ ...base, paintindex: 10010 }));
        expect(game.type).toBe('embedded');
        expect(game.valid).toBe(false);
        expect(game.item).toBeDefined();
        expect(game.diagnostics).toContainEqual(expect.objectContaining({ code: 'INCOMPATIBLE_PAINT', path: 'paintindex' }));
    });
    it('allows unknown future data with explicit permissive warnings', () => {
        const url = createInspectUrl({ ...base, defindex: 999999 });
        expect(diagnoseInspectLink(url).valid).toBe(false);
        const permissive = diagnoseInspectLink(url, { mode: 'permissive' });
        expect(permissive.valid).toBe(true);
        expect(permissive.diagnostics).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_WEAPON', severity: 'warning' }));
    });
    it('reports a non-finite IEEE payload as a wire validation failure', () => {
        // paintwear is uint32 containing IEEE-754 bits. 0x7F800000 is +Infinity.
        const url = new InspectDocument(Uint8Array.from([0x18, 7, 0x20, 44, 0x38, 0x80, 0x80, 0x80, 0xFC, 7, 0x40, 0])).toUrl();
        const result = diagnoseInspectLink(url);
        expect(result.valid).toBe(false);
        expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'WIRE_ENCODING' }));
    });
});
