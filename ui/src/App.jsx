import { Routes, Route } from 'react-router-dom';
import AdminLayout from './pages/Admin/Layout.jsx';
import AdminDashboard from './pages/Admin/Dashboard.jsx';
import PodcastEditor from './pages/Admin/PodcastEditor.jsx';
import EpisodeEditor from './pages/Admin/EpisodeEditor.jsx';
import BatchImport from './pages/Admin/BatchImport.jsx';
import PodcastEpisodes from './pages/Admin/PodcastEpisodes.jsx';
import Stats from './pages/Admin/Stats.jsx';
import Login from './pages/Admin/Login.jsx';
import PublicPodcast from './pages/Public/PodcastPage.jsx';
import PublicEpisode from './pages/Public/EpisodePage.jsx';
import EmbedPlayer from './pages/Public/EmbedPlayer.jsx';
import Home from './pages/Public/Home.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/podcast/:slug" element={<PublicPodcast />} />
      <Route path="/podcast/:slug/episode/:episodeSlug" element={<PublicEpisode />} />
      <Route path="/embed/:slug" element={<EmbedPlayer />} />
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="podcast/new" element={<PodcastEditor />} />
        <Route path="podcast/:id" element={<PodcastEditor />} />
        <Route path="podcast/:id/episodes" element={<PodcastEpisodes />} />
        <Route path="podcast/:podcastId/episode/new" element={<EpisodeEditor />} />
        <Route path="episode/:id" element={<EpisodeEditor />} />
        <Route path="import" element={<BatchImport />} />
        <Route path="stats" element={<Stats />} />
      </Route>
    </Routes>
  );
}

export default App;
