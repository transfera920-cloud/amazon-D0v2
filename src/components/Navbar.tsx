import React from 'react';
import { Mountain, Database, KeyRound, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ApiVerificationResult } from '../types';

interface NavbarProps {
  apiStatus: ApiVerificationResult | null;
  customCount: number;
  onOpenAdmin: () => void;
  onOpenApiModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  apiStatus,
  customCount,
  onOpenAdmin,
  onOpenApiModal,
}) => {
  return (
    <header className="bg-stone-900 text-stone-100 border-b border-stone-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Mountain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-white">D0 住宿搜尋系統</span>
              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-medium">
                Google Maps 真實連線
              </span>
            </div>
            <p className="text-xs text-stone-400 hidden sm:block">
              登山口前夜住宿．Google Places 即時查詢．Routes 真實車程計算
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* API Status Button */}
          <button
            id="api-status-btn"
            onClick={onOpenApiModal}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              apiStatus?.overallOk
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60'
                : 'bg-amber-950/60 text-amber-300 border-amber-800/80 hover:bg-amber-900/60'
            }`}
          >
            {apiStatus?.overallOk ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse" />
            )}
            <span className="hidden md:inline">
              {apiStatus?.overallOk ? 'Google API 已就緒' : 'API 金鑰檢測'}
            </span>
            <span className="md:hidden">API</span>
          </button>

          {/* Admin Custom Accommodations Button */}
          <button
            id="admin-open-btn"
            onClick={onOpenAdmin}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors shadow-sm"
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>自有資料管理</span>
            {customCount > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {customCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
