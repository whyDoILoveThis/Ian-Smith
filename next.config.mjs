/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['firebasestorage.googleapis.com', 'fra.cloud.appwrite.io', 'nyc.cloud.appwrite.io', 'img.clerk.com', 'picsum.photos'],
      },
    // Exclude client-only ML binaries from Vercel's serverless function
    // file tracing. onnxruntime-node alone is ~355 MB and blows past the
    // 250 MB uncompressed limit even though it's never used server-side.
    experimental: {
      outputFileTracingExcludes: {
        '*': [
          './node_modules/onnxruntime-node/**',
          './node_modules/onnxruntime-web/**',
          './node_modules/@huggingface/transformers/**',
        ],
      },
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
        // Server: externalize heavy native / ML packages to stay under
        // Vercel's 50 MB serverless function limit.
        // • sharp — Vercel auto-installs it; bundling duplicates ~35 MB of libvips
        // • potrace — native C++ addon (~5-10 MB)
        // • @huggingface/transformers + onnxruntime — client-only ML
        config.externals = [
          ...(Array.isArray(config.externals) ? config.externals : []),
          "sharp",
          "potrace",
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
        // Treat onnxruntime-web .mjs files as ES modules so Terser
        // correctly handles import.meta instead of rejecting it.
        config.module.rules.push({
          test: /\.mjs$/,
          include: /node_modules[\\/]onnxruntime-web/,
          type: "javascript/esm",
          resolve: { fullySpecified: false },
        });
      }
      return config;
    },
};

export default nextConfig;
