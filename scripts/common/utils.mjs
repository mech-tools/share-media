/* -------------------------------------------- */
/*  Utils functions used throughout the module
/* -------------------------------------------- */

/**
 * Register and preload handlebars partials.
 */
export const registerHandlebarsPartials = () => {
  foundry.applications.handlebars.loadTemplates({
    "share-media.media": "modules/share-media/templates/partials/media.hbs",
  });
};

/* -------------------------------------------- */

/**
 * Waits for the next animation frame(s).
 * Useful for deferring execution until after the browser has repainted.
 * @param {number} [count]  Number of animation frames to wait for (default: 1)
 * @returns {Promise<void>}
 */
export const nextAnimationFrames = async (count = 1) => {
  const promises = Array.from(
    { length: count },
    () => new Promise((resolve) => requestAnimationFrame(resolve)),
  );
  await Promise.all(promises);
};

/* -------------------------------------------- */

/**
 * Attempt to retrieve the source of an HTML media element.
 * @param {HTMLElement} element  The element being analyzed.
 * @returns {string | null}
 */
export const getMediaSource = (element) => {
  if (!["IMG", "VIDEO"].includes(element?.tagName)) return null;
  return (
    element.getAttribute("src") || element.querySelector("source[src]")?.getAttribute("src") || null
  );
};

/* -------------------------------------------- */

/**
 * Escape the URL, strip the origin, and replace dots with dashes as Foundry is using its own dot notation.
 * @param {string} url  The URL to escape.
 * @returns {string}
 */
export const escapeSource = (url) => {
  // [NOTE] handling relative URLs with a fake base
  const urlObj = new URL(url, "http://relative.url");
  return encodeURIComponent(urlObj.pathname + urlObj.search + urlObj.hash).replace(/\./g, "-");
};

/* -------------------------------------------- */

/**
 * Determine if a file is a video file (by extension)
 * @param {string} source  Source URL of a file.
 * @returns {boolean}
 */
export const isVideo = (source) => {
  return foundry.helpers.media.VideoHelper.hasVideoExtension(source);
};

/* -------------------------------------------- */

/**
 * Apply a flattened media settings object to a media options object for a specific mode.
 * @param {string} mode      The target mode to apply settings to.
 * @param {Object} options   Target media options object to modify.
 * @param {Object} settings  Flattened settings object to apply.
 */
export const applySettingsToMediaOptions = (mode, options, settings) => {
  if (Object.keys(settings).length === 0) return;

  // Set mode
  options.mode = mode;

  // Create reverse lookup map for efficient searching: property -> section (mode)
  const propMap = new Map(
    Object.entries(options.settings).flatMap(([section, settings]) =>
      Object.keys(settings).map((prop) => [prop, section]),
    ),
  );

  // Iterate on settings
  for (const [prop, value] of Object.entries(settings)) {
    const otherModes = Object.keys(CONFIG.shareMedia.CONST.LAYERS_MODES).filter((m) => m !== mode);
    const existsInOtherMode = otherModes.some((m) => prop in (options.settings[m] || {}));
    const section =
      prop in (options.settings[mode] || {}) ? mode : !existsInOtherMode ? propMap.get(prop) : null;

    // Assign only props that part of the mode
    // Assign others props only if they are not part of others modes
    if (section && options.settings[section]) {
      options.settings[section][prop] = value;
      continue;
    }

    // Add the remaining props
    options[prop] = value;
  }
};

/* -------------------------------------------- */

/**
 * Get the settings for a media depending on a specific mode.
 * Get all mode settings + all others mode settings that are not layer specific and pass media validation.
 * @param {string}  src       Source URL of a media.
 * @param {string}  mode      The initial mode.
 * @param {objects} settings  List of all settings modes.
 * @returns {Partial<typeof CONFIG.shareMedia.CONST.MEDIA_SETTINGS>}
 */
export const getMediaSettings = (src, mode, settings) => {
  return Object.entries(settings).reduce((acc, [key, value]) => {
    // The mode
    if (key === mode) Object.assign(acc, value);
    // Not the mode
    else if (!Object.values(CONFIG.shareMedia.CONST.LAYERS_MODES).includes(key)) {
      const validator = CONFIG.shareMedia.CONST.MEDIA_SETTINGS_VALIDATORS[key];
      if (validator && validator(src)) {
        Object.assign(acc, value);
      }
    }
    return acc;
  }, {});
};

/* -------------------------------------------- */

/**
 * Get available area documents.
 * Regions must have at least one "ShareRegionBehaviorType" behavior not disabled.
 * Tiles should have a specific flag enabled.
 * @returns {Array<RegionDocument | TileDocument>}
 */
export const getAvailableAreas = () => {
  if (!game.canvas) return [];

  // Filter regions on the current scene
  const regions = game.canvas.regions.placeables
    .filter(
      (region) =>
        region.document.shapes.length > 0 &&
        region.document.behaviors.some(
          (behavior) =>
            behavior.type === CONFIG.shareMedia.canvas.ShareRegionBehaviorType.type &&
            !behavior.disabled,
        ),
    )
    .map((region) => region.document);

  // Filters tiles on the current scene
  const tiles = game.canvas.tiles.placeables
    .filter((tile) =>
      tile.document.getFlag(
        "share-media",
        game.canvas["shm-media-layer"].constructor.MEDIA_TILE_ENABLED,
      ),
    )
    .map((tile) => tile.document);

  return [...regions, ...tiles];
};
