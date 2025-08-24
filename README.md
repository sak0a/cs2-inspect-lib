# CS2 Inspect Library

[![npm version](https://badge.fury.io/js/cs2-inspect-lib.svg)](https://badge.fury.io/js/cs2-inspect-lib)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-14.0+-green.svg)](https://nodejs.org/)
[![Documentation](https://img.shields.io/badge/docs-available-brightgreen.svg)](https://sak0a.github.io/cs2-inspect-lib/)

A comprehensive TypeScript library for encoding and decoding Counter-Strike 2 inspect URLs with full protobuf support, Steam client integration, validation, and error handling.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [CLI Usage](#cli-usage)
- [Steam Client Integration](#steam-client-integration)
- [Examples](#examples)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Features

- 🔧 **Complete Protobuf Support** - Full implementation of `CEconItemPreviewDataBlock` message
- 🎮 **Steam Client Integration** - Support for unmasked URLs via Steam's Game Coordinator
- 🔗 **Dual URL Support** - Handle both masked (protobuf) and unmasked (community market/inventory) URLs
- ✅ **Input Validation** - Comprehensive validation with detailed error messages
- 🛡️ **Error Handling** - Robust error handling with custom error types
- 📘 **TypeScript Support** - Full TypeScript support with comprehensive type definitions
- 🖥️ **CLI Tool** - Command-line interface with Steam client support
- 🧪 **Unit Tests** - Comprehensive test coverage including Steam client functionality
- 🎨 **WeaponPaint Enum** - Comprehensive enum with 1,800+ CS2 skin definitions and weapon-specific naming
- 🆕 **Latest CS2 Fields** - Support for all CS2 fields including `highlight_reel`, `style`, `variations`, `upgrade_level`
- 🔢 **BigInt Support** - Proper handling of 64-bit integers
- ➕ **Signed Integer Support** - Correct handling of signed int32 fields like `entindex`
- ⏱️ **Rate Limiting** - Built-in rate limiting for Steam API calls
- 📋 **Queue Management** - Automatic queue management for Steam inspection requests

## Installation

```bash
npm install cs2-inspect-lib
```

For global CLI usage:
```bash
npm install -g cs2-inspect-lib
```

## Quick Start

### Basic Usage

```typescript
import { CS2Inspect, WeaponType, WeaponPaint, ItemRarity } from 'cs2-inspect-lib';

const cs2 = new CS2Inspect();

// Create an inspect URL
const item = {
  defindex: WeaponType.AK_47,
  paintindex: WeaponPaint.AK_47_FIRE_SERPENT, // Clear weapon + skin naming
  paintseed: 661,
  paintwear: 0.15,
  rarity: ItemRarity.COVERT,
  stickers: [
    {
      slot: 0,
      sticker_id: 1,
      wear: 0.1,
      highlight_reel: 1
    }
  ],
  style: 5,
  upgrade_level: 3
};

const url = cs2.createInspectUrl(item);
console.log(url);

// Decode an inspect URL
const decoded = cs2.decodeInspectUrl(url);
console.log(decoded);
```

### Convenience Functions

```typescript
import { createInspectUrl, decodeInspectUrl } from 'cs2-inspect-lib';

// Quick usage without instantiating the class
const url = createInspectUrl(item);
const decoded = decodeInspectUrl(url);
```

### With Validation

```typescript
import { CS2Inspect, validateItem } from 'cs2-inspect-lib';

// Validate an item before encoding
const validation = validateItem(item);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  if (validation.warnings) {
    console.warn('Warnings:', validation.warnings);
  }
}

// Configure validation settings
const cs2 = new CS2Inspect({
  validateInput: true,
  maxCustomNameLength: 50,
  enableLogging: true
});
```

## Documentation

📖 **[Full API Documentation](https://sak0a.github.io/cs2-inspect-lib/)**

The complete API documentation is available online, including:
- Detailed class and method documentation
- Type definitions and interfaces
- Usage examples and best practices
- Advanced configuration options

## API Reference

### Main Classes

#### `CS2Inspect`

Main API class for encoding and decoding inspect URLs.

```typescript
const cs2 = new CS2Inspect(config?: CS2InspectConfig);

// Core Methods
cs2.createInspectUrl(item: EconItem): string
cs2.decodeInspectUrl(url: string): EconItem
cs2.decodeInspectUrlAsync(url: string): Promise<EconItem | SteamInspectResult>
cs2.analyzeUrl(url: string): AnalyzedInspectURL
cs2.validateItem(item: any): ValidationResult
cs2.validateUrl(url: string): ValidationResult
cs2.isValidUrl(url: string): boolean
cs2.normalizeUrl(url: string): string

// Steam Client Methods
cs2.initializeSteamClient(): Promise<void>
cs2.isSteamClientReady(): boolean
cs2.getSteamClientStats(): SteamClientStats
cs2.requiresSteamClient(url: string): boolean
cs2.connectToServer(serverAddress: string): Promise<void>
cs2.disconnectSteamClient(): Promise<void>

// Configuration
cs2.updateConfig(newConfig: Partial<CS2InspectConfig>): void
cs2.getConfig(): Required<CS2InspectConfig>
```

### Core Types

#### `WeaponPaint`

Comprehensive enum with 1800+ weapon paint indices generated from CS2 skins database:

```typescript
enum WeaponPaint {
  VANILLA = 0,
  
  // AK-47 Skins (weapon-specific naming)
  AK_47_FIRE_SERPENT = 180,
  AK_47_REDLINE = 282,
  AK_47_VULCAN = 300,
  AK_47_CASE_HARDENED = 44,
  AK_47_WASTELAND_REBEL = 380,
  
  // AWP Skins
  AWP_DRAGON_LORE = 344,
  AWP_MEDUSA = 425,
  AWP_LIGHTNING_STRIKE = 179,
  AWP_ASIIMOV = 279,
  AWP_HYPER_BEAST = 446,
  
  // M4A4 Skins
  M4A4_HOWL = 309,
  M4A4_ASIIMOV = 255,
  M4A4_DRAGON_KING = 360,
  M4A4_DESOLATE_SPACE = 584,
  
  // Knife Skins (weapon-specific variants)
  KARAMBIT_DOPPLER = 417,
  KARAMBIT_MARBLE_FADE = 413,
  KARAMBIT_TIGER_TOOTH = 409,
  BAYONET_DOPPLER = 417,
  BAYONET_MARBLE_FADE = 413,
  
  // Glove Skins
  SPORT_GLOVES_PANDORAS_BOX = 10037,
  SPECIALIST_GLOVES_CRIMSON_KIMONO = 10033,
  
  // ... 1800+ total paint definitions covering all CS2 skins
}
```
**Utility Functions:**
```typescript
// Get paint name from index
getPaintName(paintIndex: number): string | undefined

// Get paint index from name
getPaintIndex(paintName: string): number | undefined

// Type guard
isWeaponPaint(value: any): value is WeaponPaint

// Get all available paints
getAllPaintNames(): string[]
getAllPaintIndices(): number[]
```
#### `EconItem`

Complete item data structure matching CS2's `CEconItemPreviewDataBlock`:

```typescript
interface EconItem {
  // Required fields
  defindex: number | WeaponType;
  paintindex: number | WeaponPaint;
  paintseed: number;
  paintwear: number;
  
  // Optional fields
  accountid?: number;
  itemid?: number | bigint;
  rarity?: ItemRarity | number;
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
  
  // Array fields
  stickers?: Sticker[];
  keychains?: Sticker[];
  variations?: Sticker[];
  
  // CS2 specific fields
  style?: number;
  upgrade_level?: number;
}
```

#### `Sticker`

Sticker/keychain/variation data structure:

```typescript
interface Sticker {
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
  highlight_reel?: number;
}
```

## Configuration

```typescript
interface CS2InspectConfig {
  validateInput?: boolean; // Default: true
  maxUrlLength?: number; // Default: 2048
  maxCustomNameLength?: number; // Default: 100
  enableLogging?: boolean; // Default: false
  steamClient?: SteamClientConfig;
}

interface SteamClientConfig {
  enabled?: boolean; // Default: false
  username?: string;
  password?: string;
  apiKey?: string; // Optional
  rateLimitDelay?: number; // Default: 1500ms
  maxQueueSize?: number; // Default: 100
  requestTimeout?: number; // Default: 10000ms
  queueTimeout?: number; // Default: 30000ms
  serverAddress?: string; // Optional
}
```

## Error Handling

The library provides comprehensive error handling with custom error types:

```typescript
import {
  CS2InspectError,
  ValidationError,
  EncodingError,
  DecodingError,
  SteamConnectionError,
  SteamAuthenticationError,
  SteamTimeoutError,
  SteamQueueFullError,
  SteamNotReadyError,
  SteamInspectionError
} from 'cs2-inspect-lib';

try {
  const url = cs2.createInspectUrl(item);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
    console.error('Context:', error.context);
  } else if (error instanceof EncodingError) {
    console.error('Encoding failed:', error.message);
  }
}
```

## CLI Usage

The library includes a powerful command-line tool:

```bash
# Decode a masked inspect URL (protobuf data)
cs2inspect decode "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20..."

# Decode an unmasked URL (requires Steam credentials)
cs2inspect decode "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198123456789A987654321D456789123" \
  --enable-steam --steam-username your_username --steam-password your_password

# Create an inspect URL
cs2inspect encode --weapon AK_47 --paint 44 --seed 661 --float 0.15

# Validate an inspect URL
cs2inspect validate "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20..."

# Get URL information
cs2inspect info "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20..."
```

For complete CLI documentation, run:
```bash
cs2inspect --help
```

## Steam Client Integration

The library supports two types of inspect URLs:

### Masked URLs (Protobuf Data)
These contain encoded item data and can be decoded without Steam client:
```
steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20001807A8...
```

### Unmasked URLs (Community Market/Inventory Links)
These reference items in Steam's database and require Steam client authentication:

**Market Listing:**
```
steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M123456789A987654321D456789123
```

**Inventory Item:**
```
steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198123456789A987654321D456789123
```

### Steam Client Configuration

```typescript
import { CS2Inspect } from 'cs2-inspect-lib';

// Configure with Steam client support
const cs2 = new CS2Inspect({
  steamClient: {
    enabled: true,
    username: 'your_steam_username',
    password: 'your_steam_password',
    rateLimitDelay: 1500, // ms between requests
    maxQueueSize: 100,
    requestTimeout: 30000, // 30 second timeout
    enableLogging: false
  }
});

// Initialize Steam client
await cs2.initializeSteamClient();

// Decode unmasked URLs (market/inventory links)
const unmaskedUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198123456789A987654321D456789123';
const item = await cs2.decodeInspectUrlAsync(unmaskedUrl);

// Check if URL requires Steam client
if (cs2.requiresSteamClient(url)) {
  console.log('This URL requires Steam client authentication');
}

// Get Steam client status
const stats = cs2.getSteamClientStats();
console.log('Steam client status:', stats.status);
console.log('Queue length:', stats.queueLength);
```

### Environment Variables

For security, you can use environment variables instead of hardcoding credentials:

```bash
export STEAM_USERNAME=your_username
export STEAM_PASSWORD=your_password
```

```typescript
const cs2 = new CS2Inspect({
  steamClient: {
    enabled: true,
    username: process.env.STEAM_USERNAME,
    password: process.env.STEAM_PASSWORD
  }
});
```

## Examples

### Using WeaponPaint Enum

```typescript
import { CS2Inspect, WeaponType, WeaponPaint, ItemRarity, getPaintName } from 'cs2-inspect-lib';

const cs2 = new CS2Inspect();

// Create items using comprehensive WeaponPaint enum with clear weapon + skin naming
const akFireSerpent = {
  defindex: WeaponType.AK_47,
  paintindex: WeaponPaint.AK_47_FIRE_SERPENT, // Much clearer than using 180
  paintseed: 661,
  paintwear: 0.15,
  rarity: ItemRarity.COVERT
};

const awpDragonLore = {
  defindex: WeaponType.AWP,
  paintindex: WeaponPaint.AWP_DRAGON_LORE, // Much clearer than using 344
  paintseed: 420,
  paintwear: 0.07,
  rarity: ItemRarity.COVERT
};

const karambitDoppler = {
  defindex: WeaponType.KARAMBIT,
  paintindex: WeaponPaint.KARAMBIT_DOPPLER, // Weapon-specific paint variants
  paintseed: 387,
  paintwear: 0.01,
  rarity: ItemRarity.COVERT
};

// Create inspect URLs
const akUrl = cs2.createInspectUrl(akFireSerpent);
const awpUrl = cs2.createInspectUrl(awpDragonLore);
const knifeUrl = cs2.createInspectUrl(karambitDoppler);

// Decode and get paint names
const decoded = cs2.decodeInspectUrl(akUrl);
console.log(`Paint: ${getPaintName(decoded.paintindex as number)}`); // "AK_47_FIRE_SERPENT"

// Explore the comprehensive database
console.log(`Total paints available: ${getAllPaintNames().length}`); // 1800+
```### Complete Item with All Fields

```typescript
const complexItem: EconItem = {
  accountid: 123456789,
  itemid: BigInt('9876543210'),
  defindex: WeaponType.AWP,
  paintindex: WeaponPaint.AWP_DRAGON_LORE, // Clear weapon + skin naming
  rarity: ItemRarity.COVERT,
  quality: 4,
  paintwear: 0.15,
  paintseed: 420,
  killeaterscoretype: 1,
  killeatervalue: 1337,
  customname: 'Dragon Lore',
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
    }
  ],
  keychains: [
    {
      slot: 0,
      sticker_id: 20,
      pattern: 148,
      highlight_reel: 2
    }
  ],
  style: 7,
  variations: [
    {
      slot: 0,
      sticker_id: 100,
      pattern: 50,
      highlight_reel: 3
    }
  ],
  upgrade_level: 10,
  entindex: -1
};

const url = createInspectUrl(complexItem);
const decoded = decodeInspectUrl(url);
```

### Error Handling Example

```typescript
import { CS2Inspect, ValidationError, DecodingError } from 'cs2-inspect-lib';

const cs2 = new CS2Inspect({ validateInput: true });

try {
  const item = {
    defindex: -1, // Invalid
    paintindex: 44,
    paintseed: 661,
    paintwear: 1.5 // Invalid
  };
  
  const url = cs2.createInspectUrl(item);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation errors:');
    error.context?.errors?.forEach(err => console.error(`  - ${err}`));
    
    if (error.context?.warnings) {
      console.warn('Warnings:');
      error.context.warnings.forEach(warn => console.warn(`  - ${warn}`));
    }
  }
}
```

### Running Test Examples

The library includes comprehensive test examples:

```bash
# Run all tests
npm run example

# Run individual tests
npx ts-node examples/basic-usage.ts basic     # Basic item creation
npx ts-node examples/basic-usage.ts complex   # Complex items with stickers
npx ts-node examples/basic-usage.ts steam     # Steam client integration
npx ts-node examples/basic-usage.ts debug "real_url_here"  # Debug mode
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Development

```bash
# Clone the repository
git clone https://github.com/sak0a/cs2-inspect-lib.git
cd cs2-inspect-lib

# Install dependencies
npm install

# Build the project
npm run build

# Generate documentation
npm run docs

# Run in development mode
npm run dev

# Lint code
npm run lint
npm run lint:fix
```

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) and submit pull requests to our repository.

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/sak0a/cs2-inspect-lib.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`
5. Make your changes and add tests
6. Run tests: `npm test`
7. Build the project: `npm run build`
8. Submit a pull request

## Troubleshooting

### Steam Client Issues

**Connection Timeouts:**
```bash
# Enable debug mode to see where the process stops
npx ts-node examples/basic-usage.ts debug "your_real_url_here"
```

**Authentication Failures:**
- Verify Steam credentials are correct
- Check if Steam Guard is enabled on your account
- Ensure your account owns CS2

**Invalid URL Errors:**
- Ensure you're using real URLs from Steam Community Market or CS2 inventory
- Example URLs in documentation are placeholders and will timeout

### Debug Mode

Enable comprehensive logging to troubleshoot issues:

```typescript
const cs2 = new CS2Inspect({
  enableLogging: true,
  steamClient: {
    enabled: true,
    username: 'your_username',
    password: 'your_password',
    enableLogging: true, // Steam client debug logging
    requestTimeout: 60000 // Extended timeout for debugging
  }
});
```

## Changelog

### v3.0.5 (Latest)
- **WeaponPaint Enum**: Comprehensive enum with 1,800+ CS2 skin definitions generated from skins.json
- **Smart Naming**: Weapon-specific paint naming (e.g., `AK_47_FIRE_SERPENT`, `AWP_DRAGON_LORE`, `KARAMBIT_DOPPLER`)
- **Type Safety**: Updated `EconItem.paintindex` to accept `WeaponPaint | number` for full TypeScript support
- **Utility Functions**: Added `getPaintName()`, `getPaintIndex()`, `isWeaponPaint()`, `getAllPaintNames()`, `getAllPaintIndices()`
- **Comprehensive Coverage**: All weapon categories including rifles, pistols, knives, gloves, and SMGs
- **Auto-Generation**: Script to regenerate enum from updated skins.json data
- **Full Testing**: 16 comprehensive tests covering all WeaponPaint functionality
- **Professional Documentation**: Updated README with WeaponPaint examples and API reference
- **Backward Compatible**: Maintains compatibility with numeric paint indices

### v3.0.4
- Enhanced documentation and professional README
- Improved error handling and validation
- Updated TypeScript definitions
- Performance optimizations
### v2.1.0
- Steam Client Integration: Full support for unmasked URLs
- Debug Mode: Comprehensive logging for troubleshooting
- Enhanced Test Suite: Individual test functions with debug capabilities
- Connection Reuse: Intelligent Steam client connection management
- Extended CLI: Steam client commands and debug options

### v2.0.0
- Complete rewrite with enhanced error handling
- Added support for all new CS2 protobuf fields
- Comprehensive input validation
- CLI tool with full feature set
- 100% TypeScript with full type definitions

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:

1. Check the [documentation](https://sak0a.github.io/cs2-inspect-lib/)
2. Search [existing issues](https://github.com/sak0a/cs2-inspect-lib/issues)
3. Create a [new issue](https://github.com/sak0a/cs2-inspect-lib/issues/new) with detailed information

## Acknowledgments

- Original Python implementation inspiration
- CS2 community for protobuf research and documentation
- Steam API documentation and community reverse engineering efforts
