import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPodcasts, getAllEpisodes, getEpisodeById, createEpisode, updateEpisode, uploadFile } from '../../api.js';

function EpisodeEditor() {
  const { id, podcastId } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new' || !id;
  const audioRef = useRef(null);

  const [form, setForm] = useState({
    podcastId: podcastId || '',
    groupId: '',
    title: '',
    slug: '',
    description: '',
    publishedAt: new Date().toISOString().slice(0, 16),
    duration: 0,
    explicit: false,
    draft: false,
    artwork: '',
    audioUrl: '',
    mimeType: 'audio/mpeg',
    fileSize: 0,
    tags: '',
    spotifyPlaylist: '',
    chapters: [],
    tracklist: []
  });
  const [podcasts, setPodcasts] = useState([]);
  const selectedPodcast = podcasts.find(p => p.id === form.podcastId);
  const [uploading, setUploading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterStart, setChapterStart] = useState('');
  const [trackArtist, setTrackArtist] = useState('');
  const [trackTitle, setTrackTitle] = useState('');
  const [trackStart, setTrackStart] = useState('');
  const [trackDuration, setTrackDuration] = useState('');
  const [trackSpotifyId, setTrackSpotifyId] = useState('');

  useEffect(() => {
    loadPodcasts();
    if (!isNew) {
      findEpisode(id);
    }
  }, [id, isNew]);

  async function loadPodcasts() {
    const data = await getPodcasts();
    setPodcasts(data);
  }

  async function findEpisode(eid) {
    try {
      const ep = await getEpisodeById(eid);
      setForm({ ...ep, tags: (ep.tags || []).join(', ') });
    } catch {
      // fallback: scan all episodes if id route is unavailable
      const data = await getAllEpisodes();
      const ep = data.find(e => e.id === eid);
      if (ep) setForm({ ...ep, tags: (ep.tags || []).join(', ') });
    }
  }

  async function handleAudio(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFile(file, 'audio');
      const url = res.url;
      setForm(f => ({ ...f, audioUrl: url, peaksUrl: res.peaksUrl || '', mimeType: res.mimeType, fileSize: res.size }));
      // Detect duration once loaded
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        setForm(f => ({ ...f, duration: Math.round(audio.duration) }));
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleArtwork(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFile(file, 'artwork');
      setForm(f => ({ ...f, artwork: res.url }));
    } finally {
      setUploading(false);
    }
  }

  function addChapter() {
    if (!chapterTitle || chapterStart === '') return;
    const chapters = [...form.chapters, { title: chapterTitle, start: parseFloat(chapterStart) }]
      .sort((a, b) => a.start - b.start);
    setForm(f => ({ ...f, chapters }));
    setChapterTitle('');
    setChapterStart('');
  }

  function removeChapter(i) {
    setForm(f => ({ ...f, chapters: f.chapters.filter((_, idx) => idx !== i) }));
  }

  function parseTimeToSeconds(value) {
    const str = String(value || '').trim();
    if (!str) return 0;
    const parts = str.split(':');
    if (parts.length === 2) {
      const minutes = parseFloat(parts[0]) || 0;
      const seconds = parseFloat(parts[1]) || 0;
      return Math.round((minutes * 60 + seconds) * 1000) / 1000;
    }
    return parseFloat(str) || 0;
  }

  function addTrack() {
    if (!trackTitle || trackStart === '') return;
    const track = {
      artist: trackArtist.trim(),
      title: trackTitle.trim(),
      start: parseTimeToSeconds(trackStart),
      duration: parseTimeToSeconds(trackDuration),
      spotifyId: trackSpotifyId.trim() || ''
    };
    const tracklist = [...form.tracklist || [], track].sort((a, b) => a.start - b.start);
    setForm(f => ({ ...f, tracklist }));
    setTrackArtist('');
    setTrackTitle('');
    setTrackStart('');
    setTrackDuration('');
    setTrackSpotifyId('');
  }

  function removeTrack(i) {
    setForm(f => ({ ...f, tracklist: (f.tracklist || []).filter((_, idx) => idx !== i) }));
  }

  function parseMarkerFile(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];
    const header = lines[0].split('\t');
    const idx = {
      name: header.findIndex(h => h.trim().toLowerCase() === 'name'),
      start: header.findIndex(h => h.trim().toLowerCase() === 'start'),
      duration: header.findIndex(h => h.trim().toLowerCase() === 'duration'),
      description: header.findIndex(h => h.trim().toLowerCase() === 'description')
    };
    const tracks = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('\t');
      const name = cols[idx.name] || '';
      if (!name.trim()) continue;
      const artistSep = name.indexOf(' - ');
      const artist = artistSep >= 0 ? name.slice(0, artistSep).trim() : '';
      const title = artistSep >= 0 ? name.slice(artistSep + 3).trim() : name.trim();
      tracks.push({
        artist,
        title,
        start: parseTimeToSeconds(cols[idx.start]),
        duration: parseTimeToSeconds(cols[idx.duration]),
        spotifyId: (cols[idx.description] || '').trim()
      });
    }
    return tracks;
  }

  function handleTracklistFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const parsed = parseMarkerFile(String(event.target.result));
      const tracklist = [...(form.tracklist || []), ...parsed].sort((a, b) => a.start - b.start);
      setForm(f => ({ ...f, tracklist }));
    };
    reader.readAsText(file);
  }

  async function fetchSpotifyMetadata() {
    if (isNew || !id) return;
    setEnriching(true);
    setError('');
    try {
      const res = await fetch(`/api/episodes/${id}/enrich-tracklist`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enrichment failed');
      setForm(f => ({ ...f, tracklist: data.tracklist || [] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnriching(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    const payload = {
      ...form,
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
      duration: parseInt(form.duration || 0, 10)
    };
    try {
      if (isNew) {
        const created = await createEpisode(payload);
        navigate(`/admin/episode/${created.id}`);
      } else {
        const updated = await updateEpisode(id, payload);
        setForm({ ...updated, tags: (updated.tags || []).join(', ') });
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Save failed');
    }
  }

  return (
    <div className="mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{isNew ? 'New episode' : 'Edit episode'}</h1>
        <Link to={form.podcastId || podcastId ? `/admin/podcast/${form.podcastId || podcastId}/episodes` : '/admin'} className="btn btn-ghost btn-sm">Back</Link>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}
      <form onSubmit={submit} className="card bg-base-100 shadow p-6 space-y-4">
        <label className="form-control">
          <span className="label-text font-semibold">Podcast</span>
          <select className="select select-bordered select-sm" value={form.podcastId} onChange={e => setForm(f => ({ ...f, podcastId: e.target.value, groupId: '' }))} required>
            <option value="">Select podcast</option>
            {podcasts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>

        {selectedPodcast?.groups?.length > 0 && (
          <label className="form-control">
            <span className="label-text font-semibold">Season / Show</span>
            <select className="select select-bordered select-sm" value={form.groupId} onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))}>
              <option value="">Main feed / none</option>
              {selectedPodcast.groups.map(g => <option key={g.id} value={g.id}>{g.title} ({g.type})</option>)}
            </select>
          </label>
        )}

        <label className="form-control">
          <span className="label-text font-semibold">Title</span>
          <input className="input input-bordered input-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        </label>

        <label className="form-control">
          <span className="label-text font-semibold">Slug</span>
          <input className="input input-bordered input-sm" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated if empty" />
        </label>

        <label className="form-control">
          <span className="label-text font-semibold">Description</span>
          <textarea className="textarea textarea-bordered textarea-sm h-24" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text font-semibold">Publish date</span>
            <input
              type="datetime-local"
              className="input input-bordered input-sm"
              value={form.publishedAt ? form.publishedAt.replace(/\.\d{3}Z$/, '').slice(0, 16) : ''}
              onChange={e => setForm(f => ({ ...f, publishedAt: e.target.value ? `${e.target.value}:00.000Z` : '' }))}
            />
          </label>
          <label className="form-control">
            <span className="label-text font-semibold">Duration (seconds)</span>
            <input type="number" className="input input-bordered input-sm" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="form-control">
            <span className="label-text font-semibold">Explicit</span>
            <select className="select select-bordered select-sm" value={form.explicit} onChange={e => setForm(f => ({ ...f, explicit: e.target.value === 'true' }))}>
              <option value="false">Clean</option>
              <option value="true">Explicit</option>
            </select>
          </label>
          <label className="form-control">
            <span className="label-text font-semibold">Status</span>
            <select className="select select-bordered select-sm" value={form.draft} onChange={e => setForm(f => ({ ...f, draft: e.target.value === 'true' }))}>
              <option value="false">Published</option>
              <option value="true">Draft</option>
            </select>
          </label>
          <label className="form-control">
            <span className="label-text font-semibold">Tags</span>
            <input className="input input-bordered input-sm" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="comma separated" />
          </label>
        </div>

        <label className="form-control">
          <span className="label-text font-semibold">Spotify playlist</span>
          <input className="input input-bordered input-sm" value={form.spotifyPlaylist} onChange={e => setForm(f => ({ ...f, spotifyPlaylist: e.target.value }))} placeholder="https://open.spotify.com/playlist/..." />
        </label>

        <div className="form-control">
          <span className="label-text font-semibold">Episode artwork (optional)</span>
          <input type="file" accept="image/*" className="file-input file-input-bordered file-input-sm w-full" onChange={handleArtwork} />
          {form.artwork && <img src={form.artwork} alt="Episode artwork" className="mt-4 w-32 rounded-lg" />}
        </div>

        <div className="form-control">
          <span className="label-text font-semibold">Audio file</span>
          <input type="file" accept="audio/*" className="file-input file-input-bordered file-input-sm w-full" onChange={handleAudio} />
          {uploading && <span className="loading loading-sm mt-2"></span>}
          {form.audioUrl && <audio ref={audioRef} src={form.audioUrl} controls className="mt-4 w-full" />}
        </div>

        <div className="bg-base-200 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold">Chapters</h4>
          <div className="flex gap-2">
            <input type="text" placeholder="Chapter title" className="input input-bordered input-sm flex-1" value={chapterTitle} onChange={e => setChapterTitle(e.target.value)} />
            <input type="number" step="0.1" placeholder="Start (s)" className="input input-bordered input-sm w-32" value={chapterStart} onChange={e => setChapterStart(e.target.value)} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addChapter}>Add</button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-base-300">
            <table className="table table-sm w-full [&_tbody_tr:nth-child(odd)]:bg-base-200/80">
              <thead>
                <tr>
                  <th>Title</th>
                  <th className="w-32">Start</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {form.chapters.map((c, i) => (
                  <tr key={i}>
                    <td className="truncate max-w-xs">{c.title}</td>
                    <td>{c.start}s</td>
                    <td><button type="button" className="btn btn-xs btn-ghost text-error" onClick={() => removeChapter(i)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-base-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Tracklist</h4>
            <div className="flex items-center gap-2">
              {!isNew && (
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={fetchSpotifyMetadata}
                  disabled={enriching || !(form.tracklist || []).some(t => t.spotifyId)}
                >
                  {enriching ? 'Fetching…' : 'Fetch Spotify metadata'}
                </button>
              )}
              <label className="btn btn-xs btn-outline">
                Import marker file
                <input type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleTracklistFile} />
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input type="text" placeholder="Artist" className="input input-bordered input-sm flex-1 min-w-[7rem]" value={trackArtist} onChange={e => setTrackArtist(e.target.value)} />
            <input type="text" placeholder="Title" className="input input-bordered input-sm flex-1 min-w-[7rem]" value={trackTitle} onChange={e => setTrackTitle(e.target.value)} />
            <input type="text" placeholder="Start" className="input input-bordered input-sm w-24" value={trackStart} onChange={e => setTrackStart(e.target.value)} />
            <input type="text" placeholder="Duration" className="input input-bordered input-sm w-24" value={trackDuration} onChange={e => setTrackDuration(e.target.value)} />
            <input type="text" placeholder="Spotify ID" className="input input-bordered input-sm flex-1 min-w-[8rem]" value={trackSpotifyId} onChange={e => setTrackSpotifyId(e.target.value)} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addTrack}>Add</button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-base-300">
            <table className="table table-sm w-full [&_tbody_tr:nth-child(odd)]:bg-base-200/80">
              <thead>
                <tr>
                  <th>Artist</th>
                  <th>Title</th>
                  <th className="w-24">Start</th>
                  <th className="w-24">Duration</th>
                  <th className="w-32">Spotify</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {(form.tracklist || []).map((t, i) => (
                  <tr key={i}>
                    <td className="truncate max-w-xs">{t.artist}</td>
                    <td className="truncate max-w-xs">{t.title}</td>
                    <td>{t.start}s</td>
                    <td>{t.duration ? `${t.duration}s` : '-'}</td>
                    <td className="truncate max-w-[15rem]">{t.spotifyId || '-'}</td>
                    <td><button type="button" className="btn btn-xs btn-ghost text-error" onClick={() => removeTrack(i)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button type="submit" className="btn btn-primary">{isNew ? 'Create episode' : 'Save episode'}</button>
      </form>
    </div>
  );
}

export default EpisodeEditor;
