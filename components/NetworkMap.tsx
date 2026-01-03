
import React, { useEffect, useRef, useState } from 'react';
import { NetworkSegment, NetworkPoint, NetworkType, ProjectStatus, PointType } from '../types';
import { STATUS_COLORS } from '../constants';

// Declare Leaflet Types globally since we load it via script tag
declare const L: any;

interface NetworkMapProps {
  segments: NetworkSegment[];
  points: NetworkPoint[];
  selectedType: NetworkType | 'ALL';
  onSegmentClick: (segment: NetworkSegment) => void;
  onPointClick: (point: NetworkPoint) => void;
  title?: string;
  focusLocation?: { x: number, y: number } | null; // New prop for zoom interaction
}

const NetworkMap: React.FC<NetworkMapProps> = ({ segments, points, selectedType, onSegmentClick, onPointClick, title, focusLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const focusLayerRef = useRef<any>(null); // Layer for the "focus" marker

  // Changed default state from 'SATELLITE' to 'STREETS'
  const [mapStyle, setMapStyle] = useState<'SATELLITE' | 'STREETS'>('STREETS');

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current && typeof L !== 'undefined') {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([21.543333, 39.172778], 15); // Default Jeddah

      L.control.zoom({ position: 'topright' }).addTo(map);
      
      mapInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
      focusLayerRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Handle Focus Location Change (FlyTo)
  useEffect(() => {
    if (focusLocation && mapInstanceRef.current && focusLayerRef.current) {
        const { x, y } = focusLocation; // x=Lon, y=Lat
        const latLng = [y, x];
        
        // Fly to location
        mapInstanceRef.current.flyTo(latLng, 19, {
            duration: 1.5
        });

        // Add a pulsing marker
        focusLayerRef.current.clearLayers();
        
        // Create a custom pulsing icon using CSS (injected via divIcon)
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
        
        // Also add a temporary circle
        const circle = L.circle(latLng, {
            radius: 5,
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.3
        }).addTo(focusLayerRef.current);

        // Remove marker after 5 seconds
        setTimeout(() => {
            if (focusLayerRef.current) focusLayerRef.current.clearLayers();
        }, 5000);
    }
  }, [focusLocation]);

  // Update Tile Layer based on style
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing tile layers
    mapInstanceRef.current.eachLayer((layer: any) => {
      if (layer._url) {
        mapInstanceRef.current.removeLayer(layer);
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

    // Render Segments
    segments.filter(s => selectedType === 'ALL' || s.type === selectedType).forEach(segment => {
      const color = STATUS_COLORS[segment.status];
      const startLatLng = [segment.startNode.y, segment.startNode.x];
      const endLatLng = [segment.endNode.y, segment.endNode.x];

      const line = L.polyline([startLatLng, endLatLng], {
        color: color,
        weight: 6,
        opacity: 0.9, 
        lineCap: 'round'
      }).addTo(layerGroup);

      line.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e);
        onSegmentClick(segment);
      });
      
      line.bindTooltip(`${segment.name} (${segment.length.toFixed(1)}m)`, { sticky: true, direction: 'top' });

      bounds.extend(startLatLng);
      bounds.extend(endLatLng);
      hasData = true;
    });

    // Render Points with custom shapes
    points.filter(p => {
      if (selectedType === 'ALL') return true;
      const isWaterPoint = [PointType.VALVE, PointType.FIRE_HYDRANT, PointType.WATER_HOUSE_CONNECTION, PointType.AIR_VALVE, PointType.WASH_VALVE, PointType.ELBOW, PointType.TEE, PointType.SADDLE, PointType.REDUCER].includes(p.type);
      return selectedType === NetworkType.WATER ? isWaterPoint : !isWaterPoint;
    }).forEach(point => {
      const color = STATUS_COLORS[point.status];
      const latLng = [point.location.y, point.location.x];
      
      // Determine shape based on type
      // Square: Manhole, Inspection Chamber, Oil Trap
      const isSquare = [PointType.MANHOLE, PointType.INSPECTION_CHAMBER, PointType.OIL_TRAP].includes(point.type);

      if (isSquare) {
          // Use DivIcon for Square
          const icon = L.divIcon({
              className: 'custom-square-marker',
              html: `<div style="
                  width: 14px; 
                  height: 14px; 
                  background-color: ${color}; 
                  border: 2px solid white; 
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              "></div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7]
          });
          const marker = L.marker(latLng, { icon }).addTo(layerGroup);
          marker.on('click', (e: any) => {
              L.DomEvent.stopPropagation(e);
              onPointClick(point);
          });
          marker.bindTooltip(point.name, { sticky: true, direction: 'top' });
      } else {
          // Circle for others
          const marker = L.circleMarker(latLng, {
              radius: 8,
              fillColor: color,
              color: '#fff',
              weight: 2,
              opacity: 0.9,
              fillOpacity: 0.9
          }).addTo(layerGroup);

          marker.on('click', (e: any) => {
              L.DomEvent.stopPropagation(e);
              onPointClick(point);
          });
          marker.bindTooltip(point.name, { sticky: true, direction: 'top' });
      }

      bounds.extend(latLng);
      hasData = true;
    });

    // Only fit bounds if we are NOT focusing on a specific issue
    if (hasData && !focusLocation) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

  }, [segments, points, selectedType, focusLocation]);

  return (
    <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-2 w-full overflow-hidden relative h-full flex flex-col">
      
      {/* CSS Injection for Animation */}
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

      {/* Map Style Toggle */}
      <div className="absolute top-6 right-6 z-[400] flex bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-1">
         <button 
           onClick={() => setMapStyle('SATELLITE')}
           className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${mapStyle === 'SATELLITE' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
         >
           <i className="fas fa-satellite ml-1"></i> Satellite
         </button>
         <button 
           onClick={() => setMapStyle('STREETS')}
           className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${mapStyle === 'STREETS' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-blue-600'}`}
         >
           <i className="fas fa-map ml-1"></i> Street
         </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-[400] bg-white/95 backdrop-blur-sm shadow-xl border border-slate-100 p-4 rounded-2xl min-w-[140px]">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Legend</h4>
          <div className="space-y-2">
             <div className="flex items-center gap-3">
               <div className="w-3 h-3 rounded-full bg-[#94a3b8] shadow-sm ring-2 ring-white"></div>
               <span className="text-[10px] font-bold text-slate-600">Planned</span>
             </div>
             <div className="flex items-center gap-3">
               <div className="w-3 h-3 rounded-full bg-[#22c55e] shadow-sm ring-2 ring-white"></div>
               <span className="text-[10px] font-bold text-slate-600">Executed</span>
             </div>
             <div className="flex items-center gap-3">
               <div className="w-3 h-3 rounded-full bg-[#f59e0b] shadow-sm ring-2 ring-white"></div>
               <span className="text-[10px] font-bold text-slate-600">In Progress</span>
             </div>
          </div>
        </div>

      <div ref={mapContainerRef} className="w-full h-full rounded-[32px] overflow-hidden z-0" style={{ minHeight: '500px' }}></div>
    </div>
  );
};

export default NetworkMap;
