export { default as PopoutLayer } from "./popout-layer.mjs";
export { default as FullscreenLayer } from "./fullscreen-layer.mjs";
export { default as ChatLayer } from "./chat-layer.mjs";
export { default as SceneLayer } from "./scene-layer.mjs";
export * as mixins from "./mixins/_module.mjs";

/**
 * Apply the needed modifications to implement actions on share media chat messages.
 */
export const registerChatMessageActions = () => {
  // Add share again to the message context options
  Hooks.on("getChatMessageContextOptions", (_application, menuItems) => {
    const { MEDIA_FLAG_KEY } = game.modules.shareMedia.layers.chat;

    // Create the entry
    const entry = {
      label: "share-media.layers.chat.share",
      icon: `<i class="fa ${CONFIG.shareMedia.CONST.ICONS.shareAgain}"></i>`,
      visible: (target) => {
        if (!game.user.isGM) return false;
        const message = game.messages.get(target.dataset.messageId);
        return message.getFlag("share-media", MEDIA_FLAG_KEY);
      },
      onClick: async (_event, target) => {
        const message = game.messages.get(target.dataset.messageId);
        const flags = message.getFlag("share-media", MEDIA_FLAG_KEY);
        await new game.modules.shareMedia.shareables.apps.shareSelector(flags).render({
          force: true,
        });
      },
    };

    // Add the entry to the menu
    menuItems.splice(0, 0, entry);
  });

  // Show the media on click
  // [NOTE] This also adds the top level class "shm" to the chat message
  Hooks.on("renderChatMessageHTML", async (message, html, _context) => {
    const { MEDIA_FLAG_KEY } = game.modules.shareMedia.layers.chat;

    // Make sure this message is from share media
    const flags = message.getFlag("share-media", MEDIA_FLAG_KEY);
    if (!flags) return;

    // Add the top level share media css class
    html.classList.add("shm");

    // Get the media container
    const media = html.querySelector(".media");
    if (!media) return;

    // Attach a click handler to the media container
    media.addEventListener("click", async (_event) => {
      // Display it in a popout
      const mode = CONFIG.shareMedia.CONST.LAYERS_MODES.popout;

      // Get the default settings
      const settings = game.modules.shareMedia.settings.get(
        CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaSettings,
      );

      // Populate default settings with media settings
      game.modules.shareMedia.utils.applySettingsToMediaOptions(mode, { settings }, flags.settings);

      // Get the settings for the mode
      const optionsSettings = game.modules.shareMedia.utils.getMediaSettings(
        flags.src,
        mode,
        settings,
      );

      // Render the popout window
      const layer = new game.modules.shareMedia.layers[mode]({
        src: flags.src,
        ...optionsSettings,
      });
      await layer.render({ force: true });
    });
  });
};
