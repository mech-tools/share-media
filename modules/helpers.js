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
    otherButtons = [],
    defaultButton = 'validate',
    render = null,
    top = null,
    left = null
}) => {
    return new Promise((resolve, reject) => {
        const supplementaryButtons = {}

        otherButtons.forEach(b => {
            supplementaryButtons[b.id] = {
                icon: b.icon,
                label: b.label,
                callback: html => {
                    resolve(b.callback(html))
                }
            }
        })

        const buttons = foundry.utils.mergeObject({
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
        }, supplementaryButtons)

        new Dialog({
            title,
            content,
            buttons,
            default: defaultButton,
            render
        }, {
            id: `${constants.moduleName}-${id}`,
            top,
            left
        }).render(true)
    })
}

/**
 * Returns the inline styles of an HTML Element as array
 */
export const parseInlineStyles = (element) => {
    const styles = ($(element).attr('style') || '').split(';')
    let i = styles.length
    const arr = []
    let style, k, v

    while (i--)
    {
        style = styles[i].split(':')
        k = $.trim(style[0])
        v = $.trim(style[1])
        if (k.length > 0 && v.length > 0)
        {
            arr[k] = v
        }
    }

    return arr
}