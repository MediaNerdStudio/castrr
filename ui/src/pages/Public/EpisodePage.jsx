import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getPodcast, getEpisodeBySlug, logDownload } from '../../api.js';
import AudioPlayer from '../../components/AudioPlayer.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpotify } from '@fortawesome/free-brands-svg-icons';
import { ArrowLeft, Download } from 'lucide-react';

function extractSpotifyPlaylistId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/playlist\/([^/]+)/);
    if (match) return match[1].split('?')[0];
  } catch {
    // raw ID
  }
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) return trimmed;
  return null;
}

function EpisodePage() {
  const { slug, episodeSlug } = useParams();
  const [searchParams] = useSearchParams();
  const startAt = parseInt(searchParams.get('t') || '0', 10) || 0;
  const autoplay = searchParams.get('autoplay') === '1';
  const [podcast, setPodcast] = useState(null);
  const [episode, setEpisode] = useState(null);

  async function handleDownload() {
    if (!episode?.audioUrl) return;
    await logDownload(episode.id);
    const a = document.createElement('a');
    a.href = episode.audioUrl;
    a.download = episode.audioUrl.split('/').pop() || 'episode.mp3';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  useEffect(() => {
    getPodcast(slug).then(setPodcast);
    getEpisodeBySlug(episodeSlug).then(setEpisode);
  }, [slug, episodeSlug]);

  if (!podcast || !episode) return <div className="p-8 loading loading-lg"></div>;

  return (
    <div className="min-h-screen bg-base-100">
      <div className="navbar min-h-14 bg-base-200 px-2 sm:px-4 sticky top-0 z-50">
        <Link to={`/podcast/${slug}`} className="btn btn-ghost px-2 sm:px-4 min-w-0"><ArrowLeft size={18} className="shrink-0" /> <span className="truncate">{podcast.title}</span></Link>
        <Link to="/admin" className="hidden sm:inline-flex btn btn-sm btn-ghost ml-auto">Admin</Link>
      </div>
      <main className="max-w-full sm:max-w-[75%] mx-auto p-3 sm:p-6">
        <div className="card bg-base-200 shadow-xl overflow-hidden">
          <figure className="h-48 sm:h-64 md:h-80">
            <img src={episode.artwork || podcast.artwork || '/default-cover.svg'} alt={episode.title} className="w-full h-full object-cover" />
          </figure>
          <div className="card-body p-4 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold break-words">{episode.title}</h1>
            <p className="opacity-70 text-base sm:text-lg mb-4 whitespace-pre-wrap break-words">{episode.description}</p>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {(episode.spotifyPlaylist || podcast.spotifyPlaylist) && extractSpotifyPlaylistId(episode.spotifyPlaylist || podcast.spotifyPlaylist) && (
                <a
                  href={`https://open.spotify.com/playlist/${extractSpotifyPlaylistId(episode.spotifyPlaylist || podcast.spotifyPlaylist)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm gap-2"
                  style={{ backgroundColor: '#1DB954', color: '#fff', borderColor: '#1DB954' }}
                >
                  <FontAwesomeIcon icon={faSpotify} />
                  Open Spotify playlist
                </a>
              )}
              {episode.audioUrl && (
                <button className="btn btn-sm btn-primary gap-2" onClick={handleDownload}>
                  <Download size={16} />
                  Download episode
                </button>
              )}
            </div>
            <AudioPlayer
              episodeId={episode.id}
              audioUrl={episode.audioUrl}
              peaksUrl={episode.peaksUrl}
              artwork={episode.artwork || podcast.artwork}
              title={episode.title}
              artist={podcast.author}
              chapters={episode.chapters || []}
              spotifyUrl={episode.spotifyPlaylist || podcast.spotifyPlaylist}
              shareUrl={`${window.location.origin}/podcast/${slug}/episode/${episode.slug}`}
              startAt={startAt}
              autoplay={autoplay}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default EpisodePage;
