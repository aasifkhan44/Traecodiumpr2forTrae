// Game Components
import Wingo from './Wingo/Wingo';
import K3 from './K3/K3';
import FiveD from './5D/5D';
import WingoTrx from './WingoTrx/WingoTrx';
import Ludo from './Ludo/Ludo';
import Chess from './Chess/Chess';
import Numma from './Numma/Numma';
import FortuneWheel from './FortuneWheel/FortuneWheel';

// Game Routes Configuration
export const gameRoutes = [
  {
    path: '/games/wingo',
    component: Wingo,
    identifier: 'Wingo'
  },
  {
    path: '/games/k3',
    component: K3,
    identifier: 'K3'
  },
  {
    path: '/games/5d',
    component: FiveD,
    identifier: '5D'
  },
  {
    path: '/games/wingo-trx',
    component: WingoTrx,
    identifier: 'WingoTrx'
  },
  {
    path: '/games/ludo',
    component: Ludo,
    identifier: 'Ludo'
  },
  {
    path: '/games/chess',
    component: Chess,
    identifier: 'Chess'
  },
  {
    path: '/games/numma',
    component: Numma,
    identifier: 'Numma'
  },
  {
    path: '/games/fortune-wheel',
    component: FortuneWheel,
    identifier: 'FortuneWheel'
  }
];

// Export individual components
export {
  Wingo,
  K3,
  FiveD,
  WingoTrx,
  Ludo,
  Chess,
  Numma,
  FortuneWheel
};

// Export default game routes
export default gameRoutes;