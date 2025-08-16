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
        this.pathRenderer = null;
        this.dragState = new Map(); // Track drag operations per token
        this.pathfindingTimeouts = new Map(); // Track debounced pathfinding timers
        
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

        game.settings.register(MODULE_NAME, "visualizePath", {
            name: game.i18n.localize("ROUTING_TOKEN.Settings.VisualizePath"),
            hint: game.i18n.localize("ROUTING_TOKEN.Settings.VisualizePathHint"),
            scope: "client",
            config: true,
            type: Boolean,
            default: true
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
        
        // Final position update for waypoint execution
        Hooks.on("updateToken", this.onFinalTokenUpdate.bind(this));
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
     * Handle canvas pointer move - check for active drags and calculate pathfinding
     */
    onCanvasPointerMove(event) {
        if (!this.enabled || !this.routinglibReady) return;
        
        // Check if any tokens are being dragged
        for (const [tokenId, dragInfo] of this.dragState) {
            if (!dragInfo.isActive) continue;
            
            const token = canvas.tokens.get(tokenId);
            if (!token) continue;
            
            // Get current mouse position in world coordinates
            const mousePos = event.data.getLocalPosition(canvas.stage);
            const targetPos = { x: mousePos.x, y: mousePos.y };
            
            if (game.settings.get(MODULE_NAME, "debugMode")) {
                console.log(`[${MODULE_NAME}] 🖱️ Drag move for ${token.name} to (${targetPos.x}, ${targetPos.y})`);
            }
            
            // Clear any existing pathfinding timeout
            this.clearPathfindingTimeout(tokenId);
            
            // Clear current path visualization
            this.clearPathVisualization(tokenId);
            
            // Set new timeout for pathfinding calculation
            const timeoutId = setTimeout(() => {
                this.calculateDragPathfinding(token, dragInfo.startPos, targetPos);
            }, 50);
            
            this.pathfindingTimeouts.set(tokenId, timeoutId);
        }
    }
    
    /**
     * Handle drag drop - execute the calculated waypoints
     * @returns {boolean} True if waypoints will be used, false if original movement should proceed
     */
    async onDragDrop(token, event) {
        if (!this.enabled) return false;
        
        const dragInfo = this.dragState.get(token.id);
        if (!dragInfo) return false;
        
        // Clear any pending pathfinding timeout
        this.clearPathfindingTimeout(token.id);
        
        if (game.settings.get(MODULE_NAME, "debugMode")) {
            console.log(`[${MODULE_NAME}] 🎯 Drag completed for ${token.name}`);
        }
        
        // If we have a calculated path and auto-follow is enabled, use it
        if (dragInfo.currentPath && game.settings.get(MODULE_NAME, "autoFollowPath")) {
            if (game.settings.get(MODULE_NAME, "debugMode")) {
                console.log(`[${MODULE_NAME}] 🛤️ Executing calculated waypoint path instead of original movement`);
            }
            
            // Execute waypoint movement immediately without delay
            setTimeout(async () => {
                await this.moveTokenThroughWaypoints(token, dragInfo.currentPath);
            }, 10);
            
            // Clean up drag state
            this.dragState.delete(token.id);
            return true; // Indicate that waypoints will be used
        }
        
        // Clean up drag state
        this.dragState.delete(token.id);
        return false; // Allow original movement to proceed
    }
    
    /**
     * Handle final token update (for non-pathfinding movements)
     */
    async onFinalTokenUpdate(tokenDoc, change, options, userId) {
        // Only handle if this is NOT from our waypoint movement
        if (options?.routing_token_movement) return;
        
        // Clear any visualization after completed movement
        if (change.x !== undefined || change.y !== undefined) {
            setTimeout(() => {
                this.clearPathVisualization(tokenDoc.id);
            }, 2000);
        }
    }
    
    /**
     * Track tokens currently animating through waypoints
     */
    animatingTokens = new Set();
    
    /**
     * Check if a token is currently animating through waypoints
     */
    isAnimatingWaypoints(tokenId) {
        return this.animatingTokens.has(tokenId);
    }
    
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
            
            const result = await window.routinglib.calculatePath(gridFromPos, gridToPos, {
                token: token,
                maxDistance: game.settings.get(MODULE_NAME, "maxPathDistance")
            });
            
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
                
                // Show path visualization
                const pathType = result.path.length > 2 ? 'pathfinding' : 'direct';
                this.displayPath(token.id, pixelPath, pathType);
                
            } else {
                // Show direct path
                const directPath = [startPos, targetPos];
                this.displayPath(token.id, directPath, 'direct');
                
                // Store direct path
                const dragInfo = this.dragState.get(token.id);
                if (dragInfo) {
                    dragInfo.currentPath = null; // No complex path needed
                }
            }
            
        } catch (error) {
            if (game.settings.get(MODULE_NAME, "debugMode")) {
                console.warn(`[${MODULE_NAME}] Drag pathfinding error:`, error);
            }
        }
    }
    
    /**
     * Clear pathfinding timeout for a token
     */
    clearPathfindingTimeout(tokenId) {
        const timeoutId = this.pathfindingTimeouts.get(tokenId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.pathfindingTimeouts.delete(tokenId);
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
            
            // Clear path visualization after movement completes
            setTimeout(() => {
                this.clearPathVisualization(token.id);
            }, 1000);
        }
    }
    
    /**
     * Handle canvas pan events (might indicate dragging)
     */
    onCanvasPan(canvas, position) {
        // This could be used to detect if we're in a drag operation
        // For now, we'll rely on updateToken for movement detection
    }

    /**
     * Calculate pathfinding for token movement
     */
    async calculatePathForMovement(token, fromPos, toPos) {
        try {
            // Cancel any existing pathfinding job for this token
            const existingJob = this.activePathfindingJobs.get(token.id);
            if (existingJob) {
                existingJob.cancel();
                this.activePathfindingJobs.delete(token.id);
            }
            
            // Initialize path renderer
            this.initializePathRenderer();
            
            // Create waypoints for native pathfinding
            const waypoints = [
                { x: fromPos.x, y: fromPos.y },
                { x: toPos.x, y: toPos.y }
            ];
            
            const options = {
                preview: true,
                ignoreWalls: false,
                ignoreCost: false,
                delay: 0
            };
            
            if (game.settings.get(MODULE_NAME, "debugMode")) {
                console.log(`[${MODULE_NAME}] Calculating path from (${fromPos.x},${fromPos.y}) to (${toPos.x},${toPos.y})`);
            }
            
            await this.tryRoutinglibFallback(token, fromPos, toPos);
            
            // Clear path after a short delay
            setTimeout(() => {
                this.clearPathVisualization(token.id);
            }, 2000);
            
        } catch (error) {
            if (game.settings.get(MODULE_NAME, "debugMode")) {
                console.warn(`[${MODULE_NAME}] Pathfinding calculation failed:`, error);
            }
            await this.tryRoutinglibFallback(token, fromPos, toPos);
        }
    }
    
    // REMOVED: Old calculateAndRedirectMovement - replaced with native waypoint approach
    
    // REMOVED: Old path management methods - no longer needed with native waypoint approach
    
    /**
     * Try routinglib as fallback when native pathfinding fails
     */
    async tryRoutinglibFallback(token, fromPos, toPos) {
        if (!this.routinglibReady || !window.routinglib) {
            // Show direct line if no pathfinding available
            this.displayDirectPath(token.id, fromPos, toPos);
            return;
        }
        
        try {
            const gridFromPos = this.pixelsToGridPosition(fromPos);
            const gridToPos = this.pixelsToGridPosition(toPos);
            
            const result = await window.routinglib.calculatePath(gridFromPos, gridToPos, {
                token: token,
                maxDistance: game.settings.get(MODULE_NAME, "maxPathDistance")
            });
            
            if (result && result.path && result.path.length > 1) {
                // Convert grid coordinates back to pixel coordinates using token data
                const pixelPath = result.path.map(point => this.gridToPixelPosition(point, tokenData));
                this.displayPath(token.id, pixelPath, 'routinglib');
                
                if (game.settings.get(MODULE_NAME, "debugMode")) {
                    console.log(`[${MODULE_NAME}] Routinglib fallback found ${result.path.length} waypoints`);
                }
            } else {
                this.displayDirectPath(token.id, fromPos, toPos);
            }
        } catch (error) {
            if (game.settings.get(MODULE_NAME, "debugMode")) {
                console.warn(`[${MODULE_NAME}] Routinglib fallback failed:`, error);
            }
            this.displayDirectPath(token.id, fromPos, toPos);
        }
    }

    /**
     * Initialize the path renderer for visualization
     */
    initializePathRenderer() {
        if (this.pathRenderer) return;
        
        this.pathRenderer = new PIXI.Container();
        this.pathRenderer.name = "SmartRoutingPaths";
        canvas.stage.addChild(this.pathRenderer);
        
        if (game.settings.get(MODULE_NAME, "debugMode")) {
            console.log(`[${MODULE_NAME}] Path renderer initialized`);
        }
    }
    
    /**
     * Display calculated path on canvas
     */
    displayPath(tokenId, waypoints, source = 'native') {
        if (!game.settings.get(MODULE_NAME, "visualizePath")) return;
        
        this.clearPathVisualization(tokenId);
        
        if (!this.pathRenderer || !waypoints || waypoints.length < 2) return;
        
        const pathGraphics = new PIXI.Graphics();
        pathGraphics.name = `path-${tokenId}`;
        
        // Set line style based on source
        const lineColor = source === 'pathfinding' ? 0x00FF00 : (source === 'direct' ? 0xFF0000 : 0xFFAA00);
        const lineWidth = source === 'direct' ? 2 : 3;
        const alpha = source === 'direct' ? 0.6 : 0.8;
        
        pathGraphics.lineStyle(lineWidth, lineColor, alpha);
        
        // Draw the path
        const firstPoint = this.waypointToCanvas(waypoints[0]);
        pathGraphics.moveTo(firstPoint.x, firstPoint.y);
        
        for (let i = 1; i < waypoints.length; i++) {
            const point = this.waypointToCanvas(waypoints[i]);
            pathGraphics.lineTo(point.x, point.y);
        }
        
        // Add waypoint markers
        waypoints.forEach((waypoint, index) => {
            const point = this.waypointToCanvas(waypoint);
            const isStart = index === 0;
            const isEnd = index === waypoints.length - 1;
            
            const markerColor = isStart ? 0x0088FF : (isEnd ? 0xFF4400 : lineColor);
            const markerSize = isStart || isEnd ? 6 : 4;
            
            pathGraphics.beginFill(markerColor, 0.9);
            pathGraphics.drawCircle(point.x, point.y, markerSize);
            pathGraphics.endFill();
        });
        
        this.pathRenderer.addChild(pathGraphics);
    }
    
    /**
     * Display direct path when pathfinding fails
     */
    displayDirectPath(tokenId, startPos, endPos) {
        if (!game.settings.get(MODULE_NAME, "visualizePath")) return;
        
        this.clearPathVisualization(tokenId);
        
        if (!this.pathRenderer) return;
        
        const pathGraphics = new PIXI.Graphics();
        pathGraphics.name = `path-${tokenId}`;
        
        // Red dashed line for direct path
        pathGraphics.lineStyle(2, 0xFF0000, 0.6);
        
        const start = this.tokenToCanvasPosition(startPos);
        const end = this.tokenToCanvasPosition(endPos);
        
        pathGraphics.moveTo(start.x, start.y);
        pathGraphics.lineTo(end.x, end.y);
        
        this.pathRenderer.addChild(pathGraphics);
    }
    
    /**
     * Clear path visualization for a token
     */
    clearPathVisualization(tokenId) {
        if (!this.pathRenderer) return;
        
        const existingPath = this.pathRenderer.getChildByName(`path-${tokenId}`);
        if (existingPath) {
            this.pathRenderer.removeChild(existingPath);
            existingPath.destroy();
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
        
        // Clear drag state and pathfinding timeouts
        this.dragState.clear();
        this.pathfindingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.pathfindingTimeouts.clear();
        
        // Cleanup path renderer
        if (this.pathRenderer) {
            this.pathRenderer.destroy({ children: true });
            this.pathRenderer = null;
        }

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
        
        // If routinglib helper is not available, log warning and use fallback
        if (game.settings.get(MODULE_NAME, "debugMode")) {
            console.warn(`[${MODULE_NAME}] RoutingLib coordinate helper not available, using fallback methods`);
        }
        
        // Return fallback coordinate helper with same interface
        return this.getFallbackCoordinateHelper();
    }

    /**
     * Fallback coordinate helper when routinglib is not available
     * Uses the same algorithms but implemented locally
     */
    getFallbackCoordinateHelper() {
        return {
            pixelToGridBounded: (pixelPos, tokenData = null) => {
                if (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS) {
                    return { x: pixelPos.x, y: pixelPos.y };
                }
                
                // Use standard 1x1 conversion (fallback doesn't support token-aware calculations)
                const gridX = Math.round((pixelPos.x - canvas.grid.size / 2) / canvas.grid.size);
                const gridY = Math.round((pixelPos.y - canvas.grid.size / 2) / canvas.grid.size);
                
                return {
                    x: Math.max(0, gridX),
                    y: Math.max(0, gridY)
                };
            },
            
            gridPosToPixel: (gridPos, tokenData = null) => {
                if (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS) {
                    return { x: gridPos.x, y: gridPos.y };
                }
                
                // Use standard 1x1 conversion (fallback doesn't support token-aware calculations)
                const pixelX = gridPos.x * canvas.grid.size + canvas.grid.size / 2;
                const pixelY = gridPos.y * canvas.grid.size + canvas.grid.size / 2;
                return { x: pixelX, y: pixelY };
            },
            
            getTokenData: (token) => {
                if (!token) return { width: 1, height: 1 };
                const doc = token.document || token;
                return {
                    width: doc.width || 1,
                    height: doc.height || 1
                };
            },
            
            waypointToCanvas: (waypoint) => {
                if (waypoint.x !== undefined && waypoint.y !== undefined) {
                    return { x: waypoint.x, y: waypoint.y };
                }
                return { x: waypoint.x || 0, y: waypoint.y || 0 };
            },
            
            tokenToCanvasPosition: (tokenPos) => {
                return {
                    x: tokenPos.x || 0,
                    y: tokenPos.y || 0
                };
            },
            
            setDebugEnabled: () => {} // No-op for fallback
        };
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
     * Convert waypoint to canvas coordinates for display using centralized helper
     */
    waypointToCanvas(waypoint) {
        return this.getCoordinateHelper().waypointToCanvas(waypoint);
    }
    
    /**
     * Convert token position to canvas position using centralized helper
     */
    tokenToCanvasPosition(tokenPos) {
        return this.getCoordinateHelper().tokenToCanvasPosition(tokenPos);
    }
    
    /**
     * Cleanup pathfinding operations for a token
     */
    cleanupPathfindingForToken(tokenId) {
        // Cancel any active pathfinding job
        const job = this.activePathfindingJobs.get(tokenId);
        if (job) {
            try {
                job.cancel();
            } catch (error) {
                console.warn(`[${MODULE_NAME}] Error canceling pathfinding job:`, error);
            }
            this.activePathfindingJobs.delete(tokenId);
        }
        
        // Clear visual path
        this.clearPathVisualization(tokenId);
    }

    /**
     * Get token position in appropriate coordinate system
     */
    getTokenPosition(tokenDoc) {
        return { x: tokenDoc.x, y: tokenDoc.y };
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