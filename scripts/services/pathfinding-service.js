/**
 * Pathfinding Service for Smart Token Routing
 * Handles all pathfinding calculations and route optimization
 */
export class PathfindingService {
    constructor(moduleName, settingsService, coordinateService, tokenMovementService) {
        this.MODULE_NAME = moduleName;
        this.settingsService = settingsService;
        this.coordinateService = coordinateService;
        this.tokenMovementService = tokenMovementService;
        this.routinglibReady = false;
        this.activePathfindingJobs = new Map();
    }

    /**
     * Initialize the pathfinding service
     */
    initialize() {
        // Check if routinglib is available
        if (window.routinglib) {
            this.routinglibReady = true;
            if (this.settingsService.isDebugMode()) {
                console.log(`[${this.MODULE_NAME}] Routinglib detected and ready`);
            }
        } else {
            console.warn(`[${this.MODULE_NAME}] Routinglib not found - pathfinding will be disabled`);
        }
    }

    /**
     * Set routinglib ready state
     * @param {boolean} ready - Whether routinglib is ready
     */
    setRoutinglibReady(ready) {
        this.routinglibReady = ready;
        if (ready && this.settingsService.isDebugMode()) {
            console.log(`[${this.MODULE_NAME}] Routinglib is now ready - enhanced pathfinding enabled`);
        }
    }

    /**
     * Check if routinglib is ready
     * @returns {boolean}
     */
    isRoutinglibReady() {
        return this.routinglibReady;
    }

    /**
     * Find an accessible destination when the target is blocked by walls
     * @param {Object} gridFromPos - Starting grid position
     * @param {Object} gridToPos - Target grid position
     * @param {Object} tokenData - Token data for collision checking
     * @returns {Object} Object with finalDestination and pathDestination
     */
    async findAccessibleDestination(gridFromPos, gridToPos, tokenData) {
        // Access stepCollidesWithWall from routinglib API
        if (!window.routinglib || !window.routinglib.stepCollidesWithWall) {
            if (this.settingsService.isDebugMode()) {
                console.warn(`[${this.MODULE_NAME}] stepCollidesWithWall not available, using original destination`);
            }
            return {
                finalDestination: gridToPos,
                pathDestination: gridToPos
            };
        }
        
        const stepCollidesWithWall = window.routinglib.stepCollidesWithWall;
        
        // Check if we can move directly to the destination
        const originalBlocked = stepCollidesWithWall(gridFromPos, gridToPos, tokenData);
        
        if (!originalBlocked) {
            // Original destination is accessible
            if (this.settingsService.isDebugMode()) {
                console.log(`[${this.MODULE_NAME}] 🎯 Original destination (${gridToPos.x}, ${gridToPos.y}) is accessible`);
            }
            return {
                finalDestination: gridToPos,
                pathDestination: gridToPos
            };
        }
        
        if (this.settingsService.isDebugMode()) {
            console.log(`[${this.MODULE_NAME}] 🚫 Original destination (${gridToPos.x}, ${gridToPos.y}) is blocked, finding alternative`);
        }
        
        // Find the nearest accessible cell within a reasonable radius
        const searchRadius = 5; // Search up to 5 cells away
        let bestAlternative = null;
        let shortestDistance = Infinity;
        
        for (let radius = 1; radius <= searchRadius; radius++) {
            // Check cells in a square pattern at this radius
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Skip cells that aren't on the current radius perimeter
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    
                    const candidatePos = {
                        x: gridToPos.x + dx,
                        y: gridToPos.y + dy
                    };
                    
                    // Check if this candidate position is accessible
                    const candidateBlocked = stepCollidesWithWall(gridFromPos, candidatePos, tokenData);
                    
                    if (!candidateBlocked) {
                        const distance = Math.abs(dx) + Math.abs(dy); // Manhattan distance
                        if (distance < shortestDistance) {
                            shortestDistance = distance;
                            bestAlternative = candidatePos;
                        }
                    }
                }
            }
            
            // If we found an alternative at this radius, use it
            if (bestAlternative) break;
        }
        
        if (bestAlternative) {
            if (this.settingsService.isDebugMode()) {
                console.log(`[${this.MODULE_NAME}] 🔄 Found accessible alternative at (${bestAlternative.x}, ${bestAlternative.y}), distance: ${shortestDistance}`);
            }
            return {
                finalDestination: gridToPos, // Still want to end up at the original destination
                pathDestination: bestAlternative // But pathfind to the accessible cell
            };
        } else {
            if (this.settingsService.isDebugMode()) {
                console.log(`[${this.MODULE_NAME}] ⚠️ No accessible alternative found within ${searchRadius} cells`);
            }
            // Return original destination as fallback
            return {
                finalDestination: gridToPos,
                pathDestination: gridToPos
            };
        }
    }

    /**
     * Calculate pathfinding during drag operation
     * @param {Token} token - The token being dragged
     * @param {Object} startPos - Starting pixel position
     * @param {Object} targetPos - Target pixel position
     * @returns {Array|null} Array of pixel waypoints or null if pathfinding failed
     */
    async calculateDragPathfinding(token, startPos, targetPos) {
        if (!this.routinglibReady || !window.routinglib) {
            if (this.settingsService.isDebugMode()) {
                console.warn(`[${this.MODULE_NAME}] RoutingLib not ready - skipping pathfinding`);
            }
            return null;
        }
        
        try {
            // Add bounds checking to ensure coordinates are valid
            if (!this.coordinateService.validateCoordinates(startPos) || 
                !this.coordinateService.validateCoordinates(targetPos)) {
                if (this.settingsService.isDebugMode()) {
                    console.warn(`[${this.MODULE_NAME}] Invalid coordinates detected - skipping pathfinding`);
                }
                return null;
            }
            
            // Get token data early for use throughout the function
            const tokenData = this.coordinateService.getTokenData(token);
            
            // Calculate pathfinding route
            let gridFromPos, gridToPos;
            try {
                gridFromPos = this.coordinateService.pixelsToGridPosition(startPos, tokenData);
                gridToPos = this.coordinateService.pixelsToGridPosition(targetPos, tokenData);
            } catch (coordError) {
                if (this.settingsService.isDebugMode()) {
                    console.warn(`[${this.MODULE_NAME}] Coordinate conversion failed:`, coordError);
                }
                return null;
            }
            
            if (this.settingsService.isDebugMode()) {
                console.log(`[${this.MODULE_NAME}] 📊 Calculating drag pathfinding:`);
                console.log(`[${this.MODULE_NAME}]   Pixels: (${startPos.x}, ${startPos.y}) → (${targetPos.x}, ${targetPos.y})`);
                console.log(`[${this.MODULE_NAME}]   Grid:   (${gridFromPos.x}, ${gridFromPos.y}) → (${gridToPos.x}, ${gridToPos.y})`);
            }
            
            // Calculate a reasonable maxDistance based on the actual move distance
            const directDistance = this.coordinateService.calculateManhattanDistance(gridFromPos, gridToPos);
            const maxSearchDistance2 = Math.min(
                directDistance * 10 + 10, // Allow 3x detour plus buffer
                this.settingsService.getMaxPathDistance(), // But respect user setting
                300 // Hard limit to prevent runaway pathfinding
            );

            const maxSearchDistance = 1000
            
            if (this.settingsService.isDebugMode()) {
                console.log(`[${this.MODULE_NAME}] Direct distance: ${directDistance}, Max search: ${maxSearchDistance}`);
            }

            // Check if destination is blocked and find alternative if needed
            const { finalDestination, pathDestination } = await this.findAccessibleDestination(gridFromPos, gridToPos, tokenData);

            const result = await window.routinglib.calculatePath(gridFromPos, pathDestination, {
                token: token,
                maxDistance: maxSearchDistance
            });

            console.log(result);
            
            if (result && result.path && result.path.length > 1) {
                if (this.settingsService.isDebugMode()) {
                    console.log(`[${this.MODULE_NAME}] 🛤️ Path calculated with ${result.path.length} waypoints`);
                    console.log(`[${this.MODULE_NAME}] Raw grid path from routinglib:`, result.path.map(p => `(${p.x},${p.y})`).join(' → '));
                }
                
                // Convert grid coordinates back to pixel coordinates using token data
                let pixelPath = result.path.map(point => this.coordinateService.gridToPixelPosition(point, tokenData));
                
                // If we used an alternative destination, add the final segment to the original target
                if (finalDestination.x !== pathDestination.x || finalDestination.y !== pathDestination.y) {
                    const originalTargetPixel = this.coordinateService.gridToPixelPosition(finalDestination, tokenData);
                    pixelPath.push(originalTargetPixel);
                    
                    if (this.settingsService.isDebugMode()) {
                        console.log(`[${this.MODULE_NAME}] ➕ Added final segment to original destination (${finalDestination.x}, ${finalDestination.y})`);
                    }
                }
                
                if (this.settingsService.isDebugMode()) {
                    console.log(`[${this.MODULE_NAME}] Converted pixel path:`, pixelPath.map(p => `(${Math.round(p.x)},${Math.round(p.y)})`).join(' → '));
                }
                
                // Update the token's ruler to show the calculated path
                this.tokenMovementService.updateTokenRuler(token, pixelPath);
                
                // Return the calculated path
                return pixelPath;
                
            } else {
                // Create a direct path fallback
                const directPath = await this.createDirectPathFallback(startPos, targetPos, tokenData);
                
                // Update the token's ruler to show the direct path
                this.tokenMovementService.updateTokenRuler(token, directPath);
                
                // Return the direct path
                return directPath;
            }
            
        } catch (error) {
            if (this.settingsService.isDebugMode()) {
                console.warn(`[${this.MODULE_NAME}] Drag pathfinding error:`, error);
            }
            return null;
        }
    }

    /**
     * Create a normalized direct path fallback
     * @param {Object} startPos - Starting pixel position
     * @param {Object} targetPos - Target pixel position
     * @param {Object} tokenData - Token data for coordinate conversion
     * @returns {Array} Array of normalized waypoints
     */
    async createDirectPathFallback(startPos, targetPos, tokenData) {
        try {
            const startGrid = this.coordinateService.pixelsToGridPosition(startPos, tokenData);
            const targetGrid = this.coordinateService.pixelsToGridPosition(targetPos, tokenData);
            
            const normalizedStartPos = this.coordinateService.gridToPixelPosition(startGrid, tokenData);
            const normalizedTargetPos = this.coordinateService.gridToPixelPosition(targetGrid, tokenData);
            
            const directPath = [normalizedStartPos, normalizedTargetPos];
            
            if (this.settingsService.isDebugMode()) {
                console.log(`[${this.MODULE_NAME}] 🎯 No complex path found, using normalized direct path:`);
                console.log(`[${this.MODULE_NAME}]   Original: (${Math.round(startPos.x)},${Math.round(startPos.y)}) → (${Math.round(targetPos.x)},${Math.round(targetPos.y)})`);
                console.log(`[${this.MODULE_NAME}]   Grid: (${startGrid.x},${startGrid.y}) → (${targetGrid.x},${targetGrid.y})`);
                console.log(`[${this.MODULE_NAME}]   Normalized: (${Math.round(normalizedStartPos.x)},${Math.round(normalizedStartPos.y)}) → (${Math.round(normalizedTargetPos.x)},${Math.round(normalizedTargetPos.y)})`);
            }
            
            return directPath;
        } catch (normalizeError) {
            if (this.settingsService.isDebugMode()) {
                console.warn(`[${this.MODULE_NAME}] Failed to normalize direct path coordinates:`, normalizeError);
            }
            // Fallback to original coordinates if normalization fails
            return [startPos, targetPos];
        }
    }

    /**
     * Move token through waypoints (delegates to token movement service)
     * @param {Token} token - The token to move
     * @param {Array} pixelPath - Array of pixel coordinates for waypoints
     */
    async moveTokenThroughWaypoints(token, pixelPath) {
        return await this.tokenMovementService.moveTokenThroughWaypoints(token, pixelPath);
    }

    /**
     * Cancel all active pathfinding jobs
     */
    cancelAllPathfindingJobs() {
        for (const [tokenId, job] of this.activePathfindingJobs) {
            try {
                job.cancel();
            } catch (error) {
                console.warn(`[${this.MODULE_NAME}] Error canceling pathfinding job for token ${tokenId}:`, error);
            }
        }
        this.activePathfindingJobs.clear();
    }
}