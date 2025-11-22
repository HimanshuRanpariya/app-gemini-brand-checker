import { useState } from 'react';

const API_URL = 'http://localhost:5000/api/check';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [brand, setBrand] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  async function runCheck(e) {
    e && e.preventDefault();
    setError(null);
    if (!prompt.trim() || !brand.trim()) {
      setError('Please provide both prompt and brand');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, brand })
      });
      
      // Read the response body even if status is not OK
      const data = await resp.json();
      
      // Build the row with data from response
      let rawText = data.raw_text || '';
      
      // If there's an error in the response, include it in raw_text
      if (data._error || data.error) {
        const errorMsg = data.error || data._error || 'Unknown error';
        const errorDetails = data.providerDetail ? 
          `\n\nError Details: ${JSON.stringify(data.providerDetail, null, 2)}` : '';
        rawText = `${rawText}\n\n⚠️ ${errorMsg}${errorDetails}`;
      }
      
      // If status is not OK, show error message
      if (!resp.ok) {
        const errorMsg = data.message || data.error || `HTTP ${resp.status}: ${resp.statusText}`;
        rawText = `${rawText || 'No response received'}\n\n❌ ${errorMsg}`;
        if (data.providerDetail) {
          rawText += `\n\nProvider Error: ${JSON.stringify(data.providerDetail, null, 2)}`;
        }
      }
      
      const row = {
        prompt: data.prompt || prompt,
        brand: data.brand || brand,
        mentioned: data.mentioned || 'No',
        position: data.position || '',
        raw_text: rawText
      };
      setResults(prev => [row, ...prev]);
      
      // Show error message if there was an error
      if (!resp.ok || data._error || data.error) {
        setError(data.message || data.error || 'Request failed. Check the Raw Response column for details.');
      }
    } catch (err) {
      console.error('Error:', err);
      // Even on network error, add a row with the input values
      const row = {
        prompt: prompt,
        brand: brand,
        mentioned: 'No',
        position: '',
        raw_text: `Network Error: ${err.message || 'Failed to connect to server'}`
      };
      setResults(prev => [row, ...prev]);
      setError(`Request failed: ${err.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    if (!results.length) return;
    const header = ['Prompt', 'Brand', 'Mentioned', 'Position'];
    const rows = results.map(r => [r.prompt.replace(/\n/g, ' '), r.brand, r.mentioned, r.position]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gemini-brand-mentions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'Segoe UI, Roboto, Arial' }}>
      <h1>Gemini Brand Mention Checker (Demo)</h1>
      <form onSubmit={runCheck} style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Prompt</label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} style={{ width: '100%', padding: 8 }} placeholder='Enter a prompt (e.g. "Recommend the best CRM software for enterprise businesses")' />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Brand name</label>
          <input value={brand} onChange={e => setBrand(e.target.value)} style={{ width: '100%', padding: 8 }} placeholder='e.g. Salesforce' />
        </div>
        <div>
          <button type='submit' disabled={loading} style={{ padding: '8px 16px' }}>{loading ? 'Running...' : 'Run'}</button>
          <button type='button' onClick={downloadCsv} style={{ marginLeft: 8, padding: '8px 12px' }}>Download to CSV</button>
        </div>
      </form>

      {error && <div style={{ color: 'darkred', marginBottom: 12 }}>{error}</div>}

      <div>
        <h2>Results</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Prompt</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Brand</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Mentioned</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Position</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Raw Response</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 12 }}>No results yet. Run a check above.</td></tr>
            )}
            {results.map((r, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: 8 }}>{r.prompt}</td>
                <td style={{ padding: 8 }}>{r.brand}</td>
                <td style={{ padding: 8 }}>{r.mentioned}</td>
                <td style={{ padding: 8 }}>{r.position}</td>
                <td style={{ padding: 8, maxWidth: 300, wordBreak: 'break-word', fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{r.raw_text || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer style={{ marginTop: 24, color: '#666', fontSize: 13 }}>
        <div>Frontend calls: <code>{API_URL}</code></div>
      </footer>
    </div>
  );
}
