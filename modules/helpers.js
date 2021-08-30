import constants from './settings/constants.js'

/**
 * Find a bounding tile on the viewed scene
 */
export const findBoundingTile = () => {
    return game.scenes.viewed.tiles.find(t => t.data.flags?.[constants.moduleName]?.isBounding)
}