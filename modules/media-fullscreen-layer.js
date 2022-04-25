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
                <video playsinline src="" class="disabled"></video>
                ${dismissButton}
            `)

        $('body').append(this.container)
    }

    _activateListeners() {
        this.container.find('button').click(e => socketDismissFullscreenMedia())
    }

    handleShare(url, type = 'image', loop = false, mute = true) {
        const background = this.container.find('.background')
        const img = this.container.find('img')
        const video = this.container.find('video')
        const videoContainer = video.get(0)

        if (type === 'image') {
            background.css('background-image', `url("${url}")`)

            video.addClass('disabled')

            img.attr('src', url)
            img.removeClass('disabled')
        }

        if (type === 'video') {
            background.css('background-image', `url("${constants.modulePath}/images/transparent.png")`)

            img.addClass('disabled')

            video.attr('src', url)
            video.removeClass('disabled')

            videoContainer.loop = loop
            videoContainer.muted = mute
            videoContainer.onended = loop ?
                null :
                () => this.handleDismiss()
            videoContainer.play().catch(e => {
                videoContainer.muted = true
                videoContainer.play()
            })
        }

        this.container.removeClass('hidden')
    }

    handleDismiss() {
        const background = this.container.find('.background')
        const img = this.container.find('img')
        const video = this.container.find('video')
        const videoContainer = video.get(0)

        background.css('background-image', `url("${constants.modulePath}/images/transparent.png")`)
        img.attr('src', `${constants.modulePath}/images/transparent.png`)
        videoContainer.pause()
        video.attr('src', '')

        this.container.addClass('hidden')
    }
}

/**
 * Create a singleton instance and export it
 */
const fullscreenLayer = new shareFullscreenLayer
export default fullscreenLayer