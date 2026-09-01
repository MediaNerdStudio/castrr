import { useState, useMemo } from 'react';
import { X, Copy, Check } from 'lucide-react';

const BASE_URL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';

const sizeMap = {
  mini: { height: 60, label: 'Mini (60px)' },
  compact: { height: 120, label: 'Compact (120px)' },
  normal: { height: 200, label: 'Normal (200px)' },
  big: { height: 400, label: 'Big (400px)' },
  component: { height: 240, label: 'Component (card + description)' }
};

const contentHeights = {
  single: { mini: 73, compact: 120, normal: 252, big: 300, component: 240 },
  listItem: { mini: 32, compact: 40, normal: 60, big: 72, component: 60 }
};

function estimatedHeight(mode, size, count) {
  const base = contentHeights.single[size] || sizeMap[size].height;
  if (mode !== 'list') return base;
  const rows = count === 0 ? 5 : Math.max(1, count);
  const items = Math.max(0, rows - 1);
  return base + items * (contentHeights.listItem[size] || 50);
}

function EmbedBuilder({ podcast, episode = null, onClose }) {
  const groups = podcast?.groups || [];

  const [mode, setMode] = useState(episode ? 'single' : 'list');
  const [size, setSize] = useState('compact');
  const [width, setWidth] = useState('100%');
  const [hideArtwork, setHideArtwork] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [feed, setFeed] = useState('full');
  const [count, setCount] = useState(5);
  const [theme, setTheme] = useState('dark');
  const [color, setColor] = useState('#f472b6');
  const [copied, setCopied] = useState(false);

  const embedUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('mode', mode);
    params.set('size', size);
    params.set('theme', theme);
    params.set('color', color);
    params.set('hideArtwork', hideArtwork ? '1' : '0');
    if (autoplay) params.set('autoplay', '1');
    if (mode !== 'single') {
      params.set('feed', feed);
      params.set('count', String(count));
    }
    if (episode && mode === 'single') {
      params.set('episode', episode.slug);
    }
    return `${BASE_URL}/embed/${podcast.slug}?${params.toString()}`;
  }, [podcast.slug, episode, mode, size, feed, count, theme, color, hideArtwork, autoplay]);

  const iframeHeight = estimatedHeight(mode, size, count);
  const allowAttr = autoplay ? 'autoplay; encrypted-media; fullscreen' : 'encrypted-media; fullscreen';
  const iframeCode = `<iframe src="${embedUrl}" width="${width}" height="${iframeHeight}" frameborder="0" allow="${allowAttr}"></iframe>`;

  async function copy() {
    await navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h2 className="text-xl font-bold">Embed player</h2>
          <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="form-control">
              <span className="label-text font-semibold">Mode</span>
              <select className="select select-bordered select-sm" value={mode} onChange={e => setMode(e.target.value)}>
                <option value="single">Single episode</option>
                <option value="list">Episode list</option>
              </select>
            </label>

            <label className="form-control">
              <span className="label-text font-semibold">Size</span>
              <select className="select select-bordered select-sm" value={size} onChange={e => setSize(e.target.value)}>
                {Object.entries(sizeMap).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text font-semibold">Width</span>
              <input type="text" className="input input-bordered input-sm" value={width} onChange={e => setWidth(e.target.value)} placeholder="100%, 600px, ..." />
            </label>

            <label className="form-control">
              <span className="label-text font-semibold">Theme</span>
              <select className="select select-bordered select-sm" value={theme} onChange={e => setTheme(e.target.value)}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <label className="form-control">
              <span className="label-text font-semibold">Accent color</span>
              <div className="flex items-center gap-2">
                <input type="color" className="w-8 h-8 rounded cursor-pointer" value={color} onChange={e => setColor(e.target.value)} />
                <input type="text" className="input input-bordered input-sm flex-1" value={color} onChange={e => setColor(e.target.value)} />
              </div>
            </label>

            <label className="label cursor-pointer justify-start gap-3">
              <input type="checkbox" className="checkbox checkbox-sm" checked={hideArtwork} onChange={e => setHideArtwork(e.target.checked)} />
              <span className="label-text font-semibold">Hide artwork</span>
            </label>

            <label className="label cursor-pointer justify-start gap-3">
              <input type="checkbox" className="checkbox checkbox-sm" checked={autoplay} onChange={e => setAutoplay(e.target.checked)} />
              <span className="label-text font-semibold">Autoplay</span>
            </label>
          </div>

          {mode !== 'single' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="form-control">
                <span className="label-text font-semibold">Feed</span>
                <select className="select select-bordered select-sm" value={feed} onChange={e => setFeed(e.target.value)}>
                  <option value="full">Full podcast</option>
                  {groups.map(g => <option key={g.id} value={g.slug}>{g.title}</option>)}
                </select>
              </label>

              <label className="form-control">
                <span className="label-text font-semibold">Number of episodes</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  className="input input-bordered input-sm"
                  value={count}
                  onChange={e => setCount(Math.max(0, parseInt(e.target.value || '0', 10)))}
                />
                {mode === 'list' && <span className="label-text-alt">0 = all episodes</span>}
              </label>
            </div>
          )}

          <div className="bg-base-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Embed code</h3>
              <button className="btn btn-sm btn-ghost gap-1" onClick={copy}>
                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
            <pre className="text-xs bg-base-300 p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">{iframeCode}</pre>
          </div>

          <div className="bg-base-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Live preview</h3>
              <a href={embedUrl} target="_blank" rel="noreferrer" className="text-sm link">Open in new tab</a>
            </div>
            <div className="bg-white rounded-lg overflow-hidden border border-base-300">
              <iframe
                key={embedUrl}
                src={embedUrl}
                width="100%"
                height={iframeHeight}
                frameBorder="0"
                allow={allowAttr}
                className="block"
                title="Embed preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmbedBuilder;
