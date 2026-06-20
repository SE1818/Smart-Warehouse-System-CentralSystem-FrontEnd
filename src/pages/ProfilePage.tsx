import { useState, useEffect, useCallback } from 'react';
import { profileService } from '../services/profile';
import type { Profile } from '../types/profile';
import { getFullName } from '../types/profile';
import { Icons } from '@/components/Icons';

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await profileService.getProfile();
      setProfile(profileData);
    } catch (err) {
      setError('Không thể tải thông tin hồ sơ');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProfile();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Icons.Spinner className="h-10 w-10 text-brand-600" />
        <p className="text-slate-505 text-xs font-semibold">Đang tải thông tin hồ sơ...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="p-6 bg-red-50 border border-red-200/60 rounded-2xl text-red-750 text-xs font-semibold leading-relaxed flex items-start gap-2.5 max-w-md w-full shadow-sm">
          <Icons.AlertWarning className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-red-800">Lỗi xảy ra</h4>
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadProfile}
              className="mt-3 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fullName = profile ? getFullName(profile) : 'Chưa có tên';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-slate-200/80 pb-6">
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.Profile className="w-8 h-8 text-brand-600" />
            <span>Hồ sơ cá nhân</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Xem và cập nhật thông tin cá nhân của tài khoản SmartWarehouse
          </p>
        </div>

        {profile && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 space-y-8">
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
              <div className="w-24 h-24 bg-gradient-to-br from-brand-100 to-brand-200 border border-brand-300 text-brand-800 rounded-3xl flex items-center justify-center font-heading font-black text-3xl shadow-sm transition-transform duration-200 hover:scale-105 select-none">
                {fullName?.charAt(0) || profile.email?.charAt(0)}
              </div>
              <div className="text-center sm:text-left space-y-1.5">
                <h2 className="text-2xl font-heading font-black text-slate-900">{fullName}</h2>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-slate-500 font-medium">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 border border-brand-100/40 text-brand-700 uppercase tracking-wider">
                    {profile.role}
                  </span>
                  <span>•</span>
                  <span>{profile.email}</span>
                </div>
                <p className="text-[10px] font-mono text-slate-400">ID: {profile.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
              <div className="space-y-4">
                <h3 className="text-base font-heading font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Icons.Profile className="w-5 h-5 text-brand-600" />
                  <span>Thông tin cá nhân</span>
                </h3>
                <dl className="grid grid-cols-3 gap-y-3 gap-x-2 text-sm leading-relaxed">
                  <dt className="font-bold text-slate-400 text-xs uppercase tracking-wider col-span-1 py-1">Email</dt>
                  <dd className="text-slate-800 font-semibold col-span-2 py-1 truncate">{profile.email}</dd>

                  <dt className="font-bold text-slate-400 text-xs uppercase tracking-wider col-span-1 py-1">Họ và tên</dt>
                  <dd className="text-slate-800 font-semibold col-span-2 py-1">{fullName || 'Chưa cập nhật'}</dd>

                  <dt className="font-bold text-slate-400 text-xs uppercase tracking-wider col-span-1 py-1">Điện thoại</dt>
                  <dd className="text-slate-800 font-semibold col-span-2 py-1">{profile.phoneNumber || 'Chưa cập nhật'}</dd>

                  <dt className="font-bold text-slate-400 text-xs uppercase tracking-wider col-span-1 py-1">Địa chỉ</dt>
                  <dd className="text-slate-800 font-semibold col-span-2 py-1">{profile.address || 'Chưa cập nhật'}</dd>
                </dl>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-heading font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Icons.AdjustmentSettings className="w-5 h-5 text-brand-600" />
                  <span>Thông tin hệ thống</span>
                </h3>
                <dl className="grid grid-cols-3 gap-y-3 gap-x-2 text-sm leading-relaxed">
                  <dt className="font-bold text-slate-400 text-xs uppercase tracking-wider col-span-1 py-1">Vai trò</dt>
                  <dd className="col-span-2 py-1">
                    <span className="font-bold text-slate-800">{profile.role}</span>
                  </dd>

                  <dt className="font-bold text-slate-400 text-xs uppercase tracking-wider col-span-1 py-1">Trạng thái</dt>
                  <dd className="col-span-2 py-1 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${profile.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    <span className="text-slate-800 font-bold">{profile.isActive ? 'Đang hoạt động' : 'Khóa'}</span>
                  </dd>

                  <dt className="font-bold text-slate-400 text-xs uppercase tracking-wider col-span-1 py-1">Ngày tạo</dt>
                  <dd className="text-slate-800 font-semibold col-span-2 py-1">{new Date(profile.createdAt).toLocaleDateString('vi-VN')}</dd>

                  <dt className="font-bold text-slate-400 text-xs uppercase tracking-wider col-span-1 py-1">Cập nhật</dt>
                  <dd className="text-slate-800 font-semibold col-span-2 py-1">
                    {profile.updatedAt ? new Date(profile.updatedAt).toLocaleDateString('vi-VN') : 'Chưa có'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
