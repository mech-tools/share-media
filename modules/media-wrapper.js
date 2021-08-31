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
                <div class="media-actions-container">
                    <div class="media-actions">
                        <i class="drawer fas fa-book-open" title="${game.i18n.localize(`${constants.moduleName}.share.popout-button`)}"></i>
                        <div class="actions">
                            <span data-action="share-popout" data-mode="all" data-url="${mediaUrl}">${game.i18n.localize(`${constants.moduleName}.share.popout-all-button`)}</span>
                            <span data-action="share-popout" data-mode="some" data-url="${mediaUrl}">${game.i18n.localize(`${constants.moduleName}.share.popout-some-button`)}</i>
                        </div>
                    </div>
                    <div class="media-actions">
                        <i class="drawer fas fa-map" title="${game.i18n.localize(`${constants.moduleName}.share.scene-button`)}"></i>
                        <div class="actions">
                            <span data-action="share-scene" data-style="fit" data-url="${mediaUrl}">${game.i18n.localize(`${constants.moduleName}.share.scene-fit-button`)}</span>
                            <span data-action="share-scene" data-style="cover" data-url="${mediaUrl}">${game.i18n.localize(`${constants.moduleName}.share.scene-cover-button`)}</span>
                        </div>
                    </div>
                </div>
            `)
    })
}

/**
 * Activate listeners on image actions
 */
export const activateMediaListeners = html => {
    html.find('div.editor-content span[data-action="share-popout"]').click(evt => {
        evt.preventDefault()

        const button = $(evt.target)[0]
        if (button) {
            sharePopoutMedia(button.dataset.url, button.dataset.mode)
        }
    })

    html.find('div.editor-content span[data-action="share-scene"]').click(evt => {
        evt.preventDefault()

        const button = $(evt.target)[0]
        if (button) {
            shareSceneMedia(button.dataset.url, button.dataset.style)
        }
    })
}