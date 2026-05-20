import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuditLogsPage, MetricsPage } from './pages';
import './App.css';

function Sidebar() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Nhật ký hệ thống', icon: '📋' },
    { path: '/metrics', label: 'Giám sát kho', icon: '📊' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">SmartWarehouse</h1>
        <p className="text-sm text-gray-500 mt-1">Central System</p>
      </div>
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<AuditLogsPage />} />
            <Route path="/metrics" element={<MetricsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;