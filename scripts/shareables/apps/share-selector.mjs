const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { isSubclass, debounce } = foundry.utils;

/**
 * Application responsible for selecting a share mode with options.
 * @param {Object} options             Options which configure this application.
 * @param {string} options.src         Source URL of the media being displayed.
 * @param {Object} [options.settings]  Optionnal default options for the sharing options.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 */
export default class ShareSelector extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  constructor(options = {}) {
    if (!options.link && (!options.src || typeof options.src !== "string"))
      throw new Error(
        'You may note create a ShareSelector application without or with a malformated "options.src" option.',
      );
    super(options);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "shm-share-selector-{id}",
    tag: "form",
    window: {
      get title() {
        return "share-media.shareables.selector.share.label";
      },
      contentClasses: ["shm"],
    },
    position: {
      width: 450,
      height: "auto",
      top: 100,
    },
    form: {
      handler: ShareSelector.#onSubmit,
    },
    actions: {
      configureMode: ShareSelector.#onConfigureMode,
      configureSetting: ShareSelector.#onConfigureSetting,
    },

    // Share selector specific options
    src: null,
    link: false,
    settings: {},
  };

  /** @override */
  static PARTS = {
    link: { template: "modules/share-media/templates/shareables/share-selector-link.hbs" },
    media: { template: "modules/share-media/templates/partials/media.hbs" },
    form: { template: "modules/share-media/templates/shareables/share-selector-form.hbs" },
  };

  /**
   * Object that holds sharing options configured by this aplication.
   * @type {{
   *   mode: keyof typeof CONFIG.shareMedia.CONST.LAYERS_MODES | null;
   *   optionName: string | null;
   *   optionValue: string | null;
   *   settings: typeof CONFIG.shareMedia.CONST.MEDIA_SETTINGS;
   *   [key: string]: any;
   * }}
   */
  #shareOptions = {
    src: null,
    mode: null,
    optionName: null,
    optionValue: null,
    settings: game.modules.shareMedia.settings.get(
      CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaSettings,
    ),
  };

  /**
   * Media link input reference.
   * @type {HTMLInputElement | null}
   */
  #linkElement = null;

  /**
   * Media link listener.
   * @type {() => void | null}
   */
  #linkListener = null;

  /* -------------------------------------------- */
  /*  Context
  /* -------------------------------------------- */

  /**
   * Assign default options if they exists (only on the first render).
   * Only render media part if link is not "true".
   * @inheritdoc
   */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if (options.isFirstRender) {
      // Render specific view depending on options
      if (this.options.link && !this.options.src) options.parts = ["link"];
      else options.parts = ["media", "form"];

      // Apply settings
      this.#shareOptions.src = this.options.src || null;
      game.modules.shareMedia.utils.applySettingsToMediaOptions(
        this.options.settings.mode,
        this.#shareOptions,
        this.options.settings,
      );
    }

    // Retrieve any new src value
    if (options.src) this.#shareOptions.src = options.src;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    return {
      ...(await super._prepareContext(options)),
      icons: CONFIG.shareMedia.CONST.ICONS,
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, _options) {
    switch (partId) {
      case "media":
        context.src = this.#shareOptions.src;
        context.isVideo = game.modules.shareMedia.utils.isVideo(this.#shareOptions.src);
        if (context.isVideo) context.videoIcon = CONFIG.shareMedia.CONST.ICONS.play;
        if (context.isVideo) context.metadata = true;
        break;
      case "form":
        context.mediaActions = this.#prepareActions();
        context.mediaSettings = this.#prepareSettings();
        break;
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the list of media actions to be rendered.
   * @returns {{
   *   [K in keyof typeof CONFIG.shareMedia.CONST.MEDIA_ACTIONS]: Array<
   *     (typeof CONFIG.shareMedia.CONST.MEDIA_ACTIONS)[K][number] & {
   *       label: string;
   *       description: string;
   *       icon: string;
   *     }
   *   >;
   * }}
   */
  #prepareActions() {
    const actions = CONFIG.shareMedia.CONST.MEDIA_ACTIONS;
    return Object.entries(actions).reduce((acc, [mode, items]) => {
      acc[mode] = items.map((item) => {
        item.label = `${item.i18nKey}.label`;
        item.description = `${item.i18nKey}.description`;
        item.icon = item.i18nKey;
        // Default value from the default options
        item.active =
          item.mode === this.#shareOptions.mode &&
          this.#shareOptions.optionName === item.optionName &&
          this.#shareOptions.optionValue === item.optionValue;
        return item;
      });
      return acc;
    }, {});
  }

  /* -------------------------------------------- */

  /**
   * Prepare the list of media settings to be rendered.
   * @returns {{
   *   [K in keyof typeof CONFIG.shareMedia.CONST.MEDIA_SETTINGS]: {
   *     category: keyof typeof CONFIG.shareMedia.CONST.MEDIA_SETTINGS;
   *     label: string;
   *     isVisible: boolean;
   *     options: {
   *       name: keyof (typeof CONFIG.shareMedia.CONST.MEDIA_SETTINGS)[K];
   *       value: boolean;
   *       icon: string;
   *       label: string;
   *       description: string;
   *     };
   *   };
   * }}
   * @throws {Error} An error in case of a missing validator.
   */
  #prepareSettings() {
    return Object.entries(this.#shareOptions.settings).reduce((acc, [category, options]) => {
      // Validate the visibility of a setting category depending on the media type
      const validator = CONFIG.shareMedia.CONST.MEDIA_SETTINGS_VALIDATORS[category];
      if (!validator) throw new Error(`Missing validator for setting "${category}".`);
      const isVisible =
        validator(this.#shareOptions.src) &&
        (category === this.#shareOptions.mode ||
          !Object.hasOwn(CONFIG.shareMedia.CONST.LAYERS_MODES, category));

      acc[category] = {
        category,
        label: `categories.${category}`,
        isVisible,
      };

      acc[category].options = Object.entries(options).map(([name, value]) => ({
        name,
        value,
        icon: name,
        label: `${name}.label`,
        description: `${name}.description`,
      }));

      return acc;
    }, {});
  }

  /* -------------------------------------------- */
  /*  Rendering
  /* -------------------------------------------- */

  /**
   * Store convenient element references.
   * @inheritdoc
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if (this.options.link) this.#linkElement = this.element.querySelector("#link");
  }

  /* -------------------------------------------- */

  /**
   * Attach link listener.
   * @inheritdoc
   */
  async _postRender(context, options) {
    await super._postRender(context, options);
    if (this.options.link) {
      this.#linkListener = debounce(this.#parseMediaLink.bind(this), 300);
      this.#linkElement.addEventListener("input", this.#linkListener);
    }
  }

  /* -------------------------------------------- */

  /**
   * Clean up references.
   * @inheritdoc
   */
  async _onClose(options) {
    super._onClose(options);
    if (this.#linkListener) this.#linkElement.removeEventListener("input", this.#linkListener);
    this.#linkListener = null;
    this.#linkElement = null;
  }

  /* -------------------------------------------- */
  /*  Action Event Handlers
  /* -------------------------------------------- */

  /**
   * Set the sharing mode.
   * @param {PointerEvent} _event  The triggering event.
   * @param {HTMLElement}  target  The targeted DOM element.
   * @this {ShareSelector}
   */
  static async #onConfigureMode(_event, target) {
    const { mode, optionName, optionValue } = target.dataset ?? {};
    if (!mode || !optionName || !optionValue) return;
    Object.assign(this.#shareOptions, { mode, optionName, optionValue });

    // Render this application again
    await this.render({ parts: ["form"] });
  }

  /* -------------------------------------------- */

  /**
   * Set the settings options.
   * @param {PointerEvent} _event  The triggering event.
   * @param {HTMLElement}  target  The targeted DOM element.
   * @this {ShareSelector}
   */
  static async #onConfigureSetting(_event, target) {
    const { category, setting } = target.dataset ?? {};
    if (!category || !setting) return;
    this.#shareOptions.settings[category][setting] =
      !this.#shareOptions.settings[category][setting];

    // Render this application again
    await this.render({ parts: ["form"] });
  }

  /* -------------------------------------------- */

  /**
   * Handle the submission of this application.
   * Share the media if required configuration is set.
   * @param {SubmitEvent}      _event     The originating form submission or input change event.
   * @param {HTMLFormElement}  _form      The form element that was submitted.
   * @param {FormDataExtended} _formData  Processed data for the submitted form.
   * @returns {Promise<boolean>}
   * @this {ShareSelector}
   */
  static async #onSubmit(_event, _form, _formData) {
    // Minimum required configuration to share a media
    if (
      !this.#shareOptions.mode ||
      !this.#shareOptions.optionName ||
      !this.#shareOptions.optionValue
    )
      return;

    // Get the settings for the selected mode
    const optionsSettings = game.modules.shareMedia.utils.getMediaSettings(
      this.#shareOptions.src,
      this.#shareOptions.mode,
      this.#shareOptions.settings,
    );

    // Build the media options
    const { settings: _settings, ...shareOptions } = this.#shareOptions;
    const options = {
      src: this.#shareOptions.src,
      ...shareOptions,
      ...optionsSettings,
    };

    // Send to manager then close
    const result = await game.modules.shareMedia.shareables.manager.dispatch(options);
    if (result) this.close();
    return result;
  }

  /* -------------------------------------------- */
  /*  Other Event Handlers
  /* -------------------------------------------- */

  /**
   * Handle the typing in the link field.
   * @param {InputEvent} event  The input change event.
   */
  #parseMediaLink(event) {
    // Field value
    const value = event.target.value;

    // Validate the url, returning if not a valid url
    try {
      new URL(value);
    } catch (_error) {
      return;
    }

    // Render this application again with the media link as the src value
    this.render({ parts: ["media", "form"], src: value, force: true });
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured ShareSelector implementation.
   * @type {typeof ShareSelector}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.shareables.apps.ShareSelector;
    if (!isSubclass(Class, ShareSelector)) {
      console.warn("Configured ShareSelector override must be a subclass of ShareSelector.");
      Class = ShareSelector;
    }
    return Class;
  }
}
