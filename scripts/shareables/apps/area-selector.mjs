const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { isSubclass, fromUuid } = foundry.utils;

/**
 * Application responsible for selecting a share media scene area.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 * @mixes WaitableMixin          Delayed composition @see {@link AreaSelector.implementation}
 */
export default class AreaSelector extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "shm-area-selector-{id}",
    tag: "form",
    window: {
      title: "share-media.shareables.selector.area.label",
      contentClasses: ["standard-form"],
    },
    position: {
      width: 400,
      height: "auto",
    },
    form: {
      handler: AreaSelector.#onSubmit,
      closeOnSubmit: true,
    },
    actions: {},
  };

  /** @override */
  static PARTS = {
    form: {
      template: "modules/share-media/templates/shareables/area-selector.hbs",
      root: true,
    },
  };

  /**
   * Active window before this application is opened.
   * @type {ApplicationV2}
   */
  #activeWindow = null;

  /**
   * The graphics used to draw the highlighted tile.
   * @type {PIXI.Graphics}
   */
  #tileHighlight = null;

  /**
   * "canvasTearDown" ID to cleanup after closing this application.
   * @type {number | null}
   */
  #canvasTearDownHookId = null;

  /* -------------------------------------------- */
  /*  Area activation
  /* -------------------------------------------- */

  /**
   * Activate an area by showing it in the scene if able.
   * @param {string} uuid  Area uuid.
   * @returns {Promise<void>}
   */
  async _activateArea(uuid) {
    const area = await fromUuid(uuid);
    const object = game.canvas[area?.collectionName].get(area?.id);
    if (!area || !object) return;

    // Highlight area
    switch (area.documentName) {
      // Region
      case CONFIG.Region.documentClass.documentName:
        if (area.visibility === CONST.REGION_VISIBILITY.LAYER) object.visible = true;
        break;

      // Tile
      case CONFIG.Tile.documentClass.documentName:
        // Add highlight if not there
        if (!this.#tileHighlight) {
          this.#tileHighlight = game.canvas.tiles.addChild(new PIXI.Graphics());
          this.#tileHighlight.eventMode = "none";
          this.#tileHighlight.visible = false;
        }

        // Draw highlight
        this.#tileHighlight.clear();
        this.#tileHighlight.visible = true;
        this.#tileHighlight.beginFill(area.texture.tint, 0.5);
        this.#tileHighlight.drawRect(
          object.bounds.x,
          object.bounds.y,
          object.bounds.width,
          object.bounds.height,
        );
        this.#tileHighlight.endFill();
        break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Deactivate an area by hiding it in the scene if able.
   * @param {string} uuid  Area uuid.
   * @returns {Promise<void>}
   */
  async _deactivateArea(uuid) {
    const area = await fromUuid(uuid);
    const object = game.canvas[area?.collectionName].get(area?.id);
    if (!area || !object) return;

    // Remove highlight
    switch (area.documentName) {
      // Region
      case CONFIG.Region.documentClass.documentName:
        if (area.visibility === CONST.REGION_VISIBILITY.LAYER) object.visible = false;
        break;

      // Tile
      case CONFIG.Tile.documentClass.documentName:
        if (this.#tileHighlight) this.#tileHighlight.clear();
        break;
    }
  }

  /* -------------------------------------------- */
  /*  Context
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    return {
      ...(await super._prepareContext(options)),
      icons: CONFIG.shareMedia.CONST.ICONS,
      areas: this.#prepareAreas(),
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare areas (regins and tiles).
   * Selecting only regions with at least one "ShareRegionBehaviorType" behavior not disabled.
   * Selecting only tiles with a flag enabled.
   * If "this.options.targetArea" is available, make it the default, otherwise make the first region the default.
   * @returns {Array<{
   *   id: string;
   *   name: string;
   *   color: Color;
   * }>}
   */
  #prepareAreas() {
    const areas = game.modules.shareMedia.utils.getAvailableAreas().map((area) => ({
      uuid: area.uuid,
      name:
        area.name ??
        area.getFlag("share-media", game.canvas["shm-media-layer"].constructor.MEDIA_TILE_NAME),
      color: area.color ?? area.texture.tint,
      checked: area.uuid === this.options.targetArea,
    }));
    if (areas.length && !areas.some((area) => area.checked)) areas.at(0).checked = true;
    return areas;
  }

  /* -------------------------------------------- */
  /*  Action Event Handlers
  /* -------------------------------------------- */

  /**
   * Handle the submission of this application.
   * @param {SubmitEvent}      _event    The originating form submission or input change event.
   * @param {HTMLFormElement}  _form     The form element that was submitted.
   * @param {FormDataExtended} formData  Processed data for the submitted form.
   * @returns {Promise<string>}
   * @this {AreaSelector}
   */
  static async #onSubmit(_event, _form, formData) {
    if (!Object.keys(formData.object).length) return null;
    return formData.object.area;
  }

  /* -------------------------------------------- */
  /*  Other Event Handlers
  /* -------------------------------------------- */

  /**
   * Handle pointer entering an area selector.
   * @param {PointerEvent} event  The initiating pointerover event.
   */
  #onPointerOver(event) {
    const target = event.target;
    const previousTarget = event.relatedTarget;
    const areaElement = target.closest("[data-area-uuid]");
    if (!areaElement || areaElement.contains(previousTarget)) return;
    this._activateArea(areaElement.dataset.areaUuid);
  }

  /* -------------------------------------------- */

  /**
   * Handle pointer leaving an area selector.
   * @param {PointerEvent} event  The initiating pointerout event.
   */
  #onPointerOut(event) {
    const target = event.target;
    const nextTarget = event.relatedTarget;
    const areaElement = target.closest("[data-area-uuid]");
    if (!areaElement || areaElement.contains(nextTarget)) return;
    this._deactivateArea(areaElement.dataset.areaUuid);
  }

  /* -------------------------------------------- */

  /**
   * Handle double click on area selector.
   * @param {PointerEvent} event  The triggering event.
   */
  #onDoubleClick(event) {
    const target = event.target;
    const areaElement = target.closest("[data-area-uuid]");
    if (!areaElement) return;
    this.form.submit();
  }

  /* -------------------------------------------- */
  /*  Rendering
  /* -------------------------------------------- */

  /**
   * Attach pointer events to the area selectors.
   * @inheritdoc
   */
  _attachFrameListeners() {
    super._attachFrameListeners();
    this.element.addEventListener("pointerover", this.#onPointerOver.bind(this));
    this.element.addEventListener("pointerout", this.#onPointerOut.bind(this));
    this.element.addEventListener("dblclick", this.#onDoubleClick.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Minimize active window.
   * @inheritdoc
   */
  async _preFirstRender(context, options) {
    super._preFirstRender(context, options);
    if (ui.activeWindow && !ui.activeWindow.minimized) {
      this.#activeWindow = ui.activeWindow;
      this.#activeWindow.minimize();
    }
  }

  /* -------------------------------------------- */

  /**
   * Watch for scene navigation. Close this application if the scene changes.
   * @inheritdoc
   */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.#canvasTearDownHookId = Hooks.once("canvasTearDown", this.close.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Cleanup references when this application is closed.
   * @inheritdoc
   */
  _onClose(options) {
    super._onClose(options);
    if (this.#canvasTearDownHookId) Hooks.off("canvasTearDown", this.#canvasTearDownHookId);
    this.#canvasTearDownHookId = null;
    if (this.#tileHighlight) {
      this.#tileHighlight.parent.removeChild(this.#tileHighlight);
      this.#tileHighlight.destroy();
    }
    this.#tileHighlight = null;
    if (this.#activeWindow) this.#activeWindow.maximize();
    this.#activeWindow = null;
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured AreaSelector implementation.
   * @type {typeof AreaSelector}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.shareables.apps.AreaSelector;
    if (!isSubclass(Class, AreaSelector)) {
      console.warn("Configured AreaSelector override must be a subclass of AreaSelector.");
      Class = AreaSelector;
    }

    // Apply required mixins
    const { WaitableMixin } = CONFIG.shareMedia.shareables.mixins;
    return WaitableMixin(Class);
  }
}
