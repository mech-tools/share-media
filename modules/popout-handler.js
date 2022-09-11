import constants from './settings/constants.js'
import { socketSharePopoutMedia } from './socket.js'
import { dialog } from './helpers.js'
import { SETTINGS } from './settings/settings.js'

/**
 * Media popout event
 */
export const sharePopoutMedia = async (url, mode, title = "", loop = false, mute = true) => {
    const blacklist = game.settings.get(constants.moduleName, SETTINGS.BLACKLIST).split(";")

    const players = mode === 'all' ?
        game.users.filter(u => u.active && !blacklist.includes(u.id)).map(u => u.id) :
        await _promptPlayersSelection(
            game.users
                .filter(u => !blacklist.includes(u.id))
                .map(u => ({ id: u.id, name: u.name, color: u.color, active: u.active, isGM: u.isGM }))
        )

    await socketSharePopoutMedia(url, players, title, loop, mute)
    ui.notifications.info(game.i18n.localize(`${constants.moduleName}.share.popout-success-${mode}`))
}

/**
 * Prompt the sharer with the list of active players to select from
 */
async function _promptPlayersSelection(players) {
    players.sort((a, b) => +b.active - +a.active || a.name.localeCompare(b.name))

    const content = await renderTemplate(
        `${constants.modulePath}/templates/players-selection-dialog.hbs`,
        { players }
    )

    return dialog({
        id: 'player-selection-dialog',
        title: game.i18n.localize(`${constants.moduleName}.dialogs.players-selection.title`),
        content,
        cancelLabel: game.i18n.localize(`${constants.moduleName}.dialogs.players-selection.cancel-button`),
        validateLabel: game.i18n.localize(`${constants.moduleName}.dialogs.players-selection.share-button`),
        validateCallback: (html) => {
            return html.find('input:checkbox[name=playerId]:checked').get().map(c => $(c).val())
        }
    })
}
