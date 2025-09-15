const { isSubclass } = foundry.utils;

/**
 * Class responsible for handling and dispatching media actions.
 */
export default class ShareablesManager {
  constructor() {
    if (game.modules.shareMedia.shareables.manager)
      throw new Error("You may not re-construct the singleton ShareablesManager.");

    // Register queries
    this._registerUserQueries();
  }

  /* -------------------------------------------- */

  /**
   * Ordered steps of a pipeline that goes through the dispatcher options and execute appropriate actions.
   * @type {Array<{
   *   name: string;
   *   condition: (options: ShareablesOptions, ctx: ShareablesManager) => boolean;
   * }>}
   */
  // prettier-ignore
  static PIPELINE_STEPS = [
    { name: "is-gm", condition: (_options) => true },
    { name: "all-users", condition: (options) =>
      (options.optionName === CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersAll.name
        && options.optionValue === CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersAll.value)
      || options.mode === CONFIG.shareMedia.CONST.LAYERS_MODES.scene
    },
    { name: "user-selection", condition: (options) =>
      options.optionName === CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersSelection.name
      && options.optionValue === CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersSelection.value },
    { name: "blacklist-filter", condition: (options) =>
        options.mode !== CONFIG.shareMedia.CONST.LAYERS_MODES.scene
     },
    { name: "area-selection", condition: (options) =>
      options.mode === CONFIG.shareMedia.CONST.LAYERS_MODES.scene
    },
    { name: "has-darkness", condition: (options) =>
      options.darkness
      && options.mode !== CONFIG.shareMedia.CONST.LAYERS_MODES.scene
    },
    { name: "create-area-flag", condition: (options) =>
      options.mode === CONFIG.shareMedia.CONST.LAYERS_MODES.scene },
    { name: "create-layer", condition: (options) =>
      options.mode !== CONFIG.shareMedia.CONST.LAYERS_MODES.scene },
    { name: "store-media", condition: (_options) => true},
  ];

  /**
   * Static mapping of pipeline step names to their corresponding handler functions.
   * Each handler is a static method that processes a specific step in the dispatch pipeline.
   * @type {Record<ShareablesManager.PIPELINE_STEPS[number]["name"], Function>}
   */
  static PIPELINE_HANDLERS = {
    "is-gm": ShareablesManager._handleIsGm,
    "all-users": ShareablesManager._handleAllUsers,
    "user-selection": ShareablesManager._handleUserSelection,
    "blacklist-filter": ShareablesManager._handleBlackListFilter,
    "area-selection": ShareablesManager._handleAreaSelection,
    "has-darkness": ShareablesManager._handleHasDarkness,
    "create-area-flag": ShareablesManager._handleCreateAreaFlag,
    "create-layer": ShareablesManager._handleCreatelayer,
    "store-media": ShareablesManager._handleStoreMedia,
  };

  /* -------------------------------------------- */
  /*  Media Actions Dispatcher
  /* -------------------------------------------- */

  /**
   * @typedef {Object} ShareablesOptions
   * @property {string}   src            Source URL of the media to share.
   * @property {string}   mode           The display mode.
   * @property {string[]} [targetUsers]  Users to share to.
   * @property {string}   [targetArea]   Area to display to.
   * @property {string}   [optionName]   Option name which may modify how a media is shared.
   * @property {string}   [optionValue]  Option value which may modify how a media is shared.
   * @property {string}   [caption]      Caption to display.
   * @property {boolean}  [darkness]     Should darkness be applied ("popout" or "fullscreen" modes)
   * @property {boolean}  [sceneId]      Scene id bound to darkness ("popout" or "fullscreen" modes)
   * @property {boolean}  [immersive]    Should immersive mode be applied ("fullscreen" mode)
   * @property {boolean}  [controls]     Should player controls be displayed ("fullscreen" mode)
   * @property {boolean}  [loop]         Should the video be looped (video only)
   * @property {boolean}  [mute]         should the video be muted (video only)
   */

  /**
   * Handle the sharing of a media depending on various possible configurations.
   * @param {ShareablesOptions} options  Options which change the way a media is shared.
   * @returns {Promise<boolean>}
   */
  async dispatch(options = {}) {
    // Validate options
    if (!this._validateOptions(options)) return;

    // Create execution pipeline
    const pipeline = this.#createExecutionPipeline(options);

    // Execute pipeline steps
    const result = await this.#executePipeline(pipeline, options);

    // Return success status as a boolean
    return !!result;
  }

  /* -------------------------------------------- */

  /**
   * Basic options validator. Returns true if ok, otherwise false.
   * @param {ShareablesOptions} options  Options which change the way a media is shared.
   * @returns {boolean}
   * @throws {Error} If validation fails.
   */
  _validateOptions(options = {}) {
    const actions = CONFIG.shareMedia.CONST.MEDIA_ACTIONS;

    // Src
    if (!options.src)
      throw new Error(
        'You must pass a valid "options.src" option to "ShareablesManager.shareMedia".',
      );

    // Mode
    if (
      !options.mode ||
      !Object.values(actions)
        .flat()
        .map((action) => action.mode)
        .includes(options.mode)
    )
      throw new Error(
        'You must pass a valid "options.mode" option to "ShareablesManager.shareMedia".',
      );

    // Mode option
    const hasMatchingOption = actions[options.mode].some(
      ({ optionName, optionValue }) =>
        optionName === options.optionName && optionValue === options.optionValue,
    );
    if (!hasMatchingOption)
      throw new Error(
        'You must pass a valid "optionName" and "optionValue" to "ShareablesManager.shareMedia".',
      );

    return true;
  }

  /* -------------------------------------------- */
  /*  Execution Pipeline
  /* -------------------------------------------- */

  /**
   * @typedef {Object} PipelineStep
   * @property {string}   type     The name/type of the pipeline step.
   * @property {Function} handler  The handler function for this step.
   */

  /**
   * Create an execution pipeline by filtering and mapping pipeline steps based on the provided options.
   * Only steps whose condition evaluates to true will be included in the pipeline.
   * @param {ShareablesOptions} options  Options used to determine which steps should be executed.
   * @returns {PipelineStep[]}
   */
  #createExecutionPipeline(options) {
    return this.constructor.PIPELINE_STEPS.filter((step) => step.condition(options)).map(
      (step) => ({
        type: step.name,
        handler: this.#getHandler(step.name),
      }),
    );
  }

  /* -------------------------------------------- */

  /**
   * Execute a pipeline by running each step sequentially with the provided context.
   * If any step returns null or undefined, the pipeline is interrupted.
   * @param {PipelineStep[]}    pipeline  The pipeline steps to execute.
   * @param {ShareablesOptions} options   Initial options that will be used as the base context.
   * @returns {Promise<ShareablesOptions | null>}
   */
  async #executePipeline(pipeline, options) {
    let context = { ...options };

    for (const step of pipeline) {
      context = await step.handler(context);
      // Pipeline interrupted
      if (!context) break;
    }

    // Fire hooks
    Hooks.callAll("share-media.executePipeline", pipeline, options);

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Get the appropriate handler function for a given step name.
   * @param {string} stepName  The name of the step to get a handler for.
   * @returns {Function}
   * @throws {Error} If no handler is found for the given step name.
   */
  #getHandler(stepName) {
    const handler = this.constructor.PIPELINE_HANDLERS[stepName];
    if (!handler) throw new Error(`No handler found for step: ${stepName}`);
    return (context) => handler.call(this, context);
  }

  /* -------------------------------------------- */
  /*  Pipeline Handlers
  /* -------------------------------------------- */

  /**
   * Handle checking current user is a Gamemaster.
   * @param {ShareablesOptions} context  Current pipeline context.
   * @returns {Promise<ShareablesOptions | null>}
   * @this {ShareablesManager}
   */
  static async _handleIsGm(context) {
    if (!game.users.current.isGM) {
      ui.notifications.warn("Only Gamemasters are able to share media!");
      return null;
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Handle sharing to all active users.
   * Collects all active user IDs and adds them to the context as targetUsers.
   * @param {ShareablesOptions} context  Current pipeline context.
   * @returns {Promise<ShareablesOptions>}
   * @this {ShareablesManager}
   */
  static async _handleAllUsers(context) {
    const targetUsers = game.users.filter((u) => u.active).map((u) => u.id);
    return { ...context, targetUsers };
  }

  /* -------------------------------------------- */

  /**
   * Handle user selection via the user selector dialog.
   * Opens a user selection dialog and waits for user input.
   * @param {ShareablesOptions} context  Current pipeline context.
   * @returns {Promise<ShareablesOptions | null>}
   * @this {ShareablesManager}
   */
  static async _handleUserSelection(context) {
    const targetUsers = await game.modules.shareMedia.shareables.apps.userSelector.wait();
    if (!targetUsers) return null;
    return { ...context, targetUsers };
  }

  /* -------------------------------------------- */

  /**
   * Filter target users based on the configured blacklist.
   * Removes any blacklisted users from the targetUsers array.
   * @param {ShareablesOptions} context  Current pipeline context with targetUsers.
   * @returns {Promise<ShareablesOptions | null>}
   * @this {ShareablesManager}
   */
  static async _handleBlackListFilter(context) {
    const { targetUsers, ...data } = context;
    if (!targetUsers || !targetUsers.length) return context;

    const blacklistSettings = game.modules.shareMedia.settings.get(
      CONFIG.shareMedia.CONST.MODULE_SETTINGS.blacklistSettings,
    );

    // Filter target users per blacklist
    const allowedUsers = targetUsers.filter((user) => !blacklistSettings.includes(user));
    if (!allowedUsers.length) return null;

    return { ...data, targetUsers: allowedUsers };
  }

  /* -------------------------------------------- */

  /**
   * Handle area selection via the area selector dialog.
   * Opens an area selection dialog and waits for user input.
   * @param {ShareablesOptions} context  Current pipeline context.
   * @returns {Promise<ShareablesOptions | null>}
   * @this {ShareablesManager}
   */
  static async _handleAreaSelection(context) {
    // If no active scene, dont proceed
    if (!game.canvas) {
      ui.notifications.warn('An active scene is needed to share with "scene" mode!');
      return null;
    }

    // If only one area is available, return it directly without opening the area selector
    const availableAreas = game.modules.shareMedia.utils.getAvailableAreas();
    if (availableAreas.length === 1) {
      return { ...context, targetArea: availableAreas[0].uuid };
    }

    // Otherwise, open the area selector as usual
    const options = {};
    if (context.targetArea) options.targetArea = context.targetArea;
    const targetArea = await game.modules.shareMedia.shareables.apps.areaSelector.wait(options);
    if (!targetArea) return null;
    return { ...context, targetArea };
  }

  /* -------------------------------------------- */

  /**
   * Handle darkness settings.
   * @param {ShareablesOptions} context  Current pipeline context.
   * @returns {Promise<ShareablesOptions | null>}
   * @this {ShareablesManager}
   */
  static async _handleHasDarkness(context) {
    if (!game.canvas) return null;

    // Adding current scene to the context in case of darkness
    context.sceneId = game.canvas.scene?.id ?? null;

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Handle storing a flag on the selected area.
   * @param {ShareablesOptions} context  Current pipeline context.
   * @returns {Promise<ShareablesOptions | null>}
   * @this {ShareablesManager}
   */
  static async _handleCreateAreaFlag(context) {
    const { users: _users, mode: _mode, targetArea, ...data } = context;

    // Await for the result
    const result = await game.modules.shareMedia.canvas.layer.createAreaMediaData(targetArea, data);

    return result ? context : null;
  }

  /* -------------------------------------------- */

  /**
   * Handle query emission for layer instantiation.
   * Sends layer data to target users via queries.
   * @param {ShareablesOptions} context  Current pipeline context with targetUsers and layer data.
   * @returns {Promise<ShareablesOptions | null>}
   * @this {ShareablesManager}
   */
  static async _handleCreatelayer(context) {
    // Extract relevant query data
    const { users: _users, targetUsers, ...data } = context;
    if (!targetUsers || !targetUsers.length) return null;

    // Send query to all users
    for (const userId of targetUsers) {
      game.users.get(userId).query("share-media.renderLayer", data);
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Handle storing the media by sending it to "MediaSidebar.storeMedia".
   * Only enabled layers are stored.
   * @param {ShareablesOptions} context  Current pipeline context with targetUsers and layer data.
   * @returns {Promise<ShareablesOptions>}
   * @this {ShareablesManager}
   */
  static async _handleStoreMedia(context) {
    const { src, targetUsers, ...settings } = context;

    const mediaSidebarSettings = game.modules.shareMedia.settings.get(
      CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaSidebarSettings,
    );

    // Dispatch only if sidebar settings allow it
    if (mediaSidebarSettings.layers[settings.mode])
      game.modules.shareMedia.ui.sidebar.storeMedia(src, targetUsers, settings);
    return context;
  }

  /* -------------------------------------------- */
  /*  Query Handlers
  /* -------------------------------------------- */

  /**
   * Initialize queries for incoming share media messages.
   */
  _registerUserQueries() {
    CONFIG.queries["share-media.renderLayer"] = this._renderLayer.bind(this);
  }

  /* -------------------------------------------- */

  /**
   * Handle incoming query message for layer rendering.
   * Instantiates the appropriate layer class based on the mode and renders it.
   * @param {Object}                    data          Query data containing mode and layer options.
   * @param {string}                    data.mode     The layer mode.
   * @param {parial<ShareablesOptions>} data.options  Additional options passed to the layer constructor.
   * @throws {Error} If the layer mode is unknown or not supported.
   */
  _renderLayer(data) {
    const { mode, ...options } = data;

    // Get the appropriate layer
    const LayerClass = game.modules.shareMedia.layers[mode];
    if (!LayerClass) throw new Error(`Unknown layer mode received via query: ${mode}`);

    // Instantiate and render the layer
    const layer = new LayerClass(options);
    layer.render({ force: true });
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured ShareablesManager implementation.
   * @type {typeof ShareablesManager}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.shareables.ShareablesManager;
    if (!isSubclass(Class, ShareablesManager)) {
      console.warn(
        "Configured ShareablesManager override must be a subclass of ShareablesManager.",
      );
      Class = ShareablesManager;
    }
    return Class;
  }
}
