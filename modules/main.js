import { registerSettings, SETTINGS } from './settings/settings.js'
import constants from './settings/constants.js'
import registerCanvasLayer from './media-canvas-layer.js'
import fullscreenLayer from './media-fullscreen-layer.js'
import { wrapMedias, activateMediaListeners } from './media-wrapper.js'
import { addTileControls } from './scene-handler.js'
import { addSidebarContextEntries } from './sidebar-handler.js'
import { addHUDControls } from './token-hud-handler.js'
import Api from './Api.js'

Hooks.once('init', () => {
    registerSettings()
    registerCanvasLayer()
})

Hooks.once('ready', () => {
    fullscreenLayer.init()

    // API
    setProperty(window, `${constants.moduleName}.API`, Api)
    game.modules.get(constants.moduleName).API = Api
})

Hooks.on('getSceneControlButtons', controls => {
    if (game.user.isGM) {
        addTileControls(controls)
    }
})

Hooks.on('renderTokenHUD', (app, html) => {
    const enableHUDButton = game.settings.get(constants.moduleName, SETTINGS.ENABLE_HUD_BUTTON)
    if(game.user.isGM && enableHUDButton) {
        addHUDControls(app, html)
    }
})

Hooks.on('renderJournalPageSheet', (app, html) => {
    wrapMedias(html.closest('.journal-entry-pages'))
    activateMediaListeners(html.closest('.journal-entry-pages'))
})

// Monk's Enhanced Journal & Kanka compatibility
Hooks.on('renderJournalSheet', (app, html) => {
    if (app.constructor.name === "JournalSheet") return

    wrapMedias(html)
    activateMediaListeners(html)
})

Hooks.on('renderItemSheet', (app, html) => {
    wrapMedias(html)
    activateMediaListeners(html)
})

Hooks.on('renderActorSheet', (app, html) => {
    wrapMedias(html)
    activateMediaListeners(html)
})

Hooks.on('getActorDirectoryEntryContext', (html, contextEntries) => {
    const contextOptionsDisabled = game.settings.get(constants.moduleName, SETTINGS.DISABLE_CONTEXT_OPTIONS)
    if (!contextOptionsDisabled) addSidebarContextEntries(contextEntries, 'actors')
})

Hooks.on('getItemDirectoryEntryContext', (html, contextEntries) => {
    const contextOptionsDisabled = game.settings.get(constants.moduleName, SETTINGS.DISABLE_CONTEXT_OPTIONS)
    if (!contextOptionsDisabled) addSidebarContextEntries(contextEntries, 'items')
})

Hooks.on('renderGMNote', (app, html) => {
    wrapMedias(html)
    activateMediaListeners(html)
})

Hooks.on('canvasReady', () => {
    const mediaFlags = canvas.scene.flags?.[constants.moduleName]

    if (mediaFlags) {
        for (let [boundingTileName, { url, style, type, loop, mute } = value] of Object.entries(mediaFlags)) {
            canvas.shareMedia.createBoundedSprite(boundingTileName, url, style, type === 'video', loop, mute)
        }
    }
})

Hooks.on('updateScene', (scene, data) => {
    if (data.flags?.[constants.moduleName] && scene.id === canvas.scene.id) {
        for (let boundingTileName of Object.keys(data.flags[constants.moduleName])) {
            if (boundingTileName.startsWith('-=')) {
                canvas.shareMedia.deleteBoundedSprite(boundingTileName.substring(2))
            } else {
                const mediaFlag = canvas.scene.flags[constants.moduleName][boundingTileName]
                canvas.shareMedia.createBoundedSprite(boundingTileName, mediaFlag.url, mediaFlag.style, mediaFlag.type === 'video', mediaFlag.loop, mediaFlag.mute)
            }
        }
    }

    if(data.hasOwnProperty('darkness') && scene.id === game.scenes.active?.id) {
        fullscreenLayer.updateDarkness(data.darkness)
    }
})

Hooks.on('updateTile', tile => {
    if (tile.flags?.[constants.moduleName]?.isBounding && tile.parent.id === canvas.scene.id) {
        const mediaFlag = canvas.scene.flags?.[constants.moduleName]?.[tile.flags[constants.moduleName].name]
        if (mediaFlag) {
            canvas.shareMedia.createBoundedSprite(tile.flags[constants.moduleName].name, mediaFlag.url, mediaFlag.style, mediaFlag.type === 'video', mediaFlag.loop, mediaFlag.mute)
        }
    }
})

Hooks.on('deleteTile', tile => {
    if (game.user.isGM) {
        if (tile.flags?.[constants.moduleName]?.isBounding && tile.parent.id === canvas.scene.id) {
            const mediaFlag = canvas.scene.flags?.[constants.moduleName]?.[tile.flags[constants.moduleName].name]
            if (mediaFlag) {
                canvas.scene.unsetFlag(constants.moduleName, tile.flags[constants.moduleName].name)
            }
        }
    }
})