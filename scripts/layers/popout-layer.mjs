const { ImagePopout } = foundry.applications.apps;
const { isSubclass } = foundry.utils;

/**
 * Application responsible for displaying media in an enhanced popout window.
 * @param {Object} options                      Options which configure this application.
 * @param {string} options.src                  Source URL of the media being displayed.
 * @param {string} [options.caption=""]         Caption to display underneath the media.
 * @param {...any} [options.additionalOptions]  Others additional options (handled by mixins).
 * @extends ImagePopout
 * @mixes DarknessMixin  Delayed composition {@link PopoutLayer.implementation}
 * @mixes MediaMixin     Delayed composition {@link PopoutLayer.implementation}
 */
export default class PopoutLayer extends ImagePopout {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "shm-popout-{id}",
    window: {
      contentClasses: ["shm"],
    },
  };

  /** @override */
  static PARTS = { media: { template: "modules/share-media/templates/layers/[layer]-media.hbs" } };

  /* -------------------------------------------- */
  /*  Context
  /* -------------------------------------------- */

  /**
   * Prepare the context of any hook being fired.
   * @returns {Object}
   */
  _prepareHookContext() {
    return {
      caption: this.options.caption,
    };
  }

  /* -------------------------------------------- */
  /*  Rendering
  /* -------------------------------------------- */

  /**
   * Get rid of the default header buttons.
   * @override
   */
  _getHeaderControls() {
    return [];
  }

  /* -------------------------------------------- */

  /**
   * Fix position and fire hooks.
   * @inheritdoc
   */
  async _postRender(context, options) {
    await super._postRender(context, options);
    // [TODO] Remove with future FoundryVTT release
    // Fix the default window height not being adequate for the rendered media
    this.setPosition({
      height:
        this.position.height +
        this.getVerticalSize(this.element.querySelector(".window-header")) +
        this.getVerticalSize(this.element.querySelector(".window-content"), { height: false }) +
        this.getVerticalSize(this.element.querySelector("figure"), { height: false }) +
        this.getVerticalSize(this.element.querySelector("figcaption")),
    });

    Hooks.callAll("shareMedia.renderPopout", this, this.mediaElement, this._prepareHookContext());
  }

  /* -------------------------------------------- */
  /*  Other Public Methods
  /* -------------------------------------------- */

  /**
   * Pause video on minimize.
   * @inheritdoc
   */
  async minimize() {
    await super.minimize();
    if (this.isVideo) this.mediaElement.pause();
  }

  /* -------------------------------------------- */

  /**
   * Play video on maximize.
   * @inheritdoc
   */
  async maximize() {
    await super.maximize();
    if (this.isVideo) this.mediaElement.play();
  }

  /* -------------------------------------------- */
  /*  Helpers
  /* -------------------------------------------- */

  /**
   * Calculate vertical size of an element based on specified CSS properties.
   * @param {HTMLElement} element                DOM element to measure.
   * @param {Object}      options                Configuration object with all properties true by default.
   * @param {boolean}     options.height         Include element height (offsetHeight)
   * @param {boolean}     options.paddingTop     Include padding-top.
   * @param {boolean}     options.paddingBottom  Include padding-bottom.
   * @param {boolean}     options.marginTop      Include margin-top.
   * @param {boolean}     options.marginBottom   Include margin-bottom.
   * @param {boolean}     options.borderTop      Include border-top-width.
   * @param {boolean}     options.borderBottom   Include border-bottom-width.
   * @returns {number}
   */
  getVerticalSize(
    element,
    {
      height = true,
      paddingTop = true,
      paddingBottom = true,
      marginTop = true,
      marginBottom = true,
      borderTop = true,
      borderBottom = true,
    } = {},
  ) {
    if (!element) return 0;

    // Get all options
    const options = {
      height,
      paddingTop,
      paddingBottom,
      marginTop,
      marginBottom,
      borderTop,
      borderBottom,
    };

    // Parse styles
    const toNum = (value) => parseFloat(value) || 0;
    const style = getComputedStyle(element);

    // Calculate height
    return Object.entries(options)
      .filter(([_, include]) => include)
      .reduce((total, [prop]) => {
        if (prop === "height") return total + element.offsetHeight;
        if (prop.startsWith("border")) return total + toNum(style[prop + "Width"]);
        return total + toNum(style[prop]);
      }, 0);
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured PopoutLayer implementation with mixins applied.
   * @type {typeof PopoutLayer}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.layers.PopoutLayer;
    if (!isSubclass(Class, PopoutLayer)) {
      console.warn("Configured PopoutLayer override must be a subclass of PopoutLayer.");
      Class = PopoutLayer;
    }

    // Apply required mixins
    const { MediaMixin, DarknessMixin } = CONFIG.shareMedia.layers.mixins;
    return MediaMixin(DarknessMixin(Class));
  }
}
