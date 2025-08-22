# CS2 Inspect Library Examples

This directory contains comprehensive examples demonstrating all features of the CS2 Inspect Library, including the new Steam client integration for unmasked URLs.

## Files Overview

### 📝 **basic-usage.ts**
Comprehensive test suite with individual test functions covering all library features:
- **Test 1**: Basic item creation and decoding (masked URLs)
- **Test 2**: Complex items with stickers, keychains, and variations
- **Test 3**: CS2Inspect class features and validation
- **Test 4**: Error handling and validation errors
- **Test 5**: BigInt and signed integer support
- **Test 6**: Unicode support in custom names
- **Test 7**: Configuration management
- **Test 8**: URL normalization and information extraction
- **Test 9**: Steam client integration (requires credentials)
- **Test 10**: Real URL testing (optional)

**Run all tests:**
```bash
npm run example
# or
npx ts-node examples/basic-usage.ts
```

**Run individual tests:**
```bash
npm run example:basic     # Test 1: Basic item creation
npm run example:complex   # Test 2: Complex items
npm run example:steam     # Test 9: Steam client
npm run example:error     # Test 4: Error handling
npm run example:bigint    # Test 5: BigInt support
npm run example:unicode   # Test 6: Unicode support
npm run example:config    # Test 7: Configuration
npm run example:url       # Test 8: URL utilities
```

**Debug Mode:**
```bash
# Debug test with comprehensive logging (requires real URL and credentials)
npx ts-node examples/basic-usage.ts debug "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20REAL_URL_HERE"

# Test Steam client connection reuse
npx ts-node examples/basic-usage.ts reuse

# Test with real URL (basic mode)
npx ts-node examples/basic-usage.ts real "REAL_URL_HERE"
```

### 🔧 **steam-client-usage.ts**
Focused examples for Steam client integration:
- Steam client setup and configuration
- Environment variable usage for security
- URL type detection and handling
- CS2 server connection
- Error handling for Steam operations
- Dynamic configuration updates

**Run with:**
```bash
npx ts-node examples/steam-client-usage.ts
```

### 📋 **cli-usage-examples.md**
Complete CLI usage guide with examples:
- Basic encode/decode operations
- Steam client CLI integration
- Configuration file usage
- Batch processing scripts
- Security best practices
- Troubleshooting guide

## Quick Start

### 1. Basic Usage (Masked URLs)
```typescript
import { CS2Inspect, WeaponType } from 'cs2-inspect-lib';

const cs2 = new CS2Inspect();

// Create an inspect URL
const item = {
    defindex: WeaponType.AK_47,
    paintindex: 44, // Fire Serpent
    paintseed: 661,
    paintwear: 0.15
};

const url = cs2.createInspectUrl(item);
console.log('Generated URL:', url);

// Decode the URL
const decoded = cs2.decodeInspectUrl(url);
console.log('Decoded item:', decoded);
```

### 2. Steam Client Integration (Unmasked URLs)

**Step 1: Configure Steam Credentials**
Edit `examples/basic-usage.ts` and replace the placeholders:
```typescript
const STEAM_CONFIG = {
    enabled: true,
    username: 'your_actual_steam_username', // Replace this
    password: 'your_actual_steam_password', // Replace this
    rateLimitDelay: 1500,
    maxQueueSize: 100,
    requestTimeout: 30000,
    queueTimeout: 60000,
    enableLogging: true // Enable debug logging for troubleshooting
};
```

**Step 2: Run Steam Client Tests**
```bash
# Test Steam client integration
npm run example:steam

# Test with a real unmasked URL
npx ts-node examples/basic-usage.ts real "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198123456789A987654321D456789123"

# Debug mode with comprehensive logging
npx ts-node examples/basic-usage.ts debug "REAL_URL_HERE"
```

**Step 3: Debug Mode (Troubleshooting)**
```bash
# Enable debug mode for detailed logging
npx ts-node examples/basic-usage.ts debug "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20REAL_URL_HERE"

# Debug output shows:
# - Steam connection process with timestamps
# - URL analysis and parsing details
# - Queue management and processing
# - Steam API call timing and responses
# - Detailed error information with context
```

**Step 3: Programmatic Usage**
```typescript
import { CS2Inspect } from 'cs2-inspect-lib';

const cs2 = new CS2Inspect({
    steamClient: {
        enabled: true,
        username: 'your_steam_username',
        password: 'your_steam_password',
    }
});

async function decodeUnmaskedUrl() {
    await cs2.initializeSteamClient();
    const unmaskedUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198123456789A987654321D456789123';
    const result = await cs2.decodeInspectUrlAsync(unmaskedUrl);
    console.log('Steam inspection result:', result);
    await cs2.disconnectSteamClient();
}
```

### 3. CLI Usage
```bash
# Basic encoding
cs2inspect encode --weapon AK_47 --paint 44 --seed 661 --float 0.15

# Decode masked URL
cs2inspect decode "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20001807202C389AB3E6F003409505AD253230"

# Decode unmasked URL with Steam client
cs2inspect decode "unmasked_url..." \
  --enable-steam \
  --steam-username YOUR_USERNAME \
  --steam-password YOUR_PASSWORD

# Check Steam client status
cs2inspect steam-status --enable-steam
```

## Prerequisites

### For Basic Usage
- Node.js 16+ or TypeScript
- No additional dependencies required

### For Steam Client Features
- Valid Steam account credentials
- Steam client dependencies (automatically installed):
  - `steam-user`
  - `globaloffensive`
  - `@types/globaloffensive`

## Security Notes

### 🔒 **Credential Management**
Never hardcode Steam credentials in your code. Use one of these secure methods:

**Environment Variables (Recommended):**
```bash
export STEAM_USERNAME=your_username
export STEAM_PASSWORD=your_password
```

**Configuration File:**
```json
{
  "steamClient": {
    "enabled": true,
    "username": "YOUR_USERNAME",
    "password": "YOUR_PASSWORD"
  }
}
```

**Runtime Configuration:**
```typescript
const cs2 = new CS2Inspect({
    steamClient: {
        enabled: true,
        username: process.env.STEAM_USERNAME,
        password: process.env.STEAM_PASSWORD
    }
});
```

## URL Types

### Masked URLs (Protobuf Data)
- Contain encoded item data
- Can be decoded without Steam client
- Generated by `createInspectUrl()`
- Example: `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20001807202C389AB3E6F003409505AD253230`

### Unmasked URLs (Community Market/Inventory)
- Reference items in Steam's database
- Require Steam client authentication
- Come from market listings or inventory links
- Examples:
  - Market: `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M123456789A987654321D456789123`
  - Inventory: `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198123456789A987654321D456789123`

## Error Handling

The examples demonstrate comprehensive error handling for:
- **Validation errors** - Invalid item properties
- **Steam authentication errors** - Invalid credentials
- **Steam timeout errors** - Network or server issues
- **Steam queue errors** - Too many concurrent requests
- **URL format errors** - Invalid inspect URLs

## Performance Considerations

### Steam Client
- **Rate limiting**: 1.5 seconds between requests (configurable)
- **Queue management**: Automatic queuing of inspection requests
- **Connection pooling**: Singleton Steam client instance
- **Timeout handling**: Configurable request and queue timeouts

### Memory Usage
- **BigInt support**: Proper handling of 64-bit integers
- **Buffer management**: Efficient protobuf encoding/decoding
- **Object pooling**: Reuse of validation and parsing objects

## Troubleshooting

### Common Issues

1. **Steam Authentication Failed**
   - Verify credentials are correct
   - Check if Steam Guard is enabled
   - Ensure account has CS2 in library

2. **TypeScript Compilation Errors**
   - Update to Node.js 16+
   - Install required dependencies: `npm install`
   - Check TypeScript version compatibility

3. **URL Decoding Failures**
   - Verify URL format is correct
   - Check if URL requires Steam client
   - Ensure Steam client is initialized for unmasked URLs

4. **Performance Issues**
   - Adjust Steam client rate limiting
   - Reduce queue size for memory constraints
   - Use connection pooling for multiple requests

### Getting Help

- Check the main README.md for detailed API documentation
- Review test files for additional usage examples
- Open an issue on GitHub for bugs or feature requests

## Contributing

When adding new examples:
1. Follow the existing code style and structure
2. Include comprehensive error handling
3. Add TypeScript type annotations
4. Test with both masked and unmasked URLs
5. Document security considerations
6. Update this README with new examples
