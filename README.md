# Smart Token Routing

[![FoundryVTT Version](https://img.shields.io/badge/FoundryVTT-v13-green)](https://foundryvtt.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-orange)](module.json)

A FoundryVTT v13 module that enhances token movement with intelligent pathfinding using the routinglib library. Provides real-time pathfinding calculations during token drag operations with automatic fallback to direct movement when complex routing isn't available.

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

- **FoundryVTT v13** or higher
- **[Routinglib](https://foundryvtt.com/packages/routinglib)** module (automatically installed as dependency)

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

## 🎮 Supported Game Systems

Smart Token Routing works with **all FoundryVTT game systems** that use standard token movement. It integrates seamlessly with:

- **Grid Types**: Square grids, hex grids, and gridless scenes
- **Token Sizes**: All token sizes from small (1x1) to huge (4x4+)
- **Terrain**: Supports difficult terrain when used with Terrain Ruler
- **Elevation**: Works with wall height and token elevation systems

## 🔧 Developer API

Smart Token Routing provides a public API for other modules:

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
- Very complex scenes with thousands of walls may experience slower pathfinding
- Pathfinding accuracy depends on the quality of wall placement in your scenes
- Some edge cases with irregular token shapes may not be perfectly handled

## 📜 License

This module is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute it according to the license terms.

## 🙏 Acknowledgments

- **[Routinglib](https://github.com/manuelVo/foundryvtt-routinglib)** by Manuel Vögele - The core pathfinding engine
- **FoundryVTT Community** - For extensive testing and feedback
- **[Drag Ruler](https://github.com/manuelVo/foundryvtt-drag-ruler)** - Inspiration for token movement enhancements

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