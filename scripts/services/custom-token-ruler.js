/**
 * Custom Token Ruler functionality for Smart Token Routing
 * Provides movement range-based grid highlighting by overriding TokenRuler methods
 */

/**
 * Reference to movement calculation service instance (will be injected)
 */
let movementCalculationService = null;

/**
 * Set the movement calculation service reference for grid highlighting
 * @param {MovementCalculationService} service - The movement calculation service instance
 */
export function setMovementCalculationService(service) {
    movementCalculationService = service;
}

/**
 * Reference to combat service instance (will be injected)
 */
let combatService = null;

/**
 * Set the combat service reference for grid highlighting
 * @param {CombatService} service - The combat service instance
 */
export function setCombatService(service) {
    combatService = service;
}

/**
 * Custom grid highlight style function
 * @param {Token} token - The token instance
 * @param {Object} waypoint - The waypoint data
 * @param {Object} offset - The grid offset position
 * @returns {Object} Style configuration with color, alpha, etc.
 */
function getCustomGridHighlightStyle(token, waypoint, offset) {
    setTimeout(() => {
        token.refresh();
    }, 100)
    console.log(getCalculatedGridColorSync(token));
    return getCalculatedGridColorSync(token);
}

/**
 * Get the calculated color based on remaining movement in combat
 * @param {Token} token - The token instance
 * @returns {Object} Style configuration with color, alpha, etc.
 */
function getCalculatedGridColorSync(token) {
    try {
        // Get ruler text for current movement cost to this square
        const rulerLabelText = $(".total-measurement", token.ruler.labels).text();
        console.log(rulerLabelText);
        
        // Use movement calculation service to extract cost
        const movementCostToSquare = movementCalculationService ? 
            movementCalculationService.getMovementCostSync(token) : null;
        
        // If we can't get the movement cost from ruler, show green (neutral)
        if (movementCostToSquare === null) {
            return { color: 0x00FF00, alpha: 0.3 };
        }
        
        // Get character's total movement capacity
        const characterMaxMovement = movementCalculationService ? 
            movementCalculationService.getSystemMovementRange(token.actor) : 6;
        
        // Get movement already used this combat round (terrain-aware)
        const usedMovement = combatService ? combatService.getCombatMovementUsed(token.id, game.combat?.round) : 0;
        
        // Calculate remaining movement capacity
        const remainingMovement = characterMaxMovement - usedMovement;
        
        // Debug logging
        if (game.settings.get("routing-token", "debugMode")) {
            console.log(`[routing-token] Combat movement analysis:`, {
                maxMovement: `${characterMaxMovement} ${canvas.scene.grid.units}`,
                usedMovement: `${usedMovement} ${canvas.scene.grid.units}`,
                remainingMovement: `${remainingMovement} ${canvas.scene.grid.units}`,
                costToSquare: `${movementCostToSquare} ${canvas.scene.grid.units}`,
                canReach: movementCostToSquare <= remainingMovement
            });
        }
        
        // Color based on remaining movement capacity
        if (movementCostToSquare <= remainingMovement) {
            return { color: 0x00FF00, alpha: 0.3 }; // Green - can reach with remaining movement
        } else {
            return { color: 0xFF0000, alpha: 0.2 }; // Red - exceeds remaining movement
        }
        
    } catch (error) {
        if (game.settings.get("routing-token", "debugMode")) {
            console.warn(`[routing-token] Error in combat movement color calculation:`, error);
        }
        // Fallback to green if something goes wrong
        return { color: 0x00FF00, alpha: 0.3 };
    }
}


/**
 * Apply custom TokenRuler overrides to the Token prototype
 */
export function setupCustomTokenRulerMethods() {
    // Find the TokenRuler class in FoundryVTT's structure
    let TokenRulerClass = null;
    
    if (foundry?.canvas?.placeables?.tokens?.TokenRuler) {
        TokenRulerClass = foundry.canvas.placeables.tokens.TokenRuler;
    } else if (CONFIG.Token?.rulerClass) {
        TokenRulerClass = CONFIG.Token.rulerClass;
    } else {
        // Try to find it by looking at a token's ruler instance
        const tokens = canvas?.tokens?.placeables || [];
        if (tokens.length > 0 && tokens[0].ruler) {
            TokenRulerClass = tokens[0].ruler.constructor;
        }
    }
    
    if (TokenRulerClass && TokenRulerClass.prototype) {
        // Override the _getGridHighlightStyle method
        TokenRulerClass.prototype._getGridHighlightStyle = function(waypoint, offset) {
            console.log("Cambio de color")
            return getCustomGridHighlightStyle(this.token, waypoint, offset);
        };
        
        if (game.settings.get("routing-token", "debugMode")) {
            console.log(`[routing-token] Custom grid highlighting applied to ${TokenRulerClass.name}`);
        }
        
        return true;
    } else {
        console.warn(`[routing-token] Could not find TokenRuler class to override`);
        return false;
    }
}