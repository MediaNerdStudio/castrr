import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPodcasts, deletePodcast, getRssUrl } from '../../api.js';
import { Rss, Pencil, Trash2, Plus, Upload, List, Share2 } from 'lucide-react';
import { formatDate } from '../../utils/format.js';
import EmbedBuilder from '../../components/EmbedBuilder.jsx';

function AdminDashboard() {
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [embedPodcast, setEmbedPodcast] = useState(null);

  useEffect(() => {
    loadPodcasts();
  }, []);

  async function loadPodcasts() {
    setLoading(true);
    try {
      const data = await getPodcasts();
      setPodcasts(data);
    } finally {
      setLoading(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this podcast and all its episodes?')) return;
    await deletePodcast(id);
    await loadPodcasts();
  }

  if (loading) return <div className="loading loading-lg"></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Podcasts</h1>
        <Link to="/admin/podcast/new" className="btn btn-primary"><Plus size={18} /> New podcast</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {podcasts.map(podcast => (
          <div key={podcast.id} className="card bg-base-100 shadow">
            <figure className="h-40">
              <img src={podcast.artwork || '/default-cover.svg'} alt={podcast.title} className="w-full h-full object-cover" />
            </figure>
            <div className="card-body">
              <h2 className="card-title">{podcast.title}</h2>
              <p className="text-sm opacity-70 line-clamp-2">{podcast.description}</p>
              <p className="text-xs opacity-50">Updated {formatDate(podcast.updatedAt)}</p>

              {(podcast.groups || []).length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold uppercase opacity-60">Groups</p>
                  <div className="flex flex-wrap gap-1">
                    {podcast.groups.map(g => (
                      <a key={g.id} href={getRssUrl(podcast.slug, g.slug)} target="_blank" rel="noreferrer" className="badge badge-outline badge-sm gap-1">
                        <Rss size={10} /> {g.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="card-actions justify-between mt-2">
                <div className="flex gap-1">
                  <Link to={`/admin/podcast/${podcast.id}`} className="btn btn-sm btn-ghost"><Pencil size={16} /></Link>
                  <Link to={`/admin/podcast/${podcast.id}/episodes`} className="btn btn-sm btn-ghost"><List size={16} /></Link>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEmbedPodcast(podcast)}><Share2 size={16} /></button>
                  <button className="btn btn-sm btn-ghost text-error" onClick={() => remove(podcast.id)}><Trash2 size={16} /></button>
                </div>
                <div className="flex gap-1">
                  <Link to={`/admin/import?podcast=${podcast.id}`} className="btn btn-sm btn-ghost"><Upload size={16} /></Link>
                  <a href={getRssUrl(podcast.slug)} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost"><Rss size={16} /> RSS</a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {podcasts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg opacity-60 mb-4">No podcasts yet.</p>
          <Link to="/admin/podcast/new" className="btn btn-primary">Create your first podcast</Link>
        </div>
      )}

      {embedPodcast && <EmbedBuilder podcast={embedPodcast} onClose={() => setEmbedPodcast(null)} />}
    </div>
  );
}

export default AdminDashboard;
