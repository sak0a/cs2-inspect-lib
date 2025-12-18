import { WeaponPaint } from "./weapon-paints";
/**
 * Enhanced TypeScript types for CS2 Inspect URL library
 */

/**
 * Item rarity levels in CS2
 */
export enum ItemRarity {
    /** Stock/Default items */
    STOCK = 0,
    /** Consumer Grade (White) */
    CONSUMER_GRADE = 1,
    /** Industrial Grade (Light Blue) */
    INDUSTRIAL_GRADE = 2,
    /** Mil-Spec Grade (Blue) */
    MIL_SPEC_GRADE = 3,
    /** Restricted (Purple) */
    RESTRICTED = 4,
    /** Classified (Pink) */
    CLASSIFIED = 5,
    /** Covert (Red) */
    COVERT = 6,
    /** Contraband (Gold) */
    CONTRABAND = 7,
    /** Gold (Special) */
    GOLD = 99
}

/**
 * CS2 weapon definition indices
 */
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

/**
 * Sticker/Keychain/Variation data structure
 */
export interface Sticker {
    /** Sticker slot position (0-4) */
    slot: number;
    /** Sticker ID from game files */
    sticker_id: number;
    /** Wear value (0.0-1.0) */
    wear?: number;
    /** Scale multiplier (typically 0.1-2.0) */
    scale?: number;
    /** Rotation in degrees (-180 to 180) */
    rotation?: number;
    /** Tint/color ID */
    tint_id?: number;
    /** X-axis offset */
    offset_x?: number;
    /** Y-axis offset */
    offset_y?: number;
    /** Z-axis offset */
    offset_z?: number;
    /** Pattern ID */
    pattern?: number;
    /** Highlight reel ID */
    highlight_reel?: number;
    /** Wrapped sticker ID */
    wrapped_sticker?: number;
}

/**
 * Complete CS2 item data structure matching CEconItemPreviewDataBlock
 */
export interface EconItem {
    /** Steam account ID */
    accountid?: number;
    /** Item ID (uint64) */
    itemid?: number | bigint;
    /** Weapon definition index */
    defindex: number | WeaponType;
    /** Paint/skin index */
    paintindex: number | WeaponPaint;
    /** Item rarity */
    rarity?: ItemRarity | number;
    /** Item quality */
    quality?: number;
    /** Paint wear value (0.0-1.0) */
    paintwear: number;
    /** Paint seed/pattern */
    paintseed: number;
    /** StatTrak™ kill eater score type */
    killeaterscoretype?: number;
    /** StatTrak™ kill count */
    killeatervalue?: number;
    /** Custom name tag */
    customname?: string;
    /** Applied stickers */
    stickers?: Sticker[];
    /** Inventory position */
    inventory?: number;
    /** Item origin */
    origin?: number;
    /** Quest ID */
    questid?: number;
    /** Drop reason */
    dropreason?: number;
    /** Music kit index */
    musicindex?: number;
    /** Entity index (signed int32) */
    entindex?: number;
    /** Pet index */
    petindex?: number;
    /** Keychains/charms */
    keychains?: Sticker[];
    /** Style variation */
    style?: number;
    /** Style variations */
    variations?: Sticker[];
    /** Upgrade level */
    upgrade_level?: number;
}

/**
 * Analyzed inspect URL structure
 */
export interface AnalyzedInspectURL {
    /** Original input URL */
    original_url: string;
    /** Cleaned/normalized URL */
    cleaned_url: string;
    /** URL type classification */
    url_type: 'masked' | 'unmasked';
    /** Whether URL uses %20 encoding */
    is_quoted: boolean;
    /** Market listing ID (for unmasked URLs) */
    market_id?: string;
    /** Steam user ID (for unmasked URLs) */
    owner_id?: string;
    /** Asset ID (for unmasked URLs) */
    asset_id?: string;
    /** Class ID (for unmasked URLs) */
    class_id?: string;
    /** Hex-encoded protobuf data (for masked URLs) */
    hex_data?: string;
}

/**
 * Validation result structure
 */
export interface ValidationResult {
    /** Whether validation passed */
    valid: boolean;
    /** Array of validation error messages */
    errors: string[];
    /** Array of validation warnings */
    warnings?: string[];
}

/**
 * Steam client configuration options
 */
export interface SteamClientConfig {
    /** Steam username for authentication */
    username?: string;
    /** Steam password for authentication */
    password?: string;
    /** Steam API key (optional, for enhanced functionality) */
    apiKey?: string;
    /** Rate limiting delay between requests in milliseconds (default: 1500) */
    rateLimitDelay?: number;
    /** Maximum queue size for inspect requests (default: 100) */
    maxQueueSize?: number;
    /** Request timeout in milliseconds (default: 10000) */
    requestTimeout?: number;
    /** Queue timeout in milliseconds (default: 30000) */
    queueTimeout?: number;
    /** Enable Steam client (default: false) */
    enabled?: boolean;
    /** Enable debug logging (default: false) */
    enableLogging?: boolean;
}

/**
 * Library configuration options
 */
export interface CS2InspectConfig {
    /** Enable input validation (default: true) */
    validateInput?: boolean;
    /** Maximum allowed URL length (default: 2048) */
    maxUrlLength?: number;
    /** Maximum allowed custom name length (default: 100) */
    maxCustomNameLength?: number;
    /** Enable debug logging (default: false) */
    enableLogging?: boolean;
    /** Steam client configuration for unmasked URL support */
    steamClient?: SteamClientConfig;
}

/**
 * Default Steam client configuration
 */
export const DEFAULT_STEAM_CONFIG: Required<SteamClientConfig> = {
    username: '',
    password: '',
    apiKey: '',
    rateLimitDelay: 1500,
    maxQueueSize: 100,
    requestTimeout: 10000,
    queueTimeout: 30000,
    enabled: false,
    enableLogging: false
};

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: Required<CS2InspectConfig> = {
    validateInput: true,
    maxUrlLength: 2048,
    maxCustomNameLength: 100,
    enableLogging: false,
    steamClient: DEFAULT_STEAM_CONFIG
};

/**
 * Type guard to check if a value is a valid WeaponType
 */
export function isWeaponType(value: any): value is WeaponType {
    return typeof value === 'number' && Object.values(WeaponType).includes(value);
}

/**
 * Type guard to check if a value is a valid ItemRarity
 */
export function isItemRarity(value: any): value is ItemRarity {
    return typeof value === 'number' && Object.values(ItemRarity).includes(value);
}

/**
 * Steam client connection status
 */
export enum SteamClientStatus {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    READY = 'ready',
    ERROR = 'error'
}

/**
 * Steam inspect queue item
 */
export interface SteamInspectQueueItem {
    /** Analyzed inspect URL information */
    inspectData: AnalyzedInspectURL;
    /** Promise resolve function */
    resolve: (value: any) => void;
    /** Promise reject function */
    reject: (reason?: any) => void;
    /** Timestamp when item was added to queue */
    timestamp: number;
}

/**
 * Steam client events
 */
export interface SteamClientEvents {
    ready: () => void;
    disconnected: (reason?: any) => void;
    error: (error: { type: string; error: Error }) => void;
    serverConnectionStatus: (status: any) => void;
}

/**
 * Steam inspect result with additional metadata
 */
export interface SteamInspectResult extends EconItem {
    /** Original inspect URL */
    inspectUrl: string;
    /** Queue status information */
    queueStatus: {
        length: number;
    };
    /** Steam-specific metadata */
    steamMetadata?: {
        /** Time taken to fetch from Steam */
        fetchTime?: number;
    };
}

/**
 * Type guard to check if a value is a valid Sticker
 */
export function isValidSticker(value: any): value is Sticker {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof value.slot === 'number' &&
        typeof value.sticker_id === 'number'
    );
}
