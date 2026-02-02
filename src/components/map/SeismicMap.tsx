'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSeismosStore } from '@/lib/store';

// Skora göre renk
function getColorByScore(score: number): string {
    if (score >= 90) return '#dc2626'; // Yıkılmış
    if (score >= 70) return '#f97316'; // Ağır hasarlı
    if (score >= 30) return '#eab308'; // Hasarlı
    return '#10b981'; // Güvenli
}

export default function SeismicMap() {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<Map<string, L.CircleMarker | L.Marker>>(new Map());

    const { nodes, selectedNodeId, selectNode, buildingDamages, isEarthquakeActive, consensusEvidence } = useSeismosStore();
    const [isMapReady, setIsMapReady] = useState(false);

    // Harita başlat
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [41.0290, 28.9470],
            zoom: 16,
            minZoom: 14,
            maxZoom: 18,
            zoomControl: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© CARTO',
            subdomains: 'abcd',
        }).addTo(map);

        mapRef.current = map;
        setIsMapReady(true);

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Marker ve Evidence Lines güncelle
    useEffect(() => {
        if (!mapRef.current || !isMapReady) return;

        const map = mapRef.current;
        const evidenceLines: L.Polyline[] = [];

        // 1. Evidence Lines (Kanıt Çizgileri)
        consensusEvidence.forEach((witnessIds, silentNodeId) => {
            const silentNode = nodes.get(silentNodeId);
            if (!silentNode) return;

            // Sadece seçili olan binanın kanıt ağını göster (Temiz görünüm)
            if (silentNodeId !== selectedNodeId) return;

            witnessIds.forEach(witnessId => {
                const witnessNode = nodes.get(witnessId);
                if (!witnessNode) return;

                const line = L.polyline([
                    [silentNode.lat, silentNode.lng],
                    [witnessNode.lat, witnessNode.lng]
                ], {
                    color: '#06b6d4', // Cyan (Daha belirgin)
                    weight: 3,
                    dashArray: '10, 10',
                    opacity: 0.8,
                    lineCap: 'round'
                }).addTo(map);

                evidenceLines.push(line);
            });
        });

        // 2. Marker'lar
        nodes.forEach((node, nodeId) => {
            const isSelected = nodeId === selectedNodeId;
            const damage = buildingDamages.get(nodeId);
            const score = damage?.totalScore || 0;
            const color = getColorByScore(score);

            const isVerifiedCollapse = node.status === 'collapse';
            const isInferredCollapse = node.status === 'collapse_inferred';

            const existingMarker = markersRef.current.get(nodeId);

            if (isVerifiedCollapse || isInferredCollapse) {
                // Yıkılmış bina (Doğrulanmış veya Tahmin Edilen)
                if (existingMarker) existingMarker.remove();

                let markerHtml = '';

                if (isVerifiedCollapse) {
                    // Doğrulanmış: Kırmızı X
                    markerHtml = `
                        <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="11" cy="11" r="10" fill="${color}" stroke="#1e293b" stroke-width="2"/>
                            <path d="M7 7L15 15M15 7L7 15" stroke="#1e293b" stroke-width="2.5" stroke-linecap="round"/>
                        </svg>
                    `;
                } else {
                    // INSD (Tahmin Edilen): Siyah/Gri, Pulsing, Soru İşareti
                    // "Ghost Node" efekti
                    markerHtml = `
                        <div class="relative w-full h-full flex items-center justify-center">
                            <div class="absolute inset-0 bg-slate-900 rounded-full animate-ping opacity-75"></div>
                            <div class="relative z-10 w-full h-full">
                                <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="11" cy="11" r="10" fill="#0f172a" stroke="#475569" stroke-width="2"/>
                                    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="bold">?</text>
                                </svg>
                            </div>
                        </div>
                    `;
                }

                const icon = L.divIcon({
                    html: markerHtml,
                    className: 'collapsed-marker',
                    iconSize: [22, 22],
                    iconAnchor: [11, 11],
                });

                const marker = L.marker([node.lat, node.lng], { icon: icon })
                    .on('click', () => selectNode(nodeId))
                    .addTo(map);

                markersRef.current.set(nodeId, marker);
            } else {
                if (existingMarker && 'setRadius' in existingMarker) {
                    const circleMarker = existingMarker as L.CircleMarker;
                    circleMarker.setStyle({
                        fillColor: color,
                        color: isSelected ? '#ffffff' : '#1e293b',
                        weight: isSelected ? 3 : 1,
                        radius: isSelected ? 10 : (score >= 30 ? 8 : 6),
                    });
                    circleMarker.setLatLng([node.lat, node.lng]);
                } else {
                    if (existingMarker) existingMarker.remove();

                    const marker = L.circleMarker([node.lat, node.lng], {
                        radius: score >= 30 ? 8 : 6,
                        fillColor: color,
                        color: '#1e293b',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 1,
                    })
                        .on('click', () => selectNode(nodeId))
                        .addTo(map);

                    markersRef.current.set(nodeId, marker);
                }
            }
        });

        // Çizgileri temizleme fonksiyonu
        return () => {
            evidenceLines.forEach(l => l.remove());
        };
    }, [nodes, selectedNodeId, buildingDamages, isMapReady, selectNode, consensusEvidence]);

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainerRef} className="w-full h-full" />

            {isEarthquakeActive && (
                <div className="absolute top-4 left-4 bg-red-600/90 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-white" />
                    <span className="text-white font-medium text-sm">Deprem Aktif</span>
                </div>
            )}

            <style jsx global>{`
                .collapsed-marker {
                    background: transparent !important;
                    border: none !important;
                }
            `}</style>
        </div>
    );
}
