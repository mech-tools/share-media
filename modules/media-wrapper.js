import constants from './settings/constants.js'
import { sharePopoutMedia } from './popout-handler.js'
import { shareSceneMedia } from './scene-handler.js'

/**
 * Wrap media with action buttons
 */
export const wrapMedias = html => {
    const medias = html.find('div.editor-content img:not([data-edit])')

    medias.each((index, media) => {
        const mediaUrl = $(media).attr('src')

        $(media)
            .wrap('<div class="show-media clickable-media"></div>')
            .after(`
                <div class="media-actions">
                    <i data-action="share-scene" data-url="${mediaUrl}" class="media-action fas fa-map" title="${game.i18n.localize(`${constants.moduleName}.share.scene-button`)}"></i>
                    <i data-action="share-popout" data-url="${mediaUrl}" class="media-action fas fa-book-open" title="${game.i18n.localize(`${constants.moduleName}.share.popout-button`)}"></i>
                </div>
            `)
    })
}

/**
 * Activate listeners on image actions
 */
export const activateMediaListeners = html => {
    html.find('div.editor-content i[data-action="share-popout"]').click(evt => {
        evt.preventDefault()

        const button = $(evt.target)[0]
        if (button) {
            sharePopoutMedia(button.dataset.url, evt.shiftKey)
        }
    })

    html.find('div.editor-content i[data-action="share-scene"]').click(evt => {
        evt.preventDefault()

        const button = $(evt.target)[0]
        if (button) {
            shareSceneMedia(button.dataset.url, evt.shiftKey)
        }
    })
}