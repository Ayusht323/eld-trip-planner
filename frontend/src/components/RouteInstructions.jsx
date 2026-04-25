import React from 'react';
import './RouteInstructions.css';

const STEP_META = {
  pickup:  { icon: '▲', color: '#e8a020', bg: 'rgba(232,160,32,0.08)',  label: 'PICKUP'  },
  dropoff: { icon: '▼', color: '#c44b2a', bg: 'rgba(196,75,42,0.08)',   label: 'DROPOFF' },
  fuel:    { icon: '⛽', color: '#4a7c5f', bg: 'rgba(74,124,95,0.08)',   label: 'FUEL'    },
  rest:    { icon: '🛏', color: '#565c78', bg: 'rgba(86,92,120,0.10)',   label: 'REST'    },
  break:   { icon: '⏸', color: '#7c6fa0', bg: 'rgba(124,111,160,0.08)', label: 'BREAK'   },
  drive:   { icon: '🚛', color: '#b0a898', bg: 'rgba(176,168,152,0.05)', label: 'DRIVE'   },
};

function fmtDuration(hrs) {
  if (hrs < 1) return `${Math.round(hrs * 60)} min`;
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtClock(absHrs) {
  const dayNum = Math.floor(absHrs / 24) + 1;
  const hh = Math.floor(absHrs % 24).toString().padStart(2, '0');
  const mm = Math.round((absHrs % 1) * 60).toString().padStart(2, '0');
  return `Day ${dayNum} · ${hh}:${mm}`;
}

function buildSteps(events, waypoints, totalMiles) {
  if (!events?.length) return [];

  const steps = [];
  let driveStart   = null;
  let driveMiles   = 0;
  let driveHours   = 0;
  let segLabel     = '';

  const flush = (endTime) => {
    if (driveHours > 0.001) {
      steps.push({
        type:     'drive',
        label:    segLabel || 'Driving segment',
        duration: driveHours,
        miles:    driveMiles,
        startTime: driveStart,
        endTime,
      });
    }
    driveStart = null;
    driveMiles = 0;
    driveHours = 0;
    segLabel   = '';
  };

  for (const ev of events) {
    if (ev.status === 'driving') {
      if (driveStart === null) driveStart = ev.start;
      driveHours += ev.end - ev.start;
      driveMiles += ev.miles_end - ev.miles_start;

      // Annotate drive leg with context
      if (ev.miles_start < 0.1 && waypoints?.[1]) {
        segLabel = `Drive to ${waypoints[1].name}`;
      } else if (Math.abs(ev.miles_end - totalMiles) < 20 && waypoints?.[2]) {
        segLabel = `Drive to ${waypoints[2].name}`;
      } else {
        segLabel = 'Continue driving';
      }
    } else {
      flush(ev.start);
      steps.push({
        type:      ev.stop_type || (ev.status === 'sleeper' ? 'rest' : ev.status === 'off_duty' ? 'rest' : 'break'),
        label:     ev.label,
        duration:  ev.end - ev.start,
        miles:     ev.miles_start,
        startTime: ev.start,
        endTime:   ev.end,
        status:    ev.status,
      });
    }
  }
  flush(events[events.length - 1].end);

  return steps.filter(s => s.duration > 0.01);
}

export default function RouteInstructions({ events, route, summary }) {
  if (!events?.length) return null;

  const waypoints  = route?.waypoints || [];
  const totalMiles = route?.distance_miles || summary?.total_miles || 0;
  const steps      = buildSteps(events, waypoints, totalMiles);

  let cumMiles = 0;

  return (
    <div className="ri-wrapper">

      {/* ── Trip header card ── */}
      <div className="ri-header-card">
        <div className="ri-header-route">
          <span className="ri-loc ri-loc--start">
            <span className="ri-loc-dot" style={{ background: '#4a7c5f' }} />
            {waypoints[0]?.name || 'Origin'}
          </span>
          <div className="ri-header-arrow">
            <div className="ri-arrow-line" />
            <span className="ri-arrow-mid">
              {totalMiles.toFixed(0)} mi · {summary?.total_days} days
            </span>
            <div className="ri-arrow-line" />
          </div>
          <span className="ri-loc ri-loc--end">
            <span className="ri-loc-dot" style={{ background: '#c44b2a' }} />
            {waypoints[2]?.name || 'Destination'}
          </span>
        </div>
        <div className="ri-header-pills">
          <span className="ri-pill">⏱ {Math.floor(summary?.total_hours)}h total</span>
          <span className="ri-pill">🚛 {summary?.driving_hours?.toFixed(1)}h driving</span>
          <span className="ri-pill">🛏 {summary?.rest_stops} rest stops</span>
          <span className="ri-pill">⛽ {summary?.fuel_stops} fuel stops</span>
        </div>
      </div>

      {/* ── Regulatory notice ── */}
      <div className="ri-regulation-notice">
        <span className="ri-reg-icon">§</span>
        <span>FMCSA 49 CFR §395 · Property-Carrying · 70-hr/8-day cycle · 11-hr driving / 14-hr window / 10-hr rest</span>
      </div>

      {/* ── Step-by-step instructions ── */}
      <div className="ri-steps">
        {steps.map((step, i) => {
          const meta = STEP_META[step.type] || STEP_META.drive;
          const isStop = step.type !== 'drive';
          const milesAtStep = step.miles ?? cumMiles;
          if (step.type === 'drive') cumMiles += step.miles || 0;

          return (
            <div
              key={i}
              className={`ri-step ${isStop ? 'ri-step--stop' : ''}`}
              style={{ '--step-color': meta.color, '--step-bg': meta.bg }}
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="ri-connector">
                  <div className="ri-connector-line" style={{ background: meta.color }} />
                </div>
              )}

              {/* Step number + icon */}
              <div className="ri-step-left">
                <div className="ri-step-badge" style={{ borderColor: meta.color, background: meta.bg }}>
                  <span className="ri-step-icon">{meta.icon}</span>
                </div>
                <span className="ri-step-num">#{i + 1}</span>
              </div>

              {/* Content */}
              <div className="ri-step-body" style={{ background: meta.bg, borderColor: meta.color + '40' }}>
                <div className="ri-step-top">
                  <span className="ri-step-type-badge" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="ri-step-clock">{fmtClock(step.startTime)}</span>
                </div>

                <div className="ri-step-label">{step.label}</div>

                <div className="ri-step-meta">
                  <span className="ri-meta-item">
                    <span className="ri-meta-icon">⏱</span>
                    {fmtDuration(step.duration)}
                  </span>
                  {step.type === 'drive' && step.miles > 0 && (
                    <span className="ri-meta-item">
                      <span className="ri-meta-icon">↔</span>
                      {step.miles.toFixed(0)} miles
                    </span>
                  )}
                  <span className="ri-meta-item">
                    <span className="ri-meta-icon">◎</span>
                    Mile {milesAtStep.toFixed(0)}
                  </span>
                  <span className="ri-meta-item ri-meta-end">
                    ends {fmtClock(step.endTime)}
                  </span>
                </div>

                {/* HOS annotations */}
                {step.type === 'rest' && (
                  <div className="ri-hos-note">
                    🛏 10-hour mandatory rest period — HOS clock resets after this stop
                  </div>
                )}
                {step.type === 'break' && (
                  <div className="ri-hos-note">
                    ⏸ 30-min mandatory break — required after 8 consecutive hours driving
                  </div>
                )}
                {step.type === 'fuel' && (
                  <div className="ri-hos-note">
                    ⛽ Fuel stop — required within every 1,000 miles (30 min on-duty)
                  </div>
                )}
                {step.type === 'pickup' && (
                  <div className="ri-hos-note">
                    ▲ Loading at pickup location — 1 hour on-duty (not driving)
                  </div>
                )}
                {step.type === 'dropoff' && (
                  <div className="ri-hos-note">
                    ▼ Unloading at delivery location — 1 hour on-duty (not driving)
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Terminal node */}
        <div className="ri-terminal">
          <div className="ri-terminal-dot" />
          <span>Trip Complete — {totalMiles.toFixed(0)} miles delivered</span>
        </div>
      </div>
    </div>
  );
}
