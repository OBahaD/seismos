import type { Node } from '../supabase/types';

// Balat bölgesinde rastgele binalar
function generateBalatNodes(count: number): Omit<Node, 'created_at'>[] {
    const nodes: Omit<Node, 'created_at'>[] = [];

    const minLat = 41.0260;
    const maxLat = 41.0320;
    const minLng = 28.9420;
    const maxLng = 28.9520;

    for (let i = 1; i <= count; i++) {
        nodes.push({
            id: `node-${i}`,
            name: `Bina ${i}`,
            status: 'stable',
            lat: minLat + Math.random() * (maxLat - minLat),
            lng: minLng + Math.random() * (maxLng - minLng),
            is_physical: false,
        });
    }

    return nodes;
}

export const DEMO_NODES = generateBalatNodes(80);

export interface EarthquakeConfig {
    intensity: number;
    durationMs: number;
    epicenterLat: number;
    epicenterLng: number;
}

export class EarthquakeSimulator {
    private backgroundInterval: ReturnType<typeof setInterval> | null = null;

    start(): void {
        // Arka plan artık sadece UI için, hasar hesabı yok
        this.backgroundInterval = setInterval(() => {
            // Sadece canlı görünsün diye - gerçek hasar hesabı yok
        }, 100);
    }

    stop(): void {
        if (this.backgroundInterval) {
            clearInterval(this.backgroundInterval);
            this.backgroundInterval = null;
        }
    }

    // Deprem simülasyonu - hasar hesapla ve döndür
    triggerEarthquake(
        config: EarthquakeConfig,
        onProgress: (progress: number) => void,
        onComplete: (damages: Map<string, number>) => void
    ): void {
        let tickCount = 0;
        const totalTicks = config.durationMs / 50;

        // Her bina için hasar hesapla
        const damageResults = new Map<string, number>();

        DEMO_NODES.forEach((node) => {
            // Episantraya uzaklık
            const distLat = node.lat - config.epicenterLat;
            const distLng = node.lng - config.epicenterLng;
            const distance = Math.sqrt(distLat ** 2 + distLng ** 2);

            // Uzaklığa göre hasar azalması
            const distanceFactor = Math.max(0.2, 1 - distance * 30);

            // Rastgele varyasyon (bazı binalar daha dayanıksız)
            const vulnerabilityFactor = 0.5 + Math.random() * 1.0;

            // Hasar hesaplama (10-60 arası)
            const damage = Math.round(
                config.intensity * 30 * distanceFactor * vulnerabilityFactor
            );

            damageResults.set(node.id, Math.min(70, damage)); // Max 70 eklenebilir
        });

        // Animasyon için progress göster
        const earthquakeInterval = setInterval(() => {
            tickCount++;
            const progress = Math.min(100, (tickCount / totalTicks) * 100);
            onProgress(progress);

            if (tickCount >= totalTicks) {
                clearInterval(earthquakeInterval);
                onComplete(damageResults);
            }
        }, 50);
    }
}

export const earthquakeSimulator = new EarthquakeSimulator();
