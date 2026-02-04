'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapData {
    lat: number;
    lng: number;
    intensity: number; // 0-1 arası
}

interface DamageHeatmapProps {
    data: HeatmapData[];
    visible: boolean;
}

// Leaflet.heat için tip genişletmesi
declare module 'leaflet' {
    function heatLayer(
        latlngs: Array<[number, number, number]>,
        options?: {
            radius?: number;
            blur?: number;
            maxZoom?: number;
            max?: number;
            minOpacity?: number;
            gradient?: Record<number, string>;
        }
    ): L.Layer;
}

export default function DamageHeatmap({ data, visible }: DamageHeatmapProps) {
    const map = useMap();

    useEffect(() => {
        if (!visible || data.length === 0) return;

        // Veriyi leaflet.heat formatına çevir: [lat, lng, intensity]
        const heatData: Array<[number, number, number]> = data.map(d => [
            d.lat,
            d.lng,
            d.intensity,
        ]);

        // Heatmap layer oluştur
        const heatLayer = L.heatLayer(heatData, {
            radius: 35,
            blur: 25,
            maxZoom: 17,
            max: 1.0,
            minOpacity: 0.4,
            gradient: {
                0.0: 'rgba(0, 255, 0, 0)',
                0.3: '#10b981',  // Yeşil - Güvenli
                0.5: '#f59e0b',  // Turuncu - Hasarlı
                0.7: '#ef4444',  // Kırmızı - Ağır Hasarlı
                1.0: '#7f1d1d',  // Koyu Kırmızı - Yıkık
            },
        });

        heatLayer.addTo(map);

        // Cleanup
        return () => {
            map.removeLayer(heatLayer);
        };
    }, [map, data, visible]);

    return null; // Bu component görsel render yapmaz, map üzerine layer ekler
}
