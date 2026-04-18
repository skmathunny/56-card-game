import { v4 as uuid } from 'uuid';
import { Player, TeamId } from '../models/Player';

interface AIPersona {
  displayName: string;
  avatarUrl: string;
}

const PERSONAS: AIPersona[] = [
  { displayName: 'Arjun',  avatarUrl: '🦊' },
  { displayName: 'Priya',  avatarUrl: '🦋' },
  { displayName: 'Ravi',   avatarUrl: '🐯' },
  { displayName: 'Meena',  avatarUrl: '🦚' },
  { displayName: 'Suresh', avatarUrl: '🐻' },
  { displayName: 'Nisha',  avatarUrl: '🦅' },
  { displayName: 'Vikram', avatarUrl: '🐲' },
  { displayName: 'Deepa',  avatarUrl: '🌺' },
];

let personaIndex = 0;

export function createAIPlayer(seatIndex: number, teamId: TeamId): Player {
  const persona = PERSONAS[personaIndex % PERSONAS.length];
  personaIndex++;

  return {
    id: `ai-${uuid()}`,
    userId: null,
    displayName: persona.displayName,
    avatarUrl: persona.avatarUrl,
    seatIndex,
    teamId,
    isAI: true,
    isConnected: true,
    isHost: false,
    hand: [],
  };
}
