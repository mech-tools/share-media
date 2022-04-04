import constants from "./constants.js"

export const SETTINGS = {
  DISABLE_CONTEXT_OPTIONS: "disable-context-options"
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
    onChange: () => window.location.reload()
  })
}
