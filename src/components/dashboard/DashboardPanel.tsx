'use client';

import { useState, useEffect } from 'react';
import { useSeismosStore } from '@/lib/store';
import { earthquakeSimulator, DEMO_NODES, BUILDING_METADATA, type SensorReading } from '@/lib/simulator';

type CategoryFilter = null | 'safe' | 'damaged' | 'critical' | 'collapsed';

const STRUCTURE_LABELS: Record<string, string> = {
    betonarme: 'Betonarme',
    yigma: 'Yığma Tuğla',
    celik: 'Çelik Karkas',
    ahsap: 'Ahşap',
};

import SystemInfoModal from '@/components/SystemInfoModal';

export default function DashboardPanel() {
    const {
        selectedNodeId,
        nodes,
        buildingDamages,
        selectNode,
        buildingSummary,
        isEarthquakeActive,
        earthquakeProgress,
        setEarthquakeActive,
        setEarthquakeProgress,
        applyEarthquakeDamage,
        updateBuildingSummary,
        resetToSafe,
    } = useSeismosStore();

    const [canReset, setCanReset] = useState(false);
    const [activeFilter, setActiveFilter] = useState<CategoryFilter>(null);
    const [liveReading, setLiveReading] = useState<SensorReading | null>(null);
    const [isInfoOpen, setIsInfoOpen] = useState(false);

    const node = selectedNodeId ? nodes.get(selectedNodeId) : null;
    const damage = selectedNodeId ? buildingDamages.get(selectedNodeId) : null;
    const metadata = selectedNodeId ? BUILDING_METADATA.get(selectedNodeId) : null;

    // Canlı sensör verisi güncelleme
    useEffect(() => {
        const unsubscribe = earthquakeSimulator.onLiveUpdate((readings) => {
            if (selectedNodeId) {
                const reading = readings.get(selectedNodeId);
                if (reading) setLiveReading(reading);
            }
        });
        return unsubscribe;
    }, [selectedNodeId]);

    // Seçili node değişince idle okuma göster
    useEffect(() => {
        if (selectedNodeId) {
            setLiveReading(earthquakeSimulator.getReading(selectedNodeId));
        }
    }, [selectedNodeId]);

    const getFilteredBuildings = () => {
        const buildings: Array<{ id: string; name: string; score: number }> = [];
        nodes.forEach((n, id) => {
            const d = buildingDamages.get(id);
            const score = d?.totalScore || 0;
            let category: CategoryFilter = 'safe';
            if (score >= 90 || n.status === 'collapse_inferred') category = 'collapsed';
            else if (score >= 70) category = 'critical';
            else if (score >= 30) category = 'damaged';
            if (activeFilter === category) buildings.push({ id, name: n.name, score });
        });
        return buildings.sort((a, b) => b.score - a.score);
    };

    const handleTriggerEarthquake = () => {
        if (isEarthquakeActive) return;
        setEarthquakeActive(true);
        setCanReset(false);

        // Mevcut toplam hasarı simülatöre bildir
        const currentScores = new Map<string, number>();
        buildingDamages.forEach((dmg, id) => {
            currentScores.set(id, dmg.totalScore);
        });

        const epicenter = DEMO_NODES[Math.floor(Math.random() * DEMO_NODES.length)];
        earthquakeSimulator.triggerEarthquake(
            { intensity: 1.5 + Math.random() * 0.5, durationMs: 5000, epicenterLat: epicenter.lat, epicenterLng: epicenter.lng },
            currentScores,
            (progress) => setEarthquakeProgress(progress),
            (damages) => {
                applyEarthquakeDamage(damages);
                setEarthquakeActive(false);
                updateBuildingSummary();
                setTimeout(() => setCanReset(true), 1000);
            }
        );
    };

    const handleReset = () => {
        resetToSafe();
        setCanReset(false);
        setActiveFilter(null);
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return { bg: 'bg-red-500', text: 'text-red-400', label: 'Yıkılmış' };
        if (score >= 70) return { bg: 'bg-orange-500', text: 'text-orange-400', label: 'Ağır Hasarlı' };
        if (score >= 30) return { bg: 'bg-yellow-500', text: 'text-yellow-400', label: 'Hasarlı' };
        return { bg: 'bg-emerald-500', text: 'text-emerald-400', label: 'Güvenli' };
    };

    const filteredBuildings = activeFilter ? getFilteredBuildings() : [];

    return (
        <div className="h-full flex flex-col">
            <SystemInfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />

            {/* Header */}
            <div className="p-4 border-b border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">SEISMOS</h1>
                            <p className="text-xs text-slate-500">Yapısal İzleme Sistemi</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsInfoOpen(true)}
                        className="w-8 h-8 rounded-full border border-slate-600 text-slate-400 flex items-center justify-center hover:bg-slate-800 hover:text-white transition-colors"
                        title="Sistem Nasıl Çalışır?"
                    >
                        ?
                    </button>
                </div>
            </div>

            {/* Deprem Butonu */}
            <div className="p-4 border-b border-slate-800">
                {isEarthquakeActive ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-red-400 font-medium">Deprem Aktif!</span>
                            <span className="text-xs text-slate-500 ml-auto">{Math.round(earthquakeProgress)}%</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 transition-all duration-100" style={{ width: `${earthquakeProgress}%` }} />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <button onClick={handleTriggerEarthquake} className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Deprem Simüle Et
                        </button>
                        {canReset && (
                            <button onClick={handleReset} className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors">
                                Sıfırla
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Özet */}
            <div className="p-4 border-b border-slate-800">
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-3">Bina Durumu</h3>
                <div className="grid grid-cols-4 gap-2">
                    {(['safe', 'damaged', 'critical', 'collapsed'] as const).map((cat) => {
                        const colors = { safe: 'emerald', damaged: 'yellow', critical: 'orange', collapsed: 'red' };
                        const labels = { safe: 'Güvenli', damaged: 'Hasarlı', critical: 'Ağır', collapsed: 'Yıkık' };
                        const counts = { safe: buildingSummary.safe, damaged: buildingSummary.damaged, critical: buildingSummary.critical, collapsed: buildingSummary.collapsed };
                        return (
                            <button key={cat} onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
                                className={`text-center rounded-lg p-2 transition-all ${activeFilter === cat ? `bg-${colors[cat]}-500/20 border-2 border-${colors[cat]}-500/50` : `bg-${colors[cat]}-500/10 border border-${colors[cat]}-500/20 hover:bg-${colors[cat]}-500/15`}`}
                            >
                                <div className={`text-xl font-bold text-${colors[cat]}-400`}>{counts[cat]}</div>
                                <div className={`text-[10px] text-${colors[cat]}-400/70`}>{labels[cat]}</div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* İçerik */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeFilter && filteredBuildings.length > 0 ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-slate-300">{filteredBuildings.length} bina</h3>
                            <button onClick={() => setActiveFilter(null)} className="text-xs text-slate-500 hover:text-slate-300">×</button>
                        </div>
                        {filteredBuildings.map((b) => (
                            <button key={b.id} onClick={() => { selectNode(b.id); setActiveFilter(null); }}
                                className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <span className="text-sm text-white">{b.name}</span>
                                <span className={`text-sm font-mono ${getScoreColor(b.score).text}`}>{b.score}/100</span>
                            </button>
                        ))}
                    </div>
                ) : activeFilter && filteredBuildings.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-slate-500">Bu kategoride bina yok</p>
                        <button onClick={() => setActiveFilter(null)} className="text-xs text-slate-400 hover:text-slate-300 mt-2">Geri</button>
                    </div>
                ) : node && damage && metadata ? (
                    <div className="space-y-4">
                        {/* Başlık */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold text-white">{node.name}</h2>
                                <p className="text-xs text-slate-500">{metadata.sensorId}</p>
                            </div>
                            <button onClick={() => selectNode(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* INSD Uyarısı */}
                        {node.status === 'collapse_inferred' && (
                            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-xl flex gap-3">
                                <div className="text-red-500 mt-0.5">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <div>
                                    <h4 className="text-red-400 font-bold text-sm">Sinyal Kaybı (INSD)</h4>
                                    <p className="text-red-400/80 text-xs mt-1">
                                        Bu binadan sinyal alınamıyor. Çevredeki <b>{useSeismosStore.getState().consensusEvidence.get(node.id)?.length || 0} aktif sensör</b> verisine dayanarak yıkıldığı tahmin ediliyor.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Hasar Skoru */}
                        <div className={`rounded-xl p-4 ${getScoreColor(damage.totalScore).bg}/10 border ${getScoreColor(damage.totalScore).bg}/20`}>
                            <div className="flex items-end justify-between mb-2">
                                <div>
                                    <div className="text-xs text-slate-500">Hasar Skoru</div>
                                    <div className={`text-3xl font-bold ${getScoreColor(damage.totalScore).text}`}>{damage.totalScore}<span className="text-sm text-slate-500">/100</span></div>
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(damage.totalScore).bg}/20 ${getScoreColor(damage.totalScore).text}`}>
                                    {node.status === 'collapse_inferred' ? 'Tahmini Yıkım' : getScoreColor(damage.totalScore).label}
                                </div>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full ${getScoreColor(damage.totalScore).bg} transition-all`} style={{ width: `${damage.totalScore}%` }} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                                <div className="bg-slate-800/50 rounded p-2"><span className="text-slate-500">Baz:</span> <span className="text-slate-300">{damage.baseScore}</span></div>
                                <div className="bg-slate-800/50 rounded p-2"><span className="text-slate-500">Deprem:</span> <span className="text-red-400">+{damage.earthquakeDamage}</span></div>
                            </div>
                        </div>

                        {/* Bina Bilgileri */}
                        <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
                            <h3 className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">Yapı Bilgileri</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <div className="text-slate-500 text-xs">Kat Sayısı</div>
                                    <div className="text-white font-medium">{metadata.floors} Kat</div>
                                </div>
                                <div>
                                    <div className="text-slate-500 text-xs">Yapım Yılı</div>
                                    <div className="text-white font-medium">{metadata.yearBuilt}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500 text-xs">Yapı Tipi</div>
                                    <div className="text-white font-medium">{STRUCTURE_LABELS[metadata.structureType]}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500 text-xs">Son Denetim</div>
                                    <div className="text-white font-medium">{metadata.lastInspection}</div>
                                </div>
                            </div>
                        </div>

                        {/* Canlı Sensör Verileri */}
                        {liveReading ? (
                            <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Canlı Sensör</h3>
                                    <div className={`w-2 h-2 rounded-full ${isEarthquakeActive ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                </div>
                                <div className="space-y-2">
                                    {/* İvme Değerleri */}
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="bg-slate-900/50 rounded p-2 text-center">
                                            <div className="text-slate-500">X</div>
                                            <div className={`font-mono ${isEarthquakeActive ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {liveReading.accelX.toFixed(3)}g
                                            </div>
                                        </div>
                                        <div className="bg-slate-900/50 rounded p-2 text-center">
                                            <div className="text-slate-500">Y</div>
                                            <div className={`font-mono ${isEarthquakeActive ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {liveReading.accelY.toFixed(3)}g
                                            </div>
                                        </div>
                                        <div className="bg-slate-900/50 rounded p-2 text-center">
                                            <div className="text-slate-500">Z</div>
                                            <div className={`font-mono ${isEarthquakeActive ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {liveReading.accelZ.toFixed(3)}g
                                            </div>
                                        </div>
                                    </div>
                                    {/* Büyüklük ve Frekans */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-slate-900/50 rounded p-2">
                                            <div className="text-slate-500">Büyüklük</div>
                                            <div className={`text-lg font-bold font-mono ${liveReading.magnitude > 0.1 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {liveReading.magnitude.toFixed(3)}<span className="text-slate-500 text-xs">g</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900/50 rounded p-2">
                                            <div className="text-slate-500">Frekans</div>
                                            <div className={`text-lg font-bold font-mono ${liveReading.frequency < 4 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                                {liveReading.frequency.toFixed(1)}<span className="text-slate-500 text-xs">Hz</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Sensör kapalı / INSD
                            <div className="rounded-xl bg-slate-900 border border-slate-800 p-8 flex flex-col items-center justify-center text-center">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                </div>
                                <h3 className="text-slate-400 font-medium text-sm">Sinyal Yok</h3>
                                <p className="text-slate-500 text-xs mt-1">Sensör verisi alınamıyor.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <p className="text-sm text-slate-500">Haritadan bir bina seçin</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
