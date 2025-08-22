# CS2 Inspect Library

A comprehensive TypeScript library for encoding and decoding Counter-Strike 2 inspect URLs with full protobuf support, Steam client integration, validation, and error handling.

## Features

- ✅ **Complete Protobuf Support** - Full implementation of `CEconItemPreviewDataBlock` message
- ✅ **Steam Client Integration** - Support for unmasked URLs via Steam's Game Coordinator
- ✅ **Dual URL Support** - Handle both masked (protobuf) and unmasked (community market/inventory) URLs
- ✅ **Input Validation** - Comprehensive validation with detailed error messages
- ✅ **Error Handling** - Robust error handling with custom error types
- ✅ **TypeScript Support** - Full TypeScript support with comprehensive type definitions
- ✅ **CLI Tool** - Command-line interface with Steam client support
- ✅ **Unit Tests** - Comprehensive test coverage including Steam client functionality
- ✅ **New Fields Support** - Support for all new CS2 fields including `highlight_reel`, `style`, `variations`, `upgrade_level`
- ✅ **BigInt Support** - Proper handling of 64-bit integers
- ✅ **Signed Integer Support** - Correct handling of signed int32 fields like `entindex`
- ✅ **Rate Limiting** - Built-in rate limiting for Steam API calls
- ✅ **Queue Management** - Automatic queue management for Steam inspection requests

## Installation

```bash
npm install cs2-inspect-lib
```

## Quick Start

### Basic Usage

```typescript
import { CS2Inspect, WeaponType, ItemRarity } from 'cs2-inspect-lib';

const cs2 = new CS2Inspect();

// Create an inspect URL
const item = {
  defindex: WeaponType.AK_47,
  paintindex: 44, // Fire Serpent
  paintseed: 661,
  paintwear: 0.15,
  rarity: ItemRarity.COVERT,
  stickers: [
    {
      slot: 0,
      sticker_id: 1,
      wear: 0.1,
      highlight_reel: 1 // New field!
    }
  ],
  style: 5, // New field!
  upgrade_level: 3 // New field!
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

### Steam Client Integration (Unmasked URLs)

The library now supports unmasked inspect URLs (community market and inventory links) through Steam client integration:

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
    enableLogging: false // Enable debug logging
    // Note: serverAddress not needed - Steam auto-selects servers
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

#### Environment Variables

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

#### Debug Mode

Enable comprehensive debug logging to troubleshoot Steam client issues:

```typescript
const cs2 = new CS2Inspect({
  enableLogging: true, // Enable general logging
  steamClient: {
    enabled: true,
    username: 'your_steam_username',
    password: 'your_steam_password',
    enableLogging: true, // Enable Steam client debug logging
    requestTimeout: 60000 // Extended timeout for debugging
  }
});

// Debug output shows:
// - Steam connection process
// - URL analysis and parsing
// - Queue management
// - Steam API call timing
// - Detailed error information
```

## CLI Usage

The library includes a powerful command-line tool:

```bash
# Install globally for CLI usage
npm install -g cs2-inspect-lib

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

# Check Steam client status
cs2inspect steam-status --enable-steam --steam-username your_username --steam-password your_password

# Debug Steam client issues (with verbose logging)
cs2inspect decode "unmasked_url..." \
  --enable-steam --steam-username your_username --steam-password your_password \
  --verbose

# Create from JSON file
cs2inspect encode --input item.json

# Output to file
cs2inspect decode "url..." --output decoded.json --format table
```

### CLI Examples

```bash
# Create AK-47 Fire Serpent with stickers
cs2inspect encode \
  --weapon AK_47 \
  --paint 44 \
  --seed 661 \
  --float 0.15 \
  --rarity COVERT \
  --name "Fire Serpent" \
  --sticker "0:1:0.1" \
  --sticker "1:2:0.0"

# Decode masked URL and format as table
cs2inspect decode "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20001807A8..." --format table

# Decode unmasked URL with Steam client
cs2inspect decode "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198123456789A987654321D456789123" \
  --enable-steam \
  --steam-username your_username \
  --steam-password your_password \
  --verbose

# Check Steam client configuration and status
cs2inspect steam-status --enable-steam --steam-username your_username --steam-password your_password

# Validate with verbose output
cs2inspect validate "url..." --verbose

# Use configuration file for Steam credentials
echo '{"steamClient": {"enabled": true, "username": "your_username", "password": "your_password"}}' > config.json
cs2inspect decode "unmasked_url..." --config config.json
```

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

#### `ProtobufWriter`

Low-level protobuf encoding utilities.

```typescript
// Static methods
ProtobufWriter.encodeSticker(sticker: Sticker): Uint8Array
ProtobufWriter.encodeItemData(item: EconItem): Uint8Array
ProtobufWriter.createInspectUrl(item: EconItem): string
```

#### `ProtobufReader`

Low-level protobuf decoding utilities.

```typescript
// Static methods
ProtobufReader.decodeSticker(reader: ProtobufReader): Sticker
ProtobufReader.decodeMaskedData(hexData: string): EconItem
```

#### `Validator`

Input validation utilities.

```typescript
// Static methods
Validator.validateEconItem(item: any): ValidationResult
Validator.validateSticker(sticker: any): ValidationResult
Validator.validateHexData(hexData: string): ValidationResult
Validator.validateInspectUrl(url: string): ValidationResult
```

#### `SteamClient` & `SteamClientManager`

Steam client integration for unmasked URL support.

```typescript
// SteamClient (Singleton)
const client = SteamClient.getInstance(config?: SteamClientConfig);
await client.connect();
client.getStatus(): SteamClientStatus
client.isReady(): boolean
client.getQueueLength(): number
await client.inspectItem(urlInfo: AnalyzedInspectURL): Promise<any>
await client.disconnect();

// SteamClientManager (High-level interface)
const manager = new SteamClientManager(config?: SteamClientConfig);
await manager.initialize();
manager.isAvailable(): boolean
await manager.inspectUnmaskedUrl(urlInfo: AnalyzedInspectURL): Promise<SteamInspectResult>
manager.getStats(): SteamClientStats
```

### Types

#### `EconItem`

Complete item data structure matching CS2's `CEconItemPreviewDataBlock`:

```typescript
interface EconItem {
  // Required fields
  defindex: number | WeaponType;
  paintindex: number;
  paintseed: number;
  paintwear: number;
  
  // Optional fields
  accountid?: number;
  itemid?: number | bigint; // uint64 support
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
  entindex?: number; // signed int32
  petindex?: number;
  
  // Array fields
  stickers?: Sticker[];
  keychains?: Sticker[];
  variations?: Sticker[]; // New field
  
  // New fields
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
  highlight_reel?: number; // New field
}
```

### Configuration

```typescript
interface CS2InspectConfig {
  validateInput?: boolean; // Default: true
  maxUrlLength?: number; // Default: 2048
  maxCustomNameLength?: number; // Default: 100
  enableLogging?: boolean; // Default: false
  steamClient?: SteamClientConfig; // Steam client configuration
}

interface SteamClientConfig {
  enabled?: boolean; // Default: false
  username?: string; // Steam username
  password?: string; // Steam password
  apiKey?: string; // Steam API key (optional)
  rateLimitDelay?: number; // Default: 1500ms
  maxQueueSize?: number; // Default: 100
  requestTimeout?: number; // Default: 10000ms
  queueTimeout?: number; // Default: 30000ms
  serverAddress?: string; // CS2 server address (optional)
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

// Steam client error handling
try {
  await cs2.initializeSteamClient();
  const item = await cs2.decodeInspectUrlAsync(unmaskedUrl);
} catch (error) {
  if (error instanceof SteamAuthenticationError) {
    console.error('Steam authentication failed:', error.message);
  } else if (error instanceof SteamTimeoutError) {
    console.error('Steam request timed out:', error.message);
  } else if (error instanceof SteamQueueFullError) {
    console.error('Steam inspection queue is full:', error.message);
  }
}
```

## URL Types and Steam Client Usage

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

### Automatic Detection

```typescript
const cs2 = new CS2Inspect();

// Check if URL requires Steam client
if (cs2.requiresSteamClient(url)) {
  console.log('This URL requires Steam authentication');
  // Configure Steam client and use decodeInspectUrlAsync()
} else {
  console.log('This URL can be decoded directly');
  // Use decodeInspectUrl() for immediate decoding
}
```

### Best Practices

1. **For masked URLs**: Use `decodeInspectUrl()` for synchronous decoding
2. **For unmasked URLs**: Use `decodeInspectUrlAsync()` with Steam client configured
3. **For mixed usage**: Use `decodeInspectUrlAsync()` which handles both types
4. **Rate limiting**: Steam client automatically handles rate limiting (1.5s between requests)
5. **Error handling**: Always wrap Steam client operations in try-catch blocks

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

# Run in development mode
npm run dev

# Lint code
npm run lint
npm run lint:fix
```

## Examples

### Running Test Examples

The library includes comprehensive test examples that can be run individually or all together:

```bash
# Run all tests
npm run example
# or
npx ts-node examples/basic-usage.ts

# Run individual tests
npx ts-node examples/basic-usage.ts basic     # Basic item creation
npx ts-node examples/basic-usage.ts complex   # Complex items with stickers
npx ts-node examples/basic-usage.ts steam     # Steam client integration
npx ts-node examples/basic-usage.ts debug "real_url_here"  # Debug mode

# Available test names:
# basic, complex, class, error, bigint, unicode, config, url, steam, reuse
```

### Complete Item with All Fields

```typescript
const complexItem: EconItem = {
  accountid: 123456789,
  itemid: BigInt('9876543210'),
  defindex: WeaponType.AWP,
  paintindex: 309, // Dragon Lore
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

## Future Plans

The following features are planned for future releases:

### Performance Optimizations
- [ ] Buffer pre-allocation for better memory usage
- [ ] Caching system for frequently used items
- [ ] Streaming protobuf encoding/decoding for large datasets
- [ ] Compression support for URL size optimization

### Database Integration
- [ ] Weapon and skin name database
- [ ] Sticker name and rarity database
- [ ] Item validation against Steam's item database
- [ ] Price estimation integration

### Web API Integration
- [ ] Steam API client for additional item information
- [ ] Market price fetching
- [ ] Item history and provenance tracking
- [ ] Real-time item validation

### Framework Components
- [ ] React components for item display and URL generation
- [ ] Vue.js components
- [ ] Angular components
- [ ] Web Components for framework-agnostic usage

### Advanced Features
- [ ] Batch processing for multiple URLs
- [ ] URL shortening service integration
- [ ] QR code generation for URLs
- [ ] Image generation from item data
- [ ] 3D model integration

### Developer Tools
- [ ] VS Code extension
- [ ] Browser extension for URL analysis
- [ ] Postman collection for API testing
- [ ] GraphQL schema for item data

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## Troubleshooting

### Steam Client Issues

**Connection Timeouts:**
```bash
# Enable debug mode to see where the process stops
npx ts-node examples/basic-usage.ts debug "your_real_url_here"
```

**"Already logged on" Errors:**
- The Steam client reuses connections automatically
- This is expected behavior and not an error
- Multiple tests will share the same Steam connection

**Invalid URL Errors:**
- Ensure you're using real URLs from Steam Community Market or CS2 inventory
- Example URLs in documentation are placeholders and will timeout

**Authentication Failures:**
- Verify Steam credentials are correct
- Check if Steam Guard is enabled on your account
- Ensure your account owns CS2

### Debug Mode Features

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

Debug output includes:
- Steam connection process with timestamps
- URL analysis and parsing details
- Queue management and processing status
- Steam API call timing and responses
- Detailed error information with context

## License

MIT License - see LICENSE file for details.

## Changelog

### v2.1.0
- **Steam Client Integration**: Full support for unmasked URLs (community market/inventory links)
- **Debug Mode**: Comprehensive logging for troubleshooting Steam client issues
- **Enhanced Test Suite**: Individual test functions with debug capabilities
- **Connection Reuse**: Intelligent Steam client connection management
- **Extended CLI**: Steam client commands and debug options
- **Improved Error Handling**: Steam-specific error classes and context
- **Queue Management**: Automatic rate limiting and request queuing

### v2.0.0
- Complete rewrite with enhanced error handling
- Added support for all new CS2 protobuf fields
- Comprehensive input validation
- CLI tool with full feature set
- 100% TypeScript with full type definitions
- Extensive unit test coverage
- BigInt support for 64-bit integers
- Signed integer support for entindex field

### v1.0.0
- Initial release with basic protobuf support

## Support

If you encounter any issues or have questions, please:

1. Check the [documentation](https://github.com/sak0a/cs2-inspect-lib#readme)
2. Search [existing issues](https://github.com/sak0a/cs2-inspect-lib/issues)
3. Create a [new issue](https://github.com/sak0a/cs2-inspect-lib/issues/new) with detailed information

## Acknowledgments

- Original Python implementation inspiration
- CS2 community for protobuf research and documentation
- Steam API documentation and community reverse engineering efforts
