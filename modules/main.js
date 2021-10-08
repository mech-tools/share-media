import registerSettings from './settings/settings.js'
import constants from './settings/constants.js'
import registerCanvasLayer from './media-canvas-layer.js'
import fullscreenLayer from './media-fullscreen-layer.js'
import { wrapMedias, activateMediaListeners } from './media-wrapper.js'
import { addTileControls } from './scene-handler.js'

Hooks.once('init', () => {
    registerSettings()
    registerCanvasLayer()
})

Hooks.once('ready', () => {
    fullscreenLayer.init()
})

Hooks.on('getSceneControlButtons', controls => {
    if (game.user.isGM) {
        addTileControls(controls)
    }
})

Hooks.on('renderJournalSheet', (app, html) => {
    if (game.user.isGM) {
        wrapMedias(html)
        activateMediaListeners(html)
    }
})

Hooks.on('renderItemSheet', (app, html) => {
    if (game.user.isGM) {
        wrapMedias(html)
        activateMediaListeners(html)
    }
})

Hooks.on('renderActorSheet', (app, html) => {
    if (game.user.isGM) {
        wrapMedias(html)
        activateMediaListeners(html)
    }
})

Hooks.on('canvasReady', () => {
    const mediaFlags = canvas.scene.data.flags?.[constants.moduleName]

    if (mediaFlags) {
        for (let [boundingTileName, { url, style, type } = value] of Object.entries(mediaFlags)) {
            canvas.shareMedia.createBoundedSprite(boundingTileName, url, style, type === 'video')
        }
    }
})

Hooks.on('updateScene', (scene, data) => {
    if (data.flags?.[constants.moduleName] && scene.id === canvas.scene.id) {
        for (let boundingTileName of Object.keys(data.flags[constants.moduleName])) {
            if (boundingTileName.startsWith('-=')) {
                canvas.shareMedia.deleteBoundedSprite(boundingTileName.substring(2))
            } else {
                const mediaFlag = canvas.scene.data.flags[constants.moduleName][boundingTileName]
                canvas.shareMedia.createBoundedSprite(boundingTileName, mediaFlag.url, mediaFlag.style, mediaFlag.type === 'video')
            }
        }
    }
})

Hooks.on('updateTile', tile => {
    if (tile.data.flags?.[constants.moduleName]?.isBounding && tile.parent.id === canvas.scene.id) {
        const mediaFlag = canvas.scene.data.flags?.[constants.moduleName]?.[tile.data.flags[constants.moduleName].name]
        if (mediaFlag) {
            canvas.shareMedia.createBoundedSprite(tile.data.flags[constants.moduleName].name, mediaFlag.url, mediaFlag.style, mediaFlag.type === 'video')
        }
    }
})

Hooks.on('deleteTile', tile => {
    if (game.user.isGM) {
        if (tile.data.flags?.[constants.moduleName]?.isBounding && tile.parent.id === canvas.scene.id) {
            const mediaFlag = canvas.scene.data.flags?.[constants.moduleName]?.[tile.data.flags[constants.moduleName].name]
            if (mediaFlag) {
                canvas.scene.unsetFlag(constants.moduleName, tile.data.flags[constants.moduleName].name)
            }
        }
    }
})