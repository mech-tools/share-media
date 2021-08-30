import constants from './settings/constants.js'

/**
 * Start socketlib & register events
 */
let socket
Hooks.once('socketlib.ready', () => {
    socket = socketlib.registerModule(constants.moduleName)
    socket.register('sharePopoutMedia', _socketSharePopoutMedia)
})

/**
 * Show media popout event
 */
export const socketSharePopoutMedia = async (url, players) => {
    return await socket.executeForUsers('sharePopoutMedia', players, url)
}

/**
 * Show media popout on event fired
 */
const _socketSharePopoutMedia = url => {
    new ImagePopout(url, {
        shareable: false,
        editable: false
    }).render(true)
}