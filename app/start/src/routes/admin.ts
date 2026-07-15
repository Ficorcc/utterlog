import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin')({
  server: {
    handlers: {
      GET: () => Response.redirect('/admin/', 301),
      HEAD: () => Response.redirect('/admin/', 301),
    },
  },
});
