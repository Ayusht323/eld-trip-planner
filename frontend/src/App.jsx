import React, { useState } from 'react';
import './App.css';
import TripForm          from './components/TripForm.jsx';
import RouteMap          from './components/RouteMap.jsx';
import RouteInstructions from './components/RouteInstructions.jsx';
import ELDLogSheet       from './components/ELDLogSheet.jsx';
import SummaryPanel      from './components/SummaryPanel.jsx';
import { calculateTrip } from './api/tripApi.jsx';

export default function App() {
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [activeTab, setActiveTab] = useState('map');
  const [logPage,   setLogPage]   = useState(0);

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setLogPage(0);
    try {
      const data = await calculateTrip(formData);
      setResult(data);
      setActiveTab('map');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const tabs = result ? [
    { id: 'map',          label: 'Route Map',        icon: '⊕', badge: null },
    { id: 'instructions', label: 'Route Instructions',icon: '▶', badge: null },
    { id: 'logs',         label: 'ELD Logs',          icon: '≡', badge: result.eld_logs.length },
    { id: 'summary',      label: 'Summary',           icon: '◈', badge: null },
  ] : [];

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">▶</span>
            <div className="logo-text">
              <span className="logo-main">TRUCKER</span>
              <span className="logo-sub">ELD · ROUTE PLANNER</span>
            </div>
          </div>
          <div className="header-badge">
            <span className="badge-dot" />
            <span>70 HR / 8-DAY CYCLE · FMCSA §395</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* ── Sidebar Form ── */}
        <aside className="sidebar">
          <TripForm onSubmit={handleSubmit} loading={loading} />
          {error && (
            <div className="error-box">
              <span className="error-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}
        </aside>

        {/* ── Results Panel ── */}
        <section className="results-panel">
          {!result && !loading && (
            <div className="empty-state">
              <div className="empty-grid">
                {[...Array(24)].map((_, i) => <div key={i} className="grid-cell" />)}
              </div>
              <div className="empty-content">
                <div className="empty-icon">◎</div>
                <h2>Enter Trip Details</h2>
                <p>Fill in your origin, pickup, dropoff, and hours used<br/>to generate a full route plan with ELD logs.</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="loader-ring">
                <div className="loader-inner">
                  <span>COMPUTING</span>
                  <span className="loader-sub">ROUTE + HOS</span>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="results-content">
              {/* Tab Bar */}
              <div className="tab-bar">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="tab-icon">{tab.icon}</span>
                    {tab.label}
                    {tab.badge !== null && (
                      <span className="tab-badge">{tab.badge}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {activeTab === 'map' && (
                  <RouteMap route={result.route} stops={result.stops} />
                )}

                {activeTab === 'instructions' && (
                  <RouteInstructions
                    events={result.events}
                    route={result.route}
                    summary={result.summary}
                  />
                )}

                {activeTab === 'logs' && (
                  <div className="log-container">
                    <div className="log-nav">
                      <button
                        className="log-nav-btn"
                        disabled={logPage === 0}
                        onClick={() => setLogPage(p => p - 1)}
                      >← Prev</button>
                      <span className="log-nav-label">
                        Day {result.eld_logs[logPage]?.day} of {result.eld_logs.length}
                      </span>
                      <button
                        className="log-nav-btn"
                        disabled={logPage === result.eld_logs.length - 1}
                        onClick={() => setLogPage(p => p + 1)}
                      >Next →</button>
                    </div>
                    <ELDLogSheet
                      log={result.eld_logs[logPage]}
                      dayIndex={logPage}
                    />
                  </div>
                )}

                {activeTab === 'summary' && (
                  <SummaryPanel
                    summary={result.summary}
                    stops={result.stops}
                    events={result.events}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
