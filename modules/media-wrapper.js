import constants from './settings/constants.js'
import { sharePopoutMedia } from './popout-handler.js'
import { shareSceneMedia } from './scene-handler.js'
import { shareFullscreenMedia } from './fullscreen-handler.js'
import { SETTINGS } from './settings/settings.js'
import { parseInlineStyles } from './helpers.js'

/**
 * Get all images & videos and wrap each with action buttons
 */
export const wrapMedias = (html) => {
    const selectors = [
        'article.journal-entry-page.text :not(header) > img', // Default FVTT Text journal sheet
        'article.journal-entry-page.text :not(header) > video', // Default FVTT Text journal sheet
        'article.journal-entry-page.image :not(header) > img', // Default FVTT Image journal sheet
        'article.journal-entry-page.video :not(header) > video', // Default FVTT Video journal sheet
        'div.editor-content img:not([data-edit])', // FVTT imgs
        'div.editor-content video:not([data-edit])', // FVTT videos
        'section.tab-container img:not([data-edit])', // Kanka imgs
        'section.tab-container input[type="image"]' // Kanka inputs
    ]

    const medias = html.find(selectors.join(','))

    medias.each((index, media) => {
        const htmlMedia = $(media)
        if (htmlMedia.parent().attr('id') === "show-media") return;

        const mediaType = htmlMedia.is('img') || htmlMedia.is('input[type="image"]') ? 'image' : 'video'
        const smallMediaSize = htmlMedia.innerWidth() <= 350

        const mediaUrl = mediaType === 'image' ?
            htmlMedia.attr('src') :
            htmlMedia.attr('src') || htmlMedia.find('source:first').attr('src')

        _wrapImageVideoMedia(media, mediaUrl, mediaType, smallMediaSize)
    })
}

/**
 * Wrap media with action buttons
 */
function _wrapImageVideoMedia(media, src, type = 'image', smallMediaSize = false) {
    const sourceStyles = parseInlineStyles(media)
    const inlineStyles = ['display', 'float', 'margin', 'margin-left', 'margin-right'].reduce((style, current) => {
        return sourceStyles.hasOwnProperty(current) ? `${style} ${current}: ${sourceStyles[current]};` : style
    }, '')

    $(media).wrap(`<div id="show-media" class="clickable-media" style="${inlineStyles || ''}"></div>`)
        .after(`<div class="media-actions-container"></div>`)

    if(game.user.isGM) {
        const immersiveSetting = game.settings.get(constants.moduleName, SETTINGS.FULLSCREEN_IMMERSIVE_MODE)

        $(media).parent().find('div.media-actions-container')
            .append(`
                <div class="media-actions">
                    <i class="drawer fas fa-book-open" title="${game.i18n.localize(`${constants.moduleName}.share.popout-button`)}"></i>
                    <div class="actions">
                            <span data-action="share-popout" data-mode="all" data-type="${type}" data-url="${src}" title="${game.i18n.localize(`${constants.moduleName}.share.popout-all-button`)}"><i class="fas fa-users"></i>${!smallMediaSize ? `&nbsp;&nbsp;${game.i18n.localize(`${constants.moduleName}.share.popout-all-button`)}` : ``}</span>
                            <span data-action="share-popout" data-mode="some" data-type="${type}" data-url="${src}" title="${game.i18n.localize(`${constants.moduleName}.share.popout-some-button`)}"><i class="fas fa-user-friends"></i>${!smallMediaSize ? `&nbsp;&nbsp;${game.i18n.localize(`${constants.moduleName}.share.popout-some-button`)}` : ``}</span>
                    </div>
                </div>
                <div class="media-actions">
                    <i class="drawer fas fa-expand-arrows-alt" title="${game.i18n.localize(`${constants.moduleName}.share.fullscreen-button`)}"></i>
                    <div class="actions">
                        <span data-action="share-fullscreen" data-mode="all" data-url="${src}" data-type="${type}" title="${game.i18n.localize(`${constants.moduleName}.share.fullscreen-all-button`)}"><i class="fas fa-users"></i>${!smallMediaSize ? `&nbsp;&nbsp;${game.i18n.localize(`${constants.moduleName}.share.fullscreen-all-button`)}` : ``}</span>
                        <span data-action="share-fullscreen" data-mode="some" data-url="${src}" data-type="${type}" title="${game.i18n.localize(`${constants.moduleName}.share.fullscreen-some-button`)}"><i class="fas fa-user-friends"></i>${!smallMediaSize ? `&nbsp;&nbsp;${game.i18n.localize(`${constants.moduleName}.share.fullscreen-some-button`)}` : ``}</span>
                        <span data-action="share-fullscreen-immersive" data-action="immersive-mode" class="immersive-action ${immersiveSetting ? 'active' : ''}" data-value="${immersiveSetting}" title="${game.i18n.localize(`${constants.moduleName}.share.fullscreen-immersive-button`)}"><i class="fa-thin fa-arrows-maximize"></i>${!smallMediaSize ? `&nbsp;&nbsp;${game.i18n.localize(`${constants.moduleName}.share.fullscreen-immersive-button`)}` : ``}</span>
                    </div>
                </div>
                <div class="media-actions">
                    <i class="drawer fas fa-map" title="${game.i18n.localize(`${constants.moduleName}.share.scene-button`)}"></i>
                    <div class="actions">
                        <span data-action="share-scene" data-style="fit" data-type="${type}" data-url="${src}" title="${game.i18n.localize(`${constants.moduleName}.share.scene-fit-button`)}"><i class="fas fa-compress-arrows-alt"></i>${!smallMediaSize ? `&nbsp;&nbsp;${game.i18n.localize(`${constants.moduleName}.share.scene-fit-button`)}` : ``}</span>
                        <span data-action="share-scene" data-style="cover" data-type="${type}" data-url="${src}" title="${game.i18n.localize(`${constants.moduleName}.share.scene-cover-button`)}"><i class="fas fa-expand"></i>${!smallMediaSize ? `&nbsp;&nbsp;${game.i18n.localize(`${constants.moduleName}.share.scene-cover-button`)}` : ``}</span>
                    </div>
                </div>
            `)
        }

        if (type === 'image' && game.modules.get('foundryvtt-miro-connector')?.active && window["foundryvtt-miro-connector"].MiroAPI) {
            const playerApiAccess = game.settings.get('foundryvtt-miro-connector', 'player-api-access')

            if(game.user.isGM || playerApiAccess) {
                $(media).parent().find('div.media-actions-container')
                .append(`
                    <div class="media-actions miro-action" data-action="share-miro" data-url="${src}">
                        <i class="drawer fas fa-cloud-upload-alt" title="${game.i18n.localize(`${constants.moduleName}.share.miro-button`)}"></i>
                    </div>
                `)
            }
        }

        if (game.user.isGM && type === 'video') {
            const loopSetting = game.settings.get(constants.moduleName, SETTINGS.VIDEO_LOOPING_OPTION)
            const muteSetting = game.settings.get(constants.moduleName, SETTINGS.VIDEO_MUTE_OPTION)

            $(media).parent().find('div.media-actions-container')
                .append(`
                    <div class="media-actions loop-action ${loopSetting ? 'active' : ''}" data-action="share-loop" data-value="${loopSetting}">
                        <i class="drawer fas fa-undo" title="${game.i18n.localize(`${constants.moduleName}.share.loop-button`)}"></i>
                    </div>
                    <div class="media-actions mute-action ${muteSetting ? 'active' : ''}" data-action="share-mute" data-value="${muteSetting}">
                        <i class="drawer fas fa-volume-mute" title="${game.i18n.localize(`${constants.moduleName}.share.mute-button`)}"></i>
                    </div>
                `)
        }
}

/**
 * Activate listeners on media actions
 */
export const activateMediaListeners = html => {
    const popoutSelectors = [
        'span[data-action="share-popout"]', // Default FVTT
    ]

    const htmlPopoutSelectors = html.find(popoutSelectors.join(','))
    htmlPopoutSelectors.each((index, element) => {
        if ($._data(element, "events")) return

        $(element).click(evt => {
            evt.preventDefault()
            evt.stopPropagation()

            const button = $(evt.currentTarget)[0]
            if (button) {
                const loopParameter = getLoopParameter(button)
                const muteParameter = getMuteParameter(button)
                const title = ""
                sharePopoutMedia(button.dataset.url, button.dataset.mode, title, loopParameter, muteParameter)
            }
        })
    })

    const sceneSelectors = [
        'span[data-action="share-scene"]', // Default FVTT
    ]

    const htmlSceneSelectors = html.find(sceneSelectors.join(','))
    htmlSceneSelectors.each((index, element) => {
        if ($._data(element, "events")) return

        $(element).click(evt => {
            evt.preventDefault()
            evt.stopPropagation()

            const button = $(evt.currentTarget)[0]
            if (button) {
                const loopParameter = getLoopParameter(button)
                const muteParameter = getMuteParameter(button)
                const title = ""
                shareSceneMedia(button.dataset.url, button.dataset.style, button.dataset.type, title, loopParameter, muteParameter)
            }
        })
    })


    const fullscreenSelectors = [
        'span[data-action="share-fullscreen"]', // Default FVTT
    ]

    const htmlFullscreenSelectors = html.find(fullscreenSelectors.join(','))
    htmlFullscreenSelectors.each((index, element) => {
        if ($._data(element, "events")) return

        $(element).click(evt => {
            evt.preventDefault()
            evt.stopPropagation()

            const button = $(evt.currentTarget)[0]
            if (button) {
                const loopParameter = getLoopParameter(button)
                const muteParameter = getMuteParameter(button)
                const immersiveParameter = getImmersiveParameter(button)
                const title = ""
                shareFullscreenMedia(button.dataset.url, button.dataset.mode, button.dataset.type, title, immersiveParameter, loopParameter, muteParameter)
            }
        })
    })


    const immersiveSelectors = [
        'span[data-action="share-fullscreen-immersive"]', // Default FVTT
    ]

    const htmlImmersiveSelectors = html.find(immersiveSelectors.join(','))
    htmlImmersiveSelectors.each((index, element) => {
        if ($._data(element, "events")) return

        $(element).click(evt => {
            evt.preventDefault()
            evt.stopPropagation()

            const button = $(evt.currentTarget)[0]
            if (button) {
                $(button).toggleClass('active')
                $(button).attr('data-value', $(button).hasClass('active'))
            }
        })
    })

    const loopVideoSelectors = [
        'div[data-action="share-loop"]', // Default FVTT
    ]

    const htmlLoopVideoSelectors = html.find(loopVideoSelectors.join(','))
    htmlLoopVideoSelectors.each((index, element) => {
        if ($._data(element, "events")) return

        $(element).click(evt => {
            evt.preventDefault()
            evt.stopPropagation()

            const button = $(evt.currentTarget)[0]
            if (button) {
                $(button).toggleClass('active')
                $(button).attr('data-value', $(button).hasClass('active'))
            }
        })
    })

    const muteVideoSelectors = [
        'div[data-action="share-mute"]', // Default FVTT
    ]

    const htmlMuteVideoSelectors = html.find(muteVideoSelectors.join(','))
    htmlMuteVideoSelectors.each((index, element) => {
        if ($._data(element, "events")) return

        $(element).click(evt => {
            evt.preventDefault()
            evt.stopPropagation()

            const button = $(evt.currentTarget)[0]
            if (button) {
                $(button).toggleClass('active')
                $(button).attr('data-value', $(button).hasClass('active'))
            }
        })
    })


    const miroSelectors = [
        'div[data-action="share-miro"]', // Default FVTT
    ]

    const htmlMiroSelectors = html.find(miroSelectors.join(','))
    htmlMiroSelectors.each((index, element) => {
        if ($._data(element, "events")) return

        $(element).click(evt => {
            evt.preventDefault()
            evt.stopPropagation()

            const button = $(evt.currentTarget)[0]
            if (button) {
                window["foundryvtt-miro-connector"].MiroAPI.sendJournalEntryImage(button.dataset.url)
            }
        })
    })

}

/**
 * Get the corresponding immersive setting for the media
 */
function getImmersiveParameter(button) {
    const immersiveButton = $(button).closest('div.actions').find('span.immersive-action')

    return immersiveButton.length === 0 ? false : immersiveButton.attr('data-value') === 'true'
}

/**
 * Get the corresponding loop setting for the media
 */
function getLoopParameter(button) {
    const loopButton = $(button).closest('div.media-actions-container').find('div.media-actions.loop-action')

    return loopButton.length === 0 ? false : loopButton.attr('data-value') === 'true'
}

/**
 * Get the corresponding mute setting for the media
 */
function getMuteParameter(button) {
    const muteButton = $(button).closest('div.media-actions-container').find('div.media-actions.mute-action')

    return muteButton.length === 0 ? false : muteButton.attr('data-value') === 'true'
}