import constants from './settings/constants.js'

/**
 * Find the bounding tiles on the viewed scene with a specific name
 */
export const findBoundingTileByName = name => {
    return canvas.scene.tiles.find(t => t.data.flags?.[constants.moduleName]?.isBounding && t.data.flags?.[constants.moduleName]?.name === name)
}

/**
 * Get all the bounding tiles on the viewed scene
 */
export const getAllBoundingTiles = () => {
    return canvas.scene.tiles.filter(t => t.data.flags?.[constants.moduleName]?.isBounding)
}

/**
 * Prompt a dialog window an execute a callback on validate
 */
export const dialog = async ({
    id,
    title,
    content,
    cancelLabel,
    validateLabel,
    validateCallback,
    render = null,
    top = null,
    left = null
}) => {
    return new Promise((resolve, reject) => {
        new Dialog({
            title,
            content,
            buttons: {
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: cancelLabel,
                    callback: () => reject
                },
                validate: {
                    icon: '<i class="fas fa-check"></i>',
                    label: validateLabel,
                    callback: html => {
                        resolve(validateCallback(html))
                    }
                }
            },
            default: 'validate',
            render
        }, {
            id: `${constants.moduleName}-${id}`,
            top,
            left
        }).render(true)
    })
}