const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { isSubclass } = foundry.utils;

/** @typedef {import("../media-sprite.mjs").default} MediaSprite */

/**
 * Application responsible for interacting with a MediaSprite.
 * @extends {ApplicationV2}
 * @mixes HandlebarsApplicationMixin
 */
export default class MediaHUD extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: "shm-media-hud",
    classes: ["placeable-hud"],
    tag: "form",
    window: {
      frame: false,
      positioned: true,
    },
    actions: {
      sortMedia: MediaHUD.#onSortMedia,
      clearMedia: MediaHUD.#onClearMedia,
    },
    position: {},
  };

  /** @override */
  static PARTS = {
    hud: { template: "modules/share-media/templates/canvas/media-hud.hbs", root: true },
  };

  /**
   * Last sprite activation.
   * @type {string | null}
   */
  static lastSprite = null;

  /**
   * Reference to a MediaSprite this HUD is currently bound to.
   * @type {MediaSprite | null}
   */
  #sprite = null;

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Assign the sprite to this instance when rendered.
   * @inheritdoc
   */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    const { sprite } = options;
    if (!sprite) return;
    this.#sprite = sprite;
    this.constructor.lastSprite = this.#sprite.area.uuid;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    return {
      ...(await super._prepareContext(options)),
      icons: CONFIG.shareMedia.CONST.ICONS,
      controlIcons: CONFIG.controlIcons,
    };
  }

  /* -------------------------------------------- */

  /**
   * Update position depending on the sprite position and bounds.
   * @override
   */
  _updatePosition(position) {
    const s = game.canvas.dimensions.uiScale;
    const { x: left, y: top, width, height } = this.#sprite._frame.getLocalBounds();
    Object.assign(position, { left, top, width: width / s, height: height / s });
    position.scale = s;
    return position;
  }

  /* -------------------------------------------- */

  /**
   * Don't animate closing.
   * @inheritdoc
   */
  async _preClose(options) {
    super._preClose(options);
    options.animate = false;
  }

  /* -------------------------------------------- */

  /**
   * Clean up references.
   * @inheritdoc
   */
  async _onClose(options) {
    super._onClose(options);
    this.#sprite = null;
  }

  /* -------------------------------------------- */

  /**
   * Insert the HUD in the "#hud" html container.
   * @param {HTMLElement} element  The element to insert.
   * @protected
   */
  _insertElement(element) {
    const parent = document.getElementById("hud");
    parent.append(element);
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Bind the HUD to a new MediaSprite and display it.
   * @param {MediaSprite} sprite  A MediaSprite instance to which the HUD should be bound.
   * @returns {Promise<void>}
   */
  async bind(sprite) {
    await this.render({ force: true, position: true, sprite });
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle click actions to sort the object backwards or forwards within its layer.
   * @param {PointerEvent}      _event  The triggering event.
   * @param {HTMLButtonElement} target  The targeted DOM element.
   * @returns {Promise<void>}
   * @this {MediaHUD}
   */
  static async #onSortMedia(_event, target) {
    const up = target.dataset.direction === "up";
    await game.canvas["shm-media-layer"].sendToBackOrBringToFront(this.#sprite.area.uuid, up);
  }

  /* -------------------------------------------- */

  /**
   * Handle click actions to clear and delete a media from the canvas.
   * @param {PointerEvent}      _event   The triggering event.
   * @param {HTMLButtonElement} _target  The targeted DOM element.
   * @this {MediaHUD}
   */
  static #onClearMedia(_event, _target) {
    game.canvas["shm-media-layer"].deleteSprite(this.#sprite.area.uuid, { unsetFlag: true });
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured MediaHUD implementation.
   * @type {typeof MediaHUD}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.canvas.apps.MediaHUD;
    if (!isSubclass(Class, MediaHUD)) {
      console.warn("Configured MediaHUD override must be a subclass of MediaHUD.");
      Class = MediaHUD;
    }
    return Class;
  }
}
