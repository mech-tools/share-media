export { default as ShareablesManager } from "./shareables-manager.mjs";
export * as apps from "./apps/_module.mjs";
export * as mixins from "./mixins/_module.mjs";

/**
 * Apply the needed modifications to show token buttons and entity context entries.
 */
export const registerEntitySharingActions = () => {
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

    // Sheet header
    if (config.sheetHeader) {
      // V2
      const hookNameV2 = `getHeaderControls${documentName}SheetV2`;
      Hooks.on(hookNameV2, (application, controls) => {
        if (!game.user.isGM) return;

        // Only process world entities
        if (application.document?.collection !== game[entity]) return;

        // Create the entry
        const document = application.document;
        const entry = {
          label: "share-media.shareables.selector.entities.label",
          icon: `<i class="fa ${CONFIG.shareMedia.CONST.ICONS.shareAgain}"></i>`,
          visible: (_target) => {
            const { img } = document.constructor.getDefaultArtwork(document?._source);
            return document.img !== img;
          },
          onClick: (_event, _target) => {
            options.src = document.img;
            if (config.caption) options.settings.caption = document.name;
            new game.modules.shareMedia.shareables.apps.shareSelector(options).render({
              force: true,
            });
          },
        };

        // Add the entry to the menu
        controls.splice(0, 0, entry);
      });

      // V1 [TODO] remove with V16
      const hookNameV1 = `get${documentName}SheetHeaderButtons`;
      Hooks.on(hookNameV1, (application, buttons) => {
        if (!game.user.isGM) return;

        // Only process world entities
        if (application.document?.collection !== game[entity]) return;

        // Create the entry
        const document = application.document;
        const entry = {
          label: "share-media.shareables.selector.entities.label",
          icon: `<i class="fa ${CONFIG.shareMedia.CONST.ICONS.shareAgain}"></i>`,
          onClick: () => {
            options.src = document.img;
            if (config.caption) options.settings.caption = document.name;
            new game.modules.shareMedia.shareables.apps.shareSelector(options).render({
              force: true,
            });
          },
        };

        // Add the entry to the menu
        buttons.splice(0, 0, entry);
      });
    }

    // Sheet context menu
    if (config.sheetMenu) {
      const hookName = `get${documentName}ContextOptions`;
      Hooks.on(hookName, (application, menuItems) => {
        if (!game.user.isGM) return;

        // Only process world entities
        if (application.collection !== game[entity]) return;

        // Create the entry
        const entry = {
          label: "share-media.shareables.selector.entities.label",
          icon: `<i class="fa ${CONFIG.shareMedia.CONST.ICONS.shareAgain}"></i>`,
          visible: (target) => {
            const document = game[entity].get(target.dataset.entryId);
            const { img } = document.constructor.getDefaultArtwork(document._source);
            return document.img !== img;
          },
          onClick: (_event, target) => {
            const document = game[entity].get(target.dataset.entryId);
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

    // Token hud
    if (config.hud) {
      const entityName = entity === "actors" ? "Token" : documentName;
      const hookName = `render${entityName}HUD`;
      Hooks.on(hookName, (application, element, _context, _options) => {
        if (!game.user.isGM) return;

        // Only process textures that exist
        if (!application.object.document.texture.src) return;

        // Create a button
        const button = document.createElement("button");
        button.type = "button";
        button.className = "control-icon";
        // Assign the tooltip
        button.dataset.tooltipClass = "shm";
        button.dataset.tooltipHtml = _loc("share-media.shareables.selector.entities.label");
        if (application.object[baseName]) {
          button.dataset.tooltipHtml +=
            "<br>" + _loc("share-media.shareables.selector.entities.contextmenu");
        }
        button.innerHTML = `<i class="fa ${CONFIG.shareMedia.CONST.ICONS.shareAgain}" inert></i>`;

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
