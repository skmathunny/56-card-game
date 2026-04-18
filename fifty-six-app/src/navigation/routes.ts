export const ROUTES = {
  SPLASH:        'Splash',
  LOGIN:         'Login',
  PROFILE_SETUP: 'ProfileSetup',
  HOME:          'Home',
  PROFILE:       'Profile',
  CREATE_ROOM:   'CreateRoom',
  JOIN_ROOM:     'JoinRoom',
  WAITING_ROOM:  'WaitingRoom',
  DEAL_AND_BID:  'DealAndBid',
  PLAY:          'Play',
  ROUND_SUMMARY: 'RoundSummary',
  END_GAME:      'EndGame',
} as const;

export type RouteNames = typeof ROUTES[keyof typeof ROUTES];
