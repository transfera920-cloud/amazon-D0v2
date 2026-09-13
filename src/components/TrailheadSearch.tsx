import React, { useState } from 'react';
import { Search, MapPin, Loader2, Sparkles } from 'lucide-react';

interface TrailheadSearchProps {
  onSearch: (trailheadName: string) => void;
  isLoading: boolean;
  currentTrailheadName?: string;
}

const POPULAR_TRAILHEADS = [
  { name: '塔塔加登山口', peak: '玉山群峰' },
  { name: '武陵農場登山口', peak: '雪山主東' },
  { name: '向陽登山口', peak: '嘉明湖 / 南二段' },
  { name: '合歡山登山口', peak: '合歡群峰' },
  { name: '鎮西堡登山口', peak: '神木群 / 霞喀羅' },
  { name: '勝光登山口', peak: '南湖大山' },
];

export const TrailheadSearch: React.FC<TrailheadSearchProps> = ({
  onSearch,
  isLoading,
  currentTrailheadName = '',
}) => {
  const [inputVal, setInputVal] = useState(currentTrailheadName || '塔塔加登山口');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSearch(inputVal.trim());
    }
  };

  const handleSelectChip = (name: string) => {
    setInputVal(name);
    onSearch(name);
  };

  return (
    <section className="bg-white border-b border-stone-200 py-6 px-4 sm:px-6 lg:px-8 shadow-xs">
      <div className="max-w-4xl mx-auto">
        {/* Semantic H1 Header */}
        <div className="mb-4 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            登山口附近 D0 住宿與真實車程搜尋
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            輸入目標登山口，系統將即時向 Google Maps Platform 查詢真實存在之飯店、民宿、背包客棧與露營區，並以 Google Routes API 取得精確駕車時間。
          </p>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
              <MapPin className="w-5 h-5 text-amber-600" />
            </div>
            <input
              id="trailhead-input"
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="輸入登山口名稱，如：塔塔加登山口、武陵農場、向陽登山口..."
              className="w-full pl-11 pr-24 py-3 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-base shadow-inner transition-all"
              disabled={isLoading}
            />
            {inputVal && (
              <button
                type="button"
                onClick={() => setInputVal('')}
                className="absolute inset-y-0 right-28 flex items-center pr-2 text-stone-400 hover:text-stone-600 text-xs"
              >
                清除
              </button>
            )}
          </div>

          <button
            id="search-submit-btn"
            type="submit"
            disabled={isLoading || !inputVal.trim()}
            className="ml-2.5 px-5 py-3 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-medium rounded-xl flex items-center space-x-2 transition-all shadow-sm shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span className="text-sm">搜尋中...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span className="text-sm">查詢住宿</span>
              </>
            )}
          </button>
        </form>

        {/* Popular Trailheads Quick Selector */}
        <div className="mt-3 flex items-center flex-wrap gap-1.5 text-xs text-stone-500">
          <span className="flex items-center space-x-1 font-medium text-stone-700 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>熱門登山口捷徑：</span>
          </span>
          {POPULAR_TRAILHEADS.map((th) => (
            <button
              key={th.name}
              type="button"
              onClick={() => handleSelectChip(th.name)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 border border-stone-200/80 transition-colors inline-flex items-center space-x-1 disabled:opacity-50"
            >
              <span className="font-semibold">{th.name}</span>
              <span className="text-[10px] text-stone-400">({th.peak})</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
