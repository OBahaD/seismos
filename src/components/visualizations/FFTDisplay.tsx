'use client';

import { useEffect, useRef } from 'react';
import { useSeismosStore } from '@/lib/store';

interface FFTDisplayProps {
    nodeId: string;
    width?: number;
    height?: number;
}

export default function FFTDisplay({ nodeId, width = 300, height = 120 }: FFTDisplayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const { latestReadings } = useSeismosStore();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let bars: number[] = new Array(32).fill(0);

        const draw = () => {
            const reading = latestReadings.get(nodeId);
            const intensity = reading ? Math.min(reading.magnitude / 2, 1) : 0;

            // Update bars with some randomness + intensity modulation
            bars = bars.map((prev, i) => {
                const target = Math.random() * 0.15; // Reduced base noise
                let signal = target;

                if (reading) {
                    const center = 8 + intensity * 16;
                    const dist = Math.abs(i - center);
                    signal += Math.exp(-dist * dist / 25) * intensity;
                }

                return prev * 0.85 + signal * 0.15;
            });

            // Clear with slate background
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, width, height);

            // Draw grid lines (subtle)
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            for (let y = height * 0.25; y < height; y += height * 0.25) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            // Draw bars
            const barWidth = width / bars.length;
            const gap = 2;

            bars.forEach((val, i) => {
                const barHeight = val * height * 0.85;
                const x = i * barWidth;
                const y = height - barHeight;

                // Color based on intensity
                let color: string;
                if (val > 0.7) {
                    color = '#ef4444'; // Red for peaks
                } else if (val > 0.4) {
                    color = '#f59e0b'; // Amber for medium
                } else {
                    color = '#64748b'; // Slate for low
                }

                ctx.fillStyle = color;
                ctx.fillRect(x + 1, y, barWidth - gap, barHeight);
            });

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
        };
    }, [nodeId, latestReadings, width, height]);

    return (
        <div className="relative rounded-lg bg-slate-800 border border-slate-700 overflow-hidden">
            <div className="absolute top-2 left-3 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Frekans Spektrumu
            </div>
            <canvas ref={canvasRef} width={width} height={height} className="mt-4" />
        </div>
    );
}
