/**
 * Movement Calculation Service for Smart Token Routing
 * Handles system-specific movement range calculations and terrain-aware movement costs
 */
export class MovementCalculationService {
    constructor(moduleName) {
        this.MODULE_NAME = moduleName;
    }

    /**
     * Calculate maximum movement range based on game system
     * @param {Actor} actor - The actor to calculate movement for
     * @returns {number} Maximum movement range in game units
     */
    getSystemMovementRange(actor) {
        const systemId = game.system.id;
        
        switch (systemId) {
            case 'swade':
                return this.getSwadeMovementRange(actor);
            case 'dnd5e':
                return this.getDnd5eMovementRange(actor);
            case 'pf2e':
                return this.getPf2eMovementRange(actor);
            default:
                return 6; // Default fallback
        }
    }

    /**
     * Calculate movement range for SWADE system
     * @param {Actor} actor - The SWADE actor
     * @returns {number} Movement range in inches
     */
    getSwadeMovementRange(actor) {
        try {
            const pace = actor?.system?.pace;
            if (!pace) return 6; // Default SWADE pace
            
            const groundPace = pace.ground?.value ?? pace.default ?? 6;
            return Math.max(1, groundPace);
        } catch (error) {
            if (game.settings.get(this.MODULE_NAME, "debugMode")) {
                console.warn(`[${this.MODULE_NAME}] Error calculating SWADE movement for ${actor.name}:`, error);
            }
            return 6;
        }
    }

    /**
     * Calculate movement range for D&D 5e system
     * @param {Actor} actor - The D&D 5e actor
     * @returns {number} Movement range in feet
     */
    getDnd5eMovementRange(actor) {
        try {
            const speed = actor?.system?.attributes?.movement?.walk ?? 30;
            return Math.max(5, speed);
        } catch (error) {
            if (game.settings.get(this.MODULE_NAME, "debugMode")) {
                console.warn(`[${this.MODULE_NAME}] Error calculating D&D 5e movement for ${actor.name}:`, error);
            }
            return 30;
        }
    }

    /**
     * Calculate movement range for Pathfinder 2e system
     * @param {Actor} actor - The PF2e actor
     * @returns {number} Movement range in feet
     */
    getPf2eMovementRange(actor) {
        try {
            const speed = actor?.system?.attributes?.speed?.value ?? 25;
            return Math.max(5, speed);
        } catch (error) {
            if (game.settings.get(this.MODULE_NAME, "debugMode")) {
                console.warn(`[${this.MODULE_NAME}] Error calculating PF2e movement for ${actor.name}:`, error);
            }
            return 25;
        }
    }

    /**
     * Calculate terrain-adjusted movement cost from ruler label with delay
     * @param {Token} token - The token instance
     * @returns {Promise<number|null>} Promise that resolves to terrain-adjusted movement cost or null if not available
     */
    async calculateMovementCost(token) {
        // Wait 100ms for ruler to update properly
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
            // Extract terrain-adjusted cost from ruler label - this is the only method that works
            const rulerLabelText = $(".total-measurement", token.ruler.labels).text();
            if (rulerLabelText) {
                // Extract numeric part from text like "14 in" or "12 ft"
                const numericMatch = rulerLabelText.match(/(\d+(?:\.\d+)?)/);
                if (numericMatch) {
                    return parseFloat(numericMatch[1]);
                }
            }
        } catch (error) {
            // Silent fail if ruler not available
            if (game.settings.get(this.MODULE_NAME, "debugMode")) {
                console.warn(`[${this.MODULE_NAME}] Could not extract cost from ruler label:`, error);
            }
        }
        return null;
    }

    /**
     * Get terrain-adjusted movement cost synchronously from ruler label
     * @param {Token} token - The token instance
     * @returns {number|null} Terrain-adjusted movement cost or null if not available
     */
    getMovementCostSync(token) {
        try {
            // Get ruler text immediately (no delay needed since we already waited)
            const rulerLabelText = $(".total-measurement", token.ruler.labels).text();
            
            if (rulerLabelText) {
                const numericMatch = rulerLabelText.match(/(\d+(?:\.\d+)?)/);
                if (numericMatch) {
                    return parseFloat(numericMatch[1]);
                }
            }
        } catch (error) {
            if (game.settings.get(this.MODULE_NAME, "debugMode")) {
                console.warn(`[${this.MODULE_NAME}] Could not extract cost from ruler label sync:`, error);
            }
        }
        return null;
    }

    /**
     * Calculate terrain-aware movement cost between two positions
     * @param {Token} token - The token instance
     * @param {Object} fromPos - Starting position {x, y}
     * @param {Object} toPos - Ending position {x, y}
     * @returns {Promise<number>} Terrain-adjusted movement cost
     */
    async calculateTerrainMovementCost(token, fromPos, toPos) {
        try {
            // Convert pixel positions to grid positions
            const grid = token.document.parent.grid;
            const fromGrid = grid.getOffset(fromPos);
            const toGrid = grid.getOffset(toPos);
            
            // Use grid measurement to get terrain-aware distance
            const measureResult = grid.measurePath([fromGrid, toGrid]);
            let terrainCost = measureResult.distance;
            
            // Try to get more accurate terrain cost if token has ruler active
            if (token.ruler && token.ruler.active) {
                try {
                    const rulerLabelText = $(".total-measurement", token.ruler.labels).text();
                    if (rulerLabelText) {
                        const numericMatch = rulerLabelText.match(/(\d+(?:\.\d+)?)/);
                        if (numericMatch) {
                            terrainCost = parseFloat(numericMatch[1]);
                        }
                    }
                } catch (rulerError) {
                    // Use grid measurement as fallback
                }
            }
            
            if (game.settings.get(this.MODULE_NAME, "debugMode")) {
                console.log(`[${this.MODULE_NAME}] Movement cost calculated:`, {
                    from: fromPos,
                    to: toPos,
                    terrainCost: `${terrainCost} ${canvas.scene.grid.units}`,
                    method: token.ruler?.active ? 'ruler + grid' : 'grid only'
                });
            }
            
            return terrainCost;
            
        } catch (error) {
            if (game.settings.get(this.MODULE_NAME, "debugMode")) {
                console.warn(`[${this.MODULE_NAME}] Error calculating terrain movement cost:`, error);
            }
            
            // Fallback to basic distance calculation
            const gridDistance = canvas.scene.grid.distance || 5;
            const dx = Math.abs(toPos.x - fromPos.x);
            const dy = Math.abs(toPos.y - fromPos.y);
            const pixelDistance = Math.sqrt(dx * dx + dy * dy);
            
            // Convert pixel distance to grid units
            const gridSize = canvas.scene.grid.size;
            return (pixelDistance / gridSize) * gridDistance;
        }
    }
}