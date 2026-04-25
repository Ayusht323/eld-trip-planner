import React from 'react';
import './SummaryPanel.css';

const STOP_COLORS = {
  pickup:  '#e8a020',
  dropoff: '#c44b2a',
  fuel:    '#4a7c5f',
  rest:    '#565c78',
  break:   '#3d4255',
};

const STOP_ICONS = {
  pickup:  '▲',
  dropoff: '●',
  fuel:    '⛽',
  rest:    '🛏',
  break:   '⏸',
};

const STATUS_COLORS = {
  off_duty: '#565c78',
  sleeper:  '#4a7c5f',
  driving:  '#e8a020',
  on_duty:  '#c44b2a',
};

function fmtHrs(h) {
  const d = Math.floor(h / 24);
  const r = h % 24;
  const hh = Math.floor(r);
  const mm = Math.round((r % 1) * 60);
  let s = '';
  if (d > 0) s += `${d}d `;
  s += `${hh}h`;
  if (mm > 0) s += ` ${mm}m`;
  return s;
}

export default function SummaryPanel({ summary, stops, events }) {
  if (!summary) return null;

  const totalTime = summary.total_hours;

  // For sparkline-style bar of the whole trip
  const statusTotals = { off_duty: 0, sleeper: 0, driving: 0, on_duty: 0 };
  (events || []).forEach(e => {
    if (statusTotals[e.status] !== undefined)
      statusTotals[e.status] += (e.end - e.start);
  });

  return (
    <div className="summary-panel">
      {/* ── Key stats ── */}
      <div className="summary-stats">
        {[
          { label: 'TOTAL DISTANCE', value: `${summary.total_miles?.toFixed(0)}`, unit: 'MI' },
          { label: 'TRIP DURATION',  value: fmtHrs(summary.total_hours),        unit: '' },
          { label: 'DAYS ON ROAD',   value: summary.total_days,                  unit: 'DAYS' },
          { label: 'DRIVING TIME',   value: fmtHrs(summary.driving_hours),       unit: '' },
          { label: 'REST STOPS',     value: summary.rest_stops,                   unit: 'STOPS' },
          { label: 'FUEL STOPS',     value: summary.fuel_stops,                   unit: 'STOPS' },
        ].map(stat => (
          <div className="stat-card" key={stat.label}>
            <span className="stat-label">{stat.label}</span>
            <div className="stat-value-row">
              <span className="stat-value">{stat.value}</span>
              {stat.unit && <span className="stat-unit">{stat.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Time allocation bar ── */}
      <div className="time-alloc">
        <div className="section-label">TIME ALLOCATION</div>
        <div className="alloc-bar">
          {Object.entries(statusTotals).map(([status, hrs]) => {
            const pct = totalTime > 0 ? (hrs / totalTime) * 100 : 0;
            if (pct < 0.5) return null;
            return (
              <div
                key={status}
                className="alloc-segment"
                style={{ width: `${pct}%`, background: STATUS_COLORS[status] }}
                title={`${status.replace('_', ' ')}: ${hrs.toFixed(1)}h`}
              />
            );
          })}
        </div>
        <div className="alloc-legend">
          {Object.entries(statusTotals).map(([status, hrs]) => (
            hrs > 0.1 ? (
              <div className="alloc-legend-item" key={status}>
                <span className="alloc-dot" style={{ background: STATUS_COLORS[status] }} />
                <span className="alloc-name">{status.replace('_', ' ')}</span>
                <span className="alloc-hrs">{hrs.toFixed(1)}h</span>
              </div>
            ) : null
          ))}
        </div>
      </div>

      {/* ── Stop timeline ── */}
      <div className="stop-timeline">
        <div className="section-label">STOP TIMELINE</div>
        <div className="timeline-track">
          {(stops || []).map((stop, i) => {
            const leftPct = totalTime > 0 ? (stop.hour_start / totalTime) * 100 : 0;
            return (
              <div
                key={i}
                className="timeline-marker"
                style={{ left: `${leftPct}%` }}
                title={stop.label}
              >
                <div
                  className="timeline-dot"
                  style={{ background: STOP_COLORS[stop.type] || '#aaa' }}
                />
                <div className="timeline-tooltip">
                  <span className="tt-icon">{STOP_ICONS[stop.type] || '●'}</span>
                  <span className="tt-label">{stop.label}</span>
                  <span className="tt-meta">Day {stop.day} · {stop.miles.toFixed(0)} mi</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="timeline-axis">
          <span>0h</span>
          <span>{fmtHrs(totalTime / 2)}</span>
          <span>{fmtHrs(totalTime)}</span>
        </div>
      </div>

      {/* ── Stops table ── */}
      <div className="stops-table-wrap">
        <div className="section-label">ALL STOPS</div>
        <table className="stops-table">
          <thead>
            <tr>
              <th>#</th>
              <th>TYPE</th>
              <th>DAY</th>
              <th>TIME</th>
              <th>DURATION</th>
              <th>MILE</th>
              <th>DESCRIPTION</th>
            </tr>
          </thead>
          <tbody>
            {(stops || []).map((stop, i) => (
              <tr key={i}>
                <td className="mono" style={{ opacity: 0.4 }}>{i + 1}</td>
                <td>
                  <span
                    className="type-badge"
                    style={{ background: STOP_COLORS[stop.type] + '33', color: STOP_COLORS[stop.type] }}
                  >
                    {STOP_ICONS[stop.type]} {stop.type.toUpperCase()}
                  </span>
                </td>
                <td className="mono">{stop.day}</td>
                <td className="mono">{fmtHrs(stop.hour_start)}</td>
                <td className="mono">{((stop.hour_end - stop.hour_start) * 60).toFixed(0)} min</td>
                <td className="mono">{stop.miles.toFixed(0)}</td>
                <td className="stop-desc">{stop.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
