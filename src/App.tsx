import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30 * 1000,
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});

// Auth pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const StoreRegistrationPage = lazy(() => import('./pages/auth/StoreRegistrationPage').then(m => ({ default: m.StoreRegistrationPage })));
// Technical Engineer & Staff KDS pages
const AdminTechnicalPage = lazy(() => import('./pages/AdminTechnicalPage').then(m => ({ default: m.AdminTechnicalPage })));
const StaffKdsPage = lazy(() => import('./pages/StaffKdsPage').then(m => ({ default: m.StaffKdsPage })));
const StoreEdgeSetupPage = lazy(() => import('./pages/technical/StoreEdgeSetupPage').then(m => ({ default: m.StoreEdgeSetupPage })));
const RobotMonitorPage = lazy(() => import('./pages/technical/RobotMonitorPage').then(m => ({ default: m.RobotMonitorPage })));

// Customer & Integration pages
const QrOrderPage = lazy(() => import('./pages/public/QrOrderPage').then(m => ({ default: m.QrOrderPage })));
const PublicTrackingPage = lazy(() => import('./pages/public/PublicTrackingPage').then(m => ({ default: m.PublicTrackingPage })));



function UnauthorizedPage() {
	return (
		<div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4 text-slate-800">
			<span className="text-6xl">🚫</span>
			<h1 className="text-2xl font-heading font-bold text-slate-900">Không có quyền truy cập</h1>
			<p className="text-slate-500 max-w-sm">Tài khoản của bạn không được phân quyền để xem trang này.</p>
			<button
				onClick={() => window.history.back()}
				className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-semibold transition-all active:scale-98 shadow-md shadow-brand-500/10"
			>
				Quay lại trang trước
			</button>
		</div>
	);
}

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
			<ToastContainer
				position="top-right"
				autoClose={3000}
				hideProgressBar={false}
				newestOnTop={false}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
				theme="light"
			/>
			<Suspense
				fallback={
					<div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-slate-800">
						<div className="relative mb-6">
							<div className="w-20 h-20 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-center shadow-xl shadow-[#0062FF]/20 animate-bounce-in p-2">
								<img src="/brand/vora-icon.png" alt="VORA Emblem" width="64" height="64" loading="eager" className="w-full h-full object-contain" />
							</div>
							<div className="absolute -inset-4 rounded-3xl bg-[#0062FF]/10 animate-ping-slow" />
						</div>
						<div className="flex items-center gap-2 animate-fade-up">
							<h1 className="text-2xl font-heading font-black text-[#0A192F] tracking-tight">
								VORA
							</h1>
							<span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0062FF] border border-blue-200">
								CENTRAL OS
							</span>
						</div>
						<p className="mt-2 text-xs text-slate-500 font-semibold animate-fade-up-delay uppercase tracking-widest font-mono">
							Đang kết nối hệ thống điều phối AMR...
						</p>
						<div className="mt-6 flex gap-1.5">
							<span className="w-2 h-2 rounded-full bg-[#0062FF] animate-dot-bounce" style={{ animationDelay: '0ms' }} />
							<span className="w-2 h-2 rounded-full bg-[#00D2FF] animate-dot-bounce" style={{ animationDelay: '150ms' }} />
							<span className="w-2 h-2 rounded-full bg-[#0052cc] animate-dot-bounce" style={{ animationDelay: '300ms' }} />
						</div>
					</div>
				}
			>
				<Routes>
					{/* Auth routes */}
					<Route path="/login" element={<LoginPage />} />
					<Route path="/register" element={<RegisterPage />} />
					<Route path="/register-store" element={<StoreRegistrationPage />} />
					<Route path="/forgot-password" element={<ForgotPasswordPage />} />
					<Route path="/reset-password" element={<ResetPasswordPage />} />
					<Route path="/unauthorized" element={<UnauthorizedPage />} />
					{/* Public & Customer routes */}
					<Route path="/qr-order" element={<QrOrderPage />} />
					<Route path="/track/:trackingToken" element={<PublicTrackingPage />} />
					<Route path="/track" element={<PublicTrackingPage />} />
					<Route path="/tracking/:trackingToken" element={<PublicTrackingPage />} />

					{/* Redirect Root to Login */}
					<Route path="/" element={<Navigate to="/login" replace />} />

					{/* Technical Engineer & Staff KDS routes */}
					<Route path="/technical" element={<AdminTechnicalPage />} />
					<Route path="/staff" element={<StaffKdsPage />} />

					{/* Direct technical & store edge routes */}
					<Route path="/edge-setup" element={<StoreEdgeSetupPage />} />
					<Route path="/robot-monitor" element={<RobotMonitorPage />} />

					{/* Admin routes: Permanently migrated to SaaS Portal */}
					<Route path="/admin/*" element={<Navigate to="/technical" replace />} />
					<Route path="/admin" element={<Navigate to="/technical" replace />} />

					{/* Fallback */}
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</Suspense>
		</BrowserRouter>
		</QueryClientProvider>
	);
}

export default App;
