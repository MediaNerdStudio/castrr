import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getPodcasts, getImportFiles, runBatchImport } from '../../api.js';
import { Check, X, Loader2, Music, AlertCircle } from 'lucide-react';

const FILE_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  IMPORTING: 'importing',
  DONE: 'done',
  ERROR: 'error',
  SKIPPED: 'skipped'
};

function BatchImport() {
  const [searchParams] = useSearchParams();
  const preselectedPodcast = searchParams.get('podcast');

  const [podcasts, setPodcasts] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [fileStatus, setFileStatus] = useState({});
  const [podcastId, setPodcastId] = useState(preselectedPodcast || '');
  const [groupId, setGroupId] = useState('');
  const [defaults, setDefaults] = useState({
    description: '',
    explicit: false,
    draft: false,
    tags: '',
    publishedAt: new Date().toISOString().slice(0, 16)
  });
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState([]);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    getPodcasts().then(data => {
      setPodcasts(data);
      if (!podcastId && data.length > 0) setPodcastId(data[0].id);
    });
    loadFiles();
  }, [podcastId]);

  async function loadFiles() {
    const data = await getImportFiles();
    setFiles(data);
    const status = {};
    for (const f of data) status[f.name] = FILE_STATUS.PENDING;
    setFileStatus(status);
  }

  const selectedPodcast = podcasts.find(p => p.id === podcastId);

  function toggleFile(name) {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function selectAll() {
    setSelectedFiles(new Set(files.map(f => f.name)));
  }

  function deselectAll() {
    setSelectedFiles(new Set());
  }

  async function handleImport() {
    if (selectedFiles.size === 0) return;

    const toImport = Array.from(selectedFiles);
    setImporting(true);
    setResults([]);
    setOverallProgress(0);

    // Mark queued files
    setFileStatus(prev => {
      const next = { ...prev };
      for (const name of toImport) next[name] = FILE_STATUS.QUEUED;
      return next;
    });

    const finished = [];

    for (let i = 0; i < toImport.length; i++) {
      const filename = toImport[i];

      setFileStatus(prev => ({ ...prev, [filename]: FILE_STATUS.IMPORTING }));

      try {
        const res = await runBatchImport({
          podcastId,
          groupId: groupId || undefined,
          files: [filename],
          defaults: {
            description: defaults.description,
            explicit: defaults.explicit,
            draft: defaults.draft,
            tags: defaults.tags.split(',').map(s => s.trim()).filter(Boolean),
            publishedAt: defaults.publishedAt
          }
        });

        const result = res.results[0];
        if (result.status === 'imported') {
          setFileStatus(prev => ({ ...prev, [filename]: FILE_STATUS.DONE }));
          finished.push({ ok: true, filename, episode: result.episode });
        } else {
          setFileStatus(prev => ({ ...prev, [filename]: FILE_STATUS.SKIPPED }));
          finished.push({ ok: false, filename, reason: result.reason || 'skipped' });
        }
      } catch (err) {
        const message = err?.response?.data?.error || err.message || 'Import failed';
        setFileStatus(prev => ({ ...prev, [filename]: FILE_STATUS.ERROR }));
        finished.push({ ok: false, filename, reason: message });
      }

      setOverallProgress(Math.round(((i + 1) / toImport.length) * 100));
      setResults([...finished]);
    }

    setImporting(false);
    loadFiles();
  }

  function StatusBadge({ status }) {
    switch (status) {
      case FILE_STATUS.DONE:
        return <span className="badge badge-sm badge-success gap-1"><Check size={12} /> Done</span>;
      case FILE_STATUS.ERROR:
        return <span className="badge badge-sm badge-error gap-1"><AlertCircle size={12} /> Error</span>;
      case FILE_STATUS.SKIPPED:
        return <span className="badge badge-sm badge-warning gap-1"><X size={12} /> Skipped</span>;
      case FILE_STATUS.IMPORTING:
        return <span className="badge badge-sm badge-info gap-1"><Loader2 className="animate-spin" size={12} /> Importing</span>;
      case FILE_STATUS.QUEUED:
        return <span className="badge badge-sm badge-ghost gap-1"><Music size={12} /> Queued</span>;
      default:
        return <span className="badge badge-sm badge-ghost">Pending</span>;
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Batch import episodes</h1>
        <Link to="/admin" className="btn btn-ghost btn-sm">Back</Link>
      </div>

      <div className="card bg-base-100 shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text font-semibold">Podcast</span>
            <select className="select select-bordered" value={podcastId} onChange={e => { setPodcastId(e.target.value); setGroupId(''); }}>
              <option value="">Select podcast</option>
              {podcasts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </label>
          <label className="form-control">
            <span className="label-text font-semibold">Season / Show (optional)</span>
            <select className="select select-bordered" value={groupId} onChange={e => setGroupId(e.target.value)} disabled={!selectedPodcast?.groups?.length}>
              <option value="">None / main feed</option>
              {(selectedPodcast?.groups || []).map(g => <option key={g.id} value={g.id}>{g.title} ({g.type})</option>)}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="form-control md:col-span-2">
            <span className="label-text font-semibold">Default description</span>
            <textarea className="textarea textarea-bordered" value={defaults.description} onChange={e => setDefaults(d => ({ ...d, description: e.target.value }))} />
          </label>
          <label className="form-control">
            <span className="label-text font-semibold">Default tags</span>
            <input className="input input-bordered" value={defaults.tags} onChange={e => setDefaults(d => ({ ...d, tags: e.target.value }))} placeholder="comma separated" />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="form-control">
            <span className="label-text font-semibold">Publish date</span>
            <input type="datetime-local" className="input input-bordered" value={defaults.publishedAt} onChange={e => setDefaults(d => ({ ...d, publishedAt: e.target.value }))} />
          </label>
          <label className="form-control">
            <span className="label-text font-semibold">Explicit</span>
            <select className="select select-bordered" value={defaults.explicit} onChange={e => setDefaults(d => ({ ...d, explicit: e.target.value === 'true' }))}>
              <option value="false">Clean</option>
              <option value="true">Explicit</option>
            </select>
          </label>
          <label className="form-control">
            <span className="label-text font-semibold">Status</span>
            <select className="select select-bordered" value={defaults.draft} onChange={e => setDefaults(d => ({ ...d, draft: e.target.value === 'true' }))}>
              <option value="false">Published</option>
              <option value="true">Draft</option>
            </select>
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">Files in import folder</h2>
            <div className="flex gap-2">
              <button type="button" className="btn btn-sm btn-ghost" onClick={selectAll}>Select all</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={deselectAll}>Deselect all</button>
            </div>
          </div>
          {files.length === 0 && <p className="opacity-60">No audio files found in the import folder.</p>}

          {importing && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Importing {selectedFiles.size} file(s)</span>
                <span>{overallProgress}%</span>
              </div>
              <progress className="progress progress-primary w-full" value={overallProgress} max="100"></progress>
            </div>
          )}

          <div className="grid gap-2 max-h-[32rem] overflow-y-auto">
            {files.map(f => {
              const status = fileStatus[f.name] || FILE_STATUS.PENDING;
              const isSelected = selectedFiles.has(f.name);
              return (
                <label key={f.name} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-primary' : 'bg-base-200 border-transparent hover:bg-base-300'}`}>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={isSelected}
                    onChange={() => toggleFile(f.name)}
                    disabled={importing}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{f.name}</p>
                      <StatusBadge status={status} />
                    </div>
                    <p className="text-xs opacity-60">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={importing || selectedFiles.size === 0 || !podcastId}
          >
            {importing ? <><Loader2 className="animate-spin" size={18} /> Importing {overallProgress}%</> : `Import ${selectedFiles.size} selected file(s)`}
          </button>
          {results.length > 0 && (
            <span className="text-sm opacity-70">
              {results.filter(r => r.ok).length} of {results.length} imported
            </span>
          )}
        </div>

        {results.length > 0 && (
          <div className="bg-base-200 rounded-lg p-4 space-y-2 max-h-80 overflow-y-auto">
            <h3 className="font-semibold mb-2">Result log</h3>
            {results.map((r, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded text-sm ${r.ok ? 'bg-success/10' : 'bg-error/10'}`}>
                {r.ok ? <Check size={16} className="text-success" /> : <X size={16} className="text-error" />}
                <span className="truncate flex-1">{r.filename}</span>
                <span className="opacity-80">{r.ok ? (r.episode?.title || 'Imported') : r.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BatchImport;
