module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:5202/?lang=en', 'http://127.0.0.1:5202/?lang=km'],
      startServerCommand: 'node scripts/qa/serve-public-build.mjs',
      startServerReadyPattern: 'Public build ready',
      numberOfRuns: 3,
      // Measure actual slow-4G/4x-CPU browser paints; do not infer them from the asynchronous app graph.
      settings: { throttlingMethod: 'devtools', throttling: { rttMs: 150, throughputKbps: 1638.4, requestLatencyMs: 562.5, downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675, cpuSlowdownMultiplier: 4 }, formFactor: 'mobile', chromeFlags: '--headless --no-sandbox', onlyCategories: ['performance', 'accessibility', 'seo'] },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500, aggregationMethod: 'median' }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.099, aggregationMethod: 'median' }],
        'resource-summary:total:count': ['error', { maxNumericValue: 45 }],
        'resource-summary:total:size': ['error', { maxNumericValue: 449999 }],
      },
    },
    upload: { target: 'filesystem', outputDir: './artifacts/lighthouse' },
  },
};
