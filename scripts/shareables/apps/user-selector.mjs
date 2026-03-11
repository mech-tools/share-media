const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { isSubclass } = foundry.utils;

/**
 * Application responsible for selecting users.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 * @mixes WaitableMixin          Delayed composition {@link UserSelector.implementation}
 */
export default class UserSelector extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "shm-user-selector-{id}",
    tag: "form",
    window: {
      get title() {
        return "share-media.shareables.selector.user.label";
      },
      contentClasses: ["standard-form"],
      get icon() {
        return CONFIG.shareMedia.CONST.ICONS.popoutSelection;
      },
    },
    position: {
      width: 400,
      height: "auto",
    },
    form: {
      handler: UserSelector.#onSubmit,
      closeOnSubmit: true,
    },
  };

  /** @override */
  static PARTS = {
    form: { template: "modules/share-media/templates/shareables/user-selector.hbs", root: true },
  };

  /* -------------------------------------------- */
  /*  Window Management
  /* -------------------------------------------- */

  /** @override */
  _canDetach() {
    return false;
  }

  /* -------------------------------------------- */
  /*  Context
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    return {
      ...(await super._prepareContext(options)),
      icons: CONFIG.shareMedia.CONST.ICONS,
      users: this.#prepareUsers(),
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare users, selecting only users that are active.
   * If "this.options.targetUsers" is available, check by default all available users within this array.
   * @returns {Array<{
   *   id: string;
   *   name: string;
   *   color: Color;
   *   isGM: boolean;
   * }>}
   */
  #prepareUsers() {
    return game.users
      .filter((user) => user.active)
      .map((user) => ({
        id: user.id,
        name: user.name,
        color: user.color,
        isGM: user.isGM,
        checked:
          user.isGM || (this.options.targetUsers && this.options.targetUsers.includes(user.id)),
      }));
  }

  /* -------------------------------------------- */
  /*  Action Event Handlers
  /* -------------------------------------------- */

  /**
   * Handle the submission of this application.
   * @param {SubmitEvent}      _event    The originating form submission or input change event.
   * @param {HTMLFormElement}  _form     The form element that was submitted.
   * @param {FormDataExtended} formData  Processed data for the submitted form.
   * @returns {Promise<string[]>}
   * @this {UserSelector}
   */
  static async #onSubmit(_event, _form, formData) {
    return Object.entries(formData.object)
      .filter(([_, value]) => value === true)
      .map(([key]) => key);
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured UserSelector implementation.
   * @type {typeof UserSelector}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.shareables.apps.UserSelector;
    if (!isSubclass(Class, UserSelector)) {
      console.warn("Configured UserSelector override must be a subclass of UserSelector.");
      Class = UserSelector;
    }

    // Apply required mixins
    const { WaitableMixin } = CONFIG.shareMedia.shareables.mixins;
    return WaitableMixin(Class);
  }
}
