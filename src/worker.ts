export interface Env {
  ASSETS: {
    fetch: (request: Request | string, init?: RequestInit) => Promise<Response>;
  };
  GOOGLE_MAPS_API_KEY?: string;
  VITE_GOOGLE_MAPS_API_KEY?: string;
  [key: string]: any;
}

// In-memory store for Cloudflare Workers runtime
let customAccommodations: any[] = [
  {
    id: 'custom_1789286317725_gwp7d',
    name: '東埔山莊',
    type: '背包客棧',
    address: '南投縣信義鄉同富村太平巷118號',
    phone: '049-2702213',
    location: {
      lat: 23.4883,
      lng: 120.8872,
    },
    price: 400,
    priceDisplay: 'NT$ 400',
    rating: 4.2,
    userRatingCount: null,
    note: '玉山登山口前夜住宿首選，需自備睡袋盥洗用品',
    googleMapsUrl: 'https://maps.app.goo.gl/tungpu',
    source: 'custom',
    enabled: true,
    createdAt: '2026-09-13T07:58:37.725Z',
    updatedAt: '2026-09-13T07:58:42.596Z',
  },
];

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Google-Maps-Api-Key',
    },
  });
}

function getApiKey(request: Request, env: Env): string {
  const headerKey = request.headers.get('x-google-maps-api-key');
  if (headerKey && headerKey.trim()) {
    return headerKey.trim();
  }
  const envKey = env.GOOGLE_MAPS_API_KEY || env.VITE_GOOGLE_MAPS_API_KEY || (typeof process !== 'undefined' ? (process.env?.GOOGLE_MAPS_API_KEY || process.env?.VITE_GOOGLE_MAPS_API_KEY) : '');
  return (envKey || '').trim();
}

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
  return {
    price: null,
    display: '未提供',
  };
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Google-Maps-Api-Key',
      },
    });
  }

  // 1. GET /api/config
  if (method === 'GET' && path === '/api/config') {
    const apiKey = getApiKey(request, env);
    return jsonResponse({
      hasApiKey: Boolean(apiKey),
      apiKey: apiKey || '',
    });
  }

  // 2. POST /api/maps/verify-key
  if (method === 'POST' && path === '/api/maps/verify-key') {
    const apiKey = getApiKey(request, env);
    if (!apiKey) {
      return jsonResponse({
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
      }, 400);
    }

    const maskedKey = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '****';
    const missingApis: string[] = [];

    // 1. Test Geocoding API
    let geocodingStatus = { ok: false, name: 'Geocoding API', status: '測試中', errorDetail: '' };
    try {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Taiwan&language=zh-TW&key=${encodeURIComponent(apiKey)}`;
      const geoRes = await fetch(geoUrl);
      const geoData: any = await geoRes.json();
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
      const placesData: any = await placesRes.json();
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
      const routesData: any = await routesRes.json();
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

    // 4. Maps JavaScript API
    const mapsJsStatus = {
      ok: geocodingStatus.ok || placesStatus.ok || routesStatus.ok,
      name: 'Maps JavaScript API',
      status: (geocodingStatus.ok || placesStatus.ok || routesStatus.ok) ? '已啟用 (金鑰有效)' : '需確認 API Key Referrer 設定',
      errorDetail: '',
    };

    const overallOk = missingApis.length === 0;

    return jsonResponse({
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
  }

  // 3. POST /api/maps/geocode-trailhead
  if (method === 'POST' && path === '/api/maps/geocode-trailhead') {
    const apiKey = getApiKey(request, env);
    if (!apiKey) {
      return jsonResponse({
        success: false,
        missingApi: 'Google Maps API Key',
        error: '尚未設定 Google Maps API 金鑰，請於環境變數或設定中提供。',
      }, 400);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // empty
    }

    const { query } = body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return jsonResponse({ success: false, error: '請輸入登山口名稱' }, 400);
    }

    const trimmedQuery = query.trim();

    try {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmedQuery)}&language=zh-TW&region=tw&key=${encodeURIComponent(apiKey)}`;
      const geoRes = await fetch(geoUrl);
      const geoData: any = await geoRes.json();

      if (geoData.status === 'REQUEST_DENIED') {
        return jsonResponse({
          success: false,
          missingApi: 'Geocoding API',
          error: `缺少 Geocoding API 或金鑰無權限: ${geoData.error_message || '請在 Google Cloud Console 啟用 Geocoding API'}`,
        }, 403);
      }

      if (geoData.status === 'OK' && geoData.results && geoData.results.length > 0) {
        const top = geoData.results[0];
        return jsonResponse({
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

      // Places fallback
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

      const placesData: any = await placesRes.json();
      if (placesData.error) {
        return jsonResponse({
          success: false,
          missingApi: 'Places API (New)',
          error: `缺少 Places API (New): ${placesData.error.message || '請啟用 Places API (New)'}`,
        }, 403);
      }

      if (placesData.places && placesData.places.length > 0) {
        const place = placesData.places[0];
        return jsonResponse({
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

      return jsonResponse({
        success: false,
        error: `在 Google Maps 上找不到「${trimmedQuery}」的位置。請確認登山口名稱是否正確（如：塔塔加登山口、武陵農場登山口、向陽登山口）。`,
      }, 404);
    } catch (err: any) {
      return jsonResponse({ success: false, error: `查詢登山口失敗: ${err.message}` }, 500);
    }
  }

  // 4. POST /api/maps/search-places
  if (method === 'POST' && path === '/api/maps/search-places') {
    const apiKey = getApiKey(request, env);
    if (!apiKey) {
      return jsonResponse({
        success: false,
        missingApi: 'Google Maps API Key',
        error: '尚未設定 Google Maps API 金鑰',
      }, 400);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // empty
    }

    const { lat, lng, radiusMeters = 30000 } = body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return jsonResponse({ success: false, error: '缺少座標參數' }, 400);
    }

    try {
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

      const placesData: any = await placesRes.json();
      if (placesData.error) {
        return jsonResponse({
          success: false,
          missingApi: 'Places API (New)',
          error: `缺少 Places API (New) 或存取受限: ${placesData.error.message || '請在 Google Cloud Console 啟用 Places API (New)'}`,
        }, 403);
      }

      const rawPlaces = placesData.places || [];

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
          const textData: any = await textRes.json();
          if (textData.places) {
            extraPlaces = textData.places;
          }
        } catch {
          // ignore
        }
      }

      const placeMap = new Map<string, any>();
      [...rawPlaces, ...extraPlaces].forEach((p: any) => {
        if (p.id && !placeMap.has(p.id) && p.location?.latitude && p.location?.longitude) {
          placeMap.set(p.id, p);
        }
      });

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

      return jsonResponse({
        success: true,
        accommodations,
      });
    } catch (err: any) {
      return jsonResponse({ success: false, error: `搜尋住宿失敗: ${err.message}` }, 500);
    }
  }

  // 5. POST /api/maps/compute-driving-times
  if (method === 'POST' && path === '/api/maps/compute-driving-times') {
    const apiKey = getApiKey(request, env);
    if (!apiKey) {
      return jsonResponse({
        success: false,
        missingApi: 'Google Maps API Key',
        error: '尚未設定 Google Maps API 金鑰',
      }, 400);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // empty
    }

    const { origin, destinations } = body;
    if (!origin?.lat || !origin?.lng || !Array.isArray(destinations) || destinations.length === 0) {
      return jsonResponse({ success: false, error: '缺少出發點或目的地' }, 400);
    }

    try {
      const batchDestinations = destinations.slice(0, 25);
      const routesUrl = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';
      const requestPayload = {
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
        destinations: batchDestinations.map((d: any) => ({
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
        body: JSON.stringify(requestPayload),
      });

      const matrixData: any = await routesRes.json();
      if (matrixData.error) {
        return jsonResponse({
          success: false,
          missingApi: 'Routes API',
          error: `缺少 Routes API 或存取受限: ${matrixData.error.message || '請在 Google Cloud Console 啟用 Routes API'}`,
        }, 403);
      }

      const resultsMap: Record<string, { durationSeconds: number | null; durationText: string; distanceMeters: number | null; distanceText: string }> = {};

      if (Array.isArray(matrixData)) {
        matrixData.forEach((item: any) => {
          const destIdx = item.destinationIndex;
          const targetDest = batchDestinations[destIdx];
          if (!targetDest) return;

          if (item.status?.code === 0 || item.status === 'OK' || item.duration) {
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
            resultsMap[targetDest.id] = {
              durationSeconds: null,
              durationText: '無法取得車程',
              distanceMeters: null,
              distanceText: '無法取得距離',
            };
          }
        });
      }

      batchDestinations.forEach((d: any) => {
        if (!resultsMap[d.id]) {
          resultsMap[d.id] = {
            durationSeconds: null,
            durationText: '無法取得車程',
            distanceMeters: null,
            distanceText: '無法取得距離',
          };
        }
      });

      return jsonResponse({
        success: true,
        routes: resultsMap,
      });
    } catch (err: any) {
      return jsonResponse({ success: false, error: `計算車程失敗: ${err.message}` }, 500);
    }
  }

  // 6. Admin Accommodations CRUD
  // GET /api/admin/accommodations
  if (method === 'GET' && path === '/api/admin/accommodations') {
    return jsonResponse({ success: true, accommodations: customAccommodations });
  }

  // GET /api/admin/accommodations/active
  if (method === 'GET' && path === '/api/admin/accommodations/active') {
    const active = customAccommodations.filter(item => item.enabled !== false);
    return jsonResponse({ success: true, accommodations: active });
  }

  // POST /api/admin/accommodations
  if (method === 'POST' && path === '/api/admin/accommodations') {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // empty
    }

    const { name, type, address, phone, lat, lng, price, rating, note, googleMapsUrl, placeId, enabled = true } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return jsonResponse({ success: false, error: '請輸入住宿名稱' }, 400);
    }
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      return jsonResponse({ success: false, error: '請輸入有效的緯度與經度數值' }, 400);
    }

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

    customAccommodations.unshift(newItem);
    return jsonResponse({ success: true, accommodation: newItem }, 201);
  }

  // PATCH /api/admin/accommodations/:id/toggle
  const toggleMatch = path.match(/^\/api\/admin\/accommodations\/([^\/]+)\/toggle$/);
  if (method === 'PATCH' && toggleMatch) {
    const id = toggleMatch[1];
    const index = customAccommodations.findIndex(item => item.id === id);
    if (index === -1) {
      return jsonResponse({ success: false, error: '找不到該住宿資料' }, 404);
    }
    customAccommodations[index].enabled = !customAccommodations[index].enabled;
    customAccommodations[index].updatedAt = new Date().toISOString();
    return jsonResponse({ success: true, accommodation: customAccommodations[index] });
  }

  // PUT /api/admin/accommodations/:id
  const putMatch = path.match(/^\/api\/admin\/accommodations\/([^\/]+)$/);
  if (method === 'PUT' && putMatch) {
    const id = putMatch[1];
    const index = customAccommodations.findIndex(item => item.id === id);
    if (index === -1) {
      return jsonResponse({ success: false, error: '找不到該住宿資料' }, 404);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // empty
    }

    const existing = customAccommodations[index];
    const { name, type, address, phone, lat, lng, price, rating, note, googleMapsUrl, placeId, enabled } = body;

    if (name && (!name.trim() || typeof name !== 'string')) {
      return jsonResponse({ success: false, error: '住宿名稱不能為空' }, 400);
    }

    const parsedLat = typeof lat === 'number' && !isNaN(lat) ? lat : existing.location.lat;
    const parsedLng = typeof lng === 'number' && !isNaN(lng) ? lng : existing.location.lng;
    const parsedPrice = typeof price === 'number' && !isNaN(price) ? price : (price === null ? null : existing.price);

    const updated = {
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

    customAccommodations[index] = updated;
    return jsonResponse({ success: true, accommodation: updated });
  }

  // DELETE /api/admin/accommodations/:id
  const deleteMatch = path.match(/^\/api\/admin\/accommodations\/([^\/]+)$/);
  if (method === 'DELETE' && deleteMatch) {
    const id = deleteMatch[1];
    const initialLen = customAccommodations.length;
    customAccommodations = customAccommodations.filter(item => item.id !== id);
    if (customAccommodations.length === initialLen) {
      return jsonResponse({ success: false, error: '找不到該住宿資料' }, 404);
    }
    return jsonResponse({ success: true, message: '住宿已成功刪除' });
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}

export default {
  async fetch(request: Request, env: Env, ctx?: any): Promise<Response> {
    const url = new URL(request.url);

    // If API request, handle with worker logic
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    // Otherwise, fetch static asset from env.ASSETS
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Assets binding not found', { status: 500 });
  },
};
