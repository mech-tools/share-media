const { isNewerVersion } = foundry.utils;

/* -------------------------------------------- */
/*  Module migrations
/* -------------------------------------------- */

/**
 * List of migrations.
 * Latest migration version is the latest data version (or "1.0.0").
 * @type {{ version: string; handler: () => Promise<void> }[]}
 */
const MIGRATIONS = [];

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

// async function migrateTo110() {}
