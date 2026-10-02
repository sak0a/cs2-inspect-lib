// A hard failing mock proves the local entry cannot load authenticated clients,
// including accidentally importing them transitively via a convenience helper.
jest.mock('node-cs2', () => { throw new Error('core loaded node-cs2'); });
jest.mock('steam-user', () => { throw new Error('core loaded steam-user'); });
import * as core from '../src/core';

describe('browser-only core surface', () => {
    it('loads and runs the advertised local APIs without authenticated modules', () => {
        const item = { defindex: 7, paintindex: 44, paintseed: 1, paintwear: 0.1 };
        const url = core.createInspectUrl(item);
        expect(core.decodeMaskedUrl(url)).toEqual(expect.objectContaining({ ...item, paintwear: Math.fround(item.paintwear) }));
        expect(core.decodeInspectUrl(url)).toEqual(core.decodeMaskedUrl(url));
        expect(core.analyzeInspectUrl(url).url_type).toBe('masked');
        expect(core.validateWireItem(item).valid).toBe(true);
        expect(core.validateItemData(item).valid).toBe(true);
        expect(core.diagnoseInspectLink(url).valid).toBe(true);
        expect(core.decodeInspectDocument(url).item.defindex).toBe(7);
        expect(core.compareItems(item, { ...item })).toEqual([]);
        expect(core).not.toHaveProperty('SteamClientManager');
        expect(typeof core.inspectBatch).toBe('function');
        expect(typeof core.BatchInspectionError).toBe('function');
    });
});
