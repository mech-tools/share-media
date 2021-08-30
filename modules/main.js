import registerSettings from './settings/settings.js'
import constants from './settings/constants.js'
import registerLayer from './media-layers.js'
import { wrapMedias, activateMediaListeners } from './media-wrapper.js'
import { addTileControls } from './scene-handler.js'

Hooks.once('init', () => {
    registerSettings()
    registerLayer()
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
    const mediaFlag = canvas.scene.getFlag(constants.moduleName, 'media')

    if (mediaFlag) {
        canvas.shareMedia.createBoundedSprite(mediaFlag.url, mediaFlag.style)
    }
})

Hooks.on('updateScene', (scene, data) => {
    if (data.flags?.[constants.moduleName]?.['-=media'] === null && scene.id === canvas.scene.id) {
        canvas.shareMedia.deleteBoundedSprite()
    } else if (data.flags?.[constants.moduleName]?.media && scene.id === canvas.scene.id) {
        const mediaFlag = scene.getFlag(constants.moduleName, 'media')
        canvas.shareMedia.createBoundedSprite(mediaFlag.url, mediaFlag.style)
    }
})

Hooks.on('updateTile', tile => {
    const mediaFlag = tile.parent.getFlag(constants.moduleName, 'media')

    if (tile.data.flags?.[constants.moduleName]?.isBounding && mediaFlag && tile.parent.id === canvas.scene.id) {
        canvas.shareMedia.createBoundedSprite(mediaFlag.url, mediaFlag.style)
    }
})

Hooks.on('deleteTile', tile => {
    if (game.user.isGM) {
        if (tile.data.flags?.[constants.moduleName]?.isBounding && tile.parent.getFlag(constants.moduleName, 'media') && tile.parent.id === canvas.scene.id) {
            tile.parent.unsetFlag(constants.moduleName, 'media')
        }
    }
})