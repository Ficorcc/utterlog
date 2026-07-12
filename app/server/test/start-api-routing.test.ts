import { describe, expect, test } from 'bun:test';
import { isStartNativeApiRequest } from '../src/web/start';

function request(path: string, method: string) {
  return new Request(`https://example.test${path}`, { method });
}

describe('TanStack Start native API routing', () => {
  test('routes health and public utility APIs to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/health', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/i18n/locales', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/i18n/current', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/i18n/zh-CN', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/search?q=start', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/visitor/geo', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/options/test-email', 'POST'))).toBe(true);
  });

  test('routes tracking and public online status to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/track', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/track/duration', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/online', 'GET'))).toBe(true);
  });

  test('routes Telegram webhook and management to Start', () => {
    for (const action of ['webhook', 'test', 'get-chat-id', 'setup-webhook']) {
      expect(isStartNativeApiRequest(request(`/api/v1/telegram/${action}`, 'POST'))).toBe(true);
    }
  });

  test('routes RSS feed and social feed aggregation to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/feed', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/social/feed-timeline', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/social/feed-stats', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/social/fetch-feeds', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/social/fetch-feeds/status', 'GET'))).toBe(true);
  });

  test('routes social follow management to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/social/follow', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/social/unfollow', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/social/follow-status?site_url=https://example.com', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/social/following', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/social/management', 'GET'))).toBe(true);
  });

  test('routes federation and Passport protocols to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/federation/metadata', 'GET'))).toBe(true);
    for (const action of ['follow', 'verify', 'webhook', 'token']) {
      expect(isStartNativeApiRequest(request(`/api/v1/federation/${action}`, 'POST'))).toBe(true);
    }
    expect(isStartNativeApiRequest(request('/api/v1/comments/federated', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/passport/identify', 'POST'))).toBe(true);
  });

  test('routes network hub and OAuth workflows to Start', () => {
    for (const action of ['status', 'feed', 'sites', 'subscriptions', 'pull-content', 'utterlog-profile', 'content']) {
      expect(isStartNativeApiRequest(request(`/api/v1/network/${action}`, 'GET'))).toBe(true);
    }
    for (const action of ['push-info', 'subscribe', 'unsubscribe', 'publish-notify', 'bind-utterlog-id', 'unbind-utterlog-id']) {
      expect(isStartNativeApiRequest(request(`/api/v1/network/${action}`, 'POST'))).toBe(true);
    }
    expect(isStartNativeApiRequest(request('/api/v1/network/oauth/authorize', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/network/oauth/callback', 'GET'))).toBe(true);
  });

  test('routes setup and installation APIs to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/setup/status', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/setup/test-db', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/setup/save', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/install/status', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/install/create-admin', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/install/finish', 'POST'))).toBe(true);
  });

  test('routes footprint management and reverse geocoding to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/admin/footprints', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/admin/footprints/places', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/admin/footprints/geocode', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/admin/footprints/12', 'PUT'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/location/reverse?lat=1&lng=2', 'GET'))).toBe(true);
  });

  test('routes migrated comment mutations to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/comments/batch', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/42', 'PUT'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/42', 'PATCH'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/42', 'DELETE'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/42/approve', 'PATCH'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/42/reply', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/pending-count', 'GET'))).toBe(true);
  });

  test('routes core authentication endpoints to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/auth/login', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/auth/refresh', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/auth/me', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/auth/logout', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/auth/login', 'GET'))).toBe(false);
  });

  test('routes profile and password management endpoints to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/profile', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/profile', 'PUT'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/profile/send-code', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/auth/password', 'PUT'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/auth/forgot-password', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/auth/reset-password', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/profile', 'DELETE'))).toBe(false);
  });

  test('routes two-factor and passkey endpoints to Start', () => {
    for (const action of ['setup', 'verify', 'disable', 'validate']) {
      expect(isStartNativeApiRequest(request(`/api/v1/auth/totp/${action}`, 'POST'))).toBe(true);
    }
    for (const flow of ['register', 'login']) {
      for (const action of ['begin', 'finish']) {
        expect(isStartNativeApiRequest(request(`/api/v1/auth/passkey/${flow}/${action}`, 'POST'))).toBe(true);
      }
    }
    expect(isStartNativeApiRequest(request('/api/v1/auth/passkey/available', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/passkeys', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/passkeys/7', 'DELETE'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/auth/totp/setup', 'GET'))).toBe(false);
  });

  test('routes notification workflows to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/notifications', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/notifications/unread-count', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/notifications/stream?token=x', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/notifications/read-all', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/notifications/7/read', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/notifications/7', 'DELETE'))).toBe(true);
  });

  test('routes public and admin annotations to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/annotations?post_id=1', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/annotations', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/admin/annotations', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/admin/annotations/batch-delete', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/admin/annotations/7', 'DELETE'))).toBe(true);
  });

  test('routes security management to Start', () => {
    for (const action of ['overview', 'settings', 'bans', 'timeline']) {
      expect(isStartNativeApiRequest(request(`/api/v1/security/${action}`, 'GET'))).toBe(true);
    }
    expect(isStartNativeApiRequest(request('/api/v1/security/settings', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/security/ban', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/security/unban', 'POST'))).toBe(true);
  });

  test('routes dashboard status to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/system/status', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/admin/stats', 'GET'))).toBe(true);
  });

  test('routes system maintenance and analytics cleanup to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/admin/system/version', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/admin/system/releases', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/admin/system/upgrade', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/admin/system/upgrade/status', 'GET'))).toBe(true);
    for (const action of ['rebuild-stats', 'clear-cache', 'clear-rss-cache', 'cleanup-database']) {
      expect(isStartNativeApiRequest(request(`/api/v1/admin/system/${action}`, 'POST'))).toBe(true);
    }
    expect(isStartNativeApiRequest(request('/api/v1/system/update-check', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/admin/analytics/stats', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/admin/analytics/purge', 'POST'))).toBe(true);
  });

  test('routes analytics reads to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/analytics?period=7d', 'GET'))).toBe(true);
    for (const action of ['online', 'visitors', 'logs', 'geoip', 'map', 'breakdown']) {
      expect(isStartNativeApiRequest(request(`/api/v1/analytics/${action}`, 'GET'))).toBe(true);
    }
  });

  test('routes backup management to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/backup/stats', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/backup/list', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/backup/create', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/backup/import', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/backup/download/utterlog-backup.zip', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/backup/utterlog-backup.zip', 'DELETE'))).toBe(true);
  });

  test('routes extension management to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/themes', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/themes/upload', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/themes/Azure/activate', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/themes/custom', 'DELETE'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/plugins', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/plugins/upload', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/plugins/demo/activate', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/plugins/demo/deactivate', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/plugins/demo', 'DELETE'))).toBe(true);
  });

  test('routes visitor weather to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/visitor/weather', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/visitor/weather', 'POST'))).toBe(false);
  });

  test('routes coding data to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/coding', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/coding', 'POST'))).toBe(false);
  });

  test('routes branding uploads to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/media/upload-branding', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/media/upload-branding', 'GET'))).toBe(false);
  });

  test('routes authenticated media reads to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/media', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/media/stats', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/media/upload', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/media/download-url', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/media/test-connection', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/media/exif?urls=/uploads/a.jpg', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/media/12', 'DELETE'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/media/parse', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/media/douban-import', 'POST'))).toBe(true);
  });

  test('routes RSS and music integrations to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/rss/parse?url=https%3A%2F%2Fexample.com%2Ffeed', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/music/search?q=test', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/music/proxy/netease/songs/123/cover', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/music/proxy/netease/songs/123/unknown', 'GET'))).toBe(false);
  });

  test('routes moment detail and mutations to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/moments', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/moments/12', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/moments/12', 'PUT'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/moments/12', 'DELETE'))).toBe(true);
  });

  test('routes category and tag management to Start', () => {
    for (const resource of ['categories', 'tags']) {
      expect(isStartNativeApiRequest(request(`/api/v1/${resource}`, 'GET'))).toBe(true);
      expect(isStartNativeApiRequest(request(`/api/v1/${resource}`, 'POST'))).toBe(true);
      expect(isStartNativeApiRequest(request(`/api/v1/${resource}/7`, 'GET'))).toBe(true);
      expect(isStartNativeApiRequest(request(`/api/v1/${resource}/7`, 'PUT'))).toBe(true);
      expect(isStartNativeApiRequest(request(`/api/v1/${resource}/7`, 'DELETE'))).toBe(true);
    }
  });

  test('routes comment captcha generation to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/captcha/challenge', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/captcha/image', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/captcha/challenge', 'POST'))).toBe(false);
  });

  test('routes anonymous public reads to Start while retaining authenticated admin reads', () => {
    for (const path of ['/api/v1/options', '/api/v1/categories', '/api/v1/tags', '/api/v1/posts', '/api/v1/moments', '/api/v1/links']) {
      expect(isStartNativeApiRequest(request(path, 'GET'))).toBe(true);
      const authenticated = isStartNativeApiRequest(new Request(`https://example.test${path}`, {
        headers: { authorization: 'Bearer admin-token' },
      }));
      expect(authenticated).toBe(true);
    }
    expect(isStartNativeApiRequest(request('/api/v1/comments', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/posts', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/posts/-3', 'PUT'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/posts/12', 'DELETE'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/options', 'PUT'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/options', 'POST'))).toBe(true);
  });

  test('routes generic content management to Start', () => {
    for (const resource of ['albums', 'books', 'games', 'goods', 'links', 'movies', 'music', 'playlists', 'videos']) {
      expect(isStartNativeApiRequest(request(`/api/v1/${resource}`, 'GET'))).toBe(true);
      expect(isStartNativeApiRequest(request(`/api/v1/${resource}`, 'POST'))).toBe(true);
      expect(isStartNativeApiRequest(request(`/api/v1/${resource}/7`, 'GET'))).toBe(true);
      expect(isStartNativeApiRequest(request(`/api/v1/${resource}/7`, 'PUT'))).toBe(true);
      expect(isStartNativeApiRequest(request(`/api/v1/${resource}/7`, 'DELETE'))).toBe(true);
    }
    expect(isStartNativeApiRequest(request('/api/v1/playlists/import', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/playlists/7/songs', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/playlists/7/songs', 'DELETE'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/albums/7/photos', 'GET'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/albums/7/photos', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/albums/7/photos/9', 'DELETE'))).toBe(true);
  });

  test('routes authenticated comment list reads to Start for admin filtering', () => {
    expect(isStartNativeApiRequest(new Request('https://example.test/api/v1/comments?status=pending', {
      headers: { authorization: 'Bearer admin-token' },
    }))).toBe(true);
  });

  test('routes public detail and supplemental reads to Start', () => {
    for (const path of ['/api/v1/owner', '/api/v1/archive/stats', '/api/v1/footprints', '/api/v1/moments/recent-tags',
      '/api/v1/public/albums', '/api/v1/public/albums/summer', '/api/v1/posts/12', '/api/v1/posts/slug/hello',
      '/api/v1/posts/by-display-id/7', '/api/v1/posts/12/comments', '/api/v1/posts/12/episodes', '/api/v1/posts/12/navigation']) {
      expect(isStartNativeApiRequest(request(path, 'GET'))).toBe(true);
    }
    expect(isStartNativeApiRequest(new Request('https://example.test/api/v1/posts/-3', {
      headers: { authorization: 'Bearer admin-token' },
    }))).toBe(true);
    expect(isStartNativeApiRequest(new Request('https://example.test/api/v1/posts/12', {
      headers: { authorization: 'Bearer admin-token' },
    }))).toBe(true);
  });

  test('routes link applications and visitor comment edits to Start', () => {
    expect(isStartNativeApiRequest(request('/api/v1/links/apply', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/7/edit', 'PUT'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/7/edit', 'GET'))).toBe(false);
  });

  test('routes public comment creation while retaining unknown detail reads in compatibility', () => {
    expect(isStartNativeApiRequest(request('/api/v1/comments', 'POST'))).toBe(true);
    expect(isStartNativeApiRequest(request('/api/v1/comments/42', 'GET'))).toBe(false);
  });
});
