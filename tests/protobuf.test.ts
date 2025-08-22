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
            const reader = new ProtobufReader(new Uint8Array([]));
            expect(() => reader.readVarint()).toThrow(DecodingError);
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
            const reader = new ProtobufReader(encoded);
            
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
});
