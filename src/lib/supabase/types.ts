export type NodeStatus = 'stable' | 'anomaly' | 'warning' | 'critical' | 'collapse';

export interface Node {
  id: string;
  name: string;
  status: NodeStatus;
  lat: number;
  lng: number;
  is_physical: boolean;
  created_at?: string;
}

export interface SensorReading {
  id: string;
  node_id: string;
  accel_x: number;
  accel_y: number;
  accel_z: number;
  magnitude: number;
  timestamp: string;
}

export interface ProcessedReading extends SensorReading {
  stage: 'raw' | 'filtered' | 'correlated' | 'interpreted';
  filteredMagnitude?: number;
  isCorrelated?: boolean;
  interpretedStatus?: NodeStatus;
}

export interface PipelineStage {
  id: 'raw' | 'filter' | 'correlate' | 'interpret';
  name: string;
  status: 'idle' | 'processing' | 'complete' | 'error';
  lastUpdate?: number;
}

export interface NodeWithReadings extends Node {
  lastReading?: SensorReading;
  lastUpdate?: number;
  signalLoss?: boolean;
}

// Database types for Supabase
export type Database = {
  public: {
    Tables: {
      nodes: {
        Row: Node;
        Insert: Omit<Node, 'id' | 'created_at'>;
        Update: Partial<Omit<Node, 'id'>>;
      };
      sensor_readings: {
        Row: SensorReading;
        Insert: Omit<SensorReading, 'id'>;
        Update: Partial<Omit<SensorReading, 'id'>>;
      };
    };
  };
};
