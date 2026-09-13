import React, { useEffect, useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { Mountain, Sparkles, Database, Car, Star, ExternalLink, MapPin } from 'lucide-react';
import { Accommodation, TrailheadResult } from '../types';

interface GoogleMapViewProps {
  apiKey: string;
  trailhead: TrailheadResult | null;
  accommodations: Accommodation[];
  selectedAccommodation: Accommodation | null;
  onSelectAccommodation: (acc: Accommodation | null) => void;
}

// Inner component to handle map camera and fitting bounds
const MapBoundsController: React.FC<{
  trailhead: TrailheadResult | null;
  accommodations: Accommodation[];
  selectedAccommodation: Accommodation | null;
}> = ({ trailhead, accommodations, selectedAccommodation }) => {
  const map = useMap();

  // Fit bounds when trailhead or accommodations list changes
  useEffect(() => {
    if (!map) return;

    if (selectedAccommodation) {
      map.panTo({
        lat: selectedAccommodation.location.lat,
        lng: selectedAccommodation.location.lng,
      });
      map.setZoom(14);
      return;
    }

    if (!trailhead && accommodations.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    if (trailhead) {
      bounds.extend({
        lat: trailhead.location.lat,
        lng: trailhead.location.lng,
      });
    }

    accommodations.forEach((acc) => {
      bounds.extend({
        lat: acc.location.lat,
        lng: acc.location.lng,
      });
    });

    map.fitBounds(bounds, {
      top: 60,
      bottom: 60,
      left: 60,
      right: 60,
    });
  }, [map, trailhead, accommodations, selectedAccommodation]);

  return null;
};

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  apiKey,
  trailhead,
  accommodations,
  selectedAccommodation,
  onSelectAccommodation,
}) => {
  const [showTrailheadInfo, setShowTrailheadInfo] = useState(false);

  // Fallback center for central mountain range
  const defaultCenter = trailhead
    ? { lat: trailhead.location.lat, lng: trailhead.location.lng }
    : { lat: 23.47, lng: 120.88 };

  if (!apiKey) {
    return (
      <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 mb-3">
          <MapPin className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-stone-900">需要 Google Maps API 金鑰</h3>
        <p className="mt-1 text-xs text-stone-500 max-w-sm">
          地圖功能需要具備 Maps JavaScript API 授權之金鑰。請點擊右上角「API 金鑰檢測」輸入或於環境變數配置。
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[420px] relative rounded-xl overflow-hidden border border-stone-200 shadow-sm">
      <APIProvider apiKey={apiKey} language="zh-TW" region="TW">
        <Map
          id="d0-main-map"
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          defaultCenter={defaultCenter}
          defaultZoom={11}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        >
          <MapBoundsController
            trailhead={trailhead}
            accommodations={accommodations}
            selectedAccommodation={selectedAccommodation}
          />

          {/* Trailhead Marker */}
          {trailhead && (
            <AdvancedMarker
              position={{ lat: trailhead.location.lat, lng: trailhead.location.lng }}
              title={`登山口: ${trailhead.name}`}
              onClick={() => setShowTrailheadInfo(true)}
              zIndex={50}
            >
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="bg-red-600 text-white p-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center transform group-hover:scale-110 transition-transform">
                  <Mountain className="w-5 h-5" />
                </div>
                <div className="bg-stone-900/90 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow mt-1 whitespace-nowrap border border-stone-700">
                  {trailhead.name}
                </div>
              </div>
            </AdvancedMarker>
          )}

          {/* Trailhead InfoWindow */}
          {trailhead && showTrailheadInfo && (
            <InfoWindow
              position={{ lat: trailhead.location.lat, lng: trailhead.location.lng }}
              onCloseClick={() => setShowTrailheadInfo(false)}
            >
              <div className="p-1 max-w-xs text-stone-900 space-y-1 text-xs">
                <div className="flex items-center space-x-1.5 font-bold text-sm text-red-700">
                  <Mountain className="w-4 h-4" />
                  <span>{trailhead.name} (起點)</span>
                </div>
                <p className="text-stone-600 text-[11px]">{trailhead.formattedAddress}</p>
                <div className="text-[10px] text-stone-400 font-mono">
                  座標：{trailhead.location.lat.toFixed(5)}, {trailhead.location.lng.toFixed(5)}
                </div>
              </div>
            </InfoWindow>
          )}

          {/* Accommodation Markers */}
          {accommodations.map((acc) => {
            const isSelected = selectedAccommodation?.id === acc.id;
            const isGoogle = acc.source === 'google';

            return (
              <AdvancedMarker
                key={acc.id}
                position={{ lat: acc.location.lat, lng: acc.location.lng }}
                title={acc.name}
                onClick={() => onSelectAccommodation(acc)}
                zIndex={isSelected ? 40 : 10}
              >
                <div className="flex flex-col items-center cursor-pointer group">
                  <div
                    className={`p-1.5 rounded-full shadow-md border-2 border-white flex items-center justify-center transform transition-transform ${
                      isSelected
                        ? 'bg-amber-500 scale-125 ring-4 ring-amber-400/40'
                        : isGoogle
                        ? 'bg-sky-600 hover:scale-110'
                        : 'bg-emerald-600 hover:scale-110'
                    } text-white`}
                  >
                    {isGoogle ? (
                      <Sparkles className="w-3.5 h-3.5" />
                    ) : (
                      <Database className="w-3.5 h-3.5" />
                    )}
                  </div>
                  {/* Small tag */}
                  <div
                    className={`text-[10px] px-1.5 py-0.2 rounded shadow mt-0.5 whitespace-nowrap font-medium ${
                      isSelected
                        ? 'bg-amber-900 text-white font-bold'
                        : 'bg-white/95 text-stone-800 border border-stone-200'
                    }`}
                  >
                    {acc.name.length > 8 ? `${acc.name.slice(0, 8)}...` : acc.name}
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Selected Accommodation InfoWindow */}
          {selectedAccommodation && (
            <InfoWindow
              position={{
                lat: selectedAccommodation.location.lat,
                lng: selectedAccommodation.location.lng,
              }}
              onCloseClick={() => onSelectAccommodation(null)}
            >
              <div className="p-1 max-w-xs text-stone-900 space-y-1.5 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      selectedAccommodation.source === 'google'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {selectedAccommodation.source === 'google' ? 'Google 即時' : '自有資料'}
                  </span>
                  <span className="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-700">
                    {selectedAccommodation.type}
                  </span>
                </div>

                <div className="font-bold text-sm text-stone-900">
                  {selectedAccommodation.name}
                </div>

                <div className="grid grid-cols-2 gap-1 py-1 px-1.5 bg-stone-50 rounded border border-stone-200 text-[11px]">
                  <div className="flex items-center space-x-1">
                    <Car className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-medium text-stone-900">
                      {selectedAccommodation.drivingDurationText}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    <span className="font-medium text-stone-900">
                      {selectedAccommodation.rating !== null
                        ? selectedAccommodation.rating.toFixed(1)
                        : '未提供評分'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-stone-600">
                  {selectedAccommodation.address}
                </div>

                {selectedAccommodation.price !== null && (
                  <div className="text-[11px] font-bold text-amber-900">
                    價格：{selectedAccommodation.priceDisplay}
                  </div>
                )}

                {selectedAccommodation.googleMapsUrl && (
                  <div className="pt-1 border-t border-stone-100">
                    <a
                      href={selectedAccommodation.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-800 hover:text-amber-950 font-bold inline-flex items-center space-x-1 text-[11px]"
                    >
                      <span>開啟 Google Maps 導航</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
};
