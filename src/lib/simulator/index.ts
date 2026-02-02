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
    private idleInterval: ReturnType<typeof setInterval> | null = null;
    private deadNodes: Set<string> = new Set();
    private currentDamages: Map<string, number> = new Map(); // Hasar hafızası

    // Canlı okuma dinleyicisi ekle
    onLiveUpdate(callback: (readings: Map<string, SensorReading>) => void): () => void {
        this.updateCallbacks.add(callback);
        return () => this.updateCallbacks.delete(callback);
    }

    // Hasar durumunu güncelle (Store'dan çağrılır)
    updateDamages(damages: Map<string, number>) {
        // Map'i kopyala
        this.currentDamages = new Map(damages);
    }

    // Tüm dinleyicilere güncelleme gönder
    private emitUpdate(): void {
        this.updateCallbacks.forEach(cb => cb(this.liveReadings));
    }

    // Normal durum - çok düşük titreşim
    // ARTIK HASARA GÖRE FREKANS ÜRETİYOR (Histeresis)
    generateIdleReading(nodeId: string): SensorReading {
        const damage = this.currentDamages.get(nodeId) || 0;

        // Frekans Histeresisi: Hasar arttıkça doğal frekans düşer (Bina yumuşar)
        // 0 hasar -> ~4.5 Hz (Sağlam, rijit)
        // 100 hasar -> ~1.0 Hz (Yıkık, salınım periyodu çok uzun)
        const healthFactor = Math.max(0, 1 - (damage / 100));
        const baseFrequency = 1.0 + (3.5 * healthFactor);

        const noise = 0.003;
        const accelX = (Math.random() - 0.5) * noise;
        const accelY = (Math.random() - 0.5) * noise;
        const accelZ = (Math.random() - 0.5) * noise;

        return {
            timestamp: Date.now(),
            accelX,
            accelY,
            accelZ,
            magnitude: Math.sqrt(accelX ** 2 + accelY ** 2 + accelZ ** 2),
            frequency: baseFrequency + (Math.random() * 0.2), // Hafif varyasyon
        };
    }

    // Arka plan simülasyonu başlat - sürekli idle okuma
    startIdleSimulation(): void {
        if (this.idleInterval) return;

        // İlk okumaları oluştur
        DEMO_NODES.forEach((node) => {
            if (!this.deadNodes.has(node.id)) {
                this.liveReadings.set(node.id, this.generateIdleReading(node.id));
            } else {
                this.liveReadings.delete(node.id); // Ölü node'lar veri göndermez
            }
        });
        this.emitUpdate();

        // Her 200ms'de bir güncelle (deprem harici)
        this.idleInterval = setInterval(() => {
            if (this.earthquakeInterval) return; // Deprem varsa atla

            DEMO_NODES.forEach((node) => {
                if (!this.deadNodes.has(node.id)) {
                    this.liveReadings.set(node.id, this.generateIdleReading(node.id));
                } else {
                    this.liveReadings.delete(node.id);
                }
            });
            this.emitUpdate();
        }, 200);
    }

    stopIdleSimulation(): void {
        if (this.idleInterval) {
            clearInterval(this.idleInterval);
            this.idleInterval = null;
        }
    }

    // Deprem simülasyonu
    triggerEarthquake(
        config: EarthquakeConfig,
        currentTotalScores: Map<string, number>, // Mevcut birikmiş hasarlar
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

            damageResults.set(node.id, Math.min(100, damage));
        });

        // Canlı veri güncellemesi
        this.earthquakeInterval = setInterval(() => {
            tickCount++;
            const progress = Math.min(100, (tickCount / totalTicks) * 100);
            const envelope = Math.sin((progress / 100) * Math.PI); // Dalga envelope

            onProgress(progress);

            // Her bina için canlı okuma oluştur
            DEMO_NODES.forEach((node) => {
                // Ölü node'lar konuşmaz
                if (this.deadNodes.has(node.id)) {
                    this.liveReadings.delete(node.id);
                    return;
                }

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

            // Hasar > 85 olanların çökme (susma/sensor kaybı) ihtimali
            // ARTIK KÜMÜLATİF HASARA BAKIYORUZ
            if (envelope > 0.8) {
                damageResults.forEach((newDmg, nodeId) => {
                    const currentTotal = currentTotalScores.get(nodeId) || 0;
                    const projectedTotal = Math.min(100, currentTotal + newDmg);

                    if (projectedTotal >= 85 && !this.deadNodes.has(nodeId)) {
                        // Bina yıkılıyorsa %40 ihtimalle sensör de susar
                        if (Math.random() < 0.4) {
                            this.deadNodes.add(nodeId);
                        }
                    }
                });
            }

            this.emitUpdate();

            if (tickCount >= totalTicks) {
                if (this.earthquakeInterval) clearInterval(this.earthquakeInterval);

                // Normal duruma dön (ama ölüler hariç)
                DEMO_NODES.forEach((node) => {
                    if (!this.deadNodes.has(node.id)) {
                        this.liveReadings.set(node.id, this.generateIdleReading(node.id));
                    } else {
                        this.liveReadings.delete(node.id);
                    }
                });
                this.emitUpdate();

                onComplete(damageResults);
            }
        }, 50);
    }

    // Belirli bina için son okumayı getir
    getReading(nodeId: string): SensorReading | null { // null dönebilir artık
        if (this.deadNodes.has(nodeId)) return null;
        return this.liveReadings.get(nodeId) || this.generateIdleReading(nodeId);
    }

    stop(): void {
        if (this.earthquakeInterval) {
            clearInterval(this.earthquakeInterval);
            this.earthquakeInterval = null;
        }
    }

    reset(): void {
        this.deadNodes.clear();
        this.startIdleSimulation();
    }
}

export const earthquakeSimulator = new EarthquakeSimulator();
