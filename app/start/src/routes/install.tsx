import { createFileRoute } from '@tanstack/react-router';
import { Providers } from '@/components/AppProviders';
import InstallPage from '@/components/pages/install/InstallPage';

export const Route = createFileRoute('/install')({
  head: () => ({ meta: [{ title: 'Utterlog 安装' }] }),
  component: InstallRoute,
});

function InstallRoute() {
  return <Providers><InstallPage /></Providers>;
}
