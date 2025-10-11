/**
 * Mixin that provides waitable capabilities to applicationV2 forms.
 * @param {Class} Base  The base class to extend with waitable functionalities.
 * @returns {Class}
 */
export default function WaitableMixin(Base) {
  return class extends Base {
    /**
     * Create an instance and wait for submission.
     * @param {Object} options  Option which may change the way the application is rendered.
     * @returns {Promise<unknown>}
     */
    static async wait(options) {
      return new Promise((resolve) => {
        // Wrap submission handler with Promise resolution and create an instance
        const originalSubmit = this.DEFAULT_OPTIONS.form.handler;
        const selector = new this.implementation({
          ...options,
          form: {
            handler: async (event, form, formData) => {
              const result = await originalSubmit.call(this, event, form, formData);
              resolve(result);
            },
          },
        });

        // Listen to FoundryVTT "close" event and resolve with null
        selector.addEventListener(
          "close",
          () => {
            resolve(null);
          },
          { once: true },
        );

        // Render the app
        selector.render({ force: true });
      });
    }
  };
}
