/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    webpack: (config) => {
        // Ignore prisma.config.ts if it exists
        config.module.rules.push({
            test: /prisma\.config\.ts$/,
            use: 'ignore-loader',
        })
        return config
    },
}

module.exports = nextConfig
