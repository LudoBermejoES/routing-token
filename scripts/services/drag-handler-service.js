/**
 * Drag Handler Service for Smart Token Routing
 * Manages token drag operations and real-time pathfinding
 */
export class DragHandlerService {
    constructor(moduleName, settingsService, pathfindingService) {
        this.MODULE_NAME = moduleName;
        this.settingsService = settingsService;
        this.pathfindingService = pathfindingService;
        this.dragState = new Map(); // Track drag operations per token
        this.hooksInstalled = false;
    }

    /**
     * Set up drag event hooks for real-time pathfinding
     */
    setupDragHooks() {
        if (!canvas.ready || this.hooksInstalled) return;
        
        // Store original methods
        const originalOnDragLeftStart = Token.prototype._onDragLeftStart;
        const originalOnDragLeftDrop = Token.prototype._onDragLeftDrop;
        
        // Store reference to drag handler for closures
        const dragHandler = this;
        const MODULE_NAME = this.MODULE_NAME;
        
        // Override drag start
        Token.prototype._onDragLeftStart = function(event) {
            game.modules.get(MODULE_NAME)?.smartRouting?.dragHandler?.onDragStart(this, event);
            return originalOnDragLeftStart.call(this, event);
        };
        
        // Override drag drop
        Token.prototype._onDragLeftDrop = function(event) {
            const shouldUseWaypoints = game.modules.get(MODULE_NAME)?.smartRouting?.dragHandler?.onDragDrop(this, event);
            if (!shouldUseWaypoints) {
                return originalOnDragLeftDrop.call(this, event);
            }
            // If waypoints will be used, prevent the original drop behavior
            return false;
        };
        
        // Use canvas mouse move events for drag tracking
        canvas.stage.on('pointermove', (event) => {
            game.modules.get(MODULE_NAME)?.smartRouting?.dragHandler?.onCanvasPointerMove(event);
        });
        
        this.hooksInstalled = true;
        
        if (this.settingsService.isDebugMode()) {
            console.log(`[${this.MODULE_NAME}] Drag hooks installed for real-time pathfinding`);
        }
    }

    /**
     * Handle drag start - initialize pathfinding for this token
     * @param {Token} token 
     * @param {Event} event 
     */
    onDragStart(token, event) {
        if (!this.settingsService.isPathfindingEnabled() || !this.pathfindingService.isRoutinglibReady()) return;
        
        // Get token position safely
        const startPos = { 
            x: token.document?.x ?? token.x ?? token.center?.x ?? 0, 
            y: token.document?.y ?? token.y ?? token.center?.y ?? 0 
        };
        
        this.dragState.set(token.id, {
            startPos: startPos,
            currentPath: null,
            isActive: true
        });
        
        if (this.settingsService.isDebugMode()) {
            console.log(`[${this.MODULE_NAME}] 🎯 Drag started for ${token.name} at (${startPos.x}, ${startPos.y})`);
        }
    }

    /**
     * Handle canvas pointer move - no pathfinding during drag, only track movement
     * @param {Event} event 
     */
    onCanvasPointerMove(event) {
        // No real-time pathfinding - this will only be calculated on drop
        return;
    }

    /**
     * Handle drag drop - calculate pathfinding only on drop
     * @param {Token} token 
     * @param {Event} event 
     * @returns {boolean} True if waypoints will be used, false if original movement should proceed
     */
    async onDragDrop(token, event) {
        if (!this.settingsService.isPathfindingEnabled()) return false;
        
        const dragInfo = this.dragState.get(token.id);
        if (!dragInfo) return false;
        
        if (this.settingsService.isDebugMode()) {
            console.log(`[${this.MODULE_NAME}] 🎯 Drag completed for ${token.name}`);
        }
        
        // Calculate pathfinding only now, on drop
        if (this.pathfindingService.isRoutinglibReady() && this.settingsService.isAutoFollowPathEnabled()) {
            try {
                // Get the final drop position safely
                let targetPos;
                if (event.data && typeof event.data.getLocalPosition === 'function') {
                    const mousePos = event.data.getLocalPosition(canvas.stage);
                    targetPos = { x: mousePos.x, y: mousePos.y };
                } else if (event.clientX !== undefined && event.clientY !== undefined) {
                    // Fallback to client coordinates if event.data is not available
                    const rect = canvas.stage.getBounds();
                    targetPos = { 
                        x: event.clientX - rect.x, 
                        y: event.clientY - rect.y 
                    };
                } else {
                    // Final fallback - use current token position
                    targetPos = { 
                        x: token.document?.x ?? token.x ?? 0, 
                        y: token.document?.y ?? token.y ?? 0 
                    };
                }
                
                if (this.settingsService.isDebugMode()) {
                    console.log(`[${this.MODULE_NAME}] 📊 Calculating pathfinding on drop from (${dragInfo.startPos.x}, ${dragInfo.startPos.y}) to (${targetPos.x}, ${targetPos.y})`);
                }
                
                // Calculate pathfinding for the final position
                const calculatedPath = await this.pathfindingService.calculateDragPathfinding(token, dragInfo.startPos, targetPos);
                
                // Store the calculated path in drag state
                if (calculatedPath) {
                    dragInfo.currentPath = calculatedPath;
                }
                
                // Use the calculated path if available
                if (dragInfo.currentPath && dragInfo.currentPath.length > 1) {
                    if (this.settingsService.isDebugMode()) {
                        console.log(`[${this.MODULE_NAME}] 🛤️ Executing calculated waypoint path with ${dragInfo.currentPath.length} waypoints`);
                    }
                    
                    // Execute waypoint movement
                    setTimeout(async () => {
                        await this.pathfindingService.moveTokenThroughWaypoints(token, dragInfo.currentPath);
                    }, 10);
                    
                    // Clean up drag state
                    this.dragState.delete(token.id);
                    return true; // Indicate that waypoints will be used
                }
            } catch (error) {
                if (this.settingsService.isDebugMode()) {
                    console.warn(`[${this.MODULE_NAME}] Drop pathfinding failed, using default movement:`, error);
                }
            }
        }
        
        // Clean up drag state
        this.dragState.delete(token.id);
        return false; // Allow original movement to proceed
    }

    /**
     * Get drag state for a token
     * @param {string} tokenId 
     * @returns {Object|null}
     */
    getDragState(tokenId) {
        return this.dragState.get(tokenId);
    }

    /**
     * Update drag state for a token
     * @param {string} tokenId 
     * @param {Object} updates 
     */
    updateDragState(tokenId, updates) {
        const existing = this.dragState.get(tokenId);
        if (existing) {
            this.dragState.set(tokenId, { ...existing, ...updates });
        }
    }

    /**
     * Clear all drag states
     */
    clearAllDragStates() {
        this.dragState.clear();
    }

    /**
     * Check if a token is currently being dragged
     * @param {string} tokenId 
     * @returns {boolean}
     */
    isTokenBeingDragged(tokenId) {
        const dragInfo = this.dragState.get(tokenId);
        return dragInfo && dragInfo.isActive;
    }
}