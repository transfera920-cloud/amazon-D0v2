import React, { useState } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Power,
  Search,
  Database,
  MapPin,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Save,
  HelpCircle,
} from 'lucide-react';
import { Accommodation, CustomAccommodationInput } from '../types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  accommodations: Accommodation[];
  onRefresh: () => void;
}

const DEFAULT_FORM: CustomAccommodationInput = {
  name: '',
  type: '民宿',
  address: '',
  phone: '',
  lat: 23.47,
  lng: 120.88,
  price: null,
  rating: null,
  note: '',
  googleMapsUrl: '',
  placeId: '',
  enabled: true,
};

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  accommodations,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomAccommodationInput>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const filteredItems = accommodations.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.note.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(DEFAULT_FORM);
    setIsEditing(true);
    setMessage(null);
  };

  const handleOpenEdit = (item: Accommodation) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      type: item.type,
      address: item.address === '未提供地址' ? '' : item.address,
      phone: item.phone === '未提供' ? '' : item.phone,
      lat: item.location.lat,
      lng: item.location.lng,
      price: item.price,
      rating: item.rating,
      note: item.note || '',
      googleMapsUrl: item.googleMapsUrl || '',
      placeId: item.placeId || '',
      enabled: item.enabled !== false,
    });
    setIsEditing(true);
    setMessage(null);
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/accommodations/${id}/toggle`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`確定要刪除「${name}」嗎？此操作無法復原。`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/accommodations/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
        setMessage({ type: 'success', text: `已成功刪除「${name}」` });
      } else {
        setMessage({ type: 'error', text: data.error || '刪除失敗' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `刪除失敗: ${err.message}` });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: '請輸入住宿名稱' });
      return;
    }
    if (isNaN(formData.lat) || isNaN(formData.lng)) {
      setMessage({ type: 'error', text: '請填入正確的緯度與經度' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const url = editingId
        ? `/api/admin/accommodations/${editingId}`
        : '/api/admin/accommodations';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: editingId ? '住宿資料已成功更新' : '已成功新增自有住宿資料',
        });
        setIsEditing(false);
        setEditingId(null);
        onRefresh();
      } else {
        setMessage({ type: 'error', text: data.error || '儲存失敗' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `操作失敗: ${err.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper template for quick mountain lodging inputs
  const handleApplyPreset = (name: string, lat: number, lng: number, address: string, type: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      lat,
      lng,
      address,
      type,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-stone-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold">自有住宿資料庫管理 (Firestore / 手動 Key in)</h3>
              <p className="text-xs text-stone-400">
                補充 Google Maps 不易搜尋之偏遠山莊、接待所或私人合作宿點
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Alert on Separation of Google vs Manual Data */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-200/80 text-xs text-amber-900 flex items-start space-x-2">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">重要資料流規範：</span>
            Google 即時搜尋結果絕不會自動寫入此資料庫。此處純粹由管理員手動建置維護，前台搜尋時會一併比對並標示為「自有資料」。
          </div>
        </div>

        {/* Feedback message banner */}
        {message && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center space-x-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200'
                : 'bg-red-50 text-red-900 border-b border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Modal Body: Editor vs List View */}
        <div className="p-6 flex-1 overflow-y-auto">
          {isEditing ? (
            /* Form View */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <h4 className="font-bold text-stone-900 text-sm">
                  {editingId ? '編輯住宿資料' : '新增手動補充住宿'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-stone-500 hover:text-stone-800"
                >
                  返回清單
                </button>
              </div>

              {/* Quick Mountain Preset Chips */}
              {!editingId && (
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs space-y-1.5">
                  <span className="text-stone-500 font-medium">快速帶入經典高山前宿範例座標：</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('東埔山莊', 23.4883, 120.8872, '南投縣信義鄉同富村太平巷118號', '背包客棧')}
                      className="px-2 py-1 bg-white hover:bg-stone-100 rounded border border-stone-300 text-stone-700"
                    >
                      玉山口：東埔山莊
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('觀雲山莊', 24.1873, 121.3142, '花蓮縣秀林鄉富世村關原11號', '民宿')}
                      className="px-2 py-1 bg-white hover:bg-stone-100 rounded border border-stone-300 text-stone-700"
                    >
                      合歡/奇萊：觀雲山莊
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('向陽國家森林遊樂區營地', 23.1706, 120.9856, '台東縣海端鄉向陽山區', '露營區')}
                      className="px-2 py-1 bg-white hover:bg-stone-100 rounded border border-stone-300 text-stone-700"
                    >
                      嘉明湖：向陽營地
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* 1. Name */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    住宿名稱 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例：東埔山莊、某某高山民宿"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* 2. Type */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    住宿類型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    <option value="民宿">民宿</option>
                    <option value="背包客棧">背包客棧</option>
                    <option value="飯店">飯店</option>
                    <option value="露營區">露營區</option>
                    <option value="山莊/營地">山莊/營地</option>
                  </select>
                </div>

                {/* 3. Coordinates */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    緯度 (Latitude) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                    placeholder="例如: 23.4883"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    經度 (Longitude) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                    placeholder="例如: 120.8872"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>

                {/* 4. Address */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">地址</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="住宿完整地址"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* 5. Phone */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">聯絡電話</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="例：049-2702213"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* 6. Price */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    房價/床位價 (NT$, 留空為未提供)
                  </label>
                  <input
                    type="number"
                    value={formData.price ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: e.target.value ? parseInt(e.target.value, 10) : null,
                      })
                    }
                    placeholder="例：1200"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>

                {/* 7. Rating */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    評分 (1.0 ~ 5.0, 留空為未提供)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={formData.rating ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rating: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    placeholder="例：4.5"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>

                {/* 8. Google Maps URL */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Google Maps 網址</label>
                  <input
                    type="url"
                    value={formData.googleMapsUrl}
                    onChange={(e) => setFormData({ ...formData, googleMapsUrl: e.target.value })}
                    placeholder="https://maps.google.com/..."
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono text-[11px]"
                  />
                </div>

                {/* 9. Place ID */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Google Place ID (選填)</label>
                  <input
                    type="text"
                    value={formData.placeId}
                    onChange={(e) => setFormData({ ...formData, placeId: e.target.value })}
                    placeholder="Google 地方唯一識別碼"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* 10. Note */}
              <div className="text-xs">
                <label className="block font-semibold text-stone-700 mb-1">備註說明</label>
                <textarea
                  rows={3}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="備註資訊，例如：需自備睡袋、供晚餐與早早餐、接駁專案、電話預約方式..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* 11. Enabled Checkbox */}
              <div className="flex items-center space-x-2 pt-1 text-xs">
                <input
                  type="checkbox"
                  id="form-enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                />
                <label htmlFor="form-enabled" className="font-semibold text-stone-800">
                  啟用此住宿（在前台登山口周邊搜尋時參與比對與車程計算）
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-100 text-xs font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{submitting ? '儲存中...' : '儲存到自有資料庫'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* List View */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search in custom items */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜尋已建置之自有住宿..."
                    className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <button
                  id="admin-add-btn"
                  onClick={handleOpenAdd}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>新增住宿資料</span>
                </button>
              </div>

              {/* Items Table / Cards */}
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 bg-stone-50 rounded-xl border border-dashed border-stone-300 text-stone-500 space-y-2">
                  <Database className="w-8 h-8 mx-auto text-stone-400" />
                  <div className="text-sm font-bold text-stone-700">目前尚無手動 Key in 的住宿資料</div>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    Google Maps 是前台的主要即時搜尋來源。若有 Google Maps 搜尋不到的特殊山莊或私房民宿，請點擊上方「新增住宿資料」手動建立。
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.enabled !== false
                          ? 'bg-white border-stone-200 hover:border-stone-300'
                          : 'bg-stone-50/80 border-stone-200 opacity-60'
                      }`}
                    >
                      {/* Info */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-stone-900 text-sm truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] bg-stone-100 border border-stone-200 text-stone-700 px-1.5 py-0.2 rounded">
                            {item.type}
                          </span>
                          {item.enabled === false && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold">
                              已停用
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-3 text-xs text-stone-500 flex-wrap">
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-stone-400" />
                            <span className="font-mono text-[11px]">
                              {item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)}
                            </span>
                          </span>
                          <span>地址：{item.address}</span>
                          {item.price !== null && (
                            <span className="font-bold text-amber-900">
                              NT$ {item.price.toLocaleString()}
                            </span>
                          )}
                          {item.rating !== null && <span>評分：★ {item.rating}</span>}
                        </div>

                        {item.note && (
                          <div className="text-[11px] text-stone-500 line-clamp-1 italic">
                            備註：{item.note}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleToggle(item.id)}
                          title={item.enabled !== false ? '點擊停用' : '點擊啟用'}
                          className={`p-1.5 rounded-lg border text-xs flex items-center space-x-1 transition-colors ${
                            item.enabled !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-stone-100 text-stone-500 border-stone-300 hover:bg-stone-200'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{item.enabled !== false ? '啟用中' : '已停用'}</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 hover:text-stone-900"
                          title="編輯"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-800"
                          title="刪除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span>共 {accommodations.length} 筆手動管理住宿</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-medium transition-colors"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
