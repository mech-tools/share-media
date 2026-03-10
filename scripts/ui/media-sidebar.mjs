const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { AbstractSidebarTab } = foundry.applications.sidebar;
const { isSubclass, Semaphore, timeSince, Collection } = foundry.utils;
const { renderTemplate } = foundry.applications.handlebars;
const { queryMany } = User;

/**
 * Application responsible for displaying and interacting with media history.
 *
 * This application keeps in sync a server storage with a local storage.
 * When the server storage is updated, the local storage is also updated on each connected client.
 * The clients do NOT retrieve the server side storage upon each change.
 * @extends AbstractSidebarTab
 * @mixes HandlebarsApplication
 */
export default class MediaSidebar extends HandlebarsApplicationMixin(AbstractSidebarTab) {
  constructor(options = {}) {
    super(options);

    // Register queries
    if (!this.isPopout) this._registerUserQueries();
  }

  /* -------------------------------------------- */

  /**
   * Number of media to render with one batch.
   * @type {number}
   */
  static BATCH_SIZE = 10;

  /**
   * How often, in milliseconds, to update timestamps.
   * @type {number}
   */
  static UPDATE_TIMESTAMP_FREQUENCY = 1000 * 60;

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["directory", "flexcol"],
    position: {
      top: 15,
    },
    window: {
      title: "share-media.ui.sidebar.label",
      get icon() {
        return CONFIG.shareMedia.CONST.ICONS.sidebar;
      },
    },
    actions: {
      shareLink: MediaSidebar.#onShareLink,
      clearHistory: MediaSidebar.#onClearHistory,
      clearMedia: MediaSidebar.#onClearMedia,
      showMedia: MediaSidebar.#onShowMedia,
      shareMedia: MediaSidebar.#onShareMedia,
      jumpToBottom: MediaSidebar.#onJumpToBottom,
    },
  };

  /** @override */
  static tabName = "shm-media-sidebar";

  /** @override */
  static PARTS = {
    sidebar: { template: "modules/share-media/templates/ui/media-sidebar.hbs", root: true },
  };

  /**
   * Media sidebar settings configured by the user.
   * @type {typeof CONFIG.shareMedia.CONST.MEDIA_HISTORY_SETTINGS}
   */
  #sidebarSettings = game.modules.shareMedia.settings.get(
    CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaSidebarSettings,
  );

  /**
   * Has this sidebar been first viewed (activated)
   * @type {boolean}
   */
  #firstViewed = false;

  /**
   * Convenient reference to the media log HTML element.
   * @type {HTMLOListElement | null}
   */
  #mediaLog = null;

  /**
   * Convenient reference to the media loading message HTML element.
   * @type {HTMLSpanElement | null}
   */
  #mediaLoadingMessage = null;

  /**
   * A flag for whether the media log is currently scrolled to the bottom.
   * @type {boolean}
   */
  #isAtBottom = true;

  /**
   * The jump to bottom button.
   * @type {HTMLButtonElement | null}
   */
  #jumpToBottom = null;

  /**
   * Track the ID of the oldest media displayed in the log.
   * @type {string | null}
   */
  #lastId = null;

  /**
   * A semaphore to queue rendering of media.
   * @type {Semaphore}
   */
  #renderingQueue = new Semaphore(1);

  /**
   * Whether batch rendering is currently in-progress.
   * @type {boolean}
   */
  #renderingBatch = false;

  /* -------------------------------------------- */
  /*  Getters
  /* -------------------------------------------- */

  /**
   * The local media collection.
   * @type {Collection}
   */
  get mediaCollection() {
    return game["shm-media-collection"];
  }

  /* -------------------------------------------- */
  /*  Media History Management
  /* -------------------------------------------- */

  /**
   * @typedef {Object} HistoryMedia
   * @property {string}                                        id          ID of the media.
   * @property {number}                                        timestamp   Timestamp at which the media was stored.
   * @property {string}                                        src         Source URL of the media.
   * @property {typeof CONFIG.shareMedia.CONST.MEDIA_SETTINGS} [settings]  Default media settings.
   */

  /**
   * Store a media in the global history store (setting).
   * Avoid duplication and push modifications as the most recent.
   * This method then send queries to connected clients to sync their local collection.
   * @param {HistoryMedia["src"]}      src         Media src URL.
   * @param {HistoryMedia["settings"]} [settings]  Default media settings.
   * @returns {Promise<void>}
   */
  async storeMedia(src, settings = {}) {
    if (!game.users.current.isGM) return;

    // Prepare data, including a new collection
    const collection = new Collection(this.mediaCollection.entries());
    const key = game.modules.shareMedia.utils.escapeSource(src);
    const players = (settings.targetUsers ?? []).filter((userId) => !game.users.get(userId).isGM);
    let media;

    // Build a new media object from scrath or from an existing media in the collection
    if (collection.has(key)) {
      media = { ...collection.get(key) };
      media.timestamp = Date.now();
      media.settings = {
        ...settings,
        targetUsers: [...new Set([...media.settings.targetUsers, ...players])],
      };
      collection.delete(key);
    } else {
      media = {
        id: key,
        timestamp: Date.now(),
        src,
        settings: { ...settings, targetUsers: players },
      };
    }

    // Add this media to the collection and save it as the new media history
    collection.set(key, media);
    await this.#setRemoteStorage(collection);

    // Fire hooks
    Hooks.callAll("shareMedia.storeMedia", media, collection);

    // Notify active players (and all active gamemasters) of a new media
    const usersToQuery = game.users.filter(
      (user) => user.active && (user.isGM || media.settings.targetUsers.includes(user.id)),
    );
    queryMany(usersToQuery, "share-media.addMedia", media);
  }

  /* -------------------------------------------- */

  /**
   * Delete a media from the global history store (setting).
   * This method then send queries to connected clients to sync their local collection.
   * @param {string} id  The media ID to delete.
   * @returns {Promise<void>}
   */
  async deleteMedia(id) {
    if (!game.users.current.isGM) return;
    if (!this.mediaCollection.has(id)) return;

    // Prepare data, including a new collection
    const collection = new Collection(this.mediaCollection.entries());

    // Copy the target users before deletion
    const targetUsers = [...this.mediaCollection.get(id).settings.targetUsers];

    // Delete the media from the collection and save it as the new media history
    collection.delete(id);
    await this.#setRemoteStorage(collection);

    // Fire hooks
    Hooks.callAll("shareMedia.deleteMedia", id, collection);

    // Notify active players (and all active gamemasters) of the deletion
    const usersToQuery = game.users.filter(
      (user) => user.active && (user.isGM || targetUsers.includes(user.id)),
    );
    queryMany(usersToQuery, "share-media.removeMedia", { id, options: { animate: true } });
  }

  /* -------------------------------------------- */

  /**
   * Flush all media in the global history store (setting).
   * This method then send queries to connected clients to sync their local collection.
   * @returns {Promise<void>}
   */
  async deleteHistory() {
    if (!game.users.current.isGM) return;

    // Clear the media history collection by replacing it with an empty collection
    await this.#setRemoteStorage(new Collection([]));

    // Fire hooks
    Hooks.callAll("shareMedia.deleteHistory");

    // Notify active users of the flush
    const usersToQuery = game.users.filter((user) => user.active);
    queryMany(usersToQuery, "share-media.flushMedia");
  }

  /* -------------------------------------------- */

  /**
   * Set the server side storage with a new list of media.
   * @param {Map<string, HistoryMedia>} value  The new history.
   * @returns {Promise<Map<string, HistoryMedia>>}
   */
  async #setRemoteStorage(value) {
    if (!game.users.current.isGM) return;

    return game.settings.set(
      "share-media",
      CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaHistory,
      Object.fromEntries(value.entries()),
    );
  }

  /* -------------------------------------------- */
  /*  Media Rendering
  /* -------------------------------------------- */

  /**
   * Initialize queries for incoming media rendering messages.
   */
  _registerUserQueries() {
    CONFIG.queries["share-media.addMedia"] = this._addMedia.bind(this);
    CONFIG.queries["share-media.removeMedia"] = this._removeMedia.bind(this);
    CONFIG.queries["share-media.flushMedia"] = this._flushMedia.bind(this);
  }

  /* -------------------------------------------- */

  /**
   * Attempts to render a media in the sidebar, adding this operation to the queue.
   * @param {HistoryMedia} media  Media to display.
   * @returns {Promise<void>}
   * @see MediaSidebar#doAddMedia.
   */
  async _addMedia(media) {
    // Sync the current collection of media, removing any existing media in the collection
    if (!this.isPopout && this.mediaCollection.has(media.id)) this.mediaCollection.delete(media.id);
    if (!this.isPopout) this.mediaCollection.set(media.id, media);

    // Do not got further is the user can't access the sidebar
    if (!this.#sidebarSettings.enabled) return;
    if (this.#sidebarSettings.gmOnly && !game.users.current.isGM) return;
    return this.#renderingQueue.add(async () => {
      // Removing any existing media element first
      await this.#doRemoveMedia(media.id);
      await this.#doAddMedia(media);
    });
  }

  /* -------------------------------------------- */

  /**
   * Render a media, appending it to the bottom of the log.
   * @param {HistoryMedia} media  Media to display.
   * @returns {Promise<void>}
   */
  async #doAddMedia(media) {
    if (!this.rendered) return;

    // Internal flag: if no media, then this media become the first
    if (!this.#lastId) this.#lastId = media.id;

    // Process and render the media
    const doc = await this._processAndRenderMedia([media]);

    // Insert into DOM and scroll to bottom if already at bottom
    const wasAtBottom = this.#isAtBottom;
    this.#mediaLog.append(...doc.body.childNodes);
    if (wasAtBottom) this.scrollBottom();

    // Do the same with the popout tab
    this.popout?._addMedia(media);
    if (this.isPopout) this.setPosition();
  }

  /* -------------------------------------------- */

  /**
   * Attempts to remove a media from the sidebar, adding this operation to the queue.
   * @param {Object}             data            Query arguments.
   * @param {HistoryMedia["id"]} data.id         Media ID to remove.
   * @param {Object}             [data.options]  Options which modifies the behavior.
   * @returns {Promise<void>}
   * @see MediaSidebar#doRemoveMedia.
   */
  async _removeMedia({ id, options = {} }) {
    // Sync the current collection of media
    if (!this.isPopout && this.mediaCollection.has(id)) this.mediaCollection.delete(id);

    // Do not got further is the user can't access the sidebar
    if (!this.#sidebarSettings.enabled) return;
    if (this.#sidebarSettings.gmOnly && !game.users.current.isGM) return;
    return this.#renderingQueue.add(this.#doRemoveMedia.bind(this), id, options);
  }

  /* -------------------------------------------- */

  /**
   * Remove a media from the log.
   * @param {HistoryMedia["id"]} id                 Media ID to remove.
   * @param {Object}             [options]          Options which modifies the behavior.
   * @param {boolean}            [options.animate]  Should this deletion been animated.
   * @returns {Promise<void>}
   */
  async #doRemoveMedia(id, { animate = false } = {}) {
    if (!this.rendered) return;

    // Get the media element
    const li = this.#mediaLog.querySelector(`li[data-media-id="${id}"]`);

    if (li) {
      // Update the last index
      if (id === this.#lastId) this.#lastId = li.nextElementSibling?.dataset.mediaId ?? null;

      // Helper function to remove the element
      const removeAndScroll = () => {
        li.remove();
        this.#onScrollLog();
        if (this.isPopout) this.setPosition();
      };

      // Animate the deletion if requested
      if (animate) {
        li.classList.add("deleting");
        li.animate(
          { height: [`${li.getBoundingClientRect().height}px`, "0"] },
          { duration: 250, easing: "ease" },
        ).finished.then(() => {
          removeAndScroll();
        });
      } else {
        removeAndScroll();
      }
    }

    // Do the same with the popout tab
    this.popout?._removeMedia({ id, options: { animate } });
  }

  /* -------------------------------------------- */

  /**
   * Attempts to remove all media from the sidebar, adding this operation to the queue.
   * @returns {Promise<void>}
   * @see MediaSidebar#doFlushMedia.
   */
  async _flushMedia() {
    // Sync the current collection of media
    if (!this.isPopout) this.mediaCollection.clear();

    // Do not got further is the user can't access the sidebar
    if (!this.#sidebarSettings.enabled) return;
    if (this.#sidebarSettings.gmOnly && !game.users.current.isGM) return;
    return this.#renderingQueue.add(this.#doFlushMedia.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Remove all media from the log.
   * @returns {Promise<void>}
   */
  async #doFlushMedia() {
    if (!this.rendered) return;

    // Remove all media elements
    this.#mediaLog.innerHTML = "";

    // Do the same with the popout tab
    this.popout?._flushMedia();
    if (this.isPopout) this.setPosition();
  }

  /* -------------------------------------------- */

  /**
   * Attempt to render a new batch of media, adding this operation to the queue.
   * @param {number} size  The batch size.
   * @returns {Promise<void>}
   * @see MediaSidebar#doRenderBatch.
   */
  async _renderBatch(size) {
    if (this.#renderingBatch) return;
    if (!this.#sidebarSettings.enabled) return;
    if (this.#sidebarSettings.gmOnly && !game.users.current.isGM) return;
    this.#renderingBatch = true;
    return this.#renderingQueue.add(this.#doRenderBatch.bind(this), size);
  }

  /* -------------------------------------------- */

  /**
   * Render a batch of additional media, prepending them to the top of the log.
   * @param {number} size  The batch size.
   * @returns {Promise<void>}
   */
  async #doRenderBatch(size) {
    if (!this.rendered) {
      this.#renderingBatch = false;
      return;
    }

    // Media store filtered for the current user (gamemasters can see all media)
    const mediaList = game.users.current.isGM
      ? this.mediaCollection.contents
      : this.mediaCollection.contents.filter((media) =>
          media.settings.targetUsers.includes(game.users.current.id),
        );

    // Get the index of the last rendered media
    // If the index is the last or there is no media, return early
    let lastIdx = mediaList.findIndex((media) => media.id === this.#lastId);
    lastIdx = lastIdx > -1 ? lastIdx : mediaList.length;
    if (!lastIdx) {
      this.#renderingBatch = false;
      return;
    }

    // Display the loading state, delaying with a few milliseconds
    // Made to avoid blinking in case of blazing fast loading or cached media
    setTimeout(() => {
      if (this.#renderingBatch) this.#mediaLoadingMessage.removeAttribute("hidden");
    }, 50);

    // Create a new slice accordind to the request batch size
    const targetIdx = Math.max(lastIdx - size, 0);
    const mediaListBatched = mediaList.slice(targetIdx, lastIdx);

    // Process and render the media batch
    const doc = await this._processAndRenderMedia(mediaListBatched);

    // Add to DOM and hide loading state
    this.#mediaLog.prepend(...doc.body.childNodes);
    this.#mediaLoadingMessage.setAttribute("hidden", "");

    // Set necessary data for future batches
    this.#lastId = mediaListBatched.at(0).id;
    this.#renderingBatch = false;
  }

  /* -------------------------------------------- */
  /*  Context
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    return {
      ...(await super._prepareContext(options)),
      icons: CONFIG.shareMedia.CONST.ICONS,
    };
  }

  /* -------------------------------------------- */
  /*  Action Event Handlers
  /* -------------------------------------------- */

  /**
   * Handle sharing a media via a link.
   * @param {PointerEvent} _event   The triggering event.
   * @param {HTMLElement}  _target  The targeted DOM element.
   * @returns {Promise<void>}
   * @this {MediaSidebar}
   */
  static async #onShareLink(_event, _target) {
    await new game.modules.shareMedia.shareables.apps.shareSelector({ link: true }).render({
      force: true,
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle clearing the media history.
   * @param {PointerEvent} _event   The triggering event.
   * @param {HTMLElement}  _target  The targeted DOM element.
   * @returns {Promise<void>}
   * @this {MediaSidebar}
   */
  static async #onClearHistory(_event, _target) {
    if (!game.users.current.isGM) return;

    const confirm = await DialogV2.confirm({
      window: {
        title: "share-media.ui.sidebar.label",
        icon: CONFIG.shareMedia.CONST.ICONS.clear,
      },
      content: `<p>${_loc("share-media.ui.sidebar.header.clear.description")}</p>`,
    });

    // Proceed only if confirmed
    if (confirm) {
      this.deleteHistory();
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle clearing of a media from the history.
   * @param {PointerEvent} _event  The triggering event.
   * @param {HTMLElement}  target  The targeted DOM element.
   * @this {MediaSidebar}
   */
  static #onClearMedia(_event, target) {
    if (!game.users.current.isGM) return;

    const { mediaId } = target.closest("[data-media-id]")?.dataset ?? {};
    const media = this.mediaCollection.get(mediaId);
    if (media) this.deleteMedia(media.id);
  }

  /* -------------------------------------------- */

  /**
   * Handle showing a media.
   * @param {PointerEvent} _event  The triggering event.
   * @param {HTMLElement}  target  The targeted DOM element.
   * @returns {Promise<void>}
   * @this {MediaSidebar}
   */
  static async #onShowMedia(_event, target) {
    const { mediaId } = target.dataset ?? {};
    const media = this.mediaCollection.get(mediaId);
    if (!media) return;

    // Display it in a popout
    const mode = CONFIG.shareMedia.CONST.LAYERS_MODES.popout;

    // Get the default settings
    const settings = game.modules.shareMedia.settings.get(
      CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaSettings,
    );

    // Populate default settings with media settings
    game.modules.shareMedia.utils.applySettingsToMediaOptions(mode, { settings }, media.settings);

    // Get the settings for the mode
    const optionsSettings = game.modules.shareMedia.utils.getMediaSettings(
      media.src,
      mode,
      settings,
    );

    // Render the popout window
    const layer = new game.modules.shareMedia.layers[mode]({
      src: media.src,
      ...optionsSettings,
    });
    await layer.render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle sharing again a media.
   * @param {PointerEvent} _event  The triggering event.
   * @param {HTMLElement}  target  The targeted DOM element.
   * @returns {Promise<void>}
   * @this {MediaSidebar}
   */
  static async #onShareMedia(_event, target) {
    if (!game.users.current.isGM) return;

    const li = target.closest(".media-item[data-media-id]");
    const media = this.mediaCollection.get(li?.dataset?.mediaId);
    if (!media?.id) return;
    await new game.modules.shareMedia.shareables.apps.shareSelector({
      src: media.src,
      settings: media.settings,
    }).render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle jump to bottom action.
   * @param {PointerEvent} _event   The triggering event.
   * @param {HTMLElement}  _target  The targeted DOM element.
   * @returns {Promise<void>}
   * @this {MediaSidebar}
   */
  static async #onJumpToBottom(_event, _target) {
    this.scrollBottom();
  }

  /* -------------------------------------------- */
  /*  Other Event Handlers
  /* -------------------------------------------- */

  /**
   * Handle scroll events within the media log.
   * @param {UIEvent} [event]  A triggering scroll event.
   */
  #onScrollLog(event) {
    if (!this.rendered) return;
    const log = event?.currentTarget ?? this.#mediaLog;
    const pct = log.scrollTop / (log.scrollHeight - log.clientHeight);
    this.#isAtBottom = pct > 0.99 || Number.isNaN(pct);
    this.#jumpToBottom.toggleAttribute("hidden", this.#isAtBottom);
    log.classList.toggle("scrolled", !this.#isAtBottom);
    const top = log.querySelector("li.media-item");
    if (pct < 0.01) {
      this._renderBatch(this.constructor.BATCH_SIZE).then(() => {
        // Retain the scroll position at the top-most element before the extra media were prepended to the log.
        if (top) log.scrollTop = top.offsetTop;
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Update displayed timestamps for every displayed within the HTML element.
   * Timestamps are displayed in a humanized "time-since" format.
   * @param {Document} element  Element to parse.
   */
  #updateTimestamps(element) {
    for (const li of element.querySelectorAll(".media-item[data-media-id]")) {
      const media = this.mediaCollection.get(li?.dataset?.mediaId);
      if (!media?.timestamp) return;
      const stamp = li.querySelector(".media-timestamp");
      if (stamp) stamp.textContent = timeSince(media.timestamp);
    }
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * If the log has already been rendered once, prevent it from being re-rendered.
   * @inheritdoc
   */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if (this.rendered) options.parts = [];
  }

  /* -------------------------------------------- */

  /**
   * Store convenient references and attach a scroll listener to the media log.
   * @inheritdoc
   */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.#mediaLog = this.element.querySelector(".media-log");
    this.#mediaLoadingMessage = this.element.querySelector(".loading");
    this.#jumpToBottom = this.element.querySelector(".jump-to-bottom");
    this.#mediaLog.addEventListener("scroll", this.#onScrollLog.bind(this), { passive: true });
    if (!this.isPopout) {
      setInterval(
        this.#updateTimestamps.bind(this, document),
        this.constructor.UPDATE_TIMESTAMP_FREQUENCY,
      );
    }
  }

  /* -------------------------------------------- */

  /**
   * Attempt to render the first batch.
   * Only if popout mode as it is immediately visible.
   * Deferring first batch render to "_onActivate" if sidebar mode {@link MediaSidebar._onActivate}.
   * @inheritdoc
   */
  async _postRender(context, options) {
    await super._postRender(context, options);
    if (options.isFirstRender && this.isPopout) {
      this._renderBatch(this.constructor.BATCH_SIZE).then(() => this.scrollBottom());
    }
  }

  /* -------------------------------------------- */

  /**
   * Cleanup references.
   * @inheritdoc
   */
  _onClose(options) {
    super._onClose(options);
    this.#mediaLog = null;
    this.#mediaLoadingMessage = null;
    this.#jumpToBottom = null;
    this.#lastId = null;
  }

  /* -------------------------------------------- */
  /*  Sidebar Management
  /* -------------------------------------------- */

  /**
   * Attempt to render the first batch.
   * Only if sidebar mode as it is NOT immediately visible ("display: none").
   * Delaying the render of the first batch to this so we don't load unnecessary media into DOM.
   * This gets executed only once.
   * @inheritdoc
   */
  _onActivate() {
    super._onActivate();
    if (!this.#firstViewed && !this.isPopout) {
      this.#firstViewed = true;
      this._renderBatch(this.constructor.BATCH_SIZE).then(() => this.scrollBottom());
    }
  }

  /* -------------------------------------------- */

  /**
   * Scroll the media log to the bottom.
   */
  scrollBottom() {
    if (!this.rendered) return;
    // [NOTE] wait a tiny bit then wait for the next animation frame,
    // force reflow, then wait for the next animation frame
    // Couldn't find another way to force scroll to the very bottom with media painting
    setTimeout(async () => {
      await game.modules.shareMedia.utils.nextAnimationFrames();
      this.#mediaLog.scrollHeight;
      await game.modules.shareMedia.utils.nextAnimationFrames();
      this.#mediaLog.scrollTop = 0x7fffffbf;
    }, 10);
  }

  /* -------------------------------------------- */
  /*  Helpers
  /* -------------------------------------------- */

  /**
   * Processes and renders media objects into a ready-to-use DOM document.
   * This method enriches media with user information, renders the template,
   * preloads media elements, and updates timestamps.
   * @param {HistoryMedia[]} mediaList  Array of media objects to process and render.
   * @returns {Promise<Document>}
   */
  async _processAndRenderMedia(mediaList) {
    // Enrich media with user information (only for gamemasters)
    const enrichedMediaList = mediaList.map((media) => ({
      ...media,
      isVideo: game.modules.shareMedia.utils.isVideo(media.src),
      targetUsers: game.users.current.isGM
        ? media.settings.targetUsers?.reduce((acc, userId) => {
            const user = game.users.get(userId);
            if (user) acc.push({ color: user.color, name: user.name });
            return acc;
          }, []) || []
        : media.settings.targetUsers,
    }));

    // Render the template as a string
    const template = await renderTemplate(
      "modules/share-media/templates/ui/media-sidebar-list.hbs",
      {
        isGM: game.users.current.isGM,
        icons: CONFIG.shareMedia.CONST.ICONS,
        mediaList: enrichedMediaList,
      },
    );

    // Parse template and preload all media elements
    const doc = await this.#parseAndPreloadTemplate(template);

    // Update media timestamps
    this.#updateTimestamps(doc);
    return doc;
  }

  /* -------------------------------------------- */

  /**
   * Parse a template HTML string and preload all media elements.
   * This method will create proxy HTML elements to load media inside a virtual DOM before returning.
   * This allows to preload media before inserting them to DOM.
   * @param {string} template  The HTML template string to parse.
   * @returns {Promise<Document>}
   */
  async #parseAndPreloadTemplate(template) {
    // Parse template HTML string into a document
    const doc = new DOMParser().parseFromString(template, "text/html");

    // Get all media elements
    const mediaElements = doc.body.querySelectorAll("img, video");

    // Array of future promises to resolve
    const loadPromises = [];

    // Iterate over each media and create a JS proxy element, setting up load and error listeners
    // Once the proxies are set up and loading, add the real "src" to the actual media element
    // [NOTE] Videos are preloaded with "metadata" only
    for (const media of mediaElements) {
      const src = media.dataset.src;
      if (!src) continue;

      const isVideo = media.tagName === "VIDEO";
      const preloader = isVideo ? document.createElement("video") : new Image();

      if (isVideo) preloader.preload = "metadata";

      const loadPromise = new Promise((resolve) => {
        preloader[isVideo ? "onloadedmetadata" : "onload"] = resolve;
        preloader.onerror = resolve;
        preloader.src = src;
      });

      loadPromises.push(loadPromise);
      media.src = src;
      delete media.dataset.src;
    }

    // Resolve all promises then return
    await Promise.all(loadPromises);
    return doc;
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured MediaSidebar implementation.
   * @type {typeof MediaSidebar}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.ui.MediaSidebar;
    if (!isSubclass(Class, MediaSidebar)) {
      console.warn("Configured MediaSidebar override must be a subclass of MediaSidebar.");
      Class = MediaSidebar;
    }
    return Class;
  }
}
