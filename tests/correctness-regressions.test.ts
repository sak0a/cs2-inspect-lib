import {
    CS2Inspect, createInspectUrl, decodeMaskedUrl, decodeMaskedData, inspectItem,
    validateItem, Validator, ProtobufWriter, ProtobufReader, EncodingError, DecodingError
} from '../src';

const base = { defindex: 7, paintindex: 44, paintseed: 1, paintwear: 0.1 };

describe('Numeric and configuration regressions', () => {
    it.each(['defindex', 'paintindex', 'paintseed', 'accountid', 'quality', 'rarity',
        'killeatervalue', 'killeaterscoretype', 'inventory', 'origin', 'questid', 'dropreason',
        'musicindex', 'petindex', 'style', 'upgrade_level'])('validates uint32 field %s', field => {
        for (const value of [NaN, Infinity, -Infinity, -1, 1.5, 0x100000000]) {
            const item = { ...base, [field]: value };
            expect(validateItem(item).valid).toBe(false);
            expect(() => createInspectUrl(item)).toThrow();
        }
        const item = { ...base, [field]: 0xFFFFFFFF };
        expect(validateItem(item).valid).toBe(true);
        expect(decodeMaskedUrl(createInspectUrl(item))).toHaveProperty(field, 0xFFFFFFFF);
    });

    it.each([NaN, Infinity, -Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, -1n, 1n << 64n])(
        'rejects unsafe/out-of-range item ID %s', itemid => {
            expect(validateItem({ ...base, itemid }).valid).toBe(false);
            expect(() => new ProtobufWriter().writeVarint64(itemid)).toThrow(EncodingError);
        }
    );

    it('rejects non-finite wear and out-of-range signed indices', () => {
        for (const paintwear of [NaN, Infinity, -Infinity]) {
            expect(validateItem({ ...base, paintwear }).valid).toBe(false);
            expect(() => createInspectUrl({ ...base, paintwear }, { validateInput: false })).toThrow();
        }
        for (const entindex of [NaN, Infinity, 1.5, 0x80000000, -0x80000001]) {
            expect(validateItem({ ...base, entindex }).valid).toBe(false);
        }
    });

    it('preserves maximum uint64 IDs without losing precision', () => {
        const itemid = 0xFFFFFFFFFFFFFFFFn;
        expect(decodeMaskedUrl(createInspectUrl({ ...base, itemid })).itemid).toBe(itemid);
    });

    it('rejects values that protobuf cannot represent even without item validation', () => {
        for (const paintseed of [NaN, Infinity, 1.5, 0x100000000]) {
            expect(() => createInspectUrl({ ...base, paintseed }, { validateInput: false })).toThrow(EncodingError);
        }
        expect(() => new ProtobufWriter().writeFloat(1e100)).toThrow(EncodingError);
        expect(() => new ProtobufWriter().writeSInt32(0x80000000)).toThrow(EncodingError);
    });

    it('validates sticker float and integer fields', () => {
        for (const field of ['slot', 'sticker_id', 'tint_id', 'pattern', 'highlight_reel', 'wrapped_sticker']) {
            for (const value of [NaN, Infinity, 0.5, 0x100000000]) {
                expect(Validator.validateSticker({ slot: 0, sticker_id: 1, [field]: value }).valid).toBe(false);
            }
        }
        for (const field of ['wear', 'scale', 'rotation', 'offset_x', 'offset_y', 'offset_z']) {
            for (const value of [NaN, Infinity, 1e100]) {
                expect(Validator.validateSticker({ slot: 0, sticker_id: 1, [field]: value }).valid).toBe(false);
            }
        }
    });

    it('applies default item validation to every public decoder', async () => {
        const url = createInspectUrl({ ...base, paintwear: 2 }, { validateInput: false });
        const hex = url.split('%20')[1];
        expect(() => decodeMaskedData(hex)).toThrow();
        expect(() => decodeMaskedUrl(url)).toThrow();
        expect(() => new CS2Inspect().decodeMaskedUrl(url)).toThrow();
        await expect(inspectItem(url)).rejects.toThrow();
        expect(decodeMaskedData(hex, { validateInput: false }).paintwear).toBe(2);
        await expect(inspectItem(url, { config: { validateInput: false } })).resolves.toHaveProperty('paintwear', 2);
    });

    it('honors nested inspectItem options without a Steam manager', async () => {
        const url = createInspectUrl({ ...base, customname: 'abcdef' });
        await expect(inspectItem(url, { config: { maxCustomNameLength: 3 } })).rejects.toThrow();
        await expect(inspectItem(url, { maxCustomNameLength: 3 })).rejects.toThrow();
    });

    it('uses the same UTF-8 byte limits before encoding and after decoding', () => {
        const customnames = ['名'.repeat(40), '😀'.repeat(30)]; // 120 bytes each
        expect(validateItem({ ...base, customnames }).valid).toBe(false);
        expect(() => createInspectUrl({ ...base, customnames })).toThrow();
        const config = { maxCustomNameLength: 120 };
        const cs2 = new CS2Inspect(config);
        expect(cs2.validateItem({ ...base, customnames }).valid).toBe(true);
        const url = createInspectUrl({ ...base, customnames }, config);
        expect(decodeMaskedUrl(url, config).customnames).toEqual(customnames);
        expect(() => decodeMaskedUrl(url, { maxCustomNameLength: 119 })).toThrow();
        expect(() => new ProtobufWriter(1024).writeString(customnames[0])).toThrow();
    });

    it('uses configured URL limits consistently for larger blobs', async () => {
        const config = { maxUrlLength: 8192 };
        const blobdata = new Uint8Array(2500).fill(0xFF);
        const url = createInspectUrl({ ...base, blobdata }, config);
        expect(url.length).toBeGreaterThan(4096);
        const cs2 = new CS2Inspect(config);
        expect(cs2.validateUrl(url).valid).toBe(true);
        expect(cs2.decodeMaskedUrl(url).blobdata).toEqual(blobdata);
        await expect(inspectItem(url, { config })).resolves.toHaveProperty('blobdata', blobdata);
        expect(() => decodeMaskedUrl(url)).toThrow();
    });

    it('rejects overflow encodings and skips full-width unknown varints', () => {
        expect(() => new ProtobufReader(Uint8Array.from([255, 255, 255, 255, 31])).readVarint()).toThrow(DecodingError);
        expect(() => new ProtobufReader(Uint8Array.from([...Array(9).fill(255), 2])).readVarint64()).toThrow(DecodingError);
        const writer = new ProtobufWriter();
        writer.writeVarint64(0xFFFFFFFFFFFFFFFFn);
        writer.writeVarint(42);
        const reader = new ProtobufReader(writer.getBytes());
        reader.skipField(0);
        expect(reader.readVarint()).toBe(42);
    });
});
