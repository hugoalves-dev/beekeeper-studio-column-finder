# Beekeeper Studio Column Finder

[![CI](https://github.com/hugoalves-dev/beekeeper-studio-column-finder/actions/workflows/ci.yml/badge.svg)](https://github.com/hugoalves-dev/beekeeper-studio-column-finder/actions/workflows/ci.yml)

A read-only Beekeeper Studio plugin to find columns across all tables and views in the active database.

Supports **PostgreSQL, MySQL and MariaDB**. Partial, case-insensitive searches show schema, table/view, column and data type. A Structure shortcut opens matching tables when present in Beekeeper's loaded entity list. Results are limited to 500. No telemetry, extra server, or database credentials.

**Important:** the plugin opens in its own tab via the arrow next to **+**. The official SDK does not let plugins modify the native sidebar filter.

## Install from CI artifact (no Node required)

1. Open [Actions → CI](https://github.com/hugoalves-dev/beekeeper-studio-column-finder/actions/workflows/ci.yml) and download the **beekeeper-column-finder** artifact from a successful run.
2. Extract its **manifest.json** and **dist/** directory into a folder named **beekeeper-column-finder** in the Beekeeper plugins directory:
   - Windows: %APPDATA%\beekeeper-studio\plugins\beekeeper-column-finder
   - Linux: ~/.config/beekeeper-studio/plugins/beekeeper-column-finder
   - macOS: ~/Library/Application Support/beekeeper-studio/plugins/beekeeper-column-finder
   - Windows Portable: {app-directory}\beekeeper-studio-data\plugins\beekeeper-column-finder
3. Enable community plugins (below), fully restart Beekeeper, then open Column Finder from the dropdown next to +.

Expected layout: beekeeper-column-finder/manifest.json and beekeeper-column-finder/dist/index.html plus dist/assets/.

CI builds on **Windows and Ubuntu with Node.js 22**, runs unit tests, then uploads an installable plugin bundle (available for 30 days; downloading GitHub artifacts may require signing in).

## Install from source (Windows PowerShell)

Run these commands in PowerShell:

~~~powershell
git clone https://github.com/hugoalves-dev/beekeeper-studio-column-finder.git
cd beekeeper-studio-column-finder
npm install
npm test
npm run build

$pluginDirectory = Join-Path $env:APPDATA 'beekeeper-studio\plugins'
New-Item -ItemType Directory -Force -Path $pluginDirectory | Out-Null
$link = Join-Path $pluginDirectory 'beekeeper-column-finder'
if (Test-Path $link) {
    Write-Host "Already exists: $link. Check its target before changing it."
} else {
    New-Item -ItemType Junction -Path $link -Target (Get-Location).Path | Out-Null
}
~~~

If you already linked an older version, do **not** recreate the junction. Pull the latest source, run npm install, npm test, npm run build, and restart Beekeeper.

### Enable community plugins (Beekeeper 5.7+)

On Windows, open the settings file:

~~~powershell
notepad "$env:APPDATA\beekeeper-studio\user.config.ini"
~~~

Add or update one pluginSystem section while preserving your other settings:

~~~ini
[pluginSystem]
disabled = false
communityDisabled = false
~~~

Do **not** add the Column Finder ID to allow[]; only bundled plugin IDs are accepted there. This configuration allows other third-party plugins as well, so only install ones you trust. An administrator's system.config.ini may override user settings.

In Beekeeper open **Tools → Manage Plugins** to confirm that Column Finder is enabled. Restart if needed. Then use the tab dropdown next to **+**.

## Behavior and limitations

| Database | Search scope |
| --- | --- |
| PostgreSQL | All accessible user schemas in the active database, excluding pg_catalog, information_schema and pg_toast* |
| MySQL | DATABASE(), the selected database |
| MariaDB | DATABASE(), the selected database |

Search reads only information_schema.columns and reflects your metadata privileges. It uses hex-encoded UTF-8 input, preventing SQL injection and treating percent/underscore characters literally. It executes no writes. Up to 500 matches are displayed, with an indication if more exist.

The **Structure** shortcut depends on Beekeeper's *already loaded* table list. Refresh the entity list if a table is found but navigation fails. MySQL and MariaDB navigation omits schema to match the host's internal representation. Some PostgreSQL schemas may likewise be absent from the host cache.

## Development and testing

~~~sh
npm install
npm test
npm run build
npm run dev
~~~

- Node's built-in test runner checks SQL generation, injection resistance, dialects, and table navigation options (8 unit tests).
- The TypeScript compiler checks types and Vite builds the plugin for production.
- GitHub Actions runs tests and build on Windows and Ubuntu, then uploads manifest.json + dist as an artifact.
- Unit tests **do not run queries against actual databases**; verify MySQL/PostgreSQL/MariaDB integration manually.

Project layout: src/sql.ts (SQL), src/navigation.ts (host tab navigation), src/main.ts (SDK integration), src/style.css and index.html (UI), tests/*.test.mjs (unit tests), and .github/workflows/ci.yml (automation).

## Troubleshooting

- Plugin missing/disabled: check Tools → Manage Plugins and user.config.ini.
- Old version: inspect the manifest.json in the actual plugin directory or junction target.
- Structure shows "Table not found": refresh entities; the host only opens cached tables.
- Build fails after switching Windows/Linux: reinstall dependencies with npm install for your platform.
- SDK issues: inspect Help → Show Developer Tools in Beekeeper.

## References and license

- [Official Beekeeper plugin API](https://docs.beekeeperstudio.io/plugin_development/api-reference/)
- [Creating your first plugin](https://docs.beekeeperstudio.io/plugin_development/creating-your-first-plugin/)
- [PostgreSQL information_schema.columns](https://www.postgresql.org/docs/current/infoschema-columns.html)

[MIT License](LICENSE). Independent community project; not endorsed by Beekeeper Studio.
