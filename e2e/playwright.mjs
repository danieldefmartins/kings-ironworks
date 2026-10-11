// Keep browser tooling outside the application's dependency tree.
import { createRequire } from 'node:module';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE || import.meta.url);
export const { chromium } = require('playwright');
