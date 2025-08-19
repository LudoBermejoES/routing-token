/**
 * Token Movement Service for Smart Token Routing
 * Handles token movement and animations through waypoints
 */
export class TokenMovementService {
    constructor(moduleName, settingsService) {
        this.MODULE_NAME = moduleName;
        this.settingsService = settingsService;
        this.animatingTokens = new Set(); // Track tokens currently animating through waypoints
    }

    /**
     * Move token through waypoints using FoundryVTT v13 native waypoint system
     * @param {Token} token - The token to move
     * @param {Array} pixelPath - Array of pixel coordinates for waypoints
     */
    async moveTokenThroughWaypoints(token, pixelPath) {
        if (!pixelPath || pixelPath.length < 2) return;
        
        try {
            // Mark token as animating
            this.animatingTokens.add(token.id);
            
            if (this.settingsService.isDebugMode()) {
                console.log(`[${this.MODULE_NAME}] 🎬 Starting FoundryVTT v13 waypoint movement for ${token.name}`);
                console.log(`[${this.MODULE_NAME}] Full pixel path received:`, pixelPath.map(p => `(${Math.round(p.x)},${Math.round(p.y)})`).join(' → '));
            }
            
            // Convert pixel path to FoundryVTT v13 waypoint format
            // Skip the first waypoint (current position) - FoundryVTT move() expects destinations only
            const destinationWaypoints = pixelPath.slice(1).map((point, index) => {
                // Don't use FoundryVTT's snapping since it's causing issues
                // Use our pixel coordinates directly since they're already calculated correctly
                // These coordinates represent the centers of grid cells
                const finalPoint = { x: point.x, y: point.y };
                
                if (this.settingsService.isDebugMode()) {
                    console.log(`[${this.MODULE_NAME}] Waypoint ${index + 1}: (${Math.round(point.x)},${Math.round(point.y)}) → using directly (${finalPoint.x},${finalPoint.y})`);
                }
                
                return {
                    x: finalPoint.x,
                    y: finalPoint.y,
                    snapped: true  // FoundryVTT v13 waypoint property
                };
            });
            
            if (this.settingsService.isDebugMode()) {
                console.log(`[${this.MODULE_NAME}] Final FoundryVTT waypoints:`, destinationWaypoints.map(w => `(${w.x},${w.y})`).join(' → '));
                console.log(`[${this.MODULE_NAME}] Moving token through ${destinationWaypoints.length} waypoints`);
            }
            
            // Use FoundryVTT's native TokenDocument.move() exactly like the examples
            await token.document.move(destinationWaypoints, { 
                showRuler: true,
                routing_token_movement: true  // Flag to prevent our hooks from interfering
            });
            
            if (this.settingsService.isDebugMode()) {
                console.log(`[${this.MODULE_NAME}] ✅ Native waypoint movement completed for ${token.name}`);
            }
            
        } catch (error) {
            if (this.settingsService.isDebugMode()) {
                console.warn(`[${this.MODULE_NAME}] Native waypoint movement error:`, error);
            }
        } finally {
            // Clear animation flag
            this.animatingTokens.delete(token.id);
        }
    }

    /**
     * Update the token's ruler to display the calculated path
     * Uses FoundryVTT v13's native updateDragRulerPath method if available
     * @param {Token} token - The token whose ruler to update
     * @param {Array} pixelPath - Array of pixel coordinates for the path
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
            
            if (this.settingsService.isDebugMode()) {
                console.log(`[${this.MODULE_NAME}] 📏 Updated ruler with ${waypoints.length} waypoints for ${token.name}`);
            }
            
        } catch (error) {
            if (this.settingsService.isDebugMode()) {
                console.warn(`[${this.MODULE_NAME}] Failed to update token ruler:`, error);
            }
        }
    }

    /**
     * Check if a token is currently animating
     * @param {string} tokenId - The token's ID
     * @returns {boolean} True if token is animating
     */
    isTokenAnimating(tokenId) {
        return this.animatingTokens.has(tokenId);
    }

    /**
     * Get all currently animating token IDs
     * @returns {Set<string>} Set of token IDs that are animating
     */
    getAnimatingTokens() {
        return new Set(this.animatingTokens);
    }

    /**
     * Clear all animation states (cleanup)
     */
    clearAllAnimations() {
        this.animatingTokens.clear();
    }

    /**
     * Force stop animation for a specific token
     * @param {string} tokenId - The token's ID
     */
    stopTokenAnimation(tokenId) {
        this.animatingTokens.delete(tokenId);
    }
}