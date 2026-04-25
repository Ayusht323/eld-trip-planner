# TruckerELD — ELD Trip Planner

Full-stack ELD / HOS trip planning app built with **Django REST Framework** (backend) and **React + Vite** (frontend).

## Features
- 📍 **Geocoding** via Nominatim (OpenStreetMap) with 200+ city fallback
- 🗺️ **Route map** with Leaflet + OSRM routing (fallback: haversine × 1.22)
- 📋 **ELD log sheets** drawn on HTML Canvas — one per day, FMCSA-style
- ⏱️ **Full HOS simulation**: 11-hr drive, 14-hr window, 10-hr rest, 30-min break @ 8 hrs
- ⛽ **Fuel stops** every 1,000 miles
- 📦 **1-hr pickup + 1-hr dropoff** built-in
- 🔄 **70-hr/8-day cycle** with optional pre-used hours
- 📊 **Summary panel** with time-allocation bar, stop timeline, and stop table

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env        # set VITE_API_URL if backend not on localhost
npm run dev
```

Open http://localhost:3000

## Deployment

### Backend → Railway
1. Push `backend/` to a GitHub repo
2. New Railway project → "Deploy from GitHub"
3. Set env vars: `DJANGO_SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS=<your-domain>`
4. Railway auto-detects `Procfile` / `railway.toml`

### Frontend → Vercel
1. Push `frontend/` to a GitHub repo  
2. New Vercel project → import repo  
3. Set env var: `VITE_API_URL=https://your-backend.railway.app`
4. Vercel uses `vercel.json` + Vite preset automatically

## HOS Rules Applied
| Rule | Limit |
|------|-------|
| Max driving/shift | 11 hours |
| On-duty window | 14 hours |
| Mandatory break | 30 min after 8 hrs driving |
| Off-duty rest | 10 hours |
| Cycle | 70 hrs / 8 days |
| Cycle restart | 34-hour off-duty |
| Fuel stop | Every 1,000 miles (30 min) |
| Speed assumption | 55 mph average |

## Tech Stack
- **Backend**: Django 4.2, Django REST Framework, `requests`, Nominatim geocoding, OSRM routing
- **Frontend**: React 18, Vite 5, Leaflet (map), HTML Canvas (ELD log sheets), Axios
- **Maps**: OpenStreetMap tiles via CartoDB dark theme; OSRM for routing
