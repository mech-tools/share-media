export { default as ShareablesManager } from "./shareables-manager.mjs";
export * as apps from "./apps/_module.mjs";
export * as mixins from "./mixins/_module.mjs";

/**
 * Apply the needed modifications to show token buttons and entity context entries.
 */
export const applyEntitySharingSettings = () => {
  // Entity settings
  const entitySharingSettings = game.modules.shareMedia.settings.get(
    CONFIG.shareMedia.CONST.MODULE_SETTINGS.entitySharingSettings,
  );

  // Add context menu entries and token buttons only if settings allow it
  for (const [entity, config] of Object.entries(entitySharingSettings)) {
    const baseName = entity.slice(0, -1);
    const baseConfig = CONFIG[baseName.charAt(0).toUpperCase() + baseName.slice(1)];
    const documentName = baseConfig.documentClass.documentName;

    // Default sharing options
    const options = {
      settings: {
        mode: CONFIG.shareMedia.CONST.LAYERS_MODES.popout,
        optionName: CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersAll.name,
        optionValue: CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersAll.value,
      },
    };

    // Sheets
    if (config.sheet) {
      const hookName = `get${documentName}ContextOptions`;
      Hooks.on(hookName, (application, menuItems) => {
        // Only process world entities
        if (application.collection !== game[entity]) return;

        // Create the entry
        const entry = {
          name: "share-media.shareables.selector.entities.label",
          icon: `<i class="${CONFIG.shareMedia.CONST.ICONS.shareAgain}"></i>`,
          condition: (li) => {
            if (!game.users.current.isGM) return false;
            const document = game[entity].get(li.dataset.entryId);
            const { img } = document.constructor.getDefaultArtwork(document._source);
            return document.img !== img;
          },
          callback: (li) => {
            const document = game[entity].get(li.dataset.entryId);
            options.src = document.img;
            if (config.caption) options.settings.caption = document.name;
            new game.modules.shareMedia.shareables.apps.shareSelector(options).render({
              force: true,
            });
          },
        };

        // Add the entry to the menu
        menuItems.splice(0, 0, entry);
      });
    }

    // Tokens
    if (config.hud) {
      const entityName = entity === "actors" ? "Token" : documentName;
      const hookName = `render${entityName}HUD`;
      Hooks.on(hookName, (application, element, _context, _options) => {
        if (!game.users.current.isGM) return;
        if (!application.object.document.texture.src) return;

        // Create a button
        const button = document.createElement("button");
        button.type = "button";
        button.className = "control-icon";
        // Assign the tooltip
        button.dataset.tooltipClass = "shm";
        button.dataset.tooltipHtml = game.i18n.localize(
          "share-media.shareables.selector.entities.label",
        );
        if (application.object[baseName]) {
          button.dataset.tooltipHtml +=
            "<br>" + game.i18n.localize("share-media.shareables.selector.entities.contextmenu");
        }
        button.innerHTML = `<i class="${CONFIG.shareMedia.CONST.ICONS.shareAgain}" inert></i>`;

        // Add the click handler to the button
        button.addEventListener("click", () => {
          options.src = application.object.document.texture.src;
          if (config.caption) options.settings.caption = application.object.document.name;
          new game.modules.shareMedia.shareables.apps.shareSelector(options).render({
            force: true,
          });
        });

        // Add the right click handler to the button
        if (application.object[baseName]) {
          button.addEventListener("contextmenu", () => {
            options.src = application.object[baseName].img;
            if (config.caption) options.settings.caption = application.object[baseName].name;
            new game.modules.shareMedia.shareables.apps.shareSelector(options).render({
              force: true,
            });
          });
        }

        // Add the button to the HUD
        const leftCol = element.querySelector(".col.left");
        if (leftCol) leftCol.appendChild(button);
      });
    }
  }
};
