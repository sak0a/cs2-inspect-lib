# CLI Usage Examples

This file contains comprehensive examples of using the CS2 Inspect CLI tool with all available features, including Steam client integration.

## Basic Operations

### Encode (Create) Inspect URLs

```bash
# Basic weapon encoding
cs2inspect encode --weapon AK_47 --paint 44 --seed 661 --float 0.15

# Complex item with stickers and custom name
cs2inspect encode \
  --weapon AK_47 \
  --paint 44 \
  --seed 661 \
  --float 0.15 \
  --rarity COVERT \
  --name "Fire Serpent" \
  --sticker "0:5032:0.1:1.0:0.0:0" \
  --sticker "1:5033:0.0:1.0:0.0:0"

# With keychains and variations
cs2inspect encode \
  --weapon M4A4 \
  --paint 309 \
  --seed 555 \
  --float 0.1 \
  --keychain "0:20:0.0:1.0:0.0:0.0:0.0:0.0:0" \
  --variation "0:100:0.0:1.0:0.0:0"

# From JSON file
echo '{
  "defindex": 7,
  "paintindex": 44,
  "paintseed": 661,
  "paintwear": 0.15,
  "customname": "My AK",
  "stickers": [
    {"slot": 0, "sticker_id": 5032, "wear": 0.1}
  ]
}' > item.json

cs2inspect encode --input item.json
```

### Decode Inspect URLs

```bash
# Decode masked URL (protobuf data)
cs2inspect decode "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20001807202C389AB3E6F003409505AD253230"

# Decode with different output formats
cs2inspect decode "url..." --format table
cs2inspect decode "url..." --format yaml
cs2inspect decode "url..." --format json

# Save output to file
cs2inspect decode "url..." --output decoded.json

# Raw protobuf output
cs2inspect decode "url..." --raw
```

## Steam Client Integration

### Setup Steam Credentials

```bash
# Method 1: Command line arguments
cs2inspect decode "unmasked_url..." \
  --enable-steam \
  --steam-username YOUR_USERNAME \
  --steam-password YOUR_PASSWORD

# Method 2: Environment variables (recommended for security)
export STEAM_USERNAME=your_username
export STEAM_PASSWORD=your_password

cs2inspect decode "unmasked_url..." --enable-steam

# Method 3: Configuration file
echo '{
  "steamClient": {
    "enabled": true,
    "username": "YOUR_USERNAME",
    "password": "YOUR_PASSWORD",
    "rateLimitDelay": 2000,
    "maxQueueSize": 50
  }
}' > steam-config.json

cs2inspect decode "unmasked_url..." --config steam-config.json
```

### Decode Unmasked URLs

```bash
# Market listing URL
cs2inspect decode "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M123456789A987654321D456789123" \
  --enable-steam \
  --steam-username YOUR_USERNAME \
  --steam-password YOUR_PASSWORD \
  --verbose

# Inventory item URL
cs2inspect decode "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198123456789A987654321D456789123" \
  --enable-steam \
  --steam-username YOUR_USERNAME \
  --steam-password YOUR_PASSWORD

# With specific CS2 server
cs2inspect decode "unmasked_url..." \
  --enable-steam \
  --steam-username YOUR_USERNAME \
  --steam-password YOUR_PASSWORD \
  --steam-server "127.0.0.1:27015"

# Force Steam client even for masked URLs (for testing)
cs2inspect decode "masked_url..." \
  --enable-steam \
  --steam-username YOUR_USERNAME \
  --steam-password YOUR_PASSWORD \
  --force-steam
```

### Steam Client Status

```bash
# Check Steam client status
cs2inspect steam-status

# With Steam credentials
cs2inspect steam-status \
  --enable-steam \
  --steam-username YOUR_USERNAME \
  --steam-password YOUR_PASSWORD

# Using config file
cs2inspect steam-status --config steam-config.json
```

## Validation and Analysis

```bash
# Validate an inspect URL
cs2inspect validate "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20..."

# Get URL information
cs2inspect info "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20..."

# Verbose validation
cs2inspect validate "url..." --verbose
```

## Advanced Usage

### Debug Mode and Troubleshooting

```bash
# Enable verbose logging for debugging
cs2inspect decode "unmasked_url..." \
  --enable-steam \
  --steam-username YOUR_USERNAME \
  --steam-password YOUR_PASSWORD \
  --verbose

# Debug Steam client connection issues
cs2inspect steam-status \
  --enable-steam \
  --steam-username YOUR_USERNAME \
  --steam-password YOUR_PASSWORD \
  --verbose

# Verbose validation with detailed error messages
cs2inspect validate "problematic_url..." --verbose

# Debug URL analysis
cs2inspect info "url..." --verbose
```

### Batch Processing

```bash
# Process multiple URLs from file
echo "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20001807202C389AB3E6F003409505AD253230
steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M123456789A987654321D456789123
steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198123456789A987654321D456789123" > urls.txt

# Process each URL (bash script)
while IFS= read -r url; do
  echo "Processing: $url"
  cs2inspect decode "$url" --enable-steam --steam-username YOUR_USERNAME --steam-password YOUR_PASSWORD
done < urls.txt
```

### Configuration Files

```bash
# Complete configuration file
echo '{
  "validateInput": true,
  "maxUrlLength": 2048,
  "maxCustomNameLength": 100,
  "enableLogging": true,
  "steamClient": {
    "enabled": true,
    "username": "YOUR_USERNAME",
    "password": "YOUR_PASSWORD",
    "rateLimitDelay": 1500,
    "maxQueueSize": 100,
    "requestTimeout": 10000,
    "queueTimeout": 30000,
    "serverAddress": "127.0.0.1:27015"
  }
}' > complete-config.json

# Use configuration for all operations
cs2inspect decode "url..." --config complete-config.json
cs2inspect encode --weapon AK_47 --paint 44 --seed 661 --float 0.15 --config complete-config.json
cs2inspect steam-status --config complete-config.json
```

### Error Handling

```bash
# Verbose error output
cs2inspect decode "invalid_url" --verbose

# Handle different URL types gracefully
cs2inspect decode "url..." --enable-steam --steam-username YOUR_USERNAME --steam-password YOUR_PASSWORD || echo "Failed to decode"

# Test Steam connection
cs2inspect steam-status --enable-steam --steam-username YOUR_USERNAME --steam-password YOUR_PASSWORD
if [ $? -eq 0 ]; then
  echo "Steam client is working"
  cs2inspect decode "unmasked_url..." --enable-steam --steam-username YOUR_USERNAME --steam-password YOUR_PASSWORD
else
  echo "Steam client not available, using protobuf only"
  cs2inspect decode "masked_url..."
fi
```

## Security Best Practices

### Environment Variables

```bash
# Set up environment variables (add to ~/.bashrc or ~/.zshrc)
export STEAM_USERNAME=your_steam_username
export STEAM_PASSWORD=your_steam_password

# Use in commands
cs2inspect decode "unmasked_url..." --enable-steam
cs2inspect steam-status --enable-steam
```

### Configuration File Security

```bash
# Create secure config file (readable only by user)
touch steam-config.json
chmod 600 steam-config.json
echo '{
  "steamClient": {
    "enabled": true,
    "username": "YOUR_USERNAME",
    "password": "YOUR_PASSWORD"
  }
}' > steam-config.json

# Use secure config
cs2inspect decode "url..." --config steam-config.json
```

### Docker Usage

```bash
# Using Docker with environment variables
docker run -e STEAM_USERNAME=your_username -e STEAM_PASSWORD=your_password \
  cs2-inspect-lib \
  cs2inspect decode "unmasked_url..." --enable-steam

# Using Docker with config file
docker run -v $(pwd)/steam-config.json:/app/config.json \
  cs2-inspect-lib \
  cs2inspect decode "url..." --config /app/config.json
```

## Integration Examples

### Shell Scripts

```bash
#!/bin/bash
# decode-item.sh - Decode any CS2 inspect URL

URL="$1"
if [ -z "$URL" ]; then
  echo "Usage: $0 <inspect_url>"
  exit 1
fi

# Check if URL requires Steam client
if cs2inspect info "$URL" | grep -q "unmasked"; then
  echo "Unmasked URL detected, using Steam client..."
  cs2inspect decode "$URL" --enable-steam --verbose
else
  echo "Masked URL detected, using protobuf decoder..."
  cs2inspect decode "$URL" --verbose
fi
```

### Node.js Integration

```bash
# Install globally for Node.js projects
npm install -g cs2-inspect-lib

# Use in package.json scripts
echo '{
  "scripts": {
    "decode": "cs2inspect decode",
    "encode": "cs2inspect encode",
    "steam-status": "cs2inspect steam-status --enable-steam"
  }
}' > package.json

# Run scripts
npm run decode -- "url..."
npm run steam-status
```

## Troubleshooting

```bash
# Test basic functionality
cs2inspect encode --weapon AK_47 --paint 44 --seed 661 --float 0.15
cs2inspect decode "$(cs2inspect encode --weapon AK_47 --paint 44 --seed 661 --float 0.15)"

# Test Steam client connection
cs2inspect steam-status --enable-steam --steam-username YOUR_USERNAME --steam-password YOUR_PASSWORD --verbose

# Debug Steam client issues
cs2inspect decode "unmasked_url..." --enable-steam --steam-username YOUR_USERNAME --steam-password YOUR_PASSWORD --verbose

# Check version and help
cs2inspect --version
cs2inspect --help
cs2inspect decode --help
cs2inspect steam-status --help
```

## Notes

- Replace `YOUR_USERNAME` and `YOUR_PASSWORD` with your actual Steam credentials
- Unmasked URLs require Steam client authentication
- Use environment variables or secure config files for credentials
- The `--verbose` flag provides detailed output for debugging
- Steam client operations may take longer due to network communication and rate limiting
- Some example URLs are placeholders and may not exist in Steam's database
