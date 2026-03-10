const { ApplicationV2 } = foundry.applications.api;
const { isSubclass } = foundry.utils;

/**
 * Class responsible for detecting shareable media within relevant FoundryVTT applications.
 */
export default class MediaDetector {
  constructor() {
    // Only Gamemasters are allowed to detect media
    if (!game.user.isGM) return {};

    if (game.modules.shareMedia.ui.detector)
      throw new Error("You may not re-construct the singleton MediaDetector.");

    // Listen to Application rendering
    this.#activateHooks();
  }

  /* -------------------------------------------- */

  /**
   * A reference to the HTML element which is currently hovered, if any.
   * @type {HTMLElement | null}
   */
  element = null;

  /* -------------------------------------------- */
  /*  Application Hooks
  /* -------------------------------------------- */

  /**
   * Activate relevant ApplicationV2 hooks.
   */
  #activateHooks() {
    for (const hook of CONFIG.shareMedia.CONST.MEDIA_HOOKS) {
      Hooks.on(hook.on, this.#activateEventListeners.bind(this, hook));
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers
  /* -------------------------------------------- */

  /**
   * Apply event listeners to the outer element of the newly rendered application.
   * @param {(typeof CONFIG.shareMedia.CONST.MEDIA_HOOKS)[number]} hook  The hook context.
   * @param {...unknown}                                           args  Hook arguments.
   */
  #activateEventListeners(hook, ...args) {
    // Parse arguments based on the Application version (V1 or V2)
    // [TODO] Remove with V16
    const { application, element, options } = this.#parseHooksArgs(...args);

    // We don't want to reattach existing event listeners to the same element
    // Foundry won't rerender the outer element, only the content, leaving the outer intact (except for closing)
    if (!options.isFirstRender) return;

    element.addEventListener(
      "pointerenter",
      this.#onPointerEnter.bind(this, hook, application),
      true,
    );
    element.addEventListener("pointerleave", this.#onPointerLeave.bind(this), true);
  }

  /* -------------------------------------------- */

  /**
   * Handle hover (enter) events that determine if an HTML element is shareable.
   * @param {(typeof CONFIG.shareMedia.CONST.MEDIA_HOOKS)[number]} hook         The hook context.
   * @param {ApplicationV1 | ApplicationV2}                        application  The Application instance being rendered.
   * @param {PointerEvent}                                         event        The initiating pointerenter event.
   */
  #onPointerEnter(hook, application, event) {
    const { target: element, relatedTarget: previousElement } = event;

    // Check if the previous element was the overlay
    if (game.modules.shareMedia.ui.overlay.element?.contains(previousElement)) return;

    // Check if the element is in a valid container
    if (!element.parentElement?.closest(hook.htmlContext.join())) return;

    // Check if the element is a valid media and ready
    if (!this.#isValidMedia(element)) return;

    this.enter(element, application, hook);
  }

  /* -------------------------------------------- */

  /**
   * Handle action when a media element is being hovered (enter).
   * @param {HTMLElement}                                          element      The media element being hovered.
   * @param {ApplicationV1 | ApplicationV2}                        application  The Application instance being handled.
   * @param {(typeof CONFIG.shareMedia.CONST.MEDIA_HOOKS)[number]} hook         The hook context.
   * @returns {Promise<void>}
   */
  async enter(element, application, hook) {
    this.element = element;
    await game.modules.shareMedia.ui.overlay.activate(element, application, hook.htmlContext);
  }

  /* -------------------------------------------- */

  /**
   * Handle hover (leave) events which trigger appropriate actions.
   * @param {PointerEvent} event  The initiating pointerleave event.
   */
  #onPointerLeave(event) {
    const { target: element, relatedTarget: nextElement } = event;

    // Don't leave if already left, from irrelevant element, or moving to overlay/this.element
    if (
      !this.element ||
      (element !== this.element &&
        !game.modules.shareMedia.ui.overlay.element?.contains(element)) ||
      game.modules.shareMedia.ui.overlay.element?.contains(nextElement) ||
      nextElement === this.element
    )
      return;

    this.leave();
  }

  /* -------------------------------------------- */

  /**
   * Handle action when a media element is being hovered (leave).
   * @returns {Promise<void>}
   */
  async leave() {
    this.element = null;
    await game.modules.shareMedia.ui.overlay.deactivate();
  }

  /* -------------------------------------------- */
  /*  Helpers
  /* -------------------------------------------- */

  /**
   * Parse application arguments based on V1/V2 compatibility.
   * @param {...unknown} args  Hook arguments.
   * @returns {{
   *   application: ApplicationV1 | ApplicationV2;
   *   element: HTMLElement;
   *   options: { isFirstRender: boolean } & Record<string, unknown>;
   * }}
   */
  #parseHooksArgs(...args) {
    const [application] = args;
    const isV2 = application instanceof ApplicationV2;

    if (isV2) {
      const [, element, , options] = args;
      return { application, element, options };
    }

    // For ApplicationV1, HTML needs to be raw (not jQuery)
    // and "applicationV1._priorState <= 0" is equivalent to "applicationV2.isFirstRender"
    const [, html] = args;
    return {
      application,
      element: html[0],
      options: { isFirstRender: application._priorState <= 0 },
    };
  }

  /* -------------------------------------------- */

  /**
   * Test if a media HTML element is valid and ready.
   * @param {HTMLElement} element  The media element to test.
   * @returns {boolean}
   */
  #isValidMedia(element) {
    const tagName = element.tagName.toLowerCase();
    const validator = CONFIG.shareMedia.CONST.MEDIA_VALIDATORS[tagName];
    return validator ? validator(element) : false;
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured MediaDetector implementation.
   * @type {typeof MediaDetector}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.ui.MediaDetector;
    if (!isSubclass(Class, MediaDetector)) {
      console.warn("Configured MediaDetector override must be a subclass of MediaDetector.");
      Class = MediaDetector;
    }
    return Class;
  }
}
