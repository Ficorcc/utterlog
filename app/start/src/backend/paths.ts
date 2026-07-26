import { join } from 'node:path';

function pathEnv(key: string, fallback: string) {
  const value = process.env[key];
  return value && value.length > 0 ? value : fallback;
}

const assetsDir = pathEnv('SERVER_ASSETS_DIR', 'app/start/assets');

export const runtimePaths = {
  assetsDir,
  schemaFile: pathEnv('SCHEMA_FILE', join(assetsDir, 'schema.sql')),
  installerFavicon: pathEnv('INSTALLER_FAVICON', join(assetsDir, 'installer', 'favicon.svg')),
  builtinLocaleDir: pathEnv('BUILTIN_LOCALE_DIR', join(assetsDir, 'i18n', 'locales')),
  // 站长自己放的翻译覆盖包。这里带 UTTERLOG_ 前缀是因为它是对外承诺的部署配置
  // （locales/README.md 一直这么写），跟本文件其它面向构建产物的内部路径不同。
  customLocaleDir: pathEnv('UTTERLOG_LOCALE_DIR', 'locales'),
  builtinThemesDir: pathEnv('BUILTIN_THEMES_DIR', 'app/start/src/web/themes'),
  builtinPluginsDir: pathEnv('BUILTIN_PLUGINS_DIR', 'app/start/src/web/plugins'),
  builtinPublicThemesDir: pathEnv('BUILTIN_PUBLIC_THEMES_DIR', 'app/start/src/web/public/themes'),
  webAppDir: pathEnv('WEB_APP_DIR', 'app/start/src/web'),
  serverPublicDir: pathEnv('SERVER_PUBLIC_DIR', 'app/start/assets/public'),
  adminDistDir: pathEnv('ADMIN_DIST_DIR', 'app/admin/dist/client'),
  startClientAssetsDir: pathEnv('START_CLIENT_ASSETS_DIR', 'app/start/dist/client/assets'),
  startServerEntry: pathEnv('START_SERVER_ENTRY', 'app/start/dist/server/server.js'),
};

export function schemaCandidates() {
  return [runtimePaths.schemaFile, 'schema.sql'];
}
