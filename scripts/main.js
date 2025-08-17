/**
 * Smart Token Routing for FoundryVTT v13
 * Uses native FoundryVTT pathfinding enhanced with routinglib for optimal token movement
 * 
 * @author Ludo Bermejo <ludobermejo@gmail.com>
 * @version 1.0.0
 */

const MODULE_NAME = "routing-token";

class SmartTokenRouting {
    constructor() {
        this.enabled = true;
        this.routinglibReady = false;
        this.activePathfindingJobs = new Map();
        this.dragState = new Map(); // Track drag operations per token
        
        console.log(`[${MODULE_NAME}] Initializing Smart Token Routing v1.0.0 with Real-time Drag Pathfinding`);
    }

    /**
     * Initialize the module
     */
    initialize() {
        this.registerSettings();
        this.setupHooks();
        
        // Check if routinglib is available
        if (window.routinglib) {
            this.routinglibReady = true;
            console.log(`[${MODULE_NAME}] Routinglib detected and ready`);
        } else {
            console.warn(`[${MODULE_NAME}] Routinglib not found - pathfinding will be disabled`);
        }
    }

    /**
     * Register module settings
     */
    registerSettings() {
        game.settings.register(MODULE_NAME, "enablePathfinding", {
            name: game.i18n.localize("ROUTING_TOKEN.Settings.EnablePathfinding"),
            hint: game.i18n.localize("ROUTING_TOKEN.Settings.EnablePathfindingHint"),
            scope: "client",
            config: true,
            type: Boolean,
            default: true,
            onChange: (value) => {
                this.enabled = value;
                console.log(`[${MODULE_NAME}] Pathfinding ${value ? 'enabled' : 'disabled'}`);
            }
        });


        game.settings.register(MODULE_NAME, "maxPathDistance", {
            name: game.i18n.localize("ROUTING_TOKEN.Settings.MaxPathDistance"),
            hint: game.i18n.localize("ROUTING_TOKEN.Settings.MaxPathDistanceHint"),
            scope: "client",
            config: true,
            type: Number,
            default: 1000,
            range: {
                min: 100,
                max: 5000,
                step: 100
            }
        });

        game.settings.register(MODULE_NAME, "debugMode", {
            name: game.i18n.localize("ROUTING_TOKEN.Settings.DebugMode"),
            hint: game.i18n.localize("ROUTING_TOKEN.Settings.DebugModeHint"),
            scope: "client",
            config: true,
            type: Boolean,
            default: false
        });

        game.settings.register(MODULE_NAME, "autoFollowPath", {
            name: "Auto-Follow Calculated Paths",
            hint: "When enabled, tokens will automatically follow the calculated pathfinding route instead of moving directly to the target.",
            scope: "client",
            config: true,
            type: Boolean,
            default: true
        });
    }

    /**
     * Set up Foundry hooks
     */
    setupHooks() {
        // Wait for routinglib to be ready (optional enhancement)
        Hooks.on("routinglib.ready", () => {
            this.routinglibReady = true;
            console.log(`[${MODULE_NAME}] Routinglib is now ready - enhanced pathfinding enabled`);
        });
        
        // Check if routinglib is already available (in case it loaded before us)
        if (window.routinglib) {
            this.routinglibReady = true;
            console.log(`[${MODULE_NAME}] Routinglib already available - enhanced pathfinding enabled`);
        }

        // Token drag hooks for real-time pathfinding
        Hooks.on("canvasReady", () => {
            this.setupDragHooks();
        });
        
        // Token control hooks
        Hooks.on("controlToken", this.onControlToken.bind(this));
        
        // Canvas ready hook for initialization
        Hooks.on("canvasReady", this.onCanvasReady.bind(this));
        
        // Cleanup on canvas teardown
        Hooks.on("canvasInit", this.onCanvasInit.bind(this));
        
    }

    /**
     * Set up drag event hooks for real-time pathfinding
     */
    setupDragHooks() {
        if (!canvas.ready) return;
        
        // Store original methods
        const originalOnDragLeftStart = Token.prototype._onDragLeftStart;
        const originalOnDragLeftDrop = Token.prototype._onDragLeftDrop;
        
        // Override drag start
        Token.prototype._onDragLeftStart = function(event) {
            game.modules.get(MODULE_NAME)?.smartRouting?.onDragStart(this, event);
            return originalOnDragLeftStart.call(this, event);
        };
        
        // Override drag drop
        Token.prototype._onDragLeftDrop = function(event) {
            const shouldUseWaypoints = game.modules.get(MODULE_NAME)?.smartRouting?.onDragDrop(this, event);
            if (!shouldUseWaypoints) {
                return originalOnDragLeftDrop.call(this, event);
            }
            // If waypoints will be used, prevent the original drop behavior
            return false;
        };
        
        // Use canvas mouse move events for drag tracking
        canvas.stage.on('pointermove', (event) => {
            game.modules.get(MODULE_NAME)?.smartRouting?.onCanvasPointerMove(event);
        });
        
        if (game.settings.get(MODULE_NAME, "debugMode")) {
            console.log(`[${MODULE_NAME}] Drag hooks installed for real-time pathfinding`);
        }
    }
    
    /**
     * Handle drag start - initialize pathfinding for this token
     */
    onDragStart(token, event) {
        if (!this.enabled || !this.routinglibReady) return;
        
        const startPos = { x: token.document.x, y: token.document.y };
        
        this.dragState.set(token.id, {
            startPos: startPos,
            currentPath: null,
            isActive: true
        });
        
        if (game.settings.get(MODULE_NAME, "debugMode")) {
            console.log(`[${MODULE_NAME}] 🎯 Drag started for ${token.name} at (${startPos.x}, ${startPos.y})`);
        }
    }
    
    /**
     * Handle canvas pointer move - no pathfinding during drag, only track movement
     */
    onCanvasPointerMove(event) {
        // No real-time pathfinding - this will only be calculated on drop
        return;
    }
    
    /**
     * Handle drag drop - calculate pathfinding only on drop
     * @returns {boolean} True if waypoints will be used, false if original movement should proceed
     */
    async onDragDrop(token, event) {
        if (!this.enabled) return false;
        
        const dragInfo = this.dragState.get(token.id);
        if (!dragInfo) return false;
        
        if (game.settings.get(MODULE_NAME, "debugMode")) {
            console.log(`[${MODULE_NAME}] 🎯 Drag completed for ${token.name}`);
        }
        
        // Calculate pathfinding only now, on drop
        if (this.routinglibReady && game.settings.get(MODULE_NAME, "autoFollowPath")) {
            try {
                // Get the final drop position
                const mousePos = event.data.getLocalPosition(canvas.stage);
                const targetPos = { x: mousePos.x, y: mousePos.y };
                
                if (game.settings.get(MODULE_NAME, "debugMode")) {
                    console.log(`[${MODULE_NAME}] 📊 Calculating pathfinding on drop from (${dragInfo.startPos.x}, ${dragInfo.startPos.y}) to (${targetPos.x}, ${targetPos.y})`);
                }
                
                // Calculate pathfinding for the final position
                await this.calculateDragPathfinding(token, dragInfo.startPos, targetPos);
                
                // Use the calculated path if available
                if (dragInfo.currentPath && dragInfo.currentPath.length > 1) {
                    if (game.settings.get(MODULE_NAME, "debugMode")) {
                        console.log(`[${MODULE_NAME}] 🛤️ Executing calculated waypoint path with ${dragInfo.currentPath.length} waypoints`);
                    }
                    
                    // Execute waypoint movement
                    setTimeout(async () => {
                        await this.moveTokenThroughWaypoints(token, dragInfo.currentPath);
                    }, 10);
                    
                    // Clean up drag state
                    this.dragState.delete(token.id);
                    return true; // Indicate that waypoints will be used
                }
            } catch (error) {
                if (game.settings.get(MODULE_NAME, "debugMode")) {
                    console.warn(`[${MODULE_NAME}] Drop pathfinding failed, using default movement:`, error);
                }
            }
        }
        
        // Clean up drag state
        this.dragState.delete(token.id);
        return false; // Allow original movement to proceed
    }
    
    /**
     * Track tokens currently animating through waypoints
     */
    animatingTokens = new Set();
    
    /**
     * Calculate pathfinding during drag operation
     */
    async calculateDragPathfinding(token, startPos, targetPos) {
        if (!this.routinglibReady || !window.routinglib) {
            if (game.settings.get(MODULE_NAME, "debugMode")) {
                console.warn(`[${MODULE_NAME}] RoutingLib not ready - skipping pathfinding`);
            }
            return;
        }
        
        try {
            // Add bounds checking to ensure coordinates are valid
            if (startPos.x < 0 || startPos.y < 0 || targetPos.x < 0 || targetPos.y < 0) {
                if (game.settings.get(MODULE_NAME, "debugMode")) {
                    console.warn(`[${MODULE_NAME}] Invalid coordinates detected - skipping pathfinding`);
                }
                return;
            }
            
            // Get token data early for use throughout the function
            const tokenData = this.getCoordinateHelper().getTokenData(token);
            
            // Calculate pathfinding route
            let gridFromPos, gridToPos;
            try {
                gridFromPos = this.pixelsToGridPosition(startPos, tokenData);
                gridToPos = this.pixelsToGridPosition(targetPos, tokenData);
            } catch (coordError) {
                if (game.settings.get(MODULE_NAME, "debugMode")) {
                    console.warn(`[${MODULE_NAME}] Coordinate conversion failed:`, coordError);
                }
                return;
            }
            
            if (game.settings.get(MODULE_NAME, "debugMode")) {
                console.log(`[${MODULE_NAME}] 📊 Calculating drag pathfinding:`);
                console.log(`[${MODULE_NAME}]   Pixels: (${startPos.x}, ${startPos.y}) → (${targetPos.x}, ${targetPos.y})`);
                console.log(`[${MODULE_NAME}]   Grid:   (${gridFromPos.x}, ${gridFromPos.y}) → (${gridToPos.x}, ${gridToPos.y})`);
            }
            
            // Calculate a reasonable maxDistance based on the actual move distance
            // Use Manhattan distance as base, then add some buffer for detours
            const directDistance = Math.abs(gridToPos.x - gridFromPos.x) + Math.abs(gridToPos.y - gridFromPos.y);
            const maxSearchDistance = Math.min(
                directDistance * 3 + 10, // Allow 3x detour plus buffer
                game.settings.get(MODULE_NAME, "maxPathDistance"), // But respect user setting
                50 // Hard limit to prevent runaway pathfinding
            );
            
            if (game.settings.get(MODULE_NAME, "debugMode")) {
                console.log(`[${MODULE_NAME}] Direct distance: ${directDistance}, Max search: ${maxSearchDistance}`);
            }

            const result = await window.routinglib.calculatePath(gridFromPos, gridToPos, {
                token: token,
                maxDistance: maxSearchDistance
            });

            console.log(result);
            
            if (result && result.path && result.path.length > 1) {
                if (game.settings.get(MODULE_NAME, "debugMode")) {
                    console.log(`[${MODULE_NAME}] 🛤️ Path calculated with ${result.path.length} waypoints`);
                    console.log(`[${MODULE_NAME}] Raw grid path from routinglib:`, result.path.map(p => `(${p.x},${p.y})`).join(' → '));
                    console.log(`[${MODULE_NAME}] Grid path JSON:`, JSON.stringify(result.path));
                }
                
                // Convert grid coordinates back to pixel coordinates using token data
                const pixelPath = result.path.map(point => this.gridToPixelPosition(point, tokenData));
                
                if (game.settings.get(MODULE_NAME, "debugMode")) {
                    console.log(`[${MODULE_NAME}] Converted pixel path:`, pixelPath.map(p => `(${Math.round(p.x)},${Math.round(p.y)})`).join(' → '));
                    console.log(`[${MODULE_NAME}] Pixel path JSON:`, JSON.stringify(pixelPath));
                }
                
                // Store the calculated path for potential use on drop
                const dragInfo = this.dragState.get(token.id);
                if (dragInfo) {
                    dragInfo.currentPath = pixelPath;
                }
                
                // Update the token's ruler to show the calculated path
                this.updateTokenRuler(token, pixelPath);
                
                
            } else {
                // Create a simple direct path from origin to destination (like FoundryVTT default)
                // Normalize coordinates through grid system to ensure valid grid-aligned positions
                try {
                    const startGrid = this.pixelsToGridPosition(startPos, tokenData);
                    const targetGrid = this.pixelsToGridPosition(targetPos, tokenData);
                    
                    const normalizedStartPos = this.gridToPixelPosition(startGrid, tokenData);
                    const normalizedTargetPos = this.gridToPixelPosition(targetGrid, tokenData);
                    
                    const directPath = [normalizedStartPos, normalizedTargetPos];
                    
                    if (game.settings.get(MODULE_NAME, "debugMode")) {
                        console.log(`[${MODULE_NAME}] 🎯 No complex path found, using normalized direct path:`);
                        console.log(`[${MODULE_NAME}]   Original: (${Math.round(startPos.x)},${Math.round(startPos.y)}) → (${Math.round(targetPos.x)},${Math.round(targetPos.y)})`);
                        console.log(`[${MODULE_NAME}]   Grid: (${startGrid.x},${startGrid.y}) → (${targetGrid.x},${targetGrid.y})`);
                        console.log(`[${MODULE_NAME}]   Normalized: (${Math.round(normalizedStartPos.x)},${Math.round(normalizedStartPos.y)}) → (${Math.round(normalizedTargetPos.x)},${Math.round(normalizedTargetPos.y)})`);
                    }
                    
                    const dragInfo = this.dragState.get(token.id);
                    if (dragInfo) {
                        dragInfo.currentPath = directPath;
                    }
                    
                    // Update the token's ruler to show the direct path
                    this.updateTokenRuler(token, directPath);
                } catch (normalizeError) {
                    if (game.settings.get(MODULE_NAME, "debugMode")) {
                        console.warn(`[${MODULE_NAME}] Failed to normalize direct path coordinates:`, normalizeError);
                    }
                    // Fallback to original coordinates if normalization fails
                    const dragInfo = this.dragState.get(token.id);
                    if (dragInfo) {
                        dragInfo.currentPath = [startPos, targetPos];
                    }
                    
                    // Update the token's ruler to show the fallback direct path
                    this.updateTokenRuler(token, [startPos, targetPos]);
                }
            }
            
        } catch (error) {
            if (game.settings.get(MODULE_NAME, "debugMode")) {
                console.warn(`[${MODULE_NAME}] Drag pathfinding error:`, error);
            }
        }
    }
    
    /**
     * Update the token's ruler to display the calculated path
     * Uses FoundryVTT v13's native updateDragRulerPath method if available
     */
    updateTokenRuler(token, pixelPath) {
        if (!token || !pixelPath || pixelPath.length < 2) return;
        
        try {
            // Convert pixel path to FoundryVTT v13 waypoint format
            const waypoints = pixelPath.map(point => ({
                x: point.x,
                y: point.y,
                elevation: token.document.elevation || 0
            }));
            
            // Try to use FoundryVTT v13's native updateDragRulerPath method
            if (typeof token.updateDragRulerPath === 'function') {
                token.updateDragRulerPath(waypoints);
            } 
            // Fallback: try the TokenLayer method
            else if (canvas.tokens && typeof canvas.tokens.updateDragRulerPaths === 'function') {
                canvas.tokens.updateDragRulerPaths();
            }
            // Final fallback: try to trigger ruler recalculation
            else if (token.ruler) {
                // Just ensure the ruler is visible during drag
                if (token.ruler.visible !== undefined) {
                    token.ruler.visible = true;
                }
            }
            
            if (game.settings.get(MODULE_NAME, "debugMode")) {
                console.log(`[${MODULE_NAME}] 📏 Updated ruler with ${waypoints.length} waypoints for ${token.name}`);
            }
            
        } catch (error) {
            if (game.settings.get(MODULE_NAME, "debugMode")) {
                console.warn(`[${MODULE_NAME}] Failed to update token ruler:`, error);
            }
        }
    }
    
    
    /**
     * Move token through waypoints using FoundryVTT v13 native waypoint system
     */
    async moveTokenThroughWaypoints(token, pixelPath) {
        if (!pixelPath || pixelPath.length < 2) return;
        
        try {
            // Mark token as animating
            this.animatingTokens.add(token.id);
            
            if (game.settings.get(MODULE_NAME, "debugMode")) {
                console.log(`[${MODULE_NAME}] 🎬 Starting FoundryVTT v13 waypoint movement for ${token.name}`);
                console.log(`[${MODULE_NAME}] Full pixel path received:`, pixelPath.map(p => `(${Math.round(p.x)},${Math.round(p.y)})`).join(' → '));
            }
            
            // Convert pixel path to FoundryVTT v13 waypoint format
            // Skip the first waypoint (current position) - FoundryVTT move() expects destinations only
            const destinationWaypoints = pixelPath.slice(1).map((point, index) => {
                // Don't use FoundryVTT's snapping since it's causing issues
                // Use our pixel coordinates directly since they're already calculated correctly
                // These coordinates represent the centers of grid cells
                const finalPoint = { x: point.x, y: point.y };
                
                if (game.settings.get(MODULE_NAME, "debugMode")) {
                    console.log(`[${MODULE_NAME}] Waypoint ${index + 1}: (${Math.round(point.x)},${Math.round(point.y)}) → using directly (${finalPoint.x},${finalPoint.y})`);
                }
                
                return {
                    x: finalPoint.x,
                    y: finalPoint.y,
                    snapped: true  // FoundryVTT v13 waypoint property
                };
            });
            
            if (game.settings.get(MODULE_NAME, "debugMode")) {
                console.log(`[${MODULE_NAME}] Final FoundryVTT waypoints:`, destinationWaypoints.map(w => `(${w.x},${w.y})`).join(' → '));
                console.log(`[${MODULE_NAME}] Moving token through ${destinationWaypoints.length} waypoints`);
            }
            
            // Use FoundryVTT's native TokenDocument.move() exactly like the examples
            await token.document.move(destinationWaypoints, { 
                showRuler: true,
                routing_token_movement: true  // Flag to prevent our hooks from interfering
            });
            
            if (game.settings.get(MODULE_NAME, "debugMode")) {
                console.log(`[${MODULE_NAME}] ✅ Native waypoint movement completed for ${token.name}`);
            }
            
        } catch (error) {
            if (game.settings.get(MODULE_NAME, "debugMode")) {
                console.warn(`[${MODULE_NAME}] Native waypoint movement error:`, error);
            }
        } finally {
            // Clear animation flag
            this.animatingTokens.delete(token.id);
            
        }
    }
    


    /**
     * Handle token control changes
     */
    onControlToken(token, controlled) {
        if (!this.enabled || !this.routinglibReady) return;

        if (controlled && game.settings.get(MODULE_NAME, "debugMode")) {
            console.log(`[${MODULE_NAME}] Token ${token.name} selected for pathfinding`);
        }
    }

    /**
     * Handle canvas ready
     */
    onCanvasReady() {
        if (game.settings.get(MODULE_NAME, "debugMode")) {
            console.log(`[${MODULE_NAME}] Canvas ready - pathfinding available`);
        }
    }

    /**
     * Handle canvas initialization (cleanup)
     */
    onCanvasInit() {
        // Cancel all active pathfinding jobs
        for (const [tokenId, job] of this.activePathfindingJobs) {
            try {
                job.cancel();
            } catch (error) {
                console.warn(`[${MODULE_NAME}] Error canceling pathfinding job for token ${tokenId}:`, error);
            }
        }
        this.activePathfindingJobs.clear();
        
        // Clear drag state
        this.dragState.clear();
        

        if (game.settings.get(MODULE_NAME, "debugMode")) {
            console.log(`[${MODULE_NAME}] Canvas cleanup completed`);
        }
    }
    
    /**
     * Get the centralized coordinate helper from routinglib
     * This ensures both modules use exactly the same coordinate calculations
     */
    getCoordinateHelper() {
        if (window.routinglib?.coordinateHelper) {
            // Enable debug mode based on our module setting
            window.routinglib.coordinateHelper.setDebugEnabled(
                game.settings.get(MODULE_NAME, "debugMode")
            );
            return window.routinglib.coordinateHelper;
        }
        
        // If routinglib helper is not available, throw error
        throw new Error("RoutingLib coordinate helper not available. Make sure routinglib is loaded.");
    }

    /**
     * Convert pixel coordinates to grid coordinates using centralized helper
     */
    pixelsToGridPosition(pixelPos, tokenData = null) {
        return this.getCoordinateHelper().pixelToGridBounded(pixelPos, tokenData);
    }
    
    /**
     * Convert grid coordinates to pixel coordinates using centralized helper
     */
    gridToPixelPosition(gridPos, tokenData = null) {
        return this.getCoordinateHelper().gridPosToPixel(gridPos, tokenData);
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
                game.modules.get(MODULE_NAME)?.smartRouting?.setEnabled(enabled);
            },

            /**
             * Check if pathfinding is available
             * @returns {boolean}
             */
            isAvailable() {
                const module = game.modules.get(MODULE_NAME)?.smartRouting;
                return module?.enabled && module?.routinglibReady;
            },

            /**
             * Get module version
             * @returns {string}
             */
            getVersion() {
                return game.modules.get(MODULE_NAME)?.version || "1.0.0";
            }
        };
    }

    /**
     * Set pathfinding enabled state
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        game.settings.set(MODULE_NAME, "enablePathfinding", enabled);
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
    if (game.settings.get(MODULE_NAME, "debugMode")) {
        ui.notifications.info(game.i18n.localize("ROUTING_TOKEN.Notifications.ModuleReady"));
    }
});