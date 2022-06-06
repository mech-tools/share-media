import constants from './settings/constants.js'
import { SETTINGS } from './settings/settings.js'
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
        const immersiveMode = game.settings.get(constants.moduleName, SETTINGS.FULLSCREEN_IMMERSIVE_MODE)

        const dismissButton = game.user.isGM ?
        `<button class="dismiss"><i class="fas fa-times"></i> ${game.i18n.localize(`${constants.moduleName}.share.fullscreen-dismiss-button`)}</button>` : ''

        this.container = $(`<div id="fullscreen-layer" class="hidden ${immersiveMode ? 'immersive-mode' : ''}"></div>`)
            .append(`
                <div class="background"></div>
                <img src="${constants.modulePath}/images/transparent.png" alt="">
                <video playsinline src="" class="disabled"></video>
                <div class="buttons">
                    ${dismissButton}
                    <button class="minimize" title="${game.i18n.localize(`${constants.moduleName}.share.fullscreen-minimize-button`)}">
                        <i class="fas fa-window-minimize"></i>
                    </button>
                    <button class="maximize hidden" title="${game.i18n.localize(`${constants.moduleName}.share.fullscreen-maximize-button`)}">
                        <i class="fas fa-window-maximize"></i>
                    </button>
                </div>
            `)

        const otherModules = document.querySelectorAll(".gm-screen-app, #dice-box-canvas");

        otherModules?.[0]
            ? this.container.insertBefore($(otherModules[0]))
            : this.container.insertBefore($(document.getElementById("pause")));
    }

    _activateListeners() {
        this.container.find('button.dismiss').click(e => socketDismissFullscreenMedia())
        this.container.find('button.minimize').click(e => this.toggleMinimize())
        this.container.find('button.maximize').click(e => this.toggleMinimize())
    }

    handleShare(url, type = 'image', loop = false, mute = true) {
        const background = this.container.find('.background')
        const img = this.container.find('img')
        const video = this.container.find('video')
        const videoContainer = video.get(0)
        const minimizeButton = this.container.find('.minimize')
        const maximizeButton = this.container.find('.maximize')

        if (type === 'image') {
            if(url.endsWith('.jpg')) {
                background.css('background-image', `url("${url}")`)
            } else {
                background.css('background-image', `url("${constants.modulePath}/images/black.png")`)
            }


            video.addClass('disabled')

            img.attr('src', url)
            img.removeClass('disabled')
        }

        if (type === 'video') {
            background.css('background-image', `url("${constants.modulePath}/images/black.png")`)

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
        this.container.removeClass('minimized')
        minimizeButton.removeClass('hidden')
        maximizeButton.addClass('hidden')
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

    toggleMinimize(evt) {
        const minimizeButton = this.container.find('.minimize')
        const maximizeButton = this.container.find('.maximize')
        minimizeButton.toggleClass('hidden')
        maximizeButton.toggleClass('hidden')

        this.container.toggleClass('minimized')
    }
}

/**
 * Create a singleton instance and export it
 */
const fullscreenLayer = new shareFullscreenLayer
export default fullscreenLayer