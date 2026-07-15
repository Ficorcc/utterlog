/**
 * Resolve the original visitor IP from the proxy headers used by the site.
 * EdgeOne writes the client address to EO-Client-IP before the request
 * reaches the origin. Fall back to standard proxy headers for other hosts.
 */
export function requestIp(request: Request) {
  const edgeOneIp = request.headers.get('eo-client-ip')?.trim();
  if (edgeOneIp) return edgeOneIp;

  const forwarded = request.headers.get('x-forwarded-for')
    ?.split(',')
    .map((value) => value.trim())
    .find(Boolean);
  return forwarded
    || request.headers.get('x-real-ip')?.trim()
    || request.headers.get('cf-connecting-ip')?.trim()
    || '127.0.0.1';
}
