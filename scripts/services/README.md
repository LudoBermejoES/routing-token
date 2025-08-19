# Smart Token Routing Services

This directory contains the refactored services for the Smart Token Routing module, breaking down the monolithic main.js into smaller, focused components.

## Services Overview

### SettingsService (`settings-service.js`)
- **Purpose**: Manages all game settings registration and retrieval
- **Responsibilities**:
  - Register module settings with FoundryVTT
  - Provide getter/setter methods for settings
  - Handle setting change notifications
  - Provide convenience methods for common settings

### CoordinateService (`coordinate-service.js`)
- **Purpose**: Wraps routinglib coordinate helper for centralized coordinate conversions
- **Responsibilities**:
  - Convert between pixel and grid coordinates
  - Provide access to routinglib coordinate helper
  - Calculate distances between positions
  - Validate coordinate inputs

### TokenMovementService (`token-movement-service.js`)
- **Purpose**: Handles token movement and animations through waypoints
- **Responsibilities**:
  - Execute waypoint-based token movement
  - Update token rulers during movement
  - Track animating tokens
  - Clean up animation states

### PathfindingService (`pathfinding-service.js`)
- **Purpose**: Handles all pathfinding calculations and route optimization
- **Responsibilities**:
  - Calculate optimal paths using routinglib
  - Find accessible destinations when targets are blocked
  - Create fallback direct paths
  - Manage pathfinding jobs
  - Interface with drag operations

### DragHandlerService (`drag-handler-service.js`)
- **Purpose**: Manages token drag operations and real-time pathfinding
- **Responsibilities**:
  - Set up drag event hooks
  - Track drag states per token
  - Handle drag start/move/drop events
  - Coordinate with pathfinding service

### HooksManagerService (`hooks-manager-service.js`)
- **Purpose**: Centralizes all Foundry VTT hook management and event handling
- **Responsibilities**:
  - Register and manage all FoundryVTT hooks
  - Handle canvas and token events
  - Provide cleanup functionality
  - Coordinate between services during events

## Architecture Benefits

1. **Separation of Concerns**: Each service has a single, well-defined responsibility
2. **Testability**: Services can be unit tested independently
3. **Maintainability**: Easier to locate and modify specific functionality
4. **Reusability**: Services can be used independently by other parts of the module
5. **Dependency Injection**: Services are injected as dependencies, improving modularity

## Service Dependencies

```
SmartTokenRouting
├── SettingsService (no dependencies)
├── CoordinateService (SettingsService)
├── TokenMovementService (SettingsService)
├── PathfindingService (SettingsService, CoordinateService, TokenMovementService)
├── DragHandlerService (SettingsService, PathfindingService)
└── HooksManagerService (SettingsService, PathfindingService, DragHandlerService)
```

## Usage

All services are instantiated and managed by the main `SmartTokenRouting` class. They can be accessed via the public API:

```javascript
const services = SmartTokenRouting.api.getServices();
console.log(services.settings.isDebugMode());
```

## Legacy Compatibility

The refactored main class maintains backward compatibility with the original API, ensuring existing integrations continue to work without modification.