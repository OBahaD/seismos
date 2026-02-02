'use client';

import { useState } from 'react';
import { useSeismosStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import FFTDisplay from '../visualizations/FFTDisplay';
import ValidationHUD from './ValidationHUD';
import SystemInfoModal from '../modals/SystemInfoModal';

const HEALTH_CONFIG: Record<string, { color: string; label: string }> = {
    optimal: { color: '#10b981', label: 'Normal' },
    degraded: { color: '#f59e0b', label: 'Zayıf' },
    critical: { color: '#ef4444', label: 'Kritik' },
};

export default function DeepInspectionPanel() {
    const [showInfoModal, setShowInfoModal] = useState(false);
    const {
        selectedNodeId,
        nodes,
        latestReadings,
        processedResults,
        selectNode,
        activeNodeCount,
        peakMagnitude,
        systemHealth,
        isSimulationMode,
        toggleSimulation
    } = useSeismosStore();

    const node = selectedNodeId ? nodes.get(selectedNodeId) : null;
    const reading = selectedNodeId ? latestReadings.get(selectedNodeId) : null;
    const processedResult = selectedNodeId ? processedResults.get(selectedNodeId) : null;
    const healthConfig = HEALTH_CONFIG[systemHealth] || HEALTH_CONFIG.optimal;

    // Damage score colors - semantic
    const getScoreStyle = (score: number) => {
        if (score < 30) return {
            bg: 'bg-emerald-500',
            text: 'text-emerald-400',
            light: 'bg-emerald-500/10',
            border: 'border-emerald-500/30'
        };
        if (score < 60) return {
            bg: 'bg-amber-500',
            text: 'text-amber-400',
            light: 'bg-amber-500/10',
            border: 'border-amber-500/30'
        };
        return {
            bg: 'bg-red-500',
            text: 'text-red-400',
            light: 'bg-red-500/10',
            border: 'border-red-500/30'
        };
    };

    return (
        <aside className="w-full bg-slate-900 border-l border-slate-700 flex flex-col h-full">
            {/* HEADER */}
            <div className="p-4 border-b border-slate-700 bg-slate-800/50 shrink-0">
                <div className="flex items-center justify-between">
                    <div
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity select-none"
                        onClick={() => setShowInfoModal(true)}
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M2 12h4l3-9 3 18 3-9h4" />
                            </svg>
                        </div>
                        <h1 className="font-semibold text-lg text-slate-100">SEISMOS</h1>
                    </div>
                    <Badge
                        variant="outline"
                        onClick={toggleSimulation}
                        className={`text-xs font-medium px-3 py-1 cursor-pointer transition-colors ${isSimulationMode
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            }`}
                    >
                        {isSimulationMode ? 'Simülasyon' : 'Fiziksel'}
                    </Badge>
                </div>
            </div>

            <SystemInfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />

            <div className="flex-1 overflow-y-auto">
                {!node ? (
                    /* SYSTEM DASHBOARD VIEW */
                    <div className="p-4 space-y-4">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Aktif Nodelar</div>
                                <div className="text-2xl font-bold text-slate-100 tabular-nums">{activeNodeCount}</div>
                            </div>
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Pik Şiddet</div>
                                <div className={`text-2xl font-bold tabular-nums ${peakMagnitude > 0.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {peakMagnitude.toFixed(3)}g
                                </div>
                            </div>
                        </div>

                        {/* System Health */}
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase tracking-wider text-slate-500">Sistem Durumu</span>
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: healthConfig.color }}
                                    />
                                    <span className="text-sm font-medium" style={{ color: healthConfig.color }}>
                                        {healthConfig.label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Empty State */}
                        <div className="mt-8 pt-8 border-t border-slate-700 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 mb-3 text-slate-500">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                            </div>
                            <p className="text-sm text-slate-500 max-w-[200px] mx-auto">
                                Detaylı analiz için haritadan bir bina seçin
                            </p>
                        </div>
                    </div>
                ) : (
                    /* NODE DETAILS VIEW */
                    <div className="p-4 space-y-4">
                        {/* Node Header */}
                        <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <div>
                                <h2 className="font-semibold text-slate-100">{node.name}</h2>
                                <div className="text-[10px] text-slate-500 font-mono">{node.id}</div>
                            </div>
                            <button
                                onClick={() => selectNode(null)}
                                className="text-slate-500 hover:text-slate-100 p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* HERO DAMAGE SCORE */}
                        {processedResult?.damageScore && (
                            <div className={`rounded-lg border p-4 ${getScoreStyle(processedResult.damageScore.score).light} ${getScoreStyle(processedResult.damageScore.score).border}`}>
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Hasar Skoru</div>

                                <div className="flex items-end justify-between mb-3">
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-5xl font-bold tabular-nums ${getScoreStyle(processedResult.damageScore.score).text}`}>
                                            {processedResult.damageScore.score}
                                        </span>
                                        <span className="text-slate-500 text-lg">/100</span>
                                    </div>
                                    <Badge className={`${getScoreStyle(processedResult.damageScore.score).light} ${getScoreStyle(processedResult.damageScore.score).text} border-0 font-medium`}>
                                        {processedResult.damageScore.categoryLabel}
                                    </Badge>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-4">
                                    <div
                                        className={`h-full transition-all duration-300 ${getScoreStyle(processedResult.damageScore.score).bg}`}
                                        style={{ width: `${processedResult.damageScore.score}%` }}
                                    />
                                </div>

                                {/* Component Scores */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="text-center bg-slate-800/50 rounded p-2">
                                        <div className="text-[9px] uppercase text-slate-500">Frekans</div>
                                        <div className="text-sm font-bold text-slate-300 tabular-nums">
                                            {processedResult.damageScore.components.frequencyShiftScore}
                                        </div>
                                    </div>
                                    <div className="text-center bg-slate-800/50 rounded p-2">
                                        <div className="text-[9px] uppercase text-slate-500">Enerji</div>
                                        <div className="text-sm font-bold text-slate-300 tabular-nums">
                                            {processedResult.damageScore.components.peakEnergyScore}
                                        </div>
                                    </div>
                                    <div className="text-center bg-slate-800/50 rounded p-2">
                                        <div className="text-[9px] uppercase text-slate-500">Süre</div>
                                        <div className="text-sm font-bold text-slate-300 tabular-nums">
                                            {processedResult.damageScore.components.durationScore}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Fatigue Warning */}
                        {processedResult?.fatigueIndicator?.hasWarning && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-3">
                                <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                    <div className="text-sm font-medium text-amber-400">Yapısal Yorgunluk Tespit Edildi</div>
                                    <div className="text-xs text-amber-400/70 mt-0.5">
                                        Trend: {(processedResult.fatigueIndicator.trendSlope * 1000).toFixed(2)} mHz/örnek
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Pipeline Status */}
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Sinyal İşleme</div>
                            <ValidationHUD />
                        </div>

                        {/* FFT Display */}
                        {selectedNodeId && (
                            <div>
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Spektrum Analizi</div>
                                <FFTDisplay nodeId={selectedNodeId} width={320} height={100} />
                            </div>
                        )}

                        {/* Telemetry */}
                        {reading && (
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Telemetri</div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <div className="text-xs text-slate-500">X</div>
                                        <div className="font-mono text-sm text-slate-300">{reading.accel_x.toFixed(4)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500">Y</div>
                                        <div className="font-mono text-sm text-slate-300">{reading.accel_y.toFixed(4)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500">Z</div>
                                        <div className="font-mono text-sm text-slate-300">{reading.accel_z.toFixed(4)}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}
