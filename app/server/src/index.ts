import { assertSecureConfig, config } from './config';
import { migrateLegacyBlogThemeOptions } from './blog-theme-options';
import { startAnalyticsRollup } from './analytics/rollup';
import { initDb } from './db/client';
import { createApp } from './routes';
import { startFeedFetchCron } from './social/feed-cron';
import { startCpuMonitor } from './system/metrics';
import { startTelegramDailyReport } from './telegram';
import { startBackupScheduler } from './routes/backup';
import { preloadStartServer, warmStartFrontend } from './web/start';

startCpuMonitor();

const ready = await initDb();
assertSecureConfig(ready);
if (ready) {
  await migrateLegacyBlogThemeOptions().catch((err) => {
    console.error('blog theme migration failed:', err);
  });
  startAnalyticsRollup();
  startTelegramDailyReport();
  startFeedFetchCron();
  startBackupScheduler();
}
await preloadStartServer().catch((err) => {
  console.error('TanStack Start preload failed:', err);
});
const app = createApp(ready);

console.log(`Utterlog Bun server listening on :${config.port} (${ready ? 'full' : 'setup-only'} mode)`);

const server = Bun.serve({
  port: config.port,
  fetch: app.fetch,
});

void warmStartFrontend(server.url.origin)
  .then((warmed) => { if (warmed) console.log('TanStack Start frontend warmed'); })
  .catch((err) => { console.error('TanStack Start warmup failed:', err); });
