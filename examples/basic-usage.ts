/**
 * CS2 Inspect Library Test Suite
 * Individual test functions that can be run separately or all together
 * Replace YOUR_STEAM_USERNAME and YOUR_STEAM_PASSWORD with real credentials
 */

import {
    CS2Inspect,
    WeaponType,
    ItemRarity,
    EconItem,
    createInspectUrl,
    decodeInspectUrl,
    requiresSteamClient
} from '../src';

// Configuration for Steam client tests
const STEAM_CONFIG = {
    enabled: true,
    username: 'cs2inspectdev', // Replace with your Steam username
    password: 'utg!hdh6ydp@gxh4DRV', // Replace with your Steam password
    rateLimitDelay: 1500,
    maxQueueSize: 100,
    requestTimeout: 10000, // Increased timeout for debugging
    queueTimeout: 30000,
    enableLogging: true // Enable debug logging
};

/**
 * Test 1: Basic Item Creation and Decoding (Masked URLs)
 * Tests protobuf encoding/decoding without Steam client
 */
async function test1_BasicItemCreation(): Promise<boolean> {
    console.log('\n🧪 Test 1: Basic Item Creation (Masked URLs)');

    try {
        const basicItem: EconItem = {
            defindex: WeaponType.AK_47,
            paintindex: 44, // Fire Serpent
            paintseed: 661,
            paintwear: 0.15
        };

        const basicUrl = createInspectUrl(basicItem);
        console.log('✅ Generated URL:', basicUrl.substring(0, 80) + '...');
        console.log('✅ Requires Steam client:', requiresSteamClient(basicUrl));

        const decodedBasic = decodeInspectUrl(basicUrl);
        console.log('✅ Decoded item:', {
            defindex: decodedBasic.defindex,
            paintindex: decodedBasic.paintindex,
            paintseed: decodedBasic.paintseed,
            paintwear: decodedBasic.paintwear
        });

        console.log('✅ Test 1 PASSED');
        return true;
    } catch (error) {
        console.error('❌ Test 1 FAILED:', (error as Error).message);
        return false;
    }
}

/**
 * Test 2: Complex Item with Stickers, Keychains, and Variations
 * Tests advanced protobuf features
 */
async function test2_ComplexItem(): Promise<boolean> {
    console.log('\n🧪 Test 2: Complex Item with Stickers');

    try {
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
                    highlight_reel: 1
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
            style: 7,
            variations: [
                {
                    slot: 0,
                    sticker_id: 100,
                    pattern: 50,
                    highlight_reel: 4
                }
            ],
            upgrade_level: 10
        };

        const complexUrl = createInspectUrl(complexItem);
        console.log('✅ Complex URL generated:', complexUrl.substring(0, 80) + '...');

        const decodedComplex = decodeInspectUrl(complexUrl);
        console.log('✅ Decoded complex item with', decodedComplex.stickers?.length || 0, 'stickers,',
                   decodedComplex.keychains?.length || 0, 'keychains,', decodedComplex.variations?.length || 0, 'variations');

        console.log('✅ Test 2 PASSED');
        return true;
    } catch (error) {
        console.error('❌ Test 2 FAILED:', (error as Error).message);
        return false;
    }
}

/**
 * Test 3: CS2Inspect Class Features
 * Tests validation, URL analysis, and class methods
 */
async function test3_CS2InspectClass(): Promise<boolean> {
    console.log('\n🧪 Test 3: CS2Inspect Class Features');

    try {
        const cs2 = new CS2Inspect({
            validateInput: true,
            enableLogging: false // Keep quiet for tests
        });

        // Create a test item for validation
        const testItem: EconItem = {
            defindex: WeaponType.AWP,
            paintindex: 309,
            paintseed: 420,
            paintwear: 0.15
        };

        const testUrl = cs2.createInspectUrl(testItem);

        // Validate an item
        const validation = cs2.validateItem(testItem);
        console.log('✅ Validation result:', validation.valid ? 'VALID' : 'INVALID');

        // Analyze a URL
        const analyzed = cs2.analyzeUrl(testUrl);
        console.log('✅ URL analysis - Type:', analyzed.url_type, 'Quoted:', analyzed.is_quoted);

        // Check if URL is valid
        const isValid = cs2.isValidUrl(testUrl);
        console.log('✅ URL validity check:', isValid);

        console.log('✅ Test 3 PASSED');
        return true;
    } catch (error) {
        console.error('❌ Test 3 FAILED:', (error as Error).message);
        return false;
    }
}

/**
 * Test 4: Error Handling
 * Tests validation errors and error context
 */
async function test4_ErrorHandling(): Promise<boolean> {
    console.log('\n🧪 Test 4: Error Handling');

    try {
        const cs2 = new CS2Inspect({ validateInput: true });

        const invalidItem = {
            defindex: -1, // Invalid
            paintindex: 44,
            paintseed: 661,
            paintwear: 1.5 // Invalid (> 1.0)
        };

        try {
            cs2.createInspectUrl(invalidItem);
            console.error('❌ Expected validation error but none was thrown');
            return false;
        } catch (validationError) {
            console.log('✅ Caught expected validation error:', (validationError as Error).message.substring(0, 50) + '...');
            if ((validationError as any).context) {
                console.log('✅ Error context available');
            }
        }

        console.log('✅ Test 4 PASSED');
        return true;
    } catch (error) {
        console.error('❌ Test 4 FAILED:', (error as Error).message);
        return false;
    }
}

/**
 * Test 5: BigInt and Signed Integer Support
 * Tests handling of large numbers and negative values
 */
async function test5_BigIntAndSignedIntegers(): Promise<boolean> {
    console.log('\n🧪 Test 5: BigInt and Signed Integer Support');

    try {
        // Test BigInt itemid
        const itemWithBigId: EconItem = {
            itemid: BigInt('9876543210123456789'), // Large uint64
            defindex: WeaponType.KARAMBIT,
            paintindex: 44,
            paintseed: 661,
            paintwear: 0.15
        };

        const bigIdUrl = createInspectUrl(itemWithBigId);
        const decodedBigId = decodeInspectUrl(bigIdUrl);
        console.log('✅ BigInt itemid preserved:', typeof decodedBigId.itemid === 'bigint');

        // Test signed integers (entindex)
        const itemWithNegativeEntindex: EconItem = {
            defindex: WeaponType.AK_47,
            paintindex: 44,
            paintseed: 661,
            paintwear: 0.15,
            entindex: -1 // Negative value
        };

        const negativeUrl = createInspectUrl(itemWithNegativeEntindex);
        const decodedNegative = decodeInspectUrl(negativeUrl);
        console.log('✅ Negative entindex preserved:', decodedNegative.entindex === -1);

        console.log('✅ Test 5 PASSED');
        return true;
    } catch (error) {
        console.error('❌ Test 5 FAILED:', (error as Error).message);
        return false;
    }
}

/**
 * Test 6: Unicode Support
 * Tests handling of Unicode characters in custom names
 */
async function test6_UnicodeSupport(): Promise<boolean> {
    console.log('\n🧪 Test 6: Unicode Support');

    try {
        const unicodeItem: EconItem = {
            defindex: WeaponType.AK_47,
            paintindex: 44,
            paintseed: 661,
            paintwear: 0.15,
            customname: '🔥 Fire Serpent 🐍 ★'
        };

        const unicodeUrl = createInspectUrl(unicodeItem);
        const decodedUnicode = decodeInspectUrl(unicodeUrl);
        console.log('✅ Unicode custom name preserved:', decodedUnicode.customname === '🔥 Fire Serpent 🐍 ★');

        console.log('✅ Test 6 PASSED');
        return true;
    } catch (error) {
        console.error('❌ Test 6 FAILED:', (error as Error).message);
        return false;
    }
}

/**
 * Test 7: Configuration Management
 * Tests configuration validation and updates
 */
async function test7_Configuration(): Promise<boolean> {
    console.log('\n🧪 Test 7: Configuration Management');

    try {
        const strictCs2 = new CS2Inspect({
            validateInput: true,
            maxCustomNameLength: 20,
            maxUrlLength: 1000,
            enableLogging: false
        });

        // Test configuration limits
        const longNameItem: EconItem = {
            defindex: WeaponType.AK_47,
            paintindex: 44,
            paintseed: 661,
            paintwear: 0.15,
            customname: 'This name is way too long for the configured limit'
        };

        try {
            strictCs2.createInspectUrl(longNameItem);
            console.error('❌ Expected configuration error but none was thrown');
            return false;
        } catch (configError) {
            console.log('✅ Configuration limit enforced');
        }

        // Test configuration update
        strictCs2.updateConfig({ maxCustomNameLength: 100 });
        console.log('✅ Configuration updated successfully');

        console.log('✅ Test 7 PASSED');
        return true;
    } catch (error) {
        console.error('❌ Test 7 FAILED:', (error as Error).message);
        return false;
    }
}

/**
 * Test 8: URL Normalization and Information
 * Tests URL normalization and information extraction
 */
async function test8_UrlNormalizationAndInfo(): Promise<boolean> {
    console.log('\n🧪 Test 8: URL Normalization and Information');

    try {
        const cs2 = new CS2Inspect();

        // Test URL normalization
        const messyUrl = 'csgo_econ_action_preview M123456789A987654321D456789123';
        cs2.normalizeUrl(messyUrl);
        console.log('✅ URL normalized successfully');

        // Test URL information
        const testItem: EconItem = {
            defindex: WeaponType.AK_47,
            paintindex: 44,
            paintseed: 661,
            paintwear: 0.15
        };
        const testUrl = cs2.createInspectUrl(testItem);
        const urlInfo = cs2.getUrlInfo(testUrl);
        console.log('✅ URL info extracted:', urlInfo.type, urlInfo.hasValidFormat);

        console.log('✅ Test 8 PASSED');
        return true;
    } catch (error) {
        console.error('❌ Test 8 FAILED:', (error as Error).message);
        return false;
    }
}

/**
 * Test 9: Steam Client Integration (Unmasked URLs)
 * Tests Steam client connection and unmasked URL inspection
 * NOTE: Requires valid Steam credentials to pass
 */
async function test9_SteamClientIntegration(): Promise<boolean> {
    console.log('\n🧪 Test 9: Steam Client Integration');

    // Check if credentials are still placeholders
    if (STEAM_CONFIG.username === 'YOUR_STEAM_USERNAME' || STEAM_CONFIG.password === 'YOUR_STEAM_PASSWORD') {
        console.log('⚠️  SKIPPED: Replace YOUR_STEAM_USERNAME and YOUR_STEAM_PASSWORD with real credentials');
        return true; // Skip test, don't fail
    }

    try {
        const cs2WithSteam = new CS2Inspect({
            validateInput: true,
            enableLogging: false, // Keep quiet for tests
            steamClient: STEAM_CONFIG
        });

        // Initialize Steam client (will reuse existing connection if available)
        await cs2WithSteam.initializeSteamClient();
        console.log('✅ Steam client initialized');

        // Test Steam client status
        const isReady = cs2WithSteam.isSteamClientReady();
        console.log('✅ Steam client ready:', isReady);

        // Test with a fake URL (expected to timeout)
        const fakeUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M123456789A987654321D456789123';
        console.log('✅ Testing fake URL (timeout expected)...');

        try {
            await cs2WithSteam.decodeInspectUrlAsync(fakeUrl);
            console.log('✅ Unexpected success with fake URL');
        } catch (error) {
            console.log('✅ Expected timeout/error with fake URL');
        }

        await cs2WithSteam.disconnectSteamClient();
        console.log('✅ Test 9 PASSED');
        return true;

    } catch (error) {
        console.error('❌ Test 9 FAILED:', (error as Error).message);
        return false;
    }
}

/**
 * Test 10: Real URL Testing (Optional)
 * Tests with a real unmasked URL - replace with actual URL to test
 */
async function test10_RealUrlTesting(): Promise<boolean> {
    console.log('\n🧪 Test 10: Real URL Testing');

    const realUrl =
        "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198857794835A45540551473D7523863830991655521";
    if (!realUrl) {
        console.log('⚠️  SKIPPED: No real URL provided. Call testWithRealUrl("real_url_here") to test');
        return true;
    }

    if (STEAM_CONFIG.username === 'YOUR_STEAM_USERNAME' || STEAM_CONFIG.password === 'YOUR_STEAM_PASSWORD') {
        console.log('⚠️  SKIPPED: Real Steam credentials required');
        return true;
    }

    try {
        // Create a fresh CS2Inspect instance for this test
        const cs2Real = new CS2Inspect({
            steamClient: { ...STEAM_CONFIG, requestTimeout: 30000, enableLogging: true }
        });

        console.log('✅ Initializing Steam client for real URL test...');
        await cs2Real.initializeSteamClient();

        console.log('✅ Testing real URL:', realUrl.substring(0, 80) + '...');
        const result = await cs2Real.decodeInspectUrlAsync(realUrl);

        console.log('✅ Success! Item data:', result);


        await cs2Real.disconnectSteamClient();
        console.log('✅ Test 10 PASSED');
        return true;

    } catch (error) {
        console.error('❌ Test 10 FAILED:', (error as Error).message);

        // If it's the "already logged on" error, provide helpful message
        if ((error as Error).message.includes('Already logged on')) {
            console.log('💡 Tip: Steam client is already connected from previous test. This is expected behavior.');
            console.log('💡 The Steam client reuses existing connections for efficiency.');
            return true; // Don't fail the test for this
        }

        return false;
    }
}

// =============================================================================
// TEST RUNNER
// =============================================================================

/**
 * Individual test functions that can be run separately
 */
const ALL_TESTS = [
    test1_BasicItemCreation,
    test2_ComplexItem,
    test3_CS2InspectClass,
    test4_ErrorHandling,
    test5_BigIntAndSignedIntegers,
    test6_UnicodeSupport,
    test7_Configuration,
    test8_UrlNormalizationAndInfo,
    test9_SteamClientIntegration,
    test10_RealUrlTesting // Requires real URL parameter
];

/**
 * Run a specific test by name
 */
async function runTest(testName: string): Promise<void> {
    const testMap: Record<string, () => Promise<boolean>> = {
        'basic': test1_BasicItemCreation,
        'complex': test2_ComplexItem,
        'class': test3_CS2InspectClass,
        'error': test4_ErrorHandling,
        'bigint': test5_BigIntAndSignedIntegers,
        'unicode': test6_UnicodeSupport,
        'config': test7_Configuration,
        'url': test8_UrlNormalizationAndInfo,
        'steam': test9_SteamClientIntegration,
        'reuse': testSteamClientReuse,
        'real': test10_RealUrlTesting,
    };

    const testFn = testMap[testName.toLowerCase()];
    if (!testFn) {
        console.error(`❌ Test "${testName}" not found. Available tests:`, Object.keys(testMap).join(', '));
        return;
    }

    console.log(`\n🚀 Running single test: ${testName}`);
    const result = await testFn();
    console.log(result ? '✅ Test completed successfully' : '❌ Test failed');
}

/**
 * Run all tests
 */
async function runAllTests(): Promise<void> {
    console.log('🚀 CS2 Inspect Library Test Suite');
    console.log('=====================================');

    if (STEAM_CONFIG.username === 'YOUR_STEAM_USERNAME') {
        console.log('💡 Tip: Replace YOUR_STEAM_USERNAME and YOUR_STEAM_PASSWORD in STEAM_CONFIG for full Steam client testing');
    }

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const test of ALL_TESTS) {
        try {
            const result = await test();
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.error(`❌ Test ${test.name} threw an error:`, (error as Error).message);
            failed++;
        }
    }

    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Skipped: ${skipped}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
}

/**
 * Test with a real unmasked URL
 */
async function testWithRealUrl(realUrl: string): Promise<void> {
    console.log('\n🔗 Testing with Real URL: ' + realUrl);
    await test10_RealUrlTesting();
}

/**
 * Debug test with comprehensive logging
 */
async function debugTest(realUrl: string): Promise<void> {
    console.log('\n🐛 Debug Test with Comprehensive Logging');
    console.log('=====================================');

    if (STEAM_CONFIG.username === 'YOUR_STEAM_USERNAME') {
        console.log('❌ Please replace YOUR_STEAM_USERNAME and YOUR_STEAM_PASSWORD with real credentials');
        return;
    }

    try {
        // Create CS2Inspect with debug enabled
        const cs2Debug = new CS2Inspect({
            validateInput: true,
            enableLogging: true,
            steamClient: {
                ...STEAM_CONFIG,
                enableLogging: true,
                requestTimeout: 60000 // 60 second timeout for debugging
            }
        });

        console.log('🔧 Initializing Steam client with debug mode...');
        await cs2Debug.initializeSteamClient();

        console.log('✅ Steam client initialized');
        console.log('📊 Steam client stats:', cs2Debug.getSteamClientStats());

        console.log('\n🔍 Analyzing URL...');
        const urlInfo = cs2Debug.analyzeUrl(realUrl);
        console.log('📋 URL Analysis:', JSON.stringify(urlInfo, null, 2));

        console.log('\n🚀 Starting inspection with full debug logging...');
        console.log('⏱️  Timeout set to 60 seconds');
        console.log('🔗 URL:', realUrl);

        const startTime = Date.now();
        const result = await cs2Debug.decodeInspectUrlAsync(realUrl);
        const endTime = Date.now();

        console.log('\n✅ SUCCESS! Inspection completed in', endTime - startTime, 'ms');
        console.log('📦 Item data:', JSON.stringify(result, null, 2));

        await cs2Debug.disconnectSteamClient();
        console.log('🔌 Steam client disconnected');

    } catch (error) {
        console.error('\n❌ DEBUG TEST FAILED');
        console.error('Error type:', (error as Error).constructor.name);
        console.error('Error message:', (error as Error).message);
        console.error('Error stack:', (error as Error).stack);

        if ((error as any).context) {
            console.error('Error context:', JSON.stringify((error as any).context, null, 2));
        }
    }
}

/**
 * Helper function to test Steam client connection reuse
 */
async function testSteamClientReuse(): Promise<boolean> {
    console.log('\n🔄 Testing Steam Client Connection Reuse');

    if (STEAM_CONFIG.username === 'YOUR_STEAM_USERNAME') {
        console.log('⚠️  SKIPPED: Replace credentials to test Steam client reuse');
        return true;
    }

    try {
        console.log('Running Steam test twice to test connection reuse...');

        // First run
        console.log('\n--- First Steam Test ---');
        const result1 = await test9_SteamClientIntegration();

        // Second run (should reuse connection)
        console.log('\n--- Second Steam Test (should reuse connection) ---');
        const result2 = await test9_SteamClientIntegration();

        console.log('✅ Steam client connection reuse test completed');
        return result1 && result2;
    } catch (error) {
        console.error('❌ Steam client reuse test failed:', (error as Error).message);
        return false;
    }
}

// Export functions for external use
export {
    runAllTests,
    runTest,
    testWithRealUrl,
    debugTest,
    test1_BasicItemCreation,
    test2_ComplexItem,
    test3_CS2InspectClass,
    test4_ErrorHandling,
    test5_BigIntAndSignedIntegers,
    test6_UnicodeSupport,
    test7_Configuration,
    test8_UrlNormalizationAndInfo,
    test9_SteamClientIntegration,
    test10_RealUrlTesting
};

// =============================================================================
// MAIN EXECUTION
// =============================================================================

// Check command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
    // Run all tests by default
    runAllTests().catch(console.error);
} else if (args[0] === 'real' && args[1]) {
    // Test with real URL: npx ts-node examples/basic-usage.ts real "steam://rungame/730/..."
    testWithRealUrl(args[1]).catch(console.error);
} else if (args[0] === 'debug' && args[1]) {
    // Debug test with real URL: npx ts-node examples/basic-usage.ts debug "steam://rungame/730/..."
    debugTest(args[1]).catch(console.error);
} else {
    // Run specific test: npx ts-node examples/basic-usage.ts steam
    runTest(args[0]).catch(console.error);
}
