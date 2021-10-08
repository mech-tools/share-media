import constants from './settings/constants.js'
import { socketDismissFullscreenMedia } from './socket.js'

/**
 * Create a dedicated dom layer for sharing a media fullscreen
 */
class shareFullscreenLayer {
    init() {
        this._createContainer()
        this._activateListeners()
    }

    _createContainer() {
        const dismissButton = game.user.isGM ?
        `<button class="dismiss"><i class="fas fa-times"></i> ${game.i18n.localize(`${constants.moduleName}.share.fullscreen-dismiss-button`)}</button>` : ''

        this.container = $('<div id="fullscreen-layer" class="hidden"></div>')
            .append(`
                <div class="background"></div>
                <img src="${constants.modulePath}/images/transparent.png" alt="">
                ${dismissButton}
            `)

        $('body').append(this.container)
    }

    _activateListeners() {
        this.container.find('button').click(e => socketDismissFullscreenMedia())
    }

    handleShare(url, type) {
        this.container.find('.background').css('background-image', `url("${url}")`)
        this.container.find('img').attr('src', url)
        this.container.removeClass('hidden')
    }

    handleDismiss() {
        this.container.find('.background').css('background-image', `url("${constants.modulePath}/images/transparent.png")`)
        this.container.find('img').attr('src', `${constants.modulePath}/images/transparent.png`)
        this.container.addClass('hidden')
    }
}

/**
 * Create a singleton instance and export it
 */
const fullscreenLayer = new shareFullscreenLayer
export default fullscreenLayer