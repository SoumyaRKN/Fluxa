import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from '@/components/Layout/Header';
import { Sidebar } from '@/components/Layout/Sidebar';
import { FileExplorer } from '@/components/FileExplorer';
import { DeviceList } from '@/components/DeviceList';
import { TransferPanel } from '@/components/TransferPanel';
import { ConnectionModal } from '@/components/ConnectionModal';
import { QRCodeModal } from '@/components/QRCode';
import { NotificationStack } from '@/components/Layout/Notifications';
import { useAppStore } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useSelfInfo } from '@/api/devices';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function AppInner() {
  useWebSocket();

  const { activePanel, setSelfInfo } = useAppStore();
  const { data: selfInfo } = useSelfInfo();

  useEffect(() => {
    if (selfInfo) setSelfInfo(selfInfo);
  }, [selfInfo, setSelfInfo]);

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      <Header />

      <div className="flex flex-1 min-h-0">
        <Sidebar />

        <main className="flex flex-1 min-w-0 min-h-0">
          {activePanel === 'files' && <FileExplorer />}
          {activePanel === 'devices' && <DeviceList />}
          {activePanel === 'transfers' && <TransferPanel />}
        </main>
      </div>

      <ConnectionModal />
      <QRCodeModal />
      <NotificationStack />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
