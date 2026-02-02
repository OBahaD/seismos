'use client';

import { useSeismosStore } from '@/lib/store';

const STAGES = [
    { id: 'raw', name: 'Sinyal Kazanımı', icon: '1' },
    { id: 'filter', name: 'Dijital Filtreleme', icon: '2' },
    { id: 'correlate', name: 'Olay Korelasyonu', icon: '3' },
    { id: 'interpret', name: 'Karar Mekanizması', icon: '4' },
] as const;

export default function ValidationHUD() {
    const { pipelineStages } = useSeismosStore();

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
                {STAGES.map((stage, index) => {
                    const status = pipelineStages[stage.id as keyof typeof pipelineStages];
                    const isComplete = status === 'complete';
                    const isActive = status === 'processing';

                    return (
                        <div key={stage.id} className="flex items-center">
                            {/* Step indicator */}
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isComplete
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : isActive
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                : 'bg-slate-700 text-slate-500 border border-slate-600'
                                        }`}
                                >
                                    {isComplete ? '✓' : stage.icon}
                                </div>
                                <span className={`text-[9px] mt-1 font-medium ${isComplete ? 'text-emerald-400' : isActive ? 'text-blue-400' : 'text-slate-500'
                                    }`}>
                                    {stage.name.split(' ')[0]}
                                </span>
                            </div>

                            {/* Connector line */}
                            {index < STAGES.length - 1 && (
                                <div
                                    className={`w-8 h-0.5 mx-1 ${isComplete ? 'bg-emerald-500/50' : 'bg-slate-700'
                                        }`}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
