import math
import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status as drf_status
from .eld_calculator import simulate_trip, build_response

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_URL      = "http://router.project-osrm.org/route/v1/driving"
HEADERS       = {"User-Agent": "ELD-Trip-Planner/1.0 (portfolio)"}

# ── Built-in US city coordinates (lat, lon) — fallback when Nominatim unreachable ──
CITY_COORDS = {
    "new york, ny": (40.7128, -74.0060), "new york city, ny": (40.7128, -74.0060),
    "los angeles, ca": (34.0522, -118.2437), "la, ca": (34.0522, -118.2437),
    "chicago, il": (41.8781, -87.6298),
    "houston, tx": (29.7604, -95.3698),
    "phoenix, az": (33.4484, -112.0740),
    "philadelphia, pa": (39.9526, -75.1652),
    "san antonio, tx": (29.4241, -98.4936),
    "san diego, ca": (32.7157, -117.1611),
    "dallas, tx": (32.7767, -96.7970),
    "san jose, ca": (37.3382, -121.8863),
    "austin, tx": (30.2672, -97.7431),
    "jacksonville, fl": (30.3322, -81.6557),
    "fort worth, tx": (32.7555, -97.3308),
    "columbus, oh": (39.9612, -82.9988),
    "charlotte, nc": (35.2271, -80.8431),
    "san francisco, ca": (37.7749, -122.4194),
    "indianapolis, in": (39.7684, -86.1581),
    "seattle, wa": (47.6062, -122.3321),
    "denver, co": (39.7392, -104.9903),
    "washington, dc": (38.9072, -77.0369), "washington dc": (38.9072, -77.0369),
    "nashville, tn": (36.1627, -86.7816),
    "oklahoma city, ok": (35.4676, -97.5164),
    "el paso, tx": (31.7619, -106.4850),
    "boston, ma": (42.3601, -71.0589),
    "portland, or": (45.5051, -122.6750),
    "las vegas, nv": (36.1699, -115.1398),
    "louisville, ky": (38.2527, -85.7585),
    "baltimore, md": (39.2904, -76.6122),
    "milwaukee, wi": (43.0389, -87.9065),
    "albuquerque, nm": (35.0844, -106.6504),
    "tucson, az": (32.2226, -110.9747),
    "fresno, ca": (36.7378, -119.7871),
    "sacramento, ca": (38.5816, -121.4944),
    "kansas city, mo": (39.0997, -94.5786),
    "atlanta, ga": (33.7490, -84.3880),
    "omaha, ne": (41.2565, -95.9345),
    "colorado springs, co": (38.8339, -104.8214),
    "raleigh, nc": (35.7796, -78.6382),
    "miami, fl": (25.7617, -80.1918),
    "oakland, ca": (37.8044, -122.2712),
    "minneapolis, mn": (44.9778, -93.2650),
    "tulsa, ok": (36.1540, -95.9928),
    "tampa, fl": (27.9506, -82.4572),
    "new orleans, la": (29.9511, -90.0715),
    "wichita, ks": (37.6872, -97.3301),
    "cleveland, oh": (41.4993, -81.6944),
    "riverside, ca": (33.9533, -117.3962),
    "st. louis, mo": (38.6270, -90.1994), "st louis, mo": (38.6270, -90.1994),
    "lexington, ky": (38.0406, -84.5037),
    "pittsburgh, pa": (40.4406, -79.9959),
    "salt lake city, ut": (40.7608, -111.8910),
    "cincinnati, oh": (39.1031, -84.5120),
    "greensboro, nc": (36.0726, -79.7920),
    "lincoln, ne": (40.8136, -96.7026),
    "buffalo, ny": (42.8864, -78.8784),
    "orlando, fl": (28.5383, -81.3792),
    "madison, wi": (43.0731, -89.4012),
    "durham, nc": (35.9940, -78.8986),
    "lubbock, tx": (33.5779, -101.8552),
    "akron, oh": (41.0814, -81.5190),
    "reno, nv": (39.5296, -119.8138),
    "spokane, wa": (47.6588, -117.4260),
    "richmond, va": (37.5407, -77.4360),
    "baton rouge, la": (30.4515, -91.1871),
    "des moines, ia": (41.5868, -93.6250),
    "birmingham, al": (33.5186, -86.8104),
    "huntsville, al": (34.7304, -86.5861),
    "tacoma, wa": (47.2529, -122.4443),
    "fayetteville, nc": (35.0527, -78.8784),
    "knoxville, tn": (35.9606, -83.9207),
    "little rock, ar": (34.7465, -92.2896),
    "grand rapids, mi": (42.9634, -85.6681),
    "memphis, tn": (35.1495, -90.0490),
    "providence, ri": (41.8240, -71.4128),
    "springfield, mo": (37.2153, -93.2982),
    "hartford, ct": (41.7658, -72.6851),
    "shreveport, la": (32.5252, -93.7502),
    "mobile, al": (30.6954, -88.0399),
    "boise, id": (43.6150, -116.2023),
    "fargo, nd": (46.8772, -96.7898),
    "chattanooga, tn": (35.0456, -85.3097),
    "montgomery, al": (32.3668, -86.3000),
    "amarillo, tx": (35.2220, -101.8313),
    "eugene, or": (44.0521, -123.0868),
    "detroit, mi": (42.3314, -83.0458),
    "rochester, ny": (43.1566, -77.6088),
    "worcester, ma": (42.2626, -71.8023),
    "augusta, ga": (33.4735, -82.0105),
    "tallahassee, fl": (30.4518, -84.2807),
    "fort lauderdale, fl": (26.1224, -80.1373),
    "glendale, az": (33.5387, -112.1860),
    "aurora, co": (39.7294, -104.8319),
    "plano, tx": (33.0198, -96.6989),
    "laredo, tx": (27.5036, -99.5075),
    "corpus christi, tx": (27.8006, -97.3964),
    "irving, tx": (32.8140, -96.9489),
    "garland, tx": (32.9126, -96.6389),
    "fort wayne, in": (41.1306, -85.1289),
    "anchorage, ak": (61.2181, -149.9003),
    # bare city names
    "chicago": (41.8781, -87.6298),
    "new york": (40.7128, -74.0060),
    "los angeles": (34.0522, -118.2437),
    "houston": (29.7604, -95.3698),
    "dallas": (32.7767, -96.7970),
    "miami": (25.7617, -80.1918),
    "seattle": (47.6062, -122.3321),
    "denver": (39.7392, -104.9903),
    "boston": (42.3601, -71.0589),
    "atlanta": (33.7490, -84.3880),
    "detroit": (42.3314, -83.0458),
    "nashville": (36.1627, -86.7816),
    "indianapolis": (39.7684, -86.1581),
    "memphis": (35.1495, -90.0490),
    "phoenix": (33.4484, -112.0740),
    "portland": (45.5051, -122.6750),
    "las vegas": (36.1699, -115.1398),
    "minneapolis": (44.9778, -93.2650),
    "kansas city": (39.0997, -94.5786),
    "austin": (30.2672, -97.7431),
    "san antonio": (29.4241, -98.4936),
    "san diego": (32.7157, -117.1611),
    "san francisco": (37.7749, -122.4194),
    "charlotte": (35.2271, -80.8431),
    "columbus": (39.9612, -82.9988),
    "baltimore": (39.2904, -76.6122),
    "louisville": (38.2527, -85.7585),
    "milwaukee": (43.0389, -87.9065),
    "pittsburgh": (40.4406, -79.9959),
    "cincinnati": (39.1031, -84.5120),
    "cleveland": (41.4993, -81.6944),
    "raleigh": (35.7796, -78.6382),
    "tampa": (27.9506, -82.4572),
    "orlando": (28.5383, -81.3792),
    "richmond": (37.5407, -77.4360),
    "sacramento": (38.5816, -121.4944),
    "oklahoma city": (35.4676, -97.5164),
    "tucson": (32.2226, -110.9747),
    "albuquerque": (35.0844, -106.6504),
    "salt lake city": (40.7608, -111.8910),
    "boise": (43.6150, -116.2023),
    "omaha": (41.2565, -95.9345),
    "wichita": (37.6872, -97.3301),
    "tulsa": (36.1540, -95.9928),
    "st. louis": (38.6270, -90.1994), "st louis": (38.6270, -90.1994),
    "new orleans": (29.9511, -90.0715),
    "little rock": (34.7465, -92.2896),
    "des moines": (41.5868, -93.6250),
    "fargo": (46.8772, -96.7898),
    "baton rouge": (30.4515, -91.1871),
    "birmingham": (33.5186, -86.8104),
    "chattanooga": (35.0456, -85.3097),
    "knoxville": (35.9606, -83.9207),
    "lexington": (38.0406, -84.5037),
    "spokane": (47.6588, -117.4260),
    "reno": (39.5296, -119.8138),
    "colorado springs": (38.8339, -104.8214),
    "amarillo": (35.2220, -101.8313),
}


def geocode(location: str):
    """Nominatim first, then built-in dict."""
    try:
        r = requests.get(
            NOMINATIM_URL,
            params={"q": location, "format": "json", "limit": 1},
            headers=HEADERS,
            timeout=8,
        )
        data = r.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass

    key = location.strip().lower()
    if key in CITY_COORDS:
        return CITY_COORDS[key]

    # Partial match — city name only before the comma
    city_part = key.split(",")[0].strip()
    for k, v in CITY_COORDS.items():
        if k == city_part or k.startswith(city_part + ","):
            return v

    return None


def get_route_osrm(waypoints):
    coords_str = ";".join(f"{lon},{lat}" for lat, lon in waypoints)
    try:
        r = requests.get(
            f"{OSRM_URL}/{coords_str}",
            params={"overview": "full", "geometries": "geojson"},
            headers=HEADERS,
            timeout=12,
        )
        data = r.json()
        if data.get("code") == "Ok" and data.get("routes"):
            route = data["routes"][0]
            return {
                "distance_miles": route["distance"] / 1609.344,
                "coordinates":    route["geometry"]["coordinates"],
            }
    except Exception:
        pass
    return None


def haversine_miles(p1, p2):
    R = 3958.8
    la1, lo1 = math.radians(p1[0]), math.radians(p1[1])
    la2, lo2 = math.radians(p2[0]), math.radians(p2[1])
    a = math.sin((la2-la1)/2)**2 + math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def straight_line_route(waypoints):
    """Haversine with 1.22× road factor + 80-point interpolated path."""
    raw = sum(haversine_miles(waypoints[i], waypoints[i+1]) for i in range(len(waypoints)-1))
    total = raw * 1.22

    coords = []
    for i in range(len(waypoints)-1):
        la1, lo1 = waypoints[i]
        la2, lo2 = waypoints[i+1]
        n = 80
        for j in range(n + (1 if i == len(waypoints)-2 else 0)):
            f = j / n
            coords.append([lo1 + f*(lo2-lo1), la1 + f*(la2-la1)])

    return {"distance_miles": total, "coordinates": coords}


def inject_stop_coords(stops, waypoints, coords, total_miles):
    if not coords or total_miles == 0:
        return
    for stop in stops:
        frac = min(stop["miles"] / total_miles, 1.0)
        idx  = int(frac * (len(coords) - 1))
        stop["coordinates"] = coords[idx]


@api_view(["POST"])
def calculate_trip(request):
    data             = request.data
    current_location = data.get("current_location", "").strip()
    pickup_location  = data.get("pickup_location",  "").strip()
    dropoff_location = data.get("dropoff_location", "").strip()

    try:
        cycle_used = float(data.get("cycle_used", 0))
    except (TypeError, ValueError):
        cycle_used = 0.0

    if not all([current_location, pickup_location, dropoff_location]):
        return Response(
            {"error": "All three location fields are required."},
            status=drf_status.HTTP_400_BAD_REQUEST,
        )
    if not (0 <= cycle_used < 70):
        return Response(
            {"error": "cycle_used must be 0–69.9."},
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    geo_current = geocode(current_location)
    geo_pickup  = geocode(pickup_location)
    geo_dropoff = geocode(dropoff_location)

    missing = [loc for loc, g in [(current_location, geo_current),
                                   (pickup_location,  geo_pickup),
                                   (dropoff_location, geo_dropoff)] if not g]
    if missing:
        return Response(
            {"error": f"Could not geocode: {', '.join(missing)}. Use 'City, ST' format."},
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    waypoints  = [geo_current, geo_pickup, geo_dropoff]
    route_data = get_route_osrm(waypoints) or straight_line_route(waypoints)

    total_miles  = route_data["distance_miles"]
    route_coords = route_data["coordinates"]

    if total_miles < 1:
        return Response({"error": "Locations are too close or identical."}, status=drf_status.HTTP_400_BAD_REQUEST)

    events = simulate_trip(total_miles, cycle_used)
    result = build_response(events, total_miles)

    inject_stop_coords(result["stops"], waypoints, route_coords, total_miles)

    result["route"] = {
        "coordinates":    route_coords,
        "distance_miles": round(total_miles, 1),
        "waypoints": [
            {"name": current_location,  "coordinates": [geo_current[1],  geo_current[0]]},
            {"name": pickup_location,   "coordinates": [geo_pickup[1],   geo_pickup[0]]},
            {"name": dropoff_location,  "coordinates": [geo_dropoff[1],  geo_dropoff[0]]},
        ],
    }

    return Response(result)
