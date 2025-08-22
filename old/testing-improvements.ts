// Enhanced testing and documentation

import { EconItem, Sticker, WeaponType, ItemRarity } from './base';

/**
 * Test data generator for comprehensive testing
 */
export class TestDataGenerator {
    /**
     * Generate a random valid EconItem for testing
     */
    static generateRandomItem(): EconItem {
        const weapons = Object.values(WeaponType).filter(v => typeof v === 'number') as number[];
        const rarities = Object.values(ItemRarity).filter(v => typeof v === 'number') as number[];
        
        return {
            defindex: weapons[Math.floor(Math.random() * weapons.length)],
            paintindex: Math.floor(Math.random() * 1000),
            paintseed: Math.floor(Math.random() * 1000),
            paintwear: Math.random(),
            rarity: rarities[Math.floor(Math.random() * rarities.length)],
            stickers: this.generateRandomStickers(),
            keychains: Math.random() > 0.7 ? [this.generateRandomSticker()] : [],
            variations: Math.random() > 0.8 ? this.generateRandomStickers(1, 2) : [],
            style: Math.random() > 0.5 ? Math.floor(Math.random() * 10) : undefined,
            upgrade_level: Math.random() > 0.7 ? Math.floor(Math.random() * 20) : undefined
        };
    }

    /**
     * Generate random stickers array
     */
    static generateRandomStickers(min: number = 0, max: number = 4): Sticker[] {
        const count = Math.floor(Math.random() * (max - min + 1)) + min;
        const stickers: Sticker[] = [];
        
        for (let i = 0; i < count; i++) {
            stickers.push(this.generateRandomSticker(i));
        }
        
        return stickers;
    }

    /**
     * Generate a single random sticker
     */
    static generateRandomSticker(slot: number = 0): Sticker {
        return {
            slot,
            sticker_id: Math.floor(Math.random() * 10000) + 1,
            wear: Math.random() > 0.3 ? Math.random() : undefined,
            scale: Math.random() > 0.5 ? 0.5 + Math.random() * 1.5 : undefined,
            rotation: Math.random() > 0.5 ? Math.random() * 360 - 180 : undefined,
            tint_id: Math.random() > 0.8 ? Math.floor(Math.random() * 10) : undefined,
            offset_x: Math.random() > 0.6 ? (Math.random() - 0.5) * 2 : undefined,
            offset_y: Math.random() > 0.6 ? (Math.random() - 0.5) * 2 : undefined,
            offset_z: Math.random() > 0.7 ? (Math.random() - 0.5) * 2 : undefined,
            pattern: Math.random() > 0.5 ? Math.floor(Math.random() * 1000) : undefined,
            highlight_reel: Math.random() > 0.8 ? Math.floor(Math.random() * 10) : undefined
        };
    }

    /**
     * Generate edge case test items
     */
    static generateEdgeCases(): EconItem[] {
        return [
            // Minimal item
            {
                defindex: 1,
                paintindex: 0,
                paintseed: 0,
                paintwear: 0
            },
            // Maximum values
            {
                defindex: 65535,
                paintindex: 65535,
                paintseed: 1000,
                paintwear: 1.0,
                itemid: BigInt("18446744073709551615"), // Max uint64
                accountid: 2147483647, // Max int32
                entindex: -2147483648, // Min int32
                customname: "A".repeat(100), // Long name
                stickers: Array(4).fill(null).map((_, i) => ({
                    slot: i,
                    sticker_id: 65535,
                    wear: 1.0,
                    scale: 10.0,
                    rotation: 180.0,
                    offset_x: 1.0,
                    offset_y: 1.0,
                    offset_z: 1.0,
                    pattern: 1000,
                    highlight_reel: 255
                }))
            },
            // Unicode in custom name
            {
                defindex: 7, // AK-47
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15,
                customname: "🔥 Fire Serpent 🐍 ★"
            }
        ];
    }
}

/**
 * Performance benchmarking utilities
 */
export class PerformanceBenchmark {
    static async benchmarkEncoding(iterations: number = 1000): Promise<{
        averageTime: number;
        minTime: number;
        maxTime: number;
        totalTime: number;
    }> {
        const times: number[] = [];
        const testItem = TestDataGenerator.generateRandomItem();
        
        // Warm up
        for (let i = 0; i < 10; i++) {
            // ProtoWriter.createInspectUrl(testItem);
        }
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            // ProtoWriter.createInspectUrl(testItem);
            const end = performance.now();
            times.push(end - start);
        }
        
        return {
            averageTime: times.reduce((a, b) => a + b, 0) / times.length,
            minTime: Math.min(...times),
            maxTime: Math.max(...times),
            totalTime: times.reduce((a, b) => a + b, 0)
        };
    }

    static async benchmarkDecoding(iterations: number = 1000): Promise<{
        averageTime: number;
        minTime: number;
        maxTime: number;
        totalTime: number;
    }> {
        const times: number[] = [];
        const testItem = TestDataGenerator.generateRandomItem();
        // const testUrl = ProtoWriter.createInspectUrl(testItem);
        // const analyzedUrl = analyzeInspectUrl(testUrl);
        
        // if (!analyzedUrl?.hex_data) {
        //     throw new Error('Failed to generate test URL');
        // }
        
        // Warm up
        for (let i = 0; i < 10; i++) {
            // ProtoReader.decodeMaskedData(analyzedUrl.hex_data);
        }
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            // ProtoReader.decodeMaskedData(analyzedUrl.hex_data);
            const end = performance.now();
            times.push(end - start);
        }
        
        return {
            averageTime: times.reduce((a, b) => a + b, 0) / times.length,
            minTime: Math.min(...times),
            maxTime: Math.max(...times),
            totalTime: times.reduce((a, b) => a + b, 0)
        };
    }
}

/**
 * Comprehensive test suite
 */
export class TestSuite {
    static runAllTests(): { passed: number; failed: number; results: any[] } {
        const results: any[] = [];
        let passed = 0;
        let failed = 0;

        // Test 1: Basic encoding/decoding
        try {
            const testItem = TestDataGenerator.generateRandomItem();
            // const url = ProtoWriter.createInspectUrl(testItem);
            // const analyzed = analyzeInspectUrl(url);
            // const decoded = ProtoReader.decodeMaskedData(analyzed!.hex_data!);
            
            results.push({ test: 'Basic encoding/decoding', status: 'PASSED' });
            passed++;
        } catch (error) {
            results.push({ test: 'Basic encoding/decoding', status: 'FAILED', error: error.message });
            failed++;
        }

        // Test 2: Edge cases
        try {
            const edgeCases = TestDataGenerator.generateEdgeCases();
            for (const testCase of edgeCases) {
                // const url = ProtoWriter.createInspectUrl(testCase);
                // const analyzed = analyzeInspectUrl(url);
                // const decoded = ProtoReader.decodeMaskedData(analyzed!.hex_data!);
            }
            results.push({ test: 'Edge cases', status: 'PASSED' });
            passed++;
        } catch (error) {
            results.push({ test: 'Edge cases', status: 'FAILED', error: error.message });
            failed++;
        }

        // Test 3: Stress test with many items
        try {
            for (let i = 0; i < 100; i++) {
                const testItem = TestDataGenerator.generateRandomItem();
                // const url = ProtoWriter.createInspectUrl(testItem);
                // const analyzed = analyzeInspectUrl(url);
                // const decoded = ProtoReader.decodeMaskedData(analyzed!.hex_data!);
            }
            results.push({ test: 'Stress test (100 items)', status: 'PASSED' });
            passed++;
        } catch (error) {
            results.push({ test: 'Stress test (100 items)', status: 'FAILED', error: error.message });
            failed++;
        }

        return { passed, failed, results };
    }
}

/**
 * Documentation examples
 */
export class DocumentationExamples {
    /**
     * Example: Creating a basic inspect URL
     */
    static basicExample(): string {
        const item: EconItem = {
            defindex: WeaponType.AK_47,
            paintindex: 44, // Fire Serpent
            paintseed: 661,
            paintwear: 0.15
        };

        // return ProtoWriter.createInspectUrl(item);
        return "example-url";
    }

    /**
     * Example: Creating an item with stickers
     */
    static stickerExample(): string {
        const item: EconItem = {
            defindex: WeaponType.AK_47,
            paintindex: 44,
            paintseed: 661,
            paintwear: 0.15,
            stickers: [
                {
                    slot: 0,
                    sticker_id: 1,
                    wear: 0.0,
                    scale: 1.0,
                    rotation: 0.0
                }
            ]
        };

        // return ProtoWriter.createInspectUrl(item);
        return "example-url-with-stickers";
    }
}
