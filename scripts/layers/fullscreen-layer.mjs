const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { isSubclass } = foundry.utils;

/**
 * Application responsible for displaying media in fullscreen.
 * @param {Object}  options                      Options which configure this application.
 * @param {string}  options.src                  Source URL of the media being displayed.
 * @param {string}  [options.caption=""]         The media caption to display.
 * @param {boolean} [options.immersive=false]    Should this application be displayed in immersive mode?
 * @param {boolean} [options.controls=false]     Should player controls be displayed?
 * @param {...any}  [options.additionalOptions]  Others additional options (handled by mixins).
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 * @mixes DarknessMixin          Delayed composition @see {@link FullscreenLayer.implementation}
 * @mixes MediaMixin             Delayed composition @see {@link FullscreenLayer.implementation}
 */
export default class FullscreenLayer extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * Only one instance of "FullscreenLayer" is allowed at the same time.
   * @inheritdoc
   */
  constructor(options) {
    super(options);

    // If one instance already exists, close it and reassign
    if (FullscreenLayer._instance?.rendered) FullscreenLayer._instance.close({ animate: false });
    FullscreenLayer._instance = this;
  }

  static {
    // Register queries
    CONFIG.queries["share-media.closeFullscreen"] = FullscreenLayer.close;
  }

  /* -------------------------------------------- */

  /**
   * Is this application folded?
   * @type {boolean}
   */
  folded = false;

  /**
   * The zIndex to apply when "immersive" mode is required.
   * [NOTE] FoundryVTT tooltip is 9999 (--z-index-tooltip).
   * @type {number}
   */
  static IMMERSIVE_ZINDEX = 9998;

  /**
   * Current instance.
   * @type {FullscreenLayer | null}
   */
  static _instance = null;

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    tag: "dialog",
    id: "shm-fullscreen",
    classes: ["shm"],
    window: {
      positioned: false,
      frame: false,
    },
    actions: {
      dismiss: FullscreenLayer.#onDismiss,
      toggleFolded: FullscreenLayer.#toggleFolded,
    },

    // Layer specific options
    caption: "",
    immersive: false,
    controls: false,
  };

  /** @override */
  static PARTS = {
    actions: { template: "modules/share-media/templates/layers/fullscreen-actions.hbs" },
    media: { template: "modules/share-media/templates/layers/[layer]-media.hbs" },
  };

  /* -------------------------------------------- */
  /*  Context
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    return {
      ...(await super._prepareContext(options)),
      caption: this.options.caption,
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, _options) {
    switch (partId) {
      case "actions":
        context.icons = CONFIG.shareMedia.CONST.ICONS;
        context.isGM = game.user.isGM;
        context.controls = game.user.isGM || this.options.controls;
        context.folded = this.folded;
        break;
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the context of any hook being fired.
   * @returns {Object}
   */
  _prepareHookContext() {
    return {
      caption: this.options.caption,
      immersive: this.options.immersive,
      controls: this.options.controls,
    };
  }

  /* -------------------------------------------- */
  /*  Action Event Handlers
  /* -------------------------------------------- */

  /**
   * Handle the closing of this application.
   * @param {PointerEvent} _event   The triggering event.
   * @param {HTMLElement}  _target  The targeted DOM element.
   * @this {FullscreenLayer}
   */
  static #onDismiss(_event, _target) {
    if (!game.user.isGM) return;

    // Notify active users of the flush
    const users = game.users.reduce((acc, user) => {
      if (user.active) acc.push(user.id);
      return acc;
    }, []);
    for (const userId of users) {
      game.users.get(userId).query("share-media.closeFullscreen");
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle the folding of this application.
   * @param {PointerEvent} _event   The triggering event.
   * @param {HTMLElement}  _target  The targeted DOM element.
   * @returns {Promise<void>}
   * @this {FullscreenLayer}
   */
  static async #toggleFolded(_event, _target) {
    this.folded = !this.folded;
    // Pause/play video media
    if (this.isVideo) this.folded ? this.mediaElement.pause() : this.mediaElement.play();
    this.element.classList.toggle("folded", this.folded);
    await this.render({ parts: ["actions"] });
  }

  /* -------------------------------------------- */
  /*  Other Public Methods
  /* -------------------------------------------- */

  /**
   * Attempt to close the currently opened instance.
   * @returns {Promise<void>}
   */
  static async close() {
    if (!FullscreenLayer._instance?.rendered) return;
    await FullscreenLayer._instance.close({ animate: false });
  }

  /* -------------------------------------------- */
  /*  Rendering
  /* -------------------------------------------- */

  /**
   * Handle immersive mode.
   * @inheritdoc
   */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    if (this.options.immersive)
      this.element.style.zIndex = String(this.constructor.IMMERSIVE_ZINDEX);
  }

  /* -------------------------------------------- */

  /**
   * Fire hooks.
   * @inheritdoc
   */
  async _postRender(context, options) {
    await super._postRender(context, options);
    Hooks.callAll(
      "shareMedia.renderFullscreen",
      this,
      this.mediaElement,
      this._prepareHookContext(),
    );
  }

  /* -------------------------------------------- */

  /**
   * Cleanup references when this application is closed.
   * @inheritdoc
   */
  _onClose(options) {
    super._onClose(options);
    if (FullscreenLayer._instance === this) FullscreenLayer._instance = null;
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured FullscreenLayer implementation with mixins applied.
   * @type {typeof FullscreenLayer}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.layers.FullscreenLayer;
    if (!isSubclass(Class, FullscreenLayer)) {
      console.warn("Configured FullscreenLayer override must be a subclass of FullscreenLayer.");
      Class = FullscreenLayer;
    }

    // Apply required mixins
    const { MediaMixin, DarknessMixin } = CONFIG.shareMedia.layers.mixins;
    return MediaMixin(DarknessMixin(Class));
  }
}
