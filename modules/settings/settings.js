import { BlackListSetting } from "./BlackListSetting.js";
import constants from "./constants.js"

/** Debounce calls before reloading page */
const debouncedReload = foundry.utils.debounce(() => window.location.reload(), 500);

export const SETTINGS = {
  DISABLE_CONTEXT_OPTIONS: "disable-context-options",
  VIDEO_LOOPING_OPTION: "video-looping-option",
  VIDEO_MUTE_OPTION: "video-muted-option",
  ENABLE_HUD_BUTTON: "enable-hud-button",
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

  BlackListSetting.init()
}
