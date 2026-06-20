import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// 1店舗1ページの静的サイト生成。営業デモ用なので静的出力で十分。
export default defineConfig({
  integrations: [tailwind({ applyBaseStyles: true })],
  site: 'https://demo.example.com'
});
