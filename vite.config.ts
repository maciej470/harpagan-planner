import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig(({ mode }) => ({ base: mode === 'production' ? '/harpagan-planner/' : '/', publicDir: 'public', resolve: { alias: { '@': resolve(__dirname, 'src') } } }));
