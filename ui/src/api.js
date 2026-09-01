import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

export const getPodcasts = () => api.get('/podcasts').then(r => r.data);
export const getPublicPodcasts = () => api.get('/podcasts/public').then(r => r.data);
export const getPodcast = slug => api.get(`/podcasts/${slug}`).then(r => r.data);
export const createPodcast = data => api.post('/podcasts', data).then(r => r.data);
export const updatePodcast = (id, data) => api.put(`/podcasts/${id}`, data).then(r => r.data);
export const deletePodcast = id => api.delete(`/podcasts/${id}`);

export const getAllEpisodes = () => api.get('/episodes').then(r => r.data);
export const getEpisodes = podcastSlug => api.get(`/episodes/by-podcast/${podcastSlug}`).then(r => r.data);
export const getEpisodesByPodcastId = podcastId => api.get(`/episodes/by-podcast-id/${podcastId}`).then(r => r.data);
export const getEpisodeBySlug = slug => api.get(`/episodes/slug/${slug}`).then(r => r.data);
export const getEpisodeById = id => api.get(`/episodes/id/${id}`).then(r => r.data);
export const createEpisode = data => api.post('/episodes', data).then(r => r.data);
export const updateEpisode = (id, data) => api.put(`/episodes/${id}`, data).then(r => r.data);
export const deleteEpisode = id => api.delete(`/episodes/${id}`);

export async function uploadFile(file, type = 'artwork') {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post(`/upload/${type}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export const getRssUrl = (slug, groupSlug) => {
  if (!slug) return '/api/rss';
  return groupSlug ? `/api/rss/${slug}/${groupSlug}` : `/api/rss/${slug}`;
};

export const getImportFiles = () => api.get('/import').then(r => r.data);
export const runBatchImport = data => api.post('/import', data).then(r => r.data);

export const login = (password) => api.post('/auth/login', { username: 'admin', password }).then(r => r.data);
export const logout = () => api.post('/auth/logout').then(r => r.data);
export const getMe = () => api.get('/auth/me').then(r => r.data).catch(() => null);

export const logPlay = id => api.post(`/episodes/${id}/play`);
export const logDownload = id => api.post(`/episodes/${id}/download`);
export const getStats = () => api.get('/stats').then(r => r.data);
export const getEpisodeStats = id => api.get(`/stats/episodes/${id}`).then(r => r.data);
