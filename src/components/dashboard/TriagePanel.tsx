'use client';

import { useMemo } from 'react';
import { useSeismosStore } from '@/lib/store';
import { BUILDING_METADATA } from '@/lib/simulator';

interface TriageBuilding {
    id: string;
    name: string;
    score: number;
    priority: number;
    floors: number;
    yearBuilt: number;
    structureType: string;
    reason: string;
}

const STRUCTURE_RISK: Record<string, number> = {
    ahsap: 1.5,
    yigma: 1.3,
    betonarme: 1.0,
    celik: 0.8,
};

export default function TriagePanel({ onSelectBuilding }: { onSelectBuilding: (id: string) => void }) {
    const { nodes, buildingDamages } = useSeismosStore();

    const triageList = useMemo(() => {
        const buildings: TriageBuilding[] = [];

        nodes.forEach((node, id) => {
            const damage = buildingDamages.get(id);
            const meta = BUILDING_METADATA.get(id);
            if (!damage || !meta) return;

            const score = damage.totalScore;
            if (score < 30) return; // Sadece hasarlı binalar

            // Öncelik hesaplama formülü
            // Faktörler: Hasar skoru, kat sayısı (nüfus yoğunluğu), yaş, yapı tipi
            const structureRisk = STRUCTURE_RISK[meta.structureType] || 1.0;
            const ageRisk = meta.yearBuilt < 1980 ? 1.3 : meta.yearBuilt < 2000 ? 1.1 : 1.0;
            const floorRisk = 1 + (meta.floors * 0.1); // Her kat +%10 risk

            const priority = Math.round(score * structureRisk * ageRisk * floorRisk);

            // Neden öncelikli?
            const reasons: string[] = [];
            if (score >= 70) reasons.push('Ağır Hasarlı');
            else if (score >= 30) reasons.push('Hasarlı');
            if (meta.floors >= 5) reasons.push(`${meta.floors} Katlı`);
            if (meta.yearBuilt < 1980) reasons.push('Eski Yapı');
            if (meta.structureType === 'yigma') reasons.push('Yığma');
            if (meta.structureType === 'ahsap') reasons.push('Ahşap');

            buildings.push({
                id,
                name: node.name,
                score,
                priority,
                floors: meta.floors,
                yearBuilt: meta.yearBuilt,
                structureType: meta.structureType,
                reason: reasons.slice(0, 2).join(' • '),
            });
        });

        // Önceliğe göre sırala (yüksek = acil)
        return buildings.sort((a, b) => b.priority - a.priority).slice(0, 10);
    }, [nodes, buildingDamages]);

    if (triageList.length === 0) {
        return null; // Hasarlı bina yoksa gösterme
    }

    const getPriorityColor = (priority: number) => {
        if (priority >= 100) return 'bg-red-500';
        if (priority >= 70) return 'bg-orange-500';
        return 'bg-yellow-500';
    };

    const getPriorityLabel = (priority: number) => {
        if (priority >= 100) return 'ACİL';
        if (priority >= 70) return 'YÜKSEK';
        return 'ORTA';
    };

    return (
        <div className="bg-slate-900/80 border border-red-900/50 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="bg-red-900/30 px-4 py-3 border-b border-red-900/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white">Müdahale Öncelik Listesi</h3>
                    <p className="text-[10px] text-red-400/80">AFAD Triyaj Paneli</p>
                </div>
                <span className="ml-auto px-2 py-1 bg-red-500/20 rounded text-xs text-red-400 font-mono">
                    {triageList.length} bina
                </span>
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto">
                {triageList.map((building, index) => (
                    <button
                        key={building.id}
                        onClick={() => onSelectBuilding(building.id)}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-800/50 transition-colors border-b border-slate-800/50 last:border-b-0"
                    >
                        {/* Sıra numarası */}
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                            {index + 1}
                        </div>

                        {/* Bina bilgisi */}
                        <div className="flex-1 text-left">
                            <div className="text-sm text-white font-medium">{building.name}</div>
                            <div className="text-[10px] text-slate-500">{building.reason}</div>
                        </div>

                        {/* Skor */}
                        <div className="text-right">
                            <div className="text-sm font-mono font-bold text-red-400">{building.score}</div>
                            <div className="text-[10px] text-slate-500">hasar</div>
                        </div>

                        {/* Öncelik etiketi */}
                        <div className={`px-2 py-1 rounded text-[10px] font-bold text-white ${getPriorityColor(building.priority)}`}>
                            {getPriorityLabel(building.priority)}
                        </div>
                    </button>
                ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-900/50 border-t border-slate-800/50 text-[10px] text-slate-500">
                Öncelik = Hasar × Kat × Yaş × Yapı Tipi
            </div>
        </div>
    );
}
