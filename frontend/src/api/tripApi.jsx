import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

export const calculateTrip = async (payload) => {
  const res = await axios.post(`${BASE}/api/calculate-trip/`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });
  return res.data;
};
