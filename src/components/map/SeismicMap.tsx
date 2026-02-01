'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSeismosStore } from '@/lib/store';
import type { Node, NodeStatus } from '@/lib/supabase/types';
import { motion, AnimatePresence } from 'framer-motion';

// Status color mapping
const STATUS_COLORS: Record<NodeStatus, string> = {
    stable: '#22c55e',
    anomaly: '#eab308',
    warning: '#f97316',
    critical: '#ef4444',
    collapse: '#581c87', // Purple-900 for collapse
};

const STATUS_PULSE_DURATION: Record<NodeStatus, number> = {
    stable: 3000,
    anomaly: 2000,
    warning: 1000,
    critical: 500,
    collapse: 200, // Very fast pulse for collapse
};

// Create custom pulsing marker SVG
function createMarkerIcon(status: NodeStatus, isSelected: boolean, signalLoss: boolean): L.DivIcon {
    const color = STATUS_COLORS[status];
    const size = isSelected ? 48 : 36;
    const opacity = signalLoss ? 0.4 : 1;
    const pulseClass = signalLoss ? '' : `pulse-${status}`;

    const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}">
      <defs>
        <filter id="glow-${status}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="24" cy="24" r="12" fill="${color}" filter="url(#glow-${status})" class="${pulseClass}"/>
      <circle cx="24" cy="24" r="8" fill="#050505"/>
      <circle cx="24" cy="24" r="4" fill="${color}"/>
      ${isSelected ? `<circle cx="24" cy="24" r="20" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="4 4"/>` : ''}
    </svg>
  `;

    return L.divIcon({
        html: svg,
        className: 'seismos-marker',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

export default function SeismicMap() {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<Map<string, L.Marker>>(new Map());

    const { nodes, selectedNodeId, selectNode, signalLossNodes } = useSeismosStore();
    const [isMapReady, setIsMapReady] = useState(false);

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        // Create map with light theme tiles
        const map = L.map(mapContainerRef.current, {
            center: [41.0290, 28.9490], // Fatih/Balat Center
            zoom: 16,
            minZoom: 15,
            maxZoom: 18,
            maxBounds: [
                [41.0200, 28.9350], // South West
                [41.0400, 28.9650]  // North East
            ],
            maxBoundsViscosity: 1.0, // Hard bounce back
            zoomControl: true,
            attributionControl: true,
        });

        // CartoDB Positron (Light) tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
        }).addTo(map);

        mapRef.current = map;
        setIsMapReady(true);

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Update markers when nodes change
    useEffect(() => {
        if (!mapRef.current || !isMapReady) return;

        const map = mapRef.current;

        // Add/update markers
        nodes.forEach((node, nodeId) => {
            const existingMarker = markersRef.current.get(nodeId);
            const isSelected = nodeId === selectedNodeId;
            const hasSignalLoss = signalLossNodes.has(nodeId);

            const icon = createMarkerIcon(node.status, isSelected, hasSignalLoss);

            if (existingMarker) {
                existingMarker.setIcon(icon);
                existingMarker.setLatLng([node.lat, node.lng]);
            } else {
                const marker = L.marker([node.lat, node.lng], { icon })
                    .addTo(map)
                    .on('click', () => selectNode(nodeId));

                // Add tooltip
                marker.bindTooltip(node.name, {
                    permanent: false,
                    direction: 'top',
                    className: 'seismos-tooltip',
                });

                markersRef.current.set(nodeId, marker);
            }
        });

        // Remove markers for deleted nodes
        markersRef.current.forEach((marker, nodeId) => {
            if (!nodes.has(nodeId)) {
                marker.remove();
                markersRef.current.delete(nodeId);
            }
        });
    }, [nodes, selectedNodeId, signalLossNodes, isMapReady, selectNode]);

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Map overlay gradient */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#050505] via-transparent to-[#050505] opacity-30" />

            {/* Signal loss warnings */}
            <AnimatePresence>
                {signalLossNodes.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-4 left-4 bg-red-900/50 border border-red-500/50 rounded px-3 py-2 backdrop-blur-sm"
                    >
                        <span className="text-red-400 font-mono text-sm">
                            ⚠ SİNYAL_KAYBI: {signalLossNodes.size} düğüm
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom tooltip styles */}
            <style jsx global>{`
        .seismos-marker {
          background: transparent !important;
          border: none !important;
        }
        .seismos-tooltip {
          background: rgba(10, 10, 10, 0.9) !important;
          border: 1px solid rgba(6, 182, 212, 0.5) !important;
          color: #e5e5e5 !important;
          font-family: var(--font-mono) !important;
          font-size: 12px !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
        }
        .seismos-tooltip:before {
          border-top-color: rgba(6, 182, 212, 0.5) !important;
        }
      `}</style>
        </div>
    );
}
