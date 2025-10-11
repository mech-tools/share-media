const { PrimarySpriteMesh } = foundry.canvas.primary;
const { MouseInteractionManager } = foundry.canvas.interaction;
const { loadTexture } = foundry.canvas;
const { isSubclass } = foundry.utils;

/** @typedef {import("./apps/media-hud.mjs").default} MediaHUD */

/**
 * Base class for generating sprite meshes, masks, frames and borders from media sources.
 * @param {string}                        src                             The source URL of the media to display.
 * @param {RegionDocument | TileDocument} area                            The area bound to this sprite.
 * @param {Object}                        [options]                       Additional optional arguments.
 * @param {string}                        [options.optionName="display"]  The optional display mode.
 * @param {string}                        [options.optionValue="fit"]     The optional display mode value.
 * @param {string}                        [options.loop=false]            Optional loop argument for videos.
 * @param {string}                        [options.mute=false]            Optional mute argument for videos.
 * @throws {Error} If the two basic arguments are passed to this constructor.
 */
export default class MediaSprite {
  constructor(src, area, options) {
    // Check basic arguments
    if (!src || !area)
      throw new Error(
        'You must pass a valid "src" and "area document uuid" to instantiate the class "SpriteMesh".',
      );

    // Assign mandatory arguments
    this.src = src;
    this.area = area;

    // Assign optional arguments
    Object.assign(this.options, options);
  }

  /* -------------------------------------------- */

  /**
   * The source URL of this sprite.
   * @type {string | null}
   */
  src = null;

  /**
   * The area document bound to this sprite.
   * @type {Document | null}
   */
  area = null;

  /**
   * Options which change the way this media is rendered.
   * @type {{ display: string; loop: boolean; mute: boolean }}
   */
  options = {
    display: CONFIG.shareMedia.CONST.LAYERS_OPTIONS.displayFit.value,
    loop: false,
    mute: false,
  };

  /**
   * Sort order of sprites on the "primary" canvas group.
   * @enum {number}
   */
  static SORT_LAYER = 250;

  /**
   * Reference counter for texture usage.
   * @type {Map<string, number>}
   */
  static #textureRefCount = new Map();

  /**
   * Reference to the currently hovered sprite.
   * @type {MediaSprite | null}
   */
  static hovered = null;

  /**
   * Reference to the currently controlled sprite.
   * @type {MediaSprite | null}
   */
  static controlled = null;

  /**
   * Last sprite controlled.
   * @type {string | null}
   */
  static lastControlled = null;

  /**
   * Reference to the media HUD.
   * @type {MediaHUD | null}
   */
  static hud = null;

  /**
   * The primary sprite mesh created for this sprite.
   * @type {PrimarySpriteMesh | null}
   */
  _mesh = null;

  /**
   * Mesh mask graphics.
   * @type {PIXI.Graphics | null}
   * @protected
   */
  _mask = null;

  /**
   * The empty transparent frame of this sprite.
   * @type {PIXI.Graphics | null}
   * @protected
   */
  _frame = null;

  /**
   * The border of this sprite.
   * @type {PIXI.Graphics}
   * @protected
   */
  _border = null;

  /**
   * Video ended event handler function.
   * @type {() => void | null}
   */
  #videoEndedHandler = null;

  /**
   * A mouse interaction manager instance which handles mouse workflows related to this object.
   * @type {MouseInteractionManager | null}
   */
  #mouseInteractionManager = null;

  /* -------------------------------------------- */
  /*  Getters & Setters
  /* -------------------------------------------- */

  /**
   * Get the fit mode in a compatible PrimarySpriteMesh value.
   * @type {'contain' | 'cover'}
   */
  get fitMode() {
    if (!this.options.optionName) return "contain";
    return this.options.optionValue === CONFIG.shareMedia.CONST.LAYERS_OPTIONS.displayFit.value
      ? "contain"
      : "cover";
  }

  /* -------------------------------------------- */

  /**
   * Get the currently hovered sprite.
   * @type {MediaSprite | null}
   */
  get hovered() {
    return MediaSprite.hovered;
  }

  /* -------------------------------------------- */

  set hovered(value) {
    if (!(value instanceof this.constructor) && value !== null)
      throw new Error('Wrong type passed to hovered "MediaSprite"');
    MediaSprite.hovered = value;
  }

  /* -------------------------------------------- */

  /**
   * Get the currently controlled sprite.
   * @type {MediaSprite | null}
   */
  get controlled() {
    return MediaSprite.controlled;
  }
  /* -------------------------------------------- */

  /**
   * Set the currently controlled sprite.
   * @param {MediaSprite | null} value  The new value.
   * @throws {Error} If the value is not of MediaSprite or null.
   */
  set controlled(value) {
    if (!(value instanceof this.constructor) && value !== null)
      throw new Error('Wrong type passed to controlled "MediaSprite"');
    MediaSprite.controlled = value;
  }

  /* -------------------------------------------- */

  /**
   * Whether the current sprite instance is controlled.
   * @type {boolean}
   */
  get isControlled() {
    return MediaSprite.controlled === this;
  }

  /* -------------------------------------------- */

  /**
   * Get the media HUD application.
   * @type {MediaHUD}
   */
  get hud() {
    // Initialize the HUD if not existent
    if (!MediaSprite.hud) MediaSprite.hud = new game.modules.shareMedia.canvas.apps.hud();
    return MediaSprite.hud;
  }

  /* -------------------------------------------- */
  /*  Initialization
  /* -------------------------------------------- */

  /**
   * Initialize the sprite by creating the mesh, the mask and the frame.
   * @returns {Promise<this>}
   * @throws {Error} If the texture couldn't be loaded.
   */
  async initialize() {
    // Create mesh, mask, border and interaction manager
    await this.#createMesh();
    this.#createMask();
    this.#createFrame();
    this.#createBorder();
    this.#createInteractionManager();

    // Return the instance
    return this;
  }

  /* -------------------------------------------- */

  /**
   * Create the mesh to be added to the "primary" canvas group.
   */
  async #createMesh() {
    // Load the texture with a module cache key
    this.src = `${this.src}?share-media-texture`;
    const texture = await loadTexture(this.src);
    if (!texture) throw new Error(`Failed to load texture from ${this.src}`);
    MediaSprite.#incrementTextureRef(this.src);

    // Create the mesh
    this._mesh = new PrimarySpriteMesh(texture);

    // Fill the mesh (delegated to subclasses)
    this._createMesh();

    // Assign "primary" canvas sort and area sort
    this._mesh.sortLayer = MediaSprite.SORT_LAYER;
    this._mesh.sort =
      this.area.getFlag("share-media", game.canvas["shm-media-layer"].constructor.SORT_FLAG_KEY) ??
      1;
  }

  /* -------------------------------------------- */

  /**
   * Handle mesh fill and position. To be implemented by subclasses.
   */
  _createMesh() {
    throw new Error("_createMesh must be implemented by subclass");
  }

  /* -------------------------------------------- */

  /**
   * Create the mask added to the mesh.
   */
  #createMask() {
    // Create an empty mask
    this._mask = new PIXI.Graphics();

    // Fill the mask (delegated to subclasses)
    this._createMask();

    // Add the mask to the mesh
    this._mesh.mask = this._mask;
  }

  /* -------------------------------------------- */

  /**
   * Fill and position the mask graphics. Must be implemented by subclasses.
   */
  _createMask() {
    throw new Error("_createMask must be implemented by subclass");
  }

  /* -------------------------------------------- */

  /**
   * Create a transparent frame to be added to the "media" layer.
   * [INFO] This is a simple transparent copy of the mask.
   */
  #createFrame() {
    // Simply clone the mask and make it transparent
    this._frame = this._mask.clone();
    this._frame.alpha = 0;
    this._frame.cursor = "pointer";
  }

  /* -------------------------------------------- */

  /**
   * Create a border around "this._frame"
   */
  #createBorder() {
    // Create an empty border
    this._border = new PIXI.Graphics();
    this._border.eventMode = "none";
    this._border.visible = false;

    // Fill the border (delegated to subclasses)
    this._createBorder();
  }

  /* -------------------------------------------- */

  /**
   * Fill and position the border shape. Must be implemented by subclasses.
   */
  _createBorder() {
    throw new Error("_createBorder must be implemented by subclass");
  }

  /* -------------------------------------------- */

  /**
   * Create a standard MouseInteractionManager for "this.#frame".
   */
  #createInteractionManager() {
    // Handle permissions to perform various actions
    const permissions = {
      hoverIn: () => game.users.current.isGM,
      hoverOut: () => game.users.current.isGM,
      clickLeft: () => game.users.current.isGM,
      clickRight: () => game.users.current.isGM,
      dragStart: () => false,
      dragLeftStart: () => false,
      dragRightStart: () => false,
    };

    // Define callback functions for each workflow step
    const callbacks = {
      hoverIn: this._onHoverIn.bind(this),
      hoverOut: this._onHoverOut.bind(this),
      clickLeft: this._onClickLeft.bind(this),
      clickRight: this._onClickRight.bind(this),
    };

    // Create the interaction manager
    this.#mouseInteractionManager = new MouseInteractionManager(
      this._frame,
      game.canvas.stage,
      permissions,
      callbacks,
    );

    // Activate the interaction manager
    this.#mouseInteractionManager.activate();
  }

  /* -------------------------------------------- */
  /*  Interactivity
  /* -------------------------------------------- */

  /**
   * Actions that should be taken when a mouseover event occurs.
   * @param {PIXI.FederatedEvent} event  The triggering canvas interaction event.
   */
  _onHoverIn(event) {
    // Returning if hovering is happening while pressing left or right button
    if (event.buttons & 0x03) return;
    // Store the currently hovered element
    this.hovered = this;
    // If already controlled do not go further
    if (this.isControlled) return;

    // Show the border
    this._border.visible = true;
    this._border.tint = CONFIG.Canvas.dispositionColors.FRIENDLY;
  }

  /* -------------------------------------------- */

  /**
   * Actions that should be taken when a mouseout event occurs.
   * @param {PIXI.FederatedEvent} _event  The triggering canvas interaction event.
   */
  _onHoverOut(_event) {
    // Remove hovered element
    this.hovered = null;
    // If already controlled do not go further
    if (this.isControlled) return;

    // Hide the border
    this._border.visible = false;
  }

  /* -------------------------------------------- */

  /**
   * Actions that should be taken when a single left-click event occurs.
   * @param {PIXI.FederatedEvent} _event  The triggering canvas interaction event.
   */
  _onClickLeft(_event) {
    this.control();
  }

  /* -------------------------------------------- */

  /**
   * Actions that should be taken when a single right-click event occurs.
   * @param {PIXI.FederatedEvent} _event  The triggering canvas interaction event.
   */
  _onClickRight(_event) {
    this.control();
    this.hud.bind(this);
  }

  /* -------------------------------------------- */

  /**
   * Assume control of the MediaSprite, releasing any previous.
   */
  control() {
    if (this.isControlled) return;
    if (!this.isControlled) this.controlled?.release();
    this.controlled = this;
    MediaSprite.lastControlled = this.area.uuid;
    this._border.visible = true;
    this._border.tint = CONFIG.Canvas.dispositionColors.CONTROLLED;
  }

  /* -------------------------------------------- */

  /**
   * Release the current sprite.
   */
  release() {
    if (!this.isControlled) return;
    this.controlled = null;
    this.hud.close();
    this._border.visible = false;
  }

  /* -------------------------------------------- */
  /*  Sprite Lifecycle
  /* -------------------------------------------- */

  /**
   * Add the sprite to the current canvas.
   */
  addToCanvas() {
    if (!game.canvas) return;

    // Add the mask to the "hidden" canvas group
    game.canvas.masks.addChild(this._mask);
    // Add the sprite to the "primary" canvas group
    game.canvas.primary.addChild(this._mesh);
    // Add the frame to the "media" layer
    game.canvas["shm-media-layer"].objects.addChild(this._frame);
    // Add the border to the "media" layer
    game.canvas["shm-media-layer"].objects.addChild(this._border);

    // Manage video playback
    const video = game.video.getVideoSource(this._mesh);
    if (video) {
      // Add this video to the primary if video shouldn't be muted
      // [INFO] Foundry handles volume for us
      if (!this.options.mute) game.canvas.primary.videoMeshes.add(this._mesh);

      // Delete media on ended if loop is "false"
      if (!this.options.loop) {
        this.#videoEndedHandler = () =>
          game.canvas["shm-media-layer"].deleteSprite(this.area.uuid, { unsetFlag: true });
        video.addEventListener("ended", this.#videoEndedHandler);
      }

      // Start the video
      game.video.play(video, {
        loop: this.options.loop,
        volume: this.options.mute ? 0 : game.settings.get("core", "globalAmbientVolume"),
      });
    }

    // Reassign controls if layer is still active
    if (game.canvas["shm-media-layer"].active) {
      // Control this sprite again if it was the last controlled
      if (MediaSprite.lastControlled === this.area.uuid) this.control();
      // Reopen the hud if it was open for the sprite area
      if (game.modules.shareMedia.canvas.apps.hud.lastSprite === this.area.uuid)
        this.hud.bind(this);
    }
  }

  /* -------------------------------------------- */

  /**
   * Destroy the current sprite, removing it from the canvas and destroying objects and references.
   */
  destroy() {
    if (!game.canvas) return;

    // Removing controlled and hovered elements
    if (this.isControlled) this.release();
    if (this.hovered) this.hovered = null;

    // Manage video
    const video = game.video.getVideoSource(this._mesh);
    if (video) {
      if (this.#videoEndedHandler) {
        video.removeEventListener("ended", this.#videoEndedHandler);
        this.#videoEndedHandler = null;
      }
      if (game.canvas.primary.videoMeshes.has(this._mesh))
        game.canvas.primary.videoMeshes.delete(this._mesh);
      game.video.stop(video);
    }

    // Cancel the interaction manager
    this.#mouseInteractionManager.cancel();

    // Remove PIXI elements from canvas
    if (this._mesh.parent) this._mesh.parent.removeChild(this._mesh);
    if (this._mask.parent) this._mask.parent.removeChild(this._mask);
    if (this._frame.parent) this._frame.parent.removeChild(this._frame);
    if (this._border.parent) this._border.parent.removeChild(this._border);

    // Destroy PIXI elements
    if (!this._mesh.destroyed) this._mesh.destroy();
    if (!this._mask.destroyed) this._mask.destroy();
    if (!this._frame.destroyed) this._frame.destroy();
    if (!this._border.destroyed) this._border.destroy();

    // Remove references
    this.area = null;
    this._mesh = null;
    this._mask = null;
    this._frame = null;
    this._border = null;
    this.#mouseInteractionManager = null;

    // Unload texture if needed
    MediaSprite.#decrementTextureRef(this.src);
  }

  /* -------------------------------------------- */
  /*  Textures Management
  /* -------------------------------------------- */

  /**
   * Increment texture reference count.
   * @param {string} src  Texture source URL.
   */
  static #incrementTextureRef(src) {
    if (!src) return;
    const count = MediaSprite.#textureRefCount.get(src) || 0;
    MediaSprite.#textureRefCount.set(src, count + 1);
  }

  /* -------------------------------------------- */

  /**
   * Decrement texture reference count and unload if no more references.
   * @param {string} src  Texture source URL.
   * @returns {Promise<void>}
   */
  static async #decrementTextureRef(src) {
    if (!src) return;

    const count = MediaSprite.#textureRefCount.get(src) || 0;
    if (count <= 1) {
      // No more references, safe to unload
      MediaSprite.#textureRefCount.delete(src);
      await PIXI.Assets.unload(src).catch(() => {
        // Ignore errors as texture might already be unloaded
      });
    } else {
      // Still has references, just decrement
      MediaSprite.#textureRefCount.set(src, count - 1);
    }
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured implementation for this sprite type.
   * @type {typeof MediaSprite}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.canvas.MediaSprite;
    if (!isSubclass(Class, MediaSprite)) {
      console.warn("Configured MediaSprite override must be a subclass of MediaSprite.");
      Class = MediaSprite;
    }
    return Class;
  }
}
