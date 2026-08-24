import { optionValue } from '../db/options';
import { recordFeedFetchFailure, runFeedFetch } from '../routes/compat';

const initialDelayMs = 60 * 1000;

async function refreshIntervalMs() {
  const configured = Number(await optionValue('feed_fetch_interval_hours', '4'));
  const hours = Number.isFinite(configured) ? Math.min(168, Math.max(1, configured)) : 4;
  return Math.round(hours * 60 * 60 * 1000);
}

export function startFeedFetchCron() {
  const run = async () => {
    try {
      await runFeedFetch({ trackProgress: true });
    } catch (err) {
      console.error('RSS feed fetch cron failed:', err);
      recordFeedFetchFailure(err);
    } finally {
      setTimeout(run, await refreshIntervalMs()).unref();
    }
  };
  setTimeout(() => { void run(); }, initialDelayMs).unref();
}
