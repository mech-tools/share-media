const { InteractionLayer } = foundry.canvas.layers;
const { DialogV2 } = foundry.applications.api;
const { isSubclass, fromUuid, mergeObject } = foundry.utils;

/** @typedef {import("./media-sprite.mjs").default} MediaSprite */

/**
 * Class responsible for managing and displaying media sprites.
 * The layer handles sprites a single scene at a time.
 */
export default class MediaLayer extends InteractionLayer {
  constructor() {
    super();

    // Activate hooks
    this._activateHooks();
  }

  /* -------------------------------------------- */

  /**
   * Map of active sprites by area uuid.
   * @type {Map<string, MediaSprite>}
   */
  sprites = new Map();

  /**
   * [INFO] Needed so the placeables tab doesn't error.
   * @type {Array}
   */
  placeables = [];

  /** @inheritdoc */
  static get layerOptions() {
    return mergeObject(super.layerOptions, {
      name: "shm-media-layer",
      zIndex: 100,
    });
  }

  /**
   * [INFO] Needed so the placeable tab doesn't error.
   * @override
   */
  static documentName = "Token";

  /**
   * The flag key to register the tile activation.
   * @type {string}
   */
  static MEDIA_TILE_ENABLED = "enabled";

  /**
   * The flag key to register the area sort order.
   * @type {string}
   */
  static SORT_FLAG_KEY = "sort";

  /**
   * The flag key to register media options on a area.
   * @type {string}
   */
  static MEDIA_FLAG_KEY = "media";

  /* -------------------------------------------- */
  /*  Layer Management
  /* -------------------------------------------- */

  /**
   * Creating a new container for frames.
   * @inheritdoc
   */
  async _draw(options) {
    super._draw(options);

    // Create a new container containing all the layer frames
    this.objects = this.addChild(new PIXI.Container());
    this.objects.sortableChildren = true;

    // Render scene sprites
    for (const region of game.canvas.regions.placeables) {
      const flag = region.document.getFlag("share-media", this.constructor.MEDIA_FLAG_KEY);
      if (flag) await this.addSprite({ targetArea: region.document.uuid, ...flag });
    }
    for (const tile of game.canvas.tiles.placeables) {
      const flag = tile.document.getFlag("share-media", this.constructor.MEDIA_FLAG_KEY);
      if (flag) await this.addSprite({ targetArea: tile.document.uuid, ...flag });
    }
  }

  /* -------------------------------------------- */

  /** @override */
  static prepareSceneControls() {
    return {
      name: "shm-media-layer",
      title: "share-media.canvas.layer.control.label",
      layer: "shm-media-layer",
      icon: CONFIG.shareMedia.CONST.ICONS.mediaLayer,
      visible: game.user.isGM,
      onChange: (_event, active) => {
        if (active) game.canvas["shm-media-layer"].activate();
      },
      tools: {
        select: {
          name: "select",
          order: 1,
          title: "share-media.canvas.layer.tools.select.label",
          icon: CONFIG.shareMedia.CONST.ICONS.select,
        },
        link: {
          name: "link",
          order: 2,
          title: "share-media.canvas.layer.tools.link.label",
          icon: CONFIG.shareMedia.CONST.ICONS.shareLink,
          onChange: () =>
            new game.modules.shareMedia.shareables.apps.shareSelector({ link: true }).render({
              force: true,
            }),
          button: true,
        },
        clear: {
          name: "clear",
          order: 3,
          title: "share-media.canvas.layer.tools.clear.label",
          icon: CONFIG.shareMedia.CONST.ICONS.clear,
          onChange: () => game.canvas["shm-media-layer"].deleteAllSprites(),
          button: true,
        },
      },
      activeTool: "select",
    };
  }

  /* -------------------------------------------- */

  /** @override */
  _onClickLeft(_event) {
    if (
      game.settings.get("core", "leftClickRelease") &&
      !game.modules.shareMedia.canvas.mediaSprite.hovered &&
      game.modules.shareMedia.canvas.mediaSprite.controlled
    )
      game.modules.shareMedia.canvas.mediaSprite.controlled.release();
  }

  /* -------------------------------------------- */

  /** @override */
  _onDragLeftDrop(_event) {
    if (game.modules.shareMedia.canvas.mediaSprite.controlled)
      game.modules.shareMedia.canvas.mediaSprite.controlled.release();
  }

  /* -------------------------------------------- */

  /**
   * Steps taken when this layer is deactivated.
   * @inheritdoc
   */
  _deactivate() {
    // Release any controlled sprite
    if (game.modules.shareMedia.canvas.mediaSprite.controlled)
      game.modules.shareMedia.canvas.mediaSprite.controlled.release();
  }

  /* -------------------------------------------- */

  /**
   * Delete all media sprites and reset the layer.
   * @inheritdoc
   */
  async _tearDown(options) {
    // Delete all media sprites
    for (const sprite of this.sprites.values()) {
      sprite.destroy();
    }
    // Clear the sprites map
    this.sprites.clear();

    // Let foundry handle the rest
    return super._tearDown(options);
  }

  /* -------------------------------------------- */
  /*  Sprite Management
  /* -------------------------------------------- */

  /**
   * Add a media sprite on the scene.
   * @param {Object}     options                      Options which change how a media is displayed on the scene.
   * @param {string}     options.src                  Source URL of the media to share.
   * @param {string}     options.targetArea           Area to display to.
   * @param {...unknown} [options.additionalOptions]  Others additional options.
   * @returns {Promise<MediaSprite | void>}
   */
  async addSprite(options) {
    // Get the options
    const { src = null, targetArea = null, ...additionalOptions } = options;

    // Get the area document and make sure it is displayed on the current scene
    const area = await fromUuid(targetArea);
    if (!area || area.parent.id !== game.canvas?.scene?.id) return;

    // Attempt to remove a previous sprite in the same area
    if (this.sprites.has(targetArea)) await this.deleteSprite(area.uuid);

    // Verify that this area exists on the current scene level
    // [NOTE] Only if at least one level is defined for the area
    if (area.levels.size && !area.levels.has(game.canvas.level.id)) return;

    // Create the sprite
    const spriteClass = this._getSpriteClass(area);
    if (!spriteClass) return;
    const sprite = new spriteClass(src, area, additionalOptions);

    // Initialize it
    await sprite.initialize();
    // Add it to the canvas
    sprite.addToCanvas();

    // Store the sprite attached to the document area id
    this.sprites.set(area.uuid, sprite);

    // Firing hooks
    Hooks.callAll("shareMedia.renderSceneSprite", sprite, area);

    return sprite;
  }

  /* -------------------------------------------- */

  /**
   * Get the appropriate sprite class for the target area.
   * @param {string} area  Area to display to.
   * @returns {MediaSprite | void}
   */
  _getSpriteClass(area) {
    // Check if the area is valid before creating a new sprite
    switch (area.documentName) {
      // Region
      case CONFIG.Region.documentClass.documentName:
        if (
          !area.shapes.length ||
          !area.behaviors.some(
            (behavior) =>
              behavior.type === CONFIG.shareMedia.canvas.ShareRegionBehaviorType.type &&
              !behavior.disabled,
          )
        )
          return;
        return game.modules.shareMedia.canvas.regionSprite;

      // Tile
      case CONFIG.Tile.documentClass.documentName:
        if (!area.getFlag("share-media", this.constructor.MEDIA_TILE_ENABLED)) return;
        return game.modules.shareMedia.canvas.tileSprite;
    }
  }

  /* -------------------------------------------- */

  /**
   * Delete a media sprite on the scene.
   * @param {string}  targetArea  Area uuid.
   * @param {boolean} flag        Unset the flag of the area as well.
   * @returns {Promise<void>}
   */
  async deleteSprite(targetArea, { unsetFlag = false } = {}) {
    const sprite = this.sprites.get(targetArea);
    if (!sprite) return;

    // Destroy the sprite
    sprite.destroy();

    // Remove its reference
    this.sprites.delete(targetArea);

    // Remove the media flag associated with the area document
    if (unsetFlag && game.user.isGM) {
      const area = await fromUuid(targetArea);
      if (!area) return;
      await area.unsetFlag("share-media", this.constructor.MEDIA_FLAG_KEY);

      // Firing hooks
      Hooks.callAll("shareMedia.deleteSceneSprite", area);
    }
  }

  /* -------------------------------------------- */

  /**
   * Delete all sprites on the scene.
   * [NOTE] Will only delete sprites rendered on the current level.
   * @returns {Promise<void>}
   */
  async deleteAllSprites() {
    return DialogV2.confirm({
      window: { title: "CONTROLS.ClearAll" },
      content: `<p>${_loc("CONTROLS.ClearAllHint", { type: _loc("share-media.canvas.layer.control.type") })}</p>`,
      yes: {
        callback: async () => {
          let deleted = 0;

          for (const region of game.canvas.regions.placeables) {
            const flag = region.document.getFlag("share-media", this.constructor.MEDIA_FLAG_KEY);
            if (flag) {
              await this.deleteSprite(region.document.uuid, { unsetFlag: true });
              deleted++;
            }
          }
          for (const tile of game.canvas.tiles.placeables) {
            const flag = tile.document.getFlag("share-media", this.constructor.MEDIA_FLAG_KEY);
            if (flag) {
              await this.deleteSprite(tile.document.uuid, { unsetFlag: true });
              deleted++;
            }
          }

          ui.notifications.info("CONTROLS.DeletedObjects", {
            format: { count: deleted, type: _loc("share-media.canvas.layer.control.type") },
          });
        },
      },
    });
  }

  /* -------------------------------------------- */

  /**
   * Update an area with media data.
   * Also assign a sort order if the area does not already have one.
   * @param {string} targetArea  Area ID to update.
   * @param {Object} data        Media data.
   * @returns {Promise<Document | undefined>}
   */
  async createAreaMediaData(targetArea, data) {
    const area = await fromUuid(targetArea);
    if (!area) return null;

    // Media data to update
    const updates = { [`flags.share-media.${this.constructor.MEDIA_FLAG_KEY}`]: data };

    // Check if the area has a sort flag, if not assign one
    if (!area.getFlag("share-media", this.constructor.SORT_FLAG_KEY)) {
      let sort = 0;
      for (const area of game.modules.shareMedia.utils.getAvailableAreas()) {
        sort = Math.max(
          sort,
          (area.getFlag("share-media", this.constructor.SORT_FLAG_KEY) ?? 0) + 1,
        );
      }
      updates[`flags.share-media.${this.constructor.SORT_FLAG_KEY}`] = sort;
    }

    return await area.update(updates, { diff: false });
  }

  /* -------------------------------------------- */

  /**
   * Send the controlled sprite of this layer to the back or bring it to the front.
   * @param {string}  targetArea  Uuid of the sprite area.
   * @param {boolean} front       Bring to front instead of send to back?
   * @returns {Promise<void>}
   */
  async sendToBackOrBringToFront(targetArea, front) {
    const area = await fromUuid(targetArea);
    if (!area) return;

    // Determine the minimum/maximum sort value of the other sprites
    let target = front ? -Infinity : Infinity;
    for (const document of game.modules.shareMedia.utils.getAvailableAreas()) {
      if (document.uuid === targetArea) continue;
      const flag = document.getFlag("share-media", this.constructor.SORT_FLAG_KEY);
      if (flag === undefined) continue;
      target = (front ? Math.max : Math.min)(target, flag);
    }

    // If no new sort, return
    if (!Number.isFinite(target)) return false;

    // Already in the correct position
    const currentSort = area.getFlag("share-media", this.constructor.SORT_FLAG_KEY);
    if (front ? currentSort > target : currentSort < target) return false;

    // Send to top or bottom and update flag
    target += front ? 1 : -1;
    await area.setFlag("share-media", this.constructor.SORT_FLAG_KEY, target);
    return true;
  }

  /* -------------------------------------------- */
  /*  Area Hooks
  /* -------------------------------------------- */

  /**
   * Register foundry areas lifecycle hooks.
   */
  _activateHooks() {
    Hooks.on("updateRegion", this.#onUpdateArea.bind(this));
    Hooks.on("updateTile", this.#onUpdateArea.bind(this));
    Hooks.on("deleteRegion", this.#onDeleteArea.bind(this));
    Hooks.on("deleteTile", this.#onDeleteArea.bind(this));
    Hooks.on("createRegionBehavior", this.#onCreateRegionBehavior.bind(this));
    Hooks.on("updateRegionBehavior", this.#onUpdateRegionBehavior.bind(this));
    Hooks.on("deleteRegionBehavior", this.#onDeleteRegionBehavior.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle the update of an area.
   * This catches all modifications even those not relevant to share media.
   * @param {RegionDocument | TileDocument} document  The scene document being updated.
   * @param {Object}                        _changed  Modified settings of the scene.
   * @param {Object}                        _options  Options passed to the update.
   * @param {string}                        _userId   User making the update.
   */
  #onUpdateArea(document, _changed, _options, _userId) {
    const flag = document.getFlag("share-media", this.constructor.MEDIA_FLAG_KEY);
    if (flag) this.addSprite({ targetArea: document.uuid, ...flag });
    else this.deleteSprite(document.uuid);
  }

  /* -------------------------------------------- */

  /**
   * Handle the deletion of an area.
   * @param {RegionDocument | TileDocument}    document  The existing Document which was deleted.
   * @param {Partial<DatabaseDeleteOperation>} _options  Additional options which modified the deletion request.
   * @param {string}                           _userId   The ID of the User who triggered the deletion workflow.
   */
  #onDeleteArea(document, _options, _userId) {
    this.deleteSprite(document.uuid);
  }

  /* -------------------------------------------- */

  /**
   * Handle the creation of a region behavior.
   * @param {RegionBehaviorDocument}           document  The new Document instance which has been created.
   * @param {Partial<DatabaseCreateOperation>} _options  Additional options which modified the creation request.
   * @param {string}                           _userId   The ID of the User who triggered the creation workflow.
   */
  #onCreateRegionBehavior(document, _options, _userId) {
    if (document.type !== CONFIG.shareMedia.canvas.ShareRegionBehaviorType.type) return;
    document = document.parent;
    const flag = document.getFlag("share-media", this.constructor.MEDIA_FLAG_KEY);
    if (flag) this.addSprite({ targetArea: document.uuid, ...flag });
  }

  /* -------------------------------------------- */

  /**
   * Handle the update of a region behavior.
   * @param {RegionBehaviorDocument} document  The scene document being updated.
   * @param {Object}                 _changed  Modified settings of the scene.
   * @param {Object}                 _options  Options passed to the update.
   * @param {string}                 _userId   User making the update.
   */
  #onUpdateRegionBehavior(document, _changed, _options, _userId) {
    if (document.type !== CONFIG.shareMedia.canvas.ShareRegionBehaviorType.type) return;
    document = document.parent;
    const flag = document.getFlag("share-media", this.constructor.MEDIA_FLAG_KEY);
    if (flag) this.addSprite({ targetArea: document.uuid, ...flag });
  }

  /* -------------------------------------------- */

  /**
   * Handle the deletion of a region behavior.
   * @param {RegionBehaviorDocument}           document  The existing Document which was deleted.
   * @param {Partial<DatabaseDeleteOperation>} _options  Additional options which modified the deletion request.
   * @param {string}                           _userId   The ID of the User who triggered the deletion workflow.
   */
  #onDeleteRegionBehavior(document, _options, _userId) {
    if (document.type !== CONFIG.shareMedia.canvas.ShareRegionBehaviorType.type) return;
    document = document.parent;
    const flag = document.getFlag("share-media", this.constructor.MEDIA_FLAG_KEY);
    if (flag) this.addSprite({ targetArea: document.uuid, ...flag });
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured MediaLayer implementation.
   * @type {typeof MediaLayer}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.canvas.MediaLayer;
    if (!isSubclass(Class, MediaLayer)) {
      console.warn("Configured MediaLayer override must be a subclass of MediaLayer.");
      Class = MediaLayer;
    }
    return Class;
  }
}
