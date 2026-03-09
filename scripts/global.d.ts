import * as CommonModule from "./common/_module.mjs";
import * as SettingsModule from "./settings/_module.mjs";
import * as UiModule from "./ui/_module.mjs";
import * as CanvasModule from "./canvas/_module.mjs";
import * as LayersModule from "./layers/_module.mjs";
import * as ShareablesModule from "./shareables/_module.mjs";
import Api from "./api.mjs";

/* -------------------------------------------- */
/*  Namespace declarations
/*  Allow IDEs to discover the project types
/*  No actual runtime use
/* -------------------------------------------- */

declare global {
  // Config
  const CONFIG: {
    shareMedia: {
      CONST: typeof CommonModule.CONST;
      settings: typeof SettingsModule.SettingsCache;
      utils: typeof CommonModule.utils;
      ui: typeof UiModule;
      canvas: typeof CanvasModule;
      layers: typeof LayersModule;
      shareables: typeof ShareablesModule;
      api: Api;
    };
  };

  // Ui
  const ui: {
    "shm-media-sidebar": InstanceType<typeof UiModule.MediaSidebar>;
  };

  // Game
  const game: {
    // Collections
    "shm-media-collection": Map<string, any>;

    // Canvas
    canvas: {
      "shm-media-layer": InstanceType<typeof CanvasModule.MediaLayer>;
    };

    // Modules
    modules: {
      shareMedia: {
        settings: typeof SettingsModule.SettingsCache;
        utils: typeof CommonModule.utils;
        ui: {
          detector: InstanceType<typeof UiModule.MediaDetector>;
          overlay: InstanceType<typeof UiModule.MediaOverlay>;
        };

        canvas: {
          mediaSprite: typeof CanvasModule.MediaSprite;
          regionSprite: typeof CanvasModule.RegionSprite;
          tileSprite: typeof CanvasModule.TileSprite;
          apps: {
            hud: typeof CanvasModule.apps.MediaHUD;
          };
        };

        layers: {
          popout: typeof LayersModule.PopoutLayer;
          fullscreen: typeof LayersModule.FullscreenLayer;
          scene: typeof LayersModule.SceneLayer;
        };

        shareables: {
          manager: InstanceType<typeof ShareablesModule.ShareablesManager>;
          apps: {
            userSelector: typeof ShareablesModule.apps.UserSelector;
            areaSelector: typeof ShareablesModule.apps.AreaSelector;
            shareSelector: typeof ShareablesModule.apps.ShareSelector;
          };
        };

        api: typeof Api;
      };
    };
  };
}

export {};
