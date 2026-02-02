import type { Node } from '../supabase/types';

// Bina yapı tipleri
export type StructureType = 'betonarme' | 'yigma' | 'celik' | 'ahsap';

export interface BuildingMetadata {
    floors: number;           // Kat sayısı (1-8)
    yearBuilt: number;        // Yapım yılı (1950-2020)
    structureType: StructureType;
    lastInspection: string;   // Son denetim tarihi
    sensorId: string;         // Sensör ID
}

export interface SensorReading {
    timestamp: number;
    accelX: number;
    accelY: number;
    accelZ: number;
    magnitude: number;
    frequency: number;
}

// Balat bölgesi - denize taşmayan sıkı sınırlar
const BOUNDS = {
    minLat: 41.0275,  // Güney sınır (Unkapanı'ndan uzak)
    maxLat: 41.0315,  // Kuzey sınır
    minLng: 28.9435,  // Batı sınır
    maxLng: 28.9495,  // Doğu sınır (Haliç'ten uzak)
};

// Rastgele bina meta verisi oluştur
function generateBuildingMetadata(id: number): BuildingMetadata {
    const types: StructureType[] = ['betonarme', 'yigma', 'celik', 'ahsap'];
    const typeWeights = [0.5, 0.35, 0.1, 0.05]; // Betonarme en yaygın

    let typeIndex = 0;
    const rand = Math.random();
    let cumWeight = 0;
    for (let i = 0; i < typeWeights.length; i++) {
        cumWeight += typeWeights[i];
        if (rand < cumWeight) {
            typeIndex = i;
            break;
        }
    }

    return {
        floors: 1 + Math.floor(Math.random() * 6), // 1-6 kat
        yearBuilt: 1960 + Math.floor(Math.random() * 60), // 1960-2020
        structureType: types[typeIndex],
        lastInspection: `${2020 + Math.floor(Math.random() * 4)}-0${1 + Math.floor(Math.random() * 9)}-${10 + Math.floor(Math.random() * 18)}`,
        sensorId: `SEN-${id.toString().padStart(3, '0')}`,
    };
}

// Balat bölgesinde rastgele binalar
function generateBalatNodes(count: number): Array<Omit<Node, 'created_at'> & { metadata: BuildingMetadata }> {
    const nodes: Array<Omit<Node, 'created_at'> & { metadata: BuildingMetadata }> = [];

    for (let i = 1; i <= count; i++) {
        nodes.push({
            id: `node-${i}`,
            name: `Bina ${i}`,
            status: 'stable',
            lat: BOUNDS.minLat + Math.random() * (BOUNDS.maxLat - BOUNDS.minLat),
            lng: BOUNDS.minLng + Math.random() * (BOUNDS.maxLng - BOUNDS.minLng),
            is_physical: false,
            metadata: generateBuildingMetadata(i),
        });
    }

    return nodes;
}

export const DEMO_NODES = generateBalatNodes(80);

// Metadata'ya erişim için map
export const BUILDING_METADATA = new Map<string, BuildingMetadata>(
    DEMO_NODES.map(node => [node.id, node.metadata])
);

export interface EarthquakeConfig {
    intensity: number;
    durationMs: number;
    epicenterLat: number;
    epicenterLng: number;
}

export class EarthquakeSimulator {
    private liveReadings: Map<string, SensorReading> = new Map();
    private updateCallbacks: Set<(readings: Map<string, SensorReading>) => void> = new Set();
    private earthquakeInterval: ReturnType<typeof setInterval> | null = null;

    // Canlı okuma dinleyicisi ekle
    onLiveUpdate(callback: (readings: Map<string, SensorReading>) => void): () => void {
        this.updateCallbacks.add(callback);
        return () => this.updateCallbacks.delete(callback);
    }

    // Tüm dinleyicilere güncelleme gönder
    private emitUpdate(): void {
        this.updateCallbacks.forEach(cb => cb(this.liveReadings));
    }

    // Normal durum - çok düşük titreşim
    generateIdleReading(nodeId: string): SensorReading {
        const noise = 0.002;
        const accelX = (Math.random() - 0.5) * noise;
        const accelY = (Math.random() - 0.5) * noise;
        const accelZ = (Math.random() - 0.5) * noise;

        return {
            timestamp: Date.now(),
            accelX,
            accelY,
            accelZ,
            magnitude: Math.sqrt(accelX ** 2 + accelY ** 2 + accelZ ** 2),
            frequency: 4.5 + Math.random() * 1.0, // 4.5-5.5 Hz (normal bina frekansı)
        };
    }

    // Deprem simülasyonu
    triggerEarthquake(
        config: EarthquakeConfig,
        onProgress: (progress: number) => void,
        onComplete: (damages: Map<string, number>) => void
    ): void {
        let tickCount = 0;
        const totalTicks = config.durationMs / 50;
        const damageResults = new Map<string, number>();

        // Her bina için hasar hesapla
        DEMO_NODES.forEach((node) => {
            const distLat = node.lat - config.epicenterLat;
            const distLng = node.lng - config.epicenterLng;
            const distance = Math.sqrt(distLat ** 2 + distLng ** 2);
            const distanceFactor = Math.max(0.2, 1 - distance * 50);

            // Yapı tipine göre kırılganlık
            const meta = node.metadata;
            let vulnerabilityFactor = 1.0;
            if (meta.structureType === 'yigma') vulnerabilityFactor = 1.4;
            if (meta.structureType === 'ahsap') vulnerabilityFactor = 1.6;
            if (meta.yearBuilt < 1980) vulnerabilityFactor *= 1.3;
            if (meta.floors > 4) vulnerabilityFactor *= 1.2;

            const damage = Math.round(
                config.intensity * 25 * distanceFactor * vulnerabilityFactor * (0.5 + Math.random() * 0.5)
            );

            damageResults.set(node.id, Math.min(70, damage));
        });

        // Canlı veri güncellemesi
        this.earthquakeInterval = setInterval(() => {
            tickCount++;
            const progress = Math.min(100, (tickCount / totalTicks) * 100);
            const envelope = Math.sin((progress / 100) * Math.PI); // Dalga envelope

            onProgress(progress);

            // Her bina için canlı okuma oluştur
            DEMO_NODES.forEach((node) => {
                const distLat = node.lat - config.epicenterLat;
                const distLng = node.lng - config.epicenterLng;
                const distance = Math.sqrt(distLat ** 2 + distLng ** 2);
                const distanceFactor = Math.max(0.1, 1 - distance * 40);

                const intensity = config.intensity * envelope * distanceFactor;
                const accelX = (Math.random() - 0.5) * intensity;
                const accelY = (Math.random() - 0.5) * intensity;
                const accelZ = (Math.random() - 0.5) * intensity + intensity * 0.2;

                this.liveReadings.set(node.id, {
                    timestamp: Date.now(),
                    accelX,
                    accelY,
                    accelZ,
                    magnitude: Math.sqrt(accelX ** 2 + accelY ** 2 + accelZ ** 2),
                    frequency: 4.5 - envelope * 1.5 + Math.random() * 0.5, // Frekans düşüşü
                });
            });

            this.emitUpdate();

            if (tickCount >= totalTicks) {
                if (this.earthquakeInterval) clearInterval(this.earthquakeInterval);

                // Normal duruma dön
                DEMO_NODES.forEach((node) => {
                    this.liveReadings.set(node.id, this.generateIdleReading(node.id));
                });
                this.emitUpdate();

                onComplete(damageResults);
            }
        }, 50);
    }

    // Belirli bina için son okumayı getir
    getReading(nodeId: string): SensorReading {
        return this.liveReadings.get(nodeId) || this.generateIdleReading(nodeId);
    }

    stop(): void {
        if (this.earthquakeInterval) {
            clearInterval(this.earthquakeInterval);
            this.earthquakeInterval = null;
        }
    }
}

export const earthquakeSimulator = new EarthquakeSimulator();
