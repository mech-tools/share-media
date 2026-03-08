const { isNewerVersion } = foundry.utils;

/* -------------------------------------------- */
/*  Module migrations
/* -------------------------------------------- */

/**
 * List of migrations.
 * Latest migration version is the latest data version (or "1.0.0").
 * @type {{ version: string; handler: () => Promise<void> }[]}
 */
const MIGRATIONS = [{ version: "2.14.0", handler: migrateTo2140 }];

/* -------------------------------------------- */

/**
 * Run the needed migrations depending on the current and latest data version.
 * @returns {Promise<void>}
 */
export const runMigrations = async () => {
  // Only GMs can run migrations
  if (!game.users.current.isGM) return;

  // Retrieve current data version
  const currentVersion = game.modules.shareMedia.settings.get(
    CONFIG.shareMedia.CONST.MODULE_SETTINGS.dataVersion,
  );

  // If not version is found, the module is newly installed
  // Set the data version to latest and exit
  if (!currentVersion) {
    // Retrieve latest data version (latest migration)
    const latestVersion = MIGRATIONS.at(-1)?.version ?? "1.0.0";
    // Set the current data version
    await game.modules.shareMedia.settings.set(
      CONFIG.shareMedia.CONST.MODULE_SETTINGS.dataVersion,
      latestVersion,
    );
    return;
  }

  // Else, run the needed migrations
  const toRun = MIGRATIONS.filter((migration) => isNewerVersion(migration.version, currentVersion));
  if (!toRun.length) return;

  for (const migration of toRun) {
    // Execute migration
    await migration.handler();
    // Set the new data version after each succeeded migration
    await game.modules.shareMedia.settings.set(
      CONFIG.shareMedia.CONST.MODULE_SETTINGS.dataVersion,
      migration.version,
    );
  }
};

/* -------------------------------------------- */
/*  Migrations
/* -------------------------------------------- */

/**
 * Migrate to 2.14.0.
 * 1. Replacing tile names with existing share media flag.
 * 2. Migrate media collection so "targetUsers" is now under "settings".
 */
async function migrateTo2140() {
  // 1. Tile
  const MEDIA_TILE_NAME = "name";
  for (const scene of game.scenes) {
    for (const tile of scene.tiles) {
      const flagName = tile.getFlag("share-media", MEDIA_TILE_NAME);
      if (flagName && !tile.name) await tile.update({ name: flagName });
      await tile.unsetFlag("share-media", MEDIA_TILE_NAME);
    }
  }

  // 2. Media collection
  const collection = new Collection(ui["shm-media-sidebar"].mediaCollection.entries());
  collection.map((media) => {
    if (!media.settings.targetUsers) media.settings.targetUsers = media.targetUsers ?? [];
    if (media.targetUsers) delete media.targetUsers;
  });
  await game.settings.set(
    "share-media",
    CONFIG.shareMedia.CONST.MODULE_SETTINGS.mediaHistory,
    Object.fromEntries(collection.entries()),
  );
}
