import { chooseShareAction } from "./helpers.js"
import { sharePopoutMedia } from "./popout-handler.js"
import constants from "./settings/constants.js"

/**
 * Create a token HUD control button to share an actor or token image
 */
export const addHUDControls = (app, html) => {
    const button = $(`
        <div class="control-icon " data-action="share-actor-img" title="${game.i18n.localize(`${constants.moduleName}.share.token-button`)}">
            <i class="fas fa-book-open"></i>
        </div>
    `)

    button.click(() => chooseShareAction(app.object.document.texture.src))
    button.contextmenu(() => chooseShareAction(app.object.actor.img))

    html.find('.col.left').append(button)
}
