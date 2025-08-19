import { setupCustomTokenRulerMethods, setCombatService, setMovementCalculationService } from './custom-token-ruler.js';

/**
 * Hooks Manager Service for Smart Token Routing
 * Centralizes all Foundry VTT hook management and event handling
 */
export class HooksManagerService {
    constructor(moduleName, settingsService, pathfindingService, dragHandlerService, combatService, movementCalculationService) {
        this.MODULE_NAME = moduleName;
        this.settingsService = settingsService;
        this.pathfindingService = pathfindingService;
        this.dragHandlerService = dragHandlerService;
        this.combatService = combatService;
        this.movementCalculationService = movementCalculationService;
        this.registeredHooks = new Set();
    }

    /**
     * Set up all Foundry hooks
     */
    setupHooks() {
        this.setupRoutinglibHooks();
        this.setupCanvasHooks();
        this.setupTokenHooks();
        this.setupCombatHooks();
    }

    /**
     * Set up routinglib-related hooks
     */
    setupRoutinglibHooks() {
        // Wait for routinglib to be ready (optional enhancement)
        const routinglibReadyHook = Hooks.on("routinglib.ready", () => {
            this.pathfindingService.setRoutinglibReady(true);
        });
        this.registeredHooks.add({ id: routinglibReadyHook, event: "routinglib.ready" });
        
        // Check if routinglib is already available (in case it loaded before us)
        if (window.routinglib) {
            this.pathfindingService.setRoutinglibReady(true);
        }
    }

    /**
     * Set up canvas-related hooks
     */
    setupCanvasHooks() {
        // Canvas ready hook for drag hooks setup
        const canvasReadyHookDrag = Hooks.on("canvasReady", () => {
            this.dragHandlerService.setupDragHooks();
            this.setupCustomTokenRuler();
        });
        this.registeredHooks.add({ id: canvasReadyHookDrag, event: "canvasReady" });
        
        // Canvas ready hook for initialization
        const canvasReadyHookInit = Hooks.on("canvasReady", this.onCanvasReady.bind(this));
        this.registeredHooks.add({ id: canvasReadyHookInit, event: "canvasReady" });
        
        // Cleanup on canvas teardown
        const canvasInitHook = Hooks.on("canvasInit", this.onCanvasInit.bind(this));
        this.registeredHooks.add({ id: canvasInitHook, event: "canvasInit" });
    }

    /**
     * Set up token-related hooks
     */
    setupTokenHooks() {
        // Token control hooks
        const controlTokenHook = Hooks.on("controlToken", this.onControlToken.bind(this));
        this.registeredHooks.add({ id: controlTokenHook, event: "controlToken" });
    }

    /**
     * Set up combat-related hooks
     */
    setupCombatHooks() {
        try {
            // Initialize combat service hooks
            this.combatService.setupCombatHooks();
            
            // Inject services into custom token ruler for grid highlighting
            setCombatService(this.combatService);
            setMovementCalculationService(this.movementCalculationService);
            
            if (this.settingsService.isDebugMode()) {
                console.log(`[${this.MODULE_NAME}] Combat movement tracking initialized`);
            }
        } catch (error) {
            console.warn(`[${this.MODULE_NAME}] Failed to setup combat movement tracking:`, error);
        }
    }

    /**
     * Set up custom token ruler with distance-based grid highlighting
     */
    setupCustomTokenRuler() {
        if (!canvas.ready) return;
        
        try {
            const success = setupCustomTokenRulerMethods();
            if (success && this.settingsService.isDebugMode()) {
                console.log(`[${this.MODULE_NAME}] Custom token ruler with distance-based highlighting installed`);
            }
        } catch (error) {
            console.warn(`[${this.MODULE_NAME}] Failed to setup custom token ruler:`, error);
        }
    }

    /**
     * Handle token control changes
     * @param {Token} token - The controlled token
     * @param {boolean} controlled - Whether the token is being controlled
     */
    onControlToken(token, controlled) {
        if (!this.settingsService.isPathfindingEnabled() || !this.pathfindingService.isRoutinglibReady()) return;

        if (controlled && this.settingsService.isDebugMode()) {
            console.log(`[${this.MODULE_NAME}] Token ${token.name} selected for pathfinding`);
        }
    }

    /**
     * Handle canvas ready
     */
    onCanvasReady() {
        if (this.settingsService.isDebugMode()) {
            console.log(`[${this.MODULE_NAME}] Canvas ready - pathfinding available`);
        }
    }

    /**
     * Handle canvas initialization (cleanup)
     */
    onCanvasInit() {
        // Cancel all active pathfinding jobs
        this.pathfindingService.cancelAllPathfindingJobs();
        
        // Clear drag state
        this.dragHandlerService.clearAllDragStates();
        
        if (this.settingsService.isDebugMode()) {
            console.log(`[${this.MODULE_NAME}] Canvas cleanup completed`);
        }
    }

    /**
     * Remove all registered hooks (cleanup)
     */
    cleanup() {
        for (const hook of this.registeredHooks) {
            try {
                Hooks.off(hook.event, hook.id);
            } catch (error) {
                console.warn(`[${this.MODULE_NAME}] Error removing hook ${hook.event}:`, error);
            }
        }
        this.registeredHooks.clear();
        
        if (this.settingsService.isDebugMode()) {
            console.log(`[${this.MODULE_NAME}] All hooks cleaned up`);
        }
    }

    /**
     * Get list of registered hooks (for debugging)
     * @returns {Array} Array of registered hook information
     */
    getRegisteredHooks() {
        return Array.from(this.registeredHooks).map(hook => ({
            event: hook.event,
            id: hook.id
        }));
    }
}