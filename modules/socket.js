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
export const socketSharePopoutMedia = async (url, players, loop = false, mute = true) => {
    return await socket.executeForUsers('sharePopoutMedia', players, url, loop, mute)
}

/**
 * Show media popout on event fired
 */
const _socketSharePopoutMedia = (url, loop = false, mute = true) => {
    MediaPopout._handleShareMedia(url, loop, mute)
}

/**
 * Show fullscreen media event
 */
export const socketshareFullscreenMedia = async (url, players, type = 'image', loop = false, mute = true) => {
    return await socket.executeForUsers('shareFullscreenMedia', players, url, type, loop, mute)
}

/**
 * Show fullscreen media on event fired
 */
const _socketshareFullscreenMedia = (url, type = 'image', loop = false, mute = true) => {
    fullscreenLayer.handleShare(url, type, loop, mute)
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