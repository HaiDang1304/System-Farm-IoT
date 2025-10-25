import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { REFRESH_INTERVAL } from "../config";
import { fetchSensorData } from "../services/api";

const normalizeEntry = (entry) => {
  if (!entry) return { timestamp: null };

  if (entry.timestamp?._seconds) {
    const seconds = entry.timestamp._seconds;
    return {
      ...entry,
      timestamp: new Date(seconds * 1000).toISOString(),
    };
  }

  return {
    ...entry,
    timestamp: entry.timestamp || null,
  };
};

export const useSensorData = (intervalMs = REFRESH_INTERVAL) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchSensorData();
      const normalized = response.map(normalizeEntry);
      setData(normalized);
    } catch (err) {
      console.error("Không thể tải dữ liệu cảm biến:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    intervalRef.current = setInterval(loadData, intervalMs);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMs, loadData]);

  const latest = useMemo(() => (data.length > 0 ? data[0] : null), [data]);

  return {
    data,
    latest,
    loading,
    error,
    refresh: loadData,
  };
};
