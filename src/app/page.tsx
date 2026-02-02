'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { useSeismosStore } from '@/lib/store';
import { DEMO_NODES, earthquakeSimulator } from '@/lib/simulator';
import DashboardPanel from '@/components/dashboard/DashboardPanel';

const SeismicMap = dynamic(() => import('@/components/map/SeismicMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">
      Harita yükleniyor...
    </div>
  ),
});

export default function Home() {
  const { setNodes } = useSeismosStore();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Node'ları yükle
    setNodes(DEMO_NODES as any);

    // Arka plan sensör simülasyonunu başlat
    earthquakeSimulator.startIdleSimulation();

    return () => {
      earthquakeSimulator.stopIdleSimulation();
    };
  }, [setNodes]);

  return (
    <div className="h-screen bg-slate-950 flex">
      {/* Harita */}
      <div className="flex-1 p-3">
        <div className="w-full h-full rounded-xl overflow-hidden border border-slate-800">
          <SeismicMap />
        </div>
      </div>

      {/* Panel */}
      <div className="w-[360px] border-l border-slate-800 bg-slate-900">
        <DashboardPanel />
      </div>
    </div>
  );
}
