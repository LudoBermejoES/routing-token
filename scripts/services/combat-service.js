/**
 * Combat Service for Smart Token Routing
 * Handles terrain-aware movement tracking during combat
 */
export class CombatService {
    constructor(moduleName, movementCalculationService) {
        this.MODULE_NAME = moduleName;
        this.movementCalculationService = movementCalculationService;
        this.combatMovement = new Map(); // tokenId -> { round, totalTerrainMovement, movements[] }
        this.registeredHooks = new Set();
    }

    /**
     * Initialize combat movement tracking hooks
     */
    setupCombatHooks() {
        // Track token movement during combat
        const updateTokenHook = Hooks.on("updateToken", this.onTokenUpdate.bind(this));
        this.registeredHooks.add({ id: updateTokenHook, event: "updateToken" });
        
        // Reset movement tracking on new combat round
        const updateCombatHook = Hooks.on("updateCombat", this.onCombatUpdate.bind(this));
        this.registeredHooks.add({ id: updateCombatHook, event: "updateCombat" });
        
        // Clean up when combat ends
        const deleteCombatHook = Hooks.on("deleteCombat", this.onCombatDelete.bind(this));
        this.registeredHooks.add({ id: deleteCombatHook, event: "deleteCombat" });
        
        if (game.settings.get(this.MODULE_NAME, "debugMode")) {
            console.log(`[${this.MODULE_NAME}] Combat movement tracking hooks installed`);
        }
    }

    /**
     * Handle token position updates during combat
     * @param {TokenDocument} tokenDocument - The token document being updated
     * @param {Object} changes - The changes being applied
     * @param {Object} options - Update options
     * @param {string} userId - ID of the user making the change
     */
    async onTokenUpdate(tokenDocument, changes, options, userId) {
        // Only track if we're in combat and position changed
        if (!game.combat || (!changes.x && !changes.y)) return;
        
        try {
            const token = tokenDocument.object;
            if (!token) return;
            
            // Calculate old position
            const currentX = tokenDocument.x;
            const currentY = tokenDocument.y;
            const oldX = changes.x !== undefined ? currentX - (changes.x - currentX) : currentX;
            const oldY = changes.y !== undefined ? currentY - (changes.y - currentY) : currentY;
            
            const fromPos = { x: oldX, y: oldY };
            const toPos = { x: changes.x || currentX, y: changes.y || currentY };
            
            // Skip if no actual movement
            if (fromPos.x === toPos.x && fromPos.y === toPos.y) return;
            
            // Calculate terrain-aware movement cost
            const terrainCost = await this.movementCalculationService.calculateTerrainMovementCost(token, fromPos, toPos);
            
            // Add to combat tracking
            this.addCombatMovement(token.id, game.combat.round, terrainCost, fromPos, toPos);
            
        } catch (error) {
            if (game.settings.get(this.MODULE_NAME, "debugMode")) {
                console.warn(`[${this.MODULE_NAME}] Error tracking combat movement:`, error);
            }
        }
    }

    /**
     * Handle combat updates (new rounds)
     * @param {Combat} combat - The combat document
     * @param {Object} changes - The changes being applied
     * @param {Object} options - Update options
     * @param {string} userId - ID of the user making the change
     */
    onCombatUpdate(combat, changes, options, userId) {
        if (changes.round) {
            this.resetRoundMovement(changes.round);
        }
    }

    /**
     * Handle combat deletion
     * @param {Combat} combat - The combat document being deleted
     * @param {Object} options - Deletion options
     * @param {string} userId - ID of the user making the change
     */
    onCombatDelete(combat, options, userId) {
        this.combatMovement.clear();
        if (game.settings.get(this.MODULE_NAME, "debugMode")) {
            console.log(`[${this.MODULE_NAME}] Combat ended - cleared movement tracking`);
        }
    }


    /**
     * Add movement to combat tracking
     * @param {string} tokenId - Token ID
     * @param {number} round - Current combat round
     * @param {number} terrainCost - Terrain-adjusted movement cost
     * @param {Object} fromPos - Starting position
     * @param {Object} toPos - Ending position
     */
    addCombatMovement(tokenId, round, terrainCost, fromPos, toPos) {
        if (!game.combat || !round) return;
        
        const currentData = this.combatMovement.get(tokenId) || {
            round: round,
            totalTerrainMovement: 0,
            movements: []
        };
        
        // Reset if new round
        if (currentData.round !== round) {
            currentData.round = round;
            currentData.totalTerrainMovement = 0;
            currentData.movements = [];
        }
        
        // Add this movement
        currentData.totalTerrainMovement += terrainCost;
        currentData.movements.push({
            from: fromPos,
            to: toPos,
            terrainCost: terrainCost,
            timestamp: Date.now()
        });
        
        this.combatMovement.set(tokenId, currentData);
        
        if (game.settings.get(this.MODULE_NAME, "debugMode")) {
            console.log(`[${this.MODULE_NAME}] Combat movement tracked for ${tokenId}:`, {
                round: round,
                thisMovement: `${terrainCost} ${canvas.scene.grid.units}`,
                totalUsed: `${currentData.totalTerrainMovement} ${canvas.scene.grid.units}`
            });
        }
    }

    /**
     * Get total movement used by token in current combat round
     * @param {string} tokenId - Token ID
     * @param {number} round - Combat round
     * @returns {number} Total terrain-adjusted movement used
     */
    getCombatMovementUsed(tokenId, round) {
        if (!game.combat || !round) return 0;
        
        const data = this.combatMovement.get(tokenId);
        if (!data || data.round !== round) return 0;
        
        return data.totalTerrainMovement;
    }

    /**
     * Reset movement tracking for all tokens in a new round
     * @param {number} newRound - New combat round
     */
    resetRoundMovement(newRound) {
        if (game.settings.get(this.MODULE_NAME, "debugMode")) {
            console.log(`[${this.MODULE_NAME}] Resetting movement tracking for round ${newRound}`);
        }
        
        // Clear all movement data (will be recreated as needed)
        this.combatMovement.clear();
    }

    /**
     * Get detailed combat movement information for a token (for debugging/UI)
     * @param {string} tokenId - Token ID
     * @returns {Object} Movement information object
     */
    getMovementInfo(tokenId) {
        if (!game.combat) {
            return { inCombat: false };
        }
        
        const data = this.combatMovement.get(tokenId);
        const token = canvas.tokens.get(tokenId);
        const maxMovement = token ? this.movementCalculationService.getSystemMovementRange(token.actor) : 0;
        const usedMovement = data ? data.totalTerrainMovement : 0;
        const remainingMovement = maxMovement - usedMovement;
        
        return {
            inCombat: true,
            round: game.combat.round,
            maxMovement: maxMovement,
            usedMovement: usedMovement,
            remainingMovement: remainingMovement,
            movements: data ? data.movements : [],
            units: canvas.scene.grid.units
        };
    }

    /**
     * Remove all registered hooks (cleanup)
     */
    cleanup() {
        for (const hook of this.registeredHooks) {
            try {
                Hooks.off(hook.event, hook.id);
            } catch (error) {
                console.warn(`[${this.MODULE_NAME}] Error removing combat hook ${hook.event}:`, error);
            }
        }
        this.registeredHooks.clear();
        this.combatMovement.clear();
        
        if (game.settings.get(this.MODULE_NAME, "debugMode")) {
            console.log(`[${this.MODULE_NAME}] Combat service cleaned up`);
        }
    }
}