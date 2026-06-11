import Sidebar from './Sidebar';
import Header from './Header';
import Toast from '@/components/Toast';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar />
      <div className="ml-[240px] min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
      <Toast />
    </div>
  );
}
