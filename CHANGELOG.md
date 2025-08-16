# Changelog

All notable changes to Smart Token Routing will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-10

### Added
- ✨ **Initial Release**: Smart Token Routing module for FoundryVTT v13
- 🧠 **Intelligent Pathfinding**: Automatic route calculation using routinglib integration
- 🎯 **FoundryVTT v13 Integration**: Seamless integration with new token drag measurement system
- ⚡ **Asynchronous Processing**: Non-blocking pathfinding calculations with promise-based API
- 🎨 **Visual Feedback System**: Optional path visualization with animated routes and waypoints
- ⚙️ **Comprehensive Settings**: Configurable pathfinding behavior and performance options
- 🌍 **Multi-language Support**: Full localization in English and Spanish
- 🔧 **Developer API**: Public API for integration with other modules
- 📊 **Debug Mode**: Detailed pathfinding information and performance monitoring
- 🎮 **Universal Compatibility**: Support for all grid types (square, hex, gridless)
- 🏔️ **Terrain Support**: Integration with Terrain Ruler for difficult terrain calculations
- 📏 **Token Size Support**: Pathfinding for all token sizes from 1x1 to large creatures
- 🚀 **Performance Optimization**: Configurable maximum path distance and caching
- 🎭 **Status Indicators**: Real-time pathfinding status display
- 📝 **Extensive Documentation**: Complete README with usage examples and troubleshooting

### Features
- **Automatic Pathfinding**: Calculates optimal routes when dragging tokens
- **Obstacle Avoidance**: Smart navigation around walls and barriers
- **Path Visualization**: Animated path display with waypoint markers
- **Performance Controls**: Adjustable pathfinding limits and timeouts
- **Debug Tools**: Console logging and visual debugging overlays
- **API Integration**: Hooks and events for module developers
- **Settings Panel**: User-friendly configuration interface
- **Error Handling**: Graceful fallback to direct movement when pathfinding fails
- **Cancellation Support**: Ability to cancel ongoing pathfinding operations
- **Memory Management**: Automatic cleanup of pathfinding resources

### Technical Implementation
- **Hook System**: Integration with FoundryVTT's preUpdateToken and controlToken hooks
- **Promise-based API**: Asynchronous pathfinding with proper error handling
- **Coordinate System**: Support for both grid and pixel coordinate systems
- **Caching Strategy**: Efficient management of pathfinding promises and results
- **Resource Management**: Automatic cleanup on canvas changes and module disable
- **Cross-module Communication**: Clean API for interaction with other modules
- **Performance Monitoring**: Debug tools for pathfinding performance analysis

### Dependencies
- **FoundryVTT**: Minimum version 13
- **Routinglib**: Required dependency for pathfinding calculations

### Compatibility
- ✅ **FoundryVTT v13**: Fully tested and compatible
- ✅ **All Game Systems**: Works with any FoundryVTT game system
- ✅ **All Grid Types**: Square grids, hex grids, and gridless scenes
- ✅ **Routinglib**: Tested with version 1.1.0+
- ✅ **Terrain Ruler**: Enhanced terrain support when both modules are active
- ✅ **Drag Ruler**: Compatible and provides enhanced functionality
- ✅ **Wall Height**: Respects wall elevation settings
- ✅ **Levels**: Multi-level scene support

### Known Issues
- None identified in initial release

### Breaking Changes
- None (initial release)

### Deprecated
- None (initial release)

### Removed
- None (initial release)

### Fixed
- None (initial release)

### Security
- No security issues identified

---

## Release Notes Template for Future Versions

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features and functionality

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Features removed in this release

### Fixed
- Bug fixes

### Security
- Security vulnerability fixes
```