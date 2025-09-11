import { ScullyConfig } from '@scullyio/scully';
import '@scullyio/scully-plugin-puppeteer'; // wichtig: Plugin aktivieren

export const config: ScullyConfig = {
  projectRoot: './src',
  projectName: 'zahlenraten-game',
  outDir: './dist/static',
  distFolder: './dist/zahlenraten-game/browser', // HIER liegt deine App!
  defaultRouteRenderer: 'scully-plugin-puppeteer',
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

    '/profile/:username': {
      type: 'json',
      username: ['Luca', 'Gast', 'admin'],
    },
  },
};
