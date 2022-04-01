import { shareFullscreenMedia } from "./fullscreen-handler.js";
import { sharePopoutMedia } from "./popout-handler.js";
import { shareSceneMedia } from "./scene-handler.js";

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
            name: game.i18n.localize('share-media.context-entries.popout-all'),
            icon: '<i class="fas fa-book-open"></i>',
            action: sharePopoutMedia,
            mode: 'all'
        },
        {
            name: game.i18n.localize('share-media.context-entries.popout-some'),
            icon: '<i class="fas fa-book-open"></i>',
            action: sharePopoutMedia,
            mode: 'some'
        },
        {
            name: game.i18n.localize('share-media.context-entries.fullscreen-all'),
            icon: '<i class="fas fa-expand-arrows-alt"></i>',
            action: shareFullscreenMedia,
            mode: 'all'
        },
        {
            name: game.i18n.localize('share-media.context-entries.popout-some'),
            icon: '<i class="fas fa-expand-arrows-alt"></i>',
            action: shareFullscreenMedia,
            mode: 'some'
        },
        {
            name: game.i18n.localize('share-media.context-entries.scene-fit'),
            icon: '<i class="fas fas fa-map"></i>',
            action: shareSceneMedia,
            mode: 'fit'
        },
        {
            name: game.i18n.localize('share-media.context-entries.scene-cover'),
            icon: '<i class="fas fas fa-map"></i>',
            action: shareSceneMedia,
            mode: 'cover'
        }
    ]

    choices.forEach((choice, index) => {
        const newEntry = deepClone(viewArt)

        newEntry.name = choice.name
        newEntry.icon = choice.icon
        newEntry.callback = li => {
          const object = game[objectType].get(li.data('documentId'));
          choice.action(object.data.img, choice.mode)
        }

        contextEntries.splice(viewArtIndex + 1 + index, 0, newEntry)
    })
}