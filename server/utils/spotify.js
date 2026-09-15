import { env } from 'process';

let accessToken = null;
let tokenExpiry = 0;

export function spotifyConfigured() {
  return Boolean(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET);
}

async function fetchAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  });
  if (!response.ok) {
    throw new Error(`Spotify token request failed: ${response.status}`);
  }
  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
  return accessToken;
}

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }
  return fetchAccessToken();
}

export async function getSpotifyTrack(spotifyId) {
  if (!spotifyConfigured()) return null;
  if (!spotifyId) return null;
  const token = await getAccessToken();
  const response = await fetch(`https://api.spotify.com/v1/tracks/${spotifyId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) return null;
  const data = await response.json();
  const image = data.album?.images?.[0]?.url || '';
  const smallImage = data.album?.images?.slice(-1)?.[0]?.url || image;
  return {
    title: data.name || '',
    artist: data.artists?.map(a => a.name).join(', ') || '',
    artwork: image,
    artworkSmall: smallImage,
    album: data.album?.name || ''
  };
}

export async function enrichTracklist(tracklist) {
  if (!spotifyConfigured()) return;
  if (!Array.isArray(tracklist) || tracklist.length === 0) return;
  for (const track of tracklist) {
    if (!track.spotifyId || track.artwork) continue;
    const meta = await getSpotifyTrack(track.spotifyId);
    if (!meta) continue;
    track.title = meta.title || track.title || '';
    track.artist = meta.artist || track.artist || '';
    track.artwork = meta.artwork;
    track.artworkSmall = meta.artworkSmall;
    track.album = meta.album;
  }
}
