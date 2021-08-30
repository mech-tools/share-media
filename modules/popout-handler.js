import constants from './settings/constants.js'
import { socketSharePopoutMedia } from './socket.js'

/**
 * Media popout event
 */
export const sharePopoutMedia = async (url, altMode = false) => {
    const mode = altMode ?
        (game.settings.get(constants.moduleName, 'popout-display-mode') === 'all' ? 'some' : 'all') :
        game.settings.get(constants.moduleName, 'popout-display-mode')

    const players = mode === 'all' ?
        game.users.filter(u => u.active).map(u => u.id) :
        await _promptForPlayersSelection(url)

    await socketSharePopoutMedia(url, players)
    ui.notifications.info(game.i18n.localize(`${constants.moduleName}.share.popout-success-${mode}`))
}

/**
 * Prompt the sharer with the list of active players to select from
 */
async function _promptForPlayersSelection(url) {
    const players = game.users.map(u => ({ id: u.id, name: u.name, color: u.color, active: u.active }))
        .sort((a, b) => +b.active - +a.active || a.name.localeCompare(b.name))

    const content = await renderTemplate(`${constants.modulePath}/templates/players-selection-dialog.hbs`, { players, url })

    return new Promise((resolve, reject) => {
        new Dialog({
            'title': game.i18n.localize(`${constants.moduleName}.players-selection.title`),
            content,
            buttons: {
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize(`${constants.moduleName}.players-selection.cancel-button`),
                    callback: () => reject
                },
                share: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize(`${constants.moduleName}.players-selection.share-button`),
                    callback: html => {
                        const players = html.find('input:checkbox[name=playerId]:checked').get().map(c => $(c).val())
                        resolve(players)
                    }
                }
            },
            default: 'share'
        }, { id: `${constants.moduleName}-player-selection-dialog` }).render(true)
    })
}
