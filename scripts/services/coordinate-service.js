/**
 * Coordinate Service for Smart Token Routing
 * Wraps routinglib coordinate helper for centralized coordinate conversions
 */
export class CoordinateService {
    constructor(moduleName, settingsService) {
        this.MODULE_NAME = moduleName;
        this.settingsService = settingsService;
    }

    /**
     * Get the centralized coordinate helper from routinglib
     * This ensures both modules use exactly the same coordinate calculations
     * @returns {Object} Coordinate helper from routinglib
     */
    getCoordinateHelper() {
        if (window.routinglib?.coordinateHelper) {
            // Enable debug mode based on our module setting
            window.routinglib.coordinateHelper.setDebugEnabled(
                this.settingsService.isDebugMode()
            );
            return window.routinglib.coordinateHelper;
        }
        
        // If routinglib helper is not available, throw error
        throw new Error("RoutingLib coordinate helper not available. Make sure routinglib is loaded.");
    }

    /**
     * Convert pixel coordinates to grid coordinates using centralized helper
     * @param {Object} pixelPos - Position in pixels {x, y}
     * @param {Object} tokenData - Token data for sizing calculations
     * @returns {Object} Grid position {x, y}
     */
    pixelsToGridPosition(pixelPos, tokenData = null) {
        return this.getCoordinateHelper().pixelToGridBounded(pixelPos, tokenData);
    }
    
    /**
     * Convert grid coordinates to pixel coordinates using centralized helper
     * @param {Object} gridPos - Grid position {x, y}
     * @param {Object} tokenData - Token data for sizing calculations
     * @returns {Object} Pixel position {x, y}
     */
    gridToPixelPosition(gridPos, tokenData = null) {
        return this.getCoordinateHelper().gridPosToPixel(gridPos, tokenData);
    }

    /**
     * Get token data for coordinate calculations
     * @param {Token} token - The token object
     * @returns {Object} Token data for coordinate calculations
     */
    getTokenData(token) {
        return this.getCoordinateHelper().getTokenData(token);
    }

    /**
     * Check if routinglib coordinate helper is available
     * @returns {boolean}
     */
    isCoordinateHelperAvailable() {
        return window.routinglib?.coordinateHelper != null;
    }

    /**
     * Calculate Manhattan distance between two grid positions
     * @param {Object} gridPos1 - First grid position {x, y}
     * @param {Object} gridPos2 - Second grid position {x, y}
     * @returns {number} Manhattan distance
     */
    calculateManhattanDistance(gridPos1, gridPos2) {
        return Math.abs(gridPos2.x - gridPos1.x) + Math.abs(gridPos2.y - gridPos1.y);
    }

    /**
     * Calculate Euclidean distance between two grid positions
     * @param {Object} gridPos1 - First grid position {x, y}
     * @param {Object} gridPos2 - Second grid position {x, y}
     * @returns {number} Euclidean distance
     */
    calculateEuclideanDistance(gridPos1, gridPos2) {
        const dx = gridPos2.x - gridPos1.x;
        const dy = gridPos2.y - gridPos1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Validate that coordinates are within valid bounds
     * @param {Object} pos - Position to validate {x, y}
     * @returns {boolean} True if coordinates are valid
     */
    validateCoordinates(pos) {
        return pos.x >= 0 && pos.y >= 0 && 
               Number.isFinite(pos.x) && Number.isFinite(pos.y);
    }
}