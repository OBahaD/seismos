import type { SensorReading, NodeStatus } from '../supabase/types';
import {
    damageScoreCalculator,
    featureExtractor,
    frequencyEstimator,
    type DamageScore,
    type DamageFeatures
} from '../damage-score';
import { baselineTracker, type FatigueIndicator } from '../damage-score/baseline-tracker';

export interface FilteredReading extends SensorReading {
    filteredMagnitude: number;
    rawMagnitude: number;
}


// Simple moving average filter
export class MovingAverageFilter {
    private buffer: number[] = [];
    private windowSize: number;

    constructor(windowSize: number = 5) {
        this.windowSize = windowSize;
    }

    apply(value: number): number {
        this.buffer.push(value);
        if (this.buffer.length > this.windowSize) {
            this.buffer.shift();
        }
        return this.buffer.reduce((a, b) => a + b, 0) / this.buffer.length;
    }

    reset(): void {
        this.buffer = [];
    }
}

// High-pass filter to remove DC offset
export class HighPassFilter {
    private alpha: number;
    private previousFiltered: number = 0;
    private previousRaw: number = 0;

    constructor(cutoffFrequency: number = 0.5, sampleRate: number = 100) {
        // RC time constant
        const rc = 1 / (2 * Math.PI * cutoffFrequency);
        const dt = 1 / sampleRate;
        this.alpha = rc / (rc + dt);
    }

    apply(value: number): number {
        const filtered = this.alpha * (this.previousFiltered + value - this.previousRaw);
        this.previousFiltered = filtered;
        this.previousRaw = value;
        return filtered;
    }

    reset(): void {
        this.previousFiltered = 0;
        this.previousRaw = 0;
    }
}

// Magnitude thresholds for status interpretation
const STATUS_THRESHOLDS = {
    stable: 0.2,      // < 0.2g
    anomaly: 0.5,     // 0.2g - 0.5g
    warning: 1.0,     // 0.5g - 1.0g
    critical: Infinity // > 1.0g
};

export function interpretMagnitude(magnitude: number): NodeStatus {
    if (magnitude < STATUS_THRESHOLDS.stable) return 'stable';
    if (magnitude < STATUS_THRESHOLDS.anomaly) return 'anomaly';
    if (magnitude < STATUS_THRESHOLDS.warning) return 'warning';
    return 'critical';
}

export interface CorrelationResult {
    isCorrelated: boolean;
    correlatedNodes: string[];
    eventId?: string;
}

// Check for correlated events across nodes
export function checkCorrelation(
    readings: Map<string, { timestamp: number; magnitude: number }>,
    threshold: number = 0.5,
    windowMs: number = 500
): CorrelationResult {
    const now = Date.now();
    const recentHighMagnitude: string[] = [];

    readings.forEach((reading, nodeId) => {
        const age = now - reading.timestamp;
        if (age <= windowMs && reading.magnitude >= threshold) {
            recentHighMagnitude.push(nodeId);
        }
    });

    return {
        isCorrelated: recentHighMagnitude.length >= 2,
        correlatedNodes: recentHighMagnitude,
        eventId: recentHighMagnitude.length >= 2 ? `event_${now}` : undefined,
    };
}

export interface PipelineResult {
    reading: SensorReading;
    rawMagnitude: number;
    filteredMagnitude: number;
    isCorrelated: boolean;
    correlatedNodes: string[];
    status: NodeStatus;

    // NEW: Damage scoring
    damageScore: DamageScore;
    fatigueIndicator: FatigueIndicator;

    stages: {
        raw: { complete: boolean; timestamp: number };
        filter: { complete: boolean; timestamp: number };
        correlate: { complete: boolean; timestamp: number };
        interpret: { complete: boolean; timestamp: number };
    };
}

export class SignalProcessor {
    private filters: Map<string, { ma: MovingAverageFilter; hp: HighPassFilter }> = new Map();
    private recentReadings: Map<string, { timestamp: number; magnitude: number }> = new Map();

    getOrCreateFilters(nodeId: string) {
        if (!this.filters.has(nodeId)) {
            this.filters.set(nodeId, {
                ma: new MovingAverageFilter(5),
                hp: new HighPassFilter(0.5, 100),
            });
        }
        return this.filters.get(nodeId)!;
    }

    process(reading: SensorReading): PipelineResult {
        const now = Date.now();
        const stages = {
            raw: { complete: false, timestamp: 0 },
            filter: { complete: false, timestamp: 0 },
            correlate: { complete: false, timestamp: 0 },
            interpret: { complete: false, timestamp: 0 },
        };

        // Stage 1: RAW
        const rawMagnitude = reading.magnitude;
        stages.raw = { complete: true, timestamp: now };

        // Stage 2: FILTER
        const { ma, hp } = this.getOrCreateFilters(reading.node_id);
        const hpFiltered = hp.apply(rawMagnitude);
        const filteredMagnitude = Math.abs(ma.apply(hpFiltered));
        stages.filter = { complete: true, timestamp: Date.now() };

        // Stage 3: CORRELATE
        this.recentReadings.set(reading.node_id, {
            timestamp: now,
            magnitude: filteredMagnitude,
        });
        const correlation = checkCorrelation(this.recentReadings);
        stages.correlate = { complete: true, timestamp: Date.now() };

        // Stage 4: INTERPRET (now includes damage scoring)
        // 4a. Estimate current dominant frequency using zero-crossing
        const currentFrequency = frequencyEstimator.estimate(reading.node_id, filteredMagnitude);

        // 4b. Update baseline tracker and get fatigue indicator
        const fatigueIndicator = baselineTracker.update(reading.node_id, currentFrequency);
        const baselineFrequency = baselineTracker.getBaseline(reading.node_id);

        // 4c. Extract features for damage scoring
        const features = featureExtractor.extract(
            reading.node_id,
            filteredMagnitude,
            currentFrequency,
            baselineFrequency,
            now
        );

        // 4d. Calculate damage score
        const damageScore = damageScoreCalculator.calculate(features);

        // Use damage score's legacy status for backward compatibility
        const status = damageScore.legacyStatus;
        stages.interpret = { complete: true, timestamp: Date.now() };

        return {
            reading,
            rawMagnitude,
            filteredMagnitude,
            isCorrelated: correlation.isCorrelated,
            correlatedNodes: correlation.correlatedNodes,
            status,
            damageScore,
            fatigueIndicator,
            stages,
        };
    }

    clearOldReadings(maxAge: number = 5000): void {
        const now = Date.now();
        this.recentReadings.forEach((reading, nodeId) => {
            if (now - reading.timestamp > maxAge) {
                this.recentReadings.delete(nodeId);
            }
        });
    }

    reset(): void {
        this.filters.clear();
        this.recentReadings.clear();
    }
}

export const signalProcessor = new SignalProcessor();
