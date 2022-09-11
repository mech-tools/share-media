import { chooseShareAction } from "./helpers.js"
import constants from "./settings/constants.js"
import { SETTINGS } from "./settings/settings.js"

export function addSidebarContextEntries(contextEntries = [], context) {
    let objectType
    let contextString

    if (context === 'actors') {
        objectType = 'actors'
        contextString = 'SIDEBAR.CharArt'
    } else {
        objectType = 'items'
        contextString = 'ITEM.ViewArt'
    }


    const viewArt = contextEntries.find(entry => entry.name === contextString)
    const viewArtIndex = contextEntries.findIndex(entry => entry.name === contextString)

    if (!viewArt || viewArtIndex) return

    const choices = [
        {
            name: game.i18n.localize('share-media.context-entries.options'),
            icon: '<i class="fas fa-square-share-nodes"></i>',
            action: chooseShareAction,
        }
    ]

    choices.forEach((choice, index) => {
        const newEntry = deepClone(viewArt)

        newEntry.name = choice.name
        newEntry.icon = choice.icon
        newEntry.callback = li => {
          const object = game[objectType].get(li.data('documentId'));
          const title = game.settings.get(constants.moduleName, SETTINGS.SHARE_ACTOR_TOKEN_NAME) ? object.name : ""
          choice.action(object.img, title)
        }

        contextEntries.splice(viewArtIndex + 1 + index, 0, newEntry)
    })
}