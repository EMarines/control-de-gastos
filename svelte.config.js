import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors

	kit: {
		adapter: adapter({
			runtime: 'nodejs22.x'
		}),
		alias: {
			'$lib': './src/lib'
		}
	}
};

export default config;
