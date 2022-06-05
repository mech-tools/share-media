import constants from "./constants.js"
import { SETTINGS } from "./settings.js"

/** Handle the blacklist settings */
export class BlackListSetting extends FormApplication {
    /**
     * Register the settings
     */
    static init() {
        game.settings.registerMenu(constants.moduleName, SETTINGS.BLACKLIST_FORM, {
            label: game.i18n.localize(
                "share-media.settings.blacklist-label-menu"
              ),
            icon: 'fas fa-ban',
            type: BlackListSetting,
            restricted: true
        })


        game.settings.register(constants.moduleName, SETTINGS.BLACKLIST, {
            type: BlackListSetting,
            scope: "world",
            config: false,
            default: '',
            type: String,
        })
    }

    /** Default options */
    static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			...super.defaultOptions,
			template: `${constants.modulePath}/templates/blacklist-settings.hbs`,
			height: 375,
			title: game.i18n.localize(
                "share-media.dialogs.blacklist-settings.title"
              ),
			width: 400,
            id: "share-media-blacklist-settings"
		})
	}

    /** Default data */
    getData() {
		let data = super.getData()
        const blacklist = game.settings.get(constants.moduleName, SETTINGS.BLACKLIST).split(";")
		data.players = game.users.map(u => ({ id: u.id, name: u.name, color: u.data.color, active: u.active, checked: blacklist.includes(u.id) }))
		return data
	}

    /** On submit */
    _updateObject(ev, formData) {
	    const data = expandObject(formData)
        game.settings.set(constants.moduleName, SETTINGS.BLACKLIST, data.playerId?.join(";") || "")
	}
}