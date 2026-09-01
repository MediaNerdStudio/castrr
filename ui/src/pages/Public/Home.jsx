import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicPodcasts } from '../../api.js';

function Home() {
  const [podcasts, setPodcasts] = useState([]);

  useEffect(() => {
    getPublicPodcasts().then(setPodcasts);
  }, []);

  return (
    <div className="min-h-screen bg-base-100">
      <div className="navbar min-h-14 bg-base-200 px-2 sm:px-4">
        <a className="btn btn-ghost text-lg sm:text-xl font-bold">Casterr</a>
        <Link to="/admin" className="btn btn-sm btn-ghost ml-auto">Admin</Link>
      </div>
      <div className="max-w-full sm:max-w-[75%] mx-auto p-4 sm:p-6">
        <h1 className="text-3xl sm:text-4xl font-bold mb-5 sm:mb-8">Discover podcasts</h1>
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {podcasts.map(p => (
            <Link key={p.id} to={`/podcast/${p.slug}`} className="card bg-base-200 hover:bg-base-300 transition-colors shadow">
              <figure className="h-44 sm:h-48">
                <img src={p.artwork || '/default-cover.svg'} alt={p.title} className="w-full h-full object-cover" />
              </figure>
              <div className="card-body">
                <h2 className="card-title">{p.title}</h2>
                <p className="opacity-70 line-clamp-2">{p.description}</p>
                <div className="card-actions mt-2">
                  <span className="badge badge-primary">{(p.categories || [])[0] || 'Podcast'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {podcasts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xl opacity-60">No public podcasts yet.</p>
            <Link to="/admin" className="btn btn-primary mt-4">Create one in admin</Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
