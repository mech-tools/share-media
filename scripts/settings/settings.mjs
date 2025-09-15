import * as apps from "./apps/_module.mjs";
const { ObjectField, ArrayField, StringField, TypedObjectField } = foundry.data.fields;

/* -------------------------------------------- */
/*  Module settings
/* -------------------------------------------- */

/**
 * Utility function designed to register all settings in the module.
 */
export const initializeSettings = () => {
  registerSettings();
  registerMenus();
};

/* -------------------------------------------- */

/**
 * Register all settings.
 */
const registerSettings = () => {
  const settings = CONFIG.shareMedia.CONST.MODULE_SETTINGS;

  game.settings.register("share-media", settings.dataVersion, {
    config: false,
    scope: CONST.SETTING_SCOPES.WORLD,
    type: new StringField({ gmOnly: true }),
  });

  game.settings.register("share-media", settings.mediaSettings, {
    config: false,
    scope: CONST.SETTING_SCOPES.WORLD,
    type: new ObjectField({ initial: CONFIG.shareMedia.CONST.MEDIA_SETTINGS, gmOnly: true }),
  });

  game.settings.register("share-media", settings.mediaHistory, {
    config: false,
    scope: CONST.SETTING_SCOPES.WORLD,
    type: new TypedObjectField(new ObjectField(), { initial: {} }),
  });

  game.settings.register("share-media", settings.mediaSidebarSettings, {
    config: false,
    scope: CONST.SETTING_SCOPES.WORLD,
    type: new ObjectField({ initial: CONFIG.shareMedia.CONST.MEDIA_HISTORY_SETTINGS }),
  });

  game.settings.register("share-media", settings.entitySharingSettings, {
    config: false,
    scope: CONST.SETTING_SCOPES.WORLD,
    type: new ObjectField({ initial: CONFIG.shareMedia.CONST.ENTITY_SETTINGS }),
  });

  game.settings.register("share-media", settings.blacklistSettings, {
    config: false,
    scope: CONST.SETTING_SCOPES.WORLD,
    type: new ArrayField(new StringField(), { initial: [], gmOnly: true }),
  });
};

/* -------------------------------------------- */

/**
 * Register all menus.
 */
const registerMenus = () => {
  const settings = CONFIG.shareMedia.CONST.MODULE_SETTINGS;

  game.settings.registerMenu("share-media", settings.mediaSettings, {
    label: `share-media.settings.${settings.mediaSettings}.label`,
    name: `share-media.settings.${settings.mediaSettings}.name`,
    hint: `share-media.settings.${settings.mediaSettings}.hint`,
    restricted: true,
    type: apps.MediaSettings,
  });

  game.settings.registerMenu("share-media", settings.mediaSidebarSettings, {
    label: `share-media.settings.${settings.mediaSidebarSettings}.label`,
    name: `share-media.settings.${settings.mediaSidebarSettings}.name`,
    hint: `share-media.settings.${settings.mediaSidebarSettings}.hint`,
    restricted: true,
    type: apps.MediaSidebarSettings,
  });

  game.settings.registerMenu("share-media", settings.entitySharingSettings, {
    label: `share-media.settings.${settings.entitySharingSettings}.label`,
    name: `share-media.settings.${settings.entitySharingSettings}.name`,
    hint: `share-media.settings.${settings.entitySharingSettings}.hint`,
    restricted: true,
    type: apps.EntitySharingSettings,
  });

  game.settings.registerMenu("share-media", settings.blacklistSettings, {
    label: `share-media.settings.${settings.blacklistSettings}.label`,
    name: `share-media.settings.${settings.blacklistSettings}.name`,
    hint: `share-media.settings.${settings.blacklistSettings}.hint`,
    restricted: true,
    type: apps.BlacklistSettings,
  });
};
