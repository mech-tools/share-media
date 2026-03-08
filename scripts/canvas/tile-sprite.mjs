import MediaSprite from "./media-sprite.mjs";
const { isSubclass } = foundry.utils;

/**
 * A class responsible for generating a sprite in a tile area.
 */
export default class TileSprite extends MediaSprite {
  /** @override */
  _createMesh() {
    // Get the area bounds
    const {
      x,
      y,
      width,
      height,
      texture: { anchorX, anchorY, tint },
      rotation,
      alpha,
    } = this.area;

    // Rotate the mesh
    this._mesh.anchor.set(anchorX, anchorY);
    this._mesh.rotation = Math.toRadians(rotation);

    // Scale the mesh to appropriate dimensions
    this._mesh.resize(width, height, { fit: this.fitMode });

    // Position the mesh
    this._mesh.x = x;
    this._mesh.y = y;

    // Mesh configuration
    // [NOTE] Mostly the same as the tile configuration
    this._mesh.alpha = alpha;
    this._mesh.tint = tint;
    this._mesh.elevation = this.area.elevation;
    this._mesh.occludedAlpha = this.area.occlusion.alpha;
    this._mesh.occlusionMode = CONST.OCCLUSION_MODES.NONE;
    this._mesh.occlusionMode = this.area.occlusion.modes.reduce((modes, mode) => {
      modes |= mode;
      return modes;
    }, CONST.OCCLUSION_MODES.NONE);
    this._mesh.hoverFade = this._mesh.isOccludable;
    this._mesh.restrictsLight = this.area.restrictions.light;
    this._mesh.restrictsWeather = this.area.restrictions.weather;
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured implementation for this sprite type.
   * @type {typeof TileSprite}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.canvas.TileSprite;
    if (!isSubclass(Class, TileSprite)) {
      console.warn("Configured TileSprite override must be a subclass of TileSprite.");
      Class = TileSprite;
    }
    return Class;
  }
}
