/**
 * CS2 Inspect URL handling and item builder for with ProtoBufWriter and ProtoBufDecoder
 * Ported from my (sak0a) Python Project
 * github.com/sak0a/CSInspect-API
 */
import {
    analyzeInspectUrl,
    floatToBytes,
    INSPECT_BASE,
    EconItem,
    ItemRarity,
    processRarity,
    Sticker,
    WeaponType
} from "./base";
import {decodeMaskedData} from "./protobuf-decoder";

export class ProtoWriter {
    private buffer: number[] = [];

    writeVarint(value: number): void {
        while (value > 0x7F) {
            this.buffer.push((value & 0x7F) | 0x80);
            value >>>= 7;
        }
        this.buffer.push(value);
    }

    writeTag(fieldNumber: number, wireType: number): void {
        this.writeVarint((fieldNumber << 3) | wireType);
    }

    writeFloat(value: number): void {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setFloat32(0, value, true);
        for (let i = 0; i < 4; i++) {
            this.buffer.push(view.getUint8(i));
        }
    }

    writeString(value: string): void {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(value);
        this.writeVarint(bytes.length);
        this.buffer.push(...Array.from(bytes));
    }

    writeLengthDelimited(bytes: Uint8Array): void {
        this.writeVarint(bytes.length);
        this.buffer.push(...Array.from(bytes));
    }

    getBytes(): Uint8Array {
        return new Uint8Array(this.buffer);
    }

    static encodeSticker(sticker: Sticker): Uint8Array {
        const writer = new ProtoWriter();

        if (sticker === null) {
            return writer.getBytes();
        }
        // Write slot (field 1)
        writer.writeTag(1, 0);
        writer.writeVarint(sticker.slot);


        // Write sticker_id (field 2)
        writer.writeTag(2, 0);
        writer.writeVarint(sticker.sticker_id);


        // Write wear if present (field 3)
        if (typeof sticker.wear === 'number') {
            writer.writeTag(3, 5);
            writer.writeFloat(sticker.wear);
        }

        // Write scale if present (field 4)
        if (typeof sticker.scale === 'number') {
            writer.writeTag(4, 5);
            writer.writeFloat(sticker.scale);
        }

        // Write rotation if present (field 5)
        if (typeof sticker.rotation === 'number') {
            writer.writeTag(5, 5);
            writer.writeFloat(sticker.rotation);
        }

        // Write tint_id if present (field 6)
        if (typeof sticker.tint_id === 'number') {
            writer.writeTag(6, 0);
            writer.writeVarint(sticker.tint_id);
        }

        // Write offset_x if present (field 7)
        if (typeof sticker.offset_x === 'number') {
            writer.writeTag(7, 5);
            writer.writeFloat(sticker.offset_x);
        }

        // Write offset_y if present (field 8)
        if (typeof sticker.offset_y === 'number') {
            writer.writeTag(8, 5);
            writer.writeFloat(sticker.offset_y);
        }

        // Write offset_z if present (field 9)
        if (typeof sticker.offset_z === 'number') {
            writer.writeTag(9, 5);
            writer.writeFloat(sticker.offset_z);
        }

        // Write pattern if present (field 10)
        if (typeof sticker.pattern === 'number') {
            writer.writeTag(10, 0);
            writer.writeVarint(sticker.pattern);
        }

        return writer.getBytes();
    }

    static encodeItemData(item: EconItem): Uint8Array {
        const writer = new ProtoWriter();

        // Write required fields
        writer.writeTag(3, 0); // defindex
        writer.writeVarint(item.defindex);

        writer.writeTag(4, 0); // paintindex
        writer.writeVarint(item.paintindex);

        writer.writeTag(8, 0); // paintseed
        writer.writeVarint(item.paintseed);

        writer.writeTag(7, 0); // paintwear
        writer.writeVarint(floatToBytes(item.paintwear));

        // Write optional fields
        if (typeof item.rarity !== 'undefined') {
            writer.writeTag(5, 0);
            writer.writeVarint(processRarity(item.rarity));
        }

        if (typeof item.quality !== 'undefined') {
            writer.writeTag(6, 0);
            writer.writeVarint(item.quality);
        }

        if (typeof item.killeaterscoretype !== 'undefined') {
            writer.writeTag(9, 0);
            writer.writeVarint(item.killeaterscoretype);
        }

        if (typeof item.killeatervalue !== 'undefined') {
            writer.writeTag(10, 0);
            writer.writeVarint(item.killeatervalue);
        }

        if (item.customname) {
            writer.writeTag(11, 2);
            writer.writeString(item.customname);
        }

        // Write stickers (field 12)
        if (item.stickers && item.stickers.length > 0) {
            for (const sticker of item.stickers) {
                writer.writeTag(12, 2);
                const stickerBytes = this.encodeSticker(sticker);
                writer.writeLengthDelimited(stickerBytes);
            }
        }

        // Write keychains (field 20)
        if (item.keychains && item.keychains.length > 0) {
            for (const keychain of item.keychains) {
                writer.writeTag(20, 2);
                const keychainBytes = this.encodeSticker(keychain);
                writer.writeLengthDelimited(keychainBytes);
            }
        }

        return writer.getBytes();
    }

    static crc32(data: Uint8Array): number {
        let crc = -1;
        const table = new Int32Array(256);

        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
            }
            table[i] = c;
        }

        for (let i = 0; i < data.length; i++) {
            crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
        }
        return ~crc;
    }

    static createInspectUrl(item: EconItem): string {
        const protoData = this.encodeItemData(item);

        // Create buffer with null byte prefix
        const buffer = new Uint8Array(protoData.length + 5);
        buffer[0] = 0;
        buffer.set(protoData, 1);

        // Calculate checksum
        const crc = this.crc32(buffer.subarray(0, buffer.length - 4));
        const xoredCrc = (crc & 0xFFFF) ^ (protoData.length * crc);

        // Add checksum
        const view = new DataView(buffer.buffer);
        view.setUint32(buffer.length - 4, xoredCrc, false);

        // Convert to hex string
        const hexString = Array.from(buffer)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();

        return `${INSPECT_BASE}${hexString}`;
    }
}



// Test the fixed implementation
export function testCreateInspectUrl() {
    const url = createInspectUrl({
        defindex: WeaponType.M4A4,
        paintindex: 309,
        paintseed: 420,
        paintwear: 0.15,
        rarity: ItemRarity.COVERT,
        stickers: [
            {
                slot: 0,
                sticker_id: 5032,
                wear: 0.15,
                rotation: 0,
                offset_x: -0.00582524249330163,
                offset_y: -0.00582524249330163
            },
            {
                slot: 1,
                sticker_id: 76,
                wear: 0.1,
                offset_x: -0.4427184462547302,
                offset_y: -0.4427184462547302,
            },
            {
                slot: 2,
                sticker_id: 76,
                wear: 0,
                rotation: 0,
                offset_x: -0.05898058041930199,
                offset_y: -0.016747573390603065
            },
            {
                slot: 3,
                sticker_id: 60,
                wear: 0,
                rotation: 0,
                offset_x: 0.08810679614543915,
                offset_y: 0.1325242668390274
            }
        ],
        keychains: [{
            slot: 0,
            sticker_id: 20,
            pattern: 54,
            offset_x: 32.475727081298833,
            offset_y: 1.7475727796554565
        }]
    });

    console.log("Generated URL:", url);

    // Verify by decoding
    const urlInfo = analyzeInspectUrl(url);
    if (urlInfo?.hex_data) {
        const decoded = decodeMaskedData(urlInfo.hex_data);
        console.log("Decoded back:", JSON.stringify(decoded, null, 2));
    }
}