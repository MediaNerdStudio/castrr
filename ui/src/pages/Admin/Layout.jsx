import { useEffect, useState } from 'react';
import { Link, Outlet, Navigate } from 'react-router-dom';
import { Mic2, Rss, Home, BarChart3, LogOut } from 'lucide-react';
import { getMe, logout } from '../../api.js';

function AdminLayout() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getMe().then(data => {
      setUser(data?.user || null);
    }).finally(() => setChecking(false));
  }, []);

  async function handleLogout() {
    await logout();
    setUser(null);
  }

  if (checking) return <div className="min-h-screen bg-base-200 flex items-center justify-center"><span className="loading loading-lg"></span></div>;
  if (!user) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen bg-base-200">
      <div className="drawer lg:drawer-open">
        <input id="admin-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col min-h-screen">
          <div className="navbar bg-base-100 shadow lg:hidden">
            <div className="flex-none">
              <label htmlFor="admin-drawer" className="btn btn-square btn-ghost drawer-button">
                <svg className="fill-current" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
              </label>
            </div>
            <div className="flex-1 px-2 font-bold">Casterr Admin</div>
          </div>
          <main className="flex-1 p-4 lg:p-8">
            <Outlet />
          </main>
        </div>
        <div className="drawer-side">
          <label htmlFor="admin-drawer" className="drawer-overlay"></label>
          <ul className="menu p-4 w-64 min-h-full bg-base-100 text-base-content gap-2">
            <li className="menu-title">Casterr</li>
            <li><Link to="/admin"><Home size={18} /> Dashboard</Link></li>
            <li><Link to="/admin/podcast/new"><Mic2 size={18} /> New podcast</Link></li>
            <li><Link to="/admin/stats"><BarChart3 size={18} /> Stats</Link></li>
            <li><Link to="/"><Rss size={18} /> Public site</Link></li>
            <li className="mt-auto"><button className="btn btn-ghost justify-start" onClick={handleLogout}><LogOut size={18} /> Sign out</button></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
