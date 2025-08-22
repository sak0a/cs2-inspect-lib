# CS2 Inspect Library

A comprehensive TypeScript library for encoding and decoding Counter-Strike 2 inspect URLs with full protobuf support, validation, and error handling.

## Features

- ✅ **Complete Protobuf Support** - Full implementation of `CEconItemPreviewDataBlock` message
- ✅ **Input Validation** - Comprehensive validation with detailed error messages
- ✅ **Error Handling** - Robust error handling with custom error types
- ✅ **TypeScript Support** - Full TypeScript support with comprehensive type definitions
- ✅ **CLI Tool** - Command-line interface for easy usage
- ✅ **Unit Tests** - Comprehensive test coverage
- ✅ **New Fields Support** - Support for all new CS2 fields including `highlight_reel`, `style`, `variations`, `upgrade_level`
- ✅ **BigInt Support** - Proper handling of 64-bit integers
- ✅ **Signed Integer Support** - Correct handling of signed int32 fields like `entindex`

## Installation

```bash
npm install cs2-inspect-url-enhanced
```

## Quick Start

### Basic Usage

```typescript
import { CS2Inspect, WeaponType, ItemRarity } from 'cs2-inspect-url-enhanced';

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
import { createInspectUrl, decodeInspectUrl } from 'cs2-inspect-url-enhanced';

// Quick usage without instantiating the class
const url = createInspectUrl(item);
const decoded = decodeInspectUrl(url);
```

### With Validation

```typescript
import { CS2Inspect, validateItem } from 'cs2-inspect-url-enhanced';

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

## CLI Usage

The library includes a powerful command-line tool:

```bash
# Install globally for CLI usage
npm install -g cs2-inspect-url-enhanced

# Decode an inspect URL
cs2inspect decode "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20..."

# Create an inspect URL
cs2inspect encode --weapon AK_47 --paint 44 --seed 661 --float 0.15

# Validate an inspect URL
cs2inspect validate "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20..."

# Get URL information
cs2inspect info "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20..."

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

# Decode and format as table
cs2inspect decode "url..." --format table

# Validate with verbose output
cs2inspect validate "url..." --verbose
```

## API Reference

### Main Classes

#### `CS2Inspect`

Main API class for encoding and decoding inspect URLs.

```typescript
const cs2 = new CS2Inspect(config?: CS2InspectConfig);

// Methods
cs2.createInspectUrl(item: EconItem): string
cs2.decodeInspectUrl(url: string): EconItem
cs2.analyzeUrl(url: string): AnalyzedInspectURL
cs2.validateItem(item: any): ValidationResult
cs2.validateUrl(url: string): ValidationResult
cs2.isValidUrl(url: string): boolean
cs2.normalizeUrl(url: string): string
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
}
```

## Error Handling

The library provides comprehensive error handling with custom error types:

```typescript
import { CS2InspectError, ValidationError, EncodingError, DecodingError } from 'cs2-inspect-url-enhanced';

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
git clone https://github.com/yourusername/cs2-inspect-url-enhanced.git
cd cs2-inspect-url-enhanced

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
import { CS2Inspect, ValidationError, DecodingError } from 'cs2-inspect-url-enhanced';

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

## License

MIT License - see LICENSE file for details.

## Changelog

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

1. Check the [documentation](https://github.com/yourusername/cs2-inspect-url-enhanced#readme)
2. Search [existing issues](https://github.com/yourusername/cs2-inspect-url-enhanced/issues)
3. Create a [new issue](https://github.com/yourusername/cs2-inspect-url-enhanced/issues/new) with detailed information

## Acknowledgments

- Original Python implementation inspiration
- CS2 community for protobuf research and documentation
- Steam API documentation and community reverse engineering efforts
