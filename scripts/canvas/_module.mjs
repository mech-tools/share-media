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
  CONFIG.RegionBehavior.typeIcons[shareRegionBehaviorType.type] = config.CONST.ICONS.sceneFit;
};

/**
 * Register the needed tile configuration.
 */
export const registerTileConfiguration = () => {
  Hooks.on("renderTileConfig", (application, element, _context, _option) => {
    if (!game.users.current.isGM) return;

    // Static flag names
    const { MEDIA_TILE_ENABLED, MEDIA_TILE_NAME } = game.canvas["shm-media-layer"].constructor;

    // Get current values
    const enabled = application.document.getFlag("share-media", MEDIA_TILE_ENABLED) ?? false;
    const name =
      application.document.getFlag("share-media", MEDIA_TILE_NAME) ||
      game.i18n.localize("share-media.canvas.layer.tile.name.default");

    // HTML to insert
    const html = `
      <fieldset>
        <legend>${game.i18n.localize("share-media.canvas.layer.tile.label")}</legend>
        <div class="form-group">
          <label for="flags.share-media.${MEDIA_TILE_ENABLED}">${game.i18n.localize("share-media.canvas.layer.tile.enabled.label")}</label>
          <div class="shm form-fields">
            <input type="checkbox" name="flags.share-media.${MEDIA_TILE_ENABLED}" id="flags.share-media.${MEDIA_TILE_ENABLED}" ${enabled ? "checked" : ""}>
          </div>
          <p class="hint">${game.i18n.localize("share-media.canvas.layer.tile.enabled.description")}</p>
        </div>
        <div class="form-group">
          <label for="flags.share-media.${MEDIA_TILE_NAME}">${game.i18n.localize("share-media.canvas.layer.tile.name.label")}</label>
          <div class="form-fields">
            <input type="text" name="flags.share-media.${MEDIA_TILE_NAME}" id="flags.share-media.${MEDIA_TILE_NAME}" value="${name}">
          </div>
          <p class="hint">${game.i18n.localize("share-media.canvas.layer.tile.name.description")}</p>
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

    // Add a button to the tokens tools
    // [INFO] This button activates/deactivates the media layer
    Hooks.on("getSceneControlButtons", (controls) => {
      controls.tokens.tools["toggle-shm-media-layer"] = {
        name: "toggle-shm-media-layer",
        title: "share-media.canvas.layer.tool.label",
        icon: CONFIG.shareMedia.CONST.ICONS.mediaLayer,
        toggle: true,
        visible: game.users.current.isGM,
        active: (() => {
          if (!game.canvas["shm-media-layer"]) return false;
          return game.canvas["shm-media-layer"].active;
        })(),
        onChange: (_event, active) => {
          if (active) {
            if (game.canvas["shm-media-layer"].sprites.size < 1)
              ui.notifications.info(game.i18n.localize("share-media.canvas.layer.tool.zero"));
            game.canvas["shm-media-layer"].activate();
          } else game.canvas.tokens.activate();
        },
      };
    });
  }
};
