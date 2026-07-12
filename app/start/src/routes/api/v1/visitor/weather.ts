import { createFileRoute } from '@tanstack/react-router';
import { getVisitorWeather } from '../../../../../../server/src/public-read';
import { apiOk } from '../../../../server/http';

function visitorIp(request: Request) {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || '127.0.0.1';
}

export const Route = createFileRoute('/api/v1/visitor/weather')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const response = apiOk(await getVisitorWeather(visitorIp(request)));
        response.headers.set('Cache-Control', 'private, max-age=600');
        return response;
      },
    },
  },
});
