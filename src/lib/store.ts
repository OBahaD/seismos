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
            buildingSummary: { safe, damaged, critical, collapsed }
        };
    }),

    selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

    setEarthquakeActive: (active) => set({
        isEarthquakeActive: active,
        earthquakeProgress: active ? 0 : 100
    }),

    setEarthquakeProgress: (progress) => set({ earthquakeProgress: progress }),

    // Deprem hasarını uygula
    applyEarthquakeDamage: (damages) => set((state) => {
        const newDamages = new Map(state.buildingDamages);
        const newNodes = new Map(state.nodes);

        damages.forEach((addedDamage, nodeId) => {
            const current = newDamages.get(nodeId);
            if (current) {
                const newTotal = Math.min(100, current.baseScore + current.earthquakeDamage + addedDamage);
                newDamages.set(nodeId, {
                    ...current,
                    earthquakeDamage: current.earthquakeDamage + addedDamage,
                    totalScore: newTotal
                });

                // Node status güncelle
                const node = newNodes.get(nodeId);
                if (node) {
                    newNodes.set(nodeId, { ...node, status: getStatusFromScore(newTotal) });
                }
            }
        });

        return { buildingDamages: newDamages, nodes: newNodes };
    }),

    updateBuildingSummary: () => set((state) => {
        let safe = 0, damaged = 0, critical = 0, collapsed = 0;

        state.buildingDamages.forEach((d) => {
            const score = d.totalScore;
            if (score >= 90) collapsed++;
            else if (score >= 70) critical++;
            else if (score >= 30) damaged++;
            else safe++;
        });

        return { buildingSummary: { safe, damaged, critical, collapsed } };
    }),

    resetToSafe: () => set((state) => {
        const newNodes = new Map(state.nodes);
        const newDamages = new Map<string, BuildingDamage>();

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

            newNodes.set(nodeId, { ...node, status: getStatusFromScore(baseScore) });
            index++;
        });

        let safe = 0, damaged = 0, critical = 0, collapsed = 0;
        newDamages.forEach((d) => {
            const score = d.totalScore;
            if (score >= 90) collapsed++;
            else if (score >= 70) critical++;
            else if (score >= 30) damaged++;
            else safe++;
        });

        return {
            nodes: newNodes,
            buildingDamages: newDamages,
            isEarthquakeActive: false,
            earthquakeProgress: 0,
            buildingSummary: { safe, damaged, critical, collapsed }
        };
    }),
}));
