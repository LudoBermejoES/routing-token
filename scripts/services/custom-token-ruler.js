/**
 * Custom Token Ruler functionality for Smart Token Routing
 * Provides movement range-based grid highlighting by overriding TokenRuler methods
 */

/**
 * Calculate maximum movement range based on game system
 * @param {Actor} actor - The actor to calculate movement for
 * @returns {number} Maximum movement range in game units
 */
function getSystemMovementRange(actor) {
    const systemId = game.system.id;
    
    switch (systemId) {
        case 'swade':
            return getSwadeMovementRange(actor);
        case 'dnd5e':
            return getDnd5eMovementRange(actor);
        case 'pf2e':
            return getPf2eMovementRange(actor);
        default:
            return 6; // Default fallback
    }
}

/**
 * Calculate movement range for SWADE system
 * @param {Actor} actor - The SWADE actor
 * @returns {number} Movement range in inches
 */
function getSwadeMovementRange(actor) {
    try {
        const pace = actor?.system?.pace;
        if (!pace) return 6; // Default SWADE pace
        
        const groundPace = pace.ground?.value ?? pace.default ?? 6;
        return Math.max(1, groundPace);
    } catch (error) {
        if (game.settings.get("routing-token", "debugMode")) {
            console.warn(`[routing-token] Error calculating SWADE movement for ${actor.name}:`, error);
        }
        return 6;
    }
}

/**
 * Calculate movement range for D&D 5e system
 * @param {Actor} actor - The D&D 5e actor
 * @returns {number} Movement range in feet
 */
function getDnd5eMovementRange(actor) {
    try {
        const speed = actor?.system?.attributes?.movement?.walk ?? 30;
        return Math.max(5, speed);
    } catch (error) {
        if (game.settings.get("routing-token", "debugMode")) {
            console.warn(`[routing-token] Error calculating D&D 5e movement for ${actor.name}:`, error);
        }
        return 30;
    }
}

/**
 * Calculate movement range for Pathfinder 2e system
 * @param {Actor} actor - The PF2e actor
 * @returns {number} Movement range in feet
 */
function getPf2eMovementRange(actor) {
    try {
        const speed = actor?.system?.attributes?.speed?.value ?? 25;
        return Math.max(5, speed);
    } catch (error) {
        if (game.settings.get("routing-token", "debugMode")) {
            console.warn(`[routing-token] Error calculating PF2e movement for ${actor.name}:`, error);
        }
        return 25;
    }
}

/**
 * Calculate terrain-adjusted movement cost from ruler label with delay - the ONLY working method
 * @param {Token} token - The token instance
 * @returns {Promise<number|null>} Promise that resolves to terrain-adjusted movement cost or null if not available
 */
async function calculateMovementCost(token) {
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
        if (game.settings.get("routing-token", "debugMode")) {
            console.warn("[routing-token] Could not extract cost from ruler label:", error);
        }
    }
    return null;
}

/**
 * Track if we're in delayed calculation mode for each token
 */
const tokenCalculationState = new Map();

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
      return getCalculatedGridColorSync(token);
}

/**
 * Get the calculated color synchronously (used after delay is complete)
 * @param {Token} token - The token instance
 * @returns {Object} Style configuration with color, alpha, etc.
 */
function getCalculatedGridColorSync(token) {
    try {
        // Get ruler text immediately (no delay needed since we already waited)
        const rulerLabelText = $(".total-measurement", token.ruler.labels).text();

        console.log(rulerLabelText);
        let movementCost = null;
        
        if (rulerLabelText) {
            const numericMatch = rulerLabelText.match(/(\d+(?:\.\d+)?)/);
            if (numericMatch) {
                movementCost = parseFloat(numericMatch[1]);
            }
        }
        
        // If we can't get the movement cost from ruler, show green (neutral)
        if (movementCost === null) {
            return { color: 0x00FF00, alpha: 0.3 };
        }
        
        // Get character's movement range
        const characterMovementRange = getSystemMovementRange(token.actor);
        
        // Simple binary coloring: green if within range, red if beyond
        if (movementCost <= characterMovementRange) {
            return { color: 0x00FF00, alpha: 0.3 }; // Green for within range
        } else {
            return { color: 0xFF0000, alpha: 0.2 }; // Red for beyond range
        }
        
    } catch (error) {
        if (game.settings.get("routing-token", "debugMode")) {
            console.warn(`[routing-token] Error in sync grid color calculation:`, error);
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