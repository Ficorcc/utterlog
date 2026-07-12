import type { Hono } from 'hono';
import { auth } from '../auth/middleware';
import { intParam } from '../db/helpers';
import { fail, ok } from '../http/response';
import { listPublicFootprints } from '../public-read';
import {
  FootprintServiceError,
  geocodeFootprint,
  listAdminFootprints,
  listFootprintPlaces,
  reverseLocation,
  updatePostFootprint,
} from '../services/footprints';

function serviceError(c: any, error: unknown) {
  if (error instanceof FootprintServiceError) return fail(c, error.status, error.code, error.message);
  throw error;
}

function filters(url: string) {
  const query = new URL(url).searchParams;
  return { city: query.get('city') || '', country: query.get('country') || '', route: query.get('route') || '',
    keyword: query.get('keyword') || query.get('search') || '' };
}

export function registerFootprintRoutes(app: Hono) {
  app.get('/api/v1/footprints', async (c) => ok(c, await listPublicFootprints(filters(c.req.url))));
  app.get('/api/v1/admin/footprints', auth, async (c) => ok(c, await listAdminFootprints(filters(c.req.url))));
  app.put('/api/v1/admin/footprints/:id', auth, async (c) => {
    try {
      await updatePostFootprint(intParam(c.req.param('id')), await c.req.json().catch(() => ({})));
      return ok(c, null);
    } catch (error) { return serviceError(c, error); }
  });
  app.get('/api/v1/admin/footprints/places', auth, async (c) => {
    return ok(c, await listFootprintPlaces(new URL(c.req.url).searchParams.get('search') || ''));
  });
  app.post('/api/v1/admin/footprints/geocode', auth, async (c) => {
    try { return ok(c, await geocodeFootprint(await c.req.json().catch(() => ({})))); }
    catch (error) { return serviceError(c, error); }
  });
  app.get('/api/v1/location/reverse', async (c) => {
    const query = new URL(c.req.url).searchParams;
    try { return ok(c, await reverseLocation(Number(query.get('lat')), Number(query.get('lng')))); }
    catch (error) { return serviceError(c, error); }
  });
}
