import { ScullyConfig } from '@scullyio/scully';
import '@scullyio/scully-plugin-puppeteer';
export const config: ScullyConfig = {
  projectRoot: './src',
  projectName: 'zahlenraten-game',
  distFolder: './dist/zahlenraten-game/browser',
  outDir: './dist/static',
  defaultRouteRenderer: 'scully-plugin-puppeteer',
  puppeteerLaunchOptions: {
    executablePath:
      process.env.CHROMIUM_PATH || process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  },
  /** ✨ Liste aller statischen Seiten */ extraRoutes: [
    '/',
    '/login',
    '/register',
    '/game',
    '/admin',
    '/achievements',
    '/profile',
    '/how-to-play',
    '/clicker',
    '/card-shop',
    '/skill-shop',
    '/pack-opening',
    '/village',
    '/slot-maschine',
    '/impressum',
    '/datenschutz',
    '/about',
    '/contact',
  ],
  /** Nur für dynamische/parametrisierte Routen Plugins angeben */ routes: {
    '/profile/:username': { type: 'json', username: ['Luca', 'Gast', 'admin'] },
  },
};
