const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { isSubclass, getProperty, mergeObject } = foundry.utils;

/**
 * Application responsible for interacting with shareable media.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 */
export default class MediaOverlay extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  constructor(options = {}) {
    // Only Gamemasters are allowed to show the media overlay
    if (!game.users.current.isGM) return {};

    if (game.modules.shareMedia.ui.overlay)
      throw new Error("You may not re-construct the singleton MediaOverlay.");

    super(options);
  }

  /* -------------------------------------------- */

  /**
   * Reference to the target HTML element.
   * @type {HTMLElement | null}
   */
  targetElement = null;

  /**
   * Reference to the target application linked to the target HTML element.
   * @type {ApplicationV1 | ApplicationV2 | null}
   */
  targetApplication = null;

  /**
   * Reference to the target HTML context.
   * @type {(typeof CONFIG.shareMedia.CONST.MEDIA_HOOKS)[number]["htmlContext"] | null}
   */
  htmlContext = null;

  /**
   * An amount of margin which is used to offset the overlay from its anchored element.
   * @type {number}
   */
  static OVERLAY_MARGIN_PX = 5;

  /**
   * The minimum space for the overlay to be displayed.
   * @type {number}
   */
  static MINIMUM_AVAILABLE_SPACE = 250;

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    tag: "aside",
    id: "shm-overlay",
    classes: ["shm"],
    window: {
      positioned: false,
      frame: false,
    },
    actions: {
      configureSetting: MediaOverlay.#onConfigureSetting,
      share: MediaOverlay.#onShare,
    },
  };

  /** @override */
  static PARTS = {
    overlay: { template: "modules/share-media/templates/ui/media-overlay.hbs", root: true },
  };

  /**
   * Is currently active.
   * @type {boolean}
   */
  #active = false;

  /**
   * Computed styles of "parentElement" and "targetElement".
   * @type {{
   *   parentElement: HTMLElement;
   *   parentElementStyles: CSSStyleDeclaration;
   *   parentElementRect: DOMRect;
   *   targetElementStyles: CSSStyleDeclaration;
   *   targetElementRect: DOMRect;
   *   targetElementPaddingTop: number;
   *   targetElementPaddingLeft: number;
   *   targetElementPaddingRight: number;
   * } | null}
   */
  #stylesAndRectsCache = null;

  /**
   * Current animation end listener to be able to remove it.
   * @type {(() => void) | null}
   */
  #onHideListener = null;

  /**
   * Flag key stored at the targetApplication level.
   * @type {string}
   */
  #settingsKey = "settings";

  /* -------------------------------------------- */
  /*  Getters
  /* -------------------------------------------- */

  /**
   * Check if the application can be rendered safely, meaning "this.element" exists and is connected to the DOM.
   * @type {boolean}
   */
  get isNotRenderable() {
    return this.rendered && this.element && !this.element.isConnected;
  }

  /* -------------------------------------------- */

  /**
   * Check if the application is alive, meaning all required elements are set.
   * @type {boolean}
   */
  get isAlive() {
    return this.targetElement && this.targetApplication && this.element && this.element.isConnected;
  }

  /* -------------------------------------------- */

  /**
   * Get the source URL of "this.targetElement"
   * @type {string | null}
   */
  get targetElementSource() {
    if (!this.targetElement) return null;
    return game.modules.shareMedia.utils.getMediaSource(this.targetElement);
  }

  /* -------------------------------------------- */

  /**
   * Get the escaped source URL of "this.targetElement"
   * @type {string | null}
   */
  get targetElementEscapedSource() {
    if (!this.targetElement) return null;
    return game.modules.shareMedia.utils.escapeSource(this.targetElementSource);
  }

  /* -------------------------------------------- */

  /**
   * Get the settings for the "this.targetElement", retrieved from the "this.targetApplication" flags.
   * @type {{
   *   key: string;
   *   settings: Partial<typeof CONFIG.shareMedia.CONST.MEDIA_SETTINGS>;
   * }}
   */
  get targetElementSettings() {
    if (!this.targetElement || !this.targetApplication) return { key: "", settings: {} };
    const flag = this.targetApplication.document.getFlag("share-media", this.#settingsKey) ?? {};
    const key = this.targetElementEscapedSource;
    const storedSettings = getProperty(flag, key) ?? {};

    // Merge with default settings
    const mediaSettings = game.modules.shareMedia.settings.get(
      CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaSettings,
    );
    const settings = mergeObject(mediaSettings, storedSettings, { inplace: false });

    return { key, settings };
  }

  /* -------------------------------------------- */
  /*  Overlay actions
  /* -------------------------------------------- */

  /**
   * Activate the overlay on an HTML element, displaying interactions based on the Element type.
   * @param {HTMLElement} element
   * The element on which the overlay is rendered.
   * @param {ApplicationV1 | ApplicationV2} application
   * The application linked to the element.
   * @param {(typeof CONFIG.shareMedia.CONST.MEDIA_HOOKS)[number]["htmlContext"]} context
   * An HTML context of valid containers for the element.
   * @returns {Promise<this>}
   */
  async activate(element, application, context) {
    this.targetElement = element;
    this.targetApplication = application;
    this.htmlContext = context;

    // Ensure that a previously rendered application can be rerendered
    // [NOTE] this is not an infinite loop because "this.close()"
    // will ensure that "this.isNotRenderable" returns "true"
    if (this.isNotRenderable) {
      await this.close({ animate: false });
      return await this.activate(element, application, context);
    }

    // Rerender the application
    await this.render(true);

    // Show the overlay with an animation
    await this.#show();

    Hooks.callAll("shareMedia.activateOverlay", this, element, application, context);
    return this;
  }

  /* -------------------------------------------- */

  /**
   * Deactivate the overlay, nullifying all stored data.
   * Also attempt to move the element to the body so it doesn't have to be reconstructed again.
   * @returns {Promise<this>}
   */
  async deactivate() {
    // If the current state of the application doesn't align
    if (!this.isAlive) {
      return await this.close({ animate: false });
    }

    // Hide the overlay with an animation
    await this.#hide();

    Hooks.callAll("shareMedia.deactivateOverlay", this);
    return this;
  }

  /* -------------------------------------------- */
  /*  Show/hide flow
  /* -------------------------------------------- */

  /**
   * Show the overlay with an animation.
   * This consists of adding an "active" class displaying the element ("display: block") then add a class handling the
   * animation ("opacity: 1").
   * @returns {Promise<void>}
   */
  async #show() {
    if (this.#active || !this.isAlive) return;

    // clear any hiding process
    this.#clearHidingListener();
    this.#active = true;

    // Add css classes one step at the time
    this.element.classList.add("active");
    await game.modules.shareMedia.utils.nextAnimationFrames();
    this.element.classList.add("show");
  }

  /* -------------------------------------------- */

  /**
   * Hide the overlay with an animation.
   * This consists of removing the animation class "show" then add an event listener to remove the class "active".
   * That event listener can be stopped if needed to show again before the animation is complete.
   * @returns {Promise<void>}
   */
  async #hide() {
    if (!this.#active || !this.isAlive) return;
    this.#active = false;

    // Reset state, we don't need it anymore
    // and "transitionend" might never finish
    this._resetState();

    // Initiate animation
    this.element.classList.remove("show");

    // Attach an event listener that will remove the "active" css class
    this.#onHideListener = this.#createOnHideListener();
    this.element.addEventListener("transitionend", this.#onHideListener, { once: true });
  }

  /* -------------------------------------------- */

  /**
   * Create a function that will hide and move "this.element" to the body if able.
   * @returns {() => void}
   */
  #createOnHideListener() {
    return () => {
      if (!this.#active && this.element) {
        // Remove the "active class"
        this.element.classList.remove("active");

        // Move the element to the body
        document.body.append(this.element);
      }

      // Reset state and clear references
      this._resetAll();
    };
  }

  /* -------------------------------------------- */

  /**
   * Clear any pending animation end listener.
   */
  #clearHidingListener() {
    if (this.#onHideListener) {
      this.element?.removeEventListener("transitionend", this.#onHideListener);
      this.#onHideListener = null;
    }
  }

  /* -------------------------------------------- */
  /*  Context
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    // Get elements styles and positions
    const { parentElementRect, targetElementRect, targetElementPaddingLeft } =
      this.#getStylesAndRects();

    // calculate the available space to display the overlay
    // This tell us if the overlay should be displayed from left to right or right to left
    const availableSpace =
      parentElementRect.right - (targetElementRect.left + targetElementPaddingLeft);

    return {
      ...(await super._prepareContext(options)),
      icons: CONFIG.shareMedia.CONST.ICONS,
      rightToLeft: availableSpace <= this.constructor.MINIMUM_AVAILABLE_SPACE,
      mediaActions: this.#prepareActions(),
      mediaSettings: this.#prepareSettings(),
    };
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
    const settings = this.targetElementSettings.settings;
    return Object.entries(settings).reduce((acc, [category, options]) => {
      // Validate the visibility of a setting category depending on the media type
      const validator = CONFIG.shareMedia.CONST.MEDIA_SETTINGS_VALIDATORS[category];
      if (!validator) throw new Error(`Missing validator for setting "${category}".`);
      const isVisible = validator(this.targetElementSource);

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
  /*  Action Event Handlers
  /* -------------------------------------------- */

  /**
   * Handle the settings of the media.
   * These are stored at the application document level (flags).
   * @param {PointerEvent} _event  The triggering event.
   * @param {HTMLElement}  target  The targeted DOM element.clau.
   * @returns {Promise<void>}
   * @this {MediaOverlay}
   */
  static async #onConfigureSetting(_event, target) {
    if (!this.targetElement || !this.targetApplication) return;
    const dataset = target.dataset;
    const { key, settings } = this.targetElementSettings;
    const setting = getProperty(settings, `${dataset.category}.${dataset.setting}`) ?? false;

    // [NOTE] Not using "setFlag" as it will force a "render" of "this.targetApplication"
    const updateKey = `flags.share-media.${this.#settingsKey}.${key}.${dataset.category}.${dataset.setting}`;
    await this.targetApplication.document.update({ [updateKey]: !setting }, { render: false });

    // Manually modifying the DOM
    target.classList.toggle("active", !setting);
  }

  /* -------------------------------------------- */
  /**
   * Handle the sharing of the media.
   * @param {PointerEvent} _event  The triggering event.
   * @param {HTMLElement}  target  The targeted dom element.
   * @returns {Promise<boolean>}
   * @this {MediaOverlay}
   */
  static async #onShare(_event, target) {
    // Prepare data
    const settings = this.targetElementSettings.settings;
    const mode = target.dataset.mode;

    // Get the settings for the selected mode
    const optionsSettings = game.modules.shareMedia.utils.getMediaSettings(
      this.targetElementSource,
      mode,
      settings,
    );

    // Build the media options
    const options = {
      src: this.targetElementSource,
      mode,
      optionName: target.dataset.optionName,
      optionValue: target.dataset.optionValue,
      ...optionsSettings,
    };

    // Send to manager
    await game.modules.shareMedia.shareables.manager.dispatch(options);
  }

  /* -------------------------------------------- */
  /*  Rendering
  /* -------------------------------------------- */

  /**
   * Render only if "this.targetElement" and "this.targetApplication" exists and their respective elements are in the DOM.
   * @inheritdoc
   */
  _canRender(options) {
    if (!this.targetApplication || !this.targetElement) {
      this._resetAll();
      return false;
    }

    const isV2 = this.targetApplication instanceof ApplicationV2;
    const applicationElement = isV2
      ? this.targetApplication.element
      : this.targetApplication._element[0];

    if (!applicationElement?.isConnected || !this.targetElement?.isConnected) {
      this._resetAll();
      return false;
    }

    return super._canRender(options);
  }

  /* -------------------------------------------- */

  /**
   * Append "this.element" in the parent container of "this.targetElement" and position the overlay on top of it.
   * @inheritdoc
   */
  async _onRender(context, options) {
    super._onRender(context, options);

    // Get elements styles and positions
    const {
      parentElement,
      parentElementStyles,
      parentElementRect,
      targetElementRect,
      targetElementPaddingTop,
      targetElementPaddingLeft,
      targetElementPaddingRight,
    } = this.#getStylesAndRects();

    // Add the application to the detected context or parent element
    // Required so this maintains the same z-index and position is maintained during scroll
    if (!parentElement) return this._resetAll();
    parentElement.append(this.element);

    // If the parent position is "static" (HTML default), then set it to relative
    // [NOTE] This has the potential to break the layout, but doubt it will
    // [TODO] Remove this with V16: only V1 templates seem to have this issue
    if (parentElementStyles.position === "static") {
      parentElement.style.position = "relative";
      const editButton = parentElement.parentElement.querySelector(":scope > .editor-edit");
      if (editButton) editButton.style.zIndex = "1";
    }

    // Calculate position of the overlay relative to the targetElement
    let top, horizontalProperty, horizontalPosition;

    top =
      targetElementRect.top -
      parentElementRect.top +
      targetElementPaddingTop +
      parentElement.scrollTop;

    if (context.rightToLeft) {
      horizontalProperty = "right";
      horizontalPosition =
        parentElementRect.right -
        targetElementRect.right +
        targetElementPaddingRight +
        parentElement.scrollLeft;
    } else {
      horizontalProperty = "left";
      horizontalPosition =
        targetElementRect.left -
        parentElementRect.left +
        targetElementPaddingLeft +
        parentElement.scrollLeft;
    }

    // Prevent negative positioning (out of frame) because of special targetElement styles
    top = top < 0 ? 0 : top;
    horizontalPosition = horizontalPosition < 0 ? 0 : horizontalPosition;

    // Add overlay offset
    top += this.constructor.OVERLAY_MARGIN_PX;
    horizontalPosition += this.constructor.OVERLAY_MARGIN_PX;

    // Set the application position
    // "important" is required so nothing can override this
    this.element.style.setProperty("top", `${top}px`, "important");
    this.element.style.setProperty(horizontalProperty, `${horizontalPosition}px`, "important");
    this.element.style.removeProperty(horizontalProperty === "left" ? "right" : "left");
  }

  /* -------------------------------------------- */

  /**
   * Clear all state and references when this application closes.
   * @inheritdoc
   */
  _onClose(options) {
    super._onClose(options);

    // Reset state and clear references
    this._resetAll();
  }

  /* -------------------------------------------- */
  /*  Helpers
  /* -------------------------------------------- */

  /**
   * Clear all dependencies and state.
   */
  _resetAll() {
    this._resetState();
    this._resetDOM();
  }

  /* -------------------------------------------- */

  /**
   * Clear all dependencies to avoid memory leaks.
   */
  _resetState() {
    this.targetElement = null;
    this.targetApplication = null;
    this.htmlContext = null;
    this.#stylesAndRectsCache = null;
    this.#active = false;
  }

  /* -------------------------------------------- */

  /**
   * Reset all DOM events, including CSS state.
   */
  _resetDOM() {
    this.#clearHidingListener();
    if (this.element) this.element.classList.value = "shm";
  }

  /* -------------------------------------------- */

  /**
   * Get computed styles and bounding rectangles for parent and target elements.
   * @returns {ReturnType<MediaOverlay["#getStylesAndRects"]>}
   */
  #getStylesAndRects() {
    // If already in cache return it
    if (this.#stylesAndRectsCache) {
      return this.#stylesAndRectsCache;
    }

    // Get the parent
    const parentElement =
      this.targetElement.closest(this.htmlContext.join()) ?? this.targetElement.parentElement;

    // Get the data
    const parentElementStyles = getComputedStyle(parentElement);
    const parentElementRect = parentElement.getBoundingClientRect();
    const targetElementStyles = getComputedStyle(this.targetElement);
    const targetElementRect = this.targetElement.getBoundingClientRect();
    const targetElementPaddingTop = parseInt(targetElementStyles.paddingTop, 10) || 0;
    const targetElementPaddingLeft = parseInt(targetElementStyles.paddingLeft, 10) || 0;
    const targetElementPaddingRight = parseInt(targetElementStyles.paddingRight, 10) || 0;

    // Cache it
    this.#stylesAndRectsCache = {
      parentElement,
      parentElementStyles,
      parentElementRect,
      targetElementStyles,
      targetElementRect,
      targetElementPaddingTop,
      targetElementPaddingLeft,
      targetElementPaddingRight,
    };

    // Return the newly calculated values
    return this.#stylesAndRectsCache;
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured MediaOverlay implementation.
   * @type {typeof MediaOverlay}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.ui.MediaOverlay;
    if (!isSubclass(Class, MediaOverlay)) {
      console.warn("Configured MediaOverlay override must be a subclass of MediaOverlay.");
      Class = MediaOverlay;
    }
    return Class;
  }
}
