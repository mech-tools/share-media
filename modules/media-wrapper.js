import constants from './settings/constants.js'
import { sharePopoutMedia } from './popout-handler.js'
import { shareSceneMedia } from './scene-handler.js'
import { shareFullscreenMedia } from './fullscreen-handler.js'
import { SETTINGS } from './settings/settings.js'
import { parseInlineStyles } from './helpers.js'

/**
 * Get all images & videos and wrap each with action buttons
 */
export const wrapMedias = html => {
    const selectors = [
        'div.editor-content img:not([data-edit])', // FVTT imgs
        'div.editor-content video:not([data-edit])', // FVTT videos
        'section.tab-container img:not([data-edit])', // Kanka imgs
        'section.tab-container input[type="image"]' // Kanka inputs
    ]

    const medias = html.find(selectors.join(','))

    medias.each((index, media) => {
        const htmlMedia = $(media)
        const mediaType = htmlMedia.is('img') || htmlMedia.is('input[type="image"]') ? 'image' : 'video'
        const smallMediaSize = htmlMedia.innerWidth() <= 250

        const mediaUrl = mediaType === 'image' ?
            htmlMedia.attr('src') :
            htmlMedia.find('source:first').attr('src')

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
        'div.editor-content span[data-action="share-popout"]', // Default FVTT
        'section.tab-container span[data-action="share-popout"]' // Kanka
    ]

    html.find(popoutSelectors.join(',')).click(evt => {
        evt.preventDefault()
        evt.stopPropagation()

        const button = $(evt.currentTarget)[0]
        if (button) {
            const loopParameter = getLoopParameter(button)
            const muteParameter = getMuteParameter(button)
            sharePopoutMedia(button.dataset.url, button.dataset.mode, loopParameter, muteParameter)
        }
    })

    const sceneSelectors = [
        'div.editor-content span[data-action="share-scene"]', // Default FVTT
        'section.tab-container span[data-action="share-scene"]' // Kanka
    ]

    html.find(sceneSelectors.join(',')).click(evt => {
        evt.preventDefault()
        evt.stopPropagation()

        const button = $(evt.currentTarget)[0]
        if (button) {
            const loopParameter = getLoopParameter(button)
            const muteParameter = getMuteParameter(button)
            shareSceneMedia(button.dataset.url, button.dataset.style, button.dataset.type, loopParameter, muteParameter)
        }
    })

    const fullscreenSelectors = [
        'div.editor-content span[data-action="share-fullscreen"]', // Default FVTT
        'section.tab-container span[data-action="share-fullscreen"]' // Kanka
    ]

    html.find(fullscreenSelectors.join(',')).click(evt => {
        evt.preventDefault()
        evt.stopPropagation()

        const button = $(evt.currentTarget)[0]
        if (button) {
            const loopParameter = getLoopParameter(button)
            const muteParameter = getMuteParameter(button)
            shareFullscreenMedia(button.dataset.url, button.dataset.mode, button.dataset.type, loopParameter, muteParameter)
        }
    })

    const loopVideoSelectors = [
        'div.editor-content div[data-action="share-loop"]', // Default FVTT
        'section.tab-container div[data-action="share-loop"]' // Kanka
    ]

    html.find(loopVideoSelectors.join(',')).click(evt => {
        evt.preventDefault()
        evt.stopPropagation()

        const button = $(evt.currentTarget)[0]
        if (button) {
            $(button).toggleClass('active')
            $(button).attr('data-value', $(button).hasClass('active'))
        }
    })

    const muteVideoSelectors = [
        'div.editor-content div[data-action="share-mute"]', // Default FVTT
        'section.tab-container div[data-action="share-mute"]' // Kanka
    ]

    html.find(muteVideoSelectors.join(',')).click(evt => {
        evt.preventDefault()
        evt.stopPropagation()

        const button = $(evt.currentTarget)[0]
        if (button) {
            $(button).toggleClass('active')
            $(button).attr('data-value', $(button).hasClass('active'))
        }
    })

    const miroSelectors = [
        'div.editor-content div[data-action="share-miro"]', // Default FVTT
        'section.tab-container div[data-action="share-miro"]' // Kanka
    ]

    html.find(miroSelectors.join(',')).click(evt => {
        evt.preventDefault()
        evt.stopPropagation()

        const button = $(evt.currentTarget)[0]
        if (button) {
            window["foundryvtt-miro-connector"].MiroAPI.sendJournalEntryImage(button.dataset.url)
        }
    })
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