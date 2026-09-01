import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../../api.js';

function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/admin';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card bg-base-100 shadow-xl w-full max-w-sm">
        <div className="card-body">
          <h1 className="card-title text-2xl font-bold">Casterr Admin</h1>
          <p className="opacity-70">Sign in to manage podcasts.</p>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="label"><span className="label-text">Password</span></label>
              <input
                type="password"
                className="input input-bordered w-full"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
            {error && <div className="alert alert-error text-sm">{error}</div>}
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
