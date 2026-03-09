const { isSubclass } = foundry.utils;

/**
 * Application responsible for displaying media on a scene.
 * @param {Object}     options                      Options which change how a media is displayed on the scene.
 * @param {string}     options.src                  Source URL of the media to share.
 * @param {string}     options.targetArea           Area to display to.
 * @param {...unknown} [options.additionalOptions]  Others additional options.
 * @throws {Error} If basic arguments are not met.
 */
export default class SceneLayer {
  constructor(options) {
    // Check basic arguments
    if (!options.src || !options.targetArea)
      throw new Error(
        'You must pass a valid "src" and "area document uuid" to instantiate the class "SceneLayer".',
      );

    // Assign optional arguments
    this.options = { ...options };
  }

  /* -------------------------------------------- */
  /*  Rendering
  /* -------------------------------------------- */

  /**
   * Handle rendering a media on the scene.
   * @returns {Promise<Document | undefined>}
   */
  async render() {
    const { targetArea, ...data } = this.options;

    // Store media flags on the document level
    // [INFO] Foundry will pick up on the changes and the media layer will display the appropriate sprite
    // @see MediaLayer
    return game.canvas["shm-media-layer"].createAreaMediaData(targetArea, data);
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured SceneLayer implementation with mixins applied.
   * @type {typeof SceneLayer}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.layers.SceneLayer;
    if (!isSubclass(Class, SceneLayer)) {
      console.warn("Configured SceneLayer override must be a subclass of SceneLayer.");
      Class = SceneLayer;
    }
    return Class;
  }
}
