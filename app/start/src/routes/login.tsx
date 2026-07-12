import { createFileRoute } from '@tanstack/react-router';
import LoginPage from '@/app/login/page';

export const Route = createFileRoute('/login')({
  head: () => ({ meta: [{ title: '登录 - Utterlog' }] }),
  component: LoginPage,
});
