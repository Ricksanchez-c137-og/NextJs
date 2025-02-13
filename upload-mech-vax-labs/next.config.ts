/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config: { experiments: { asyncWebAssembly: boolean; layers: boolean; }; }, { isServer }: any) => {
    config.experiments = { asyncWebAssembly: true, layers: true };
    return config;
  },
};

module.exports = nextConfig;
