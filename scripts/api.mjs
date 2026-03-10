/** @typedef {import("./shareables/apps/share-selector.mjs").default} ShareSelector */

/**
 * Class responsible for exposing quick and simple methods for media sharing.
 */
export default class Api {
  /* -------------------------------------------- */
  /*  Share Selector
  /* -------------------------------------------- */

  /**
   * Spawn a media sharing window allowing the user to share a media with the selected configuration.
   * @param {string}  src                     Source URL of the media to share.
   * @param {Object}  [settings]              Default settings to apply to the application form.
   * @param {string}  [settings.mode]         Default sharing mode (options are: "popout", "fullscreen", "chat", "scene").
   * @param {string}  [settings.optionName]   Default option name associated to the default mode.
   * @param {string}  [settings.optionValue]  Default option value associated to the default mode.
   * @param {string}  [settings.targetArea]   Default region or tile uuid to display to ("scene" mode only).
   * @param {boolean} [settings.caption]      Default caption option ("popout" and "fullscreen" modes only).
   * @param {boolean} [settings.darkness]     Default darkness option ("popout" and "fullscreen" modes only).
   * @param {boolean} [settings.immersive]    Default immersive option ("fullscreen" mode only).
   * @param {boolean} [settings.controls]     Default controls option ("fullscreen" mode only).
   * @param {boolean} [settings.loop]         Default video loop option (video only).
   * @param {boolean} [settings.mute]         Default video mute option (video only).
   * @returns {Promise<ShareSelector> | void}
   * @example
   *   // Share a simple image
   *   await game.modules.shareMedia.api.share("https://foundry.vtt/image.jpg");
   *
   * @example
   *   // Share with popout mode to all users
   *   await game.modules.shareMedia.api.share("https://foundry.vtt/video.mp4", {
   *     mode: "popout",
   *     optionName: "users",
   *     optionValue: "all",
   *   });
   *
   * @example
   *   // Share with chat mode to all users
   *   await game.modules.shareMedia.api.share("https://foundry.vtt/video.mp4", {
   *     mode: "chat",
   *     optionName: "users",
   *     optionValue: "all",
   *   });
   *
   * @example
   *   // Share in fullscreen mode with darkness and immersive settings to selected users
   *   await game.modules.shareMedia.api.share("https://foundry.vtt/image.jpg", {
   *     mode: "fullscreen",
   *     optionName: "users",
   *     optionValue: "selection",
   *     darkness: true,
   *     immersive: false,
   *   });
   *
   * @example
   *   // Share to scene with display "fit" settings
   *   await game.modules.shareMedia.api.share("https://foundry.vtt/background.jpg", {
   *     mode: "scene",
   *     optionName: "display",
   *     optionValue: "fit",
   *   });
   *
   * @example
   *   // Share a video in fullscreen mode with loop and mute settings
   *   await game.modules.shareMedia.api.share("https://foundry.vtt/video.mp4", {
   *     mode: "fullscreen",
   *     optionName: "users",
   *     optionValue: "all",
   *     loop: true,
   *     mute: true,
   *   });
   *
   */
  static share(src, settings = {}) {
    if (!game.users.current.isGM) return;

    const shareSelector = new game.modules.shareMedia.shareables.apps.shareSelector({
      src,
      settings,
    });
    return shareSelector.render({ force: true });
  }

  /* -------------------------------------------- */
  /*  Popout window
  /* -------------------------------------------- */

  /**
   * Share a media to all active users in a popout window.
   * @param {Object}  options             Options which may changed how the media is shared.
   * @param {string}  options.src         Source URL of the media to share.
   * @param {string}  [options.caption]   Caption to display.
   * @param {boolean} [options.darkness]  Should darkness be applied.
   * @param {boolean} [options.loop]      Should the video be looped (video only)
   * @param {boolean} [options.mute]      should the video be muted (video only)
   * @returns {Promise<boolean> | void}
   * @example
   *   // Share an image with popout mode to all users
   *   await game.modules.shareMedia.api.popoutToAllUsers({
   *     src: "https://foundry.vtt/image.jpg",
   *   });
   *
   * @example
   *   // Share a muted video with caption and darkness to all users
   *   await game.modules.shareMedia.api.popoutToAllUsers({
   *     src: "https://foundry.vtt/video.mp4",
   *     caption: "Epic battle scene",
   *     darkness: true,
   *     mute: true,
   *   });
   *
   */
  static popoutToAllUsers(options = {}) {
    if (!game.users.current.isGM) return;

    options.mode = CONFIG.shareMedia.CONST.LAYERS_MODES.popout;
    options.optionName = CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersAll.name;
    options.optionValue = CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersAll.value;
    return game.modules.shareMedia.shareables.manager.dispatch(options);
  }

  /* -------------------------------------------- */

  /**
   * Share a media to a selection of active users in a popout window.
   * @param {Object}  options             Options which may changed how the media is shared.
   * @param {string}  options.src         Source URL of the media to share.
   * @param {string}  [options.caption]   Caption to display.
   * @param {boolean} [options.darkness]  Should darkness be applied.
   * @param {boolean} [options.loop]      Should the video be looped (video only)
   * @param {boolean} [options.mute]      should the video be muted (video only)
   * @returns {Promise<boolean> | void}
   * @example
   *   // Share an image with popout mode to selected users
   *   await game.modules.shareMedia.api.popoutToSomeUsers({
   *     src: "https://foundry.vtt/image.jpg",
   *   });
   *
   * @example
   *   // Share a looping video with caption and darkness to selected users
   *   await game.modules.shareMedia.api.popoutToSomeUsers({
   *     src: "https://foundry.vtt/video.mp4",
   *     caption: "Secret scene for players",
   *     darkness: true,
   *     loop: true,
   *   });
   *
   */
  static popoutToSomeUsers(options = {}) {
    if (!game.users.current.isGM) return;

    options.mode = CONFIG.shareMedia.CONST.LAYERS_MODES.popout;
    options.optionName = CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersSelection.name;
    options.optionValue = CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersSelection.value;
    return game.modules.shareMedia.shareables.manager.dispatch(options);
  }

  /* -------------------------------------------- */
  /*  Fullscreen
  /* -------------------------------------------- */

  /**
   * Share a media to all active users in fullscreen.
   * @param {Object}  options              Options which may changed how the media is shared.
   * @param {string}  options.src          Source URL of the media to share.
   * @param {string}  [options.caption]    Caption to display.
   * @param {boolean} [options.immersive]  Should immersive mode be applied.
   * @param {boolean} [options.controls]   Should player controls be displayed.
   * @param {boolean} [options.darkness]   Should darkness be applied.
   * @param {boolean} [options.loop]       Should the video be looped (video only)
   * @param {boolean} [options.mute]       should the video be muted (video only)
   * @returns {Promise<boolean> | void}
   * @example
   *   // Share an image with fullscreen mode to all users
   *   await game.modules.shareMedia.api.fullscreenToAllUsers({
   *     src: "https://foundry.vtt/image.jpg",
   *   });
   *
   * @example
   *   // Share a video with caption, immersive mode and darkness
   *   await game.modules.shareMedia.api.fullscreenToAllUsers({
   *     src: "https://foundry.vtt/video.mp4",
   *     caption: "Dramatic reveal",
   *     immersive: true,
   *     darkness: true,
   *   });
   *
   */
  static fullscreenToAllUsers(options = {}) {
    if (!game.users.current.isGM) return;

    options.mode = CONFIG.shareMedia.CONST.LAYERS_MODES.fullscreen;
    options.optionName = CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersAll.name;
    options.optionValue = CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersAll.value;
    return game.modules.shareMedia.shareables.manager.dispatch(options);
  }

  /* -------------------------------------------- */

  /**
   * Share a media to a selection of active users in fullscreen.
   * @param {Object}  options              Options which may changed how the media is shared.
   * @param {string}  options.src          Source URL of the media to share.
   * @param {string}  [options.caption]    Caption to display.
   * @param {boolean} [options.immersive]  Should immersive mode be applied.
   * @param {boolean} [options.controls]   Should player controls be displayed.
   * @param {boolean} [options.darkness]   Should darkness be applied.
   * @param {boolean} [options.loop]       Should the video be looped (video only)
   * @param {boolean} [options.mute]       should the video be muted (video only)
   * @returns {Promise<boolean> | void}
   * @example
   *   // Share an image with fullscreen mode to selected users
   *   await game.modules.shareMedia.api.fullscreenToSomeUsers({
   *     src: "https://foundry.vtt/image.jpg",
   *   });
   *
   * @example
   *   // Share a looping, muted video with darkness and caption for selected users
   *   await game.modules.shareMedia.api.fullscreenToSomeUsers({
   *     src: "https://foundry.vtt/video.mp4",
   *     caption: "Private cutscene",
   *     darkness: true,
   *     loop: true,
   *     mute: true,
   *   });
   *
   */
  static fullscreenToSomeUsers(options = {}) {
    if (!game.users.current.isGM) return;

    options.mode = CONFIG.shareMedia.CONST.LAYERS_MODES.fullscreen;
    options.optionName = CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersSelection.name;
    options.optionValue = CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersSelection.value;
    return game.modules.shareMedia.shareables.manager.dispatch(options);
  }

  /* -------------------------------------------- */
  /*  Chat
  /* -------------------------------------------- */

  /**
   * Share a media to all active users in the chat.
   * @param {Object}  options         Options which may changed how the media is shared.
   * @param {string}  options.src     Source URL of the media to share.
   * @param {boolean} [options.loop]  Should the video be looped (video only)
   * @param {boolean} [options.mute]  should the video be muted (video only)
   * @returns {Promise<boolean> | void}
   * @example
   *   // Share an image with chat mode to all users
   *   await game.modules.shareMedia.api.chatToAllUsers({
   *     src: "https://foundry.vtt/image.jpg",
   *   });
   *
   */
  static chatToAllUsers(options = {}) {
    if (!game.users.current.isGM) return;

    options.mode = CONFIG.shareMedia.CONST.LAYERS_MODES.chat;
    options.optionName = CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersAll.name;
    options.optionValue = CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersAll.value;
    return game.modules.shareMedia.shareables.manager.dispatch(options);
  }

  /* -------------------------------------------- */

  /**
   * Share a media to a selection of active users in the chat.
   * @param {Object}  options         Options which may changed how the media is shared.
   * @param {string}  options.src     Source URL of the media to share.
   * @param {boolean} [options.loop]  Should the video be looped (video only)
   * @param {boolean} [options.mute]  should the video be muted (video only)
   * @returns {Promise<boolean> | void}
   * @example
   *   // Share an image with chat mode to selected users
   *   await game.modules.shareMedia.api.chatToSomeUsers({
   *     src: "https://foundry.vtt/image.jpg",
   *   });
   *
   */
  static chatToSomeUsers(options = {}) {
    if (!game.users.current.isGM) return;

    options.mode = CONFIG.shareMedia.CONST.LAYERS_MODES.chat;
    options.optionName = CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersSelection.name;
    options.optionValue = CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersSelection.value;
    return game.modules.shareMedia.shareables.manager.dispatch(options);
  }

  /* -------------------------------------------- */
  /*  Scene
  /* -------------------------------------------- */

  /**
   * Share a media to the scene with "fit" mode.
   * @param {Object}  options               Options which may changed how the media is shared.
   * @param {string}  options.src           Source URL of the media to share.
   * @param {string}  [options.targetArea]  Region or tile uuid to display to.
   * @param {boolean} [options.loop]        Should the video be looped (video only)
   * @param {boolean} [options.mute]        should the video be muted (video only)
   * @returns {Promise<boolean> | void}
   * @example
   *   // Share an image to scene with "fit" mode
   *   await game.modules.shareMedia.api.sceneFit({
   *     src: "https://foundry.vtt/background.jpg",
   *   });
   *
   * @example
   *   // Share a looping video to a specific region in "fit" mode
   *   await game.modules.shareMedia.api.sceneFit({
   *     src: "https://foundry.vtt/video.mp4",
   *     targetArea: "region-uuid-123",
   *     loop: true,
   *   });
   *
   */
  static sceneFit(options = {}) {
    if (!game.users.current.isGM) return;

    options.mode = CONFIG.shareMedia.CONST.LAYERS_MODES.scene;
    options.optionName = CONFIG.shareMedia.CONST.LAYERS_OPTIONS.displayFit.name;
    options.optionValue = CONFIG.shareMedia.CONST.LAYERS_OPTIONS.displayFit.value;
    return game.modules.shareMedia.shareables.manager.dispatch(options);
  }

  /* -------------------------------------------- */

  /**
   * Share a media to the scene with "fill" mode.
   * @param {Object}  options               Options which may changed how the media is shared.
   * @param {string}  options.src           Source URL of the media to share.
   * @param {string}  [options.targetArea]  Region or tile uuid to display to.
   * @param {boolean} [options.loop]        Should the video be looped (video only)
   * @param {boolean} [options.mute]        should the video be muted (video only)
   * @returns {Promise<boolean> | void}
   * @example
   *   // Share an image to scene with "fill" mode
   *   await game.modules.shareMedia.api.sceneFill({
   *     src: "https://foundry.vtt/background.jpg",
   *   });
   *
   * @example
   *   // Share a muted video to scene with "fill" mode
   *   await game.modules.shareMedia.api.sceneFill({
   *     src: "https://foundry.vtt/video.mp4",
   *     mute: true,
   *   });
   *
   */
  static sceneFill(options = {}) {
    if (!game.users.current.isGM) return;

    options.mode = CONFIG.shareMedia.CONST.LAYERS_MODES.scene;
    options.optionName = CONFIG.shareMedia.CONST.LAYERS_OPTIONS.displayFill.name;
    options.optionValue = CONFIG.shareMedia.CONST.LAYERS_OPTIONS.displayFill.value;
    return game.modules.shareMedia.shareables.manager.dispatch(options);
  }
}
