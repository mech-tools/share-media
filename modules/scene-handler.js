import constants from './settings/constants.js'
import { getAllBoundingTiles, findBoundingTileByName, dialog } from './helpers.js'

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
                name: 'clear-bounding-tile',
                title: game.i18n.localize(`${constants.moduleName}.bounding-tile.clear-button`),
                icon: 'fas fa-eraser',
                visible: true,
                onClick: () => {
                    _clearBoundingTile()
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
    const existingBoundingTiles = getAllBoundingTiles()

    const nextBoundingTileNumber = existingBoundingTiles.length + 1
    const newBoundingTileName = await _promptBoundingTileCreation(nextBoundingTileNumber)

    const existingBoundingTile = findBoundingTileByName(newBoundingTileName)
    if (existingBoundingTile) {
        existingBoundingTile.object.control()
        return ui.notifications.info(game.i18n.localize(`${constants.moduleName}.bounding-tile.create-already-exists`))
    }

    const tileData = {
        img: `${constants.modulePath}/images/transparent.png`,
        flags: { [constants.moduleName]: { isBounding: true, name: newBoundingTileName } },
        hidden: true,
        width: canvas.scene.data.width,
        height: canvas.scene.data.height,
        x: canvas.scene.dimensions.paddingX,
        y: canvas.scene.dimensions.paddingY
    }
    await canvas.scene.createEmbeddedDocuments('Tile', [tileData])

    const boundingTile = findBoundingTileByName(newBoundingTileName)
    ui.notifications.info(game.i18n.localize(`${constants.moduleName}.bounding-tile.create-success`))
    boundingTile.object.control()
}

/**
 * Prompt the user with a field to name the bounding tile
 */
async function _promptBoundingTileCreation(nextNumber) {
    const content = await renderTemplate(
        `${constants.modulePath}/templates/bounding-tile-creation-dialog.hbs`,
        { defaultName: game.i18n.localize(`${constants.moduleName}.dialogs.bounding-tile-creation.default-tile-name`) + ` ${nextNumber}` }
    )

    return dialog({
        id: 'bounding-tile-creation-dialog',
        title: game.i18n.localize(`${constants.moduleName}.dialogs.bounding-tile-creation.title`),
        content,
        cancelLabel: game.i18n.localize(`${constants.moduleName}.dialogs.bounding-tile-creation.cancel-button`),
        validateLabel: game.i18n.localize(`${constants.moduleName}.dialogs.bounding-tile-creation.create-button`),
        validateCallback: (html) => html.find('input').val().trim(),
        render: html => html.find('input').focus(),
        top: ui.controls.element.position().top + 80,
        left: ui.controls.element.position().left + 110
    })
}

/**
 * Clear a bounding tile
 */
async function _clearBoundingTile() {
    const boundingTiles = getAllBoundingTiles()

    if (!boundingTiles.length) {
        return ui.notifications.warn(game.i18n.localize(`${constants.moduleName}.bounding-tile.not-found`))
    }

    const boundingTile = boundingTiles.length > 1 ?
        await _promptClearBoundingTileSection(boundingTiles) :
        boundingTiles[0]

    const mediaFlag = canvas.scene.data.flags?.[constants.moduleName]?.[boundingTile.data.flags[constants.moduleName].name]
    if (!mediaFlag) {
        return ui.notifications.info(game.i18n.localize(`${constants.moduleName}.bounding-tile.clear-failed`))
    }

    const mediaFlags = foundry.utils.deepClone(canvas.scene.data.flags[constants.moduleName])
    delete mediaFlags[boundingTile.data.flags[constants.moduleName].name]

    await canvas.scene.unsetFlag(constants.moduleName, boundingTile.data.flags[constants.moduleName].name)
    ui.notifications.info(game.i18n.localize(`${constants.moduleName}.bounding-tile.clear-success`))
}

/**
 * Prompt with the list of boundind tiles to clear
 */
async function _promptClearBoundingTileSection(boundingTiles) {
    const boundingTilesData = boundingTiles.map(b => ({ id: b.id, name: b.data.flags[constants.moduleName].name }))
        .sort((a, b) => a.name.localeCompare(b.name))

    const content = await renderTemplate(
        `${constants.modulePath}/templates/clear-bounding-tile-selection-dialog.hbs`,
        { boundingTiles: boundingTilesData }
    )

    return dialog({
        id: 'clear-bounding-tile-selection-dialog',
        title: game.i18n.localize(`${constants.moduleName}.dialogs.clear-bounding-tile-selection.title`),
        content,
        cancelLabel: game.i18n.localize(`${constants.moduleName}.dialogs.clear-bounding-tile-selection.cancel-button`),
        validateLabel: game.i18n.localize(`${constants.moduleName}.dialogs.clear-bounding-tile-selection.clear-button`),
        validateCallback: (html) => {
            const boundingTileId = html.find('input:radio[name=boundingTileId]:checked').get().map(r => $(r).val())[0]
            return boundingTiles.find(b => b.id === boundingTileId)
        },
        top: ui.controls.element.position().top + 110,
        left: ui.controls.element.position().left + 110
    })
}

/**
 * Share a media on the scene
 */
export const shareSceneMedia = async (url, style, type) => {
    if (!canvas.scene) {
        return ui.notifications.warn(game.i18n.localize(`${constants.moduleName}.share.scene-no-scene`))
    }

    const boundingTiles = getAllBoundingTiles()

    if (!boundingTiles.length) {
        return ui.notifications.warn(game.i18n.localize(`${constants.moduleName}.bounding-tile.not-found`))
    }

    const boundingTile = boundingTiles.length > 1 ?
        await _promptShareBoundingTileSection(boundingTiles) :
        boundingTiles[0]

    await canvas.scene.setFlag(constants.moduleName, boundingTile.data.flags[constants.moduleName].name, { url, style, type })

    ui.notifications.info(game.i18n.localize(`${constants.moduleName}.share.scene-success`))
}

/**
 * Prompt the sharer with the list of boundind tiles to select from
 */
async function _promptShareBoundingTileSection(boundingTiles) {
    const boundingTilesData = boundingTiles.map(b => ({ id: b.id, name: b.data.flags[constants.moduleName].name }))
        .sort((a, b) => a.name.localeCompare(b.name))

    const content = await renderTemplate(
        `${constants.modulePath}/templates/share-bounding-tile-selection-dialog.hbs`,
        { boundingTiles: boundingTilesData }
    )

    return dialog({
        id: 'share-bounding-tile-selection-dialog',
        title: game.i18n.localize(`${constants.moduleName}.dialogs.share-bounding-tile-selection.title`),
        content,
        cancelLabel: game.i18n.localize(`${constants.moduleName}.dialogs.share-bounding-tile-selection.cancel-button`),
        validateLabel: game.i18n.localize(`${constants.moduleName}.dialogs.share-bounding-tile-selection.share-button`),
        validateCallback: (html) => {
            const boundingTileId = html.find('input:radio[name=boundingTileId]:checked').get().map(r => $(r).val())[0]
            return boundingTiles.find(b => b.id === boundingTileId)
        }
    })
}