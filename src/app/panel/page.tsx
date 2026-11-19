import type { Metadata } from 'next';
import Panel from '@/panel/Panel';

export const metadata: Metadata = {
  title: 'Panel · Velore Salon',
  robots: { index: false, follow: false },
};

export default function PanelPage() {
  return <Panel />;
}
