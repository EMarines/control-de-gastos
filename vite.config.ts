import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		// Forzar la inclusión del archivo transactionData.js para asegurar su correcta carga
		include: ['./src/lib/data/transactionData.js']
	},
	// Permitir módulos ES en archivos JS
	esbuild: {
		supported: {
			'dynamic-import': true
		}
	}
});
