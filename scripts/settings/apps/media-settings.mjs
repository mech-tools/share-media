const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { reloadConfirm } = foundry.applications.settings.SettingsConfig;
const { expandObject } = foundry.utils;

/**
 * Application responsible for setting default media settings.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 */
export default class MediaSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "shm-default-media-settings",
    tag: "form",
    window: {
      get title() {
        return `share-media.settings.${CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaSettings}.label`;
      },
      contentClasses: ["standard-form"],
    },
    position: {
      width: 500,
      height: 600,
    },
    form: {
      handler: MediaSettings.#onSubmit,
      closeOnSubmit: true,
    },
  };

  /** @override */
  static PARTS = {
    form: {
      template: "modules/share-media/templates/settings/default-media-settings.hbs",
      root: true,
    },
  };

  /* -------------------------------------------- */
  /*  Context
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    return {
      ...(await super._prepareContext(options)),
      icons: CONFIG.shareMedia.CONST.ICONS,
      description: `${CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaSettings}.description`,
      mediaSettings: game.modules.shareMedia.settings.get(
        CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaSettings,
      ),
    };
  }

  /* -------------------------------------------- */
  /*  Action Event Handlers
  /* -------------------------------------------- */

  /**
   * Handle the submission of this application.
   * @param {SubmitEvent}      _event    The originating form submission or input change event.
   * @param {HTMLFormElement}  _form     The form element that was submitted.
   * @param {FormDataExtended} formData  Processed data for the submitted form.
   * @returns {Promise<void>}
   * @this {MediaSettings}
   */
  static async #onSubmit(_event, _form, formData) {
    const mediaSettings = expandObject(formData.object);
    await game.modules.shareMedia.settings.set(
      CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaSettings,
      mediaSettings,
    );
    // Reload FoundryVTT
    await reloadConfirm({ world: true });
  }
}
