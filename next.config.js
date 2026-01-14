/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	webpack: (config) => {
		// Exclude prisma.config.ts from compilation by ignoring it
		config.module.rules.push({
			test: /prisma\.config\.ts$/,
			use: {
				loader: require.resolve('./ignore-loader.js'),
			},
		});
		return config;
	},
};

module.exports = nextConfig;
