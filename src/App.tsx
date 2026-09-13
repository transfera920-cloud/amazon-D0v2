import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  KeyRound,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Compass,
  MapPin,
  Car,
  Database,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { TrailheadSearch } from './components/TrailheadSearch';
import { FilterBar } from './components/FilterBar';
import { AccommodationCard } from './components/AccommodationCard';
import { GoogleMapView } from './components/GoogleMapView';
import { AdminModal } from './components/AdminModal';
import { ApiStatusModal } from './components/ApiStatusModal';
import {
  Accommodation,
  TrailheadResult,
  FilterCriteria,
  ApiVerificationResult,
} from './types';

const INITIAL_FILTERS: FilterCriteria = {
  maxDrivingMinutes: null,
  priceRange: 'all',
  minRating: null,
  type: 'all',
  sortBy: 'driving_asc',
};

export default function App() {
  // API Key & Status
  const [apiKey, setApiKey] = useState<string>('');
  const [userEnteredKey, setUserEnteredKey] = useState<string>('');
  const [apiStatus, setApiStatus] = useState<ApiVerificationResult | null>(null);
  const [isVerifyingKey, setIsVerifyingKey] = useState<boolean>(false);
  const [showApiModal, setShowApiModal] = useState<boolean>(false);

  // Search & Trailhead State
  const [trailhead, setTrailhead] = useState<TrailheadResult | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchStep, setSearchStep] = useState<string>('');
  const [searchError, setSearchError] = useState<string | null>(null);

  // Accommodations Data
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [customAccommodations, setCustomAccommodations] = useState<Accommodation[]>([]);
  const [selectedAccommodation, setSelectedAccommodation] = useState<Accommodation | null>(null);

  // Filters & Admin UI
  const [filters, setFilters] = useState<FilterCriteria>(INITIAL_FILTERS);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);

  // Helper for fetch with API key header if user provided one in UI
  const getFetchHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (userEnteredKey.trim()) {
      headers['x-google-maps-api-key'] = userEnteredKey.trim();
    }
    return headers;
  }, [userEnteredKey]);

  // 1. Verify API Key against Google Services
  const verifyApiKey = useCallback(async (customKey?: string) => {
    setIsVerifyingKey(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const keyToTest = customKey || userEnteredKey;
      if (keyToTest) {
        headers['x-google-maps-api-key'] = keyToTest;
      }

      const res = await fetch('/api/maps/verify-key', {
        method: 'POST',
        headers,
      });

      const data: ApiVerificationResult = await res.json();
      setApiStatus(data);

      if (data.hasKey && keyToTest) {
        setApiKey(keyToTest);
      }
    } catch (err) {
      console.error('Failed to verify API Key:', err);
    } finally {
      setIsVerifyingKey(false);
    }
  }, [userEnteredKey]);

  // Load Custom Accommodations from backend
  const loadCustomAccommodations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/accommodations');
      const data = await res.json();
      if (data.success && Array.isArray(data.accommodations)) {
        setCustomAccommodations(data.accommodations);
      }
    } catch (err) {
      console.error('Failed to load custom accommodations:', err);
    }
  }, []);

  // 2. Initial Setup: Check env and storage keys
  useEffect(() => {
    const savedKey = localStorage.getItem('d0_custom_gmap_key') || '';
    if (savedKey) {
      setUserEnteredKey(savedKey);
    }

    // Check server config
    fetch('/api/config')
      .then((res) => res.json())
      .then((config) => {
        if (config.apiKey) {
          setApiKey(config.apiKey);
        } else if (savedKey) {
          setApiKey(savedKey);
        }
        // Verify key and load custom data
        verifyApiKey(savedKey || config.apiKey || undefined);
        loadCustomAccommodations();
      })
      .catch((err) => {
        console.error('Config fetch failed:', err);
        loadCustomAccommodations();
      });
  }, [verifyApiKey, loadCustomAccommodations]);

  // 3. Core Search Flow: Trailhead -> Google Places + Custom DB -> Google Routes Driving Times
  const handleSearch = async (trailheadName: string) => {
    setSearchError(null);
    setIsSearching(true);
    setSelectedAccommodation(null);

    try {
      // Step A: Geocode Trailhead
      setSearchStep(`正在透過 Google 尋找「${trailheadName}」經緯度...`);
      const geoRes = await fetch('/api/maps/geocode-trailhead', {
        method: 'POST',
        headers: getFetchHeaders(),
        body: JSON.stringify({ query: trailheadName }),
      });

      const geoData = await geoRes.json();

      if (!geoRes.ok || !geoData.success) {
        if (geoData.missingApi) {
          setSearchError(`缺少 ${geoData.missingApi}：${geoData.error}`);
        } else {
          setSearchError(geoData.error || `無法找到「${trailheadName}」之經緯度位置。`);
        }
        setIsSearching(false);
        setSearchStep('');
        return;
      }

      const targetTrailhead: TrailheadResult = geoData.trailhead;
      setTrailhead(targetTrailhead);

      // Step B: Search Google Places (New) around Trailhead & Fetch Active Custom Places
      setSearchStep('正在向 Google Places (New) 搜尋周邊真實住宿...');
      const [placesRes, activeCustomRes] = await Promise.all([
        fetch('/api/maps/search-places', {
          method: 'POST',
          headers: getFetchHeaders(),
          body: JSON.stringify({
            lat: targetTrailhead.location.lat,
            lng: targetTrailhead.location.lng,
            radiusMeters: 30000,
          }),
        }),
        fetch('/api/admin/accommodations/active'),
      ]);

      const placesData = await placesRes.json();
      if (!placesRes.ok || !placesData.success) {
        if (placesData.missingApi) {
          setSearchError(`缺少 ${placesData.missingApi}：${placesData.error}`);
        } else {
          setSearchError(placesData.error || 'Google Places 搜尋失敗');
        }
        setIsSearching(false);
        setSearchStep('');
        return;
      }

      const googleItems: Accommodation[] = placesData.accommodations || [];

      // Custom items from manual backend
      let customItems: Accommodation[] = [];
      try {
        const customData = await activeCustomRes.json();
        if (customData.success && Array.isArray(customData.accommodations)) {
          customItems = customData.accommodations.map((c: any) => ({
            ...c,
            drivingDurationSeconds: null,
            drivingDurationText: '計算中...',
            drivingDistanceMeters: null,
            drivingDistanceText: '計算中...',
          }));
        }
      } catch (err) {
        console.warn('Failed to parse custom items:', err);
      }

      // Merge Google Places + Custom
      const rawCombined: Accommodation[] = [...customItems, ...googleItems];

      if (rawCombined.length === 0) {
        setAccommodations([]);
        setIsSearching(false);
        setSearchStep('');
        return;
      }

      // Initially set list so user sees places immediately while Routes computes
      setAccommodations(rawCombined);

      // Step C: Google Routes API - Compute Real Driving Distance & Time
      setSearchStep('正在呼叫 Google Routes API 計算各住宿到登山口之實際駕車時間...');
      const routesRes = await fetch('/api/maps/compute-driving-times', {
        method: 'POST',
        headers: getFetchHeaders(),
        body: JSON.stringify({
          origin: targetTrailhead.location,
          destinations: rawCombined.map((acc) => ({
            id: acc.id,
            lat: acc.location.lat,
            lng: acc.location.lng,
          })),
        }),
      });

      const routesData = await routesRes.json();

      if (routesRes.ok && routesData.success && routesData.routes) {
        const routesMap = routesData.routes;
        const updatedList = rawCombined.map((acc) => {
          const routeInfo = routesMap[acc.id];
          if (routeInfo) {
            return {
              ...acc,
              drivingDurationSeconds: routeInfo.durationSeconds,
              drivingDurationText: routeInfo.durationText,
              drivingDistanceMeters: routeInfo.distanceMeters,
              drivingDistanceText: routeInfo.distanceText,
            };
          }
          return {
            ...acc,
            drivingDurationSeconds: null,
            drivingDurationText: '無法取得車程',
            drivingDistanceMeters: null,
            drivingDistanceText: '無法取得距離',
          };
        });
        setAccommodations(updatedList);
      } else if (routesData.missingApi) {
        setSearchError(`缺少 ${routesData.missingApi}：${routesData.error}（車程暫時無法取得）`);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError(`搜尋過程發生錯誤: ${err.message}`);
    } finally {
      setIsSearching(false);
      setSearchStep('');
    }
  };

  // Initial default search when key is available
  useEffect(() => {
    if (apiKey && !trailhead && accommodations.length === 0) {
      handleSearch('塔塔加登山口');
    }
  }, [apiKey]);

  // 4. Filtering and Sorting Logic
  const filteredAccommodations = useMemo(() => {
    return accommodations
      .filter((acc) => {
        // 1. 車程篩選
        if (filters.maxDrivingMinutes !== null) {
          if (
            acc.drivingDurationSeconds === null ||
            acc.drivingDurationSeconds === undefined
          ) {
            return false;
          }
          const minutes = acc.drivingDurationSeconds / 60;
          if (minutes > filters.maxDrivingMinutes) {
            return false;
          }
        }

        // 2. 價格篩選
        if (filters.priceRange !== 'all') {
          if (acc.price === null) return false;
          const p = acc.price;
          if (filters.priceRange === 'under1000' && p >= 1000) return false;
          if (filters.priceRange === '1000-1500' && (p < 1000 || p > 1500)) return false;
          if (filters.priceRange === '1500-2000' && (p < 1500 || p > 2000)) return false;
          if (filters.priceRange === '2000-2500' && (p < 2000 || p > 2500)) return false;
          if (filters.priceRange === '2500-3000' && (p < 2500 || p > 3000)) return false;
          if (filters.priceRange === '3000-3500' && (p < 3000 || p > 3500)) return false;
          if (filters.priceRange === '3500-4000' && (p < 3500 || p > 4000)) return false;
          if (filters.priceRange === 'above4000' && p <= 4000) return false;
        }

        // 3. 最低評分篩選
        if (filters.minRating !== null) {
          if (acc.rating === null || acc.rating < filters.minRating) return false;
        }

        // 4. 住宿類型篩選
        if (filters.type !== 'all') {
          if (acc.type !== filters.type) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'driving_asc') {
          // Put valid driving duration first
          const durA = a.drivingDurationSeconds ?? 9999999;
          const durB = b.drivingDurationSeconds ?? 9999999;
          return durA - durB;
        }
        if (filters.sortBy === 'rating_desc') {
          const rateA = a.rating ?? -1;
          const rateB = b.rating ?? -1;
          return rateB - rateA;
        }
        if (filters.sortBy === 'price_asc') {
          const priceA = a.price ?? 9999999;
          const priceB = b.price ?? 9999999;
          return priceA - priceB;
        }
        return 0;
      });
  }, [accommodations, filters]);

  // Counts
  const googleCount = useMemo(
    () => filteredAccommodations.filter((a) => a.source === 'google').length,
    [filteredAccommodations]
  );
  const customCount = useMemo(
    () => filteredAccommodations.filter((a) => a.source === 'custom').length,
    [filteredAccommodations]
  );

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 selection:bg-amber-200">
      {/* 1. Header Navbar */}
      <Navbar
        apiStatus={apiStatus}
        customCount={customAccommodations.length}
        onOpenAdmin={() => setShowAdminModal(true)}
        onOpenApiModal={() => setShowApiModal(true)}
      />

      {/* 2. Top Search Bar */}
      <TrailheadSearch
        onSearch={handleSearch}
        isLoading={isSearching}
        currentTrailheadName={trailhead?.name || '塔塔加登山口'}
      />

      {/* 3. API Missing or Configuration Alert Banner */}
      {!apiKey && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-3 text-amber-900 text-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>請設定 Google Maps API Key：</strong>{' '}
                本系統為真正呼叫 Google Maps、Places、Geocoding、Routes API。請於右上角輸入金鑰或配置環境變數。
              </span>
            </div>
            <button
              onClick={() => setShowApiModal(true)}
              className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded font-bold text-xs shrink-0"
            >
              輸入 API 金鑰
            </button>
          </div>
        </div>
      )}

      {/* Missing Specific Google API Banner */}
      {searchError && (
        <div className="bg-red-50 border-b border-red-300 px-4 py-3 text-red-900 text-xs">
          <div className="max-w-7xl mx-auto flex items-start space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-sm">搜尋遭遇錯誤或缺少 Google API：</span>
              <p>{searchError}</p>
              <div className="pt-1">
                <button
                  onClick={() => setShowApiModal(true)}
                  className="text-red-800 underline font-bold hover:text-red-950 inline-flex items-center space-x-1"
                >
                  <span>開啟 API 診斷面版檢查權限與啟用狀態</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time search progress indicator */}
      {isSearching && (
        <div className="bg-stone-900 text-amber-300 px-4 py-2 text-xs flex items-center justify-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span className="font-medium">{searchStep}</span>
        </div>
      )}

      {/* 4. Filter & Sorting Bar */}
      <FilterBar
        trailhead={trailhead}
        filters={filters}
        onFilterChange={setFilters}
        onResetFilters={() => setFilters(INITIAL_FILTERS)}
        totalCount={filteredAccommodations.length}
        googleCount={googleCount}
        customCount={customCount}
      />

      {/* 5. Main Content Split View (List + Google Map) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Accommodations List (5 cols on lg) */}
          <section className="lg:col-span-5 space-y-3.5 order-2 lg:order-1">
            <div className="flex items-center justify-between text-xs text-stone-600 px-1">
              <span className="font-bold text-stone-800">
                搜尋結果清單（共 {filteredAccommodations.length} 間）
              </span>
              <span>依 {filters.sortBy === 'driving_asc' ? '車程時間' : filters.sortBy === 'rating_desc' ? '評分' : '價格'} 排序</span>
            </div>

            {filteredAccommodations.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-500 space-y-2">
                <Compass className="w-8 h-8 mx-auto text-stone-400" />
                <div className="text-sm font-bold text-stone-800">
                  {isSearching ? '正在載入搜尋結果...' : '無符合篩選條件之住宿'}
                </div>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  {isSearching
                    ? '正在與 Google Maps 平台即時比對中...'
                    : '請嘗試放寬車程、價格或評分條件，或更換登山口名稱。'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAccommodations.map((acc) => (
                  <AccommodationCard
                    key={acc.id}
                    accommodation={acc}
                    isSelected={selectedAccommodation?.id === acc.id}
                    onSelect={(item) => setSelectedAccommodation(item)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Right Column: Google Maps (7 cols on lg, sticky on desktop) */}
          <section className="lg:col-span-7 order-1 lg:order-2 lg:sticky lg:top-20 h-[500px] sm:h-[600px] lg:h-[calc(100vh-130px)]">
            <GoogleMapView
              apiKey={apiKey}
              trailhead={trailhead}
              accommodations={filteredAccommodations}
              selectedAccommodation={selectedAccommodation}
              onSelectAccommodation={(acc) => setSelectedAccommodation(acc)}
            />
          </section>
        </div>

        {/* 6. Semantic SEO Content Section */}
        <section className="mt-16 pt-8 border-t border-stone-200 text-stone-600 text-xs leading-relaxed space-y-6">
          <div>
            <h2 className="text-base font-bold text-stone-800 mb-2">
              關於 D0 住宿搜尋系統：高山登山前夜宿與接駁住宿規劃
            </h2>
            <p>
              登山界所謂的「D0」，指的是在登山行程出發日前一晚（Day 0）預先抵達登山口附近的住宿點過夜休憩。充分的睡眠與適應高度有助於降低高山症風險，並讓隔日清晨能以最短車程即時出發。本系統專為台灣高山山友設計，輸入登山口名稱即可即時呼叫 Google Maps Platform 進行經緯度解析、周邊真實存在的飯店、民宿、背包客棧與露營區搜尋，並藉由 Google Routes API 取得精準實際駕車時間。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-1.5">
              <h3 className="font-bold text-stone-800 text-xs flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>Google Maps 即時搜尋</span>
              </h3>
              <p className="text-stone-500 text-[11px]">
                即時連線 Google Places (New) 搜尋登山口周圍營業中的合法旅宿、青年旅館與營地，杜絕過時與不存在的假資料。
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-1.5">
              <h3 className="font-bold text-stone-800 text-xs flex items-center space-x-1">
                <Car className="w-3.5 h-3.5 text-amber-600" />
                <span>Google Routes 真實車程</span>
              </h3>
              <p className="text-stone-500 text-[11px]">
                依據真實山區道路拓撲計算自駕行車時間與公里數，不採用直線距離或固定車速估算，如實反映蜿蜒山路所需時間。
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-1.5">
              <h3 className="font-bold text-stone-800 text-xs flex items-center space-x-1">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>自有住宿補充管理</span>
              </h3>
              <p className="text-stone-500 text-[11px]">
                針對 Google 地圖難以搜尋之深山山莊、林道接待所或私人合作營地，提供後台手動建置與啟用維護，前台明確標記自有來源。
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* 7. Modals */}
      <AdminModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        accommodations={customAccommodations}
        onRefresh={loadCustomAccommodations}
      />

      <ApiStatusModal
        isOpen={showApiModal}
        onClose={() => setShowApiModal(false)}
        status={apiStatus}
        onVerifyKey={verifyApiKey}
        isVerifying={isVerifyingKey}
        userEnteredKey={userEnteredKey}
        setUserEnteredKey={setUserEnteredKey}
      />
    </div>
  );
}
