import React, { useRef, useEffect } from 'react';
import './ELDLogSheet.css';

const STATUS_ROW = {
  off_duty: 0,
  sleeper:  1,
  driving:  2,
  on_duty:  3,
};

const ROW_LABELS = [
  '1. Off Duty',
  '2. Sleeper Berth',
  '3. Driving',
  '4. On Duty\n  (Not Driving)',
];

const STATUS_COLORS = {
  off_duty: '#565c78',
  sleeper:  '#4a7c5f',
  driving:  '#e8a020',
  on_duty:  '#c44b2a',
};

export default function ELDLogSheet({ log, dayIndex }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (log && canvasRef.current) drawLog(canvasRef.current, log);
  }, [log]);

  function drawLog(canvas, log) {
    const dpr = window.devicePixelRatio || 1;
    const W   = 900;
    const H   = 520;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const BG     = '#f5f2eb';
    const INK    = '#1a1a2e';
    const GRID   = '#b0a898';
    const GRIDLT = '#d5d0c8';
    const AMBER  = '#e8a020';

    // ── Background ────────────────────────────────────────────────────────
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // ── Header ────────────────────────────────────────────────────────────
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, 56);

    ctx.fillStyle = AMBER;
    ctx.fillRect(0, 56, W, 3);

    ctx.fillStyle = '#f5f2eb';
    ctx.font = 'bold 15px "Syne", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('DRIVER\'S DAILY LOG', 16, 26);
    ctx.letterSpacing = '0px';

    ctx.font = '11px "DM Mono", monospace';
    ctx.fillStyle = AMBER;
    ctx.fillText(`DAY ${log.day}`, 16, 44);

    // Date / cycle info top-right
    ctx.fillStyle = '#aaa';
    ctx.font = '10px "DM Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('PROPERTY-CARRYING · 70HR/8-DAY CYCLE', W - 16, 26);
    ctx.fillText('NO ADVERSE CONDITIONS · 55 MPH AVG', W - 16, 42);
    ctx.textAlign = 'left';

    // ── Grid area setup ───────────────────────────────────────────────────
    const LEFT_MARGIN  = 140;
    const RIGHT_MARGIN = 80;
    const TOP_MARGIN   = 80;
    const GRID_W       = W - LEFT_MARGIN - RIGHT_MARGIN;
    const GRID_H       = 200;
    const ROW_H        = GRID_H / 4;
    const hrPx         = GRID_W / 24;

    // ── Hour header ───────────────────────────────────────────────────────
    ctx.strokeStyle = GRID;
    ctx.lineWidth   = 0.5;
    ctx.fillStyle   = INK;
    ctx.font        = '10px "DM Mono", monospace';

    for (let h = 0; h <= 24; h++) {
      const x = LEFT_MARGIN + h * hrPx;
      // Full-hour tick line through header
      ctx.beginPath();
      ctx.moveTo(x, TOP_MARGIN - 20);
      ctx.lineTo(x, TOP_MARGIN + GRID_H);
      ctx.strokeStyle = h % 6 === 0 ? GRID : GRIDLT;
      ctx.lineWidth   = h % 6 === 0 ? 1 : 0.5;
      ctx.stroke();

      if (h < 24) {
        ctx.fillStyle = INK;
        ctx.textAlign = 'center';
        const label = h === 0 ? 'MID' : h === 12 ? 'NOON' : h < 12 ? `${h}AM` : `${h-12}PM`;
        ctx.font = h % 6 === 0 ? 'bold 9px "DM Mono"' : '8px "DM Mono"';
        ctx.fillText(label, x + hrPx / 2, TOP_MARGIN - 6);
      }
    }
    ctx.textAlign = 'left';

    // Half-hour ticks
    ctx.strokeStyle = GRIDLT;
    ctx.lineWidth   = 0.3;
    for (let h = 0; h < 24; h++) {
      const x = LEFT_MARGIN + (h + 0.5) * hrPx;
      ctx.beginPath();
      ctx.moveTo(x, TOP_MARGIN);
      ctx.lineTo(x, TOP_MARGIN + GRID_H);
      ctx.stroke();

      // Quarter ticks
      [0.25, 0.75].forEach(q => {
        const xq = LEFT_MARGIN + (h + q) * hrPx;
        ctx.beginPath();
        ctx.moveTo(xq, TOP_MARGIN);
        ctx.lineTo(xq, TOP_MARGIN + ROW_H * 0.4);
        ctx.stroke();
      });
    }

    // ── Row labels ────────────────────────────────────────────────────────
    ctx.fillStyle = INK;
    ctx.font      = '10px "Syne", sans-serif';
    ROW_LABELS.forEach((label, i) => {
      const y   = TOP_MARGIN + i * ROW_H;
      const mid = y + ROW_H / 2;

      // Row bg alternate
      if (i % 2 === 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        ctx.fillRect(0, y, LEFT_MARGIN + GRID_W + RIGHT_MARGIN, ROW_H);
      }

      // Status color swatch
      ctx.fillStyle = STATUS_COLORS[Object.keys(STATUS_ROW).find(k => STATUS_ROW[k] === i)];
      ctx.fillRect(8, y + 6, 6, ROW_H - 12);

      // Label (multi-line)
      ctx.fillStyle   = INK;
      ctx.font        = '10px "Syne", sans-serif';
      ctx.textBaseline = 'middle';
      const lines = label.split('\n');
      if (lines.length === 1) {
        ctx.fillText(label, 20, mid);
      } else {
        ctx.fillText(lines[0], 20, mid - 7);
        ctx.fillText(lines[1], 20, mid + 7);
      }
      ctx.textBaseline = 'alphabetic';
    });

    // ── Row borders ───────────────────────────────────────────────────────
    ctx.strokeStyle = GRID;
    ctx.lineWidth   = 1;
    for (let r = 0; r <= 4; r++) {
      const y = TOP_MARGIN + r * ROW_H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Left divider
    ctx.beginPath();
    ctx.moveTo(LEFT_MARGIN, TOP_MARGIN - 20);
    ctx.lineTo(LEFT_MARGIN, TOP_MARGIN + GRID_H);
    ctx.strokeStyle = GRID;
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Right divider
    ctx.beginPath();
    ctx.moveTo(LEFT_MARGIN + GRID_W, TOP_MARGIN);
    ctx.lineTo(LEFT_MARGIN + GRID_W, TOP_MARGIN + GRID_H);
    ctx.stroke();

    // ── Draw activity bars ────────────────────────────────────────────────
    log.segments.forEach(seg => {
      const row    = STATUS_ROW[seg.status];
      if (row === undefined) return;
      const rowKey = seg.status;
      const color  = STATUS_COLORS[rowKey] || '#888';
      const x      = LEFT_MARGIN + seg.start * hrPx;
      const segW   = (seg.end - seg.start) * hrPx;
      const y      = TOP_MARGIN + row * ROW_H;

      // Filled bar
      ctx.fillStyle   = color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x + 0.5, y + 1, segW - 1, ROW_H - 2);
      ctx.globalAlpha = 1;

      // Segment border
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1;
      ctx.strokeRect(x + 0.5, y + 1, segW - 1, ROW_H - 2);
    });

    // ── Draw graph line (stairstep across rows) ───────────────────────────
    ctx.strokeStyle = INK;
    ctx.lineWidth   = 2.5;
    ctx.setLineDash([]);
    ctx.beginPath();

    let prevRow  = STATUS_ROW[log.segments[0]?.status] ?? 0;
    let prevX    = LEFT_MARGIN + (log.segments[0]?.start ?? 0) * hrPx;

    ctx.moveTo(prevX, TOP_MARGIN + prevRow * ROW_H + ROW_H / 2);

    log.segments.forEach((seg, i) => {
      const row = STATUS_ROW[seg.status];
      if (row === undefined) return;
      const x1  = LEFT_MARGIN + seg.start * hrPx;
      const x2  = LEFT_MARGIN + seg.end   * hrPx;
      const midY = TOP_MARGIN + row * ROW_H + ROW_H / 2;

      // Vertical drop to new row
      if (row !== prevRow) {
        ctx.lineTo(x1, TOP_MARGIN + prevRow * ROW_H + ROW_H / 2);
        ctx.lineTo(x1, midY);
      }
      ctx.lineTo(x2, midY);
      prevRow = row;
    });

    ctx.globalAlpha = 0.45;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ── Totals area ───────────────────────────────────────────────────────
    const TOT_Y   = TOP_MARGIN + GRID_H + 24;
    const statuses = ['off_duty', 'sleeper', 'driving', 'on_duty'];

    ctx.fillStyle   = INK;
    ctx.font        = 'bold 10px "Syne"';
    ctx.letterSpacing = '1px';
    ctx.fillText('HOURS TOTAL', LEFT_MARGIN, TOT_Y - 4);
    ctx.letterSpacing = '0px';

    const colW = GRID_W / 4;
    statuses.forEach((s, i) => {
      const tx       = LEFT_MARGIN + i * colW;
      const hrs      = log.totals[s] || 0;
      const fraction = hrs / 24;
      const color    = STATUS_COLORS[s];

      // Background bar
      ctx.fillStyle   = 'rgba(0,0,0,0.06)';
      ctx.fillRect(tx + 2, TOT_Y + 2, colW - 8, 48);

      // Fill bar
      ctx.fillStyle   = color;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(tx + 2, TOT_Y + 2, (colW - 8) * fraction, 48);
      ctx.globalAlpha = 1;

      // Border
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1;
      ctx.strokeRect(tx + 2, TOT_Y + 2, colW - 8, 48);

      // Hours value
      ctx.fillStyle   = color;
      ctx.font        = `bold 20px "Syne"`;
      ctx.textAlign   = 'center';
      ctx.fillText(hrs.toFixed(1), tx + colW / 2 - 4, TOT_Y + 30);

      // Label
      ctx.fillStyle = INK;
      ctx.font      = '8px "DM Mono"';
      ctx.fillText(
        s.replace('_', ' ').toUpperCase(),
        tx + colW / 2 - 4,
        TOT_Y + 44
      );
      ctx.textAlign = 'left';
    });

    // ── Totals check: must equal 24 ───────────────────────────────────────
    const total = Object.values(log.totals).reduce((a, b) => a + b, 0);
    ctx.fillStyle = Math.abs(total - 24) < 0.05 ? '#4a7c5f' : '#c44b2a';
    ctx.font      = '10px "DM Mono"';
    ctx.textAlign = 'right';
    ctx.fillText(`Σ ${total.toFixed(2)} hrs`, W - 12, TOT_Y + 30);
    ctx.textAlign = 'left';

    // ── Footer line ───────────────────────────────────────────────────────
    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(0, H - 28, W, 28);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#888';
    ctx.font      = '9px "DM Mono"';
    ctx.fillText(
      'FMCSA 49 CFR §395  ·  Property-Carrying Driver  ·  ELD Compliant  ·  Generated by TruckerELD',
      12, H - 10
    );
  }

  return (
    <div className="eld-sheet">
      <div className="eld-canvas-wrapper">
        <canvas ref={canvasRef} className="eld-canvas" />
      </div>
      {log && (
        <div className="eld-segment-table">
          <div className="seg-table-header">
            <span>STATUS</span>
            <span>START</span>
            <span>END</span>
            <span>DURATION</span>
            <span>NOTE</span>
          </div>
          {log.segments.map((seg, i) => (
            <div className="seg-row" key={i} data-status={seg.status}>
              <span className="seg-status" style={{ color: STATUS_COLORS[seg.status] }}>
                {seg.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className="seg-time">{fmtHr(seg.start)}</span>
              <span className="seg-time">{fmtHr(seg.end)}</span>
              <span className="seg-dur">{((seg.end - seg.start) * 60).toFixed(0)} min</span>
              <span className="seg-note">{seg.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtHr(h) {
  const hh = Math.floor(h % 24).toString().padStart(2, '0');
  const mm = Math.round((h % 1) * 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}
