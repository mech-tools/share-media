const { renderTemplate } = foundry.applications.handlebars;
const { isSubclass } = foundry.utils;

/**
 * Application responsible for displaying media in the chat.
 * @param {Object}     options                      Options which change how a media is displayed on the scene.
 * @param {string}     options.src                  Source URL of the media to share.
 * @param {string}     options.targetUsers          Users to send to.
 * @param {...unknown} [options.additionalOptions]  Others additional options.
 * @throws {Error} If basic arguments are not met.
 */
export default class ChatLayer {
  constructor(options) {
    // Check basic arguments
    if (!options.src || !options.targetUsers)
      throw new Error(
        'You must pass a valid "src" and "array of user ids" to instantiate the class "ChatLayer".',
      );

    // Assign optional arguments
    this.options = { ...options };
  }

  /* -------------------------------------------- */

  /**
   * The flag key to register media options on a chat message.
   * @type {string}
   */
  static MEDIA_FLAG_KEY = "media";

  /* -------------------------------------------- */
  /*  Rendering
  /* -------------------------------------------- */

  /**
   * Handle rendering a media in the chat.
   * @returns {Promise<Document | undefined>}
   */
  async render() {
    // Render the chat message template
    const isVideo = game.modules.shareMedia.utils.isVideo(this.options.src);
    const template = await renderTemplate(
      "modules/share-media/templates/layers/[layer]-media.hbs",
      {
        media: this.options.src,
        isVideo,
        ...(isVideo && { metadata: true, videoIcon: CONFIG.shareMedia.CONST.ICONS.play }),
        ...(this.options.caption && { caption: this.options.caption }),
      },
    );

    // Create the chat message
    // [NOTE] Flags are meant to be used by hooks to allow actions
    const { src, ...settings } = {
      ...this.options,
      mode: CONFIG.shareMedia.CONST.LAYERS_MODES.chat,
    };
    return ChatMessage.create({
      content: `<div class="shm">${template}</div>`,
      whisper: this.#getRecipients(),
      speaker: { alias: game.user.name },
      flags: { "share-media": { [this.constructor.MEDIA_FLAG_KEY]: { src, settings } } },
    });
  }

  /* -------------------------------------------- */
  /*  Helpers
  /* -------------------------------------------- */

  /**
   * Get the list of user ids to send to.
   * [INFO] "[]" is the foundry way to send a chat message to all users (no whisper)
   * @returns {string[]}
   */
  #getRecipients() {
    // If set to all users, return []
    if (this.options.optionValue === CONFIG.shareMedia.CONST.LAYERS_OPTIONS.usersAll.value)
      return [];

    // If set to a selection of users, return only the players or if no players only the gamemasters
    // [NOTE] Gamemasters always receive the whispers
    const players = this.options.targetUsers.filter((userId) => !game.users.get(userId)?.isGM);
    return players.length ? players : this.options.targetUsers;
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured ChatLayer implementation with mixins applied.
   * @type {typeof ChatLayer}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.layers.ChatLayer;
    if (!isSubclass(Class, ChatLayer)) {
      console.warn("Configured ChatLayer override must be a subclass of ChatLayer.");
      Class = ChatLayer;
    }
    return Class;
  }
}
