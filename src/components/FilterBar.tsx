import React from 'react';
import { Filter, SlidersHorizontal, RotateCcw, MapPin, Clock, DollarSign, Star, Home, ArrowUpDown } from 'lucide-react';
import { FilterCriteria, TrailheadResult } from '../types';

interface FilterBarProps {
  trailhead: TrailheadResult | null;
  filters: FilterCriteria;
  onFilterChange: (filters: FilterCriteria) => void;
  onResetFilters: () => void;
  totalCount: number;
  googleCount: number;
  customCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  trailhead,
  filters,
  onFilterChange,
  onResetFilters,
  totalCount,
  googleCount,
  customCount,
}) => {
  const handleDrivingChange = (val: string) => {
    onFilterChange({
      ...filters,
      maxDrivingMinutes: val === 'all' ? null : parseInt(val, 10),
    });
  };

  const handlePriceChange = (val: string) => {
    onFilterChange({
      ...filters,
      priceRange: val,
    });
  };

  const handleRatingChange = (val: string) => {
    onFilterChange({
      ...filters,
      minRating: val === 'all' ? null : parseFloat(val),
    });
  };

  const handleTypeChange = (val: string) => {
    onFilterChange({
      ...filters,
      type: val,
    });
  };

  const handleSortChange = (val: FilterCriteria['sortBy']) => {
    onFilterChange({
      ...filters,
      sortBy: val,
    });
  };

  return (
    <div className="bg-stone-50 border-b border-stone-200 py-3.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Trailhead resolution status bar */}
        {trailhead && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 bg-amber-50/80 border border-amber-200/70 px-3.5 py-2 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-amber-900 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>已定位登山口：{trailhead.name}</span>
              </span>
              <span className="text-stone-400 hidden sm:inline">|</span>
              <span className="text-stone-600 hidden sm:inline truncate max-w-md">
                {trailhead.formattedAddress}
              </span>
              <span className="text-[11px] font-mono text-stone-500 bg-white px-1.5 py-0.5 rounded border border-amber-200">
                {trailhead.location.lat.toFixed(4)}, {trailhead.location.lng.toFixed(4)}
              </span>
            </div>

            {/* Source breakdown indicator */}
            <div className="flex items-center space-x-2 text-[11px]">
              <span className="font-semibold text-stone-800">
                符合條件：{totalCount} 間
              </span>
              <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-medium">
                Google 即時 {googleCount}
              </span>
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                自有資料 {customCount}
              </span>
            </div>
          </div>
        )}

        {/* Filters Controls Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="flex items-center space-x-1 font-semibold text-stone-700 mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
            <span>條件篩選：</span>
          </div>

          {/* 1. 車程範圍 */}
          <div className="flex items-center space-x-1 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            <label htmlFor="filter-driving" className="text-stone-500">車程：</label>
            <select
              id="filter-driving"
              value={filters.maxDrivingMinutes === null ? 'all' : String(filters.maxDrivingMinutes)}
              onChange={(e) => handleDrivingChange(e.target.value)}
              className="bg-transparent font-medium text-stone-800 focus:outline-none cursor-pointer"
            >
              <option value="all">不限</option>
              <option value="30">30 分鐘內</option>
              <option value="60">60 分鐘內</option>
              <option value="90">90 分鐘內</option>
              <option value="120">120 分鐘內</option>
            </select>
          </div>

          {/* 2. 價格範圍 */}
          <div className="flex items-center space-x-1 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <DollarSign className="w-3.5 h-3.5 text-stone-500" />
            <label htmlFor="filter-price" className="text-stone-500">價格：</label>
            <select
              id="filter-price"
              value={filters.priceRange}
              onChange={(e) => handlePriceChange(e.target.value)}
              className="bg-transparent font-medium text-stone-800 focus:outline-none cursor-pointer"
            >
              <option value="all">不限</option>
              <option value="under1000">1000 以下</option>
              <option value="1000-1500">1000 – 1500</option>
              <option value="1500-2000">1500 – 2000</option>
              <option value="2000-2500">2000 – 2500</option>
              <option value="2500-3000">2500 – 3000</option>
              <option value="3000-3500">3000 – 3500</option>
              <option value="3500-4000">3500 – 4000</option>
              <option value="above4000">4000 以上</option>
            </select>
          </div>

          {/* 3. 最低評分 */}
          <div className="flex items-center space-x-1 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <label htmlFor="filter-rating" className="text-stone-500">評分：</label>
            <select
              id="filter-rating"
              value={filters.minRating === null ? 'all' : String(filters.minRating)}
              onChange={(e) => handleRatingChange(e.target.value)}
              className="bg-transparent font-medium text-stone-800 focus:outline-none cursor-pointer"
            >
              <option value="all">不限</option>
              <option value="3.5">3.5 以上</option>
              <option value="4.0">4.0 以上</option>
              <option value="4.5">4.5 以上</option>
            </select>
          </div>

          {/* 4. 住宿類型 */}
          <div className="flex items-center space-x-1 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <Home className="w-3.5 h-3.5 text-stone-500" />
            <label htmlFor="filter-type" className="text-stone-500">類型：</label>
            <select
              id="filter-type"
              value={filters.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="bg-transparent font-medium text-stone-800 focus:outline-none cursor-pointer"
            >
              <option value="all">不限</option>
              <option value="民宿">民宿</option>
              <option value="背包客棧">背包客棧</option>
              <option value="飯店">飯店</option>
              <option value="露營區">露營區</option>
            </select>
          </div>

          {/* 5. 排序 */}
          <div className="flex items-center space-x-1 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
            <label htmlFor="filter-sort" className="text-stone-500">排序：</label>
            <select
              id="filter-sort"
              value={filters.sortBy}
              onChange={(e) => handleSortChange(e.target.value as FilterCriteria['sortBy'])}
              className="bg-transparent font-semibold text-amber-900 focus:outline-none cursor-pointer"
            >
              <option value="driving_asc">車程最短</option>
              <option value="rating_desc">評分最高</option>
              <option value="price_asc">價格最低</option>
            </select>
          </div>

          {/* Reset Filters */}
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center space-x-1 text-stone-500 hover:text-stone-900 px-2 py-1.5 rounded hover:bg-stone-200/60 transition-colors ml-auto"
            title="重設所有篩選"
          >
            <RotateCcw className="w-3 h-3" />
            <span>重設篩選</span>
          </button>
        </div>
      </div>
    </div>
  );
};
