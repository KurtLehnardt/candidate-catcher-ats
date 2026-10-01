import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist (via pdf-parse) dynamically imports pdf.worker.mjs as its Node
  // "fake worker" fallback. Turbopack's SSR bundler rewrites that import to a
  // chunk path that never actually contains the worker file, so resume PDF
  // uploads fail with "Setting up fake worker failed: Cannot find module
  // .../chunks/ssr/pdf.worker.mjs". Marking both packages external means
  // Turbopack leaves the import alone and Node's own module resolution
  // handles it (the file genuinely sits next to pdf.mjs in node_modules).
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
