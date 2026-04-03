export { default as MediaDetector } from "./media-detector.mjs";
export { default as MediaOverlay } from "./media-overlay.mjs";
export { default as MediaSidebar } from "./media-sidebar.mjs";
export { default as MediaBrowser } from "./media-browser.mjs";

/**
 * Register the media sidebar.
 */
export const registerMediaSidebar = async () => {
  // Sidebar settings
  const mediaSidebarSettings = game.modules.shareMedia.settings.get(
    CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaSidebarSettings,
  );

  // Blacklist settings
  const blacklistSettings = game.modules.shareMedia.settings.get(
    CONFIG.shareMedia.CONST.MODULE_SETTINGS.blacklistSettings,
  );

  // Initialize the local media collection
  const { Collection } = foundry.utils;
  game["shm-media-collection"] = new Collection(
    Object.entries(
      game.settings.get("share-media", CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaHistory),
    ),
  );

  // Add the sidebar to the tabs list config object
  // Do not display the tab if the sidebar is disabled or the user is blacklisted
  if (mediaSidebarSettings.enabled && !blacklistSettings.includes(game.userId)) {
    CONFIG.ui.sidebar.TABS = Object.entries(CONFIG.ui.sidebar.TABS).reduce(
      (acc, [tabName, obj]) => {
        if (tabName === "settings") {
          acc["shm-media-sidebar"] = {
            icon: `fa ${CONFIG.shareMedia.CONST.ICONS.sidebar}`,
            tooltip: "share-media.ui.sidebar.label",
            gmOnly: mediaSidebarSettings.gmOnly,
          };
        }

        acc[tabName] = obj;
        return acc;
      },
      {},
    );
  }

  // Update sidebar matching classes
  // [INFO] Keep this class alive even if the sidebar is disabled or the user is blacklisted
  // This allows to store media for future activations
  CONFIG.ui["shm-media-sidebar"] = CONFIG.shareMedia.ui.MediaSidebar.implementation;
};
