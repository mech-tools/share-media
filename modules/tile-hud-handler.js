import { chooseShareAction } from "./helpers.js";
import constants from "./settings/constants.js";
import { SETTINGS } from "./settings/settings.js";

/**
 * Create a token HUD control button to share an actor or token image
 */
export const addTileHUDControls = (app, html) => {
  const button = $(`
        <div class="control-icon " data-action="share-tile-img" title="${game.i18n.localize(
          `${constants.moduleName}.share.tile-button`
        )}">
            <i class="fas fa-book-open"></i>
        </div>
    `);

  button.click(() => {
    chooseShareAction(app.object.document.texture.src);
  });

  html.find(".col.left").append(button);
};
