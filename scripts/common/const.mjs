/* -------------------------------------------- */
/*  Layers & media
/* -------------------------------------------- */

/**
 * Avalaible media sharing modes.
 * @satisfies {Record<string, string>}
 */
export const LAYERS_MODES = {
  popout: "popout",
  fullscreen: "fullscreen",
  chat: "chat",
  scene: "scene",
};

/* -------------------------------------------- */

/**
 * Avalaible media sharing options.
 * @satisfies {Record<string, Record<string, string>>}
 */
export const LAYERS_OPTIONS = {
  usersAll: {
    name: "users",
    value: "all",
  },
  usersSelection: {
    name: "users",
    value: "selection",
  },
  displayFit: {
    name: "display",
    value: "fit",
  },
  displayFill: {
    name: "display",
    value: "fill",
  },
};

/* -------------------------------------------- */

/**
 * Avalaible media types.
 * @satisfies {Record<string, string>}
 */
export const MEDIA_TYPES = {
  img: "img",
  video: "video",
};

/* -------------------------------------------- */
/*  Settings
/* -------------------------------------------- */

/**
 * List of settings throughout the module.
 * @satisfies {Record<string, string>}
 */
export const MODULE_SETTINGS = {
  // Stores
  dataVersion: "dataVersion",
  mediaHistory: "mediaHistory",
  mediaBrowserConfig: "mediaBrowserConfig",
  // Foundry settings
  mediaSettings: "mediaSettings",
  mediaSidebarSettings: "mediaSidebarSettings",
  entitySharingSettings: "entitySharingSettings",
  blacklistSettings: "blacklistSettings",
};

/* -------------------------------------------- */

/**
 * Possible media settings and their default values.
 * [NOTE] using "Boolean(false)" so inference is satisfied with a simple boolean primitive instead of the value.
 * @satisfies {Record<string, Record<string, boolean>>}
 */
export const MEDIA_SETTINGS = {
  [LAYERS_MODES.popout]: {
    darkness: Boolean(true),
  },
  [LAYERS_MODES.fullscreen]: {
    immersive: Boolean(false),
    controls: Boolean(true),
    darkness: Boolean(true),
  },
  [MEDIA_TYPES.video]: {
    loop: Boolean(false),
    mute: Boolean(false),
  },
};

/* -------------------------------------------- */

/**
 * Default values for the media sidebar settings.
 * @satisfies {{
 *   enabled: boolean;
 *   gmOnly: boolean;
 *   layers: Record<string, boolean>;
 * }}
 */
export const MEDIA_HISTORY_SETTINGS = {
  enabled: Boolean(true),
  gmOnly: Boolean(false),
  layers: {
    [LAYERS_MODES.popout]: Boolean(true),
    [LAYERS_MODES.fullscreen]: Boolean(true),
    [LAYERS_MODES.chat]: Boolean(true),
    [LAYERS_MODES.scene]: Boolean(true),
  },
};

/* -------------------------------------------- */

/**
 * Possible sharing settings for foundry entities.
 * @satisfies {Record<string, Record<string, boolean>>}
 */
export const ENTITY_SETTINGS = {
  actors: {
    sheetHeader: Boolean(true),
    sheetMenu: Boolean(true),
    hud: Boolean(true),
    caption: Boolean(true),
  },
  items: { sheetHeader: Boolean(true), sheetMenu: Boolean(true), caption: Boolean(true) },
  tiles: { hud: Boolean(true) },
};

/* -------------------------------------------- */
/*  Media detection
/* -------------------------------------------- */

/**
 * List of FoundryVTT hooks and valid contexts (HTML containers) to observe.
 * @satisfies {Array<{ on: string; htmlContext: string[] }>}
 */
export const MEDIA_HOOKS = [
  // Internal
  { on: "renderMediaBrowser", htmlContext: [".media-list"] },
  // V2
  { on: "renderJournalEntrySheet", htmlContext: [".journal-entry-page:not(form)"] },
  { on: "renderActorSheetV2", htmlContext: [".editor-content:not(.ProseMirror)"] },
  { on: "renderItemSheetV2", htmlContext: [".editor-content:not(.ProseMirror)"] },
  // V1 [TODO] remove with V16
  { on: "renderJournalSheet", htmlContext: [".journal-entry-page:not(form)"] },
  { on: "renderActorSheet", htmlContext: [".editor-content:not(.ProseMirror)"] },
  { on: "renderItemSheet", htmlContext: [".editor-content:not(.ProseMirror)"] },
  // 5e [INFO] weird item sheet using ApplicationV2 but does not extend ItemSheetV2
  { on: "renderItemSheet5e", htmlContext: [".editor-content:not(.ProseMirror)"] },
  // Modules
  {
    on: "renderEnhancedJournal",
    htmlContext: [
      ".journal-entry-page:not(.ProseMirror)",
      ".editor-parent:not(.editing)",
      ".list-container .sheet-body",
    ],
  },
];

/* -------------------------------------------- */

/**
 * Registry of valid media tag names and validation functions.
 * Each validator function tests if a media element is ready for interaction.
 * @satisfies {Record<string, (element: HTMLElement) => boolean>}
 */
export const MEDIA_VALIDATORS = {
  [MEDIA_TYPES.img]: (element) => element.complete && element.naturalWidth !== 0,
  [MEDIA_TYPES.video]: (element) => element.readyState >= 2,
};

/* -------------------------------------------- */
/*  Media overlay
/* -------------------------------------------- */

/**
 * Available media actions.
 * @satisfies {Record<
 *   string,
 *   Array<{
 *     mode: keyof typeof LAYERS_MODES;
 *     optionName: string;
 *     optionValue: string;
 *     i18nKey: string;
 *   }>
 * >}
 */
export const MEDIA_ACTIONS = {
  [LAYERS_MODES.popout]: [
    {
      mode: LAYERS_MODES.popout,
      optionName: LAYERS_OPTIONS.usersAll.name,
      optionValue: LAYERS_OPTIONS.usersAll.value,
      i18nKey: "popoutAll",
    },
    {
      mode: LAYERS_MODES.popout,
      optionName: LAYERS_OPTIONS.usersSelection.name,
      optionValue: LAYERS_OPTIONS.usersSelection.value,
      i18nKey: "popoutSelection",
    },
  ],
  [LAYERS_MODES.fullscreen]: [
    {
      mode: LAYERS_MODES.fullscreen,
      optionName: LAYERS_OPTIONS.usersAll.name,
      optionValue: LAYERS_OPTIONS.usersAll.value,
      i18nKey: "fullscreenAll",
    },
    {
      mode: LAYERS_MODES.fullscreen,
      optionName: LAYERS_OPTIONS.usersSelection.name,
      optionValue: LAYERS_OPTIONS.usersSelection.value,
      i18nKey: "fullscreenSelection",
    },
  ],
  [LAYERS_MODES.chat]: [
    {
      mode: LAYERS_MODES.chat,
      optionName: LAYERS_OPTIONS.usersAll.name,
      optionValue: LAYERS_OPTIONS.usersAll.value,
      i18nKey: "chatAll",
    },
    {
      mode: LAYERS_MODES.chat,
      optionName: LAYERS_OPTIONS.usersSelection.name,
      optionValue: LAYERS_OPTIONS.usersSelection.value,
      i18nKey: "chatSelection",
    },
  ],
  [LAYERS_MODES.scene]: [
    {
      mode: LAYERS_MODES.scene,
      optionName: LAYERS_OPTIONS.displayFit.name,
      optionValue: LAYERS_OPTIONS.displayFit.value,
      i18nKey: "sceneFit",
    },
    {
      mode: LAYERS_MODES.scene,
      optionName: LAYERS_OPTIONS.displayFill.name,
      optionValue: LAYERS_OPTIONS.displayFill.value,
      i18nKey: "sceneFill",
    },
  ],
};

/* -------------------------------------------- */

/**
 * Validators for each "MEDIA_SETTINGS" category.
 * @satisfies {Record<string, (element: HTMLElement) => boolean>}
 */
export const MEDIA_SETTINGS_VALIDATORS = {
  [LAYERS_MODES.popout]: (_element) => true,
  [LAYERS_MODES.fullscreen]: (_element) => true,
  [MEDIA_TYPES.video]: (element) => game.modules.shareMedia.utils.isVideo(element),
};

/* -------------------------------------------- */
/*  Miscellaneous
/* -------------------------------------------- */

/**
 * Registry of icons used throughout the module.
 * @satisfies {Record<string, string>}
 */
export const ICONS = {
  validate: "fa-check",
  cancel: "fa-ban",
  settings: "fa-ellipsis",
  popoutAll: "fa-window-flip",
  popoutSelection: "fa-screen-users",
  fullscreenAll: "fa-display",
  fullscreenSelection: "fa-screen-users",
  chatAll: "fa-message",
  chatSelection: "fa-screen-users",
  sceneFit: "fa-game-board",
  sceneFill: "fa-frame",
  darkness: "fa-moon",
  immersive: "fa-film",
  controls: "fa-computer-mouse",
  loop: "fa-repeat",
  mute: "fa-volume-xmark",
  dismiss: "fa-xmark",
  minimize: "fa-window-minimize",
  maximize: "fa-window-maximize",
  sidebar: "fa-rectangle-history",
  select: "fa-expand",
  clear: "fa-trash",
  sort: "fa-arrow-down-arrow-up",
  play: "fa-circle-play",
  loading: "fa-circle-notch fa-spin",
  jumpToBottom: "fa-arrow-down",
  usersInfo: "fa-user",
  noUsers: "fa-user-slash",
  shareAgain: "fa-share",
  shareLink: "fa-link",
  mediaLayer: "fa-images",
  mediaBrowser: "fa-sidebar",
  folderClosed: "fa-folder",
  folderOpen: "fa-folder-open",
  folderCreate: "fa-folder-plus",
  collapseOn: "fa-caret-right",
  collapseOff: "fa-caret-left",
  title: "fa-input-text",
  layout: "fa-table-layout",
};
