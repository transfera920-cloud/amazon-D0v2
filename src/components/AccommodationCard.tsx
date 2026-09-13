import React from 'react';
import { MapPin, Phone, Car, Star, ExternalLink, Sparkles, Database, FileText } from 'lucide-react';
import { Accommodation } from '../types';

interface AccommodationCardProps {
  accommodation: Accommodation;
  isSelected: boolean;
  onSelect: (accommodation: Accommodation) => void;
}

export const AccommodationCard: React.FC<AccommodationCardProps> = ({
  accommodation,
  isSelected,
  onSelect,
}) => {
  const isGoogle = accommodation.source === 'google';

  return (
    <article
      id={`card-${accommodation.id}`}
      onClick={() => onSelect(accommodation)}
      className={`p-4 rounded-xl border transition-all cursor-pointer bg-white text-stone-900 ${
        isSelected
          ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
          : 'border-stone-200 hover:border-stone-300 hover:shadow-xs'
      }`}
    >
      {/* Header: Title & Source Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            {/* Source Badge */}
            {isGoogle ? (
              <span className="inline-flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                <Sparkles className="w-3 h-3 text-sky-500" />
                <span>Google 即時搜尋</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Database className="w-3 h-3 text-emerald-500" />
                <span>自有資料</span>
              </span>
            )}

            {/* Type Badge */}
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
              {accommodation.type}
            </span>
          </div>

          <h2 className="text-base font-bold text-stone-900 truncate tracking-tight hover:text-amber-700 transition-colors">
            {accommodation.name}
          </h2>
        </div>

        {/* Price Tag */}
        <div className="text-right shrink-0">
          <div className="text-sm font-bold text-stone-900">
            {accommodation.price !== null ? (
              <span className="text-amber-900">{accommodation.priceDisplay}</span>
            ) : (
              <span className="text-xs font-normal text-stone-500">價格未提供</span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row: Drive Time (Routes API) + Rating */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs py-2 px-2.5 rounded-lg bg-stone-50 border border-stone-100">
        {/* Drive Time from Google Routes API */}
        <div className="flex items-center space-x-1.5">
          <Car className={`w-4 h-4 shrink-0 ${accommodation.drivingDurationSeconds !== null ? 'text-amber-600' : 'text-stone-400'}`} />
          <div className="truncate">
            <span className="text-[10px] text-stone-500 block leading-tight">登山口車程 (Routes API)</span>
            <span className={`font-semibold ${accommodation.drivingDurationSeconds !== null ? 'text-stone-900' : 'text-stone-500'}`}>
              {accommodation.drivingDurationText}
            </span>
            {accommodation.drivingDistanceText !== '無法取得距離' && accommodation.drivingDistanceText !== '計算中...' && (
              <span className="text-[10px] text-stone-400 ml-1">({accommodation.drivingDistanceText})</span>
            )}
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center space-x-1.5 border-l border-stone-200 pl-2.5">
          <Star className={`w-4 h-4 shrink-0 ${accommodation.rating !== null ? 'text-amber-500 fill-amber-500' : 'text-stone-400'}`} />
          <div className="truncate">
            <span className="text-[10px] text-stone-500 block leading-tight">評分</span>
            {accommodation.rating !== null ? (
              <span className="font-semibold text-stone-900">
                {accommodation.rating.toFixed(1)}
                {accommodation.userRatingCount !== null ? (
                  <span className="text-[10px] text-stone-500 font-normal ml-1">
                    ({accommodation.userRatingCount} 則)
                  </span>
                ) : (
                  <span className="text-[10px] text-stone-400 font-normal ml-1">(評論數未提供)</span>
                )}
              </span>
            ) : (
              <span className="text-stone-500 font-normal">未提供</span>
            )}
          </div>
        </div>
      </div>

      {/* Address & Phone */}
      <div className="mt-2.5 space-y-1 text-xs text-stone-600">
        <div className="flex items-center space-x-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span className="truncate">{accommodation.address}</span>
        </div>

        {accommodation.phone && (
          <div className="flex items-center space-x-1.5">
            <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>電話：{accommodation.phone}</span>
          </div>
        )}

        {/* Custom Notes (if provided for custom entry) */}
        {accommodation.note && (
          <div className="flex items-start space-x-1.5 text-stone-500 italic pt-0.5">
            <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">備註：{accommodation.note}</span>
          </div>
        )}
      </div>

      {/* Action Links */}
      <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(accommodation);
          }}
          className="text-stone-600 hover:text-stone-900 font-medium flex items-center space-x-1"
        >
          <span>在 Google 地圖定位</span>
        </button>

        {accommodation.googleMapsUrl && (
          <a
            href={accommodation.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-amber-800 hover:text-amber-950 font-medium inline-flex items-center space-x-1"
          >
            <span>Google Maps 導航</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </article>
  );
};
