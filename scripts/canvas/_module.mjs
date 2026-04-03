export { default as MediaLayer } from "./media-layer.mjs";
export { default as MediaSprite } from "./media-sprite.mjs";
export { default as RegionSprite } from "./region-sprite.mjs";
export { default as TileSprite } from "./tile-sprite.mjs";
export { default as ShareRegionBehaviorType } from "./share-region-behavior.mjs";
export * as apps from "./apps/_module.mjs";

/**
 * Register the needed region behaviors.
 */
export const registerRegionBehaviors = () => {
  const config = CONFIG.shareMedia;
  const shareRegionBehaviorType = config.canvas.ShareRegionBehaviorType;

  // Register the behavior implementation
  CONFIG.RegionBehavior.dataModels[shareRegionBehaviorType.type] =
    shareRegionBehaviorType.implementation;
  // Register the behavior icon
  CONFIG.RegionBehavior.typeIcons[shareRegionBehaviorType.type] =
    `far ${config.CONST.ICONS.sceneFit}`;
};

/**
 * Register the needed tile configuration.
 */
export const registerTileConfiguration = () => {
  Hooks.on("renderTileConfig", (application, element, _context, _option) => {
    if (!game.user.isGM) return;

    // Static flag names
    const { MEDIA_TILE_ENABLED } = game.canvas["shm-media-layer"].constructor;

    // Get current value
    const enabled = application.document.getFlag("share-media", MEDIA_TILE_ENABLED) ?? false;

    // HTML to insert
    const html = `
      <fieldset>
        <legend>${_loc("share-media.canvas.layer.tile.label")}</legend>
        <div class="form-group">
          <label for="flags.share-media.${MEDIA_TILE_ENABLED}">${_loc("share-media.canvas.layer.tile.enabled.label")}</label>
          <div class="shm form-fields">
            <input type="checkbox" name="flags.share-media.${MEDIA_TILE_ENABLED}" id="flags.share-media.${MEDIA_TILE_ENABLED}" ${enabled ? "checked" : ""}>
          </div>
          <p class="hint">${_loc("share-media.canvas.layer.tile.enabled.description")}</p>
        </div>
      </fieldset>
    `;

    // Get the tab and insert
    const tab = element.querySelector('.tab[data-tab="appearance"]');
    if (!tab) return;
    tab.insertAdjacentHTML("beforeend", html);
  });
};

/**
 * Register the needed media layer.
 */
export const registerMediaLayer = () => {
  // Blacklist settings
  const blacklistSettings = game.modules.shareMedia.settings.get(
    CONFIG.shareMedia.CONST.MODULE_SETTINGS.blacklistSettings,
  );

  // Add the media layer to the list of layers to render
  // Do that only if the current user is not blacklisted
  if (!blacklistSettings.includes(game.userId)) {
    CONFIG.Canvas.layers["shm-media-layer"] = {
      group: "interface",
      layerClass: CONFIG.shareMedia.canvas.MediaLayer.implementation,
    };
  }
};
