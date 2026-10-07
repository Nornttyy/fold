// Compatibility entry point: regenerate the current full music/drum library.
// All composition sources now live in render-library.mjs and render-feedback.mjs.
await import('./render-library.mjs');
await import('./render-feedback.mjs');
