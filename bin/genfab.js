#!/usr/bin/env node
// Thin launcher so npm accepts a .js bin path. The real entry point is the
// TypeScript file next to this one, run directly via Node's type-stripping
// (Node >= 22.6). No build step or transpilation is involved.
import "./genfab.ts";
