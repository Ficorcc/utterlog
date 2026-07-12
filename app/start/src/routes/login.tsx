import { createFileRoute } from '@tanstack/react-router';
import { Providers } from '@/components/AppProviders';
import LoginPage from '@/components/pages/login/LoginPage';

export const Route = createFileRoute('/login')({
  head: () => ({ meta: [{ title: '登录 - Utterlog' }] }),
  component: LoginRoute,
});

function LoginRoute() {
  return <Providers><LoginPage /></Providers>;
}
