import { createFileRoute } from '@tanstack/react-router';
import { refreshLinkIcons } from '@backend/services/link-icons';
import { apiOk, withAdmin } from '../../../../server/http';

/**
 * 抓一遍友链站点图标存到本地。手填过 logo 的会跳过。
 *
 * 只开 POST：这个操作会对着几十个外部站点发请求，不该被 GET 预取或爬虫触发。
 */
export const Route = createFileRoute('/api/v1/admin/link-icons')({ server: { handlers: {
  POST: ({ request }) => withAdmin(request, async () => apiOk(await refreshLinkIcons())),
} } });
