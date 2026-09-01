import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPodcasts, createPodcast, updatePodcast, uploadFile } from '../../api.js';
import EmbedBuilder from '../../components/EmbedBuilder.jsx';

const emptyGroup = { title: '', slug: '', description: '', type: 'season', artwork: '' };

function PodcastEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    author: '',
    email: '',
    language: 'en',
    explicit: false,
    hidden: false,
    categories: '',
    tags: '',
    artwork: '',
    spotifyPlaylist: '',
    groups: []
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showEmbed, setShowEmbed] = useState(false);

  useEffect(() => {
    if (!isNew) getPodcastById(id);
  }, [id, isNew]);

  async function getPodcastById(pid) {
    const pods = await getPodcasts();
    const data = pods.find(p => p.id === pid);
    if (data) setForm({
      ...data,
      categories: (data.categories || []).join(', '),
      tags: (data.tags || []).join(', '),
      groups: data.groups || []
    });
  }

  async function handleArtwork(e, setter) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFile(file, 'artwork');
      setter(res.url);
    } finally {
      setUploading(false);
    }
  }

  function updateGroup(index, field, value) {
    setForm(f => ({
      ...f,
      groups: f.groups.map((g, i) => i === index ? { ...g, [field]: value } : g)
    }));
  }

  function addGroup() {
    setForm(f => ({ ...f, groups: [...f.groups, { ...emptyGroup }] }));
  }

  function removeGroup(index) {
    setForm(f => ({ ...f, groups: f.groups.filter((_, i) => i !== index) }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      categories: form.categories.split(',').map(s => s.trim()).filter(Boolean),
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
      groups: form.groups.map(g => ({ ...g, title: g.title.trim() })).filter(g => g.title)
    };
    try {
      if (isNew) {
        const created = await createPodcast(payload);
        navigate(`/admin/podcast/${created.id}`);
      } else {
        await updatePodcast(id, payload);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{isNew ? 'New podcast' : 'Edit podcast'}</h1>
        <Link to="/admin" className="btn btn-ghost btn-sm">Back</Link>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}
      <form onSubmit={submit} className="card bg-base-100 shadow p-6 space-y-6">
        <label className="form-control">
          <span className="label-text font-semibold">Title</span>
          <input className="input input-bordered" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        </label>

        <label className="form-control">
          <span className="label-text font-semibold">Slug</span>
          <input className="input input-bordered" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated if empty" />
        </label>

        <label className="form-control">
          <span className="label-text font-semibold">Description</span>
          <textarea className="textarea textarea-bordered h-24" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </label>

        <label className="form-control">
          <span className="label-text font-semibold">Spotify playlist URL or ID</span>
          <input
            className="input input-bordered"
            value={form.spotifyPlaylist}
            onChange={e => setForm(f => ({ ...f, spotifyPlaylist: e.target.value }))}
            placeholder="https://open.spotify.com/playlist/..."
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text font-semibold">Author / Artist</span>
            <input className="input input-bordered" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
          </label>
          <label className="form-control">
            <span className="label-text font-semibold">Contact email</span>
            <input type="email" className="input input-bordered" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="form-control">
            <span className="label-text font-semibold">Language</span>
            <input className="input input-bordered" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} />
          </label>
          <label className="form-control">
            <span className="label-text font-semibold">Explicit</span>
            <select className="select select-bordered" value={form.explicit} onChange={e => setForm(f => ({ ...f, explicit: e.target.value === 'true' }))}>
              <option value="false">Clean</option>
              <option value="true">Explicit</option>
            </select>
          </label>
          <label className="form-control">
            <span className="label-text font-semibold">Visibility</span>
            <select className="select select-bordered" value={form.hidden} onChange={e => setForm(f => ({ ...f, hidden: e.target.value === 'true' }))}>
              <option value="false">Public</option>
              <option value="true">Hidden</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text font-semibold">Categories (comma separated)</span>
            <input className="input input-bordered" value={form.categories} onChange={e => setForm(f => ({ ...f, categories: e.target.value }))} />
          </label>
          <label className="form-control">
            <span className="label-text font-semibold">Tags (comma separated)</span>
            <input className="input input-bordered" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          </label>
        </div>

        <div className="form-control">
          <span className="label-text font-semibold">Artwork</span>
          <input type="file" accept="image/*" className="file-input file-input-bordered w-full" onChange={e => handleArtwork(e, url => setForm(f => ({ ...f, artwork: url })))} />
          {uploading && <span className="loading loading-sm mt-2"></span>}
          {form.artwork && <img src={form.artwork} alt="Artwork preview" className="mt-4 w-40 rounded-lg" />}
        </div>

        <div className="bg-base-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Seasons / Shows</h2>
            <button type="button" className="btn btn-sm btn-secondary" onClick={addGroup}>Add group</button>
          </div>
          {form.groups.map((g, i) => (
            <div key={i} className="card bg-base-100 p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="form-control">
                  <span className="label-text font-semibold">Title</span>
                  <input className="input input-bordered" value={g.title} onChange={e => updateGroup(i, 'title', e.target.value)} placeholder="Season 1 / Best Of" />
                </label>
                <label className="form-control">
                  <span className="label-text font-semibold">Slug</span>
                  <input className="input input-bordered" value={g.slug} onChange={e => updateGroup(i, 'slug', e.target.value)} placeholder="auto-generated if empty" />
                </label>
              </div>
              <label className="form-control">
                <span className="label-text font-semibold">Description</span>
                <textarea className="textarea textarea-bordered" value={g.description} onChange={e => updateGroup(i, 'description', e.target.value)} />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="form-control">
                  <span className="label-text font-semibold">Type</span>
                  <select className="select select-bordered" value={g.type} onChange={e => updateGroup(i, 'type', e.target.value)}>
                    <option value="season">Season</option>
                    <option value="show">Show</option>
                  </select>
                </label>
                <div className="form-control">
                  <span className="label-text font-semibold">Group artwork (optional)</span>
                  <input type="file" accept="image/*" className="file-input file-input-bordered w-full" onChange={e => handleArtwork(e, url => updateGroup(i, 'artwork', url))} />
                  {g.artwork && <img src={g.artwork} alt="Group artwork" className="mt-2 w-20 rounded" />}
                </div>
              </div>
              <button type="button" className="btn btn-sm btn-ghost text-error self-start" onClick={() => removeGroup(i)}>Remove group</button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-4">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="loading loading-sm"></span> : 'Save podcast'}
          </button>
          {!isNew && (
            <>
              <Link to={`/admin/podcast/${id}/episode/new`} className="btn btn-secondary">Add episode</Link>
              <Link to={`/admin/podcast/${id}/episodes`} className="btn btn-info">Episodes</Link>
              <button type="button" className="btn btn-ghost" onClick={() => setShowEmbed(true)}>Embed</button>
              <Link to={`/admin/import?podcast=${id}`} className="btn btn-accent">Batch import</Link>
            </>
          )}
        </div>
      </form>

      {showEmbed && <EmbedBuilder podcast={form} onClose={() => setShowEmbed(false)} />}
    </div>
  );
}

export default PodcastEditor;
