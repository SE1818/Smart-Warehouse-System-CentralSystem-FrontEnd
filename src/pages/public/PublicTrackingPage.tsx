import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';

interface WhiteLabelBrand {
  displayName: string;
  logoUrl: string;
  bannerUrl?: string;
  primaryColorHex: string;
  secondaryColorHex: string;
  supportHotline: string;
}

interface TrackingData {
  orderId: string;
  orderCode: string;
  status: string; // Created, Confirmed, Dispatched, InTransit, Arrived, Delivered
  customerName: string;
  customerPhoneMasked: string;
  pickupLocation: string;
  dropoffLocation: string;
  totalAmount: number;
  paymentStatus: string;
  createdAt: string;

  // Robot telemetry
  assignedRobotId?: string;
  robotName?: string;
  robotX?: number;
  robotY?: number;
  robotBattery?: number;
  robotStatus?: string;
  estimatedArrivalMinutes?: number;

  // Locker & OTP
  isLockerUnlocked: boolean;
  isOtpRequired: boolean;
  otpExpiresAt?: string;

  // White label
  brand?: WhiteLabelBrand;
}

export const PublicTrackingPage: React.FC = () => {
  const { trackingToken } = useParams<{ trackingToken: string }>();
  const [searchParams] = useSearchParams();
  const token = trackingToken || searchParams.get('token') || 'demo-token';

  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('');
  const [unlockLoading, setUnlockLoading] = useState<boolean>(false);
  const [unlockMessage, setUnlockMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number>(5);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [tableNotice, setTableNotice] = useState<string | null>(null);

  const hubConnectionRef = useRef<signalR.HubConnection | null>(null);

  // Default WhiteLabel Fallback
  const defaultBrand: WhiteLabelBrand = {
    displayName: 'VORA Robotics Delivery',
    logoUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=128&auto=format&fit=crop&q=60',
    primaryColorHex: '#FF6B00',
    secondaryColorHex: '#1F2937',
    supportHotline: '1900 6868'
  };

  const brand = tracking?.brand || defaultBrand;

  // Sanitize hex color to prevent CSS injection (ETM-27)
  const safePrimaryColor = /^#([0-9A-F]{3}){1,2}$/i.test(brand.primaryColorHex)
    ? brand.primaryColorHex
    : '#FF6B00';

  useEffect(() => {
    fetchTrackingInfo();
    setupSignalR();

    return () => {
      if (hubConnectionRef.current) {
        hubConnectionRef.current.stop();
      }
    };
  }, [token]);

  const fetchTrackingInfo = async () => {
    try {
      const res = await fetch(`/api/v1/tracking/public/${token}`);
      if (res.ok) {
        const data = await res.json();
        setTracking(data);
      } else {
        // Fallback demo data for preview
        setTracking({
          orderId: '00000000-0000-0000-0000-000000000001',
          orderCode: 'ORD-2026-VORA',
          status: 'InTransit',
          customerName: 'Nguyễn Văn A',
          customerPhoneMasked: '090****123',
          pickupLocation: 'Trạm Pha Chế ST05 (Tầng 1)',
          dropoffLocation: 'Landmark 81 - Tầng 12 - P. 1204',
          totalAmount: 85000,
          paymentStatus: 'Paid',
          createdAt: new Date().toISOString(),
          robotName: 'AMR-01 (Mantis)',
          robotX: 4.2,
          robotY: 3.8,
          robotBattery: 86,
          robotStatus: 'in_transit',
          estimatedArrivalMinutes: 3,
          isLockerUnlocked: false,
          isOtpRequired: true,
          brand: defaultBrand
        });
      }
    } catch (err) {
      console.warn('Could not fetch tracking info from API, using demo data', err);
    } finally {
      setLoading(false);
    }
  };

  const setupSignalR = () => {
    try {
      const hubUrl = '/hub/robot-tracking';
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      connection.onreconnecting(() => setIsReconnecting(true));
      connection.onreconnected(() => setIsReconnecting(false));
      connection.onclose(() => setIsReconnecting(true));

      // Telemetry updates
      connection.on('ReceiveRobotLocation', (packet: any) => {
        setTracking(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            robotX: packet.x ?? prev.robotX,
            robotY: packet.y ?? prev.robotY,
            robotBattery: packet.battery ?? prev.robotBattery,
            robotStatus: packet.status ?? prev.robotStatus
          };
        });
      });

      // Status changes
      connection.on('ReceiveRobotStatusChanged', (data: any) => {
        setTracking(prev => {
          if (!prev) return prev;
          const newStatus = data.status === 'arrived' ? 'Arrived' : prev.status;
          return {
            ...prev,
            status: newStatus,
            robotStatus: data.status,
            robotBattery: data.batteryLevel ?? prev.robotBattery
          };
        });
      });

      // Destination changed (Table Transfer / Merge)
      connection.on('DestinationChanged', (data: any) => {
        if (data.newTableNo) {
          setTableNotice(`📍 Bàn của quý khách đã được chuyển sang ${data.newTableNo}. Robot AMR đang điều hướng giao hàng tới vị trí mới.`);
          setTracking(prev => prev ? { ...prev, dropoffLocation: `Bàn ${data.newTableNo}` } : prev);
        }
      });

      // Robot connection / offline alert
      connection.on('RobotConnectionAlert', (data: any) => {
        setTableNotice(`⚠️ ${data.message || 'Robot giao hàng tạm thời gián đoạn tín hiệu. Nhân viên đang kiểm tra.'}`);
      });

      // Locker Unlocked notification
      connection.on('ReceiveLockerUnlocked', () => {
        setTracking(prev => prev ? { ...prev, isLockerUnlocked: true, status: 'Delivered' } : prev);
        setUnlockMessage({ text: 'Cốp xe đã được mở tự động! Xin mời quý khách lấy hàng.', isError: false });
      });

      connection.start()
        .then(() => {
          setIsReconnecting(false);
          connection.invoke('JoinTrackingSession', token);
        })
        .catch(() => {
          setIsReconnecting(false);
        });

      hubConnectionRef.current = connection;
    } catch (err) {
      console.error('SignalR setup error', err);
    }
  };

  const handleUnlockOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setUnlockMessage({ text: 'Vui lòng nhập đúng 6 chữ số mã OTP.', isError: true });
      return;
    }

    setUnlockLoading(true);
    setUnlockMessage(null);

    try {
      const res = await fetch(`/api/v1/tracking/public/${token}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpCode })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTracking(prev => prev ? { ...prev, isLockerUnlocked: true, status: 'Delivered' } : prev);
        setUnlockMessage({ text: data.message || 'Mở cốp thành công!', isError: false });
      } else {
        setRemainingAttempts(data.remainingAttempts ?? remainingAttempts - 1);
        setUnlockMessage({ text: data.message || 'Mã OTP không đúng.', isError: true });
      }
    } catch (err) {
      // Mock unlock for test tokens
      if (otpCode === '123456' || otpCode === '888888') {
        setTracking(prev => prev ? { ...prev, isLockerUnlocked: true, status: 'Delivered' } : prev);
        setUnlockMessage({ text: 'Mở cốp thành công! Xin mời quý khách lấy hàng.', isError: false });
      } else {
        setUnlockMessage({ text: 'Không thể kết nối máy chủ xác thực.', isError: true });
      }
    } finally {
      setUnlockLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-300 font-medium">Đang tải hành trình đơn hàng...</p>
      </div>
    );
  }

  // Steps indicator logic
  const steps = [
    { key: 'Created', label: 'Đã tạo' },
    { key: 'Confirmed', label: 'Đóng gói' },
    { key: 'Dispatched', label: 'Điều xe' },
    { key: 'InTransit', label: 'Đang giao' },
    { key: 'Arrived', label: 'Đã đến nơi' },
    { key: 'Delivered', label: 'Hoàn tất' }
  ];

  const currentStatus = tracking?.status || 'InTransit';
  const currentStepIndex = Math.max(0, steps.findIndex(s => s.key.toLowerCase() === currentStatus.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start pb-12">
      {/* Reconnection Banner (ETM-26) */}
      {isReconnecting && (
        <div className="w-full bg-amber-500 text-slate-950 font-bold text-xs py-1.5 px-4 text-center sticky top-0 z-50 animate-pulse">
          ⚠️ Đang kết nối lại tín hiệu thời gian thực với Robot...
        </div>
      )}

      {/* Main Container - Mobile Responsive Max Width (ETM-28) */}
      <div className="w-full max-w-md bg-slate-900 border-x border-slate-800 min-h-screen shadow-2xl flex flex-col">
        {/* Brand Header (White-Labeling ETM-27) */}
        <header
          className="p-4 border-b border-slate-800 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${safePrimaryColor}22 0%, #0f172a 100%)` }}
        >
          <div className="flex items-center space-x-3">
            {brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-md"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md"
                style={{ backgroundColor: safePrimaryColor }}
              >
                🤖
              </div>
            )}
            <div>
              <h1 className="font-bold text-base text-white tracking-wide">{brand.displayName}</h1>
              <p className="text-xs text-slate-400">Theo dõi trực tiếp AMR</p>
            </div>
          </div>

          {brand.supportHotline && (
            <a
              href={`tel:${brand.supportHotline}`}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-all flex items-center space-x-1"
            >
              <span>📞</span>
              <span>Hotline</span>
            </a>
          )}
        </header>

        {/* Real-time Table Change & Heartbeat Notice Banner */}
        {tableNotice && (
          <div className="bg-indigo-950/90 border-b border-indigo-500/50 p-3 text-xs text-indigo-200 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <span>{tableNotice}</span>
            </div>
            <button
              onClick={() => setTableNotice(null)}
              className="text-slate-400 hover:text-white p-1 ml-2 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Live Map / Telemetry Floorplan Simulation */}
        <div className="relative w-full h-56 bg-slate-950 border-b border-slate-800 overflow-hidden flex items-center justify-center">
          {/* Simulated 2D Floorplan Grid */}
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:24px_24px]" />

          {/* Pickup Station ST05 */}
          <div className="absolute left-10 bottom-8 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center text-xs shadow-lg text-emerald-400">
              ☕
            </div>
            <span className="text-[10px] text-slate-400 mt-1 font-medium">ST05 Quầy</span>
          </div>

          {/* Dropoff Station ST01 */}
          <div className="absolute right-10 top-8 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-orange-500 flex items-center justify-center text-xs shadow-lg text-orange-400">
              🏢
            </div>
            <span className="text-[10px] text-slate-400 mt-1 font-medium">Điểm nhận</span>
          </div>

          {/* Path Line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path
              d="M 60 170 Q 180 120 330 50"
              fill="none"
              stroke="#475569"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          </svg>

          {/* Animated Robot AMR Marker */}
          <div
            className="absolute z-10 flex flex-col items-center transition-all duration-700 ease-out"
            style={{
              left: `${Math.min(80, Math.max(15, (tracking?.robotX ?? 4) * 8.5))}%`,
              top: `${Math.min(75, Math.max(20, (tracking?.robotY ?? 3) * 12))}%`
            }}
          >
            <div
              className="relative w-11 h-11 rounded-2xl flex items-center justify-center text-lg shadow-xl animate-bounce"
              style={{ backgroundColor: safePrimaryColor }}
            >
              🤖
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>
            <div className="mt-1 bg-slate-900/90 backdrop-blur px-2 py-0.5 rounded-full border border-slate-700 text-[10px] font-semibold text-slate-200 shadow">
              {tracking?.robotName || 'AMR-01'}
            </div>
          </div>

          {/* Telemetry Badge Overlay */}
          <div className="absolute bottom-3 right-3 bg-slate-900/85 backdrop-blur border border-slate-800 rounded-xl px-3 py-1.5 flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1">
              <span className="text-emerald-400">🔋</span>
              <span className="font-bold">{tracking?.robotBattery ?? 85}%</span>
            </div>
            <div className="w-px h-3 bg-slate-700" />
            <div className="flex items-center space-x-1">
              <span className="text-orange-400">⏱️</span>
              <span className="font-bold">{tracking?.estimatedArrivalMinutes ?? 3} phút</span>
            </div>
          </div>
        </div>

        {/* Order Status Stepper */}
        <div className="p-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center justify-between relative mb-2">
            <div className="absolute left-3 right-3 top-3 h-0.5 bg-slate-800 -z-0" />
            <div
              className="absolute left-3 top-3 h-0.5 transition-all duration-500 -z-0"
              style={{
                width: `${(currentStepIndex / (steps.length - 1)) * 90}%`,
                backgroundColor: safePrimaryColor
              }}
            />

            {steps.map((step, idx) => {
              const isPassed = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={step.key} className="flex flex-col items-center z-10">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      isCurrent
                        ? 'ring-4 ring-orange-500/20 text-white'
                        : isPassed
                        ? 'text-white'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                    style={{ backgroundColor: isPassed ? safePrimaryColor : undefined }}
                  >
                    {isPassed ? '✓' : idx + 1}
                  </div>
                  <span className={`text-[9px] mt-1 font-medium ${isCurrent ? 'text-white font-bold' : 'text-slate-500'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Details & OTP Verification Section */}
        <div className="p-4 flex-1 space-y-4">
          {/* Order Summary Card */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
              <div>
                <span className="text-xs text-slate-400">Mã đơn hàng</span>
                <p className="font-mono font-bold text-sm text-white">{tracking?.orderCode}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Người nhận</span>
                <p className="text-xs font-semibold text-slate-200">
                  {tracking?.customerName} ({tracking?.customerPhoneMasked})
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-start justify-between text-slate-400">
                <span>Điểm nhận:</span>
                <span className="text-slate-200 font-medium text-right max-w-[220px]">
                  {tracking?.dropoffLocation}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Tổng thanh toán:</span>
                <span className="text-emerald-400 font-bold">
                  {(tracking?.totalAmount ?? 0).toLocaleString('vi-VN')} đ ({tracking?.paymentStatus})
                </span>
              </div>
            </div>
          </div>

          {/* OTP / Locker Verification Action Card (Module 06) */}
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🔐</span>
              <div>
                <h3 className="font-bold text-sm text-white">Xác nhận Mở Cốp Xe</h3>
                <p className="text-xs text-slate-400">Nhập mã PIN 6 số hoặc quét QR khi Robot đến nơi</p>
              </div>
            </div>

            {tracking?.isLockerUnlocked ? (
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl animate-bounce">
                  🔓
                </div>
                <h4 className="font-bold text-emerald-400 text-sm">Cốp Xe Đang Mở</h4>
                <p className="text-xs text-emerald-300/80">
                  Quý khách vui lòng lấy hàng và đóng nắp cốp sau khi nhận xong. Cảm ơn quý khách!
                </p>
              </div>
            ) : (
              <form onSubmit={handleUnlockOtp} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mã OTP Mở Cốp (6 Chữ Số)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="vd: 123456"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-center text-2xl font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>

                {unlockMessage && (
                  <div
                    className={`text-xs p-2.5 rounded-lg border font-medium ${
                      unlockMessage.isError
                        ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                        : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    }`}
                  >
                    {unlockMessage.text}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <span>📷</span>
                    <span>Quét Mã QR</span>
                  </button>

                  <button
                    type="submit"
                    disabled={unlockLoading || otpCode.length !== 6}
                    className="py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-1"
                    style={{ backgroundColor: safePrimaryColor }}
                  >
                    {unlockLoading ? (
                      <span className="animate-spin mr-1">⏳</span>
                    ) : (
                      <span>🔓 Mở Cốp Xe</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-slate-800 text-center text-[11px] text-slate-500">
          VORA Autonomous Delivery • Powered by SmartWarehouse
        </footer>
      </div>

      {/* QR Scanner Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-xs w-full text-center space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">Quét Mã QR Trên Robot</h3>
            <div className="w-48 h-48 bg-slate-950 rounded-xl border-2 border-dashed border-orange-500 mx-auto flex items-center justify-center text-4xl">
              📱
            </div>
            <p className="text-xs text-slate-400">
              Hướng camera điện thoại vào mã QR hiển thị trên màn hình Robot AMR để mở cốp nhanh.
            </p>
            <button
              onClick={() => {
                setShowQrModal(false);
                setOtpCode('123456');
              }}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              Mô phỏng Quét Thành Công (123456)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
