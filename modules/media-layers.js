import constants from './settings/constants.js'
import { findBoundingTile } from './helpers.js'

/**
 * Create a dedicated layer for sharing a media on a scene
 */
class ShareMediaLayer extends CanvasLayer {
    constructor() {
        super()
        this.container = null
    }

    static get layerOptions() {
        return foundry.utils.mergeObject(super.layerOptions, {
            canDragCreate: false,
            zIndex: 10,
            name: constants.moduleName
        })
    }

    /**
     * Create a sprite on the scene bounded by a tile and a style
     */
    async createBoundedSprite(url, style) {
        const boundingTile = findBoundingTile()
        if (!boundingTile) { return }

        this._prepareContainer()

        const sprite = await this._createSprite(url)

        const spriteScaleFactor = style === 'fit' ?
            this._calculateScaleFactorFit(sprite.width, sprite.height, boundingTile.data.width, boundingTile.data.height) :
            this._calculateScaleFactorCover(sprite.width, sprite.height, boundingTile.data.width, boundingTile.data.height)
        sprite.scale.set(spriteScaleFactor)

        const spriteCoordinates = this._calculateAspectRatioCoordinates(boundingTile.data.x, boundingTile.data.y, boundingTile.data.width, boundingTile.data.height, sprite.width, sprite.height)
        sprite.position.set(spriteCoordinates.x, spriteCoordinates.y)

        if (style === 'cover') {
            this._addMask(boundingTile.data.x, boundingTile.data.y, boundingTile.data.width, boundingTile.data.height)
        }

        this.container.addChild(sprite)
    }

    /**
     * Delete a sprite on the scene
     */
    deleteBoundedSprite() {
        this.container.destroy()
    }

    /**
     * (Re)Create the PIXI container
     */
    _prepareContainer() {
        if (this.container) {
            this.container.destroy()
        }

        const container = new PIXI.Container()
        container.sortableChildren = true
        container.parentName = constants.moduleName
        container.zIndex = 1
        this.container = container
        this.addChild(container)
    }

    /**
     * Add a mask to the current container
     */
    _addMask(x, y, width, height) {
        const mask = new PIXI.Graphics()
            .beginFill(0xFF3300)
            .drawRect(x, y, width, height)
            .endFill()

        this.container.mask = mask
        this.container.addChild(mask)
    }

    async _createSprite(url) {
        const texture = await loadTexture(url)
        const sprite = new PIXI.Sprite(texture)

        return sprite
    }

    /**
     * Calculate the scaling factor of a rectangle withing another rectangle (fit)
     */
    _calculateScaleFactorFit(srcWidth, srcHeight, maxWidth, maxHeight) {
        const srcRatio = srcWidth / srcHeight
        const maxRatio = maxWidth / maxHeight

        return maxRatio > srcRatio ? maxHeight / srcHeight : maxWidth / srcWidth
    }

    /**
     * Calculate the scaling factor of a rectangle withing another rectangle (cover)
     */
    _calculateScaleFactorCover(srcWidth, srcHeight, maxWidth, maxHeight) {
        const srcRatio = srcWidth / srcHeight
        const maxRatio = maxWidth / maxHeight

        return maxRatio > srcRatio ? maxWidth / srcWidth : maxHeight / srcHeight
    }

    /**
     * Calculate the coordinates respecting the aspect ratio of rectangle withing another rectangle
     */
    _calculateAspectRatioCoordinates(srcX, srcY, srcWidth, srcHeight, targetWidth, targetHeight) {
        return {
            x: (srcX + srcWidth / 2) - (targetWidth / 2),
            y: (srcY + srcHeight / 2) - (targetHeight / 2)
        }
    }
}

/**
 * Register the media sharing layer
 */
export default function registerLayer() {
    CONFIG.Canvas.layers = foundry.utils.mergeObject(Canvas.layers, {
        shareMedia: ShareMediaLayer
    })

    if (!Object.is(Canvas.layers, CONFIG.Canvas.layers)) {
        const layers = Canvas.layers

        Object.defineProperty(Canvas, 'layers', {
            get: function () {
                return foundry.utils.mergeObject(layers, CONFIG.Canvas.layers)
            }
        })
    }
}