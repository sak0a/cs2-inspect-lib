/**
 * CS2 Inspect URL handling and item builder for with ProtoBufWriter and ProtoBufDecoder
 * Ported from my (sak0a) Python Project
 * github.com/sak0a/CSInspect-API
 */

import "./protobuf-writer";
import {ProtoReader} from "./protobuf-decoder";
import {ProtoWriter} from "./protobuf-writer";

export enum ItemRarity {
    STOCK = 0,
    CONSUMER_GRADE = 1,
    INDUSTRIAL_GRADE = 2,
    MIL_SPEC_GRADE = 3,
    RESTRICTED = 4,
    CLASSIFIED = 5,
    COVERT = 6,
    CONTRABAND = 7,
    GOLD = 99
}

export enum WeaponType {
    // Pistols
    DESERT_EAGLE = 1,
    DUAL_BERETTAS = 2,
    FIVE_SEVEN = 3,
    GLOCK_18 = 4,
    TEC_9 = 30,
    P2000 = 32,
    P250 = 36,
    USP_S = 61,
    CZ75_AUTO = 63,
    R8_REVOLVER = 64,

    // Rifles
    AK_47 = 7,
    AUG = 8,
    AWP = 9,
    FAMAS = 10,
    G3SG1 = 11,
    GALIL_AR = 13,
    M4A4 = 16,
    SCAR_20 = 38,
    SG_553 = 39,
    SSG_08 = 40,
    M4A1_S = 60,

    // SMGs
    MAC_10 = 17,
    MP5_SD = 23,
    MP7 = 33,
    MP9 = 34,
    P90 = 19,
    PP_BIZON = 26,
    UMP_45 = 24,

    // Heavy
    MAG_7 = 27,
    NOVA = 35,
    SAWED_OFF = 29,
    XM1014 = 25,
    M249 = 14,
    NEGEV = 28,

    // Default Knives
    KNIFE_CT = 42,
    KNIFE_T = 59,

    // Special Knives
    BAYONET = 500,
    BOWIE = 514,
    BUTTERFLY = 515,
    CLASSIC = 503,
    FALCHION = 512,
    FLIP = 505,
    GUT = 506,
    HUNTSMAN = 509,
    KARAMBIT = 507,
    M9_BAYONET = 508,
    NAVAJA = 520,
    NOMAD = 521,
    PARACORD = 517,
    SHADOW_DAGGERS = 516,
    SKELETON = 525,
    STILETTO = 522,
    SURVIVAL = 518,
    TALON = 523,
    URSUS = 519,

    // Special Items
    GLOVES_CT = 5028,
    GLOVES_T = 5029,
    GLOVES_BLOODHOUND = 5027,
    GLOVES_SPORT = 5030,
    GLOVES_DRIVER = 5031,
    GLOVES_HAND_WRAPS = 5032,
    GLOVES_MOTO = 5033,
    GLOVES_SPECIALIST = 5034,
    GLOVES_HYDRA = 5035,
    ZEUS = 31
}

export interface Sticker {
    slot: number;
    sticker_id: number;
    wear?: number;
    scale?: number;
    rotation?: number;
    tint_id?: number;
    offset_x?: number;
    offset_y?: number;
    offset_z?: number;
    pattern?: number;
}

export interface AnalyzedInspectURL {
    original_url: string;
    cleaned_url: string;
    url_type: 'masked' | 'unmasked';
    is_quoted: boolean;
    market_id?: string;
    owner_id?: string;
    asset_id?: string;
    class_id?: string;
    hex_data?: string;
}

export interface BaseItem {
    weapon: WeaponType | number;
    paint_id: number;
    pattern: number;
    wear: number;
    name?: string;
    stattrak?: boolean;
    stattrak_count?: number;
    rarity?: ItemRarity | number | string;
    stickers?: Sticker[];
    keychain?: Sticker;
}

export interface EconItem {
    defindex: number | WeaponType;
    paintindex: number;
    paintseed: number;
    paintwear: number;
    accountid?: number;
    itemid?: number;
    rarity?: ItemRarity | number | string;
    quality?: number;
    killeaterscoretype?: number;
    killeatervalue?: number;
    customname?: string;
    inventory?: number;
    origin?: number;
    questid?: number;
    dropreason?: number;
    musicindex?: number;
    entindex?: number;
    petindex?: number;
    stickers?: Sticker[];
    keychains?: Sticker[];
}

export const INSPECT_BASE = "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20";


export function processRarity(rarityValue: ItemRarity | number | string): number {
    if (typeof rarityValue === 'number') {
        // Validate that the number is a valid rarity value
        if (Object.values(ItemRarity).includes(rarityValue)) {
            return rarityValue;
        }
        throw new Error(`Invalid rarity value: ${rarityValue}`);
    } else if (typeof rarityValue === 'string') {
        // Try to match it to the enum
        const enumKey = rarityValue.toUpperCase();
        if (enumKey in ItemRarity) {
            return ItemRarity[enumKey as keyof typeof ItemRarity];
        }
        return ItemRarity.STOCK;
    }
    return rarityValue;
}

export function floatToBytes(floatValue: number): number {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setFloat32(0, floatValue, false); // false for big-endian
    return view.getUint32(0, false);
}

export function bytesToFloat(intValue: number): number {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setUint32(0, intValue, false); // false for big-endian
    return view.getFloat32(0, false);
}

export function hexToBytes(hexStr: string): Uint8Array {
    const bytes = new Uint8Array(Math.ceil(hexStr.length / 2));
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hexStr.substr(i * 2, 2), 16);
    }
    return bytes;
}

// Main URL handling functions
export function analyzeInspectUrl(url: string): AnalyzedInspectURL {
    // Clean and normalize the URL
    let cleanedUrl = url.trim();

    // Handle various URL formats
    if (!cleanedUrl.startsWith("steam://")) {
        const previewVariants = [
            "csgo_econ_action_preview ",
            "csgo_econ_action_preview%20",
            "+csgo_econ_action_preview ",
            "+csgo_econ_action_preview%20"
        ];

        for (const variant of previewVariants) {
            if (cleanedUrl.startsWith(variant)) {
                cleanedUrl = INSPECT_BASE + cleanedUrl.slice(variant.length);
                break;
            }
        }

        // Handle raw data
        if (!cleanedUrl.startsWith("steam://")) {
            if (cleanedUrl.startsWith("M") || cleanedUrl.startsWith("S") || /^[0-9A-F]+$/.test(cleanedUrl)) {
                cleanedUrl = INSPECT_BASE + cleanedUrl;
            }
        }
    }

    // Check if URL is quoted
    const isQuoted = cleanedUrl.includes("%20");

    // Normalize to quoted format
    if (!isQuoted) {
        cleanedUrl = cleanedUrl.replace(/ /g, "%20");
    }

    // Extract the payload
    const parts = cleanedUrl.split("csgo_econ_action_preview%20");
    if (parts.length < 2) return null;
    const payload = parts[1];

    // Pattern for unmasked URLs
    const unmaskedPattern = /^([SM])(\d+)A(\d+)D(\d+)$/;

    // Pattern for masked URLs
    const maskedPattern = /^[0-9A-F]+$/;

    // Check for unmasked format
    const unmaskedMatch = payload.match(unmaskedPattern);
    if (unmaskedMatch) {
        const [, typeChar, idValue, assetId, classId] = unmaskedMatch;
        return {
            original_url: url,
            cleaned_url: cleanedUrl,
            url_type: 'unmasked',
            is_quoted: isQuoted,
            market_id: typeChar === 'M' ? idValue : undefined,
            owner_id: typeChar === 'S' ? idValue : undefined,
            asset_id: assetId,
            class_id: classId
        };
    }

    // Check for masked format
    const maskedMatch = payload.match(maskedPattern);
    if (maskedMatch) {
        return {
            original_url: url,
            cleaned_url: cleanedUrl,
            url_type: 'masked',
            is_quoted: isQuoted,
            hex_data: payload
        };
    }

    return null;
}

export function formatInspectUrl(urlInfo: AnalyzedInspectURL, quote: boolean = true, includeSteamPrefix: boolean = true): string {
    const separator = quote ? "%20" : " ";
    const prefix = includeSteamPrefix ? INSPECT_BASE : "+csgo_econ_action_preview";
    const base = prefix + separator;

    if (urlInfo.url_type === 'masked') {
        return base + urlInfo.hex_data;
    } else {
        const typeChar = urlInfo.market_id ? 'M' : 'S';
        const idValue = urlInfo.market_id || urlInfo.owner_id;
        return `${base}${typeChar}${idValue}A${urlInfo.asset_id}D${urlInfo.class_id}`;
    }
}

export function generateCommands(itemInfo: EconItem): [string, string | null, string | null] {
    // Base command parts
    const parts = [
        itemInfo.defindex.toString(),
        itemInfo.paintindex.toString(),
        itemInfo.paintseed.toString(),
        itemInfo.paintwear.toFixed(4)
    ];

    // Add stickers
    if (itemInfo.stickers) {
        const sortedStickers = [...itemInfo.stickers].sort((a, b) => a.slot - b.slot);
        for (const sticker of sortedStickers) {
            parts.push(sticker.sticker_id.toString(), sticker.wear?.toFixed(1) || "0.0");
        }
    }

    // Add charm info
    if (itemInfo.keychains && itemInfo.keychains.length > 0) {
        parts.push("0", "0"); // Separator
        parts.push(
            itemInfo.keychains[0].sticker_id.toString(),
            (itemInfo.keychains[0].pattern || 0).toString()
        );
    }

    const genCmd = `!g ${parts.join(" ")}`;

    // Generate sticker command if needed
    let stickerCmd: string | null = null;
    if (itemInfo.stickers?.some(s =>
        s.scale !== 1.0 || s.rotation !== 0.0 ||
        s.offset_x !== 0.0 || s.offset_y !== 0.0 ||
        s.offset_z !== 0.0
    )) {
        const stickerParts = itemInfo.stickers
            .filter(s =>
                s.scale !== 1.0 || s.rotation !== 0.0 ||
                s.offset_x !== 0.0 || s.offset_y !== 0.0 ||
                s.offset_z !== 0.0
            )
            .map(s =>
                `${s.slot} ${s.scale?.toFixed(2) || "1.00"} ${s.rotation?.toFixed(2) || "0.00"} ` +
                `${s.offset_x?.toFixed(2) || "0.00"} ${s.offset_y?.toFixed(2) || "0.00"} ${s.offset_z?.toFixed(2) || "0.00"}`
            );

        if (stickerParts.length > 0) {
            stickerCmd = `!sticker ${stickerParts.join(" ")}`;
        }
    }

    // Generate charm command if needed
    let charmCmd: string | null = null;
    if (itemInfo.keychains?.[0] && (
        itemInfo.keychains[0].scale !== 1.0 ||
        itemInfo.keychains[0].rotation !== 0.0 ||
        itemInfo.keychains[0].offset_x !== 0.0 ||
        itemInfo.keychains[0].offset_y !== 0.0 ||
        itemInfo.keychains[0].offset_z !== 0.0
    )) {
        const charm = itemInfo.keychains[0];
        charmCmd = `!charm ${charm.scale?.toFixed(2) || "1.00"} ${charm.rotation?.toFixed(2) || "0.00"} ` +
            `${charm.offset_x?.toFixed(2) || "0.00"} ${charm.offset_y?.toFixed(2) || "0.00"} ` +
            `${charm.offset_z?.toFixed(2) || "0.00"}`;
    }

    return [genCmd, stickerCmd, charmCmd];
}

export function testAnalyzeInspectUrl() {
    console.log("\nTesting analyzeInspectUrl:");

    const urls = [
        // Full URLs
        "steam://rungame/730/76561202255233023/+csgo_econ_action_preview S123456789A123456D123456",
        "csgo_econ_action_preview M123456789A123456D123456",
        "+csgo_econ_action_preview M123456789A123456D123456",
        "M123456789A123456D123456",

        // Masked formats
        "steam://rungame/730/76561202255233023/+csgo_econ_action_preview 00180720A106280138004001BFB3EDB2",
        "csgo_econ_action_preview 00180720A106280138004001BFB3EDB2",
        "+csgo_econ_action_preview 00180720A106280138004001BFB3EDB2",
        "00180720A106280138004001BFB3EDB2"
    ];

    for (const url of urls) {
        const result = analyzeInspectUrl(url);
        if (result) {
            console.log("\nOriginal URL:", result.original_url);
            console.log("Type:", result.url_type, "| Quoted:", result.is_quoted);
            if (result.url_type === 'unmasked') {
                console.log("Market ID:", result.market_id);
                console.log("Owner ID:", result.owner_id);
                console.log("Asset ID:", result.asset_id);
                console.log("Class ID:", result.class_id);
            } else {
                console.log("HEX data:", result.hex_data);
            }
            console.log("Formatted URL (full):", formatInspectUrl(result, true, true));
            console.log("Formatted URL (short):", formatInspectUrl(result, true, false));
        }
    }
}

export function testDecodeMaskedInspectURLS() {
    const items = [
        {
            description: "AWP | Desert Hydra - Pattern: 148, Wear: 0,13853 - 4 Souvenir Sticker",
            url: "csgo_econ_action_preview 00180920B3062801388EB6B7F0034094016219080010BD271D000000002D000000003D0000000045000000006219080110A9271D000000002D000000003D00000000450000000062190802109C0D1D000000002D000000003D0000000045000000006219080310E1261D000000002D000000003D0000000045000000007928654E",
        }
    ]
    items.forEach(item => {
        console.log("}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}")
        console.log(" ")
        console.log("Description: ", item.description)
        console.log("URL: " + item.url)
        const analyzedURL: AnalyzedInspectURL = analyzeInspectUrl(item.url)
        const decodedItem: EconItem = ProtoReader.decodeMaskedData(analyzedURL.hex_data)
        console.log(decodedItem);
    })
}

function testEncodeMaskedInspectURLS() {
    const items = [
        {
            description: "AWP | Desert Hydra - Pattern: 148, Wear: 0,13853 - 4 Souvenir Sticker",
            item: {
                defindex: WeaponType.AWP,
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
                    }
                ],
                keychains: [
                    {
                        slot: 0,
                        sticker_id: 20,
                        pattern: 148,
                        offset_x: 0.08810679614543915,
                        offset_y: 0.1325242668390274
                    }
                ]
            }
        }
    ]
    items.forEach(i => {
        console.log("}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}")
        console.log(" ")
        console.log("Description: ", i.description)
        console.log("Item: ", i.item)
        const generatedURL = ProtoWriter.createInspectUrl(i.item)
        console.log("Generated URL: ", generatedURL)
        const analyzedURL = analyzeInspectUrl(generatedURL)
        console.log("Analyzed URL: ", analyzedURL)
        console.log("Decoded Item: ", ProtoReader.decodeMaskedData(analyzedURL.hex_data))
        console.log("}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}")
    })
}

export function runAllTests() {
    testDecodeMaskedInspectURLS()
    testEncodeMaskedInspectURLS()
}
runAllTests()