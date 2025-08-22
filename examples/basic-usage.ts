/**
 * Basic usage examples for CS2 Inspect URL library
 */

import { 
    CS2Inspect, 
    WeaponType, 
    ItemRarity, 
    EconItem,
    createInspectUrl,
    decodeInspectUrl,
    validateItem
} from '../src';

// Example 1: Basic item creation
console.log('=== Example 1: Basic Item Creation ===');

const basicItem: EconItem = {
    defindex: WeaponType.AK_47,
    paintindex: 44, // Fire Serpent
    paintseed: 661,
    paintwear: 0.15
};

const basicUrl = createInspectUrl(basicItem);
console.log('Generated URL:', basicUrl);

const decodedBasic = decodeInspectUrl(basicUrl);
console.log('Decoded item:', decodedBasic);

// Example 2: Complex item with stickers
console.log('\n=== Example 2: Complex Item with Stickers ===');

const complexItem: EconItem = {
    defindex: WeaponType.AWP,
    paintindex: 309, // Dragon Lore
    paintseed: 420,
    paintwear: 0.15,
    rarity: ItemRarity.COVERT,
    customname: 'Dragon Lore ★',
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
            highlight_reel: 1 // New field!
        },
        {
            slot: 1,
            sticker_id: 76,
            wear: 0.0,
            scale: 0.8,
            rotation: -30.0,
            highlight_reel: 2
        }
    ],
    keychains: [
        {
            slot: 0,
            sticker_id: 20,
            pattern: 148,
            highlight_reel: 3
        }
    ],
    style: 7, // New field!
    variations: [ // New field!
        {
            slot: 0,
            sticker_id: 100,
            pattern: 50,
            highlight_reel: 4
        }
    ],
    upgrade_level: 10 // New field!
};

const complexUrl = createInspectUrl(complexItem);
console.log('Complex URL:', complexUrl);

const decodedComplex = decodeInspectUrl(complexUrl);
console.log('Decoded complex item:', JSON.stringify(decodedComplex, null, 2));

// Example 3: Using the main CS2Inspect class
console.log('\n=== Example 3: Using CS2Inspect Class ===');

const cs2 = new CS2Inspect({
    validateInput: true,
    enableLogging: true
});

// Validate an item before encoding
const validation = cs2.validateItem(complexItem);
console.log('Validation result:', validation);

// Analyze a URL
const analyzed = cs2.analyzeUrl(complexUrl);
console.log('URL analysis:', analyzed);

// Check if URL is valid
console.log('Is valid URL:', cs2.isValidUrl(complexUrl));

// Example 4: Error handling
console.log('\n=== Example 4: Error Handling ===');

try {
    const invalidItem = {
        defindex: -1, // Invalid
        paintindex: 44,
        paintseed: 661,
        paintwear: 1.5 // Invalid (> 1.0)
    };
    
    const url = cs2.createInspectUrl(invalidItem);
} catch (error) {
    console.log('Caught validation error:', error.message);
    if (error.context) {
        console.log('Error context:', error.context);
    }
}

// Example 5: Working with BigInt itemid
console.log('\n=== Example 5: BigInt Support ===');

const itemWithBigId: EconItem = {
    itemid: BigInt('9876543210123456789'), // Large uint64
    defindex: WeaponType.KARAMBIT,
    paintindex: 44,
    paintseed: 661,
    paintwear: 0.15
};

const bigIdUrl = createInspectUrl(itemWithBigId);
console.log('URL with BigInt itemid:', bigIdUrl);

const decodedBigId = decodeInspectUrl(bigIdUrl);
console.log('Decoded itemid (BigInt):', decodedBigId.itemid);
console.log('Type of itemid:', typeof decodedBigId.itemid);

// Example 6: Signed integers (entindex)
console.log('\n=== Example 6: Signed Integer Support ===');

const itemWithNegativeEntindex: EconItem = {
    defindex: WeaponType.AK_47,
    paintindex: 44,
    paintseed: 661,
    paintwear: 0.15,
    entindex: -1 // Negative value
};

const negativeUrl = createInspectUrl(itemWithNegativeEntindex);
const decodedNegative = decodeInspectUrl(negativeUrl);
console.log('Decoded entindex (negative):', decodedNegative.entindex);

// Example 7: Unicode custom names
console.log('\n=== Example 7: Unicode Support ===');

const unicodeItem: EconItem = {
    defindex: WeaponType.AK_47,
    paintindex: 44,
    paintseed: 661,
    paintwear: 0.15,
    customname: '🔥 Fire Serpent 🐍 ★'
};

const unicodeUrl = createInspectUrl(unicodeItem);
const decodedUnicode = decodeInspectUrl(unicodeUrl);
console.log('Unicode custom name:', decodedUnicode.customname);

// Example 8: Configuration
console.log('\n=== Example 8: Configuration ===');

const strictCs2 = new CS2Inspect({
    validateInput: true,
    maxCustomNameLength: 20,
    maxUrlLength: 1000,
    enableLogging: false
});

try {
    const longNameItem: EconItem = {
        defindex: WeaponType.AK_47,
        paintindex: 44,
        paintseed: 661,
        paintwear: 0.15,
        customname: 'This name is way too long for the configured limit'
    };
    
    strictCs2.createInspectUrl(longNameItem);
} catch (error) {
    console.log('Caught configuration-based error:', error.message);
}

// Update configuration
strictCs2.updateConfig({ maxCustomNameLength: 100 });
console.log('Updated config:', strictCs2.getConfig());

// Example 9: URL normalization
console.log('\n=== Example 9: URL Normalization ===');

const messyUrl = 'csgo_econ_action_preview M123456789A987654321D456789123';
const normalizedUrl = cs2.normalizeUrl(messyUrl);
console.log('Original messy URL:', messyUrl);
console.log('Normalized URL:', normalizedUrl);

// Example 10: URL information
console.log('\n=== Example 10: URL Information ===');

const urlInfo = cs2.getUrlInfo(complexUrl);
console.log('URL info:', urlInfo);

console.log('\n=== All Examples Complete ===');
