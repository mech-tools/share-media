/**
 * Mixin that provides media functionalities for media layers.
 * @param {Class} Base  The base class to extend with video functionalities.
 * @returns {Class}
 */
export default function MediaMixin(Base) {
  /**
   * @param {string}  [src=null]    Source URL of the media being displayed.
   * @param {boolean} [loop=false]  Should the video element be looped?
   * @param {boolean} [mute=false]  Should the video element be muted?
   */
  return class extends Base {
    /**
     * The media element being displayed.
     * @type {HTMLImageElement | HTMLVideoElement | null}
     */
    mediaElement = null;

    /** @inheritdoc */
    static DEFAULT_OPTIONS = {
      src: null,
      loop: false,
      mute: false,
    };

    /**
     * The "ended" video listener (in case of video and loop option).
     * @type {(() => void) | null}
     */
    #videoElementListener = null;

    /**
     * Hook ID for the "globalInterfaceVolumeChanged" hook.
     * @type {number | null}
     */
    #volumeHookId = null;

    /* -------------------------------------------- */
    /*  Getters
    /* -------------------------------------------- */

    /**
     * Whether the application should display video content.
     * @type {boolean}
     */
    get isVideo() {
      return game.modules.shareMedia.utils.isVideo(this.options.src);
    }

    /* -------------------------------------------- */
    /*  Context
    /* -------------------------------------------- */

    /** @inheritdoc */
    async _prepareContext(options) {
      return {
        ...(await super._prepareContext(options)),
        isVideo: this.isVideo,
        media: this.options.src,
        passthrough: true,
        autoplay: true,
      };
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    _prepareHookContext() {
      return {
        ...super._prepareHookContext(),
        src: this.options.src,
        ...(this.isVideo && { loop: this.options.loop, mute: this.options.mute }),
      };
    }

    /* -------------------------------------------- */
    /*  Rendering
    /* -------------------------------------------- */

    /**
     * Handle video volume changes (only if video is not muted).
     * @inheritdoc
     */
    async _onFirstRender(context, options) {
      await super._onFirstRender(context, options);
      if (this.isVideo && !this.options.mute) {
        this.#volumeHookId = Hooks.on(
          "globalInterfaceVolumeChanged",
          (volume) => (this.mediaElement.volume = volume),
        );
      }
    }

    /* -------------------------------------------- */

    /**
     * Store convenient element references and set initial video volume (if not muted).
     * @inheritdoc
     */
    async _onRender(context, options) {
      await super._onRender(context, options);
      this.mediaElement = this.element.querySelector("img, video");

      // Initial volume (only if video is not muted)
      if (this.isVideo && !this.options.mute)
        this.mediaElement.volume = game.settings.get("core", "globalInterfaceVolume");
    }

    /* -------------------------------------------- */

    /**
     * Apply video options.
     * @inheritdoc
     */
    async _postRender(context, options) {
      await super._postRender(context, options);
      if (this.isVideo) {
        this.mediaElement.muted = this.options.mute;
        this.mediaElement.loop = this.options.loop;
        // Auto-close non-looped video
        if (!this.options.loop) {
          this.#videoElementListener = () => this.close({ animate: this.options.window.frame });
          this.mediaElement.addEventListener("ended", this.#videoElementListener);
        }
      }
    }

    /* -------------------------------------------- */

    /**
     * Cleanup references when this application is closed.
     * @inheritdoc
     */
    _onClose(options) {
      super._onClose(options);
      this._resetMediaState();
      this._resetMediaDOM();
    }

    /* -------------------------------------------- */
    /*  Helpers
    /* -------------------------------------------- */

    /**
     * Clear all dependencies to avoid memory leaks.
     */
    _resetMediaState() {
      if (this.#volumeHookId) Hooks.off("globalInterfaceVolumeChanged", this.#volumeHookId);
    }

    /* -------------------------------------------- */

    /**
     * Reset all DOM events, including CSS state.
     */
    _resetMediaDOM() {
      if (this.isVideo && this.#videoElementListener)
        this.mediaElement?.removeEventListener("ended", this.#videoElementListener);
      this.#videoElementListener = null;
      this.mediaElement = null;
    }
  };
}
