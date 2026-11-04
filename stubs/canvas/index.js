// The real 'canvas' package (native, server-side drawing) is not used by this
// site: the editor draws in the browser. jsdom and fabric call require('canvas')
// inside try/catch and carry on without it. This file keeps that behaviour —
// it throws like a missing module — while letting Cloudflare's bundler resolve it.
const err = new Error("Cannot find module 'canvas'");
err.code = 'MODULE_NOT_FOUND';
throw err;
