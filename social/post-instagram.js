const GRAPH_VERSION = process.env.IG_GRAPH_VERSION || 'v21.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

function config() {
  return {
    token: process.env.IG_ACCESS_TOKEN,
    userId: process.env.IG_USER_ID,
  };
}

export function igConfigured() {
  const c = config();
  return Boolean(c.token && c.userId);
}

/**
 * Publish a single image post to an Instagram Business/Creator account.
 *
 * Instagram's Content Publishing API cannot post text-only — a publicly
 * reachable HTTPS `imageUrl` is required. Returns the published media id.
 */
export async function postToInstagram({ caption, imageUrl }) {
  const { token, userId } = config();
  if (!imageUrl) {
    throw new Error('Instagram requires a public imageUrl (text-only posts are not supported).');
  }

  // Step 1: create a media container.
  const createRes = await fetch(`${GRAPH}/${userId}/media`, {
    method: 'POST',
    body: new URLSearchParams({ image_url: imageUrl, caption, access_token: token }),
  });
  if (!createRes.ok) {
    throw new Error(`Instagram container create failed: ${createRes.status} ${await createRes.text()}`);
  }
  const { id: creationId } = await createRes.json();

  // Step 2: publish the container.
  const publishRes = await fetch(`${GRAPH}/${userId}/media_publish`, {
    method: 'POST',
    body: new URLSearchParams({ creation_id: creationId, access_token: token }),
  });
  if (!publishRes.ok) {
    throw new Error(`Instagram publish failed: ${publishRes.status} ${await publishRes.text()}`);
  }
  const data = await publishRes.json();
  return data.id;
}
