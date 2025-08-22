// Simple test to verify the protobuf implementation works
const { ProtoReader } = require('./protobuf-decoder.js');
const { ProtoWriter } = require('./protobuf-writer.js');
const { analyzeInspectUrl } = require('./base.js');

// Test data with the new fields
const testItem = {
    defindex: 9, // AWP
    paintindex: 309,
    paintseed: 420,
    paintwear: 0.15,
    rarity: 6,
    stickers: [
        {
            slot: 0,
            sticker_id: 5032,
            wear: 0.15,
            scale: 1.0,
            rotation: 0,
            offset_x: -0.00582524249330163,
            offset_y: -0.00582524249330163,
            offset_z: 0,
            pattern: 0,
            highlight_reel: 1 // New field
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
    ],
    style: 5, // New field
    variations: [ // New field
        {
            slot: 0,
            sticker_id: 100,
            pattern: 50
        }
    ],
    upgrade_level: 3 // New field
};

console.log("Testing updated protobuf implementation...");
console.log("Original item:", JSON.stringify(testItem, null, 2));

try {
    // Test encoding
    const url = ProtoWriter.createInspectUrl(testItem);
    console.log("\nGenerated URL:", url);

    // Test decoding
    const analyzedURL = analyzeInspectUrl(url);
    if (analyzedURL?.hex_data) {
        const decoded = ProtoReader.decodeMaskedData(analyzedURL.hex_data);
        console.log("\nDecoded item:", JSON.stringify(decoded, null, 2));
        
        // Verify new fields are preserved
        console.log("\nVerifying new fields:");
        console.log("- highlight_reel in sticker:", decoded.stickers?.[0]?.highlight_reel);
        console.log("- style:", decoded.style);
        console.log("- variations count:", decoded.variations?.length);
        console.log("- upgrade_level:", decoded.upgrade_level);
    } else {
        console.log("Failed to analyze URL");
    }
} catch (error) {
    console.error("Error:", error);
}
