import { createFileRoute } from '@tanstack/react-router';
import InstallPage from '@/app/install/page';

export const Route = createFileRoute('/install')({
  head: () => ({ meta: [{ title: 'Utterlog 安装' }] }),
  component: InstallPage,
});
