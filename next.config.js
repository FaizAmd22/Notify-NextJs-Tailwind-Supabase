const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    images: {
      domains: ["ytyzmeyisffotibfdynv.supabase.co"]
    },
  
    webpack: (config, { isServer }) => {
      if (!isServer) {
        config.resolve.fallback = {
          fs: false,
        };
      }
  
      return config;
    },
  };
  
  module.exports = nextConfig;

// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   images: {
//     domains: ["maswvxeautrvefnhovcw.supabase.co"]
//   }
// }

// module.exports = nextConfig
