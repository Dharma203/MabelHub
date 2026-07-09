'use client';

import { useEffect, useRef } from "react";

export interface SalesVisit {
    id: string | number;
    city: string;
    lat: number;
    lng: number;
    nama_sales: string;
    sales_name?: string;
    visit_date: string;
    customerCount?: number;
}

interface SalesMapProps {
    visits: SalesVisit[];
    height?: string;
    defaultCenter?: [number, number];
    defaultZoom?: number;
}


// ── Warna pin (otomatis berganti per kota) ─────────────────────────
const PIN_COLORS = ['#ef4444', '#f97316', '#8b5cf6', '#3b82f6', '#22c55e', '#ec4899'];


// ── Generate HTML untuk pin SVG ───────────────────────────────────
function makePinHTML(color: string): string {
  return `
    <div style="filter:drop-shadow(0 4px 8px rgba(0,0,0,0.35))">
      <svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 0C7.611 0 0 7.611 0 17c0 11.5 17 27 17 27s17-15.5 17-27C34 7.611 26.389 0 17 0z"
              fill="${color}"/>
        <circle cx="17" cy="16" r="7" fill="white" opacity="0.95"/>
        <circle cx="17" cy="16" r="4" fill="${color}" opacity="0.4"/>
      </svg>
    </div>
  `;
}

export default function SalesMap({
  visits,
  height = '500px',
  defaultCenter = [-6.9175, 107.6191], // default: Bandung
  defaultZoom = 11,
}: SalesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const markersRef   = useRef<any[]>([]);
 
  // ── 1. Inisialisasi map (hanya satu kali) ─────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
 
    // Dynamic import → aman untuk SSR (Next.js)
    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return;
 
      const map = L.map(containerRef.current);
      map.setView(defaultCenter, defaultZoom);
      mapRef.current = map;
 
      // OpenStreetMap tile — GRATIS, tidak perlu API key
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);
    });
 
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
  // ── 2. Update marker setiap kali data `visits` berubah ─────────
  useEffect(() => {
    if (!mapRef.current) {
      // Map belum ready, coba lagi setelah 300ms
      const t = setTimeout(() => {
        updateMarkers();
      }, 300);
      return () => clearTimeout(t);
    }
    updateMarkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits]);
 
  function updateMarkers() {
    import('leaflet').then((L) => {
      const map = mapRef.current;
      if (!map) return;
 
      // Hapus semua marker lama
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];
 
      if (visits.length === 0) return;
 
      // Tambahkan marker baru
      visits.forEach((visit, i) => {
        // Skip drawing fallback marker if lat/lng are 0 (handled by GeoJSON only)
        if (visit.lat === 0 && visit.lng === 0) return;

        const color = PIN_COLORS[i % PIN_COLORS.length];
 
        // Icon custom (SVG pin)
        const icon = L.divIcon({
          className: '',
          html: makePinHTML(color),
          iconSize: [34, 44],
          iconAnchor: [17, 44],
          popupAnchor: [0, -48],
        });

        // Resolve display name: prefer sales_name, fallback to nama_sales
        const displayName = visit.sales_name || visit.nama_sales || '-';
 
        // Popup konten
        const popupHtml = `
          <div style="font-family:system-ui,sans-serif;padding:14px 16px;min-width:185px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;
                        border-bottom:1px solid #f1f5f9;padding-bottom:10px;">
              <div style="width:10px;height:10px;border-radius:50%;
                          background:${color};flex-shrink:0"></div>
              <span style="font-weight:700;font-size:15px;color:#0f172a">${visit.city}</span>
            </div>
            <div style="font-size:12.5px;color:#475569;display:flex;flex-direction:column;gap:5px;">
              <div>👤 Sales: <strong style="color:#0f172a">${displayName}</strong></div>
              <div>📅 ${visit.visit_date}</div>
              ${visit.customerCount
                ? `<div>🏪 Customer: <strong style="color:#0f172a">${visit.customerCount}</strong></div>`
                : ''}
            </div>
          </div>
        `;
 
        const marker = L.marker([visit.lat, visit.lng], { icon })
          .addTo(map)
          .bindPopup(popupHtml, { maxWidth: 230 });
 
        // Label nama kota
        const labelIcon = L.divIcon({
          className: '',
          html: `<div style="background:white;border-radius:4px;padding:2px 8px;
                            font-weight:700;font-size:11px;color:#0f172a;
                            box-shadow:0 1px 6px rgba(0,0,0,0.2);white-space:nowrap">
                   ${visit.city}
                 </div>`,
          iconAnchor: [-6, -6],
        });
        
        const labelMarker = L.marker([visit.lat, visit.lng], { icon: labelIcon }).addTo(map);
        markersRef.current.push(marker, labelMarker);
      });
    });
  }

  // ── 3. Muat GeoJSON untuk batas kota/kabupaten ─────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    
    let geoJsonLayer: any = null;

    import('leaflet').then((L) => {
      fetch('/geojson/indonesia-kab-kota.geojson')
        .then(res => res.json())
        .then(data => {
          if (!mapRef.current) return;
          const map = mapRef.current;
          
          geoJsonLayer = L.geoJSON(data, {
            style: (feature: any) => {
              // Menyesuaikan format nama di GeoJSON. Biasanya di properties KABKOT atau NAME_2
              const cityName = (feature?.properties?.KABKOT || feature?.properties?.NAME_2 || feature?.properties?.name || '').toLowerCase();
              const hasVisits = visits.some(v => v.city.toLowerCase() === cityName);
              
              return {
                fillColor: hasVisits ? '#3b82f6' : '#e5e7eb',
                weight: hasVisits ? 2 : 1,
                opacity: 1,
                color: hasVisits ? '#2563eb' : 'white',
                fillOpacity: hasVisits ? 0.7 : 0.4
              };
            },
            onEachFeature: (feature: any, layer: any) => {
              const cityName = feature?.properties?.KABKOT || feature?.properties?.NAME_2 || feature?.properties?.name || '-';
              const matchedVisits = visits.filter(v => v.city.toLowerCase() === cityName?.toLowerCase());
              
              if (matchedVisits.length > 0) {
                const totalCustomer = matchedVisits.reduce((acc, v) => acc + (v.customerCount || 0), 0);
                const salesNames = Array.from(new Set(matchedVisits.map(v => v.sales_name || v.nama_sales || '-'))).join(', ');
                
                layer.bindPopup(`
                  <div style="font-family:system-ui,sans-serif;padding:8px;min-width:180px;">
                    <div style="font-weight:700;font-size:15px;color:#0f172a;margin-bottom:8px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">
                      📍 ${cityName}
                    </div>
                    <div style="font-size:12.5px;color:#475569;line-height:1.5;">
                      <div>👥 <strong>Sales:</strong> ${salesNames}</div>
                      <div>🏢 <strong>Total Visit:</strong> ${totalCustomer}</div>
                    </div>
                  </div>
                `);
              }

              layer.on({
                mouseover: (e: any) => {
                  const l = e.target;
                  l.setStyle({ weight: 3, color: '#f97316', fillOpacity: 0.9 });
                  l.bringToFront();
                },
                mouseout: (e: any) => {
                  if (geoJsonLayer) geoJsonLayer.resetStyle(e.target);
                }
              });
            }
          }).addTo(map);

          // Posisikan map agar memuat area yang memiliki data
          if (visits.length > 0) {
            const activeLayers = geoJsonLayer.getLayers().filter((l: any) => {
              const name = (l.feature?.properties?.KABKOT || l.feature?.properties?.NAME_2 || l.feature?.properties?.name || '').toLowerCase();
              return visits.some(v => v.city.toLowerCase() === name);
            });
            if (activeLayers.length > 0) {
              const group = new L.FeatureGroup(activeLayers);
              map.fitBounds(group.getBounds(), { padding: [20, 20], maxZoom: 12 });
            }
          }
        })
        .catch(err => console.error("Failed to load geojson:", err));
    });

    return () => {
      if (geoJsonLayer && mapRef.current) {
        mapRef.current.removeLayer(geoJsonLayer);
      }
    };
  }, [visits]);
 
  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}
    />
  );
}