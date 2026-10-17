export async function getAi() {
  if (typeof window !== 'undefined' && window.claude && window.claude.use) {
    const s = await window.claude.use('sample');
    if (s) { s.viaClaude = true; return s; }
  }
  const endpoint = import.meta.env.VITE_AI_ENDPOINT || '/api/fazit';
  try {
    const probe = await fetch(endpoint, { method: 'GET' });
    if (!probe.ok) return null;
    const info = await probe.json();
    if (!info.configured) return null;
  } catch {
    return null;
  }
  const json = async (prompt, opts = {}) => {
    let res;
    try {
      res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }), signal: opts.signal });
    } catch (e) {
      throw { code: e && e.name === 'AbortError' ? 'cancelled' : 'upstream_error' };
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { code: err.error || 'upstream_error' };
    }
    try { return await res.json(); } catch { throw { code: 'invalid_json' }; }
  };
  return { json };
}
