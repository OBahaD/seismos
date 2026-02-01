import { create } from 'zustand';
import type { Node, SensorReading, NodeStatus } from './supabase/types';
import type { PipelineResult } from './signal-processor';

export interface SeismosState {
    // Nodes
    nodes: Map<string, Node>;
    selectedNodeId: string | null;

    // Readings
    readings: Map<string, SensorReading[]>;
    latestReadings: Map<string, SensorReading>;
    processedResults: Map<string, PipelineResult>;

    // Pipeline state
    pipelineStages: {
        raw: 'idle' | 'processing' | 'complete';
        filter: 'idle' | 'processing' | 'complete';
        correlate: 'idle' | 'processing' | 'complete';
        interpret: 'idle' | 'processing' | 'complete';
    };

    // Signal loss tracking
    lastUpdateTimes: Map<string, number>;
    signalLossNodes: Set<string>;

    // Global stats
    activeNodeCount: number;
    peakMagnitude: number;
    systemHealth: 'optimal' | 'degraded' | 'critical';

    // UI State
    isSimulationMode: boolean;
    showFFT: boolean;

    // Actions
    setNodes: (nodes: Node[]) => void;
    updateNode: (nodeId: string, updates: Partial<Node>) => void;
    selectNode: (nodeId: string | null) => void;
    addReading: (reading: SensorReading) => void;
    setProcessedResult: (nodeId: string, result: PipelineResult) => void;
    updatePipelineStage: (stage: keyof SeismosState['pipelineStages'], status: 'idle' | 'processing' | 'complete') => void;
    updateSignalLoss: () => void;
    toggleSimulation: () => void;
    toggleFFT: () => void;
    reset: () => void;
}

const MAX_READINGS_PER_NODE = 200;
const SIGNAL_LOSS_THRESHOLD = 5000; // 5 seconds

export const useSeismosStore = create<SeismosState>((set) => ({
    // Initial state
    nodes: new Map(),
    selectedNodeId: null,
    readings: new Map(),
    latestReadings: new Map(),
    processedResults: new Map(),
    pipelineStages: {
        raw: 'idle',
        filter: 'idle',
        correlate: 'idle',
        interpret: 'idle',
    },
    lastUpdateTimes: new Map(),
    signalLossNodes: new Set(),
    activeNodeCount: 0,
    peakMagnitude: 0,
    systemHealth: 'optimal',
    isSimulationMode: true,
    showFFT: false,

    // Actions
    setNodes: (nodes) => set(() => {
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        return { nodes: nodeMap, activeNodeCount: nodes.length };
    }),

    updateNode: (nodeId, updates) => set((state) => {
        const node = state.nodes.get(nodeId);
        if (node) {
            const updatedNodes = new Map(state.nodes);
            updatedNodes.set(nodeId, { ...node, ...updates });
            return { nodes: updatedNodes };
        }
        return state;
    }),

    selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

    addReading: (reading) => set((state) => {
        const newReadings = new Map(state.readings);
        const nodeReadings = [...(newReadings.get(reading.node_id) || []), reading];

        // Keep only last N readings
        if (nodeReadings.length > MAX_READINGS_PER_NODE) {
            nodeReadings.shift();
        }
        newReadings.set(reading.node_id, nodeReadings);

        const newLatest = new Map(state.latestReadings);
        newLatest.set(reading.node_id, reading);

        const newUpdateTimes = new Map(state.lastUpdateTimes);
        newUpdateTimes.set(reading.node_id, Date.now());

        // Update peak magnitude
        const newPeak = Math.max(state.peakMagnitude, reading.magnitude);

        return {
            readings: newReadings,
            latestReadings: newLatest,
            lastUpdateTimes: newUpdateTimes,
            peakMagnitude: newPeak,
        };
    }),

    setProcessedResult: (nodeId, result) => set((state) => {
        const newResults = new Map(state.processedResults);
        newResults.set(nodeId, result);

        // Update node status based on result
        const node = state.nodes.get(nodeId);
        if (node && node.status !== result.status) {
            const updatedNodes = new Map(state.nodes);
            updatedNodes.set(nodeId, { ...node, status: result.status });

            // Determine system health
            let criticalCount = 0;
            let warningCount = 0;
            updatedNodes.forEach((n) => {
                if (n.status === 'critical') criticalCount++;
                if (n.status === 'warning') warningCount++;
            });

            let systemHealth: 'optimal' | 'degraded' | 'critical' = 'optimal';
            if (criticalCount > 0) systemHealth = 'critical';
            else if (warningCount > 0) systemHealth = 'degraded';

            return { processedResults: newResults, nodes: updatedNodes, systemHealth };
        }

        return { processedResults: newResults };
    }),

    updatePipelineStage: (stage, status) => set((state) => ({
        pipelineStages: { ...state.pipelineStages, [stage]: status },
    })),

    updateSignalLoss: () => set((state) => {
        const now = Date.now();
        const newSignalLoss = new Set<string>();

        // INSD Logic Implementation
        // Channel 1: Correlation Gap (Event detected by neighbors)
        // Channel 2: Heartbeat Loss (Handled by SIGNAL_LOSS_THRESHOLD)
        // Channel 3: Neighborhood Anomaly (Neighbor status check)

        const updatedNodes = new Map(state.nodes);
        let hasStatusUpdates = false;

        state.lastUpdateTimes.forEach((lastUpdate, nodeId) => {
            if (now - lastUpdate > SIGNAL_LOSS_THRESHOLD) {
                newSignalLoss.add(nodeId);

                // Check neighbors for INSD
                // In a real system, we'd use geospatial distance. 
                // For this simulation, we'll check the global state of other nodes as "neighbors"
                let criticalNeighbors = 0;
                let activeNeighbors = 0;

                state.nodes.forEach((neighbor) => {
                    if (neighbor.id !== nodeId && !newSignalLoss.has(neighbor.id)) {
                        activeNeighbors++;
                        if (neighbor.status === 'critical' || neighbor.status === 'warning') {
                            criticalNeighbors++;
                        }
                    }
                });

                // INSD Decision Rule:
                // IF (Topluluğun %30'undan fazlası veya en az 3 komşu kritik durumdaysa)
                // VE (Hedef Node Suskunsa)
                // THEN (Olası Yıkım)
                const isCollapseProbable = criticalNeighbors >= 3 || (activeNeighbors > 0 && (criticalNeighbors / activeNeighbors) > 0.3);

                const currentNode = updatedNodes.get(nodeId);
                if (currentNode) {
                    if (isCollapseProbable && currentNode.status !== 'collapse') {
                        updatedNodes.set(nodeId, { ...currentNode, status: 'collapse' });
                        hasStatusUpdates = true;
                    } else if (!isCollapseProbable && currentNode.status !== 'stable' && !hasStatusUpdates) {
                        // Reset to stable if it was just signal loss without collapse context
                        // (Optional, maybe keep last known state)
                    }
                }
            }
        });

        if (hasStatusUpdates) {
            return { signalLossNodes: newSignalLoss, nodes: updatedNodes };
        }

        return { signalLossNodes: newSignalLoss };
    }),

    toggleSimulation: () => set((state) => ({
        isSimulationMode: !state.isSimulationMode,
    })),

    toggleFFT: () => set((state) => ({
        showFFT: !state.showFFT,
    })),

    reset: () => set({
        nodes: new Map(),
        selectedNodeId: null,
        readings: new Map(),
        latestReadings: new Map(),
        processedResults: new Map(),
        pipelineStages: {
            raw: 'idle',
            filter: 'idle',
            correlate: 'idle',
            interpret: 'idle',
        },
        lastUpdateTimes: new Map(),
        signalLossNodes: new Set(),
        activeNodeCount: 0,
        peakMagnitude: 0,
        systemHealth: 'optimal',
    }),
}));
