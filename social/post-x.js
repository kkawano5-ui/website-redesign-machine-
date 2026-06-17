import fs from 'node:fs/promises';
import { buildOAuthHeader } from './lib/oauth1.js';

function credentials() {
  return {
    consumerKey: process.env.X_API_KEY,
    consumerSecret: process.env.X_API_SECRET,
    token: process.env.X_ACCESS_TOKEN,
    tokenSecret: process.env.X_ACCESS_SECRET,
  };
}

export function xConfigured() {
  const c = credentials();
  return Boolean(c.consumerKey && c.consumerSecret && c.token && c.tokenSecret);
}

// Upload an image via the v1.1 media endpoint and return its media_id.
async function uploadMedia(imagePath) {
  const url = 'https://upload.twitter.com/1.1/media/upload.json';
  const header = buildOAuthHeader({ method: 'POST', url, params: {}, ...credentials() });

  const buffer = await fs.readFile(imagePath);
  const form = new FormData();
  form.append('media', new Blob([buffer]));

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: header },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`X media upload failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.media_id_string;
}

/**
 * Post a tweet (optionally with one image). Returns the new tweet id.
 */
export async function postToX({ text, imagePath }) {
  const url = 'https://api.twitter.com/2/tweets';
  const body = { text };

  if (imagePath) {
    const mediaId = await uploadMedia(imagePath);
    body.media = { media_ids: [mediaId] };
  }

  const header = buildOAuthHeader({ method: 'POST', url, params: {}, ...credentials() });
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: header, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`X post failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data?.data?.id;
}
