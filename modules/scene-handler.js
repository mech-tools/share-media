import constants from './settings/constants.js'
import { findBoundingTile } from './helpers.js'

/**
 * Create a control button to create a bounding tile
 */
export const addTileControls = controls => {
    const tileControls = controls.find(c => c.name === 'tiles')

    if (tileControls) {
        tileControls.tools.push(
            {
                name: 'create-bounding-tile',
                title: game.i18n.localize(`${constants.moduleName}.bounding-tile.create-button`),
                icon: 'fas fa-border-style',
                visible: true,
                onClick: () => {
                    _createBoundingTile()
                },
                button: true,
            },
            {
                name: 'clear-display-tile',
                title: game.i18n.localize(`${constants.moduleName}.display-tile.clear-button`),
                icon: 'fas fa-eraser',
                visible: true,
                onClick: () => {
                    _clearDisplayTile()
                },
                button: true,
            }
        )
    }
}

/**
 * Create a bounding tile
 */
async function _createBoundingTile() {
    const scene = game.scenes.viewed

    const existingBoundingTile = findBoundingTile()
    if (existingBoundingTile) {
        existingBoundingTile.object.control()
        return ui.notifications.warn(game.i18n.localize(`${constants.moduleName}.bounding-tile.already-exists`))
    }

    const tileData = {
        img: `${constants.modulePath}/images/transparent.png`,
        flags: { [constants.moduleName]: { isBounding: true } },
        hidden: true,
        width: scene.data.width / 4,
        height: scene.data.height / 4,
        x: scene.dimensions.paddingX,
        y: scene.dimensions.paddingY
    }
    await scene.createEmbeddedDocuments('Tile', [tileData])

    const boundingTile = findBoundingTile()
    if (boundingTile) {
        ui.notifications.info(game.i18n.localize(`${constants.moduleName}.bounding-tile.create-success`))
        boundingTile.object.control()
    } else {
        ui.notifications.error(game.i18n.localize(`${constants.moduleName}.bounding-tile.create-error`))
    }
}

/**
 * Clear and delete the display tile
 */
async function _clearDisplayTile() {
    if (!canvas.scene.getFlag(constants.moduleName, 'media')) {
        return ui.notifications.info(game.i18n.localize(`${constants.moduleName}.display-tile.clear-failed`))
    }

    await canvas.scene.unsetFlag(constants.moduleName, 'media')
    ui.notifications.info(game.i18n.localize(`${constants.moduleName}.display-tile.clear-success`))
}

/**
 * Share a media on the scene
 */
export const shareSceneMedia = async (url, altStyle = false) => {
    if (!game.scenes.viewed) {
        return ui.notifications.error(game.i18n.localize(`${constants.moduleName}.share.no-scene`))
    }

    if (!findBoundingTile()) {
        return ui.notifications.warn(game.i18n.localize(`${constants.moduleName}.bounding-tile.not-found`))
    }

    const style = altStyle ?
        (game.settings.get(constants.moduleName, 'scene-display-style') === 'fit' ? 'cover' : 'fit') :
        game.settings.get(constants.moduleName, 'scene-display-style')

    await canvas.scene.setFlag(constants.moduleName, 'media', { url, style })

    ui.notifications.info(game.i18n.localize(`${constants.moduleName}.share.scene-success`))
}