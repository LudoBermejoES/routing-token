/**
 * Settings Service for Smart Token Routing
 * Manages all game settings registration and retrieval
 */
export class SettingsService {
    constructor(moduleName) {
        this.MODULE_NAME = moduleName;
        this.listeners = new Map();
    }

    /**
     * Register all module settings
     */
    registerSettings() {
        this.registerPathfindingSetting();
        this.registerMaxPathDistanceSetting();
        this.registerDebugModeSetting();
        this.registerAutoFollowPathSetting();
    }

    /**
     * Register pathfinding enable/disable setting
     */
    registerPathfindingSetting() {
        game.settings.register(this.MODULE_NAME, "enablePathfinding", {
            name: game.i18n.localize("ROUTING_TOKEN.Settings.EnablePathfinding"),
            hint: game.i18n.localize("ROUTING_TOKEN.Settings.EnablePathfindingHint"),
            scope: "client",
            config: true,
            type: Boolean,
            default: true,
            onChange: (value) => {
                this.notifyListeners("enablePathfinding", value);
                console.log(`[${this.MODULE_NAME}] Pathfinding ${value ? 'enabled' : 'disabled'}`);
            }
        });
    }

    /**
     * Register maximum pathfinding distance setting
     */
    registerMaxPathDistanceSetting() {
        game.settings.register(this.MODULE_NAME, "maxPathDistance", {
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
    }

    /**
     * Register debug mode setting
     */
    registerDebugModeSetting() {
        game.settings.register(this.MODULE_NAME, "debugMode", {
            name: game.i18n.localize("ROUTING_TOKEN.Settings.DebugMode"),
            hint: game.i18n.localize("ROUTING_TOKEN.Settings.DebugModeHint"),
            scope: "client",
            config: true,
            type: Boolean,
            default: false
        });
    }

    /**
     * Register auto-follow path setting
     */
    registerAutoFollowPathSetting() {
        game.settings.register(this.MODULE_NAME, "autoFollowPath", {
            name: "Auto-Follow Calculated Paths",
            hint: "When enabled, tokens will automatically follow the calculated pathfinding route instead of moving directly to the target.",
            scope: "client",
            config: true,
            type: Boolean,
            default: true
        });
    }

    /**
     * Get a setting value
     * @param {string} settingName 
     * @returns {*} Setting value
     */
    get(settingName) {
        return game.settings.get(this.MODULE_NAME, settingName);
    }

    /**
     * Set a setting value
     * @param {string} settingName 
     * @param {*} value 
     */
    async set(settingName, value) {
        return await game.settings.set(this.MODULE_NAME, settingName, value);
    }

    /**
     * Add a listener for setting changes
     * @param {string} settingName 
     * @param {Function} callback 
     */
    addListener(settingName, callback) {
        if (!this.listeners.has(settingName)) {
            this.listeners.set(settingName, new Set());
        }
        this.listeners.get(settingName).add(callback);
    }

    /**
     * Remove a listener for setting changes
     * @param {string} settingName 
     * @param {Function} callback 
     */
    removeListener(settingName, callback) {
        if (this.listeners.has(settingName)) {
            this.listeners.get(settingName).delete(callback);
        }
    }

    /**
     * Notify all listeners of a setting change
     * @param {string} settingName 
     * @param {*} newValue 
     */
    notifyListeners(settingName, newValue) {
        if (this.listeners.has(settingName)) {
            this.listeners.get(settingName).forEach(callback => {
                try {
                    callback(newValue);
                } catch (error) {
                    console.warn(`[${this.MODULE_NAME}] Error in setting listener:`, error);
                }
            });
        }
    }

    /**
     * Check if pathfinding is enabled
     * @returns {boolean}
     */
    isPathfindingEnabled() {
        return this.get("enablePathfinding");
    }

    /**
     * Check if debug mode is enabled
     * @returns {boolean}
     */
    isDebugMode() {
        return this.get("debugMode");
    }

    /**
     * Get maximum pathfinding distance
     * @returns {number}
     */
    getMaxPathDistance() {
        return this.get("maxPathDistance");
    }

    /**
     * Check if auto-follow path is enabled
     * @returns {boolean}
     */
    isAutoFollowPathEnabled() {
        return this.get("autoFollowPath");
    }
}