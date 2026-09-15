import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { Play, Pause, SkipBack, SkipForward, Volume2, Share2, Link as LinkIcon, Mail, MessageCircle } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpotify } from '@fortawesome/free-brands-svg-icons';
import { formatDuration } from '../utils/format.js';
import { logPlay } from '../api.js';

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
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) return trimmed;
  return null;
}

function AudioPlayer({ audioUrl, artwork, title, artist, chapters = [], tracklist = [], peaksUrl = '', primaryColor = '#f472b6', height = 80, compact = false, mini = false, autoplay = false, spotifyUrl = '', episodeId, shareUrl = '', startAt = 0, className = '' }) {
  const containerRef = useRef(null);
  const shareRef = useRef(null);
  const wavesurfer = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStartAt, setShareStartAt] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const startAtApplied = useRef(false);
  const tracklistRef = useRef(tracklist);

  useEffect(() => {
    tracklistRef.current = tracklist;
  }, [tracklist]);

  useEffect(() => {
    if (!shareOpen) return;
    function handleClick(e) {
      if (shareRef.current && !shareRef.current.contains(e.target)) {
        setShareOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [shareOpen]);

  const showWaveform = height > 0;
  const remaining = Math.max(0, duration - currentTime);

  function getActiveTrackIndex() {
    if (!duration || !tracklist?.length) return -1;
    return tracklist.findIndex((track, idx, arr) => {
      const start = track.start || 0;
      let end = start;
      if (track.duration && track.duration > 0) {
        end = start + track.duration;
      } else if (idx < arr.length - 1) {
        end = arr[idx + 1].start;
      } else {
        end = duration;
      }
      return currentTime >= start && currentTime < end;
    });
  }

  const activeTrackIndex = getActiveTrackIndex();

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setReady(false);
    setError('');

    let cancelled = false;
    let regionsPlugin = null;

    async function init() {
      setLoading(true);
      setError('');

      let peaks = undefined;
      let peaksDuration = undefined;
      if (peaksUrl) {
        try {
          const res = await fetch(peaksUrl);
          if (res.ok) {
            const peaksData = await res.json();
            peaks = peaksData.peaks;
            peaksDuration = peaksData.duration;
          }
        } catch (err) {
          console.warn('Could not load peaks', err);
        }
      }

      if (cancelled) return;

      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: '#94a3b8',
        progressColor: primaryColor,
        cursorColor: primaryColor,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height,
        url: audioUrl,
        peaks,
        duration: peaksDuration,
        backend: peaks ? 'MediaElement' : 'WebAudio',
        normalize: true
      });

      wavesurfer.current = ws;

      if (tracklistRef.current?.length > 0) {
        regionsPlugin = ws.registerPlugin(RegionsPlugin.create());
      }

      ws.on('ready', () => {
        const dur = ws.getDuration();
        setDuration(dur);
        setReady(true);
        setLoading(false);
        if (startAt > 0 && !startAtApplied.current) {
          startAtApplied.current = true;
          const pos = Math.min(startAt, dur);
          ws.seekTo(pos / dur);
          setCurrentTime(pos);
        }
        if (autoplay) {
          ws.play().catch(() => { /* autoplay blocked by browser */ });
        }

        if (regionsPlugin) {
          tracklistRef.current.forEach((track, idx, arr) => {
            const start = track.start || 0;
            let end = start;
            if (track.duration && track.duration > 0) {
              end = start + track.duration;
            } else if (idx < arr.length - 1) {
              end = arr[idx + 1].start;
            } else {
              end = dur;
            }
            if (end <= start) end = start + 1;
            regionsPlugin.addRegion({
              start,
              end,
              color: 'rgba(34, 197, 94, 0.12)',
              drag: false,
              resize: false
            });
          });
        }
      });

      ws.on('error', err => {
        console.error('WaveSurfer error', err);
        setError('Could not load audio');
        setLoading(false);
      });

      ws.on('audioprocess', () => setCurrentTime(ws.getCurrentTime()));
      ws.on('seeking', () => setCurrentTime(ws.getCurrentTime()));
      ws.on('finish', () => setPlaying(false));
      ws.on('play', () => {
        setPlaying(true);
        if (episodeId) logPlay(episodeId).catch(() => {});
      });
      ws.on('pause', () => setPlaying(false));
    }

    init();

    return () => {
      cancelled = true;
      wavesurfer.current?.destroy();
    };
  }, [audioUrl, peaksUrl, primaryColor, height, autoplay, episodeId, startAt]);

  const togglePlay = () => wavesurfer.current?.playPause();

  const handleSeek = e => {
    const time = parseFloat(e.target.value);
    wavesurfer.current?.seekTo(time / duration);
    setCurrentTime(time);
  };

  const handleVolume = e => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    wavesurfer.current?.setVolume(v);
  };

  const getShareUrl = () => {
    if (!shareUrl) return '';
    try {
      const url = new URL(shareUrl);
      if (shareStartAt) {
        url.searchParams.set('t', String(Math.floor(currentTime)));
      } else {
        url.searchParams.delete('t');
      }
      return url.href;
    } catch {
      return shareUrl;
    }
  };

  async function copyShareUrl() {
    const url = getShareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.open(url, '_blank');
    }
    setShareOpen(false);
  }

  const seekChapter = start => {
    wavesurfer.current?.seekTo(start / duration);
    setCurrentTime(start);
    wavesurfer.current?.play();
  };

  const btnStyle = { backgroundColor: primaryColor, borderColor: primaryColor, color: '#fff' };

  // Compact single-line layout
  if (mini) {
    return (
      <div className={`bg-base-200 rounded-2xl shadow-xl p-2 ${className}`}>
        <div className="flex items-center gap-2 h-10">
          {artwork && (
            <img src={artwork} alt={title} className="w-8 h-8 rounded object-cover flex-shrink-0" />
          )}
          <button
            className="btn btn-sm btn-square flex-shrink-0 hover:brightness-110"
            style={btnStyle}
            onClick={togglePlay}
            disabled={!ready}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>

          <div className="flex-1 min-w-0 relative h-8 overflow-hidden">
            <div
              className={`absolute inset-0 flex flex-col justify-center transition-all duration-300 ease-out ${
                playing ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
              }`}
            >
              <h3 className="text-sm font-bold truncate">{title || 'Untitled'}</h3>
              {artist && <p className="text-xs opacity-70 truncate">{artist}</p>}
            </div>
            <div
              className={`absolute inset-0 flex items-center gap-1 transition-all duration-300 ease-out ${
                playing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
            >
              <span className="font-mono tabular-nums text-[10px] opacity-70 flex-shrink-0">
                {formatDuration(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="range range-xs flex-1"
                style={{ accentColor: primaryColor }}
              />
              <span className="font-mono tabular-nums text-[10px] opacity-70 flex-shrink-0">
                -{formatDuration(remaining)}
              </span>
            </div>
          </div>
        </div>

        <div
          ref={containerRef}
          className="w-full overflow-hidden"
          style={{ height: '1px', opacity: 0 }}
        />
      </div>
    );
  }

  return (
    <div className={`bg-base-200 rounded-2xl shadow-xl min-w-0 ${compact ? 'p-2' : 'p-3 sm:p-4'} ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {artwork && (
          <img src={artwork} alt={title} className={`rounded object-cover flex-shrink-0 ${compact ? 'w-10 h-10' : 'w-12 h-12 sm:w-16 sm:h-16'}`} />
        )}

        <button
          className={`btn flex-shrink-0 hover:brightness-110 ${compact ? 'btn-sm btn-square' : 'btn-square'}`}
          style={btnStyle}
          onClick={togglePlay}
          disabled={!ready}
        >
          {playing ? (compact ? <Pause size={16} /> : <Pause size={22} />) : (compact ? <Play size={16} /> : <Play size={22} />)}
        </button>

        <div className="flex-1 min-w-0">
          <h3 className={`font-bold truncate ${compact ? 'text-sm' : 'text-lg'}`}>{title || 'Untitled'}</h3>
          {artist && <p className={`opacity-70 truncate ${compact ? 'text-xs' : 'text-sm'}`}>{artist}</p>}
        </div>

        {!mini && (
          <span className={`font-mono tabular-nums opacity-80 flex-shrink-0 ${compact ? 'text-[10px] sm:text-xs' : 'hidden sm:inline text-sm'}`}>
            {formatDuration(currentTime)} / -{formatDuration(remaining)}
          </span>
        )}
      </div>

      <div className="mt-2 h-0 sm:h-auto overflow-hidden opacity-0 sm:opacity-100">
        <div
          ref={containerRef}
          className="track-waveform w-full overflow-hidden"
          style={{ height: `${height || 1}px`, opacity: height > 0 ? 1 : 0 }}
        />
        {showWaveform && loading && <div className="loading loading-dots loading-xs mt-1"></div>}
        {showWaveform && error && <div className="text-error text-xs mt-1">{error}</div>}
        {!mini && tracklist?.length > 0 && duration > 0 && (
          <div className="relative h-16 mt-1">
            {tracklist.map((track, idx) => {
              const start = track.start || 0;
              const left = (start / duration) * 100;
              const active = idx === activeTrackIndex;
              return (
                <div
                  key={idx}
                  className="track-marker"
                  data-active={active}
                  style={{ left: `${left}%` }}
                >
                  <div className="track-marker-artwork">
                    <img src={track.artwork || '/default-cover.svg'} alt="" />
                  </div>
                  <div className="track-marker-info">
                    <span className="artist">{track.artist}</span>
                    <span className="title">{track.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!mini && (
        <div className="flex sm:hidden items-center gap-2 mt-2">
          <span className="font-mono tabular-nums opacity-80 flex-shrink-0 text-xs">
            {formatDuration(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="range range-xs flex-1"
            style={{ accentColor: primaryColor }}
          />
          <span className="font-mono tabular-nums opacity-80 flex-shrink-0 text-xs">
            -{formatDuration(remaining)}
          </span>
        </div>
      )}

      {!showWaveform && !mini && (
        <div className="hidden sm:flex items-center gap-2 mt-2">
          <span className={`font-mono tabular-nums opacity-80 flex-shrink-0 ${compact ? 'text-xs' : 'text-sm'}`}>
            {formatDuration(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="range range-xs flex-1"
            style={{ accentColor: primaryColor }}
          />
          <span className={`font-mono tabular-nums opacity-80 flex-shrink-0 ${compact ? 'text-xs' : 'text-sm'}`}>
            -{formatDuration(remaining)}
          </span>
        </div>
      )}

      {!compact && (
        <div className="flex items-center justify-between gap-1 mt-3 overflow-x-auto sm:overflow-visible">
          <div className="flex items-center gap-0 sm:gap-1 shrink-0">
            <button className="btn btn-ghost btn-sm px-1 sm:px-2 gap-0 sm:gap-1" style={{ color: primaryColor }} onClick={() => wavesurfer.current?.skip(-15)} title="Back 15s">
              <SkipBack size={16} />
              <span className="hidden sm:inline text-xs">15s</span>
            </button>
            <button className="btn btn-ghost btn-sm px-1 sm:px-2 gap-0 sm:gap-1" style={{ color: primaryColor }} onClick={() => wavesurfer.current?.skip(15)} title="Forward 15s">
              <span className="hidden sm:inline text-xs">15s</span>
              <SkipForward size={16} />
            </button>
          </div>

          <div className="flex items-center justify-end gap-1 sm:gap-2 min-w-0 shrink-0">
            {spotifyUrl && extractSpotifyPlaylistId(spotifyUrl) && (
              <a
                href={`https://open.spotify.com/playlist/${extractSpotifyPlaylistId(spotifyUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm gap-2"
                title="Open Spotify playlist"
                style={{ backgroundColor: '#1DB954', color: '#fff' }}
              >
                <FontAwesomeIcon icon={faSpotify} size="lg" />
                <span className="hidden sm:inline text-sm">Open Spotify Playlist</span>
              </a>
            )}

            {shareUrl && (
              <div className="relative" ref={shareRef}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: primaryColor }}
                  onClick={() => setShareOpen(o => !o)}
                  title="Share"
                >
                  <Share2 size={18} />
                </button>
                {shareOpen && (
                  <div className="fixed left-3 right-3 bottom-3 sm:absolute sm:left-auto sm:right-0 sm:bottom-10 bg-base-100 shadow-xl rounded-xl p-3 sm:w-64 z-50 border border-base-300">
                    <div className="text-sm font-semibold mb-2">Share</div>
                    <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={shareStartAt}
                        onChange={e => setShareStartAt(e.target.checked)}
                      />
                      <span>Start at {formatDuration(currentTime)}</span>
                    </label>
                    <div className="space-y-1">
                      <button className="btn btn-sm btn-ghost w-full justify-start gap-2" onClick={copyShareUrl}>
                        <LinkIcon size={16} />
                        {shareCopied ? 'Copied!' : 'Copy link'}
                      </button>
                      <a
                        className="btn btn-sm btn-ghost w-full justify-start gap-2"
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title || 'Episode')}&url=${encodeURIComponent(getShareUrl())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShareOpen(false)}
                      >
                        X / Twitter
                      </a>
                      <a
                        className="btn btn-sm btn-ghost w-full justify-start gap-2"
                        href={`https://wa.me/?text=${encodeURIComponent((title || 'Episode') + ' ' + getShareUrl())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShareOpen(false)}
                      >
                        <MessageCircle size={16} /> WhatsApp
                      </a>
                      <a
                        className="btn btn-sm btn-ghost w-full justify-start gap-2"
                        href={`mailto:?subject=${encodeURIComponent(title || 'Episode')}&body=${encodeURIComponent(getShareUrl())}`}
                        onClick={() => setShareOpen(false)}
                      >
                        <Mail size={16} /> Email
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Volume2 size={18} style={{ color: primaryColor }} />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={handleVolume}
                className="range range-xs w-14 sm:w-24"
                style={{ accentColor: primaryColor }}
              />
            </div>
          </div>
        </div>
      )}

      {!compact && chapters.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">Chapters</h4>
          <ul className="menu menu-xs bg-base-300 rounded-lg max-h-40 overflow-y-auto">
            {chapters.map((c, i) => (
              <li key={i}>
                <button onClick={() => seekChapter(c.start)}>
                  <span className="font-mono opacity-70">{formatDuration(c.start)}</span>
                  <span>{c.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AudioPlayer;
