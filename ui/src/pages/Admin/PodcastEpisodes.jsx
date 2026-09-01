import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

ModuleRegistry.registerModules([AllCommunityModule]);
import { getPodcasts, getEpisodesByPodcastId, deleteEpisode, updateEpisode } from '../../api.js';
import { formatDuration, formatDate } from '../../utils/format.js';
import { Pencil, Trash2, Plus, Headphones, Share2 } from 'lucide-react';
import EmbedBuilder from '../../components/EmbedBuilder.jsx';

function ArtworkCell({ value }) {
  return (
    <img
      src={value || '/default-cover.svg'}
      alt=""
      className="w-10 h-10 rounded object-cover"
    />
  );
}

function TitleCell({ value, data }) {
  return (
    <div className="py-1">
      <div className="font-semibold truncate" title={value}>{value}</div>
      <div className="text-xs opacity-60 line-clamp-1">{data.description || ''}</div>
    </div>
  );
}

function GroupCell({ value }) {
  if (!value) return <span className="opacity-40">-</span>;
  return (
    <span className="badge badge-sm badge-outline whitespace-nowrap" title={value}>
      {value}
    </span>
  );
}

function StatusCell({ data }) {
  return (
    <div className="flex gap-1">
      {data.draft ? (
        <span className="badge badge-sm badge-warning">Draft</span>
      ) : (
        <span className="badge badge-sm badge-success">Published</span>
      )}
      {data.explicit && <span className="badge badge-sm badge-error">Explicit</span>}
    </div>
  );
}

function ActionsCell({ data, onListen, onEmbed, onEdit, onDelete }) {
  return (
    <div className="flex gap-1 h-full items-center">
      <button className="btn btn-xs btn-ghost" onClick={() => onListen(data)}><Headphones size={14} /></button>
      <button className="btn btn-xs btn-ghost" onClick={() => onEmbed(data)}><Share2 size={14} /></button>
      <button className="btn btn-xs btn-ghost" onClick={() => onEdit(data)}><Pencil size={14} /></button>
      <button className="btn btn-xs btn-ghost text-error" onClick={() => onDelete(data)}><Trash2 size={14} /></button>
    </div>
  );
}

function PodcastEpisodes() {
  const { id } = useParams();
  const [podcast, setPodcast] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [embedEpisode, setEmbedEpisode] = useState(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [batchGroupId, setBatchGroupId] = useState('');
  const [batchBusy, setBatchBusy] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const theme = document.documentElement.dataset.theme;
    return theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const gridRef = useRef(null);

  useEffect(() => {
    const theme = document.documentElement.dataset.theme;
    setIsDark(theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const podcasts = await getPodcasts();
      const p = podcasts.find(pod => pod.id === id);
      setPodcast(p || null);
      if (p) {
        const eps = await getEpisodesByPodcastId(id);
        setEpisodes(eps.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt)));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onSelectionChanged = useCallback(() => {
    const rows = gridRef.current?.api?.getSelectedRows() || [];
    setSelectedCount(rows.length);
  }, []);

  const removeOne = useCallback(async (ep) => {
    if (!confirm(`Delete "${ep.title}"?`)) return;
    await deleteEpisode(ep.id);
    await loadData();
  }, [loadData]);

  const columnDefs = useMemo(() => {
    if (!podcast) return [];
    return [
      {
        headerName: '',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 50,
        pinned: 'left',
        sortable: false,
        filter: false
      },
      {
        headerName: 'Art',
        field: 'artwork',
        width: 80,
        sortable: false,
        filter: false,
        cellRenderer: ArtworkCell
      },
      {
        headerName: 'Title',
        field: 'title',
        minWidth: 240,
        flex: 2,
        cellRenderer: TitleCell
      },
      {
        headerName: 'Slug',
        field: 'slug',
        minWidth: 160,
        flex: 1
      },
      {
        headerName: 'Group',
        minWidth: 120,
        valueGetter: p => podcast.groups?.find(g => g.id === p.data.groupId)?.title || '',
        cellRenderer: GroupCell
      },
      {
        headerName: 'Released',
        field: 'publishedAt',
        width: 130,
        valueFormatter: p => formatDate(p.value)
      },
      {
        headerName: 'Duration',
        field: 'duration',
        width: 110,
        valueFormatter: p => formatDuration(p.value)
      },
      {
        headerName: 'Status',
        width: 140,
        sortable: false,
        filter: false,
        cellRenderer: StatusCell
      },
      {
        headerName: 'Actions',
        width: 170,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: ActionsCell,
        cellRendererParams: {
          onListen: ep => window.open(`/podcast/${podcast.slug}/episode/${ep.slug}?autoplay=1`, '_blank'),
          onEmbed: ep => setEmbedEpisode(ep),
          onEdit: ep => window.location.assign(`/admin/episode/${ep.id}`),
          onDelete: ep => removeOne(ep)
        }
      }
    ];
  }, [podcast, removeOne]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true
  }), []);

  async function batchDelete() {
    const rows = gridRef.current?.api?.getSelectedRows() || [];
    if (rows.length === 0) return;
    if (!confirm(`Delete ${rows.length} selected episode(s)?`)) return;
    setBatchBusy(true);
    for (const ep of rows) {
      await deleteEpisode(ep.id);
    }
    gridRef.current?.api?.deselectAll();
    setBatchBusy(false);
    await loadData();
  }

  async function batchSetGroup() {
    if (!batchGroupId) return;
    const rows = gridRef.current?.api?.getSelectedRows() || [];
    if (rows.length === 0) return;
    const groupId = batchGroupId === '__none__' ? '' : batchGroupId;
    setBatchBusy(true);
    for (const ep of rows) {
      await updateEpisode(ep.id, { ...ep, groupId });
    }
    gridRef.current?.api?.deselectAll();
    setBatchGroupId('');
    setBatchBusy(false);
    await loadData();
  }

  function onQuickFilterChanged(e) {
    gridRef.current?.api?.setGridOption('quickFilterText', e.target.value);
  }

  if (loading) return <div className="loading loading-lg"></div>;
  if (!podcast) return <div className="alert alert-error">Podcast not found</div>;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{podcast.title}</h1>
          <p className="opacity-70">{episodes.length} episode(s)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/admin/podcast/${id}`} className="btn btn-ghost btn-sm">Edit podcast</Link>
          <button className="btn btn-ghost btn-sm gap-1" onClick={() => setEmbedEpisode(null)}><Share2 size={16} /> Embed</button>
          <Link to={`/admin/podcast/${id}/episode/new`} className="btn btn-primary btn-sm"><Plus size={16} /> Add episode</Link>
        </div>
      </div>

      <div className="card bg-base-100 shadow p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search episodes..."
              className="input input-bordered input-sm"
              onChange={onQuickFilterChanged}
            />
          </div>

          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm opacity-80">{selectedCount} selected</span>
              <select
                className="select select-bordered select-sm"
                value={batchGroupId}
                onChange={e => setBatchGroupId(e.target.value)}
              >
                <option value="">Add to group...</option>
                <option value="__none__">No group</option>
                {(podcast.groups || []).map(g => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
              <button
                className="btn btn-sm btn-ghost"
                disabled={!batchGroupId || batchBusy}
                onClick={batchSetGroup}
              >
                Apply
              </button>
              <button
                className="btn btn-sm btn-error"
                disabled={batchBusy}
                onClick={batchDelete}
              >
                Delete
              </button>
            </div>
          )}
        </div>

        <div className={isDark ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'} style={{ height: '70vh', width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            theme="legacy"
            rowData={episodes}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowSelection="multiple"
            suppressRowClickSelection={true}
            onSelectionChanged={onSelectionChanged}
            pagination={episodes.length > 25}
            paginationPageSize={50}
          />
        </div>
      </div>

      {embedEpisode !== null && podcast && (
        <EmbedBuilder podcast={podcast} episode={embedEpisode} onClose={() => setEmbedEpisode(null)} />
      )}
    </div>
  );
}

export default PodcastEpisodes;
