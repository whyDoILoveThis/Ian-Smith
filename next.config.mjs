/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['firebasestorage.googleapis.com', 'fra.cloud.appwrite.io', 'nyc.cloud.appwrite.io', 'img.clerk.com', 'picsum.photos'],
      },
    headers: async () => [
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ],
    webpack: (config, { isServer }) => {
      if (isServer) {
        // Server: externalize ML packages entirely — they're only used
        // at runtime on the client via dynamic import().
        config.externals = [
          ...(Array.isArray(config.externals) ? config.externals : []),
          "@huggingface/transformers",
          "onnxruntime-node",
          "onnxruntime-web",
        ];
      } else {
        // Client: prevent onnxruntime-node (native addon) from being bundled
        config.resolve.alias = {
          ...config.resolve.alias,
          "onnxruntime-node": false,
        };
        config.module.rules.push({
          test: /\.node$/,
          use: "null-loader",
        });
      }
      return config;
    },
};

export default nextConfig;
