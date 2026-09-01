import { Play, Clock, Calendar } from 'lucide-react';
import { formatDuration, formatDate } from '../utils/format.js';

function EpisodeCard({ episode, size = 'normal', onPlay }) {
  const isLarge = size === 'large';

  return (
    <div
      className={`card bg-base-100 shadow hover:shadow-xl transition-shadow cursor-pointer ${isLarge ? '' : 'sm:card-side'}`}
      onClick={() => onPlay(episode)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onPlay(episode); }}
    >
      {isLarge ? (
        <>
          {/* Mobile large card: small artwork, title, description */}
          <div className="sm:hidden relative overflow-hidden rounded-2xl">
            <img
              src={episode.artwork || '/default-cover.svg'}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-md"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
            <div className="relative p-4">
              <div className="flex gap-3 items-start">
                <img
                  src={episode.artwork || '/default-cover.svg'}
                  alt={episode.title}
                  className="w-20 h-20 rounded object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="card-title text-white line-clamp-2 mb-1">{episode.title}</h3>
                  <p className="text-white/85 text-sm leading-relaxed">{episode.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 text-sm text-white/70">
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(episode.publishedAt)}</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> {formatDuration(episode.duration)}</span>
                </span>
                <button className="btn btn-primary btn-sm btn-square" onClick={e => { e.stopPropagation(); onPlay(episode); }}>
                  <Play size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop large card: artwork left, content right, blurred background */}
          <div className="hidden sm:flex relative overflow-hidden rounded-xl w-full">
            <img
              src={episode.artwork || '/default-cover.svg'}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-md opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-base-100 via-base-100/95 to-base-100/80" />
            <div className="relative flex flex-row gap-6 p-6 w-full items-start">
              <img
                src={episode.artwork || '/default-cover.svg'}
                alt={episode.title}
                className="w-48 h-48 rounded-2xl object-cover shadow-xl shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="card-title text-2xl mb-2">{episode.title}</h3>
                <p className="text-base opacity-90 line-clamp-6 leading-relaxed mb-4">{episode.description}</p>
                <div className="flex items-center justify-between text-sm opacity-70">
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(episode.publishedAt)}</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {formatDuration(episode.duration)}</span>
                  </span>
                  <button className="btn btn-primary btn-sm btn-square" onClick={e => { e.stopPropagation(); onPlay(episode); }}>
                    <Play size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Mobile list-row layout */}
          <div className="sm:hidden relative overflow-hidden">
            <img
              src={episode.artwork || '/default-cover.svg'}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-sm opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/85 to-base-100/50" />
            <div className="relative p-3">
              <div className="flex gap-3 items-start">
                <img
                  src={episode.artwork || '/default-cover.svg'}
                  alt={episode.title}
                  className="w-16 h-16 rounded object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base line-clamp-2 leading-tight mb-1">{episode.title}</h3>
                  <p className="text-sm opacity-80">{episode.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(episode.publishedAt)}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {formatDuration(episode.duration)}</span>
                </span>
                <button className="btn btn-ghost btn-sm btn-square" onClick={e => { e.stopPropagation(); onPlay(episode); }}>
                  <Play size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop side layout */}
          <figure className="!hidden sm:!block w-40 shrink-0">
            <img src={episode.artwork || '/default-cover.svg'} alt={episode.title} className="w-full h-full object-cover rounded-lg" />
          </figure>
          <div className="!hidden sm:!block card-body px-4 py-2 min-w-0">
            <h3 className="card-title text-base">{episode.title}</h3>
            <p className="text-sm opacity-70 line-clamp-3">{episode.description}</p>
            <div className="card-actions justify-between items-center mt-auto pt-2">
              <div className="flex gap-2 text-xs opacity-60">
                <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(episode.publishedAt)}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {formatDuration(episode.duration)}</span>
              </div>
              <button className="btn btn-ghost btn-sm btn-square" onClick={e => { e.stopPropagation(); onPlay(episode); }}>
                <Play size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default EpisodeCard;
