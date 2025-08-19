/**
 * Smart Token Routing for FoundryVTT v13 - Refactored
 * Uses native FoundryVTT pathfinding enhanced with routinglib for optimal token movement
 * 
 * @author Ludo Bermejo <ludobermejo@gmail.com>
 * @version 1.0.0
 */

import { SettingsService } from './services/settings-service.js';
import { CoordinateService } from './services/coordinate-service.js';
import { TokenMovementService } from './services/token-movement-service.js';
import { PathfindingService } from './services/pathfinding-service.js';
import { DragHandlerService } from './services/drag-handler-service.js';
import { HooksManagerService } from './services/hooks-manager-service.js';
import { CombatService } from './services/combat-service.js';
import { MovementCalculationService } from './services/movement-calculation-service.js';

const MODULE_NAME = "routing-token";

class SmartTokenRouting {
    constructor() {
        console.log(`[${MODULE_NAME}] Initializing Smart Token Routing v1.0.0 with Real-time Drag Pathfinding`);
        
        // Initialize services
        this.settingsService = new SettingsService(MODULE_NAME);
        this.coordinateService = new CoordinateService(MODULE_NAME, this.settingsService);
        this.tokenMovementService = new TokenMovementService(MODULE_NAME, this.settingsService);
        this.pathfindingService = new PathfindingService(
            MODULE_NAME, 
            this.settingsService, 
            this.coordinateService, 
            this.tokenMovementService
        );
        this.dragHandler = new DragHandlerService(
            MODULE_NAME, 
            this.settingsService, 
            this.pathfindingService
        );
        this.movementCalculationService = new MovementCalculationService(MODULE_NAME);
        this.combatService = new CombatService(MODULE_NAME, this.movementCalculationService);
        this.hooksManager = new HooksManagerService(
            MODULE_NAME,
            this.settingsService,
            this.pathfindingService,
            this.dragHandler,
            this.combatService,
            this.movementCalculationService
        );

        // Set up settings change listeners
        this.setupSettingsListeners();
    }

    /**
     * Initialize the module
     */
    initialize() {
        this.settingsService.registerSettings();
        this.pathfindingService.initialize();
        this.hooksManager.setupHooks();
        
        if (this.settingsService.isDebugMode()) {
            console.log(`[${MODULE_NAME}] Smart Token Routing initialized with all services`);
        }
    }

    /**
     * Set up listeners for settings changes
     */
    setupSettingsListeners() {
        // Listen for pathfinding enable/disable changes
        this.settingsService.addListener("enablePathfinding", (enabled) => {
            if (this.settingsService.isDebugMode()) {
                console.log(`[${MODULE_NAME}] Pathfinding ${enabled ? 'enabled' : 'disabled'} via settings`);
            }
        });
    }

    /**
     * Public API for other modules
     */
    static get api() {
        return {
            /**
             * Enable or disable pathfinding
             * @param {boolean} enabled 
             */
            setEnabled(enabled) {
                const smartRouting = game.modules.get(MODULE_NAME)?.smartRouting;
                if (smartRouting) {
                    smartRouting.settingsService.set("enablePathfinding", enabled);
                }
            },

            /**
             * Check if pathfinding is available
             * @returns {boolean}
             */
            isAvailable() {
                const smartRouting = game.modules.get(MODULE_NAME)?.smartRouting;
                return smartRouting?.settingsService.isPathfindingEnabled() && 
                       smartRouting?.pathfindingService.isRoutinglibReady();
            },

            /**
             * Get module version
             * @returns {string}
             */
            getVersion() {
                return game.modules.get(MODULE_NAME)?.version || "1.0.0";
            },

            /**
             * Get service instances (for advanced usage)
             * @returns {Object} Object containing all service instances
             */
            getServices() {
                const smartRouting = game.modules.get(MODULE_NAME)?.smartRouting;
                if (!smartRouting) return null;
                
                return {
                    settings: smartRouting.settingsService,
                    coordinate: smartRouting.coordinateService,
                    tokenMovement: smartRouting.tokenMovementService,
                    pathfinding: smartRouting.pathfindingService,
                    dragHandler: smartRouting.dragHandler,
                    hooksManager: smartRouting.hooksManager
                };
            }
        };
    }

    /**
     * Set pathfinding enabled state (legacy compatibility)
     * @param {boolean} enabled 
     */
    setEnabled(enabled) {
        this.settingsService.set("enablePathfinding", enabled);
    }

    /**
     * Get pathfinding enabled state (legacy compatibility)
     * @returns {boolean}
     */
    get enabled() {
        return this.settingsService.isPathfindingEnabled();
    }

    /**
     * Get routinglib ready state (legacy compatibility)
     * @returns {boolean}
     */
    get routinglibReady() {
        return this.pathfindingService.isRoutinglibReady();
    }

    /**
     * Cleanup method for module teardown
     */
    cleanup() {
        this.hooksManager.cleanup();
        this.pathfindingService.cancelAllPathfindingJobs();
        this.dragHandler.clearAllDragStates();
        this.tokenMovementService.clearAllAnimations();
        
        if (this.settingsService.isDebugMode()) {
            console.log(`[${MODULE_NAME}] Smart Token Routing cleanup completed`);
        }
    }
}

// Initialize the module
Hooks.once("init", () => {
    console.log(`[${MODULE_NAME}] Initializing Smart Token Routing`);
    
    const smartRouting = new SmartTokenRouting();
    smartRouting.initialize();
    
    // Store reference for API access
    game.modules.get(MODULE_NAME).smartRouting = smartRouting;
    
    // Expose API
    window.SmartTokenRouting = SmartTokenRouting;
});

Hooks.once("ready", () => {
    console.log(`[${MODULE_NAME}] Smart Token Routing ready`);
    
    // Display welcome message if debug mode is enabled
    const smartRouting = game.modules.get(MODULE_NAME)?.smartRouting;
    if (smartRouting?.settingsService.isDebugMode()) {
        ui.notifications.info(game.i18n.localize("ROUTING_TOKEN.Notifications.ModuleReady"));
    }
});

// Cleanup on module disable/reload
Hooks.on("closeApplication", (app, html) => {
    if (app.constructor.name === "ModuleManagement") {
        const smartRouting = game.modules.get(MODULE_NAME)?.smartRouting;
        if (smartRouting) {
            smartRouting.cleanup();
        }
    }
});

export { SmartTokenRouting };