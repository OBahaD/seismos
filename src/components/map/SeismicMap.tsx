'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSeismosStore } from '@/lib/store';
import type { Node, NodeStatus } from '@/lib/supabase/types';
import { motion, AnimatePresence } from 'framer-motion';

// Status color mapping - professional palette
const STATUS_COLORS: Record<NodeStatus, string> = {
    stable: '#10b981',   // Emerald-500
    anomaly: '#f59e0b',  // Amber-500
    warning: '#f97316',  // Orange-500
    critical: '#ef4444', // Red-500
    collapse: '#7c3aed', // Violet-600
};

// Create clean marker icon (no glow effects)
function createMarkerIcon(status: NodeStatus, isSelected: boolean, signalLoss: boolean): L.DivIcon {
    const color = STATUS_COLORS[status];
    const size = isSelected ? 32 : 24;
    const opacity = signalLoss ? 0.4 : 1;
    const strokeWidth = isSelected ? 3 : 2;
    const ringRadius = isSelected ? 14 : 0;

    const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}">
      ${isSelected ? `<circle cx="${size / 2}" cy="${size / 2}" r="${ringRadius}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.3"/>` : ''}
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 4}" fill="${color}" stroke="#0f172a" stroke-width="${strokeWidth}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 6}" fill="#0f172a"/>
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

        // Create map with dark theme tiles
        const map = L.map(mapContainerRef.current, {
            center: [41.0290, 28.9490], // Fatih/Balat Center
            zoom: 16,
            minZoom: 15,
            maxZoom: 18,
            maxBounds: [
                [41.0200, 28.9350], // South West
                [41.0400, 28.9650]  // North East
            ],
            maxBoundsViscosity: 1.0,
            zoomControl: true,
            attributionControl: true,
        });

        // CartoDB Dark Matter (Professional Dark) tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
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

                // Add tooltip with professional styling
                marker.bindTooltip(node.name, {
                    permanent: false,
                    direction: 'top',
                    className: 'seismos-tooltip',
                    offset: [0, -8],
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

            {/* Signal loss warnings */}
            <AnimatePresence>
                {signalLossNodes.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-4 left-4 bg-slate-800/90 border border-red-500/30 rounded-lg px-4 py-2 backdrop-blur-sm"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-red-400 font-medium text-sm">
                                Sinyal Kaybı: {signalLossNodes.size} node
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Professional tooltip styles */}
            <style jsx global>{`
        .seismos-marker {
          background: transparent !important;
          border: none !important;
        }
        .seismos-tooltip {
          background: rgba(30, 41, 59, 0.95) !important;
          border: 1px solid rgba(71, 85, 105, 0.5) !important;
          color: #f1f5f9 !important;
          font-family: var(--font-sans) !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          padding: 6px 10px !important;
          border-radius: 6px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3) !important;
        }
        .seismos-tooltip:before {
          border-top-color: rgba(30, 41, 59, 0.95) !important;
        }
      `}</style>
        </div>
    );
}
