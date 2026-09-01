import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../../api.js';
import { formatDate } from '../../utils/format.js';
import { Headphones, Download } from 'lucide-react';

function Stats() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getStats()
      .then(data => setStats(data.stats || []))
      .catch(err => setError(err?.response?.data?.error || 'Could not load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading loading-lg"></div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  const totalPlays = stats.reduce((sum, s) => sum + s.plays, 0);
  const totalDownloads = stats.reduce((sum, s) => sum + s.downloads, 0);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Episode stats</h1>
        <Link to="/admin" className="btn btn-ghost btn-sm">Back to dashboard</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card bg-base-100 shadow p-4">
          <div className="flex items-center gap-3">
            <Headphones size={24} className="text-primary" />
            <div>
              <p className="text-sm opacity-70">Total plays</p>
              <p className="text-2xl font-bold">{totalPlays}</p>
            </div>
          </div>
        </div>
        <div className="card bg-base-100 shadow p-4">
          <div className="flex items-center gap-3">
            <Download size={24} className="text-secondary" />
            <div>
              <p className="text-sm opacity-70">Total downloads</p>
              <p className="text-2xl font-bold">{totalDownloads}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Episode</th>
              <th className="w-24 text-right">Plays</th>
              <th className="w-24 text-right">Downloads</th>
              <th>Latest client</th>
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 && (
              <tr><td colSpan="4" className="text-center opacity-60 py-8">No stats yet.</td></tr>
            )}
            {stats.map(s => {
              const latest = s.recent?.[0];
              return (
                <tr key={s.episodeId}>
                  <td className="font-semibold">{s.episodeTitle || s.episodeId}</td>
                  <td className="text-right">{s.plays}</td>
                  <td className="text-right">{s.downloads}</td>
                  <td className="text-xs opacity-80">
                    {latest ? (
                      <>
                        <span className="font-mono">{latest.ip}</span>
                        {latest.country && <span className="ml-2">({latest.country})</span>}
                        <br />
                        <span className="opacity-60">{latest.userAgent}</span>
                        <br />
                        <span className="opacity-60">{formatDate(latest.createdAt)}</span>
                      </>
                    ) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Stats;
