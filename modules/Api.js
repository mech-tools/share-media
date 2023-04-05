import { shareFullscreenMedia } from "./fullscreen-handler.js"
import { sharePopoutMedia } from "./popout-handler.js"
import { shareSceneMedia, _clearBoundingTile } from "./scene-handler.js"

/**
 * Module capabilities as API
 */
export default class Api {
    /**
     * Share a media in a popout to all players
     * @param {string} url url to the media
     * @param {string} [title=""] optional title
     * @param {boolean} [loop=false] loop the video (only for videos)
     * @param {boolean} [mute=true] mute the video (only for videos)
     */
    static async sharePopoutMediaToAll(url, title = "", loop = false, mute = true) {
        this._validate(url, loop, mute)

        await sharePopoutMedia(url, 'all', title, loop, mute)
    }

    /**
     * Share a media in a popout to a selection of players
     * @param {string} url url to the media
     * @param {string} [title=""] optional title
     * @param {boolean} [loop=false] loop the video (only for videos)
     * @param {boolean} [mute=true] mute the video (only for videos)
     */
    static async sharePopoutMediaToSome(url, title = "", loop = false, mute = true) {
        this._validate(url, loop, mute)

        await sharePopoutMedia(url, 'some', title, loop, mute)
    }

    /**
     * Share a media fullscreen to all players
     * @param {string} url url to the media
     * @param {string} [title=""] optional title
     * @param {boolean} [immersive=false] immersive mode
     * @param {boolean} [loop=false] loop the video (only for videos)
     * @param {boolean} [mute=true] mute the video (only for videos)
     */
    static async shareFullscreenMediaToAll(url, title = "", immersive = false, loop = false, mute = true) {
        this._validate(url, loop, mute)

        const type = ['.mp4', 'webm'].includes(url.slice(-4).toLowerCase()) ? 'video' : 'image'
        await shareFullscreenMedia(url, 'all', type, title, immersive, loop, mute)
    }

    /**
     * Share a media fullscreen to a selection of players
     * @param {string} url url to the media
     * @param {string} [title=""] optional title
     * @param {boolean} [immersive=false] immersive mode
     * @param {boolean} [loop=false] loop the video (only for videos)
     * @param {boolean} [mute=true] mute the video (only for videos)
     */
    static async shareFullscreenMediaToSome(url, title = "", immersive = false, loop = false, mute = true) {
        this._validate(url, loop, mute)

        const type = ['.mp4', 'webm'].includes(url.slice(-4).toLowerCase()) ? 'video' : 'image'
        await shareFullscreenMedia(url, 'some', type, title, immersive, loop, mute)
    }

    /**
     * Share a media on the current scene with fit mode
     * @param {string} url url to the media
     * @param {boolean} [loop=false] loop the video (only for videos)
     * @param {boolean} [mute=true] mute the video (only for videos)
     * @param {string} [boundingTileName=""] the bounding tile name, will default on the bounding tile selection if not found
     */
    static async shareSceneMediaFit(url, loop = false, mute = true, boundingTileName = '') {
        this._validate(url, loop, mute)

        const type = ['.mp4', 'webm'].includes(url.slice(-4).toLowerCase()) ? 'video' : 'image'
        await shareSceneMedia(url, 'fit', type, loop, mute, boundingTileName)
    }

    /**
     * Share a media on the current scene with cover mode
     * @param {string} url url to the media
     * @param {boolean} [loop=false] loop the video (only for videos)
     * @param {boolean} [mute=true] mute the video (only for videos)
     * @param {string} [boundingTileName=""] the bounding tile name, will default on the bounding tile selection if not found
     */
    static async shareSceneMediaCover(url, loop = false, mute = true, boundingTileName = '') {
        this._validate(url, loop, mute)

        const type = ['.mp4', 'webm'].includes(url.slice(-4).toLowerCase()) ? 'video' : 'image'
        await shareSceneMedia(url, 'cover', type, loop, mute, boundingTileName)
    }

    /** Valide the common parameters */
    static _validate(url, loop, mute) {
        if(!url) throw new Error('Missing url parameter')
        if(typeof loop !== 'boolean') throw new Error('Loop parameter is not a valid boolean')
        if(typeof mute !== 'boolean') throw new Error('Mute parameter is not a valid boolean')
    }

    /**
     * Clear one or multiple bounding tiles on the current scene
     * @param {string} [boundingTileName=""] bouding tile to clear
     */
    static clearBoundingTile(boundingTileName = '') {
        _clearBoundingTile(boundingTileName)
    }
}