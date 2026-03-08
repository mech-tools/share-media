const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { reloadConfirm } = foundry.applications.settings.SettingsConfig;
const { expandObject } = foundry.utils;

/**
 * Application responsible for adjusting settings for entity sharing.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 */
export default class EntitySharingSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "shm-entity-sharing-settings",
    tag: "form",
    window: {
      get title() {
        return `share-media.settings.${CONFIG.shareMedia.CONST.MODULE_SETTINGS.entitySharingSettings}.label`;
      },
      contentClasses: ["standard-form"],
    },
    position: {
      width: 500,
      height: 600,
    },
    form: {
      handler: EntitySharingSettings.#onSubmit,
      closeOnSubmit: true,
    },
  };

  /** @override */
  static PARTS = {
    form: {
      template: "modules/share-media/templates/settings/entity-sharing-settings.hbs",
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
      description: `${CONFIG.shareMedia.CONST.MODULE_SETTINGS.entitySharingSettings}.description`,
      entitySharingSettings: game.modules.shareMedia.settings.get(
        CONFIG.shareMedia.CONST.MODULE_SETTINGS.entitySharingSettings,
      ),
      categoryLabels: this.#prepareCategoryLabels(),
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare the displaying of category labels.
   * @returns {Record<keyof typeof CONFIG.shareMedia.CONST.ENTITY_SETTINGS, string>}
   */
  #prepareCategoryLabels() {
    return Object.keys(
      game.modules.shareMedia.settings.get(
        CONFIG.shareMedia.CONST.MODULE_SETTINGS.entitySharingSettings,
      ),
    ).reduce((obj, category) => {
      obj[category] = "DOCUMENT." + category.charAt(0).toUpperCase() + category.slice(1);
      return obj;
    }, {});
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
   * @this {EntitySharingSettings}
   */
  static async #onSubmit(_event, _form, formData) {
    const entitySharingSettings = expandObject(formData.object);
    await game.modules.shareMedia.settings.set(
      CONFIG.shareMedia.CONST.MODULE_SETTINGS.entitySharingSettings,
      entitySharingSettings,
    );
    // // Reload FoundryVTT
    await reloadConfirm({ world: true });
  }
}
