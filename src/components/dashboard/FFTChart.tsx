'use client';

import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { SignalType } from '@/lib/simulator';

interface FFTChartProps {
    spectrum: number[];
    signalType: SignalType;
    dominantFrequency: number;
}

// Frekans bandı renkleri
const SIGNAL_COLORS: Record<SignalType, { stroke: string; fill: string; label: string }> = {
    idle: { stroke: '#10b981', fill: '#10b98133', label: 'Normal' },
    seismic: { stroke: '#ef4444', fill: '#ef444433', label: 'Sismik' },
    noise: { stroke: '#f59e0b', fill: '#f59e0b33', label: 'Gürültü' },
    anomaly: { stroke: '#8b5cf6', fill: '#8b5cf633', label: 'Anomali' },
};

export default function FFTChart({ spectrum, signalType, dominantFrequency }: FFTChartProps) {
    // Spectrum -> Chart data
    const data = spectrum.map((power, index) => ({
        hz: (index * 0.5).toFixed(1),
        power: Math.round(power * 100) / 100,
    }));

    const colors = SIGNAL_COLORS[signalType];

    return (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    FFT Spektrumu
                </h4>
                <div className="flex items-center gap-2">
                    <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: colors.fill, color: colors.stroke, border: `1px solid ${colors.stroke}` }}
                    >
                        {colors.label}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                        {dominantFrequency.toFixed(1)} Hz
                    </span>
                </div>
            </div>

            <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id={`gradient-${signalType}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={colors.stroke} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="hz"
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            axisLine={{ stroke: '#475569' }}
                            tickLine={false}
                            interval={3}
                        />
                        <YAxis
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 1]}
                        />
                        {/* Sismik tehlike bölgesi (1-4 Hz) */}
                        <ReferenceLine x="2.0" stroke="#ef4444" strokeDasharray="3 3" opacity={0.3} />
                        <ReferenceLine x="4.0" stroke="#ef4444" strokeDasharray="3 3" opacity={0.3} />

                        {/* Normal bina frekansı (4-5 Hz) */}
                        <ReferenceLine x="4.5" stroke="#10b981" strokeDasharray="3 3" opacity={0.3} />

                        {/* Gürültü bölgesi (8+ Hz) */}
                        <ReferenceLine x="8.0" stroke="#f59e0b" strokeDasharray="3 3" opacity={0.3} />

                        <Area
                            type="monotone"
                            dataKey="power"
                            stroke={colors.stroke}
                            strokeWidth={2}
                            fill={`url(#gradient-${signalType})`}
                            animationDuration={150}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-1">
                <span className="text-red-400/70">← Sismik (1-4 Hz)</span>
                <span className="text-emerald-400/70">Normal (4-5 Hz)</span>
                <span className="text-amber-400/70">Gürültü (8+ Hz) →</span>
            </div>
        </div>
    );
}
