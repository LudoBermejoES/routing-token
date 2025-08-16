# Smart Token Routing

[![FoundryVTT Version](https://img.shields.io/badge/FoundryVTT-v13-green)](https://foundryvtt.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-orange)](module.json)

A FoundryVTT v13 module that enhances token movement with intelligent pathfinding using the **routinglib** library. Leverages routinglib's hybrid JavaScript/Rust architecture with WebAssembly for high-performance pathfinding calculations. Provides real-time pathfinding during token drag operations with centralized coordinate system integration and automatic fallback to direct movement when complex routing isn't available.

## ✨ Features

- **🧠 Intelligent Pathfinding**: Automatically calculates optimal routes around walls and obstacles using routinglib
- **🎯 Real-time Drag Pathfinding**: Calculates paths during token dragging with 50ms debounced updates
- **📏 Ruler Integration**: Updates token ruler to show calculated paths during drag operations  
- **⚡ Performance Optimized**: Asynchronous pathfinding with timeout management prevents UI blocking
- **🔄 Smart Fallback**: Creates normalized direct paths when complex pathfinding fails
- **🎯 Token Size Aware**: Supports tokens of all sizes with proper coordinate calculations
- **⚙️ Configurable**: Extensive settings for pathfinding behavior and debugging
- **🔧 Developer API**: Extensible API for other modules

## 📋 Requirements

- **FoundryVTT v13** or higher (minimum v11 supported)
- **[Routinglib v1.1.4+](https://foundryvtt.com/packages/routinglib)** module (automatically installed as dependency)
  - Provides hybrid JavaScript/Rust pathfinding engine with WebAssembly
  - Supports square grids, hex grids, and gridless scenes
  - Includes advanced wall analysis and caching system
  - Centralized coordinate helper for consistent coordinate transformations

## 🚀 Installation

### Method 1: Module Browser (Recommended)
1. Open FoundryVTT and navigate to the **Add-on Modules** tab
2. Click **Install Module**
3. Search for "Smart Token Routing"
4. Click **Install**

### Method 2: Manifest URL
1. Open FoundryVTT and navigate to the **Add-on Modules** tab
2. Click **Install Module**
3. Paste this manifest URL: `https://github.com/ludobermejo/routing-token/releases/latest/download/module.json`
4. Click **Install**

### Method 3: Manual Installation
1. Download the latest release zip file
2. Extract to your FoundryVTT `Data/modules/routing-token` directory
3. Restart FoundryVTT
4. Enable the module in your world's module settings

## 📖 How to Use

1. **Enable the Module**: Activate both "Smart Token Routing" and "Routinglib" in your world's module settings
2. **Configure Settings**: Adjust pathfinding behavior in the module settings menu  
3. **Move Tokens**: Simply drag tokens as usual - pathfinding calculations happen automatically during drag operations
4. **Visual Feedback**: Watch the token ruler update in real-time to show the calculated path
5. **Auto-Follow**: When enabled, tokens will follow the calculated waypoint path instead of moving directly

### 🎛️ Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| **Enable Pathfinding** | Toggles automatic pathfinding during token movement | ✅ Enabled |
| **Auto-Follow Calculated Paths** | When enabled, tokens automatically follow calculated routes instead of direct movement | ✅ Enabled |
| **Maximum Path Distance** | Limits pathfinding calculations for performance (1000 units) | 1000 |
| **Debug Mode** | Shows detailed pathfinding information in console | ❌ Disabled |

## 🎮 Supported Game Systems & Capabilities

Smart Token Routing works with **all FoundryVTT game systems** that use standard token movement. Based on routinglib's capabilities:

### Grid Type Support
| Grid Type | Performance | Capabilities |
|-----------|-------------|--------------|
| **Square/Hex Grids** | ⚡ Fast | Shortest possible paths, grid-snapped waypoints |
| **Gridless Scenes** | ⚡ Fast (small scenes)<br>🐌 Slower (large scenes) | Near-optimal paths, pixel-precise positioning |

### Advanced Features
- **Token Sizes**: All sizes from 1x1 to 4x4+ with size-aware pathfinding
- **Difficult Terrain**: Full support when used with Terrain Ruler
- **Elevation**: Multi-level scenes with wall height and token elevation
- **Wall Analysis**: Advanced wall detection and collision avoidance
- **Performance Caching**: Aggressive caching of walls, graphs, and paths

### Current Limitations (Roadmap Items)
- Even-sized tokens cannot squeeze through 1-square hallways *(under development)*
- Gridless difficult terrain currently unsupported *(planned)*
- Performance scales with scene complexity on very large maps

## 🔧 Developer API

Smart Token Routing provides a public API for other modules and integrates with routinglib's comprehensive API:

### Smart Token Routing API
```javascript
// Check if pathfinding is available
if (SmartTokenRouting.api.isAvailable()) {
    console.log("Pathfinding is ready!");
}

// Enable/disable pathfinding programmatically
SmartTokenRouting.api.setEnabled(false);

// Get module version
const version = SmartTokenRouting.api.getVersion();
```

### Routinglib Integration
Smart Token Routing leverages routinglib's full API for advanced pathfinding:

```javascript
// Direct access to routinglib pathfinding
const result = await window.routinglib.calculatePath(from, to, {
    token: token,
    maxDistance: 1000,
    ignoreTerrain: false
});

// Use centralized coordinate helper
const gridPos = window.routinglib.coordinateHelper.pixelToGrid(x, y, tokenData);
const pixelPos = window.routinglib.coordinateHelper.gridToPixel(gridX, gridY, tokenData);

// Debug and analysis tools
window.routinglib.enableDebugForPositions([{x: 10, y: 10}]);
window.routinglib.analyzeWalls();
```

### Coordinate System Integration
- **Centralized System**: Both modules use routinglib's coordinate helper
- **Token Size Aware**: Automatic token size detection and conversion
- **Grid Type Adaptive**: Handles square, hex, and gridless scenes seamlessly
- **Elevation Support**: Multi-level coordinate calculations

## 🐛 Troubleshooting

### Common Issues

**❓ Pathfinding not working**
- Ensure both Smart Token Routing and Routinglib modules are enabled
- Check that you're using FoundryVTT v13 or higher
- Verify the token you're moving is not locked or restricted
- Check console for "RoutingLib coordinate helper not available" errors

**❓ Performance issues on large maps**
- Reduce the "Maximum Path Distance" setting (default: 1000)
- The module uses 50ms debounced calculations to optimize performance
- Consider updating to a faster system if pathfinding is consistently slow

**❓ Tokens moving in unexpected ways**
- Enable debug mode to see pathfinding calculations in the console
- Check for walls or obstacles that might be blocking direct routes
- Verify your scene's wall configuration is correct
- The module automatically falls back to direct movement if pathfinding fails

**❓ Ruler not updating during drag**
- Ensure the token ruler system is working properly in FoundryVTT
- Check debug mode for ruler update errors
- Verify that drag operations are properly triggering pathfinding

### Debug Mode

Enable debug mode in the module settings to see:
- Real-time pathfinding status and coordinate calculations
- Grid and pixel coordinate conversions
- Path calculation results and fallback behavior
- Ruler update operations and drag state tracking
- Console logging of all pathfinding operations

## 🤝 Compatibility

### ✅ Compatible Modules
- **Routinglib** (required dependency)
- **Drag Ruler** - Enhanced functionality when both are active
- **Terrain Ruler** - Supports difficult terrain calculations
- **Wall Height** - Respects wall elevation settings
- **Levels** - Works with multi-level scenes

### ⚠️ Known Limitations
These limitations are inherited from routinglib's current architecture:

#### Pathfinding Constraints
- **Even-sized tokens**: Cannot squeeze through 1-square hallways *(being addressed in internal grid system roadmap)*
- **Complex scenes**: Performance scales with wall complexity on very large maps
- **Gridless terrain**: Difficult terrain not yet supported on gridless scenes

#### Technical Limitations  
- **Coordinate precision**: Grid-snapped waypoints on gridded scenes
- **Cache dependencies**: Performance depends on effective wall/graph caching
- **WASM initialization**: Brief delay during first pathfinding operation

#### Future Improvements
- **Multi-scale pathfinding**: Hierarchical A* for large maps *(roadmap)*
- **Internal grid system**: 4x subdivision for better narrow passage navigation *(roadmap)*
- **Enhanced terrain**: Full difficult terrain support on all grid types *(planned)*

## 📜 License

This module is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute it according to the license terms.

## 🙏 Acknowledgments

- **[Routinglib](https://github.com/manuelVo/foundryvtt-routinglib)** by Manuel Vögele - The core hybrid JavaScript/Rust pathfinding engine with WebAssembly optimization
- **Ludo Bermejo** - Coordinate system integration and FoundryVTT v13 compatibility enhancements
- **[Drag Ruler](https://github.com/manuelVo/foundryvtt-drag-ruler)** - Original inspiration for advanced token movement features  
- **FoundryVTT Community** - Extensive testing, feedback, and feature suggestions
- **Rust/WASM Ecosystem** - High-performance pathfinding algorithms and WebAssembly integration

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ludobermejo/routing-token/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ludobermejo/routing-token/discussions)
- **Email**: [ludobermejo@gmail.com](mailto:ludobermejo@gmail.com)

## 🚀 Contributing

Contributions are welcome! Please feel free to:
- Report bugs or suggest features via GitHub Issues
- Submit pull requests for bug fixes or enhancements
- Help translate the module into other languages
- Improve documentation or examples

## 📝 Changelog

### Version 1.0.0
- ✨ Initial release
- 🧠 Intelligent pathfinding integration with FoundryVTT v13 using routinglib
- 🎯 Real-time drag pathfinding with 50ms debounced calculations
- 📏 Token ruler integration for visual feedback during drag operations
- 🔄 Smart fallback system with normalized direct paths
- 🎯 Token size awareness for proper coordinate calculations
- ⚙️ Comprehensive settings panel with auto-follow toggle
- 🔧 Public API for module integration

---

**Made with ❤️ by [Ludo Bermejo](mailto:ludobermejo@gmail.com)**

*Enhance your FoundryVTT experience with intelligent token movement!*