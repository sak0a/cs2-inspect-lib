/**
 * CS2 Inspect URL handling and item builder for with ProtoBufWriter and ProtoBufDecoder
 * Ported from my (sak0a) Python Project
 * github.com/sak0a/CSInspect-API
 */
import {bytesToFloat, hexToBytes} from "./base";
import {analyzeInspectUrl} from "./base";
import {EconItem, Sticker} from "./base";

export class ProtoReader {
    private pos: number = 0;
    private view: DataView;

    constructor(private buffer: Uint8Array) {
        this.view = new DataView(buffer.buffer);
    }

    readVarint(): number {
        let result = 0;
        let shift = 0;

        while (this.pos < this.buffer.length) {
            const byte = this.buffer[this.pos++];
            result |= (byte & 0x7F) << shift;
            if ((byte & 0x80) === 0) break;
            shift += 7;
        }

        return result >>> 0;
    }

    readFloat(): number {
        const value = this.view.getFloat32(this.pos, true);
        this.pos += 4;
        return value;
    }

    readString(): string {
        const length = this.readVarint();
        const value = new TextDecoder().decode(this.buffer.slice(this.pos, this.pos + length));
        this.pos += length;
        return value;
    }

    readTag(): [number, number] {
        const tag = this.readVarint();
        const fieldNumber = tag >>> 3;
        const wireType = tag & 0x7;
        return [fieldNumber, wireType];
    }

    skipField(wireType: number): void {
        switch (wireType) {
            case 0: // varint
                this.readVarint();
                break;
            case 1: // 64-bit
                this.pos += 8;
                break;
            case 2: // length-delimited
                const length = this.readVarint();
                this.pos += length;
                break;
            case 5: // 32-bit
                this.pos += 4;
                break;
        }
    }

    hasMore(): boolean {
        return this.pos < this.buffer.length;
    }

    readBytes(): Uint8Array {
        const length = this.readVarint();
        const bytes = this.buffer.slice(this.pos, this.pos + length);
        this.pos += length;
        return bytes;
    }

    // Get current position for debugging
    getPosition(): number {
        return this.pos;
    }

    static decodeSticker(reader: ProtoReader): Sticker {
        const sticker: Sticker = {
            slot: 0,
            sticker_id: 0
        };

        while (reader.hasMore()) {
            const [fieldNumber, wireType] = reader.readTag();

            switch (fieldNumber) {
                case 1: // slot
                    sticker.slot = reader.readVarint();
                    break;
                case 2: // sticker_id
                    sticker.sticker_id = reader.readVarint();
                    break;
                case 3: // wear
                    sticker.wear = reader.readFloat();
                    break;
                case 4: // scale
                    sticker.scale = reader.readFloat();
                    break;
                case 5: // rotation
                    sticker.rotation = reader.readFloat();
                    break;
                case 6: // tint_id
                    sticker.tint_id = reader.readVarint();
                    break;
                case 7: // offset_x
                    sticker.offset_x = reader.readFloat();
                    break;
                case 8: // offset_y
                    sticker.offset_y = reader.readFloat();
                    break;
                case 9: // offset_z
                    sticker.offset_z = reader.readFloat();
                    break;
                case 10: // pattern
                    sticker.pattern = reader.readVarint();
                    break;
                default:
                    reader.skipField(wireType);
            }
        }

        return sticker;
    }

    static decodeMaskedData(hexData: string): EconItem {
        // Remove prefix null byte and CRC checksum
        if (hexData.startsWith('00')) {
            hexData = hexData.slice(2);
        }
        hexData = hexData.slice(0, -8); // Remove last 4 bytes (CRC)

        const bytes = hexToBytes(hexData);
        const reader = new ProtoReader(bytes);

        const decoded: EconItem = {
            defindex: 0,
            paintindex: 0,
            paintseed: 0,
            paintwear: 0,
            stickers: [],
            keychains: []
        };

        while (reader.hasMore()) {
            const [fieldNumber, wireType] = reader.readTag();

            switch (fieldNumber) {
                case 1: // accountid
                    decoded.accountid = reader.readVarint();
                    break;
                case 2: // itemid
                    decoded.itemid = reader.readVarint();
                    break;
                case 3: // defindex
                    decoded.defindex = reader.readVarint();
                    break;
                case 4: // paintindex
                    decoded.paintindex = reader.readVarint();
                    break;
                case 5: // rarity
                    decoded.rarity = reader.readVarint();
                    break;
                case 6: // quality
                    decoded.quality = reader.readVarint();
                    break;
                case 7: // paintwear
                    const wearBytes = reader.readVarint();
                    decoded.paintwear = bytesToFloat(wearBytes);
                    break;
                case 8: // paintseed
                    decoded.paintseed = reader.readVarint();
                    break;
                case 9: // killeaterscoretype
                    decoded.killeaterscoretype = reader.readVarint();
                    break;
                case 10: // killeatervalue
                    decoded.killeatervalue = reader.readVarint();
                    break;
                case 11: // customname
                    decoded.customname = reader.readString();
                    break;
                case 12: // stickers
                    const stickerBytes = reader.readBytes();
                    const stickerReader = new ProtoReader(stickerBytes);
                    const sticker = this.decodeSticker(stickerReader);
                    decoded.stickers = decoded.stickers || [];
                    decoded.stickers.push(sticker);
                    break;
                case 13: // inventory
                    decoded.inventory = reader.readVarint();
                    break;
                case 14: // origin
                    decoded.origin = reader.readVarint();
                    break;
                case 15: // questid
                    decoded.questid = reader.readVarint();
                    break;
                case 16: // dropreason
                    decoded.dropreason = reader.readVarint();
                    break;
                case 17: // musicindex
                    decoded.musicindex = reader.readVarint();
                    break;
                case 18: // entindex
                    decoded.entindex = reader.readVarint();
                    break;
                case 19: // petindex
                    decoded.petindex = reader.readVarint();
                    break;
                case 20: // keychains
                    const keychainBytes = reader.readBytes();
                    const keychainReader = new ProtoReader(keychainBytes);
                    const keychain = this.decodeSticker(keychainReader);
                    decoded.keychains = decoded.keychains || [];
                    decoded.keychains.push(keychain);
                    break;
                default:
                    reader.skipField(wireType);
            }
        }

        return decoded;
    }
}




export function testDecodeMaskedData() {
    let link = "csgo_econ_action_preview 00183C209909280138A9B8BDEC034020480050B2035A064A414D4F494E62180800103C1D000000002D000000003DADE1BEBB4542290FBB62180801104C1D000000002D000000003DFEABE2BE4542290FBD62180802104C1D000000002D000000003D9F9571BD45353289BC62180803103C1D000000002D000000003D5671B43D4571B4073E62180803103C1D000000002D000000003D7E56C63D45AE36863DA20115080010143D25E701424577B0DF3F4D000000005036813580F3"
    link = "dsdds"
    const urlInfo = analyzeInspectUrl(link);
    if (urlInfo?.hex_data) {
        const decoded = ProtoReader.decodeMaskedData(urlInfo.hex_data);
        console.log("Decoded item:", JSON.stringify(decoded, null, 2));
    }
}