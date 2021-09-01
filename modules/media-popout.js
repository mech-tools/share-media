import constants from './settings/constants.js'

/**
 * Extend the default Image Popout to handle videos
 */
export default class MediaPopout extends ImagePopout {
    constructor(src, options = {}) {
        super(src, options)

        this.video = ['.mp4', 'webm'].includes(src.slice(-4).toLowerCase())
        this.options.template = `${constants.modulePath}/templates/media-popout-dialog.hbs`
    }

    async getData(options) {
        let data = await super.getData()
        data.isVideo = this.video

        return data
    }

    /**
     * Create a new Media Popout and display it
     */
    static _handleShareMedia(url) {
        const mediaPopout = new this(url, {
            shareable: false,
            editable: false
        }).render(true)

        // Fix: force play after rendering
        if (mediaPopout.video) {
            setTimeout(() => {
                const video = mediaPopout.element.find('video')[0]
                video.play()
            }, 250)
        }
    }
}