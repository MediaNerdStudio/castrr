import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getPodcast, getEpisodes, getRssUrl } from '../../api.js';
import AudioPlayer from '../../components/AudioPlayer.jsx';
import EpisodeCard from '../../components/EpisodeCard.jsx';
import { Rss, Share2 } from 'lucide-react';
import EmbedBuilder from '../../components/EmbedBuilder.jsx';

function extractSpotifyPlaylistId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/playlist\/([^/]+)/);
    if (match) return match[1].split('?')[0];
  } catch {
    // treat input as raw ID
  }
  // Spotify IDs are 22 alphanumeric chars
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) return trimmed;
  return null;
}

function SpotifyPlaylist({ url }) {
  const id = extractSpotifyPlaylistId(url);
  if (!id) return null;
  return (
    <div className="mt-4 max-w-2xl">
      <iframe
        src={`https://open.spotify.com/embed/playlist/${id}`}
        width="100%"
        height="152"
        frameBorder="0"
        allow="encrypted-media; clipboard-write; fullscreen; picture-in-picture"
        loading="lazy"
        className="rounded-xl"
        title="Spotify playlist"
      />
    </div>
  );
}

function PodcastPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const startAt = parseInt(searchParams.get('t') || '0', 10) || 0;
  const [podcast, setPodcast] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [current, setCurrent] = useState(null);
  const [autoplay, setAutoplay] = useState(false);
  const [activeGroup, setActiveGroup] = useState('all');
  const [showEmbed, setShowEmbed] = useState(false);

  const handlePlay = (ep) => {
    setCurrent(ep);
    setAutoplay(true);
  };

  useEffect(() => {
    getPodcast(slug).then(setPodcast);
    getEpisodes(slug).then(setEpisodes);
  }, [slug]);

  const groups = podcast?.groups || [];
  const filteredEpisodes = useMemo(() => {
    if (activeGroup === 'all' || activeGroup === '') return episodes;
    return episodes.filter(e => e.groupId === activeGroup);
  }, [episodes, activeGroup]);

  if (!podcast) return <div className="p-8 loading loading-lg"></div>;

  const featured = filteredEpisodes[0];
  const rest = filteredEpisodes.slice(1);
  const highlightLimit = 5;

  return (
    <div className="min-h-screen bg-base-100">
      <div className="navbar min-h-14 bg-base-200 px-2 sm:px-4 sticky top-0 z-50">
        <Link to="/" className="btn btn-ghost px-2 sm:px-4 text-lg sm:text-xl font-bold">Casterr</Link>
        <div className="ml-auto flex gap-0 sm:gap-2">
          <a href={getRssUrl(slug)} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost px-2 sm:px-3"><Rss size={16} /> <span className="hidden sm:inline">RSS</span></a>
          <button className="btn btn-sm btn-ghost px-2 sm:px-3" onClick={() => setShowEmbed(true)}><Share2 size={16} /> <span className="hidden sm:inline">Embed</span></button>
          <Link to="/admin" className="hidden sm:inline-flex btn btn-sm btn-ghost">Admin</Link>
        </div>
      </div>

      <header className="relative sm:bg-gradient-to-r sm:from-primary/20 sm:to-secondary/20 overflow-hidden sm:overflow-visible">
        {/* Mobile compact header with artwork as background */}
        <div className="relative sm:hidden p-3 text-center">
          <img
            src={podcast.artwork || '/default-cover.svg'}
            alt=""
            className="absolute inset-0 w-full h-full object-cover blur-md opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/70 to-transparent" />
          <div className="relative">
            <h1 className="text-2xl font-bold break-words leading-tight">{podcast.title}</h1>
            {podcast.description && <p className="text-xs opacity-70">{podcast.description}</p>}
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden sm:block max-w-full sm:max-w-[75%] mx-auto p-8 md:p-12">
          <div className="flex gap-8 items-start">
            <img src={podcast.artwork || '/default-cover.svg'} alt={podcast.title} className="w-48 h-48 rounded-2xl shadow-2xl object-cover" />
            <div className="flex-1">
              <div className="flex gap-2 mb-3 flex-wrap">
                {(podcast.categories || []).map(c => <span key={c} className="badge badge-secondary">{c}</span>)}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 break-words">{podcast.title}</h1>
              <p className="text-lg opacity-80 max-w-2xl">{podcast.description}</p>
              {podcast.spotifyPlaylist && <SpotifyPlaylist url={podcast.spotifyPlaylist} />}
              <div className="flex gap-2 mt-4 flex-wrap">
                {(podcast.tags || []).map(t => <span key={t} className="badge badge-outline">{t}</span>)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {groups.length > 0 && (
        <div className="max-w-full sm:max-w-[75%] mx-auto px-2 sm:px-6 pt-2 sm:pt-6 overflow-x-auto">
          <div className="tabs tabs-lifted flex-nowrap w-max min-w-full">
            <button className={`tab ${activeGroup === 'all' ? 'tab-active' : ''}`} onClick={() => setActiveGroup('all')}>All</button>
            {groups.map(g => (
              <button key={g.id} className={`tab ${activeGroup === g.id ? 'tab-active' : ''}`} onClick={() => setActiveGroup(g.id)}>
                {g.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-full sm:max-w-[75%] mx-auto p-2 sm:p-6 pb-28 sm:pb-0">
        {current && (
          <div className="fixed sm:static bottom-0 left-0 right-0 z-50 sm:z-auto bg-base-100 sm:bg-transparent shadow-[0_-4px_20px_rgba(0,0,0,0.25)] sm:shadow-none">
            <AudioPlayer
              episodeId={current.id}
              audioUrl={current.audioUrl}
              peaksUrl={current.peaksUrl}
              artwork={current.artwork || podcast.artwork}
              title={current.title}
              artist={podcast.author}
              chapters={current.chapters || []}
              spotifyUrl={current.spotifyPlaylist || podcast.spotifyPlaylist}
              shareUrl={`${window.location.origin}/podcast/${slug}/episode/${current.slug}`}
              startAt={startAt}
              autoplay={autoplay}
              className="rounded-none sm:rounded-2xl"
            />
          </div>
        )}

        <section className="mt-0 sm:mt-8">
          <h2 className="text-2xl font-bold mb-4">Latest episode</h2>
          {featured ? (
            <EpisodeCard episode={featured} size="large" onPlay={handlePlay} />
          ) : (
            <p className="opacity-60">No episodes in this group yet.</p>
          )}
        </section>

        {rest.length > 0 && (
          <section className="mt-6 sm:mt-8">
            <h2 className="text-2xl font-bold mb-4">More episodes</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rest.map(ep => <EpisodeCard key={ep.id} episode={ep} size="normal" onPlay={handlePlay} />)}
            </div>
          </section>
        )}

        <section className="mt-6 sm:mt-8">
          <h2 className="text-2xl font-bold mb-4">Highlights</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {filteredEpisodes.slice(0, highlightLimit).map(ep => (
              <EpisodeCard key={`h-${ep.id}`} episode={ep} size="large" onPlay={handlePlay} />
            ))}
          </div>
        </section>
      </main>

      {showEmbed && podcast && <EmbedBuilder podcast={podcast} onClose={() => setShowEmbed(false)} />}
    </div>
  );
}

export default PodcastPage;
