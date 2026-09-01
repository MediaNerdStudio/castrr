import express from 'express';
import { getPodcasts, getEpisodes, getSettings } from '../db.js';

const router = express.Router();

function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(str) {
  if (str == null) return '';
  return `<![CDATA[${String(str).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

function formatRFC822(date) {
  return new Date(date).toUTCString();
}

function explicitValue(value) {
  if (value === 'clean') return 'clean';
  return value ? 'yes' : 'no';
}

function buildFeed(podcast, episodes, baseUrl, group = null, feedUrl = '') {
  const settings = getSettings();
  const author = podcast.author || settings.siteTitle;
  const feedTitle = group ? `${podcast.title} - ${group.title}` : podcast.title;
  const feedDescription = group ? (group.description || podcast.description) : podcast.description;
  const feedSlug = group ? `${podcast.slug}/${group.slug}` : podcast.slug;
  const imageUrl = (group?.artwork || podcast.artwork)
    ? `${baseUrl}${group?.artwork || podcast.artwork}`
    : `${baseUrl}/default-cover.svg`;

  const atomLink = feedUrl
    ? `<atom:link rel="self" type="application/rss+xml" href="${escapeXml(feedUrl)}" />`
    : '';
  const channelLink = `${baseUrl}/podcast/${feedSlug}`;
  const newFeedUrl = feedUrl ? `<itunes:new-feed-url>${escapeXml(feedUrl)}</itunes:new-feed-url>` : '';
  const copyright = podcast.copyright ? `<copyright>${escapeXml(podcast.copyright)}</copyright>` : '';
  const managingEditor = podcast.email ? `<managingEditor>${escapeXml(podcast.email)}</managingEditor>` : '';
  const podcastType = `<itunes:type>${escapeXml(podcast.type || 'episodic')}</itunes:type>`;

  const itemXml = episodes.map(ep => {
    const enclosureUrl = `${baseUrl}${ep.audioUrl}`;
    const duration = ep.duration ? `<itunes:duration>${ep.duration}</itunes:duration>` : '';
    const explicit = `<itunes:explicit>${explicitValue(ep.explicit)}</itunes:explicit>`;
    const episodeImage = ep.artwork ? `<itunes:image href="${baseUrl}${ep.artwork}" />` : '';
    const chapters = (ep.chapters || []).map(c =>
      `<podcast:chapter start="${c.start}" title="${escapeXml(c.title)}" />`
    ).join('');
    const chapterBlock = chapters ? `<podcast:chapters>${chapters}</podcast:chapters>` : '';
    const categories = (ep.tags || []).map(t => `<category>${escapeXml(t)}</category>`).join('');
    const episodeType = `<itunes:episodeType>${escapeXml(ep.episodeType || 'full')}</itunes:episodeType>`;
    const season = ep.season ? `<itunes:season>${escapeXml(String(ep.season))}</itunes:season>` : '';
    const episodeNum = ep.episode ? `<itunes:episode>${escapeXml(String(ep.episode))}</itunes:episode>` : '';
    const contentEncoded = ep.description
      ? `<content:encoded>${cdata(`<p>${escapeXml(ep.description).replace(/\n/g, '<br/>')}</p>`)}</content:encoded>`
      : '';

    return `
      <item>
        <title>${escapeXml(ep.title)}</title>
        <description>${cdata(ep.description || '')}</description>
        <link>${baseUrl}/podcast/${podcast.slug}/episode/${ep.slug}</link>
        <guid isPermaLink="false">${ep.id}</guid>
        <pubDate>${formatRFC822(ep.publishedAt)}</pubDate>
        <enclosure url="${enclosureUrl}" length="${ep.fileSize || 0}" type="${ep.mimeType || 'audio/mpeg'}" />
        <itunes:title>${escapeXml(ep.title)}</itunes:title>
        <itunes:summary>${cdata(ep.description || '')}</itunes:summary>
        ${episodeType}
        ${season}
        ${episodeNum}
        ${duration}
        ${explicit}
        ${episodeImage}
        ${categories}
        ${contentEncoded}
        ${chapterBlock}
      </item>`;
  }).join('');

  const podcastCategories = (podcast.categories || []).map(c =>
    `<itunes:category text="${escapeXml(c)}" />`
  ).join('');

  const podcastTags = (podcast.tags || []).map(t => `<category>${escapeXml(t)}</category>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:podcast="https://podcastindex.org/namespace/1.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:googleplay="http://www.google.com/schemas/play-podcasts/1.0" version="2.0">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${channelLink}</link>
    <description>${cdata(feedDescription || '')}</description>
    <language>${podcast.language || 'en'}</language>
    <lastBuildDate>${formatRFC822(new Date())}</lastBuildDate>
    ${atomLink}
    ${newFeedUrl}
    ${managingEditor}
    ${copyright}
    <itunes:author>${escapeXml(author)}</itunes:author>
    <itunes:owner>
      <itunes:name>${escapeXml(author)}</itunes:name>
      <itunes:email>${escapeXml(podcast.email || '')}</itunes:email>
    </itunes:owner>
    <itunes:summary>${cdata(feedDescription || '')}</itunes:summary>
    <itunes:explicit>${explicitValue(podcast.explicit)}</itunes:explicit>
    <itunes:image href="${imageUrl}" />
    <image>
      <url>${imageUrl}</url>
      <title>${escapeXml(feedTitle)}</title>
      <link>${channelLink}</link>
    </image>
    ${podcastType}
    ${podcastCategories}
    ${podcastTags}
    ${itemXml}
  </channel>
</rss>`;
}

function feedUrl(req) {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}${req.originalUrl}`;
}

router.get('/', (req, res) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const podcasts = getPodcasts().filter(p => !p.hidden);
  if (podcasts.length === 0) return res.status(404).send('No public podcasts found');
  const podcast = podcasts[0];
  const episodes = getEpisodes(podcast.id).filter(e => !e.draft);
  res.set('Content-Type', 'application/rss+xml');
  res.send(buildFeed(podcast, episodes, baseUrl, null, feedUrl(req)));
});

router.get('/:slug', (req, res) => {
  const podcast = getPodcasts().find(p => p.slug === req.params.slug);
  if (!podcast) return res.status(404).send('Podcast not found');
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const episodes = getEpisodes(podcast.id).filter(e => !e.draft);
  res.set('Content-Type', 'application/rss+xml');
  res.send(buildFeed(podcast, episodes, baseUrl, null, feedUrl(req)));
});

router.get('/:slug/:groupSlug', (req, res) => {
  const podcast = getPodcasts().find(p => p.slug === req.params.slug);
  if (!podcast) return res.status(404).send('Podcast not found');
  const group = (podcast.groups || []).find(g => g.slug === req.params.groupSlug);
  if (!group) return res.status(404).send('Group not found');
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const episodes = getEpisodes(podcast.id)
    .filter(e => !e.draft && e.groupId === group.id)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  res.set('Content-Type', 'application/rss+xml');
  res.send(buildFeed(podcast, episodes, baseUrl, group, feedUrl(req)));
});

export default router;
