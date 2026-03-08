import MediaSprite from "./media-sprite.mjs";
const { isSubclass } = foundry.utils;
const { cone } = foundry.data.BaseShapeData.TYPES;

/**
 * A class responsible for generating a sprite in a region area.
 */
export default class RegionSprite extends MediaSprite {
  /** @override */
  _createMesh() {
    // Get the area bounds
    const {
      bounds: { x, y, width, height },
      shapes: [shape],
    } = this.area;

    // Rotate the mesh based on the first shape (if able)
    // [NOTE] Setting anchor to 0.5 as geometries can be wild, could be better
    // [INFO] Although "cone" has a rotation value, it is not used as the mesh orientation can become weird
    this._mesh.anchor.set(0.5);
    this._mesh.rotation =
      shape.rotation && !(shape instanceof cone) ? Math.toRadians(shape.rotation) : 0;

    // Scale the mesh to appropriate dimensions
    this._mesh.resize(width, height, { fit: this.fitMode });

    this._mesh.x = x + width / 2;
    this._mesh.y = y + height / 2;

    // Mesh configuration
    // [NOTE] Using one of "bottom" or "top", whatever data is finite or else bottom.
    this._mesh.elevation = Number.isFinite(this.area.elevation.bottom)
      ? this.area.elevation.bottom
      : Number.isFinite(this.area.elevation.top)
        ? this.area.elevation.top
        : this.area.elevation.bottom;
    this._mesh.hoverFade = false;
  }

  /* -------------------------------------------- */
  /*  Factory Methods
  /* -------------------------------------------- */

  /**
   * Retrieve the configured implementation for this sprite type.
   * @type {typeof RegionSprite}
   */
  static get implementation() {
    let Class = CONFIG.shareMedia.canvas.RegionSprite;
    if (!isSubclass(Class, RegionSprite)) {
      console.warn("Configured RegionSprite override must be a subclass of RegionSprite.");
      Class = RegionSprite;
    }
    return Class;
  }
}
