import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postToX, xConfigured } from './post-x.js';
import { postToInstagram, igConfigured } from './post-instagram.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUEUE_PATH = path.join(__dirname, 'queue.json');
const IMAGES_DIR = path.join(__dirname, 'images');

const DRY_RUN = process.argv.includes('--dry-run');

// Today's date as YYYY-MM-DD. Override with SOCIAL_TODAY for testing.
function today() {
  return process.env.SOCIAL_TODAY || new Date().toISOString().slice(0, 10);
}

// Public base URL for images (Instagram needs a reachable HTTPS URL).
// Falls back to the repo's raw.githubusercontent.com path on GitHub Actions.
function imageBaseUrl() {
  if (process.env.SOCIAL_IMAGE_BASE_URL) {
    return process.env.SOCIAL_IMAGE_BASE_URL.replace(/\/$/, '');
  }
  const repo = process.env.GITHUB_REPOSITORY;
  const ref = process.env.GITHUB_REF_NAME;
  if (repo && ref) {
    return `https://raw.githubusercontent.com/${repo}/${ref}/social/images`;
  }
  return null;
}

// Compose the post text: body + a blank line + hashtags.
function buildText(post, { forX } = {}) {
  const base = forX && post.x_text ? post.x_text : post.caption;
  const tags = (post.hashtags || []).join(' ');
  return tags ? `${base}\n\n${tags}` : base;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadQueue() {
  const raw = await fs.readFile(QUEUE_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function saveQueue(queue) {
  await fs.writeFile(QUEUE_PATH, JSON.stringify(queue, null, 2) + '\n', 'utf-8');
}

async function main() {
  const queue = await loadQueue();
  const now = today();
  const base = imageBaseUrl();

  const due = queue.posts.filter((p) => p.date <= now);
  if (due.length === 0) {
    console.log(`[social] ${now}: 配信対象の投稿はありません。`);
    return;
  }

  let changed = false;

  for (const post of due) {
    post.posted ||= {};

    // Resolve the image once per post; treat a missing file as "no image".
    let imagePath = post.image ? path.join(IMAGES_DIR, post.image) : null;
    if (imagePath && !(await fileExists(imagePath))) {
      console.warn(`[social] ${post.id}: 画像 ${post.image} が見つかりません（テキストのみで投稿）。`);
      imagePath = null;
    }
    const hasImage = Boolean(imagePath);
    const imageUrl = hasImage && base ? `${base}/${post.image}` : null;

    for (const platform of post.platforms) {
      if (post.posted[platform]) continue; // already posted

      try {
        if (platform === 'x') {
          const text = buildText(post, { forX: true });
          if (DRY_RUN || !xConfigured()) {
            console.log(`[x][dry] ${post.id}\n${text}${hasImage ? `\n(image: ${post.image})` : ''}\n`);
            continue;
          }
          const id = await postToX({ text, imagePath });
          post.posted.x = { at: new Date().toISOString(), id };
          changed = true;
          console.log(`[x] posted ${post.id} -> ${id}`);
        } else if (platform === 'instagram') {
          const caption = buildText(post);
          if (!hasImage) {
            console.warn(`[instagram] skip ${post.id}: 画像がないため投稿不可（IGは画像必須）。`);
            continue;
          }
          if (DRY_RUN || !igConfigured()) {
            console.log(`[instagram][dry] ${post.id}\n${caption}\n(image: ${imageUrl || post.image})\n`);
            continue;
          }
          if (!imageUrl) {
            console.warn(`[instagram] skip ${post.id}: 公開画像URLを解決できません（SOCIAL_IMAGE_BASE_URL を設定）。`);
            continue;
          }
          const id = await postToInstagram({ caption, imageUrl });
          post.posted.instagram = { at: new Date().toISOString(), id };
          changed = true;
          console.log(`[instagram] posted ${post.id} -> ${id}`);
        } else {
          console.warn(`[social] 未知のプラットフォーム: ${platform}`);
        }
      } catch (err) {
        console.error(`[${platform}] failed ${post.id}: ${err.message}`);
        process.exitCode = 1;
      }
    }
  }

  if (changed) {
    await saveQueue(queue);
    console.log('[social] queue.json を更新しました。');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
