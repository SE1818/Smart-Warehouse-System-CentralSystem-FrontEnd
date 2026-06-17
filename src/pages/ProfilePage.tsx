import { useState, useEffect } from 'react';
import { profileService } from '../services/profile';
import type { Profile } from '../types/profile';
import { getFullName } from '../types/profile';

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  const fullName = profile ? getFullName(profile) : 'Chưa có tên';

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Hồ sơ của tôi</h1>

        {profile && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-6 mb-6">
              <div className="w-24 h-24 bg-brand-100 rounded-full flex items-center justify-center">
                <span className="text-4xl text-brand-600">
                  {fullName?.charAt(0) || profile.email?.charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{fullName}</h2>
                <p className="text-slate-600">{profile.email}</p>
                <p className="text-sm text-slate-500">ID: {profile.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Thông tin cá nhân</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Email</dt>
                    <dd className="text-slate-900">{profile.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Họ và tên</dt>
                    <dd className="text-slate-900">{fullName || 'Chưa cập nhật'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Số điện thoại</dt>
                    <dd className="text-slate-900">{profile.phoneNumber || 'Chưa cập nhật'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Địa chỉ</dt>
                    <dd className="text-slate-900">{profile.address || 'Chưa cập nhật'}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Thông tin tài khoản</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Vai trò</dt>
                    <dd className="text-slate-900">{profile.role}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Trạng thái</dt>
                    <dd className="text-slate-900">{profile.isActive ? 'Hoạt động' : 'Không hoạt động'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Ngày tạo</dt>
                    <dd className="text-slate-900">{new Date(profile.createdAt).toLocaleDateString('vi-VN')}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">Cập nhật lần cuối</dt>
                    <dd className="text-slate-900">
                      {profile.updatedAt ? new Date(profile.updatedAt).toLocaleDateString('vi-VN') : 'Chưa có'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
