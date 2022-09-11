import { chooseShareAction } from "./helpers.js"
import constants from "./settings/constants.js"
import { SETTINGS } from "./settings/settings.js"

/**
 * Create a token HUD control button to share an actor or token image
 */
export const addHUDControls = (app, html) => {
    const button = $(`
        <div class="control-icon " data-action="share-actor-img" title="${game.i18n.localize(`${constants.moduleName}.share.token-button`)}">
            <i class="fas fa-book-open"></i>
        </div>
    `)

    button.click(() => {
        const title = game.settings.get(constants.moduleName, SETTINGS.SHARE_ACTOR_TOKEN_NAME) ? app.object.document.name : ""
        chooseShareAction(app.object.document.texture.src, title)
    })

    button.contextmenu(() => {
        const title = game.settings.get(constants.moduleName, SETTINGS.SHARE_ACTOR_TOKEN_NAME) ? app.object.actor.name : ""
        chooseShareAction(app.object.actor.img, title)
    })

    html.find('.col.left').append(button)
}
