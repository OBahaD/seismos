/**
 * SEISMOS Baseline Tracker
 * 
 * Tracks each building's "fingerprint" frequency over time and detects
 * long-term structural fatigue (pre-earthquake degradation).
 * 
 * Physical Rationale:
 * - Buildings have a natural frequency determined by their stiffness and mass
 * - As concrete fatigues, steel corrodes, or foundations settle, stiffness drops
 * - This causes the natural frequency to slowly decrease over weeks/months
 * - Detecting this trend enables preventive maintenance before earthquake
 * 
 * Algorithm:
 * - Store rolling window of dominant frequency estimates
 * - Calculate baseline from median of initial stable readings
 * - Use linear regression to detect downward trend
 * - Trigger warning if slope exceeds conservative threshold
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Structural fatigue indicator for a building
 */
export interface FatigueIndicator {
    /** Whether a fatigue warning should be shown */
    hasWarning: boolean;

    /** 
     * Trend slope (frequency change per sample)
     * Negative = degradation (frequency dropping)
     * Near zero = stable
     */
    trendSlope: number;

    /** Baseline frequency established during initial period (Hz) */
    baselineFrequency: number;

    /** Current estimated frequency (Hz) */
    currentFrequency: number;

    /** Percentage deviation from baseline */
    deviationPercent: number;

    /** Number of samples in history */
    sampleCount: number;

    /** Confidence level in the trend (0-1) based on R² */
    trendConfidence: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Fatigue detection parameters
 * 
 * These are chosen to be CONSERVATIVE to avoid false positives.
 * In a real deployment, these would be calibrated per building type.
 */
const CONFIG = {
    /**
     * Number of samples to establish baseline
     * We want enough samples to get a stable median
     */
    baselineWindowSize: 20,

    /**
     * Rolling window size for trend detection
     * Larger = more stable but slower to react
     */
    historyWindowSize: 50,

    /**
     * Fatigue warning slope threshold (Hz per sample)
     * 
     * Conservative choice: -0.005 Hz/sample
     * 
     * Rationale:
     * - At 20 samples/sec, this means -0.1 Hz/sec if sustained
     * - For a 5 Hz building, this would be -2% per second
     * - In reality, fatigue happens over days/weeks, not seconds
     * - For demo purposes, we scale this to be visible within minutes
     * 
     * False positive avoidance:
     * - Require consistent trend (R² > 0.3)
     * - Require minimum sample count (>30)
     */
    fatigueThresholdSlope: -0.005,

    /**
     * Minimum R² to trust trend calculation
     * Below this, slope might just be noise
     */
    minTrendConfidence: 0.3,

    /**
     * Minimum samples before checking for fatigue
     */
    minSamplesForFatigue: 30,
} as const;

// ============================================================================
// BASELINE TRACKER
// ============================================================================

interface NodeBaseline {
    /** Rolling frequency history */
    frequencyHistory: number[];

    /** Established baseline (median of first N readings) */
    baselineFrequency: number | null;

    /** Whether baseline has been established */
    isBaselineSet: boolean;
}

/**
 * Tracks baseline frequency and detects structural fatigue for each node
 */
export class BaselineTracker {
    private nodeBaselines: Map<string, NodeBaseline> = new Map();

    /**
     * Update with new frequency reading and get fatigue indicator
     */
    update(nodeId: string, frequency: number): FatigueIndicator {
        // Initialize if new node
        if (!this.nodeBaselines.has(nodeId)) {
            this.nodeBaselines.set(nodeId, {
                frequencyHistory: [],
                baselineFrequency: null,
                isBaselineSet: false,
            });
        }

        const baseline = this.nodeBaselines.get(nodeId)!;

        // Add to history
        baseline.frequencyHistory.push(frequency);

        // Trim to window size
        while (baseline.frequencyHistory.length > CONFIG.historyWindowSize) {
            baseline.frequencyHistory.shift();
        }

        // Establish baseline from first N readings
        if (!baseline.isBaselineSet && baseline.frequencyHistory.length >= CONFIG.baselineWindowSize) {
            baseline.baselineFrequency = this.calculateMedian(
                baseline.frequencyHistory.slice(0, CONFIG.baselineWindowSize)
            );
            baseline.isBaselineSet = true;
        }

        // Calculate fatigue indicator
        return this.calculateFatigueIndicator(nodeId, baseline, frequency);
    }

    /**
     * Get current baseline for a node (for feature extraction)
     */
    getBaseline(nodeId: string): number {
        const baseline = this.nodeBaselines.get(nodeId);
        return baseline?.baselineFrequency ?? 5.0; // Default 5 Hz
    }

    /**
     * Calculate fatigue indicator for a node
     */
    private calculateFatigueIndicator(
        nodeId: string,
        baseline: NodeBaseline,
        currentFrequency: number
    ): FatigueIndicator {
        const sampleCount = baseline.frequencyHistory.length;
        const baselineFreq = baseline.baselineFrequency ?? currentFrequency;

        // Calculate deviation
        const deviationPercent = baselineFreq > 0
            ? ((baselineFreq - currentFrequency) / baselineFreq) * 100
            : 0;

        // Not enough data yet
        if (sampleCount < CONFIG.minSamplesForFatigue) {
            return {
                hasWarning: false,
                trendSlope: 0,
                baselineFrequency: baselineFreq,
                currentFrequency,
                deviationPercent,
                sampleCount,
                trendConfidence: 0,
            };
        }

        // Calculate trend using linear regression
        const { slope, rSquared } = this.linearRegression(baseline.frequencyHistory);

        // Determine if warning should trigger
        // Conservative: only warn if slope is negative AND confident
        const hasWarning =
            slope < CONFIG.fatigueThresholdSlope &&
            rSquared > CONFIG.minTrendConfidence;

        return {
            hasWarning,
            trendSlope: slope,
            baselineFrequency: baselineFreq,
            currentFrequency,
            deviationPercent,
            sampleCount,
            trendConfidence: rSquared,
        };
    }

    /**
     * Simple linear regression to detect trend
     * Returns slope and R² (coefficient of determination)
     */
    private linearRegression(values: number[]): { slope: number; rSquared: number } {
        const n = values.length;
        if (n < 2) return { slope: 0, rSquared: 0 };

        // X values are just indices 0, 1, 2, ...
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumX2 = 0;
        let sumY2 = 0;

        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumX2 += i * i;
            sumY2 += values[i] * values[i];
        }

        const meanX = sumX / n;
        const meanY = sumY / n;

        // Slope = Σ(xi - x̄)(yi - ȳ) / Σ(xi - x̄)²
        const numerator = sumXY - n * meanX * meanY;
        const denominator = sumX2 - n * meanX * meanX;

        if (denominator === 0) return { slope: 0, rSquared: 0 };

        const slope = numerator / denominator;

        // R² = 1 - (SS_res / SS_tot)
        // SS_res = Σ(yi - ŷi)²
        // SS_tot = Σ(yi - ȳ)²
        const intercept = meanY - slope * meanX;

        let ssRes = 0;
        let ssTot = 0;

        for (let i = 0; i < n; i++) {
            const predicted = slope * i + intercept;
            ssRes += (values[i] - predicted) ** 2;
            ssTot += (values[i] - meanY) ** 2;
        }

        const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

        return { slope, rSquared: Math.max(0, rSquared) };
    }

    /**
     * Calculate median of an array
     */
    private calculateMedian(values: number[]): number {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    /**
     * Reset tracking for a node or all nodes
     */
    reset(nodeId?: string): void {
        if (nodeId) {
            this.nodeBaselines.delete(nodeId);
        } else {
            this.nodeBaselines.clear();
        }
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const baselineTracker = new BaselineTracker();
