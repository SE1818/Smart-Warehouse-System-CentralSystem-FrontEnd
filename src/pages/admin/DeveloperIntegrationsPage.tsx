import React, { useState, useEffect } from 'react';

interface ApiKeyItem {
  id: string;
  name: string;
  apiKey: string;
  secretKey?: string;
  isActive: boolean;
  createdAt: string;
}

interface WebhookSub {
  id: string;
  targetUrl: string;
  eventsJson: string;
  secret?: string;
  isActive: boolean;
  createdAt: string;
}

export const DeveloperIntegrationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'apikeys' | 'webhooks'>('apikeys');
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSub[]>([]);

  const [keyName, setKeyName] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKeyItem | null>(null);

  const storeId = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    fetchApiKeys();
    fetchWebhooks();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const res = await fetch(`/api/v1/apikeys?storeId=${storeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setApiKeys(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const res = await fetch(`/api/v1/webhooks/subscriptions?storeId=${storeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setWebhooks(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/apikeys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ storeId, name: keyName })
      });

      if (res.ok) {
        const data = await res.json();
        setNewlyCreatedKey(data);
        setKeyName('');
        fetchApiKeys();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/webhooks/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ storeId, targetUrl })
      });

      if (res.ok) {
        setTargetUrl('');
        fetchWebhooks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Thu hồi API Key này?')) return;
    await fetch(`/api/v1/apikeys/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    fetchApiKeys();
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Xóa Webhook Subscription này?')) return;
    await fetch(`/api/v1/webhooks/subscriptions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    fetchWebhooks();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          🛡️ Tích Hợp Hệ Thống Bên Thứ 3 (B2B Integrations)
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Quản lý API Keys để cho phép IT đối tác gọi vào hệ thống và đăng ký Outbound Webhooks nhận sự kiện đơn hàng/tồn kho.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('apikeys')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'apikeys'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          🔑 Quản Lý API Keys
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'webhooks'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          🔔 Outbound Webhooks
        </button>
      </div>

      {activeTab === 'apikeys' ? (
        <div className="space-y-6">
          <form onSubmit={handleCreateApiKey} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex gap-3">
            <input
              type="text"
              required
              placeholder="Tên ứng dụng đối tác (Ví dụ: IT-KiotViet-Sync)"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-2"
            >
              + Tạo API Key
            </button>
          </form>

          {newlyCreatedKey && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-2xl text-emerald-200">
              <h3 className="font-bold flex items-center gap-2 mb-1 text-emerald-400">
                ✅ Tạo API Key Thành Công!
              </h3>
              <p className="text-xs text-emerald-400/80 mb-3">Lưu ý: Secret Key chỉ hiển thị duy nhất 1 lần lúc khởi tạo.</p>
              <div className="space-y-1 font-mono text-sm bg-slate-900 p-3 rounded-xl border border-emerald-500/20">
                <p>API Key: <span className="text-white">{newlyCreatedKey.apiKey}</span></p>
                <p>Secret Key: <span className="text-amber-400">{newlyCreatedKey.secretKey}</span></p>
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4">Ứng Dụng / Tên Key</th>
                  <th className="p-4">API Key</th>
                  <th className="p-4">Trạng Thái</th>
                  <th className="p-4">Ngày Tạo</th>
                  <th className="p-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {apiKeys.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-800/40">
                    <td className="p-4 font-semibold text-white">{k.name}</td>
                    <td className="p-4 font-mono text-xs text-indigo-300">{k.apiKey}</td>
                    <td className="p-4">
                      <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-500/30">
                        Hoạt Động
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(k.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteApiKey(k.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <form onSubmit={handleCreateWebhook} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex gap-3">
            <input
              type="url"
              required
              placeholder="https://partner.com/api/webhooks/smartwarehouse"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-2"
            >
              + Đăng Ký Webhook
            </button>
          </form>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4">Target Webhook URL</th>
                  <th className="p-4">Sự Kiện Đăng Ký</th>
                  <th className="p-4">Trạng Thái</th>
                  <th className="p-4">Ngày Tạo</th>
                  <th className="p-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {webhooks.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-800/40">
                    <td className="p-4 font-mono text-xs text-indigo-300 truncate max-w-md">{w.targetUrl}</td>
                    <td className="p-4 text-xs text-slate-400 font-mono">{w.eventsJson}</td>
                    <td className="p-4">
                      <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-500/30">
                        Active
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(w.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteWebhook(w.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
