import React, { useState } from 'react';

interface StepConnectProps {
  onConnect: (tenantId: string, clientId: string) => Promise<void>;
  onLogin: () => Promise<void>;
  deviceCodeMessage: string | null;
  authStatus: any;
}

const StepConnect: React.FC<StepConnectProps> = ({ onConnect, onLogin, deviceCodeMessage, authStatus }) => {
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleConfigure = async () => {
    if (!tenantId.trim() || !clientId.trim()) {
      alert('Please enter both Tenant ID and Client ID');
      return;
    }

    setLoading(true);
    try {
      await onConnect(tenantId.trim(), clientId.trim());
    } catch (error: any) {
      alert('Configuration failed: ' + (error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      await onLogin();
    } catch (error: any) {
      alert('Login failed: ' + (error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  const isConfigured = authStatus?.status === 'READY' || authStatus?.status === 'AUTHENTICATED';
  const isAuthenticated = authStatus?.status === 'AUTHENTICATED';

  return (
    <div className="glass-card p-8 space-y-6">
      <div>
        <h2 className="text-3xl font-heading font-bold mb-2">Connect Your M365 Tenant</h2>
        <p className="text-slate-400">We only connect to Microsoft's Graph API - no third parties</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Tenant ID</label>
          <input
            type="text"
            className="input-field"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            disabled={isConfigured}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Client ID</label>
          <input
            type="text"
            className="input-field"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={isConfigured}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-sm text-syscat-orange hover:underline"
          >
            {showHelp ? 'Hide' : 'Show'} setup instructions
          </button>
        </div>

        {showHelp && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm space-y-2">
            <p className="font-medium text-slate-200">How to get your Tenant ID and Client ID:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>Go to Azure Portal → Azure Active Directory</li>
              <li>Copy your Tenant ID from the Overview page</li>
              <li>Go to App registrations → New registration</li>
              <li>Name it "SysCat" and register</li>
              <li>Copy the Application (client) ID</li>
              <li>Add API permissions: Microsoft Graph → Delegated → Directory.Read.All</li>
            </ol>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {!isConfigured && (
          <button onClick={handleConfigure} disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        )}

        {isConfigured && !isAuthenticated && (
          <button onClick={handleLogin} disabled={loading} className="btn-primary">
            {loading ? 'Waiting for auth...' : 'Start Device Code Login'}
          </button>
        )}

        {isAuthenticated && (
          <div className="flex items-center gap-2 text-emerald-400">
            <span>✓</span>
            <span>Authenticated successfully!</span>
          </div>
        )}
      </div>

      {deviceCodeMessage && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-sm text-slate-300 whitespace-pre-wrap font-mono">{deviceCodeMessage}</p>
        </div>
      )}

      {authStatus?.lastError && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-400">Error: {authStatus.lastError}</p>
        </div>
      )}
    </div>
  );
};

export default StepConnect;

