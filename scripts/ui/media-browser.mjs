const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { implementation: FilePicker } = foundry.applications.apps.FilePicker;
const { implementation: DragDrop } = foundry.applications.ux.DragDrop;
const { SearchFilter } = foundry.applications.ux;
const { isSubclass, escapeHTML } = foundry.utils;

/**
 * A media browser application that displays an expandable folder tree and the image/video files of the currently selected
 * directory.
 * Only the "data" source is supported.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 */
export default class MediaBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);

    // If one instance already exists, return it
    if (MediaBrowser._instance) return MediaBrowser._instance;
    MediaBrowser._instance = this;
  }

  /* -------------------------------------------- */

  /**
   * The currently selected directory path.
   * [NOTE] Initialized to "LAST_STATE.target" to pick up where we left off.
   * @type {string}
   */
  target = this.constructor.LAST_STATE.target;

  /**
   * Whether the files names are displayed or not.
   * @type {boolean}
   */
  displayNames = this.constructor.LAST_STATE.displayNames;

  /**
   * The currently sidebar expanded state.
   * @type {boolean}
   */
  sidebarExpanded = this.constructor.LAST_STATE.sidebarExpanded;

  /**
   * Layout options.
   * @type {{ [number]: string }}
   */
  layouts = {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
  };

  /**
   * The current layout.
   * @type {number}
   */
  layout = this.constructor.LAST_STATE.layout;

  /**
   * @typedef {Object} Node
   * @property {string}          path      Full path of the node.
   * @property {string}          name      Name of the file or folder.
   * @property {Node[] | null}   children  Array of child nodes (folders) or null.
   * @property {Object[] | null} files     Array of file objects or null.
   * @property {boolean}         expanded  Whether the node is expanded in the tree.
   */

  /**
   * Folders and files cache.
   * @type {Map<string, Node>}
   */
  nodes = new Map();

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "shm-media-browser",
    window: {
      title: "share-media.ui.browser.label",
      get icon() {
        return `fa ${CONFIG.shareMedia.CONST.ICONS.mediaBrowser}`;
      },
      resizable: true,
    },
    position: { height: 550 },
    actions: {
      backTraverse: MediaBrowser.#onBackTraverse,
      createDirectory: MediaBrowser.#onCreateDirectory,
      toggleSidebar: MediaBrowser.#onToggleSidebar,
      toggleDir: MediaBrowser.#onToggleDir,
      showMedia: MediaBrowser.#onShowMedia,
      toggleNames: MediaBrowser.#onToggleNames,
    },
  };

  /** @override */
  static PARTS = {
    header: { template: "modules/share-media/templates/ui/browser-header.hbs" },
    sidebar: {
      template: "modules/share-media/templates/ui/browser-sidebar.hbs",
      scrollable: [""],
    },
    body: {
      template: "modules/share-media/templates/ui/browser-body.hbs",
      scrollable: [""],
    },
  };

  /**
   * Allowed media file extensions.
   * @type {string[]}
   */
  static MEDIA_EXTENSIONS = [
    ...Object.keys(CONST.IMAGE_FILE_EXTENSIONS),
    ...Object.keys(CONST.VIDEO_FILE_EXTENSIONS),
  ].map((ext) => `.${ext}`);

  /**
   * Last known browser state.
   * @type {{
   *   target: string;
   *   sidebarExpanded: boolean;
   *   position: { top: number; left: number; width: number; height: number } | null;
   *   layout: number;
   * }}
   */
  static LAST_STATE = {
    target: "",
    sidebarExpanded: true,
    position: null,
    displayNames: false,
    layout: 2,
  };

  /**
   * Scrollbar width, stored so it is not calculated again.
   * @type {number | null}
   */
  static SCROLLBAR_WIDTH = null;

  /**
   * Current instance.
   * @type {MediaBrowser | null}
   */
  static _instance = null;

  /**
   * Search filter used to filter through file names.
   * @type {typeof SearchFilter}
   */
  #search = new SearchFilter({
    inputSelector: "input[name=filter]",
    contentSelector: "section.body",
    callback: this._onSearchFilter.bind(this),
  });

  /**
   * Drag counter.
   * Prevent children to fire unwanted events.
   * @type {number}
   */
  #dragCounter = 0;

  /* -------------------------------------------- */
  /*  Permissions
  /* -------------------------------------------- */

  /**
   * Whether the current user is able to create folders.
   * [NOTE] Code adapted from Foundry sources.
   * @type {boolean}
   */
  get canCreateFolder() {
    // Prevent uploading into the root package directories.
    if (["worlds", "systems", "modules"].includes(this.target)) return false;
    // Prevent uploading into a world or system that is not this one.
    for (const [pkg, path] of [
      [game.world, "worlds/"],
      [game.system, "systems/"],
    ]) {
      if (pkg && this.target.startsWith(path)) {
        const [, id] = this.target.split("/");
        if (id !== pkg.id) return false;
      }
    }
    // Prevent uploading into a module or system directory unless the canUpload flag is present.
    if (this.target.startsWith("systems/") || this.target.startsWith("modules/")) {
      const [type, id] = this.target.split("/");
      const pkg =
        type === "systems" ? (game.system ?? game.systems?.get(id)) : game.modules.get(id);
      if (!pkg?.flags.canUpload) return false;
    }
    return game.user?.can("FILES_UPLOAD") !== false;
  }

  /* -------------------------------------------- */

  /**
   * Whether the current user is able to upload file content.
   * [NOTE] Code adapted from Foundry sources.
   * @type {boolean}
   */
  get canUpload() {
    if (!this.canCreateFolder) return false;
    // Prevent uploading to the root of Data/.
    return this.target !== "";
  }

  /* -------------------------------------------- */
  /*  Browsing                                    */
  /* -------------------------------------------- */

  /**
   * Browse to a target directory, updating the nodes cache.
   * @param {string} target  The target path to browse.
   * @returns {Promise<Node>}
   */
  async browse(target) {
    // Browse options
    const options = { extensions: this.constructor.MEDIA_EXTENSIONS };

    // Using foundry browse method
    const result = await FilePicker.browse("data", target, options).catch((error) => {
      ui.notifications.warn(error);
      // Return root if any error
      return FilePicker.browse("data", "", options);
    });

    // Update the cache with the new list of folders and files
    return this.#updateNode(result);
  }

  /* -------------------------------------------- */

  /**
   * Update (or create) a tree node from a browse result, and mark it as expanded.
   * @param {Object} result  A FilePicker browse result.
   * @returns {Node}
   */
  #updateNode(result) {
    const lang = game.i18n.lang;
    const getName = (p) => decodeURIComponent(p.slice(p.lastIndexOf("/") + 1)) || "root";

    // Basic configuration for this new target
    const node = this.nodes.get(result.target) ?? {
      path: result.target,
      name: getName(result.target),
      depth: result.target.split("/").length - 1,
      expanded: false,
      children: null,
      files: null,
    };

    // Process files and sort
    const files = new Array(result.files.length);
    for (let i = 0; i < result.files.length; i++) {
      const file = result.files[i];
      files[i] = {
        name: getName(file),
        url: file,
        isVideo: game.modules.shareMedia.utils.isVideo(file),
      };
    }
    files.sort((a, b) => a.name.localeCompare(b.name, lang));
    node.files = files;

    // Process directories, retrieving existing children or creating new ones and sort
    // [NOTE] children are references to top level keys in the same map
    const children = new Array(result.dirs.length);
    for (let i = 0; i < result.dirs.length; i++) {
      const dir = result.dirs[i];
      let child = this.nodes.get(dir);
      if (!child) {
        child = {
          path: dir,
          name: getName(dir),
          depth: dir.split("/").length - 1,
          expanded: false,
          children: null,
          files: null,
        };
        this.nodes.set(dir, child);
      }
      children[i] = child;
    }
    children.sort((a, b) => a.name.localeCompare(b.name, lang));
    node.children = children;

    // Assign the new entry
    this.nodes.set(result.target, node);

    // return the update node
    return node;
  }

  /* -------------------------------------------- */

  /**
   * Handle the folding of this application.
   * @param {PointerEvent} path  The path to browse to.
   * @returns {Promise<this>}
   * @this {MediaBrowser}
   */
  async toggleDir(path) {
    const node = this.nodes.get(path);

    // If current target, toggle expanded and stop here
    if (path === this.target) {
      node.expanded = !node.expanded;
      return this.render({ parts: ["sidebar"] });
    }

    // Collapse the siblings
    if (this.target && !this.target.startsWith(`${path}/`)) {
      const parentPath = path.split("/").slice(0, -1).join("/");
      const parentNode = this.nodes.get(parentPath);
      for (const child of parentNode.children) {
        if (child.expanded) child.expanded = false;
      }
    }

    // Fetch the new node data if not already in cache
    if (node?.files === null) await this.browse(path);
    node.expanded = true;

    // Assign new target
    this.target = path;
    this.constructor.LAST_STATE.target = path;

    // Render this application again
    return this.render(["sidebar", "body"]);
  }

  /* -------------------------------------------- */
  /*  Context                                     */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    // Initiate a browse when this app is first rendered
    // Fetch the last visited directory, if able
    if (options.isFirstRender) {
      await this.browse("");
      // Recursively fetch each segment to reconstruct the tree
      if (this.target) {
        const segments = this.target.split("/");
        let path = "";
        for (const segment of segments) {
          path = path ? `${path}/${segment}` : segment;
          const node = await this.browse(path);
          node.expanded = true;
        }
      }
    }

    // Return context
    return {
      ...(await super._prepareContext(options)),
      icons: CONFIG.shareMedia.CONST.ICONS,
      canGoBack: this.target !== "",
      canCreateFolder: this.canCreateFolder,
      canUpload: this.canUpload,
      roots: this.nodes.get("").children,
      target: this.target,
      files: this.nodes.get(this.target).files,
      displayNames: this.displayNames,
      layout: this.layout,
      layouts: this.layouts,
    };
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Restore last know position, if able.
   * Sync scene controls.
   * Set sidebar and browser width.
   * @inheritdoc
   */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    if (this.constructor.LAST_STATE.position)
      this.setPosition(this.constructor.LAST_STATE.position);
    else this.setPosition({ width: this.calculateBrowserWidth() });
    this.#toggleSceneControls();

    // Toggle sidebar according to last known setting
    this.element.classList.toggle("collapsed", !this.sidebarExpanded);

    // Set browser width based on last known layout value
    const width = this.calculateBrowserWidth(this.layout);
    this.setPosition({ width });
    this.element.style.setProperty("--shm-browser-width", `${width}px`);
  }

  /* -------------------------------------------- */

  /**
   * Add custom event listerners.
   * @inheritdoc
   */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // Bind search
    this.#search.bind(this.element);

    // Bind layout selector
    if (options.parts.includes("header")) {
      this.element
        .querySelector("select")
        .addEventListener("change", MediaBrowser.#onChangeLayout.bind(this));
    }

    // Bind drag & drop
    if (options.parts.includes("body")) {
      new DragDrop({
        dropSelector: ".body",
        permissions: {
          drop: () => this.canUpload,
        },
        callbacks: {
          dragenter: this.#onDragEnter.bind(this),
          dragleave: this.#onDragLeave.bind(this),
          drop: this.#onDrop.bind(this),
        },
      }).bind(this.element);
    }
  }

  /* -------------------------------------------- */

  /**
   * Save last know position.
   * @inheritdoc
   */
  async _preClose(options) {
    await super._preClose(options);
    const { top, left, height } = this.position;
    this.constructor.LAST_STATE.position = {
      top,
      left,
      width: this.calculateBrowserWidth(this.layout),
      height,
    };
  }

  /* -------------------------------------------- */

  /**
   * Cleanup references.
   * Sync scene controls.
   * @inheritdoc
   */
  _onClose(options) {
    super._onClose(options);
    this.nodes.clear();
    if (MediaBrowser._instance === this) MediaBrowser._instance = null;
    this.#toggleSceneControls(false);
  }

  /* -------------------------------------------- */

  /**
   * Cleanup references.
   * @inheritDoc
   */
  _tearDown(options) {
    super._tearDown(options);
    this.#search.unbind();
  }

  /* -------------------------------------------- */
  /*  Action Event Handlers
  /* -------------------------------------------- */

  /**
   * Traverse back one directory level.
   * @param {PointerEvent} _event   The triggering event.
   * @param {HTMLElement}  _target  The targeted DOM element.
   * @returns {Promise<this>}
   * @this {MediaBrowser}
   */
  static async #onBackTraverse(_event, _target) {
    const path = this.target.replace(/\/$/, "").split("/").slice(0, -1).join("/");
    await await this.toggleDir(path);
  }

  /* -------------------------------------------- */

  /**
   * Toggle the collapsed or expanded state of the sidebar.
   * @param {PointerEvent} _event   The triggering event.
   * @param {HTMLElement}  _target  The targeted DOM element.
   * @returns {Promise<this>}
   * @this {MediaBrowser}
   */
  static async #onToggleSidebar(_event, _target) {
    const button = this.element.querySelector(".collapse-toggle");
    this.sidebarExpanded = !this.sidebarExpanded;
    this.constructor.LAST_STATE.sidebarExpanded = this.sidebarExpanded;

    // Calculate new browser width
    const width = this.calculateBrowserWidth(this.layout);

    // Adjust application size
    this.setPosition({ width });
    this.element.style.setProperty("--shm-browser-width", `${width}px`);

    // Toggle display of the sidebar
    this.element.classList.toggle("collapsed", !this.sidebarExpanded);

    // Update icons and labels
    button.dataset.tooltip = this.sidebarExpanded ? "Collapse" : "Expand";
    button.classList.toggle(CONFIG.shareMedia.CONST.ICONS.collapseOff, !this.sidebarExpanded);
    button.classList.toggle(CONFIG.shareMedia.CONST.ICONS.collapseOn, this.sidebarExpanded);
    game.tooltip.activate(button);
  }

  /* -------------------------------------------- */

  /**
   * Toggle the selected directory, browsing to it if necessary.
   * @param {PointerEvent} _event  The triggering event.
   * @param {HTMLElement}  target  The targeted DOM element.
   * @returns {Promise<this>}
   * @this {MediaBrowser}
   */
  static async #onToggleDir(_event, target) {
    const path = target.dataset.path;
    return this.toggleDir(path);
  }

  /* -------------------------------------------- */

  /**
   * Create a new subdirectory in the current working directory.
   * [NOTE] Code adapted from Foundry sources.
   * @param {PointerEvent} _event   The triggering event.
   * @param {HTMLElement}  _target  The targeted DOM element.
   * @returns {Promise<void>}
   * @this {MediaBrowser}
   */
  static async #onCreateDirectory(_event, _target) {
    const labelText = _loc("FILES.DirectoryName.Label");
    const placeholder = _loc("FILES.DirectoryName.Placeholder");
    const content = `
      <div class="form-group">
        <label for="create-directory-name">${labelText}</label>
        <div class="form-fields">
          <input id="create-directory-name" type="text" name="dirname" placeholder="${escapeHTML(placeholder)}" required autofocus>
        </div>
      </div>
    `;

    // Creation dialog
    return foundry.applications.api.DialogV2.confirm({
      id: "create-directory",
      window: {
        title: "FILES.CreateSubfolder",
        icon: CONFIG.shareMedia.CONST.ICONS.createDirectory,
      },
      content,
      yes: {
        label: "CONTROLS.CommonCreate",
        default: true,
        callback: async (event) => {
          // Get the path and directory name
          const dirname = event.currentTarget.querySelector("input").value?.trim() || placeholder;
          const path = [this.target, dirname].filterJoin("/");
          const encodedPath = [this.target, encodeURIComponent(dirname)].filterJoin("/");

          try {
            // Using foundry to create a new folder and handling errors
            await FilePicker.createDirectory("data", path);
            // Browse to this new folder
            await this.browse(this.target);
            await this.toggleDir(encodedPath);
          } catch (err) {
            ui.notifications.error(err.message);
          }
        },
      },
      no: { label: "COMMON.Cancel" },
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle the togglin of media names.
   * @param {PointerEvent} _event   The triggering event.
   * @param {HTMLElement}  _target  The targeted DOM element.
   * @returns {Promise<void>}
   * @this {MediaBrowser}
   */
  static async #onToggleNames(_event, _target) {
    this.displayNames = !this.displayNames;
    this.constructor.LAST_STATE.displayNames = this.displayNames;
    await this.render({ parts: ["header", "body"] });
  }

  /* -------------------------------------------- */

  /**
   * Handle the layout selection.
   * @param {Event} event  The triggering event.
   * @returns {Promise<void>}
   * @this {MediaBrowser}
   */
  static async #onChangeLayout(event) {
    // Retrieve layout value
    const target = event.target;
    const value = this.layouts[target.value];
    if (!value) return;

    // Set browser width based on layout value
    const width = this.calculateBrowserWidth(value);
    this.setPosition({ width });
    this.element.style.setProperty("--shm-browser-width", `${width}px`);

    // Store layout for future renders
    this.layout = value;
    this.constructor.LAST_STATE.layout = value;
  }

  /* -------------------------------------------- */

  /**
   * Handle showing a media.
   * @param {PointerEvent} _event  The triggering event.
   * @param {HTMLElement}  target  The targeted DOM element.
   * @returns {Promise<void>}
   * @this {MediaBrowser}
   */
  static async #onShowMedia(_event, target) {
    const { url } = target.dataset ?? {};
    if (!url) return;

    // Display it in a popout
    const mode = CONFIG.shareMedia.CONST.LAYERS_MODES.popout;

    // Get the default settings
    const settings = game.modules.shareMedia.settings.get(
      CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaSettings,
    );

    // Get the settings for the mode
    const optionsSettings = game.modules.shareMedia.utils.getMediaSettings(url, mode, settings);

    // Render the popout window
    const layer = new game.modules.shareMedia.layers[mode]({
      src: url,
      ...optionsSettings,
    });
    await layer.render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Search among shown media.
   * @param {KeyboardEvent} _event  The triggering event.
   * @param {string}        _query  The search input value.
   * @param {RegExp}        rgx     The regular expression corresponding to the query.
   * @param {HTMLElement}   html    A reference to the HTML container element.
   * @protected
   */
  _onSearchFilter(_event, _query, rgx, html) {
    const mediaList = html.querySelector(".media-list");
    if (!mediaList) return;

    // Hide media list, made to avoid media blink
    mediaList.classList.add("filtering");

    // Filter through children
    for (const item of mediaList.querySelectorAll(".media-item")) {
      const match = SearchFilter.testQuery(rgx, item.dataset.name);
      item.style.display = !match ? "none" : "";
    }

    // Show media list
    mediaList.classList.remove("filtering");
  }

  /* -------------------------------------------- */

  /**
   * Handle a dragenter event.
   * @param {DragEvent} _event  The Triggering event.
   */
  #onDragEnter(_event) {
    if (!this.canUpload) return;
    if (++this.#dragCounter !== 1) return;
    this.element.classList.add("drag-over");
  }

  /* -------------------------------------------- */

  /**
   * Handle a dragleave event.
   * @param {DragEvent} _event  The Triggering event.
   */
  #onDragLeave(_event) {
    if (!this.canUpload) return;
    if (--this.#dragCounter !== 0) return;
    this.element.classList.remove("drag-over");
  }

  /* -------------------------------------------- */

  /**
   * Handle a drop event.
   * @param {DragEvent} event  The Triggering event.
   */
  async #onDrop(event) {
    if (!this.canUpload) return;
    this.#dragCounter = 0;
    this.element.classList.remove("drag-over");

    // Process the data transfer
    const files = [...(event.dataTransfer.files || [])];
    if (!files.length) return;

    // Create a set of promises to resolve
    const uploads = files
      .map((file) => {
        const name = file.name.toLowerCase();

        try {
          this.#validateExtension(name);
          return FilePicker.upload("data", this.target, file);
        } catch (err) {
          ui.notifications.error(err, { console: true });
          return null;
        }
      })
      .filter(Boolean);

    // Resolve all validation and uploads
    await Promise.allSettled(uploads);

    // Fetch the new files and render
    await this.browse(this.target);
    await this.render({ parts: ["body"] });
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Toggle the scene control according to the toggle boolean.
   * @param {boolean} [toggle]  Whether the scene control should be toggle or not.
   */
  #toggleSceneControls(toggle = true) {
    const control = ui.controls?.controls?.["shm-media-layer"];
    if (!control) return;
    if (control.tools.browser.active === !toggle) control.tools.browser.active = toggle;
    // Only render scene controls if the media layer controls are active
    if (control.active) ui.controls.render();
  }

  /* -------------------------------------------- */

  /**
   * Validate that the extension of the uploaded file.
   * This is an initial client-side test, the MIME type will be further checked by the server.
   * [NOTE] Code adapted from Foundry sources.
   * @param {string} name  The file name attempted for upload.
   */
  #validateExtension(name) {
    const ext = `.${name.split(".").pop()}`;
    const allowedExtensions = Array.from(this.constructor.MEDIA_EXTENSIONS);
    if (!allowedExtensions.includes(ext)) {
      const msg = _loc("FILES.ErrorDisallowedExtension", {
        name,
        ext,
        allowed: allowedExtensions.join(" "),
      });
      throw new Error(msg);
    }
  }

  /* -------------------------------------------- */

  /**
   * Calculate the width of the browser depending on the number of columns to display.
   * @param {number} [columns]  The number of columns to display.
   * @returns {number}
   */
  calculateBrowserWidth(columns = 2) {
    // Get styles
    const scrollbarWidth = this.getScrollbarWidth();
    const fontSize = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("font-size"),
    );
    const styles = getComputedStyle(this.element);

    const getValue = (styles, property) => {
      return parseFloat(styles.getPropertyValue(property)) * fontSize;
    };
    const sidebarExpandedWidth = getValue(styles, "--shm-sidebar-width");
    const bodyColumnWidth = getValue(styles, "--shm-body-col-min");
    const bodyGapWidth = getValue(styles, "--shm-body-gap");

    // Calculate final width
    return (
      (this.sidebarExpanded ? sidebarExpandedWidth : 0) + // Sidebar
      bodyGapWidth * 2 + // Media list padding
      columns * bodyColumnWidth + // Columns
      (columns - 1) * bodyGapWidth + // Columns gap
      scrollbarWidth + // Scrollbar
      2 // Foundry app borders
    );
  }

  /* -------------------------------------------- */

  /**
   * Calculate the scrollbar width of the browser.
   * This will get the correct scrollbar then cache it so we don't have to recalculate it.
   * @returns {number}
   */
  getScrollbarWidth() {
    // Return cached value
    if (this.constructor.SCROLLBAR_WIDTH) return this.constructor.SCROLLBAR_WIDTH;

    // Create an invisible element with a scrollbar and append it to the body
    const outer = document.createElement("div");
    outer.style.cssText = `
      visibility: hidden;
      overflow: scroll;
      position: absolute;
      top: -9999px;
    `;
    document.body.appendChild(outer);
    const inner = document.createElement("div");
    outer.appendChild(inner);

    // Calculate the scrollbar width
    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
    outer.remove();

    // Cache and return the value
    this.constructor.SCROLLBAR_WIDTH = scrollbarWidth;
    return scrollbarWidth;
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Retrieve the configured MediaBrowser implementation.
   * @type {typeof MediaBrowser}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.ui.MediaBrowser;
    if (!isSubclass(Class, MediaBrowser)) {
      console.warn("Configured MediaBrowser override must be a subclass of MediaBrowser.");
      Class = MediaBrowser;
    }
    return Class;
  }
}
