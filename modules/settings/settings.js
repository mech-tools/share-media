import { BlackListSetting } from "./BlackListSetting.js";
import constants from "./constants.js"

/** Debounce calls before reloading page */
const debouncedReload = foundry.utils.debounce(() => window.location.reload(), 500);

export const SETTINGS = {
  DISABLE_CONTEXT_OPTIONS: "disable-context-options",
  VIDEO_LOOPING_OPTION: "video-looping-option",
  VIDEO_MUTE_OPTION: "video-muted-option",
  ENABLE_HUD_BUTTON: "enable-hud-button",
  FULLSCREEN_IMMERSIVE_MODE: "fullscreen-immersive-mode",
  FULLSCREEN_DARKNESS_MODE: "fullscreen-darkness-mode",
  SHARE_ACTOR_TOKEN_NAME: "popout-share-name",
  BLACKLIST_FORM: "blacklist-form",
  BLACKLIST: "blacklist"
}

/**
 * Register settings
 */
export function registerSettings() {
  game.settings.register(constants.moduleName, SETTINGS.DISABLE_CONTEXT_OPTIONS, {
    name: game.i18n.localize(
      "share-media.settings.disable-context-options-name"
    ),
    hint: game.i18n.localize(
      "share-media.settings.disable-context-options-hint"
    ),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => debouncedReload()
  })

  game.settings.register(constants.moduleName, SETTINGS.VIDEO_LOOPING_OPTION, {
    name: game.i18n.localize(
      "share-media.settings.video-looping-option-name"
    ),
    hint: game.i18n.localize(
      "share-media.settings.video-looping-option-hint"
    ),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => debouncedReload()
  })

  game.settings.register(constants.moduleName, SETTINGS.VIDEO_MUTE_OPTION, {
    name: game.i18n.localize(
      "share-media.settings.video-mute-option-name"
    ),
    hint: game.i18n.localize(
      "share-media.settings.video-mute-option-hint"
    ),
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    onChange: () => debouncedReload()
  })

  game.settings.register(constants.moduleName, SETTINGS.ENABLE_HUD_BUTTON, {
    name: game.i18n.localize(
      "share-media.settings.enable-hud-button-name"
    ),
    hint: game.i18n.localize(
      "share-media.settings.enable-hud-button-hint"
    ),
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    onChange: () => debouncedReload()
  })

  game.settings.register(constants.moduleName, SETTINGS.FULLSCREEN_IMMERSIVE_MODE, {
    name: game.i18n.localize(
      "share-media.settings.fullscreen-immersive-mode-name"
    ),
    hint: game.i18n.localize(
      "share-media.settings.fullscreen-immersive-mode-hint"
    ),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => debouncedReload()
  })

  game.settings.register(constants.moduleName, SETTINGS.FULLSCREEN_DARKNESS_MODE, {
    name: game.i18n.localize(
      "share-media.settings.fullscreen-darkness-mode-name"
    ),
    hint: game.i18n.localize(
      "share-media.settings.fullscreen-darkness-mode-hint"
    ),
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    onChange: () => debouncedReload()
  })

  game.settings.register(constants.moduleName, SETTINGS.SHARE_ACTOR_TOKEN_NAME, {
    name: game.i18n.localize(
      "share-media.settings.share-actor-token-name-name"
    ),
    hint: game.i18n.localize(
      "share-media.settings.share-actor-token-name-hint"
    ),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => debouncedReload()
  })

  BlackListSetting.init()
}
