import { useState } from 'react';
import { useSeismosStore } from '@/lib/store';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import FFTDisplay from '../visualizations/FFTDisplay';
import ValidationHUD from './ValidationHUD';
import SystemInfoModal from '../modals/SystemInfoModal';

const HEALTH_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
    optimal: { color: '#16a34a', label: 'NORMAL', icon: '●' },
    degraded: { color: '#ea580c', label: 'ZAYIF', icon: '◐' },
    critical: { color: '#dc2626', label: 'KRİTİK', icon: '○' },
};

export default function DeepInspectionPanel() {
    const [showInfoModal, setShowInfoModal] = useState(false);
    const {
        selectedNodeId,
        nodes,
        latestReadings,
        selectNode,
        activeNodeCount,
        peakMagnitude,
        systemHealth,
        isSimulationMode,
        toggleSimulation
    } = useSeismosStore();

    const node = selectedNodeId ? nodes.get(selectedNodeId) : null;
    const reading = selectedNodeId ? latestReadings.get(selectedNodeId) : null;
    const healthConfig = HEALTH_CONFIG[systemHealth] || HEALTH_CONFIG.optimal;

    return (
        <aside className="w-full bg-background border-l border-border flex flex-col h-full shadow-xl z-40">
            {/* GLOBAL SYSTEM STATUS HEADER (Always Visible) */}
            <div className="p-6 border-b border-border bg-white shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowInfoModal(true)}
                            className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white shadow-sm hover:bg-cyan-700 transition-colors"
                            title="Sistem Mimarisi ve INSD Bilgisi"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 12h4l3-9 3 18 3-9h4" />
                            </svg>
                        </button>
                        <h1 className="font-mono text-xl font-black tracking-tight text-gray-900 leading-none">SEISMOS</h1>
                    </div>
                    <Badge
                        variant="outline"
                        className={`font-mono text-xs font-bold px-3 py-1 border-2 ${isSimulationMode ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                    >
                        {isSimulationMode ? 'SİMÜLASYON' : 'FİZİKSEL'}
                    </Badge>
                </div>
            </div>

            <SystemInfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />

            <div className="flex-1 overflow-y-auto bg-background">
                {!node ? (
                    /* SYSTEM DASHBOARD VIEW (Default) */
                    <div className="p-6 space-y-4 animate-in fade-in duration-300">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Nodes</div>
                                <div className="font-mono text-2xl font-bold text-cyan-700">{activeNodeCount}</div>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Pik Şiddet</div>
                                <div className={`font-mono text-2xl font-bold ${peakMagnitude > 0.5 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                    {peakMagnitude.toFixed(3)}g
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="text-xs font-mono uppercase text-gray-500">Sistem Sağlığı</span>
                            <div className="flex items-center gap-2">
                                <span style={{ color: healthConfig.color }}>{healthConfig.icon}</span>
                                <span className="font-mono text-sm font-bold" style={{ color: healthConfig.color }}>
                                    {healthConfig.label}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={toggleSimulation}
                            className="w-full py-2 text-xs font-mono border border-dashed border-gray-300 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                        >
                            KAYNAK MODUNU DEĞİŞTİR
                        </button>

                        <div className="mt-8 pt-8 border-t border-dashed border-gray-200 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-3 text-gray-400">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                            </div>
                            <p className="text-xs text-gray-500 max-w-[200px] mx-auto">
                                Detaylı sinyal analizi ve yapısal durum kontrolü için haritadan bir düğüm seçin.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* NODE DETAILS VIEW (Selected) */
                    <div className="p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
                        {/* Selected Node Header */}
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div>
                                <h2 className="font-mono text-lg font-bold text-gray-900 flex items-center gap-2">
                                    {node.name}
                                </h2>
                                <div className="text-[10px] font-mono text-gray-500">ID: {node.id}</div>
                            </div>
                            <button
                                onClick={() => selectNode(null)}
                                className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-200 rounded-full transition-colors"
                                title="Kapat ve Ana Ekrana Dön"
                            >
                                ✕
                            </button>
                        </div>

                        <Separator className="bg-gray-200" />

                        {/* STATUS BADGE */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono uppercase text-gray-500">Durum</span>
                            <Badge
                                className={`font-mono uppercase tracking-wider shadow-none ${node.status === 'stable' ? 'bg-green-500/10 text-green-600' :
                                    node.status === 'anomaly' ? 'bg-yellow-500/10 text-yellow-600' :
                                        node.status === 'warning' ? 'bg-orange-500/10 text-orange-600' :
                                            'bg-red-500/10 text-red-600'
                                    }`}
                            >
                                {node.status === 'stable' ? 'STABİL' :
                                    node.status === 'anomaly' ? 'ANOMALİ' :
                                        node.status === 'warning' ? 'UYARI' : 'KRİTİK'}
                            </Badge>
                        </div>

                        {/* SIGNAL PIPELINE */}
                        <section>
                            <h3 className="text-xs font-mono uppercase text-gray-500 mb-3">Sinyal İşleme</h3>
                            <ValidationHUD />
                        </section>

                        <Separator className="bg-gray-200" />

                        {/* SPECTRUM ANALYSIS */}
                        <section>
                            <h3 className="text-xs font-mono uppercase text-gray-500 mb-3">Frekans Analizi</h3>
                            <div className="border border-gray-200 rounded overflow-hidden shadow-sm bg-white">
                                <FFTDisplay nodeId={selectedNodeId!} width={350} height={180} />
                            </div>
                        </section>

                        {/* TELEMETRY */}
                        <section className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white border border-gray-200 rounded shadow-sm">
                                <div className="text-[10px] text-gray-500 uppercase">X-Ekseni</div>
                                <div className="font-mono font-bold text-gray-900">{reading?.accel_x.toFixed(3) ?? '0.000'}</div>
                            </div>
                            <div className="p-3 bg-white border border-gray-200 rounded shadow-sm">
                                <div className="text-[10px] text-gray-500 uppercase">Y-Ekseni</div>
                                <div className="font-mono font-bold text-gray-900">{reading?.accel_y.toFixed(3) ?? '0.000'}</div>
                            </div>
                            <div className="p-3 bg-white border border-gray-200 rounded shadow-sm col-span-2">
                                <div className="text-[10px] text-gray-500 uppercase">Z-Ekseni (Dikey)</div>
                                <div className="font-mono font-bold text-gray-900">{reading?.accel_z.toFixed(3) ?? '0.000'}</div>
                            </div>
                        </section>

                        {/* METADATA */}
                        <section className="bg-gray-50 p-4 rounded border border-gray-200">
                            <h3 className="text-xs font-mono uppercase text-gray-500 mb-3">Konum Verisi</h3>
                            <div className="space-y-2 text-xs font-mono">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Enlem</span>
                                    <span className="text-gray-900">{node.lat.toFixed(5)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Boylam</span>
                                    <span className="text-gray-900">{node.lng.toFixed(5)}</span>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </aside>
    );
}
