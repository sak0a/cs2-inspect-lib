/**
 * Unit tests for protobuf encoding/decoding
 */

import { ProtobufReader, ProtobufWriter } from '../src';
import { WeaponType, ItemRarity, EconItem, Sticker } from '../src/types';
import { DecodingError, EncodingError } from '../src/errors';

describe('ProtobufWriter', () => {
    describe('basic operations', () => {
        it('should write varints correctly', () => {
            const writer = new ProtobufWriter();
            writer.writeVarint(0);
            writer.writeVarint(127);
            writer.writeVarint(128);
            writer.writeVarint(16383);
            writer.writeVarint(16384);

            const bytes = writer.getBytes();
            expect(bytes).toEqual(new Uint8Array([0, 127, 128, 1, 255, 127, 128, 128, 1]));
        });

        it('should write varint64 correctly', () => {
            const writer = new ProtobufWriter();
            writer.writeVarint64(0n);
            writer.writeVarint64(127n);
            writer.writeVarint64(128n);
            writer.writeVarint64(BigInt('9876543210'));

            const bytes = writer.getBytes();
            expect(bytes.length).toBeGreaterThan(0);
        });

        it('should write signed int32 correctly', () => {
            const writer = new ProtobufWriter();
            writer.writeSInt32(0);
            writer.writeSInt32(-1);
            writer.writeSInt32(1);
            writer.writeSInt32(-2147483648); // Min int32
            writer.writeSInt32(2147483647);  // Max int32

            const bytes = writer.getBytes();
            expect(bytes.length).toBeGreaterThan(0);
        });

        it('should write floats correctly', () => {
            const writer = new ProtobufWriter();
            writer.writeFloat(0.0);
            writer.writeFloat(1.0);
            writer.writeFloat(-1.0);
            writer.writeFloat(0.15);

            const bytes = writer.getBytes();
            expect(bytes.length).toBe(16); // 4 floats * 4 bytes each
        });

        it('should write strings correctly', () => {
            const writer = new ProtobufWriter();
            writer.writeString('');
            writer.writeString('test');
            writer.writeString('🔥 Fire Serpent 🐍');

            const bytes = writer.getBytes();
            expect(bytes.length).toBeGreaterThan(0);
        });

        it('should throw on invalid inputs', () => {
            const writer = new ProtobufWriter();
            
            expect(() => writer.writeVarint(-1)).toThrow(EncodingError);
            expect(() => writer.writeVarint64(-1n)).toThrow(EncodingError);
            expect(() => writer.writeSInt32(1.5)).toThrow(EncodingError);
            expect(() => writer.writeFloat(Infinity)).toThrow(EncodingError);
            expect(() => writer.writeString('a'.repeat(200))).toThrow(EncodingError);
        });
    });

    describe('sticker encoding', () => {
        it('should encode minimal sticker', () => {
            const sticker: Sticker = {
                slot: 0,
                sticker_id: 1
            };

            const bytes = ProtobufWriter.encodeSticker(sticker);
            expect(bytes.length).toBeGreaterThan(0);
        });

        it('should encode complete sticker', () => {
            const sticker: Sticker = {
                slot: 0,
                sticker_id: 1,
                wear: 0.1,
                scale: 1.2,
                rotation: 45.0,
                tint_id: 1,
                offset_x: 0.1,
                offset_y: -0.1,
                offset_z: 0.05,
                pattern: 10,
                highlight_reel: 1
            };

            const bytes = ProtobufWriter.encodeSticker(sticker);
            expect(bytes.length).toBeGreaterThan(0);
        });
    });

    describe('item encoding', () => {
        it('should encode minimal item', () => {
            const item: EconItem = {
                defindex: WeaponType.AK_47,
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15
            };

            const bytes = ProtobufWriter.encodeItemData(item);
            expect(bytes.length).toBeGreaterThan(0);
        });

        it('should encode complete item', () => {
            const item: EconItem = {
                accountid: 123456789,
                itemid: BigInt('9876543210'),
                defindex: WeaponType.AK_47,
                paintindex: 44,
                rarity: ItemRarity.COVERT,
                quality: 4,
                paintwear: 0.15,
                paintseed: 661,
                killeaterscoretype: 1,
                killeatervalue: 100,
                customname: 'Fire Serpent',
                stickers: [
                    {
                        slot: 0,
                        sticker_id: 1,
                        wear: 0.1
                    }
                ],
                keychains: [
                    {
                        slot: 0,
                        sticker_id: 20,
                        pattern: 148
                    }
                ],
                style: 5,
                variations: [
                    {
                        slot: 0,
                        sticker_id: 100,
                        pattern: 50
                    }
                ],
                upgrade_level: 3,
                entindex: -1
            };

            const bytes = ProtobufWriter.encodeItemData(item);
            expect(bytes.length).toBeGreaterThan(0);
        });

        it('should create inspect URL', () => {
            const item: EconItem = {
                defindex: WeaponType.AK_47,
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15
            };

            const url = ProtobufWriter.createInspectUrl(item);
            expect(url).toMatch(/^steam:\/\/rungame\/730\/76561202255233023\/\+csgo_econ_action_preview%20[0-9A-F]+$/);
        });
    });
});

describe('ProtobufReader', () => {
    describe('basic operations', () => {
        it('should read varints correctly', () => {
            const data = new Uint8Array([0, 127, 128, 1, 255, 127, 128, 128, 1]);
            const reader = new ProtobufReader(data);

            expect(reader.readVarint()).toBe(0);
            expect(reader.readVarint()).toBe(127);
            expect(reader.readVarint()).toBe(128);
            expect(reader.readVarint()).toBe(16383);
            expect(reader.readVarint()).toBe(16384);
        });

        it('should handle buffer underruns', () => {
            expect(() => new ProtobufReader(new Uint8Array([]))).toThrow(DecodingError);
        });

        it('should handle invalid varint encoding', () => {
            // Create invalid varint (too many bytes)
            const data = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
            const reader = new ProtobufReader(data);
            expect(() => reader.readVarint()).toThrow(DecodingError);
        });

        it('should read strings correctly', () => {
            const writer = new ProtobufWriter();
            writer.writeString('test');
            writer.writeString('🔥 Fire Serpent 🐍');

            const reader = new ProtobufReader(writer.getBytes());
            expect(reader.readString()).toBe('test');
            expect(reader.readString()).toBe('🔥 Fire Serpent 🐍');
        });

        it('should handle invalid string encoding', () => {
            // Create invalid UTF-8
            const data = new Uint8Array([4, 0xFF, 0xFF, 0xFF, 0xFF]);
            const reader = new ProtobufReader(data);
            expect(() => reader.readString()).toThrow(DecodingError);
        });
    });

    describe('sticker decoding', () => {
        it('should decode encoded sticker', () => {
            const originalSticker: Sticker = {
                slot: 0,
                sticker_id: 1,
                wear: 0.1,
                scale: 1.2,
                rotation: 45.0,
                tint_id: 1,
                offset_x: 0.1,
                offset_y: -0.1,
                offset_z: 0.05,
                pattern: 10,
                highlight_reel: 1
            };

            const encoded = ProtobufWriter.encodeSticker(originalSticker);
            const reader = new ProtobufReader(encoded);
            const decoded = ProtobufReader.decodeSticker(reader);

            expect(decoded.slot).toBe(originalSticker.slot);
            expect(decoded.sticker_id).toBe(originalSticker.sticker_id);
            expect(decoded.wear).toBeCloseTo(originalSticker.wear!, 6);
            expect(decoded.scale).toBeCloseTo(originalSticker.scale!, 6);
            expect(decoded.rotation).toBeCloseTo(originalSticker.rotation!, 6);
            expect(decoded.tint_id).toBe(originalSticker.tint_id);
            expect(decoded.offset_x).toBeCloseTo(originalSticker.offset_x!, 6);
            expect(decoded.offset_y).toBeCloseTo(originalSticker.offset_y!, 6);
            expect(decoded.offset_z).toBeCloseTo(originalSticker.offset_z!, 6);
            expect(decoded.pattern).toBe(originalSticker.pattern);
            expect(decoded.highlight_reel).toBe(originalSticker.highlight_reel);
        });
    });

    describe('item decoding', () => {
        it('should decode encoded item', () => {
            const originalItem: EconItem = {
                defindex: WeaponType.AK_47,
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15,
                rarity: ItemRarity.COVERT,
                stickers: [
                    {
                        slot: 0,
                        sticker_id: 1,
                        wear: 0.1,
                        highlight_reel: 1
                    }
                ],
                style: 5,
                upgrade_level: 3
            };

            const encoded = ProtobufWriter.encodeItemData(originalItem);
            // const reader = new ProtobufReader(encoded); // Not used in this test
            
            // We need to simulate the hex data format for decodeMaskedData
            const hexData = Array.from(encoded)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase() + '00000000'; // Add dummy CRC

            const decoded = ProtobufReader.decodeMaskedData('00' + hexData);

            expect(decoded.defindex).toBe(originalItem.defindex);
            expect(decoded.paintindex).toBe(originalItem.paintindex);
            expect(decoded.paintseed).toBe(originalItem.paintseed);
            expect(decoded.paintwear).toBeCloseTo(originalItem.paintwear, 6);
            expect(decoded.rarity).toBe(originalItem.rarity);
            expect(decoded.style).toBe(originalItem.style);
            expect(decoded.upgrade_level).toBe(originalItem.upgrade_level);
            expect(decoded.stickers).toHaveLength(1);
            expect(decoded.stickers![0].slot).toBe(originalItem.stickers![0].slot);
            expect(decoded.stickers![0].sticker_id).toBe(originalItem.stickers![0].sticker_id);
            expect(decoded.stickers![0].highlight_reel).toBe(originalItem.stickers![0].highlight_reel);
        });

        it('should handle invalid hex data', () => {
            expect(() => ProtobufReader.decodeMaskedData('invalid')).toThrow(DecodingError);
            expect(() => ProtobufReader.decodeMaskedData('')).toThrow(DecodingError);
            expect(() => ProtobufReader.decodeMaskedData('123')).toThrow(DecodingError);
        });
    });

    describe('round-trip encoding/decoding', () => {
        it('should preserve data through encode/decode cycle', () => {
            const originalItem: EconItem = {
                accountid: 123456789,
                itemid: BigInt('9876543210'),
                defindex: WeaponType.AWP,
                paintindex: 309,
                rarity: ItemRarity.COVERT,
                quality: 4,
                paintwear: 0.15,
                paintseed: 420,
                killeaterscoretype: 1,
                killeatervalue: 100,
                customname: 'Dragon Lore',
                stickers: [
                    {
                        slot: 0,
                        sticker_id: 5032,
                        wear: 0.15,
                        scale: 1.2,
                        rotation: 45.0,
                        tint_id: 1,
                        offset_x: 0.1,
                        offset_y: -0.1,
                        offset_z: 0.05,
                        pattern: 10,
                        highlight_reel: 1
                    }
                ],
                keychains: [
                    {
                        slot: 0,
                        sticker_id: 20,
                        pattern: 148,
                        highlight_reel: 2
                    }
                ],
                style: 7,
                variations: [
                    {
                        slot: 0,
                        sticker_id: 100,
                        pattern: 50,
                        highlight_reel: 3
                    }
                ],
                upgrade_level: 10,
                entindex: -1
            };

            // Create URL and decode it back
            const url = ProtobufWriter.createInspectUrl(originalItem);
            expect(url).toMatch(/^steam:\/\/rungame\/730\/76561202255233023\/\+csgo_econ_action_preview%20[0-9A-F]+$/);

            // Extract hex data from URL
            const hexData = url.split('%20')[1];
            const decoded = ProtobufReader.decodeMaskedData(hexData);

            // Verify all fields are preserved
            expect(decoded.accountid).toBe(originalItem.accountid);
            expect(decoded.itemid).toBe(originalItem.itemid);
            expect(decoded.defindex).toBe(originalItem.defindex);
            expect(decoded.paintindex).toBe(originalItem.paintindex);
            expect(decoded.rarity).toBe(originalItem.rarity);
            expect(decoded.quality).toBe(originalItem.quality);
            expect(decoded.paintwear).toBeCloseTo(originalItem.paintwear, 6);
            expect(decoded.paintseed).toBe(originalItem.paintseed);
            expect(decoded.killeaterscoretype).toBe(originalItem.killeaterscoretype);
            expect(decoded.killeatervalue).toBe(originalItem.killeatervalue);
            expect(decoded.customname).toBe(originalItem.customname);
            expect(decoded.style).toBe(originalItem.style);
            expect(decoded.upgrade_level).toBe(originalItem.upgrade_level);
            expect(decoded.entindex).toBe(originalItem.entindex);

            // Verify arrays
            expect(decoded.stickers).toHaveLength(1);
            expect(decoded.keychains).toHaveLength(1);
            expect(decoded.variations).toHaveLength(1);

            // Verify sticker details
            const decodedSticker = decoded.stickers![0];
            const originalSticker = originalItem.stickers![0];
            expect(decodedSticker.slot).toBe(originalSticker.slot);
            expect(decodedSticker.sticker_id).toBe(originalSticker.sticker_id);
            expect(decodedSticker.highlight_reel).toBe(originalSticker.highlight_reel);
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle empty buffer', () => {
            expect(() => new ProtobufReader(new Uint8Array(0))).toThrow(DecodingError);
        });

        it('should handle buffer too large', () => {
            const largeBuffer = new Uint8Array(11 * 1024 * 1024); // 11MB
            expect(() => new ProtobufReader(largeBuffer)).toThrow(DecodingError);
        });

        it('should handle buffer underrun in readFloat', () => {
            const data = new Uint8Array([1, 2]); // Too short for float
            const reader = new ProtobufReader(data);
            expect(() => reader.readFloat()).toThrow(DecodingError);
        });

        it('should handle buffer underrun in readString', () => {
            const data = new Uint8Array([10]); // Length 10 but no data
            const reader = new ProtobufReader(data);
            expect(() => reader.readString()).toThrow(DecodingError);
        });

        it('should handle string length exceeding maximum', () => {
            const writer = new ProtobufWriter();
            writer.writeVarint(1000000); // Very large length
            const data = writer.getBytes();
            const reader = new ProtobufReader(data, { maxCustomNameLength: 100 });
            expect(() => reader.readString()).toThrow(DecodingError);
        });

        it('should handle invalid UTF-8 in string', () => {
            // Create buffer with invalid UTF-8 sequence
            const data = new Uint8Array([4, 0xFF, 0xFE, 0xFD, 0xFC]);
            const reader = new ProtobufReader(data);
            expect(() => reader.readString()).toThrow(DecodingError);
        });

        it('should handle invalid varint encoding', () => {
            // Create varint that's too long (more than 5 bytes for 32-bit)
            const data = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
            const reader = new ProtobufReader(data);
            expect(() => reader.readVarint()).toThrow(DecodingError);
        });

        it('should handle invalid varint64 encoding', () => {
            // Create varint64 that's too long (more than 10 bytes)
            const data = new Uint8Array(Array(11).fill(0xFF));
            const reader = new ProtobufReader(data);
            expect(() => reader.readVarint64()).toThrow(DecodingError);
        });

        it('should handle buffer underrun in readVarint', () => {
            const reader = new ProtobufReader(new Uint8Array([0])); // Valid buffer
            (reader as any).pos = 1; // Set position beyond buffer
            expect(() => reader.readVarint()).toThrow(DecodingError);
        });

        it('should handle buffer underrun in readVarint64', () => {
            const reader = new ProtobufReader(new Uint8Array([0])); // Valid buffer
            (reader as any).pos = 1; // Set position beyond buffer
            expect(() => reader.readVarint64()).toThrow(DecodingError);
        });

        it('should handle bytes length exceeding limit', () => {
            const writer = new ProtobufWriter();
            writer.writeVarint(2000); // Length exceeding 1024 limit
            const data = writer.getBytes();
            const reader = new ProtobufReader(data);
            expect(() => reader.readBytes()).toThrow(DecodingError);
        });

        it('should handle bytes extending beyond buffer', () => {
            const data = new Uint8Array([10, 1, 2]); // Length 10 but only 2 bytes available
            const reader = new ProtobufReader(data);
            expect(() => reader.readBytes()).toThrow(DecodingError);
        });

        it('should handle invalid wire type in readTag', () => {
            const data = new Uint8Array([0x3F]); // Wire type 7 (invalid)
            const reader = new ProtobufReader(data);
            expect(() => reader.readTag()).toThrow(DecodingError);
        });

        it('should warn about unusual field numbers', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            // Create a tag with field number 100: (100 << 3) | 0 = 800 = 0x320
            // In varint encoding: 0x320 = 0xA0, 0x06
            const data = new Uint8Array([0xA0, 0x06]); // Field number 100, wire type 0
            const reader = new ProtobufReader(data, { enableLogging: true });

            const [fieldNumber, wireType] = reader.readTag();
            expect(fieldNumber).toBe(100);
            expect(wireType).toBe(0);
            expect(consoleSpy).toHaveBeenCalledWith('Unusual field number: 100');

            consoleSpy.mockRestore();
        });

        it('should not warn about unusual field numbers when logging disabled', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            // Create a tag with field number 100: (100 << 3) | 0 = 800 = 0x320
            const data = new Uint8Array([0xA0, 0x06]); // Field number 100, wire type 0
            const reader = new ProtobufReader(data, { enableLogging: false });

            reader.readTag();
            expect(consoleSpy).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it('should handle skipField with invalid wire type', () => {
            const reader = new ProtobufReader(new Uint8Array([0]));
            expect(() => reader.skipField(7)).toThrow(DecodingError); // Invalid wire type
        });

        it('should handle skipField buffer underrun for 64-bit', () => {
            const data = new Uint8Array([1, 2, 3]); // Only 3 bytes, need 8
            const reader = new ProtobufReader(data);
            expect(() => reader.skipField(1)).toThrow(DecodingError);
        });

        it('should handle skipField buffer underrun for 32-bit', () => {
            const data = new Uint8Array([1, 2]); // Only 2 bytes, need 4
            const reader = new ProtobufReader(data);
            expect(() => reader.skipField(5)).toThrow(DecodingError);
        });

        it('should handle skipField buffer underrun for length-delimited', () => {
            const data = new Uint8Array([10, 1]); // Length 10 but only 1 byte available
            const reader = new ProtobufReader(data);
            expect(() => reader.skipField(2)).toThrow(DecodingError);
        });

        it('should handle invalid hex byte in hexToBytes', () => {
            expect(() => ProtobufReader.decodeMaskedData('00ABCXYZ00000000')).toThrow(DecodingError);
        });

        it('should handle hex data with leading 00', () => {
            const validHex = '00' + '08' + '07' + '10' + '2C' + '18' + '95' + '05' + '20' + '00' + '00000000';
            expect(() => ProtobufReader.decodeMaskedData(validHex)).not.toThrow();
        });

        it('should handle hex data without leading 00', () => {
            const validHex = '08' + '07' + '10' + '2C' + '18' + '95' + '05' + '20' + '00' + '00000000';
            expect(() => ProtobufReader.decodeMaskedData(validHex)).not.toThrow();
        });

        it('should handle too many fields in sticker decoding', () => {
            // Create a buffer that would cause too many fields to be processed
            const writer = new ProtobufWriter();
            // Add 25 fields (exceeds maxFields limit of 20)
            for (let i = 1; i <= 25; i++) {
                writer.writeTag(i, 0); // Field number i, wire type 0 (varint)
                writer.writeVarint(i);
            }

            const reader = new ProtobufReader(writer.getBytes());
            expect(() => ProtobufReader.decodeSticker(reader)).toThrow(DecodingError);
        });

        it('should handle too many fields in item decoding', () => {
            // Create hex data that would cause too many fields to be processed
            const writer = new ProtobufWriter();
            // Add 105 fields (exceeds maxFields limit of 100)
            for (let i = 1; i <= 105; i++) {
                writer.writeTag(i, 0); // Field number i, wire type 0 (varint)
                writer.writeVarint(i);
            }

            const hexData = '00' + Array.from(writer.getBytes())
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase() + '00000000';

            expect(() => ProtobufReader.decodeMaskedData(hexData)).toThrow(DecodingError);
        });

        it('should handle validation errors when validation is enabled', () => {
            // Create invalid item data with a valid defindex but invalid paintwear
            const writer = new ProtobufWriter();
            writer.writeTag(1, 0); // defindex field
            writer.writeVarint(7); // Valid defindex (AK-47)
            writer.writeTag(7, 5); // paintwear field (wire type 5 for float)
            writer.writeFloat(-1.0); // Invalid paintwear (should be 0-1)

            const hexData = '00' + Array.from(writer.getBytes())
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase() + '00000000';

            expect(() => ProtobufReader.decodeMaskedData(hexData, { validateInput: true })).toThrow();
        });

        it('should handle errors in sticker field decoding', () => {
            const writer = new ProtobufWriter();
            writer.writeTag(3, 1); // Invalid wire type for wear field
            writer.writeVarint64(123n); // Wrong data type

            const reader = new ProtobufReader(writer.getBytes());
            expect(() => ProtobufReader.decodeSticker(reader)).toThrow(DecodingError);
        });

        it('should handle errors in item field decoding', () => {
            const writer = new ProtobufWriter();
            writer.writeTag(7, 1); // Invalid wire type for paintwear field
            writer.writeVarint64(123n); // Wrong data type

            const hexData = '00' + Array.from(writer.getBytes())
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase() + '00000000';

            expect(() => ProtobufReader.decodeMaskedData(hexData)).toThrow(DecodingError);
        });

        it('should handle generic decoding errors', () => {
            // Test the generic error handling by providing malformed hex data
            // This should trigger a ValidationError that gets wrapped in DecodingError
            const malformedHex = '00INVALID_HEX_DATA00000000';

            expect(() => ProtobufReader.decodeMaskedData(malformedHex)).toThrow(); // Any error is fine
        });

        it('should test utility methods', () => {
            const reader = new ProtobufReader(new Uint8Array([1, 2, 3, 4, 5]));

            expect(reader.hasMore()).toBe(true);
            expect(reader.getPosition()).toBe(0);
            expect(reader.getRemainingBytes()).toBe(5);

            reader.readVarint(); // Read one byte
            expect(reader.getPosition()).toBe(1);
            expect(reader.getRemainingBytes()).toBe(4);
            expect(reader.hasMore()).toBe(true);

            // Read remaining bytes
            reader.readVarint(); // Read second byte
            reader.readVarint(); // Read third byte
            reader.readVarint(); // Read fourth byte
            reader.readVarint(); // Read fifth byte

            expect(reader.hasMore()).toBe(false);
            expect(reader.getRemainingBytes()).toBe(0);
        });

        it('should handle skipField for all wire types', () => {
            const reader = new ProtobufReader(new Uint8Array([
                // Wire type 0 (varint)
                0x7F,
                // Wire type 1 (64-bit) - 8 bytes
                1, 2, 3, 4, 5, 6, 7, 8,
                // Wire type 2 (length-delimited) - length 3 + 3 bytes
                3, 1, 2, 3,
                // Wire type 5 (32-bit) - 4 bytes
                1, 2, 3, 4
            ]));

            // Test each wire type
            expect(() => reader.skipField(0)).not.toThrow(); // varint
            expect(() => reader.skipField(1)).not.toThrow(); // 64-bit
            expect(() => reader.skipField(2)).not.toThrow(); // length-delimited
            expect(() => reader.skipField(5)).not.toThrow(); // 32-bit
        });
    });

    describe('comprehensive proto field tests', () => {
        describe('Sticker message fields', () => {
            it('should encode and decode field 1: slot', () => {
                const sticker: Sticker = { slot: 3, sticker_id: 1 };
                const encoded = ProtobufWriter.encodeSticker(sticker);
                const reader = new ProtobufReader(encoded);
                const decoded = ProtobufReader.decodeSticker(reader);
                expect(decoded.slot).toBe(3);
            });

            it('should encode and decode field 2: sticker_id', () => {
                const sticker: Sticker = { slot: 0, sticker_id: 12345 };
                const encoded = ProtobufWriter.encodeSticker(sticker);
                const reader = new ProtobufReader(encoded);
                const decoded = ProtobufReader.decodeSticker(reader);
                expect(decoded.sticker_id).toBe(12345);
            });

            it('should encode and decode field 3: wear', () => {
                const sticker: Sticker = { slot: 0, sticker_id: 1, wear: 0.75 };
                const encoded = ProtobufWriter.encodeSticker(sticker);
                const reader = new ProtobufReader(encoded);
                const decoded = ProtobufReader.decodeSticker(reader);
                expect(decoded.wear).toBeCloseTo(0.75, 6);
            });

            it('should encode and decode field 4: scale', () => {
                const sticker: Sticker = { slot: 0, sticker_id: 1, scale: 1.5 };
                const encoded = ProtobufWriter.encodeSticker(sticker);
                const reader = new ProtobufReader(encoded);
                const decoded = ProtobufReader.decodeSticker(reader);
                expect(decoded.scale).toBeCloseTo(1.5, 6);
            });

            it('should encode and decode field 5: rotation', () => {
                const sticker: Sticker = { slot: 0, sticker_id: 1, rotation: 90.0 };
                const encoded = ProtobufWriter.encodeSticker(sticker);
                const reader = new ProtobufReader(encoded);
                const decoded = ProtobufReader.decodeSticker(reader);
                expect(decoded.rotation).toBeCloseTo(90.0, 6);
            });

            it('should encode and decode field 6: tint_id', () => {
                const sticker: Sticker = { slot: 0, sticker_id: 1, tint_id: 5 };
                const encoded = ProtobufWriter.encodeSticker(sticker);
                const reader = new ProtobufReader(encoded);
                const decoded = ProtobufReader.decodeSticker(reader);
                expect(decoded.tint_id).toBe(5);
            });

            it('should encode and decode field 7: offset_x', () => {
                const sticker: Sticker = { slot: 0, sticker_id: 1, offset_x: 0.25 };
                const encoded = ProtobufWriter.encodeSticker(sticker);
                const reader = new ProtobufReader(encoded);
                const decoded = ProtobufReader.decodeSticker(reader);
                expect(decoded.offset_x).toBeCloseTo(0.25, 6);
            });

            it('should encode and decode field 8: offset_y', () => {
                const sticker: Sticker = { slot: 0, sticker_id: 1, offset_y: -0.5 };
                const encoded = ProtobufWriter.encodeSticker(sticker);
                const reader = new ProtobufReader(encoded);
                const decoded = ProtobufReader.decodeSticker(reader);
                expect(decoded.offset_y).toBeCloseTo(-0.5, 6);
            });

            it('should encode and decode field 9: offset_z', () => {
                const sticker: Sticker = { slot: 0, sticker_id: 1, offset_z: 0.1 };
                const encoded = ProtobufWriter.encodeSticker(sticker);
                const reader = new ProtobufReader(encoded);
                const decoded = ProtobufReader.decodeSticker(reader);
                expect(decoded.offset_z).toBeCloseTo(0.1, 6);
            });

            it('should encode and decode field 10: pattern', () => {
                const sticker: Sticker = { slot: 0, sticker_id: 1, pattern: 42 };
                const encoded = ProtobufWriter.encodeSticker(sticker);
                const reader = new ProtobufReader(encoded);
                const decoded = ProtobufReader.decodeSticker(reader);
                expect(decoded.pattern).toBe(42);
            });

            it('should encode and decode field 11: highlight_reel', () => {
                const sticker: Sticker = { slot: 0, sticker_id: 1, highlight_reel: 7 };
                const encoded = ProtobufWriter.encodeSticker(sticker);
                const reader = new ProtobufReader(encoded);
                const decoded = ProtobufReader.decodeSticker(reader);
                expect(decoded.highlight_reel).toBe(7);
            });

            it('should encode and decode field 12: wrapped_sticker', () => {
                const sticker: Sticker = { slot: 0, sticker_id: 1, wrapped_sticker: 99 };
                const encoded = ProtobufWriter.encodeSticker(sticker);
                const reader = new ProtobufReader(encoded);
                const decoded = ProtobufReader.decodeSticker(reader);
                expect(decoded.wrapped_sticker).toBe(99);
            });

            it('should encode and decode all sticker fields together', () => {
                const sticker: Sticker = {
                    slot: 2,
                    sticker_id: 5432,
                    wear: 0.33,
                    scale: 1.8,
                    rotation: -45.0,
                    tint_id: 3,
                    offset_x: 0.12,
                    offset_y: -0.34,
                    offset_z: 0.56,
                    pattern: 78,
                    highlight_reel: 2,
                    wrapped_sticker: 123
                };
                const encoded = ProtobufWriter.encodeSticker(sticker);
                const reader = new ProtobufReader(encoded);
                const decoded = ProtobufReader.decodeSticker(reader);
                
                expect(decoded.slot).toBe(2);
                expect(decoded.sticker_id).toBe(5432);
                expect(decoded.wear).toBeCloseTo(0.33, 6);
                expect(decoded.scale).toBeCloseTo(1.8, 6);
                expect(decoded.rotation).toBeCloseTo(-45.0, 6);
                expect(decoded.tint_id).toBe(3);
                expect(decoded.offset_x).toBeCloseTo(0.12, 6);
                expect(decoded.offset_y).toBeCloseTo(-0.34, 6);
                expect(decoded.offset_z).toBeCloseTo(0.56, 6);
                expect(decoded.pattern).toBe(78);
                expect(decoded.highlight_reel).toBe(2);
                expect(decoded.wrapped_sticker).toBe(123);
            });
        });

        describe('CEconItemPreviewDataBlock message fields', () => {
            it('should encode and decode field 1: accountid', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    accountid: 123456789
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.accountid).toBe(123456789);
            });

            it('should encode and decode field 2: itemid (uint64)', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    itemid: BigInt('98765432101234567890')
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.itemid).toBe(item.itemid);
            });

            it('should encode and decode field 3: defindex', () => {
                const item: EconItem = {
                    defindex: WeaponType.AWP,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.defindex).toBe(WeaponType.AWP);
            });

            it('should encode and decode field 4: paintindex', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 999,
                    paintseed: 661,
                    paintwear: 0.15
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.paintindex).toBe(999);
            });

            it('should encode and decode field 5: rarity', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    rarity: ItemRarity.COVERT
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.rarity).toBe(ItemRarity.COVERT);
            });

            it('should encode and decode field 6: quality', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    quality: 9
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.quality).toBe(9);
            });

            it('should encode and decode field 7: paintwear', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.999
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.paintwear).toBeCloseTo(0.999, 6);
            });

            it('should encode and decode field 8: paintseed', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 999,
                    paintwear: 0.15
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.paintseed).toBe(999);
            });

            it('should encode and decode field 9: killeaterscoretype', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    killeaterscoretype: 2
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.killeaterscoretype).toBe(2);
            });

            it('should encode and decode field 10: killeatervalue', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    killeatervalue: 5000
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.killeatervalue).toBe(5000);
            });

            it('should encode and decode field 11: customname', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    customname: 'Test Weapon Name'
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.customname).toBe('Test Weapon Name');
            });

            it('should encode and decode field 12: stickers (repeated)', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    stickers: [
                        { slot: 0, sticker_id: 1, wrapped_sticker: 10 },
                        { slot: 1, sticker_id: 2, highlight_reel: 5 }
                    ]
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.stickers).toHaveLength(2);
                expect(decoded.stickers![0].wrapped_sticker).toBe(10);
                expect(decoded.stickers![1].highlight_reel).toBe(5);
            });

            it('should encode and decode field 13: inventory', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    inventory: 42
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.inventory).toBe(42);
            });

            it('should encode and decode field 14: origin', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    origin: 8
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.origin).toBe(8);
            });

            it('should encode and decode field 15: questid', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    questid: 123
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.questid).toBe(123);
            });

            it('should encode and decode field 16: dropreason', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    dropreason: 3
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.dropreason).toBe(3);
            });

            it('should encode and decode field 17: musicindex', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    musicindex: 15
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.musicindex).toBe(15);
            });

            it('should encode and decode field 18: entindex (signed int32)', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    entindex: -5
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.entindex).toBe(-5);
            });

            it('should encode and decode field 19: petindex', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    petindex: 77
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.petindex).toBe(77);
            });

            it('should encode and decode field 20: keychains (repeated)', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    keychains: [
                        { slot: 0, sticker_id: 20, wrapped_sticker: 30 },
                        { slot: 1, sticker_id: 21 }
                    ]
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.keychains).toHaveLength(2);
                expect(decoded.keychains![0].wrapped_sticker).toBe(30);
            });

            it('should encode and decode field 21: style', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    style: 4
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.style).toBe(4);
            });

            it('should encode and decode field 22: variations (repeated)', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    variations: [
                        { slot: 0, sticker_id: 100, wrapped_sticker: 200 },
                        { slot: 1, sticker_id: 101, highlight_reel: 3 }
                    ]
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.variations).toHaveLength(2);
                expect(decoded.variations![0].wrapped_sticker).toBe(200);
                expect(decoded.variations![1].highlight_reel).toBe(3);
            });

            it('should encode and decode field 23: upgrade_level', () => {
                const item: EconItem = {
                    defindex: WeaponType.AK_47,
                    paintindex: 44,
                    paintseed: 661,
                    paintwear: 0.15,
                    upgrade_level: 5
                };
                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);
                expect(decoded.upgrade_level).toBe(5);
            });

            it('should encode and decode all fields together', () => {
                const item: EconItem = {
                    accountid: 123456789,
                    itemid: BigInt('98765432101234567890'),
                    defindex: WeaponType.AWP,
                    paintindex: 309,
                    rarity: ItemRarity.COVERT,
                    quality: 4,
                    paintwear: 0.15,
                    paintseed: 420,
                    killeaterscoretype: 1,
                    killeatervalue: 100,
                    customname: 'Dragon Lore',
                    stickers: [
                        {
                            slot: 0,
                            sticker_id: 5032,
                            wear: 0.15,
                            scale: 1.2,
                            rotation: 45.0,
                            tint_id: 1,
                            offset_x: 0.1,
                            offset_y: -0.1,
                            offset_z: 0.05,
                            pattern: 10,
                            highlight_reel: 1,
                            wrapped_sticker: 99
                        }
                    ],
                    inventory: 1,
                    origin: 8,
                    questid: 123,
                    dropreason: 0,
                    musicindex: 1,
                    entindex: -1,
                    petindex: 0,
                    keychains: [
                        {
                            slot: 0,
                            sticker_id: 20,
                            pattern: 148,
                            highlight_reel: 2,
                            wrapped_sticker: 50
                        }
                    ],
                    style: 7,
                    variations: [
                        {
                            slot: 0,
                            sticker_id: 100,
                            pattern: 50,
                            highlight_reel: 3,
                            wrapped_sticker: 75
                        }
                    ],
                    upgrade_level: 10
                };

                const encoded = ProtobufWriter.encodeItemData(item);
                const hexData = '00' + Array.from(encoded)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .toUpperCase() + '00000000';
                const decoded = ProtobufReader.decodeMaskedData(hexData);

                // Verify all fields
                expect(decoded.accountid).toBe(123456789);
                expect(decoded.itemid).toBe(BigInt('98765432101234567890'));
                expect(decoded.defindex).toBe(WeaponType.AWP);
                expect(decoded.paintindex).toBe(309);
                expect(decoded.rarity).toBe(ItemRarity.COVERT);
                expect(decoded.quality).toBe(4);
                expect(decoded.paintwear).toBeCloseTo(0.15, 6);
                expect(decoded.paintseed).toBe(420);
                expect(decoded.killeaterscoretype).toBe(1);
                expect(decoded.killeatervalue).toBe(100);
                expect(decoded.customname).toBe('Dragon Lore');
                expect(decoded.inventory).toBe(1);
                expect(decoded.origin).toBe(8);
                expect(decoded.questid).toBe(123);
                expect(decoded.dropreason).toBe(0);
                expect(decoded.musicindex).toBe(1);
                expect(decoded.entindex).toBe(-1);
                expect(decoded.petindex).toBe(0);
                expect(decoded.style).toBe(7);
                expect(decoded.upgrade_level).toBe(10);

                // Verify arrays
                expect(decoded.stickers).toHaveLength(1);
                expect(decoded.stickers![0].wrapped_sticker).toBe(99);
                expect(decoded.keychains).toHaveLength(1);
                expect(decoded.keychains![0].wrapped_sticker).toBe(50);
                expect(decoded.variations).toHaveLength(1);
                expect(decoded.variations![0].wrapped_sticker).toBe(75);
            });
        });
    });
});
