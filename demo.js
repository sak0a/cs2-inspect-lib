/**
 * Simple demo of the enhanced CS2 Inspect URL library
 */

const { CS2Inspect, WeaponType, ItemRarity, createInspectUrl, decodeInspectUrl } = require('./dist');

console.log('=== CS2 Inspect URL Library - Enhanced Version Demo ===\n');

// Example 1: Basic usage
console.log('1. Basic Item Creation:');
const basicItem = {
    defindex: WeaponType.AK_47,
    paintindex: 44, // Fire Serpent
    paintseed: 661,
    paintwear: 0.15
};

try {
    const url = createInspectUrl(basicItem);
    console.log('✓ Generated URL:', url.substring(0, 100) + '...');
    
    const decoded = decodeInspectUrl(url);
    console.log('✓ Decoded successfully');
    console.log('  - Weapon:', decoded.defindex);
    console.log('  - Paint:', decoded.paintindex);
    console.log('  - Seed:', decoded.paintseed);
    console.log('  - Wear:', decoded.paintwear);
} catch (error) {
    console.error('✗ Error:', error.message);
}

// Example 2: Complex item with new fields
console.log('\n2. Complex Item with New Fields:');
const complexItem = {
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
            highlight_reel: 1 // New field!
        }
    ],
    keychains: [
        {
            slot: 0,
            sticker_id: 20,
            pattern: 148,
            highlight_reel: 2 // New field!
        }
    ],
    style: 7, // New field!
    variations: [ // New field!
        {
            slot: 0,
            sticker_id: 100,
            pattern: 50,
            highlight_reel: 3
        }
    ],
    upgrade_level: 10 // New field!
};

try {
    const url = createInspectUrl(complexItem);
    console.log('✓ Generated complex URL:', url.substring(0, 100) + '...');
    
    const decoded = decodeInspectUrl(url);
    console.log('✓ Decoded successfully');
    console.log('  - Custom name:', decoded.customname);
    console.log('  - Stickers:', decoded.stickers?.length || 0);
    console.log('  - Keychains:', decoded.keychains?.length || 0);
    console.log('  - Variations:', decoded.variations?.length || 0);
    console.log('  - Style:', decoded.style);
    console.log('  - Upgrade level:', decoded.upgrade_level);
    console.log('  - Sticker highlight_reel:', decoded.stickers?.[0]?.highlight_reel);
} catch (error) {
    console.error('✗ Error:', error.message);
}

// Example 3: Using the main CS2Inspect class with validation
console.log('\n3. Validation and Error Handling:');
const cs2 = new CS2Inspect({ validateInput: true });

const invalidItem = {
    defindex: -1, // Invalid
    paintindex: 44,
    paintseed: 661,
    paintwear: 1.5 // Invalid (> 1.0)
};

try {
    cs2.createInspectUrl(invalidItem);
    console.log('✗ Should have failed validation');
} catch (error) {
    console.log('✓ Validation caught errors:');
    if (error.context && error.context.errors) {
        error.context.errors.forEach(err => console.log('  -', err));
    }
}

// Example 4: BigInt support
console.log('\n4. BigInt Support for Large Item IDs:');
const itemWithBigId = {
    itemid: BigInt('9876543210123456789'), // Large uint64
    defindex: WeaponType.KARAMBIT,
    paintindex: 44,
    paintseed: 661,
    paintwear: 0.15
};

try {
    const url = createInspectUrl(itemWithBigId);
    const decoded = decodeInspectUrl(url);
    console.log('✓ BigInt itemid preserved:', decoded.itemid);
    console.log('  - Type:', typeof decoded.itemid);
} catch (error) {
    console.error('✗ Error:', error.message);
}

// Example 5: URL Analysis
console.log('\n5. URL Analysis:');
try {
    const testUrl = createInspectUrl(basicItem);
    const analyzed = cs2.analyzeUrl(testUrl);
    console.log('✓ URL Analysis:');
    console.log('  - Type:', analyzed.url_type);
    console.log('  - Quoted:', analyzed.is_quoted);
    console.log('  - Data length:', analyzed.hex_data?.length || 0, 'characters');
} catch (error) {
    console.error('✗ Error:', error.message);
}

console.log('\n=== Demo Complete ===');
console.log('\nKey Features Demonstrated:');
console.log('✓ Complete protobuf support with all new CS2 fields');
console.log('✓ Input validation with detailed error messages');
console.log('✓ BigInt support for 64-bit integers');
console.log('✓ Comprehensive error handling');
console.log('✓ URL analysis and normalization');
console.log('✓ TypeScript support with full type definitions');

console.log('\nNew Fields Supported:');
console.log('✓ highlight_reel in stickers/keychains/variations');
console.log('✓ style field for item variations');
console.log('✓ variations array for style variations');
console.log('✓ upgrade_level for item upgrades');
console.log('✓ Proper uint64 support for itemid');
console.log('✓ Signed int32 support for entindex');
