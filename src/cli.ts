#!/usr/bin/env node

/**
 * CS2 Inspect URL CLI Tool
 * 
 * Command-line interface for encoding and decoding CS2 inspect URLs
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { CS2Inspect, WeaponType, ItemRarity, EconItem, VERSION } from './index';
import { CS2InspectError } from './errors';
import { CS2InspectConfig, DEFAULT_CONFIG } from './types';

const program = new Command();

// Configure CLI
program
    .name('cs2inspect')
    .description('CS2 Inspect URL utilities - encode and decode inspect URLs')
    .version(VERSION);

// Global options
program
    .option('-v, --verbose', 'enable verbose output')
    .option('--no-validate', 'disable input validation')
    .option('--config <file>', 'load configuration from JSON file')
    .option('--steam-username <username>', 'Steam username for unmasked URL support')
    .option('--steam-password <password>', 'Steam password for unmasked URL support')
    .option('--enable-steam', 'enable Steam client for unmasked URLs');

/**
 * Decode command
 */
program
    .command('decode <url>')
    .description('decode an inspect URL and display item information (supports both masked and unmasked URLs)')
    .option('-o, --output <file>', 'output to JSON file instead of console')
    .option('-f, --format <format>', 'output format (json|yaml|table)', 'json')
    .option('--raw', 'output raw protobuf data without formatting')
    .option('--force-steam', 'force use of Steam client even for masked URLs')
    .action(async (url: string, options) => {
        try {
            const config = loadConfig(options.parent?.config, {
                validateInput: !options.parent?.noValidate,
                enableLogging: options.parent?.verbose,
                steamClient: {
                    enabled: options.parent?.enableSteam || false,
                    username: options.parent?.steamUsername,
                    password: options.parent?.steamPassword
                }
            });

            const cs2 = new CS2Inspect(config);

            if (options.parent?.verbose) {
                console.log('Analyzing URL...');
            }

            // First analyze the URL
            const analyzed = cs2.analyzeUrl(url);

            if (options.parent?.verbose) {
                console.log('URL type:', analyzed.url_type);
                if (analyzed.url_type === 'unmasked') {
                    console.log('Market ID:', analyzed.market_id);
                    console.log('Owner ID:', analyzed.owner_id);
                    console.log('Asset ID:', analyzed.asset_id);
                    console.log('Class ID:', analyzed.class_id);
                }
            }

            let item: any;

            // Handle different URL types
            if (analyzed.url_type === 'masked' && !options.forceSteam) {
                if (options.parent?.verbose) {
                    console.log('Decoding protobuf data...');
                }
                item = cs2.decodeInspectUrl(url);
            } else if (analyzed.url_type === 'unmasked' || options.forceSteam) {
                if (!config.steamClient?.enabled || !config.steamClient?.username || !config.steamClient?.password) {
                    console.error('Error: Steam credentials required for unmasked URLs');
                    console.log('Use --enable-steam --steam-username <username> --steam-password <password>');
                    process.exit(1);
                }

                if (options.parent?.verbose) {
                    console.log('Initializing Steam client...');
                }

                await cs2.initializeSteamClient();

                if (options.parent?.verbose) {
                    console.log('Fetching item data from Steam...');
                }

                item = await cs2.decodeInspectUrlAsync(url);
            } else {
                console.error('Error: Invalid URL type');
                process.exit(1);
            }

            let output: string;

            if (options.raw) {
                output = JSON.stringify(item, (_key, value) =>
                    typeof value === 'bigint' ? value.toString() : value, 2);
            } else {
                output = formatItemOutput(item, options.format);
            }

            if (options.output) {
                writeFileSync(options.output, output);
                console.log(`Output written to ${options.output}`);
            } else {
                console.log(output);
            }

            // Disconnect Steam client if it was used
            if (cs2.isSteamClientReady()) {
                await cs2.disconnectSteamClient();
            }

        } catch (error) {
            handleError(error, options.parent?.verbose);
        }
    });

/**
 * Encode command
 */
program
    .command('encode')
    .description('create an inspect URL from item data')
    .option('-i, --input <file>', 'read item data from JSON file')
    .option('-w, --weapon <weapon>', 'weapon type (name or ID)')
    .option('-p, --paint <paint>', 'paint index', '0')
    .option('-s, --seed <seed>', 'paint seed', '0')
    .option('-f, --float <float>', 'wear float value', '0.0')
    .option('-r, --rarity <rarity>', 'item rarity')
    .option('-n, --name <name>', 'custom name tag')
    .option('--sticker <slot:id:wear>', 'add sticker (can be used multiple times)', collect, [])
    .option('--keychain <id:pattern>', 'add keychain')
    .option('-o, --output <file>', 'output URL to file instead of console')
    .action(async (options) => {
        try {
            const config = loadConfig(options.parent?.config, {
                validateInput: !options.parent?.noValidate,
                enableLogging: options.parent?.verbose
            });

            const cs2 = new CS2Inspect(config);
            let item: EconItem;

            if (options.input) {
                // Load from file
                if (options.parent?.verbose) {
                    console.log(`Loading item data from ${options.input}...`);
                }
                const data = readFileSync(options.input, 'utf8');
                item = JSON.parse(data, (key, value) => {
                    // Handle BigInt values
                    if (key === 'itemid' && typeof value === 'string' && /^\d+$/.test(value)) {
                        return BigInt(value);
                    }
                    return value;
                });
            } else {
                // Build from command line options
                if (!options.weapon) {
                    console.error('Error: weapon is required when not using input file');
                    process.exit(1);
                }

                item = buildItemFromOptions(options);
            }

            if (options.parent?.verbose) {
                console.log('Creating inspect URL...');
                console.log('Item data:', JSON.stringify(item, (_key, value) =>
                    typeof value === 'bigint' ? value.toString() : value, 2));
            }

            const url = cs2.createInspectUrl(item);

            if (options.output) {
                writeFileSync(options.output, url);
                console.log(`URL written to ${options.output}`);
            } else {
                console.log(url);
            }

        } catch (error) {
            handleError(error, options.parent?.verbose);
        }
    });

/**
 * Validate command
 */
program
    .command('validate <url>')
    .description('validate an inspect URL format and content')
    .action(async (url: string, options) => {
        try {
            const config = loadConfig(options.parent?.config, {
                validateInput: true,
                enableLogging: options.parent?.verbose
            });

            const cs2 = new CS2Inspect(config);
            
            console.log('Validating URL format...');
            const urlValidation = cs2.validateUrl(url);
            
            if (!urlValidation.valid) {
                console.log('❌ URL format validation failed:');
                urlValidation.errors.forEach(error => console.log(`  - ${error}`));
                if (urlValidation.warnings) {
                    console.log('⚠️  Warnings:');
                    urlValidation.warnings.forEach(warning => console.log(`  - ${warning}`));
                }
                process.exit(1);
            }

            console.log('✅ URL format is valid');

            // Try to analyze the URL
            console.log('\nAnalyzing URL structure...');
            const analyzed = cs2.analyzeUrl(url);
            console.log(`URL type: ${analyzed.url_type}`);
            console.log(`Quoted format: ${analyzed.is_quoted}`);

            if (analyzed.url_type === 'masked' && analyzed.hex_data) {
                console.log('\nValidating protobuf data...');
                try {
                    const item = cs2.decodeInspectUrl(url);
                    const itemValidation = cs2.validateItem(item);
                    
                    if (!itemValidation.valid) {
                        console.log('❌ Item data validation failed:');
                        itemValidation.errors.forEach(error => console.log(`  - ${error}`));
                    } else {
                        console.log('✅ Item data is valid');
                    }

                    if (itemValidation.warnings) {
                        console.log('⚠️  Warnings:');
                        itemValidation.warnings.forEach(warning => console.log(`  - ${warning}`));
                    }
                } catch (error) {
                    console.log('❌ Failed to decode protobuf data:', (error as Error).message);
                }
            }

        } catch (error) {
            handleError(error, options.parent?.verbose);
        }
    });

/**
 * Info command
 */
program
    .command('info <url>')
    .description('display basic information about an inspect URL')
    .action(async (url: string, options) => {
        try {
            const config = loadConfig(options.parent?.config, {
                validateInput: false, // Don't validate for info command
                enableLogging: options.parent?.verbose
            });

            const cs2 = new CS2Inspect(config);
            const info = cs2.getUrlInfo(url);
            
            console.log('URL Information:');
            console.log(`  Type: ${info.type}`);
            console.log(`  Quoted: ${info.isQuoted}`);
            console.log(`  Valid format: ${info.hasValidFormat}`);
            if (info.estimatedSize) {
                console.log(`  Data size: ${info.estimatedSize} characters`);
            }

            if (info.hasValidFormat && info.type !== 'invalid') {
                try {
                    const analyzed = cs2.analyzeUrl(url);
                    console.log(`  Original URL: ${analyzed.original_url.substring(0, 100)}${analyzed.original_url.length > 100 ? '...' : ''}`);
                    console.log(`  Cleaned URL: ${analyzed.cleaned_url.substring(0, 100)}${analyzed.cleaned_url.length > 100 ? '...' : ''}`);
                    
                    if (analyzed.url_type === 'unmasked') {
                        console.log(`  Market ID: ${analyzed.market_id || 'N/A'}`);
                        console.log(`  Owner ID: ${analyzed.owner_id || 'N/A'}`);
                        console.log(`  Asset ID: ${analyzed.asset_id}`);
                        console.log(`  Class ID: ${analyzed.class_id}`);
                    }
                } catch (error) {
                    console.log(`  Error analyzing URL: ${(error as Error).message}`);
                }
            }

        } catch (error) {
            handleError(error, options.parent?.verbose);
        }
    });

/**
 * Steam status command
 */
program
    .command('steam-status')
    .description('display Steam client status and configuration')
    .action(async (options) => {
        try {
            const config = loadConfig(options.parent?.config, {
                validateInput: false,
                enableLogging: options.parent?.verbose,
                steamClient: {
                    enabled: options.parent?.enableSteam || false,
                    username: options.parent?.steamUsername,
                    password: options.parent?.steamPassword
                }
            });

            const cs2 = new CS2Inspect(config);
            const stats = cs2.getSteamClientStats();

            console.log('Steam Client Status:');
            console.log(`  Status: ${stats.status}`);
            console.log(`  Available: ${stats.isAvailable ? '✅' : '❌'}`);
            console.log(`  Unmasked URL Support: ${stats.unmaskedSupport ? '✅' : '❌'}`);
            console.log(`  Queue Length: ${stats.queueLength}`);

            if (config.steamClient?.enabled) {
                console.log('\nConfiguration:');
                console.log(`  Username: ${config.steamClient.username ? '✅ Set' : '❌ Not set'}`);
                console.log(`  Password: ${config.steamClient.password ? '✅ Set' : '❌ Not set'}`);
                console.log(`  Rate Limit: ${config.steamClient.rateLimitDelay || 1500}ms`);
                console.log(`  Max Queue Size: ${config.steamClient.maxQueueSize || 100}`);
                console.log(`  Request Timeout: ${config.steamClient.requestTimeout || 10000}ms`);
            } else {
                console.log('\n⚠️  Steam client is disabled. Use --enable-steam to enable.');
            }

        } catch (error) {
            handleError(error, options.parent?.verbose);
        }
    });

// Helper functions

function collect(value: string, previous: string[]): string[] {
    return previous.concat([value]);
}

function loadConfig(configFile?: string, defaults: Partial<CS2InspectConfig> = {}): CS2InspectConfig {
    let config: Partial<CS2InspectConfig> = defaults;

    if (configFile) {
        try {
            const fileConfig = JSON.parse(readFileSync(configFile, 'utf8'));
            config = { ...defaults, ...fileConfig };
        } catch (error) {
            console.error(`Error loading config file: ${(error as Error).message}`);
            process.exit(1);
        }
    }

    return { ...DEFAULT_CONFIG, ...config };
}

function buildItemFromOptions(options: any): EconItem {
    const item: EconItem = {
        defindex: parseWeapon(options.weapon),
        paintindex: parseInt(options.paint, 10),
        paintseed: parseInt(options.seed, 10),
        paintwear: parseFloat(options.float)
    };

    if (options.rarity) {
        item.rarity = parseRarity(options.rarity);
    }

    if (options.name) {
        item.customname = options.name;
    }

    if (options.sticker && options.sticker.length > 0) {
        item.stickers = options.sticker.map((s: string) => {
            const [slot, id, wear] = s.split(':');
            return {
                slot: parseInt(slot, 10),
                sticker_id: parseInt(id, 10),
                wear: wear ? parseFloat(wear) : undefined
            };
        });
    }

    if (options.keychain) {
        const [id, pattern] = options.keychain.split(':');
        item.keychains = [{
            slot: 0,
            sticker_id: parseInt(id, 10),
            ...(pattern && { pattern: parseInt(pattern, 10) })
        }];
    }

    return item;
}

function parseWeapon(weapon: string): number {
    // Try to parse as number first
    const num = parseInt(weapon, 10);
    if (!isNaN(num)) {
        return num;
    }

    // Try to match weapon name
    const weaponName = weapon.toUpperCase().replace(/[-\s]/g, '_');
    if (weaponName in WeaponType) {
        return WeaponType[weaponName as keyof typeof WeaponType];
    }

    throw new Error(`Unknown weapon: ${weapon}`);
}

function parseRarity(rarity: string): number {
    // Try to parse as number first
    const num = parseInt(rarity, 10);
    if (!isNaN(num)) {
        return num;
    }

    // Try to match rarity name
    const rarityName = rarity.toUpperCase().replace(/[-\s]/g, '_');
    if (rarityName in ItemRarity) {
        return ItemRarity[rarityName as keyof typeof ItemRarity];
    }

    throw new Error(`Unknown rarity: ${rarity}`);
}

function formatItemOutput(item: EconItem, format: string): string {
    switch (format.toLowerCase()) {
        case 'json':
            return JSON.stringify(item, (_key, value) =>
                typeof value === 'bigint' ? value.toString() : value, 2);
        
        case 'yaml':
            // Simple YAML-like output
            return Object.entries(item)
                .map(([key, value]) => {
                    if (Array.isArray(value)) {
                        return `${key}:\n${value.map(v => `  - ${JSON.stringify(v)}`).join('\n')}`;
                    }
                    return `${key}: ${typeof value === 'bigint' ? value.toString() : JSON.stringify(value)}`;
                })
                .join('\n');
        
        case 'table':
            // Simple table format
            let output = 'Item Information:\n';
            output += '='.repeat(50) + '\n';
            Object.entries(item).forEach(([key, value]) => {
                if (!Array.isArray(value)) {
                    const displayValue = typeof value === 'bigint' ? value.toString() : value;
                    output += `${key.padEnd(20)}: ${displayValue}\n`;
                }
            });
            
            if (item.stickers && item.stickers.length > 0) {
                output += '\nStickers:\n';
                item.stickers.forEach((sticker, i) => {
                    output += `  ${i + 1}. Slot ${sticker.slot}, ID ${sticker.sticker_id}`;
                    if (sticker.wear !== undefined) output += `, Wear ${sticker.wear}`;
                    output += '\n';
                });
            }
            
            return output;
        
        default:
            throw new Error(`Unknown format: ${format}`);
    }
}

function handleError(error: any, verbose: boolean = false) {
    if (error instanceof CS2InspectError) {
        console.error(`Error [${error.code}]: ${error.message}`);
        if (verbose && error.context) {
            console.error('Context:', JSON.stringify(error.context, null, 2));
        }
    } else {
        console.error('Error:', error.message);
        if (verbose) {
            console.error(error.stack);
        }
    }
    process.exit(1);
}

// Parse command line arguments
program.parse();
