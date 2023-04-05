import constants from './settings/constants.js'
import MediaPopout from './media-popout.js'
import fullscreenLayer from './media-fullscreen-layer.js'

/**
 * Start socketlib & register events
 */
let socket
Hooks.once('socketlib.ready', () => {
    socket = socketlib.registerModule(constants.moduleName)
    socket.register('sharePopoutMedia', _socketSharePopoutMedia)
    socket.register('shareFullscreenMedia', _socketshareFullscreenMedia)
    socket.register('dismissFullscreenMedia', _socketDismissFullscreenMedia)
})

/**
 * Show media popout event
 */
export const socketSharePopoutMedia = async (url, players, title = "", loop = false, mute = true) => {
    return await socket.executeForUsers('sharePopoutMedia', players, url, title, loop, mute)
}

/**
 * Show media popout on event fired
 */
const _socketSharePopoutMedia = (url, title = "", loop = false, mute = true) => {
    MediaPopout._handleShareMedia(url, title, loop, mute)
}

/**
 * Show fullscreen media event
 */
export const socketshareFullscreenMedia = async (url, players, type = 'image', title = "", immersive = false, loop = false, mute = true) => {
    return await socket.executeForUsers('shareFullscreenMedia', players, url, type, title, immersive, loop, mute)
}

/**
 * Show fullscreen media on event fired
 */
const _socketshareFullscreenMedia = (url, type = 'image', title = "", immersive = false, loop = false, mute = true) => {
    fullscreenLayer.handleShare(url, type, title, immersive, loop, mute)
}

/**
 * Dismiss fullscreen media event
 */
export const socketDismissFullscreenMedia = async () => {
    return await socket.executeForEveryone('dismissFullscreenMedia')
}

/**
 * Dismiss fullscreen media on event fired
 */
const _socketDismissFullscreenMedia = () => {
    fullscreenLayer.handleDismiss()
}