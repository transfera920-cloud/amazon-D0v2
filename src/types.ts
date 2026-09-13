export type AccommodationType = '民宿' | '背包客棧' | '飯店' | '露營區' | '其他';

export type AccommodationSource = 'google' | 'custom';

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface TrailheadResult {
  query: string;
  name: string;
  formattedAddress: string;
  location: LocationCoordinates;
  placeId?: string;
}

export interface Accommodation {
  id: string;
  name: string;
  type: AccommodationType | string;
  address: string;
  phone: string; // "未提供" or actual string
  location: LocationCoordinates;
  price: number | null; // null if not provided
  priceDisplay: string; // e.g. "NT$ 2,500" or "未提供"
  rating: number | null; // null if not provided
  userRatingCount: number | null; // null if not provided
  note: string;
  googleMapsUrl: string;
  placeId?: string;
  source: AccommodationSource; // 'google' | 'custom'
  enabled?: boolean; // For manual data
  drivingDurationSeconds?: number | null; // from Routes API
  drivingDurationText: string; // e.g. "45 分鐘" or "無法取得車程"
  drivingDistanceMeters?: number | null;
  drivingDistanceText: string; // e.g. "28.5 公里" or "無法取得距離"
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomAccommodationInput {
  name: string;
  type: AccommodationType | string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  price: number | null;
  rating: number | null;
  note: string;
  googleMapsUrl: string;
  placeId?: string;
  enabled: boolean;
}

export interface FilterCriteria {
  maxDrivingMinutes: number | null; // 30, 60, 90, 120 or null (unlimited)
  priceRange: string; // 'all', 'under1000', '1000-1500', '1500-2000', '2000-2500', '2500-3000', '3000-3500', '3500-4000', 'above4000'
  minRating: number | null; // 3.5, 4.0, 4.5, null
  type: string; // 'all', '民宿', '背包客棧', '飯店', '露營區'
  sortBy: 'driving_asc' | 'rating_desc' | 'price_asc';
}

export interface ApiStatusCheck {
  ok: boolean;
  name: string;
  status: string;
  errorDetail?: string;
}

export interface ApiVerificationResult {
  hasKey: boolean;
  keyMasked: string;
  overallOk: boolean;
  apis: {
    geocoding: ApiStatusCheck;
    places: ApiStatusCheck;
    routes: ApiStatusCheck;
    mapsJs: ApiStatusCheck;
  };
  missingApis: string[];
}
