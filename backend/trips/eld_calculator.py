"""
ELD / HOS Calculator — Property-Carrying Driver
Rules: 70-hr/8-day cycle, 11-hr driving, 14-hr window, 10-hr rest, 30-min break after 8 hrs driving
"""
from dataclasses import dataclass, field
from typing import List, Tuple
import math

# ── HOS Constants ──────────────────────────────────────────────────────────────
DRIVING_LIMIT   = 11.0   # max driving hrs per shift
WINDOW_LIMIT    = 14.0   # max on-duty window per shift
BREAK_THRESHOLD = 8.0    # hrs driving before mandatory 30-min break
BREAK_DURATION  = 0.5    # 30 minutes
REST_DURATION   = 10.0   # required off-duty between shifts
CYCLE_LIMIT     = 70.0   # hrs in 8-day cycle
CYCLE_RESTART   = 34.0   # restart window hrs
AVG_SPEED       = 55.0   # mph
FUEL_INTERVAL   = 1000.0 # miles between fuel stops
FUEL_DURATION   = 0.5    # 30-min fuel stop
STOP_DURATION   = 1.0    # pickup / dropoff each

STATUS_LABELS = {
    "off_duty":  "Off Duty",
    "sleeper":   "Sleeper Berth",
    "driving":   "Driving",
    "on_duty":   "On Duty (Not Driving)",
}


@dataclass
class Event:
    status: str           # off_duty | sleeper | driving | on_duty
    start: float          # absolute hours from trip start
    end: float
    miles_start: float
    miles_end: float
    label: str
    stop_type: str = ""   # pickup | dropoff | fuel | break | rest | ""


def simulate_trip(total_miles: float, current_cycle_used: float) -> List[Event]:
    events: List[Event] = []

    t           = 0.0
    miles       = 0.0
    miles_since_fuel = 0.0

    # Shift state (reset after each rest)
    shift_driving   = 0.0
    shift_on_duty   = 0.0
    drive_since_break = 0.0

    cycle_used = float(current_cycle_used)

    def add(status, duration, label, stop_type="", miles_delta=0.0):
        nonlocal t, miles, miles_since_fuel, shift_driving, shift_on_duty, \
                 drive_since_break, cycle_used
        e = Event(status, t, t + duration, miles, miles + miles_delta, label, stop_type)
        events.append(e)
        t       += duration
        miles   += miles_delta
        if status == "driving":
            shift_driving     += duration
            shift_on_duty     += duration
            drive_since_break += duration
            cycle_used        += duration
            miles_since_fuel  += miles_delta
        elif status in ("on_duty",):
            shift_on_duty += duration
            cycle_used    += duration
        # off_duty / sleeper don't count toward cycle

    # ── PICKUP ───────────────────────────────────────────────────────────────
    add("on_duty", STOP_DURATION, "Pickup — loading cargo", "pickup")

    # ── DRIVE LOOP ───────────────────────────────────────────────────────────
    guard = 0
    while miles < total_miles - 0.01:
        guard += 1
        if guard > 50_000:
            break

        remaining_miles = total_miles - miles
        drive_avail     = DRIVING_LIMIT - shift_driving
        window_avail    = WINDOW_LIMIT  - shift_on_duty

        # ── Need rest? ───────────────────────────────────────────────────────
        if drive_avail <= 0.01 or window_avail <= 0.01:
            add("sleeper", REST_DURATION, "10-hour sleeper berth", "rest")
            shift_driving     = 0.0
            shift_on_duty     = 0.0
            drive_since_break = 0.0
            continue

        # ── Need 30-min break? ───────────────────────────────────────────────
        if drive_since_break >= BREAK_THRESHOLD:
            add("off_duty", BREAK_DURATION, "30-min mandatory break", "break")
            shift_on_duty     += BREAK_DURATION
            drive_since_break  = 0.0
            continue

        # ── Cycle exhausted? ─────────────────────────────────────────────────
        cycle_remaining = CYCLE_LIMIT - cycle_used
        if cycle_remaining <= 0.01:
            add("off_duty", CYCLE_RESTART, "34-hour cycle restart", "rest")
            cycle_used        = 0.0
            shift_driving     = 0.0
            shift_on_duty     = 0.0
            drive_since_break = 0.0
            continue

        # ── How far / long can we drive this segment? ────────────────────────
        max_drive_time = min(
            drive_avail,
            window_avail,
            cycle_remaining,
            BREAK_THRESHOLD - drive_since_break,
        )

        # Check fuel
        miles_to_fuel   = FUEL_INTERVAL - miles_since_fuel
        time_to_fuel    = miles_to_fuel  / AVG_SPEED
        time_to_dest    = remaining_miles / AVG_SPEED

        if miles_to_fuel < remaining_miles and time_to_fuel < max_drive_time - 0.01:
            # Drive to fuel stop
            add("driving", time_to_fuel,
                f"Driving — fueling at {miles + miles_to_fuel:.0f} mi",
                miles_delta=time_to_fuel * AVG_SPEED)
            miles_since_fuel = 0.0
            # Fuel stop — counts as on-duty break (≥30 min resets drive_since_break)
            add("on_duty", FUEL_DURATION, "Fuel stop", "fuel")
            drive_since_break = 0.0   # 30-min non-driving qualifies
            shift_on_duty    += FUEL_DURATION
            cycle_used       += FUEL_DURATION
        else:
            drive_time = min(max_drive_time, time_to_dest)
            if drive_time <= 0.001:
                # Micro-segment — take a rest to break deadlock
                add("sleeper", REST_DURATION, "10-hour sleeper berth", "rest")
                shift_driving     = 0.0
                shift_on_duty     = 0.0
                drive_since_break = 0.0
                continue
            add("driving", drive_time, "Driving",
                miles_delta=drive_time * AVG_SPEED)

    # ── DROPOFF ──────────────────────────────────────────────────────────────
    add("on_duty", STOP_DURATION, "Dropoff — unloading cargo", "dropoff")

    return events


def build_response(events: List[Event], total_miles: float) -> dict:
    """
    Convert raw events into structured response for the API:
      - eld_logs: list of per-day log sheets
      - stops: notable stops for the map
      - summary
    """
    if not events:
        return {}

    trip_end = events[-1].end

    # ── Split into calendar days ──────────────────────────────────────────────
    num_days = math.ceil(trip_end / 24) + 1
    day_segments = {d: [] for d in range(num_days)}

    for ev in events:
        start_day = int(ev.start / 24)
        end_day   = int(math.ceil(ev.end / 24 - 1e-9))

        for d in range(start_day, end_day + 1):
            seg_start = max(ev.start - d * 24, 0.0)
            seg_end   = min(ev.end   - d * 24, 24.0)
            if seg_end - seg_start < 0.001:
                continue
            day_segments[d].append({
                "status": ev.status,
                "start":  round(seg_start, 4),
                "end":    round(seg_end,   4),
                "label":  ev.label,
            })

    # ── ELD log sheets ────────────────────────────────────────────────────────
    eld_logs = []
    for d in range(num_days):
        segs = sorted(day_segments[d], key=lambda x: x["start"])
        if not segs:
            continue

        # Fill gaps with off_duty
        filled = []
        cursor = 0.0
        for s in segs:
            if s["start"] > cursor + 0.001:
                filled.append({"status":"off_duty","start":cursor,"end":s["start"],"label":"Off Duty"})
            filled.append(s)
            cursor = s["end"]
        if cursor < 24.0 - 0.001:
            filled.append({"status":"off_duty","start":cursor,"end":24.0,"label":"Off Duty"})

        totals = {"off_duty": 0.0, "sleeper": 0.0, "driving": 0.0, "on_duty": 0.0}
        for s in filled:
            totals[s["status"]] = round(totals[s["status"]] + (s["end"] - s["start"]), 3)

        eld_logs.append({
            "day":      d + 1,
            "segments": filled,
            "totals":   totals,
        })

    # ── Stops for map ─────────────────────────────────────────────────────────
    stops = []
    for ev in events:
        if ev.stop_type:
            stops.append({
                "type":       ev.stop_type,
                "label":      ev.label,
                "hour_start": round(ev.start, 2),
                "hour_end":   round(ev.end,   2),
                "miles":      round(ev.miles_start, 1),
                "day":        int(ev.start / 24) + 1,
            })

    # ── Summary ───────────────────────────────────────────────────────────────
    driving_hrs  = sum(ev.end - ev.start for ev in events if ev.status == "driving")
    rest_count   = sum(1 for ev in events if ev.stop_type == "rest")
    fuel_count   = sum(1 for ev in events if ev.stop_type == "fuel")

    summary = {
        "total_miles":    round(total_miles, 1),
        "total_hours":    round(trip_end, 2),
        "total_days":     len(eld_logs),
        "driving_hours":  round(driving_hrs, 2),
        "rest_stops":     rest_count,
        "fuel_stops":     fuel_count,
    }

    return {
        "eld_logs": eld_logs,
        "stops":    stops,
        "summary":  summary,
        "events":   [
            {"status": e.status, "start": round(e.start, 3), "end": round(e.end, 3),
             "miles_start": round(e.miles_start, 1), "miles_end": round(e.miles_end, 1),
             "label": e.label, "stop_type": e.stop_type}
            for e in events
        ],
    }
