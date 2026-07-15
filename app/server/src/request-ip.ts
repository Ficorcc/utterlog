/**
 * Resolve the original visitor IP from the proxy headers used by the site.
 * Tencent Cloud CDN puts the client address first in X-Forwarded-For.
 */
export function requestIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
    ?.split(',')
    .map((value) => value.trim())
    .find(Boolean);
  return forwarded
    || request.headers.get('x-real-ip')?.trim()
    || request.headers.get('cf-connecting-ip')?.trim()
    || '127.0.0.1';
}
