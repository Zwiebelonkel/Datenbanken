// zahlenraten-game/scully.zahlenraten-game.config.ts
import { ScullyConfig } from '@scullyio/scully';
import '@scullyio/scully-plugin-puppeteer'; // wichtig: Plugin aktivieren

export const config: ScullyConfig = {
  projectRoot: './src',
  projectName: 'zahlenraten-game',                     // muss exakt zu angular.json passen
  distFolder: './dist/zahlenraten-game/browser',       // Angular build output
  outDir: './dist/static',                             // Scully prerender output
  defaultRouteRenderer: 'scully-plugin-puppeteer',

  puppeteerLaunchOptions: {
    // in CI wird über env CHROMIUM_PATH gesetzt
    executablePath:
      process.env.CHROMIUM_PATH || process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  },

  routes: {
    '/': { type: 'default' },
    '/login': { type: 'default' },
    '/register': { type: 'default' },
    '/game': { type: 'default' },
    '/admin': { type: 'default' },
    '/achievements': { type: 'default' },
    '/profile': { type: 'default' },
    '/how-to-play': { type: 'default' },
    '/clicker': { type: 'default' },
    '/card-shop': { type: 'default' },
    '/skill-shop': { type: 'default' },
    '/pack-opening': { type: 'default' },
    '/village': { type: 'default' },
    '/slot-maschine': { type: 'default' },
    '/impressum': { type: 'default' },
    '/datenschutz': { type: 'default' },
    '/about': { type: 'default' },
    '/contact': { type: 'default' },

    // Beispiel: dynamische Profile
    '/profile/:username': {
      type: 'json',
      username: ['Luca', 'Gast', 'admin'],
    },
  },
};