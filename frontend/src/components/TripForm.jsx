import React, { useState } from 'react';
import './TripForm.css';

const FIELD_META = [
  {
    id: 'current_location',
    label: 'CURRENT LOCATION',
    placeholder: 'e.g. Chicago, IL',
    icon: '◉',
    hint: 'Your starting position',
    color: 'sage',
  },
  {
    id: 'pickup_location',
    label: 'PICKUP LOCATION',
    placeholder: 'e.g. Indianapolis, IN',
    icon: '▲',
    hint: 'Where you load cargo — 1 hr stop',
    color: 'amber',
  },
  {
    id: 'dropoff_location',
    label: 'DROPOFF LOCATION',
    placeholder: 'e.g. Nashville, TN',
    icon: '▼',
    hint: 'Final delivery — 1 hr stop',
    color: 'rust',
  },
];

export default function TripForm({ onSubmit, loading }) {
  const [values, setValues] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    cycle_used: '',
  });

  const [focused, setFocused] = useState(null);

  const handleChange = (id, val) => setValues(v => ({ ...v, [id]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const cycleNum = parseFloat(values.cycle_used) || 0;
    onSubmit({
      current_location: values.current_location.trim(),
      pickup_location:  values.pickup_location.trim(),
      dropoff_location: values.dropoff_location.trim(),
      cycle_used:       cycleNum,
    });
  };

  const isValid =
    values.current_location.trim() &&
    values.pickup_location.trim() &&
    values.dropoff_location.trim();

  const cycleVal = parseFloat(values.cycle_used) || 0;
  const cyclePct = Math.min((cycleVal / 70) * 100, 100);

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <span className="form-header-label">TRIP PARAMETERS</span>
        <div className="form-header-line" />
      </div>

      {FIELD_META.map(field => (
        <div
          key={field.id}
          className={`field-group ${focused === field.id ? 'focused' : ''} color-${field.color}`}
        >
          <label htmlFor={field.id} className="field-label">
            <span className={`field-icon color-${field.color}`}>{field.icon}</span>
            {field.label}
          </label>
          <input
            id={field.id}
            type="text"
            className="field-input"
            placeholder={field.placeholder}
            value={values[field.id]}
            onChange={e => handleChange(field.id, e.target.value)}
            onFocus={() => setFocused(field.id)}
            onBlur={() => setFocused(null)}
            disabled={loading}
          />
          <span className="field-hint">{field.hint}</span>
        </div>
      ))}

      {/* Cycle Hours */}
      <div className={`field-group ${focused === 'cycle_used' ? 'focused' : ''} color-paper`}>
        <label htmlFor="cycle_used" className="field-label">
          <span className="field-icon">⊛</span>
          CURRENT CYCLE USED (HRS)
        </label>
        <input
          id="cycle_used"
          type="number"
          className="field-input"
          placeholder="0"
          min="0"
          max="69"
          step="0.5"
          value={values.cycle_used}
          onChange={e => handleChange('cycle_used', e.target.value)}
          onFocus={() => setFocused('cycle_used')}
          onBlur={() => setFocused(null)}
          disabled={loading}
        />
        <span className="field-hint">Hours used in current 8-day period (max 70)</span>

        {/* Cycle gauge */}
        <div className="cycle-gauge">
          <div className="cycle-gauge-track">
            <div
              className="cycle-gauge-fill"
              style={{ width: `${cyclePct}%` }}
              data-pct={cyclePct}
            />
          </div>
          <span className="cycle-gauge-label mono">
            {cycleVal.toFixed(1)} / 70 hrs
            <span className="cycle-remaining">
              &nbsp;·&nbsp;{(70 - cycleVal).toFixed(1)} remaining
            </span>
          </span>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className={`submit-btn ${loading ? 'loading' : ''}`}
        disabled={!isValid || loading}
      >
        {loading ? (
          <>
            <span className="btn-spinner" />
            CALCULATING…
          </>
        ) : (
          <>
            <span className="btn-icon">▶</span>
            CALCULATE ROUTE
          </>
        )}
      </button>

      {/* Assumptions note */}
      <div className="assumptions-box">
        <div className="assumptions-title">ASSUMPTIONS</div>
        <ul>
          <li>Property-carrying driver</li>
          <li>70 hr / 8-day cycle</li>
          <li>11 hr drive / 14 hr window / 10 hr rest</li>
          <li>30-min break after 8 hrs driving</li>
          <li>Fuel stop every 1,000 mi</li>
          <li>1 hr pickup + 1 hr dropoff</li>
          <li>Avg speed 55 mph</li>
        </ul>
      </div>
    </form>
  );
}
