import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/plugins')({
  beforeLoad: () => { throw redirect({ to: '/settings', hash: 'plugins', replace: true }); },
});
