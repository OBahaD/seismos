'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useSeismosStore } from '@/lib/store';
import { DEMO_NODES, earthquakeSimulator } from '@/lib/simulator';
import DashboardPanel from '@/components/dashboard/DashboardPanel';
import SidebarNavigation from '@/components/SidebarNavigation';
import TiltBuildingCard from '@/components/TiltBuildingCard';

const SeismicMap = dynamic(() => import('@/components/map/SeismicMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">
      Harita yükleniyor...
    </div>
  ),
});

export default function Home() {
  const { setNodes, updateHeartbeat, checkConsensus } = useSeismosStore();
  const isInitialized = useRef(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Node'ları yükle
    setNodes(DEMO_NODES as any);

    // Arka plan sensör simülasyonunu başlat
    earthquakeSimulator.startIdleSimulation();

    // Store'u simülatöre bağla (INSD Logic için)
    const unsubscribe = earthquakeSimulator.onLiveUpdate((readings) => {
      const activeNodeIds = Array.from(readings.keys());
      updateHeartbeat(activeNodeIds);
      checkConsensus(readings);
    });

    return () => {
      unsubscribe();
      earthquakeSimulator.stopIdleSimulation();
    };
  }, [setNodes, updateHeartbeat, checkConsensus]);

  return (
    <div className="h-screen bg-slate-950 overflow-hidden flex">
      {/* Sidebar Navigation */}
      <SidebarNavigation onCollapsedChange={setSidebarCollapsed} />

      {/* Main Content Area */}
      <div className="flex-1 h-screen overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="h-12 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-400">Sistem Aktif</span>
            </div>
            <div className="h-4 w-px bg-slate-700"></div>
            <span className="text-sm text-slate-500">80 Bina İzleniyor</span>
          </div>
          <div className="text-xs text-slate-500">
            Seismos v1.0 - Dağıtık Deprem İzleme Ağı
          </div>
        </div>

        {/* Main Grid - Fixed Height */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Map - 2/3 width, fixed height */}
            <div className="lg:col-span-2 h-full min-h-0">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl h-full flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Canlı Sismik Harita
                  </h2>
                  <div className="text-xs text-slate-500">Leaflet + Heatmap</div>
                </div>
                <div className="flex-1 min-h-0">
                  <SeismicMap />
                </div>
              </div>
            </div>

            {/* Dashboard Panel - 1/3 width, scrollable */}
            <div className="lg:col-span-1 h-full min-h-0">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl h-full flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                    Kontrol Paneli
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 p-4">
                  <DashboardPanel />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Building Cards Section */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <TiltBuildingCard
              buildingId="B-001"
              score={85}
              type="Konut"
              yearBuilt={2015}
            />
            <TiltBuildingCard
              buildingId="B-002"
              score={72}
              type="Ofis"
              yearBuilt={2010}
            />
            <TiltBuildingCard
              buildingId="B-003"
              score={45}
              type="Endüstriyel"
              yearBuilt={1995}
            />
            <TiltBuildingCard
              buildingId="B-004"
              score={91}
              type="Kamu"
              yearBuilt={2020}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
