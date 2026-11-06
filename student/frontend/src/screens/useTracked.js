import { useCallback, useEffect, useRef, useState } from 'react';

// Guarded loads for screens that fetch several lists. Each key has its own request id,
// so a late response from an older tab or filter is dropped, and loading/error state
// is set at the start of every load.
// A key that has never loaded counts as loading, so screens never flash an empty state first.
export const loadingOf = (loading) => (key) => loading[key] !== false;

export default function useTracked() {
  const ids = useRef({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  const track = useCallback((key, request, apply) => {
    const id = (ids.current[key] = (ids.current[key] || 0) + 1);
    setLoading((l) => ({ ...l, [key]: true }));
    setErrors((l) => ({ ...l, [key]: null }));
    return request
      .then((res) => {
        if (id === ids.current[key]) apply(res);
      })
      .catch((err) => {
        if (id === ids.current[key]) setErrors((l) => ({ ...l, [key]: err }));
      })
      .finally(() => {
        if (id === ids.current[key]) setLoading((l) => ({ ...l, [key]: false }));
      });
  }, []);

  useEffect(() => {
    const live = ids.current;
    return () => {
      Object.keys(live).forEach((k) => {
        live[k] += 1;
      });
    };
  }, []);

  return { loading, errors, track };
}
