import { shareFullscreenMedia } from './fullscreen-handler.js'
import { sharePopoutMedia } from './popout-handler.js'
import { shareSceneMedia } from './scene-handler.js'
import constants from './settings/constants.js'

/**
 * Find the bounding tiles on the viewed scene with a specific name
 */
export const findBoundingTileByName = name => {
    return canvas.scene.tiles.find(t => t.flags?.[constants.moduleName]?.isBounding && t.flags?.[constants.moduleName]?.name === name)
}

/**
 * Get all the bounding tiles on the viewed scene
 */
export const getAllBoundingTiles = () => {
    return canvas.scene.tiles.filter(t => t.flags?.[constants.moduleName]?.isBounding)
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

        let buttons = {}

        if(cancelLabel) {
            buttons = foundry.utils.mergeObject(buttons, {
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: cancelLabel,
                    callback: () => reject
                }
            })
        }

        if(validateLabel && validateCallback) {
            buttons = foundry.utils.mergeObject(buttons, {
                validate: {
                    icon: '<i class="fas fa-check"></i>',
                    label: validateLabel,
                    callback: html => {
                        resolve(validateCallback(html))
                    }
                }
            })
        }

        buttons = foundry.utils.mergeObject(buttons, supplementaryButtons)

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

export const chooseShareAction = async (url, title = "") => {
    const buttons = [
        {
            id: 'share-popout-all',
            icon: '<i class="fas fa-book-open"></i>',
            label: game.i18n.localize(`${constants.moduleName}.dialogs.share-action.share-popout-all`),
            callback: html => sharePopoutMedia(url, 'all', title)
        },
        {
            id: 'share-popout-some',
            icon: '<i class="fas fa-book-open"></i>',
            label: game.i18n.localize(`${constants.moduleName}.dialogs.share-action.share-popout-some`),
            callback: html => sharePopoutMedia(url, 'some', title)
        },
        {
            id: 'share-fullscreen-all',
            icon: '<i class="fas fa-expand-arrows-alt"></i>',
            label: game.i18n.localize(`${constants.moduleName}.dialogs.share-action.share-fullscreen-all`),
            callback: html => shareFullscreenMedia(url, 'all', "image", title)
        },
        {
            id: 'share-fullscreen-some',
            icon: '<i class="fas fa-expand-arrows-alt"></i>',
            label: game.i18n.localize(`${constants.moduleName}.dialogs.share-action.share-fullscreen-some`),
            callback: html => shareFullscreenMedia(url, 'some', "image", title)
        },
        {
            id: 'share-scene-fit',
            icon: '<i class="fas fas fa-map"></i>',
            label: game.i18n.localize(`${constants.moduleName}.dialogs.share-action.share-scene-fit`),
            callback: html => shareSceneMedia(url, 'fit')
        }
        ,
        {
            id: 'share-scene-cover',
            icon: '<i class="fas fas fa-map"></i>',
            label: game.i18n.localize(`${constants.moduleName}.dialogs.share-action.share-scene-cover`),
            callback: html => shareSceneMedia(url, 'cover')
        }
    ]

    const content = await renderTemplate(`${constants.modulePath}/templates/choose-share-action-dialog.hbs`)

    return dialog({
        id: 'choose-share-action-dialog',
        content,
        title: game.i18n.localize(`${constants.moduleName}.dialogs.share-action.title`),
        otherButtons: buttons
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