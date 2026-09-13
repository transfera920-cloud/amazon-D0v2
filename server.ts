import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Persistent storage file for manual accommodations (Firestore / 自有資料庫)
const DATA_DIR = path.join(process.cwd(), 'data');
const CUSTOM_DATA_FILE = path.join(DATA_DIR, 'custom_accommodations.json');

function ensureDataStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CUSTOM_DATA_FILE)) {
    // Initial empty array for custom accommodations
    fs.writeFileSync(CUSTOM_DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

ensureDataStorage();

function readCustomAccommodations(): any[] {
  try {
    ensureDataStorage();
    const data = fs.readFileSync(CUSTOM_DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read custom accommodations file:', err);
    return [];
  }
}

function writeCustomAccommodations(items: any[]): void {
  ensureDataStorage();
  fs.writeFileSync(CUSTOM_DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

// Helper to resolve Google Maps API Key
function getApiKey(req: express.Request): string {
  const headerKey = req.headers['x-google-maps-api-key'] as string;
  if (headerKey && headerKey.trim()) {
    return headerKey.trim();
  }
  const envKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';
  return envKey.trim();
}

// ==========================================
// 1. Config & API Key Verification
// ==========================================

app.get('/api/config', (req, res) => {
  const apiKey = getApiKey(req);
  res.json({
    hasApiKey: Boolean(apiKey),
    apiKey: apiKey ? apiKey : '',
  });
});

app.post('/api/maps/verify-key', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(400).json({
      hasKey: false,
      keyMasked: '',
      overallOk: false,
      missingApis: ['Google Maps API Key 未設定'],
      apis: {
        geocoding: { ok: false, name: 'Geocoding API', status: '未設定金鑰' },
        places: { ok: false, name: 'Places API (New)', status: '未設定金鑰' },
        routes: { ok: false, name: 'Routes API', status: '未設定金鑰' },
        mapsJs: { ok: false, name: 'Maps JavaScript API', status: '未設定金鑰' },
      },
    });
  }

  const maskedKey = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '****';
  const missingApis: string[] = [];

  // 1. Test Geocoding API
  let geocodingStatus = { ok: false, name: 'Geocoding API', status: '測試中', errorDetail: '' };
  try {
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Taiwan&language=zh-TW&key=${encodeURIComponent(apiKey)}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();
    if (geoData.status === 'OK' || geoData.status === 'ZERO_RESULTS') {
      geocodingStatus = { ok: true, name: 'Geocoding API', status: '已啟用 (正常)', errorDetail: '' };
    } else {
      const err = geoData.error_message || geoData.status || '呼叫失敗';
      geocodingStatus = { ok: false, name: 'Geocoding API', status: `失敗: ${geoData.status}`, errorDetail: err };
      missingApis.push(`Geocoding API (${err})`);
    }
  } catch (e: any) {
    geocodingStatus = { ok: false, name: 'Geocoding API', status: '連線錯誤', errorDetail: e.message };
    missingApis.push('Geocoding API');
  }

  // 2. Test Places API (New)
  let placesStatus = { ok: false, name: 'Places API (New)', status: '測試中', errorDetail: '' };
  try {
    const placesRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName',
      },
      body: JSON.stringify({
        textQuery: '玉山',
        pageSize: 1,
      }),
    });
    const placesData = await placesRes.json();
    if (placesRes.ok && !placesData.error) {
      placesStatus = { ok: true, name: 'Places API (New)', status: '已啟用 (正常)', errorDetail: '' };
    } else {
      const err = placesData.error?.message || `HTTP ${placesRes.status}`;
      placesStatus = { ok: false, name: 'Places API (New)', status: '未啟用或無權限', errorDetail: err };
      missingApis.push(`Places API (New): ${err}`);
    }
  } catch (e: any) {
    placesStatus = { ok: false, name: 'Places API (New)', status: '連線錯誤', errorDetail: e.message };
    missingApis.push('Places API (New)');
  }

  // 3. Test Routes API
  let routesStatus = { ok: false, name: 'Routes API', status: '測試中', errorDetail: '' };
  try {
    const routesRes = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'originIndex,destinationIndex,status,duration,distanceMeters',
      },
      body: JSON.stringify({
        origins: [{ waypoint: { location: { latLng: { latitude: 23.47, longitude: 120.88 } } } }],
        destinations: [{ waypoint: { location: { latLng: { latitude: 23.51, longitude: 120.92 } } } }],
        travelMode: 'DRIVE',
      }),
    });
    const routesData = await routesRes.json();
    if (routesRes.ok && Array.isArray(routesData)) {
      routesStatus = { ok: true, name: 'Routes API', status: '已啟用 (正常)', errorDetail: '' };
    } else {
      const err = routesData.error?.message || `HTTP ${routesRes.status}`;
      routesStatus = { ok: false, name: 'Routes API', status: '未啟用或無權限', errorDetail: err };
      missingApis.push(`Routes API: ${err}`);
    }
  } catch (e: any) {
    routesStatus = { ok: false, name: 'Routes API', status: '連線錯誤', errorDetail: e.message };
    missingApis.push('Routes API');
  }

  // 4. Maps JavaScript API (assumes key valid for web)
  const mapsJsStatus = {
    ok: geocodingStatus.ok || placesStatus.ok || routesStatus.ok,
    name: 'Maps JavaScript API',
    status: (geocodingStatus.ok || placesStatus.ok || routesStatus.ok) ? '已啟用 (金鑰有效)' : '需確認 API Key Referrer 設定',
    errorDetail: '',
  };

  const overallOk = missingApis.length === 0;

  res.json({
    hasKey: true,
    keyMasked: maskedKey,
    overallOk,
    missingApis,
    apis: {
      geocoding: geocodingStatus,
      places: placesStatus,
      routes: routesStatus,
      mapsJs: mapsJsStatus,
    },
  });
});

// ==========================================
// 2. Geocoding / Trailhead Resolution
// ==========================================

app.post('/api/maps/geocode-trailhead', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(400).json({
      success: false,
      missingApi: 'Google Maps API Key',
      error: '尚未設定 Google Maps API 金鑰，請於環境變數或設定中提供。',
    });
  }

  const { query } = req.body;
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: '請輸入登山口名稱' });
  }

  const trimmedQuery = query.trim();

  try {
    // 1. First try Geocoding API
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmedQuery)}&language=zh-TW&region=tw&key=${encodeURIComponent(apiKey)}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (geoData.status === 'REQUEST_DENIED') {
      return res.status(403).json({
        success: false,
        missingApi: 'Geocoding API',
        error: `缺少 Geocoding API 或金鑰無權限: ${geoData.error_message || '請在 Google Cloud Console 啟用 Geocoding API'}`,
      });
    }

    if (geoData.status === 'OK' && geoData.results && geoData.results.length > 0) {
      const top = geoData.results[0];
      return res.json({
        success: true,
        trailhead: {
          query: trimmedQuery,
          name: top.formatted_address.split(',')[0] || trimmedQuery,
          formattedAddress: top.formatted_address,
          location: {
            lat: top.geometry.location.lat,
            lng: top.geometry.location.lng,
          },
          placeId: top.place_id,
        },
      });
    }

    // 2. If Geocoding returned ZERO_RESULTS, try Places API (New) Text Search
    const placesRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
      },
      body: JSON.stringify({
        textQuery: trimmedQuery,
        languageCode: 'zh-TW',
        regionCode: 'tw',
        pageSize: 1,
      }),
    });

    const placesData = await placesRes.json();

    if (placesData.error) {
      return res.status(403).json({
        success: false,
        missingApi: 'Places API (New)',
        error: `缺少 Places API (New): ${placesData.error.message || '請啟用 Places API (New)'}`,
      });
    }

    if (placesData.places && placesData.places.length > 0) {
      const place = placesData.places[0];
      return res.json({
        success: true,
        trailhead: {
          query: trimmedQuery,
          name: place.displayName?.text || trimmedQuery,
          formattedAddress: place.formattedAddress || trimmedQuery,
          location: {
            lat: place.location.latitude,
            lng: place.location.longitude,
          },
          placeId: place.id,
        },
      });
    }

    return res.status(404).json({
      success: false,
      error: `在 Google Maps 上找不到「${trimmedQuery}」的位置。請確認登山口名稱是否正確（如：塔塔加登山口、武陵農場登山口、向陽登山口）。`,
    });
  } catch (err: any) {
    console.error('Error in geocode-trailhead:', err);
    return res.status(500).json({ success: false, error: `查詢登山口失敗: ${err.message}` });
  }
});

// ==========================================
// 3. Places API (New) Accommodations Search
// ==========================================

function mapPlaceType(primaryType: string | undefined, types: string[] = []): string {
  const allTypes = [primaryType, ...types].filter(Boolean).map(t => String(t).toLowerCase());
  if (allTypes.some(t => t.includes('camp') || t.includes('campground'))) {
    return '露營區';
  }
  if (allTypes.some(t => t.includes('hostel') || t.includes('backpack'))) {
    return '背包客棧';
  }
  if (allTypes.some(t => t.includes('bed_and_breakfast') || t.includes('guest_house') || t.includes('inn') || t.includes('homestay'))) {
    return '民宿';
  }
  if (allTypes.some(t => t.includes('hotel') || t.includes('resort') || t.includes('motel'))) {
    return '飯店';
  }
  return '民宿';
}

function mapPriceLevel(priceLevel: string | undefined): { price: number | null; display: string } {
  // Google Places price levels: PRICE_LEVEL_INEXPENSIVE, MODERATE, EXPENSIVE, VERY_EXPENSIVE
  // The user rule strictly specifies:
  // "Google 沒有價格：顯示『未提供』。禁止自行補數字。"
  // Therefore, since Places API does not give an exact room rate amount, price number must be null
  // and display strictly as "未提供"
  return {
    price: null,
    display: '未提供',
  };
}

app.post('/api/maps/search-places', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(400).json({
      success: false,
      missingApi: 'Google Maps API Key',
      error: '尚未設定 Google Maps API 金鑰',
    });
  }

  const { lat, lng, radiusMeters = 30000 } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ success: false, error: '缺少座標參數' });
  }

  try {
    // Call Google Places API (New) searchNearby
    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.location',
      'places.rating',
      'places.userRatingCount',
      'places.priceLevel',
      'places.primaryType',
      'places.types',
      'places.googleMapsUri',
      'places.nationalPhoneNumber',
    ].join(',');

    const searchUrl = 'https://places.googleapis.com/v1/places:searchNearby';
    const requestBody = {
      includedPrimaryTypes: [
        'lodging',
        'hotel',
        'bed_and_breakfast',
        'guest_house',
        'campground',
        'hostel',
        'motel',
      ],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusMeters,
        },
      },
    };

    const placesRes = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(requestBody),
    });

    const placesData = await placesRes.json();

    if (placesData.error) {
      return res.status(403).json({
        success: false,
        missingApi: 'Places API (New)',
        error: `缺少 Places API (New) 或存取受限: ${placesData.error.message || '請在 Google Cloud Console 啟用 Places API (New)'}`,
      });
    }

    const rawPlaces = placesData.places || [];

    // Also do a complementary text search if nearby places count is low (common for remote mountain trailheads)
    let extraPlaces: any[] = [];
    if (rawPlaces.length < 15) {
      try {
        const textRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': fieldMask,
          },
          body: JSON.stringify({
            textQuery: '住宿 民宿 飯店 背包客棧 露營區 山莊',
            languageCode: 'zh-TW',
            locationBias: {
              circle: {
                center: { latitude: lat, longitude: lng },
                radius: radiusMeters,
              },
            },
            pageSize: 15,
          }),
        });
        const textData = await textRes.json();
        if (textData.places) {
          extraPlaces = textData.places;
        }
      } catch (err) {
        console.warn('Complementary text search error:', err);
      }
    }

    // Merge and deduplicate by place id
    const placeMap = new Map<string, any>();
    [...rawPlaces, ...extraPlaces].forEach((p: any) => {
      if (p.id && !placeMap.has(p.id) && p.location?.latitude && p.location?.longitude) {
        placeMap.set(p.id, p);
      }
    });

    // Map each Google place strictly adhering to the user's requirements:
    // "Google 沒有價格：顯示『未提供』
    // 沒有評分：顯示『未提供』
    // 沒有評論數：顯示『未提供』
    // 沒有車程：顯示『無法取得車程』
    // 禁止自行補數字。"
    const accommodations = Array.from(placeMap.values()).map((p: any) => {
      const priceInfo = mapPriceLevel(p.priceLevel);
      return {
        id: `g_${p.id}`,
        placeId: p.id,
        name: p.displayName?.text || '未命名住宿',
        type: mapPlaceType(p.primaryType, p.types),
        address: p.formattedAddress || '未提供地址',
        phone: p.nationalPhoneNumber || '未提供',
        location: {
          lat: p.location.latitude,
          lng: p.location.longitude,
        },
        price: priceInfo.price,
        priceDisplay: priceInfo.display,
        rating: typeof p.rating === 'number' ? p.rating : null,
        userRatingCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
        note: '',
        googleMapsUrl: p.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${p.id}`,
        source: 'google' as const,
        drivingDurationSeconds: null,
        drivingDurationText: '計算中...',
        drivingDistanceMeters: null,
        drivingDistanceText: '計算中...',
      };
    });

    return res.json({
      success: true,
      accommodations,
    });
  } catch (err: any) {
    console.error('Error in search-places:', err);
    return res.status(500).json({ success: false, error: `搜尋住宿失敗: ${err.message}` });
  }
});

// ==========================================
// 4. Routes API Real Driving Distance & Time
// ==========================================

app.post('/api/maps/compute-driving-times', async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(400).json({
      success: false,
      missingApi: 'Google Maps API Key',
      error: '尚未設定 Google Maps API 金鑰',
    });
  }

  const { origin, destinations } = req.body;
  if (!origin?.lat || !origin?.lng || !Array.isArray(destinations) || destinations.length === 0) {
    return res.status(400).json({ success: false, error: '缺少出發點或目的地' });
  }

  try {
    // Limit to max 25 destinations per matrix request to avoid API quota saturation
    const batchDestinations = destinations.slice(0, 25);

    const routesUrl = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';
    const body = {
      origins: [
        {
          waypoint: {
            location: {
              latLng: {
                latitude: origin.lat,
                longitude: origin.lng,
              },
            },
          },
        },
      ],
      destinations: batchDestinations.map(d => ({
        waypoint: {
          location: {
            latLng: {
              latitude: d.lat,
              longitude: d.lng,
            },
          },
        },
      })),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    };

    const routesRes = await fetch(routesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'originIndex,destinationIndex,status,condition,duration,distanceMeters',
      },
      body: JSON.stringify(body),
    });

    const matrixData = await routesRes.json();

    if (matrixData.error) {
      return res.status(403).json({
        success: false,
        missingApi: 'Routes API',
        error: `缺少 Routes API 或存取受限: ${matrixData.error.message || '請在 Google Cloud Console 啟用 Routes API'}`,
      });
    }

    // Results is an array of matrix elements
    const resultsMap: Record<string, { durationSeconds: number | null; durationText: string; distanceMeters: number | null; distanceText: string }> = {};

    if (Array.isArray(matrixData)) {
      matrixData.forEach((item: any) => {
        const destIdx = item.destinationIndex;
        const targetDest = batchDestinations[destIdx];
        if (!targetDest) return;

        // Check if duration returned
        if (item.status?.code === 0 || item.status === 'OK' || item.duration) {
          // item.duration is a string like "2415s"
          let sec: number | null = null;
          if (item.duration) {
            const parsed = parseInt(item.duration.replace('s', ''), 10);
            if (!isNaN(parsed)) sec = parsed;
          }

          const dist = typeof item.distanceMeters === 'number' ? item.distanceMeters : null;

          let durText = '無法取得車程';
          if (sec !== null) {
            const minutes = Math.round(sec / 60);
            if (minutes < 60) {
              durText = `${minutes} 分鐘`;
            } else {
              const hrs = Math.floor(minutes / 60);
              const remainingMin = minutes % 60;
              durText = remainingMin > 0 ? `${hrs} 小時 ${remainingMin} 分鐘` : `${hrs} 小時`;
            }
          }

          let distText = '無法取得距離';
          if (dist !== null) {
            const km = (dist / 1000).toFixed(1);
            distText = `${km} 公里`;
          }

          resultsMap[targetDest.id] = {
            durationSeconds: sec,
            durationText: durText,
            distanceMeters: dist,
            distanceText: distText,
          };
        } else {
          // Missing or route not found -> strictly follow user rule:
          // "如果 Google 無法取得：顯示『無法取得車程』。不要猜。"
          resultsMap[targetDest.id] = {
            durationSeconds: null,
            durationText: '無法取得車程',
            distanceMeters: null,
            distanceText: '無法取得距離',
          };
        }
      });
    }

    // Ensure all requested destinations have a response
    batchDestinations.forEach(d => {
      if (!resultsMap[d.id]) {
        resultsMap[d.id] = {
          durationSeconds: null,
          durationText: '無法取得車程',
          distanceMeters: null,
          distanceText: '無法取得距離',
        };
      }
    });

    return res.json({
      success: true,
      routes: resultsMap,
    });
  } catch (err: any) {
    console.error('Error in compute-driving-times:', err);
    return res.status(500).json({ success: false, error: `計算車程失敗: ${err.message}` });
  }
});

// ==========================================
// 5. Admin / Firestore 自有資料管理 (CRUD)
// ==========================================

// Get all custom accommodations
app.get('/api/admin/accommodations', (req, res) => {
  const items = readCustomAccommodations();
  res.json({ success: true, accommodations: items });
});

// Get only enabled custom accommodations for search merge
app.get('/api/admin/accommodations/active', (req, res) => {
  const items = readCustomAccommodations();
  const active = items.filter(item => item.enabled !== false);
  res.json({ success: true, accommodations: active });
});

// Create new custom accommodation
app.post('/api/admin/accommodations', (req, res) => {
  const {
    name,
    type,
    address,
    phone,
    lat,
    lng,
    price,
    rating,
    note,
    googleMapsUrl,
    placeId,
    enabled = true,
  } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: '請輸入住宿名稱' });
  }
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ success: false, error: '請輸入有效的緯度與經度數值' });
  }

  const items = readCustomAccommodations();
  const now = new Date().toISOString();

  const newItem = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    type: type || '民宿',
    address: address ? address.trim() : '未提供地址',
    phone: phone ? phone.trim() : '未提供',
    location: { lat, lng },
    price: typeof price === 'number' && !isNaN(price) ? price : null,
    priceDisplay: typeof price === 'number' && !isNaN(price) ? `NT$ ${price.toLocaleString()}` : '未提供',
    rating: typeof rating === 'number' && !isNaN(rating) ? rating : null,
    userRatingCount: null,
    note: note ? note.trim() : '',
    googleMapsUrl: googleMapsUrl ? googleMapsUrl.trim() : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    placeId: placeId ? placeId.trim() : undefined,
    source: 'custom',
    enabled: enabled !== false,
    createdAt: now,
    updatedAt: now,
  };

  items.unshift(newItem);
  writeCustomAccommodations(items);

  res.status(201).json({ success: true, accommodation: newItem });
});

// Update custom accommodation
app.put('/api/admin/accommodations/:id', (req, res) => {
  const { id } = req.params;
  const items = readCustomAccommodations();
  const index = items.findIndex(item => item.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: '找不到該住宿資料' });
  }

  const existing = items[index];
  const {
    name,
    type,
    address,
    phone,
    lat,
    lng,
    price,
    rating,
    note,
    googleMapsUrl,
    placeId,
    enabled,
  } = req.body;

  if (name && (!name.trim() || typeof name !== 'string')) {
    return res.status(400).json({ success: false, error: '住宿名稱不能為空' });
  }

  const parsedLat = typeof lat === 'number' && !isNaN(lat) ? lat : existing.location.lat;
  const parsedLng = typeof lng === 'number' && !isNaN(lng) ? lng : existing.location.lng;

  const parsedPrice = typeof price === 'number' && !isNaN(price) ? price : (price === null ? null : existing.price);

  const updatedItem = {
    ...existing,
    name: name ? name.trim() : existing.name,
    type: type !== undefined ? type : existing.type,
    address: address !== undefined ? (address.trim() || '未提供地址') : existing.address,
    phone: phone !== undefined ? (phone.trim() || '未提供') : existing.phone,
    location: { lat: parsedLat, lng: parsedLng },
    price: parsedPrice,
    priceDisplay: parsedPrice !== null ? `NT$ ${parsedPrice.toLocaleString()}` : '未提供',
    rating: typeof rating === 'number' && !isNaN(rating) ? rating : (rating === null ? null : existing.rating),
    note: note !== undefined ? note.trim() : existing.note,
    googleMapsUrl: googleMapsUrl !== undefined ? googleMapsUrl.trim() : existing.googleMapsUrl,
    placeId: placeId !== undefined ? placeId.trim() : existing.placeId,
    enabled: enabled !== undefined ? Boolean(enabled) : existing.enabled,
    updatedAt: new Date().toISOString(),
  };

  items[index] = updatedItem;
  writeCustomAccommodations(items);

  res.json({ success: true, accommodation: updatedItem });
});

// Toggle enabled status
app.patch('/api/admin/accommodations/:id/toggle', (req, res) => {
  const { id } = req.params;
  const items = readCustomAccommodations();
  const index = items.findIndex(item => item.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: '找不到該住宿資料' });
  }

  items[index].enabled = !items[index].enabled;
  items[index].updatedAt = new Date().toISOString();
  writeCustomAccommodations(items);

  res.json({ success: true, accommodation: items[index] });
});

// Delete custom accommodation
app.delete('/api/admin/accommodations/:id', (req, res) => {
  const { id } = req.params;
  let items = readCustomAccommodations();
  const initialLength = items.length;
  items = items.filter(item => item.id !== id);

  if (items.length === initialLength) {
    return res.status(404).json({ success: false, error: '找不到該住宿資料' });
  }

  writeCustomAccommodations(items);
  res.json({ success: true, message: '住宿已成功刪除' });
});

// ==========================================
// 6. Vite / Static Setup
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`D0 住宿搜尋系統伺服器已啟動: http://0.0.0.0:${PORT}`);
  });
}

startServer();
