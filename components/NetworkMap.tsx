import React, { useEffect, useRef, useState } from 'react';
import { NetworkSegment, NetworkPoint, NetworkType, ProjectStatus, PointType } from '../types';
import { STATUS_COLORS } from '../constants';
import L from 'leaflet';
// Note: Leaflet CSS is loaded in index.html to ensure order

interface NetworkMapProps {
  segments: NetworkSegment[];
  points: NetworkPoint[];
  selectedType: NetworkType | 'ALL';
  onSegmentClick: (segment: NetworkSegment) => void;
  onPointClick: (point: NetworkPoint) => void;
  title?: string;
  focusLocation?: { x: number, y: number } | null;
}

const NetworkMap: React.FC<NetworkMapProps> = ({ segments, points, selectedType, onSegmentClick, onPointClick, title, focusLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const focusLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapStyle, setMapStyle] = useState<'SATELLITE' | 'STREETS'>('STREETS');

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([21.543333, 39.172778], 15); // Default Jeddah

      L.control.zoom({ position: 'topright' }).addTo(map);
      
      mapInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
      focusLayerRef.current = L.layerGroup().addTo(map);

      // Force a resize calculation after mount
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, []);

  // Handle Focus Location Change (FlyTo)
  useEffect(() => {
    if (focusLocation && mapInstanceRef.current && focusLayerRef.current) {
        const { x, y } = focusLocation; // x=Lon, y=Lat
        const latLng: L.LatLngExpression = [y, x];
        
        mapInstanceRef.current.flyTo(latLng, 19, {
            duration: 1.5
        });

        focusLayerRef.current.clearLayers();
        
        const pulsingIcon = L.divIcon({
            className: 'custom-pulse-marker',
            html: `<div style="
                width: 20px;
                height: 20px;
                background: rgba(239, 68, 68, 0.6);
                border-radius: 50%;
                border: 3px solid #fff;
                box-shadow: 0 0 0 rgba(239, 68, 68, 0.4);
                animation: leaflet-pulse 1.5s infinite;
            "></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        L.marker(latLng, { icon: pulsingIcon }).addTo(focusLayerRef.current);
        
        L.circle(latLng, {
            radius: 5,
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.3
        }).addTo(focusLayerRef.current);

        setTimeout(() => {
            if (focusLayerRef.current) focusLayerRef.current.clearLayers();
        }, 5000);
    }
  }, [focusLocation]);

  // Update Tile Layer based on style
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.eachLayer((layer) => {
      // @ts-ignore - Check for url property to identify tile layers
      if (layer._url) {
        mapInstanceRef.current?.removeLayer(layer);
      }
    });

    if (mapStyle === 'SATELLITE') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri'
      }).addTo(mapInstanceRef.current);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }
  }, [mapStyle]);

  // Render Data
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    const bounds = L.latLngBounds([]);
    let hasData = false;

    segments.filter(s => selectedType === 'ALL' || s.type === selectedType).forEach(segment => {
      const color = STATUS_COLORS[segment.status];
      const startLatLng: L.LatLngExpression = [segment.startNode.y, segment.startNode.x];
      const endLatLng: L.LatLngExpression = [segment.endNode.y, segment.endNode.x];

      const line = L.polyline([startLatLng, endLatLng], {
        color: color,
        weight: 6,
        opacity: 0.9, 
        lineCap: 'round'
      }).addTo(layerGroup);

      line.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSegmentClick(segment);
      });
      
      line.bindTooltip(`${segment.name} (${segment.length.toFixed(1)}m)`, { sticky: true, direction: 'top' });

      bounds.extend(startLatLng);
      bounds.extend(endLatLng);
      hasData = true;
    });

    points.filter(p => {
      if (selectedType === 'ALL') return true;
      const isWaterPoint = [PointType.VALVE, PointType.FIRE_HYDRANT, PointType.WATER_HOUSE_CONNECTION, PointType.AIR_VALVE, PointType.WASH_VALVE, PointType.ELBOW, PointType.TEE, PointType.SADDLE, PointType.REDUCER].includes(p.type);
      return selectedType === NetworkType.WATER ? isWaterPoint : !isWaterPoint;
    }).forEach(point => {
      const color = STATUS_COLORS[point.status];
      const latLng: L.LatLngExpression = [point.location.y, point.location.x];
      let marker;

      const isFitting = [PointType.ELBOW, PointType.TEE, PointType.SADDLE, PointType.REDUCER].includes(point.type);
      
      if (isFitting) {
          marker = L.circleMarker(latLng, {
              radius: 5,
              fillColor: color,
              color: '#fff',
              weight: 1,
              opacity: 1,
              fillOpacity: 0.8
          });
      } else {
          let iconClass = '';
          let isSquare = false;

          switch (point.type) {
            case PointType.VALVE:
            case PointType.AIR_VALVE:
            case PointType.WASH_VALVE:
              iconClass = 'fa-faucet';
              break;
            case PointType.FIRE_HYDRANT:
              iconClass = 'fa-fire-extinguisher';
              break;
            case PointType.WATER_HOUSE_CONNECTION:
            case PointType.SEWAGE_HOUSE_CONNECTION:
              iconClass = 'fa-home';
              break;
            case PointType.MANHOLE:
            case PointType.INSPECTION_CHAMBER:
            case PointType.OIL_TRAP:
               isSquare = true;
               break;
            default:
               iconClass = 'fa-map-marker-alt';
          }

          if (isSquare) {
               const icon = L.divIcon({
                  className: 'custom-square-marker',
                  html: `<div style="
                      width: 16px; 
                      height: 16px; 
                      background-color: ${color}; 
                      border: 2px solid white; 
                      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                  ">
                    ${point.type === PointType.MANHOLE ? '<div style="width:4px; height:4px; background:white; border-radius:50%"></div>' : ''}
                  </div>`,
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
              });
              marker = L.marker(latLng, { icon });
          } else {
              const icon = L.divIcon({
                  className: 'custom-point-icon',
                  html: `<div style="
                    width: 24px;
                    height: 24px;
                    background-color: ${color};
                    border: 2px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  ">
                    <i class="fas ${iconClass}" style="color: white; font-size: 11px;"></i>
                  </div>`,
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
              });
              marker = L.marker(latLng, { icon });
          }
      }

      if (marker) {
          marker.addTo(layerGroup);
          marker.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              onPointClick(point);
          });
          marker.bindTooltip(point.name, { sticky: true, direction: 'top' });
      }

      bounds.extend(latLng);
      hasData = true;
    });

    if (hasData && !focusLocation) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

  }, [segments, points, selectedType, focusLocation]);

  return (
    <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-2 w-full overflow-hidden relative h-full flex flex-col">
      <style>{`
        @keyframes leaflet-pulse {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); transform: scale(0.95); }
            70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); transform: scale(1); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); transform: scale(0.95); }
        }
      `}</style>
      <div className="absolute top-6 left-6 z-[400] bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-slate-200">
         <h3 className="text-sm font-black text-slate-800">{title || "General Site Map"}</h3>
      </div>
      <div className="absolute top-6 right-6 z-[400] flex bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-1">
         <button onClick={() => setMapStyle('SATELLITE')} className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${mapStyle === 'SATELLITE' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}><i className="fas fa-satellite ml-1"></i> Satellite</button>
         <button onClick={() => setMapStyle('STREETS')} className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${mapStyle === 'STREETS' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-blue-600'}`}><i className="fas fa-map ml-1"></i> Street</button>
      </div>
      <div ref={mapContainerRef} className="w-full h-full rounded-[32px] overflow-hidden z-0" style={{ minHeight: '500px' }}></div>
    </div>
  );
};

export default NetworkMap;