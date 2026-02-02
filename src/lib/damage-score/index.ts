/**
 * SEISMOS Damage Score Engine
 * 
 * Calculates a numerical damage score (0-100) based on structural behavior.
 * Designed to be rule-based for MVP but ML-ready via DamageFeatures.
 * 
 * Physical Rationale:
 * - Frequency shift: Building stiffness loss causes natural frequency to drop
 * - Peak energy: Higher vibration energy = more structural stress
 * - Duration: Sustained stress causes more damage than brief spikes
 */

import type { NodeStatus } from '../supabase/types';

// ============================================================================
// TYPES - ML-Ready Feature Extraction
// ============================================================================

/**
 * Features extracted from vibration data.
 * This interface is designed so that these features can later be used
 * as input vectors for machine learning models.
 */
export interface DamageFeatures {
    /** Percentage deviation from baseline frequency (0-100+) */
    frequencyShift: number;
    
    /** Normalized peak vibration energy (0-1 scale) */
    peakEnergy: number;
    
    /** Seconds of sustained abnormal vibration (sliding window) */
    abnormalDuration: number;
    
    /** Current estimated dominant frequency (Hz) via zero-crossing */
    currentFrequency: number;
    
    /** Baseline dominant frequency (Hz) established during stable period */
    baselineFrequency: number;
}

/**
 * Final damage assessment result
 */
export interface DamageScore {
    /** Numerical score 0-100 */
    score: number;
    
    /** Categorical classification for UI display */
    category: 'safe' | 'risky' | 'heavily_damaged';
    
    /** Turkish label for UI */
    categoryLabel: string;
    
    /** Individual component scores for explainability */
    components: {
        frequencyShiftScore: number;
        peakEnergyScore: number;
        durationScore: number;
    };
    
    /** Raw features for future ML training */
    features: DamageFeatures;
    
    /** Maps to existing NodeStatus for backward compatibility */
    legacyStatus: NodeStatus;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Scoring weights - sum to 1.0
 * 
 * Rationale:
 * - Frequency shift (0.5): Most indicative of structural damage in civil engineering.
 *   A frequency drop means the building has lost stiffness.
 * - Peak energy (0.35): High energy impacts matter but brief spikes may not cause damage.
 * - Duration (0.15): Sustained events cause cumulative damage.
 */
const WEIGHTS = {
    frequencyShift: 0.50,
    peakEnergy: 0.35,
    duration: 0.15,
} as const;

/**
 * Scaling factors for converting raw values to 0-100 scores
 */
const SCALING = {
    /** 
     * Frequency shift multiplier: ×4 (conservative)
     * 25% frequency shift = 100 points
     * Chosen to avoid false alarms on minor variations
     */
    frequencyShift: 4,
    
    /**
     * Duration multiplier: ×10
     * 10 seconds of sustained anomaly = 100 points
     */
    duration: 10,
    
    /**
     * Energy is already normalized 0-1, just scale to 100
     */
    energy: 100,
} as const;

/**
 * Category thresholds (from project spec)
 */
const THRESHOLDS = {
    safe: 30,      // 0-30: Safe / Girilebilir
    risky: 60,     // 30-60: Risky / Riskli
    // 60-100: Heavily Damaged / Ağır Hasarlı
} as const;

/**
 * Abnormal magnitude threshold (g) for duration counting
 * Readings above this in a sliding window count toward duration
 */
const ABNORMAL_MAGNITUDE_THRESHOLD = 0.3; // g

// ============================================================================
// DAMAGE SCORE CALCULATOR
// ============================================================================

export class DamageScoreCalculator {
    /**
     * Calculate damage score from extracted features
     * 
     * Formula:
     * DamageScore = (FreqShiftScore × 0.5) + (EnergyScore × 0.35) + (DurationScore × 0.15)
     */
    calculate(features: DamageFeatures): DamageScore {
        // Calculate individual component scores (each 0-100)
        const frequencyShiftScore = Math.min(100, 
            Math.abs(features.frequencyShift) * SCALING.frequencyShift
        );
        
        const peakEnergyScore = Math.min(100, 
            features.peakEnergy * SCALING.energy
        );
        
        const durationScore = Math.min(100, 
            features.abnormalDuration * SCALING.duration
        );
        
        // Weighted combination
        const score = Math.round(
            (frequencyShiftScore * WEIGHTS.frequencyShift) +
            (peakEnergyScore * WEIGHTS.peakEnergy) +
            (durationScore * WEIGHTS.duration)
        );
        
        // Clamp to 0-100
        const finalScore = Math.max(0, Math.min(100, score));
        
        // Categorize
        const { category, categoryLabel } = this.categorize(finalScore);
        
        // Map to legacy status for backward compatibility
        const legacyStatus = this.toLegacyStatus(finalScore);
        
        return {
            score: finalScore,
            category,
            categoryLabel,
            components: {
                frequencyShiftScore: Math.round(frequencyShiftScore),
                peakEnergyScore: Math.round(peakEnergyScore),
                durationScore: Math.round(durationScore),
            },
            features,
            legacyStatus,
        };
    }
    
    /**
     * Categorize score into Safe/Risky/Heavily Damaged
     */
    private categorize(score: number): { category: DamageScore['category']; categoryLabel: string } {
        if (score < THRESHOLDS.safe) {
            return { category: 'safe', categoryLabel: 'Güvenli' };
        }
        if (score < THRESHOLDS.risky) {
            return { category: 'risky', categoryLabel: 'Riskli' };
        }
        return { category: 'heavily_damaged', categoryLabel: 'Ağır Hasarlı' };
    }
    
    /**
     * Map damage score to legacy NodeStatus for backward compatibility
     */
    private toLegacyStatus(score: number): NodeStatus {
        if (score < 15) return 'stable';
        if (score < 30) return 'anomaly';
        if (score < 50) return 'warning';
        if (score < 70) return 'critical';
        return 'collapse';
    }
}

// ============================================================================
// FEATURE EXTRACTOR
// ============================================================================

/**
 * Extracts damage-relevant features from raw sensor data
 */
export class FeatureExtractor {
    /**
     * Sliding window for duration calculation
     * Stores recent magnitudes with timestamps
     */
    private magnitudeHistory: Map<string, Array<{ magnitude: number; timestamp: number }>> = new Map();
    
    /** Window size for duration calculation (ms) */
    private readonly durationWindowMs = 10000; // 10 seconds
    
    /** Max samples to keep per node */
    private readonly maxSamples = 200;
    
    /**
     * Extract features for a node given current reading and baseline
     */
    extract(
        nodeId: string,
        currentMagnitude: number,
        currentFrequency: number,
        baselineFrequency: number,
        timestamp: number
    ): DamageFeatures {
        // Update magnitude history for this node
        this.updateHistory(nodeId, currentMagnitude, timestamp);
        
        // Calculate frequency shift (percentage)
        const frequencyShift = baselineFrequency > 0
            ? ((baselineFrequency - currentFrequency) / baselineFrequency) * 100
            : 0;
        
        // Peak energy: normalize magnitude (assuming 2g is max expected)
        const peakEnergy = Math.min(1, currentMagnitude / 2.0);
        
        // Abnormal duration: count time above threshold in sliding window
        const abnormalDuration = this.calculateAbnormalDuration(nodeId, timestamp);
        
        return {
            frequencyShift,
            peakEnergy,
            abnormalDuration,
            currentFrequency,
            baselineFrequency,
        };
    }
    
    /**
     * Update sliding window of magnitude readings
     */
    private updateHistory(nodeId: string, magnitude: number, timestamp: number): void {
        if (!this.magnitudeHistory.has(nodeId)) {
            this.magnitudeHistory.set(nodeId, []);
        }
        
        const history = this.magnitudeHistory.get(nodeId)!;
        history.push({ magnitude, timestamp });
        
        // Remove old entries outside window
        const cutoff = timestamp - this.durationWindowMs;
        while (history.length > 0 && history[0].timestamp < cutoff) {
            history.shift();
        }
        
        // Also cap total samples
        while (history.length > this.maxSamples) {
            history.shift();
        }
    }
    
    /**
     * Calculate how many seconds of abnormal readings in the sliding window
     * Uses time-weighted approach for accurate duration
     */
    private calculateAbnormalDuration(nodeId: string, currentTime: number): number {
        const history = this.magnitudeHistory.get(nodeId);
        if (!history || history.length < 2) return 0;
        
        let abnormalMs = 0;
        
        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1];
            const curr = history[i];
            
            // If previous reading was abnormal, count the time until current
            if (prev.magnitude >= ABNORMAL_MAGNITUDE_THRESHOLD) {
                abnormalMs += curr.timestamp - prev.timestamp;
            }
        }
        
        // Convert to seconds
        return abnormalMs / 1000;
    }
    
    /**
     * Reset history for a node
     */
    reset(nodeId?: string): void {
        if (nodeId) {
            this.magnitudeHistory.delete(nodeId);
        } else {
            this.magnitudeHistory.clear();
        }
    }
}

// ============================================================================
// FREQUENCY ESTIMATOR (Zero-Crossing Method)
// ============================================================================

/**
 * Estimates dominant frequency using zero-crossing method.
 * 
 * This is a simplified approach suitable for MVP demo.
 * For production, FFT-based peak detection would be more accurate.
 * 
 * How it works:
 * - Count how many times the signal crosses zero (or mean)
 * - Frequency ≈ (zero crossings / 2) / time period
 */
export class ZeroCrossingFrequencyEstimator {
    private signalHistory: Map<string, number[]> = new Map();
    private readonly windowSize = 50; // samples
    private readonly sampleRateHz = 20; // 20 Hz from simulator
    
    /**
     * Update with new reading and estimate frequency
     */
    estimate(nodeId: string, magnitude: number): number {
        if (!this.signalHistory.has(nodeId)) {
            this.signalHistory.set(nodeId, []);
        }
        
        const history = this.signalHistory.get(nodeId)!;
        history.push(magnitude);
        
        // Keep only windowSize samples
        while (history.length > this.windowSize) {
            history.shift();
        }
        
        // Need at least 10 samples for estimation
        if (history.length < 10) {
            return 5.0; // Default to ~5 Hz (typical building natural frequency)
        }
        
        // Calculate mean
        const mean = history.reduce((a, b) => a + b, 0) / history.length;
        
        // Count zero crossings (crossings of mean)
        let crossings = 0;
        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1] - mean;
            const curr = history[i] - mean;
            if ((prev < 0 && curr >= 0) || (prev >= 0 && curr < 0)) {
                crossings++;
            }
        }
        
        // Frequency = (crossings / 2) / observation time
        const observationTimeSec = history.length / this.sampleRateHz;
        const frequency = (crossings / 2) / observationTimeSec;
        
        // Clamp to reasonable building frequency range (0.5 - 20 Hz)
        return Math.max(0.5, Math.min(20, frequency));
    }
    
    reset(nodeId?: string): void {
        if (nodeId) {
            this.signalHistory.delete(nodeId);
        } else {
            this.signalHistory.clear();
        }
    }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

export const damageScoreCalculator = new DamageScoreCalculator();
export const featureExtractor = new FeatureExtractor();
export const frequencyEstimator = new ZeroCrossingFrequencyEstimator();
