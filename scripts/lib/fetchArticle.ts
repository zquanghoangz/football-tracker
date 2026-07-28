export async function fetchArticleHtml(wikipediaTitle: string): Promise<string> {
  const url = `https://en.wikipedia.org/wiki/${wikipediaTitle}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'FootballTrackerBot/1.0 (personal localhost project)',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}
