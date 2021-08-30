import constants from './constants.js'

/**
 * Register settings
 */
export default function registerSettings() {
    game.settings.register(constants.moduleName, 'scene-display-style', {
        name: game.i18n.localize(`${constants.moduleName}.settings.scene-display-style.name`),
        hint: game.i18n.localize(`${constants.moduleName}.settings.scene-display-style.hint`),
        scope: 'world',
        config: true,
        choices: {
            'fit': game.i18n.localize(`${constants.moduleName}.settings.scene-display-style.fit`),
            'cover': game.i18n.localize(`${constants.moduleName}.settings.scene-display-style.cover`)
        },
        default: 'fit'
    })
    game.settings.register(constants.moduleName, 'popout-display-mode', {
        name: game.i18n.localize(`${constants.moduleName}.settings.popout-display-mode.name`),
        hint: game.i18n.localize(`${constants.moduleName}.settings.popout-display-mode.hint`),
        scope: 'world',
        config: true,
        choices: {
            'all': game.i18n.localize(`${constants.moduleName}.settings.popout-display-mode.all`),
            'some': game.i18n.localize(`${constants.moduleName}.settings.popout-display-mode.some`)
        },
        default: 'all'
    })
}