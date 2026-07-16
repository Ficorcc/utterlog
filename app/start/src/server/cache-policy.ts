export function isVisitorPersonalizedPage(pathname: string) {
  return pathname === '/' || /^\/page\/\d+\/?$/.test(pathname);
}
