'use client';

import { LineChart, Line, ResponsiveContainer, ReferenceLine, YAxis } from 'recharts';

interface FrequencySparklineProps {
    history: number[];
    currentDamage: number;
}

export default function FrequencySparkline({ history, currentDamage }: FrequencySparklineProps) {
    if (history.length < 5) {
        return (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="text-xs text-slate-500 text-center py-4">
                    Veri toplanıyor...
                </div>
            </div>
        );
    }

    // Veriyi chart formatına çevir
    const data = history.map((freq, index) => ({
        index,
        freq: Math.round(freq * 100) / 100,
    }));

    // Trend analizi: İlk ve son değerleri karşılaştır
    const firstAvg = history.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const lastAvg = history.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const trend = lastAvg - firstAvg;
    const trendPercent = ((trend / firstAvg) * 100).toFixed(1);

    // Renk belirleme
    const getColor = () => {
        if (currentDamage >= 70) return '#ef4444'; // Kırmızı
        if (currentDamage >= 30) return '#f59e0b'; // Turuncu
        return '#10b981'; // Yeşil
    };

    const getTrendLabel = () => {
        if (Math.abs(trend) < 0.1) return { text: 'Stabil', color: 'text-emerald-400' };
        if (trend < 0) return { text: `↓ ${Math.abs(Number(trendPercent))}% (Zayıflama)`, color: 'text-red-400' };
        return { text: `↑ ${trendPercent}% (Toparlanma)`, color: 'text-emerald-400' };
    };

    const trendInfo = getTrendLabel();

    return (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    Frekans Trendi
                </h4>
                <span className={`text-xs font-medium ${trendInfo.color}`}>
                    {trendInfo.text}
                </span>
            </div>

            <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <YAxis
                            domain={[0, 6]}
                            hide
                        />
                        {/* Sağlıklı referans çizgisi (4.5 Hz) */}
                        <ReferenceLine y={4.5} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.5} />
                        {/* Kritik eşik (2 Hz) */}
                        <ReferenceLine y={2} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />

                        <Line
                            type="monotone"
                            dataKey="freq"
                            stroke={getColor()}
                            strokeWidth={2}
                            dot={false}
                            animationDuration={100}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Alt bilgi */}
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Geçmiş</span>
                <span className="text-slate-400 font-mono">
                    {lastAvg.toFixed(1)} Hz
                </span>
                <span>Şimdi</span>
            </div>

            {/* Açıklama */}
            <div className="mt-2 text-[10px] text-slate-600 border-t border-slate-700/50 pt-2">
                <span className="text-emerald-400/60">— 4.5Hz</span> Sağlıklı |
                <span className="text-red-400/60 ml-1">— 2Hz</span> Kritik Eşik
            </div>
        </div>
    );
}
