import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Wrench, Store, UtensilsCrossed, ChevronDown, Check, Sparkles } from 'lucide-react';

export type UserRoleType = 'technical' | 'staff' | 'admin';

interface RoleOption {
  id: UserRoleType;
  title: string;
  badge: string;
  path: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  bgColor: string;
  borderColor: string;
}

const ROLES: RoleOption[] = [
  {
    id: 'technical',
    title: 'Kỹ Sư Kỹ Thuật (Technical)',
    badge: 'Fleet Ops',
    path: '/technical',
    description: 'Bản đồ 2D LiDAR, telemetry & điều phối toàn bộ đội AMR',
    icon: Wrench,
    accentColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'staff',
    title: 'Nhân Viên KDS (Staff)',
    badge: 'Phục Vụ Bàn',
    path: '/staff',
    description: 'Sơ đồ bàn, khay 3 tầng & Tự động chọn Robot giao món',
    icon: UtensilsCrossed,
    accentColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    id: 'admin',
    title: 'Quản Trị Kho (Admin)',
    badge: 'Warehouse WMS',
    path: '/admin/dashboard',
    description: 'Quản lý kho hàng, tồn kho, xuất nhập và báo cáo kinh doanh',
    icon: Store,
    accentColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
];

export const RoleSwitcher: React.FC = () => {
  // Gỡ bỏ chức năng chuyển đổi góc nhìn vai trò nhưng giữ nguyên mã nguồn
  const isEnabled = false;
  if (!isEnabled) {
    return null;
  }

  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentRole =
    ROLES.find((r) => location.pathname.startsWith(r.path)) ||
    (location.pathname.startsWith('/admin') ? ROLES[2] : ROLES[0]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectRole = (role: RoleOption) => {
    setIsOpen(false);
    navigate(role.path);
  };

  const IconComp = currentRole.icon;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer select-none"
      >
        <div className={`p-1 rounded-lg ${currentRole.bgColor} ${currentRole.accentColor}`}>
          <IconComp className="w-4 h-4" />
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-[11px] font-extrabold text-slate-800 leading-tight flex items-center gap-1">
            <span>{currentRole.title}</span>
            <span className="text-[9px] font-mono px-1 rounded bg-slate-100 text-slate-500 font-bold">
              {currentRole.badge}
            </span>
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-fade-in space-y-1">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Chuyển đổi góc nhìn vai trò
            </span>
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          </div>

          {ROLES.map((role) => {
            const ItemIcon = role.icon;
            const isSelected = role.id === currentRole.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => handleSelectRole(role)}
                className={`w-full text-left p-2.5 rounded-xl flex items-start gap-2.5 transition-all cursor-pointer ${
                  isSelected ? 'bg-slate-100/80 font-bold' : 'hover:bg-slate-50'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${role.bgColor} ${role.accentColor}`}>
                  <ItemIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800">{role.title}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{role.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
