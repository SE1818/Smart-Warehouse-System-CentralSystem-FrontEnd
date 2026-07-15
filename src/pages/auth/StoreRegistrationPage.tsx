/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Icons } from '@/components/Icons';
import { storeService, robotService } from '@/services';
import type { Area, Station } from '../../types/robot';

export function StoreRegistrationPage() {
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [selectedStationId, setSelectedStationId] = useState('');
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState<string | null>(null);
const [uploadingImage, setUploadingImage] = useState(false);
const [imageUrl, setImageUrl] = useState<string>('');
  
  const [areas, setAreas] = useState<Area[]>([]);
  const [stations, setStations] = useState<Station[]>([]);

  
  const [loading, setLoading] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoadingLocations(true);
        const areasData = await robotService.getAreas();
        const stationsData = await robotService.getStations();
        
        setAreas(areasData);
        setStations(stationsData);

        if (areasData.length > 0) {
          setSelectedAreaId(areasData[0].id);
        }
      } catch (err) {
        console.error('Failed to load areas/stations from API, using fallback', err);
        toast.warning('Không thể kết nối dịch vụ vị trí, đang sử dụng dữ liệu dự phòng.');
        
        // Fallback data
        const fallbackAreas: Area[] = [
          { id: 'a3f5a019-9c54-47b2-bd72-4a0075d9e5b2', name: 'Khu vực chính (Mặc định)', level: 1 }
        ];
        const fallbackStations: Station[] = [
          { id: '11111111-1111-1111-1111-111111111111', name: 'ST01 (Trạm Dropoff A)', areaId: 'a3f5a019-9c54-47b2-bd72-4a0075d9e5b2', stationType: 'dropoff', xCoord: 0, yCoord: 0 },
          { id: '22222222-2222-2222-2222-222222222222', name: 'ST02 (Trạm Dropoff B)', areaId: 'a3f5a019-9c54-47b2-bd72-4a0075d9e5b2', stationType: 'dropoff', xCoord: 0, yCoord: 0 },
          { id: '33333333-3333-3333-3333-333333333333', name: 'ST03 (Trạm Dropoff C)', areaId: 'a3f5a019-9c54-47b2-bd72-4a0075d9e5b2', stationType: 'dropoff', xCoord: 0, yCoord: 0 },
          { id: '44444444-4444-4444-4444-444444444444', name: 'ST04 (Trạm Dropoff D)', areaId: 'a3f5a019-9c54-47b2-bd72-4a0075d9e5b2', stationType: 'dropoff', xCoord: 0, yCoord: 0 },
          { id: '55555555-5555-5555-5555-555555555555', name: 'ST05 (Trạm Pickup E)', areaId: 'a3f5a019-9c54-47b2-bd72-4a0075d9e5b2', stationType: 'pickup', xCoord: 0, yCoord: 0 }
        ];

        setAreas(fallbackAreas);
        setStations(fallbackStations);
        setSelectedAreaId(fallbackAreas[0].id);
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
  }, []);

  // Filter stations based on selected area
  const filteredStations = stations.filter(s => s.areaId === selectedAreaId);

  useEffect(() => {
    if (filteredStations.length > 0) {
      setSelectedStationId(filteredStations[0].id);
    } else {
      setSelectedStationId('');
    }
  }, [selectedAreaId, stations, filteredStations]);

const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setSelectedFile(file);
  setUploadingImage(true);
  try {
    const res = await storeService.uploadStoreImage(file);
    setImageUrl(res.imageUrl);
    setImagePreview(res.imageUrl);
    toast.success('Tải ảnh lên thành công!');
  } catch (err) {
    toast.error('Không thể tải ảnh lên. Vui lòng thử lại.');
    setSelectedFile(null);
    setImagePreview(null);
    setImageUrl('');
  } finally {
    setUploadingImage(false);
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  if (!storeName || !ownerName || !ownerEmail || !phoneNumber || !selectedAreaId || !selectedStationId || !imageUrl) {
      toast.error('Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }

    setLoading(true);
    try {
      const areaName = areas.find(a => a.id === selectedAreaId)?.name || 'Khu vực chính';
      const stationName = stations.find(s => s.id === selectedStationId)?.name || 'Trạm liên kết';

      const response = await storeService.registerStore({
        storeName,
        ownerName,
        ownerEmail,
        phoneNumber,
        areaId: selectedAreaId,
        areaName,
        stationId: selectedStationId,
        stationName,
  imageUrl,
      });

      toast.success(response.message || 'Đăng ký cửa hàng thành công! Đang chờ Admin xác nhận.');
      navigate('/login');
    } catch (err: unknown) {
      console.error(err);
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr.response?.data?.message || 'Không thể gửi yêu cầu đăng ký. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div>
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Icons.Truck className="w-6 h-6" />
            </div>
          </div>
          <h2 className="mt-4 text-center text-2xl font-black text-slate-800 tracking-tight">
            Đăng ký mở cửa hàng
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Trở thành đối tác kinh doanh của SmartWarehouse
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên cửa hàng</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-850"
                placeholder="Ví dụ: Cửa hàng Tiện Lợi 247"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên chủ sở hữu</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-850"
                placeholder="Ví dụ: Nguyễn Văn A"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email liên hệ</label>
              <input
                type="email"
                required
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-850"
                placeholder="chu_cua_hang@gmail.com"
              />
              <span className="text-[11px] text-brand-600 font-medium block mt-1">
                ⚠️ Lưu ý: Email này sẽ được dùng làm tài khoản đăng nhập sau khi được phê duyệt.
              </span>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Số điện thoại</label>
              <input
                type="text"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-850"
                placeholder="0987654321"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Khu vực</label>
                {loadingLocations ? (
                  <div className="h-10 bg-slate-100 animate-pulse rounded-xl" />
                ) : (
                  <select
                    value={selectedAreaId}
                    onChange={(e) => setSelectedAreaId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    {areas.map(area => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạm liên kết</label>
                {loadingLocations ? (
                  <div className="h-10 bg-slate-100 animate-pulse rounded-xl" />
                ) : (
                  <select
                    value={selectedStationId}
                    onChange={(e) => setSelectedStationId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    {filteredStations.map(station => (
                      <option key={station.id} value={station.id}>{station.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logo/Ảnh cửa hàng <span className="text-red-500">*</span></label>
        <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-all">
          <div className="text-center">
            {uploadingImage ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500">Đang tải ảnh lên...</span>
              </div>
            ) : imagePreview ? (
              <img src={imagePreview} alt="Preview" className="max-h-24 max-w-full rounded-lg object-contain mx-auto" />
            ) : (
              <>
                <svg className="mx-auto h-10 w-10 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="mt-1 text-xs text-slate-500">Nhấn để chọn ảnh từ máy tính</p>
                <p className="text-[10px] text-slate-400">JPG, PNG, WebP — tối đa 5MB</p>
              </>
            )}
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
        </label>
        {selectedFile && !imageUrl && <p className="text-[10px] text-red-400 mt-1">Vui lòng tải lên logo/ảnh cửa hàng</p>}
      </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || loadingLocations}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-brand-500/15 hover:shadow-brand-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Icons.Spinner className="w-4 h-4 text-white" />
                  <span>Đang xử lý đăng ký...</span>
                </>
              ) : (
                <span>Gửi yêu cầu đăng ký</span>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-slate-500 font-medium mt-4">
          Đã đăng ký rồi?{' '}
          <Link to="/login" className="text-brand-600 font-bold hover:text-brand-700 transition-colors">
            Quay lại Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
