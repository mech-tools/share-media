/**
 * Class responsible for caching module settings.
 */
export default class SettingsCache {
  /**
   * Settings cache.
   * @type {Map}
   */
  static #cache = new Map();

  /**
   * Get a setting value from cache or retrieve it if not cached.
   * @param {string} key  The setting key to retrieve.
   * @returns {unknown}
   */
  static get(key) {
    if (!this.#cache.has(key)) {
      this.#cache.set(key, game.settings.get("share-media", key));
    }

    // Return a copie of the setting to prevent from mutations
    return structuredClone(this.#cache.get(key));
  }

  /**
   * Update a setting value in both cache and game settings.
   * @param {string}  key    The setting key to update.
   * @param {unknown} value  The new value to set.
   * @returns {Promise<void>}
   */
  static async set(key, value) {
    await game.settings.set("share-media", key, value);
    this.#cache.set(key, value);
  }
}
