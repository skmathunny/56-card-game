// Single source of truth for all socket event names.
// Mirror the CLIENT_EVENTS constants in the frontend.

export const CLIENT_EVENTS = {
  JOIN_ROOM:              'join-room',
  LEAVE_ROOM:             'leave-room',
  ADD_AI:                 'add-ai',
  REMOVE_AI:              'remove-ai',
  START_GAME:             'start-game',
  PLACE_BID:              'place-bid',
  PASS:                   'pass',
  DOUBLE:                 'double',
  REDOUBLE:               'redouble',
  PLAY_CARD:              'play-card',
  REQUEST_TRICK_HISTORY:  'request-trick-history',
  VOTE_TRICK_HISTORY:     'vote-trick-history',
  SEND_MESSAGE:           'send-message',
} as const;

export const SERVER_EVENTS = {
  GAME_STATE_UPDATED:             'game:state-updated',
  ROOM_UPDATED:                   'room:updated',
  GAME_TRICK_HISTORY_REQUESTED:   'game:trick-history-requested',
  GAME_TRICK_HISTORY_RESULT:      'game:trick-history-result',
  GAME_ROUND_COMPLETE:            'game:round-complete',
  GAME_COMPLETE:                  'game:complete',
  CHAT_MESSAGE:                   'chat:message',
  PLAYER_DISCONNECTED:            'player:disconnected',
  PLAYER_RECONNECTED:             'player:reconnected',
  PLAYER_AI_TAKEOVER:             'player:ai-takeover',
} as const;

export type ClientEvent = typeof CLIENT_EVENTS[keyof typeof CLIENT_EVENTS];
export type ServerEvent = typeof SERVER_EVENTS[keyof typeof SERVER_EVENTS];
