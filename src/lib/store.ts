import { create } from 'zustand';
import type { Node, NodeStatus } from './supabase/types';

export interface BuildingSummary {
    safe: number;
    damaged: number;
    critical: number;
    collapsed: number;
}

export interface BuildingDamage {
    baseScore: number;      // Rastgele başlangıç (0-25 arası)
    earthquakeDamage: number; // Deprem hasarı (0-100)
    totalScore: number;     // baseScore + earthquakeDamage (max 100)
}

export interface SeismosState {
    nodes: Map<string, Node>;
    selectedNodeId: string | null;

    // Kalıcı hasar skorları
    buildingDamages: Map<string, BuildingDamage>;

    // Earthquake state
    isEarthquakeActive: boolean;
    earthquakeProgress: number;
    buildingSummary: BuildingSummary;

    activeNodeCount: number;

    // INSD Logic
    lastHeartbeat: Map<string, number>;
    consensusEvidence: Map<string, string[]>; // SilentNodeId -> WitnessNodeIds[]
    updateHeartbeat: (nodeIds: string[]) => void;
    checkConsensus: (currentReadings: any) => void;

    // Actions
    setNodes: (nodes: Node[]) => void;
    selectNode: (nodeId: string | null) => void;
    setEarthquakeActive: (active: boolean) => void;
    setEarthquakeProgress: (progress: number) => void;
    applyEarthquakeDamage: (damages: Map<string, number>) => void;
    updateBuildingSummary: () => void;
    resetToSafe: () => void;
}

// Skora göre status belirleme
function getStatusFromScore(score: number): NodeStatus {
    if (score >= 90) return 'collapse';
    if (score >= 70) return 'critical';
    if (score >= 30) return 'warning';
    if (score >= 15) return 'anomaly';
    return 'stable';
}

export const useSeismosStore = create<SeismosState>((set, get) => ({
    nodes: new Map(),
    selectedNodeId: null,
    buildingDamages: new Map(),
    isEarthquakeActive: false,
    earthquakeProgress: 0,
    buildingSummary: { safe: 0, damaged: 0, critical: 0, collapsed: 0 },
    activeNodeCount: 0,
    lastHeartbeat: new Map(),
    consensusEvidence: new Map(),

    setNodes: (nodes) => set(() => {
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const damageMap = new Map<string, BuildingDamage>();

        // Her binaya rastgele base skor ver
        nodes.forEach((node, index) => {
            let baseScore: number;

            // İlk 2 bina hasarlı olsun (30-45 arası skor)
            if (index === 0 || index === 1) {
                baseScore = 30 + Math.floor(Math.random() * 15); // 30-45
            } else {
                // Diğerleri düşük skorlu (0-25 arası)
                baseScore = Math.floor(Math.random() * 26); // 0-25
            }

            damageMap.set(node.id, {
                baseScore,
                earthquakeDamage: 0,
                totalScore: baseScore
            });
        });

        // Node status'ları güncelle
        damageMap.forEach((damage, nodeId) => {
            const node = nodeMap.get(nodeId);
            if (node) {
                nodeMap.set(nodeId, { ...node, status: getStatusFromScore(damage.totalScore) });
            }
        });

        // Özeti hesapla
        let safe = 0, damaged = 0, critical = 0, collapsed = 0;
        damageMap.forEach((d) => {
            const score = d.totalScore;
            if (score >= 90) collapsed++;
            else if (score >= 70) critical++;
            else if (score >= 30) damaged++;
            else safe++;
        });

        return {
            nodes: nodeMap,
            buildingDamages: damageMap,
            activeNodeCount: nodes.length,
            buildingSummary: { safe, damaged, critical, collapsed },
            lastHeartbeat: new Map(nodes.map(n => [n.id, Date.now()])) // Başlangıçta hepsi canlı
        };
    }),

    selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

    setEarthquakeActive: (active) => set({
        isEarthquakeActive: active,
        earthquakeProgress: active ? 0 : 100
    }),

    setEarthquakeProgress: (progress) => set({ earthquakeProgress: progress }),

    updateHeartbeat: (nodeIds) => {
        const now = Date.now();
        const { lastHeartbeat } = get();
        const newHeartbeats = new Map(lastHeartbeat);

        nodeIds.forEach(id => newHeartbeats.set(id, now));

        // Performance optimization: only update if changed significantly or period passed?
        // For now, simple set
        set({ lastHeartbeat: newHeartbeats });
    },

    checkConsensus: (currentReadings) => {
        const { nodes, lastHeartbeat, isEarthquakeActive } = get();
        const now = Date.now();
        const SILENCE_THRESHOLD = 1000; // 1 saniye veri gelmezse suskun kabul et (Daha agresif)
        const NEIGHBOR_RADIUS = 0.0015; // ~150m (Karmaşayı azaltmak için düşürüldü)

        let hasChanges = false;
        const newNodes = new Map(nodes);
        const newEvidence = new Map(get().consensusEvidence);

        // Aktif node'ları bul (okuma gönderenler)
        const activeNodeIds = new Set<string>();
        lastHeartbeat.forEach((time, id) => {
            if (now - time < SILENCE_THRESHOLD) activeNodeIds.add(id);
        });

        nodes.forEach((node, nodeId) => {
            const lastSeen = lastHeartbeat.get(nodeId) || 0;
            const isSilent = (now - lastSeen) > SILENCE_THRESHOLD;

            // Eğer node sessizse ve zaten "yıkıldı" (kırmızı X) olarak işaretlenmemişse
            // 'critical', 'warning' veya 'stable' olsa bile INSD devreye girmeli
            if (isSilent && node.status !== 'collapse' && node.status !== 'collapse_inferred') {
                // SESSİZLİK TESPİTİ (INSD)
                // Kural: Node sessiz + Çevremde >= 3 aktif tanık var = Yıkılmış olabilir

                if (isEarthquakeActive) {
                    // Tanık ara
                    const witnesses: string[] = [];
                    nodes.forEach((neighbor, neighborId) => {
                        if (nodeId === neighborId) return;
                        if (!activeNodeIds.has(neighborId)) return; // Ölüler tanıklık edemez

                        const dist = Math.sqrt(
                            Math.pow(node.lat - neighbor.lat, 2) +
                            Math.pow(node.lng - neighbor.lng, 2)
                        );

                        if (dist < NEIGHBOR_RADIUS) {
                            witnesses.push(neighborId);
                        }
                    });

                    // 3 ve üzeri tanık varsa yıkımı onayla
                    if (witnesses.length >= 3) {
                        newNodes.set(nodeId, { ...node, status: 'collapse_inferred' });
                        newEvidence.set(nodeId, witnesses);
                        hasChanges = true;
                    }
                }
            } else if (!isSilent && node.status === 'collapse_inferred') {
                // Geri geldi (yanlış alarm veya geçici kesinti)
                const damage = get().buildingDamages.get(nodeId);
                if (damage) {
                    newNodes.set(nodeId, { ...node, status: getStatusFromScore(damage.totalScore) });
                    newEvidence.delete(nodeId);
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            set({ nodes: newNodes, consensusEvidence: newEvidence });
            get().updateBuildingSummary();
        }
    },

    // Deprem hasarını uygula
    applyEarthquakeDamage: (damages) => set((state) => {
        const newDamages = new Map(state.buildingDamages);
        const newNodes = new Map(state.nodes);
        const damageScores = new Map<string, number>();

        damages.forEach((addedDamage, nodeId) => {
            const current = newDamages.get(nodeId);
            if (current) {
                const newTotal = Math.min(100, current.baseScore + current.earthquakeDamage + addedDamage);
                newDamages.set(nodeId, {
                    ...current,
                    earthquakeDamage: current.earthquakeDamage + addedDamage,
                    totalScore: newTotal
                });

                // Score map için hazırla
                damageScores.set(nodeId, newTotal);

                // Node status güncelle - INSD statüsünü ezme
                const node = newNodes.get(nodeId);
                if (node && node.status !== 'collapse_inferred') {
                    newNodes.set(nodeId, { ...node, status: getStatusFromScore(newTotal) });
                }
            }
        });

        // Simülatöre yeni hasar durumunu bildir (Histeresis için)
        // Diğer binaların skorlarını da eklememiz gerekebilir, ama şimdilik sadece değişenleri değil tümünü güncelleyelim
        // State tam güncellenmediği için 'newDamages' üzerinden tam map çıkaralım
        const allScores = new Map<string, number>();
        newDamages.forEach((d, id) => allScores.set(id, d.totalScore));
        import('@/lib/simulator').then(mod => mod.earthquakeSimulator.updateDamages(allScores));

        return { buildingDamages: newDamages, nodes: newNodes };
    }),

    updateBuildingSummary: () => set((state) => {
        let safe = 0, damaged = 0, critical = 0, collapsed = 0;

        state.nodes.forEach((n) => { // Status üzerinden say, damage üzerinden değil (INSD için)
            if (n.status === 'collapse' || n.status === 'collapse_inferred') collapsed++;
            else if (n.status === 'critical') critical++;
            else if (n.status === 'warning') damaged++;
            else safe++; // stable + anomaly
        });

        return { buildingSummary: { safe, damaged, critical, collapsed } };
    }),

    resetToSafe: () => set((state) => {
        const newNodes = new Map(state.nodes);
        const newDamages = new Map<string, BuildingDamage>();
        const allScores = new Map<string, number>();

        // Yeni rastgele skorlar ata
        let index = 0;
        state.nodes.forEach((node, nodeId) => {
            let baseScore: number;

            if (index === 0 || index === 1) {
                baseScore = 30 + Math.floor(Math.random() * 15);
            } else {
                baseScore = Math.floor(Math.random() * 26);
            }

            newDamages.set(nodeId, {
                baseScore,
                earthquakeDamage: 0,
                totalScore: baseScore
            });
            allScores.set(nodeId, baseScore);

            newNodes.set(nodeId, { ...node, status: getStatusFromScore(baseScore) });
            index++;
        });

        // Simülatörü sıfırla
        import('@/lib/simulator').then(mod => {
            mod.earthquakeSimulator.updateDamages(allScores);
            mod.earthquakeSimulator.reset();
        });

        let safe = 0, damaged = 0, critical = 0, collapsed = 0;
        newDamages.forEach((d) => {
            const score = d.totalScore;
            if (score >= 90) collapsed++;
            else if (score >= 70) critical++;
            else if (score >= 30) damaged++;
            else safe++;
        });

        // Tüm heartbeatleri sıfırla (hepsi şimdi canlı)
        const now = Date.now();
        const newHeartbeats = new Map(state.nodes.size > 0 ? Array.from(state.nodes.keys()).map(id => [id, now]) : []);

        return {
            nodes: newNodes,
            buildingDamages: newDamages,
            isEarthquakeActive: false,
            earthquakeProgress: 0,
            buildingSummary: { safe, damaged, critical, collapsed },
            lastHeartbeat: newHeartbeats,
            consensusEvidence: new Map()
        };
    }),
}));
