import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getPodcast, getEpisodes, getEpisodeBySlug } from '../../api.js';
import AudioPlayer from '../../components/AudioPlayer.jsx';
import { formatDuration, formatDate } from '../../utils/format.js';
import { Play } from 'lucide-react';

const sizeMap = {
  mini: { playerHeight: 0, padding: 'p-2' },
  compact: { playerHeight: 40, padding: 'p-2' },
  normal: { playerHeight: 80, padding: 'p-3' },
  big: { playerHeight: 120, padding: 'p-4' },
  component: { playerHeight: 80, padding: 'p-3' }
};

function EmbedPlayer() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();

  const episodeSlug = searchParams.get('episode');
  const mode = searchParams.get('mode') || 'single';
  const size = searchParams.get('size') || 'compact';
  const theme = searchParams.get('theme') || 'dark';
  const color = searchParams.get('color') || '#f472b6';
  const feed = searchParams.get('feed') || 'full';
  const hideArtwork = searchParams.get('hideArtwork') === '1';
  const autoplay = searchParams.get('autoplay') === '1';
  const countParam = parseInt(searchParams.get('count') || '5', 10);
  const count = isNaN(countParam) ? 5 : countParam;

  const [podcast, setPodcast] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  }, [theme]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const p = await getPodcast(slug);
      setPodcast(p);

      let eps = await getEpisodes(slug);
      if (feed !== 'full' && p?.groups?.length) {
        const group = p.groups.find(g => g.slug === feed);
        if (group) {
          eps = eps.filter(e => e.groupId === group.id);
        }
      }

      if (count > 0) {
        eps = eps.slice(0, count);
      }
      setEpisodes(eps);

      if (episodeSlug) {
        const ep = await getEpisodeBySlug(episodeSlug);
        setCurrentEpisode(ep);
      } else {
        setCurrentEpisode(eps[0] || null);
      }
      setLoading(false);
    }
    load();
  }, [slug, episodeSlug, feed, count]);

  const { playerHeight, padding } = sizeMap[size] || sizeMap.compact;

  const episodesToShow = useMemo(() => {
    if (mode === 'single') return [];
    return episodes;
  }, [episodes, mode]);

  if (loading) return <div className={`${padding} bg-base-100`}><span className="loading loading-sm"></span></div>;
  if (!podcast || !currentEpisode) return <div className={`${padding} bg-base-100`}>No episode found</div>;

  const isComponent = size === 'component';

  return (
    <div className={`${padding} bg-base-100${isComponent ? ' h-screen flex flex-col overflow-hidden' : ''}`}>
      {isComponent ? (
        <div className="shrink-0 relative rounded-2xl overflow-hidden shadow-xl mb-3">
          <img
            src={!hideArtwork ? (currentEpisode.artwork || podcast.artwork) : '/default-cover.svg'}
            alt={currentEpisode.title}
            className="absolute inset-0 w-full h-full object-cover blur-sm"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/20" />
          <div className="relative p-4 flex flex-col justify-end min-h-64 space-y-2">
            <h3 className="text-white font-bold text-lg line-clamp-1">{currentEpisode.title}</h3>
            <p className="text-white/80 text-sm line-clamp-3 whitespace-pre-wrap">{currentEpisode.description}</p>
            <AudioPlayer
              episodeId={currentEpisode.id}
              audioUrl={currentEpisode.audioUrl}
              peaksUrl={currentEpisode.peaksUrl}
              artwork={!hideArtwork ? (currentEpisode.artwork || podcast.artwork) : null}
              title={currentEpisode.title}
              artist={podcast.author}
              chapters={currentEpisode.chapters || []}
              tracklist={currentEpisode.tracklist || []}
              primaryColor={color}
              height={playerHeight}
              compact={false}
              mini={false}
              autoplay={autoplay}
              spotifyUrl={currentEpisode.spotifyPlaylist || podcast.spotifyPlaylist}
              shareUrl={`${window.location.origin}/podcast/${slug}/episode/${currentEpisode.slug}`}
            />
          </div>
        </div>
      ) : (
        <AudioPlayer
          audioUrl={currentEpisode.audioUrl}
          peaksUrl={currentEpisode.peaksUrl}
          artwork={!hideArtwork ? (currentEpisode.artwork || podcast.artwork) : null}
          title={currentEpisode.title}
          artist={podcast.author}
          chapters={currentEpisode.chapters || []}
          tracklist={currentEpisode.tracklist || []}
          primaryColor={color}
          height={playerHeight}
          compact={size === 'mini' || size === 'compact'}
          mini={size === 'mini'}
          autoplay={autoplay}
          spotifyUrl={currentEpisode.spotifyPlaylist || podcast.spotifyPlaylist}
          shareUrl={`${window.location.origin}/podcast/${slug}/episode/${currentEpisode.slug}`}
        />
      )}

      {(size === 'normal' || size === 'big') && currentEpisode.description && (
        <div className={`mt-3 ${size === 'big' ? 'text-sm' : 'text-xs'} opacity-90`}>
          <p className={`whitespace-pre-wrap ${size === 'big' ? 'max-h-48' : 'max-h-32'} overflow-y-auto pr-1`}>
            {currentEpisode.description}
          </p>
        </div>
      )}

      {mode === 'list' && episodesToShow.length > 1 && (
        <div className={`${isComponent ? 'flex-1 min-h-0 overflow-y-auto -m-3 p-3' : 'mt-3'} space-y-1`}>
          {episodesToShow.map(ep => {
            const isActive = ep.id === currentEpisode?.id;
            return (
              <button
                key={ep.id}
                className={`flex items-center gap-3 w-full text-left rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary/20 ring-1 ring-primary/40'
                    : 'hover:bg-base-200'
                } ${size === 'mini' ? 'p-1' : size === 'compact' ? 'p-1' : 'p-2'}`}
                onClick={() => setCurrentEpisode(ep)}
              >
                {!hideArtwork && (
                  <img
                    src={ep.artwork || podcast.artwork || '/default-cover.svg'}
                    alt={ep.title}
                    className={`rounded object-cover ${size === 'mini' ? 'w-6 h-6' : size === 'compact' ? 'w-8 h-8' : 'w-12 h-12'}`}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold truncate ${size === 'mini' || size === 'compact' ? 'text-sm' : ''}`}>{ep.title}</div>
                  {size !== 'mini' && size !== 'compact' && <div className="text-xs opacity-60">{formatDate(ep.publishedAt)} · {formatDuration(ep.duration)}</div>}
                </div>
                {!isActive && <Play size={size === 'mini' ? 12 : 18} className="opacity-60" />}
                {isActive && <span className="text-xs font-mono opacity-60">now playing</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EmbedPlayer;
