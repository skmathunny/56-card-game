import { v4 as uuid } from 'uuid';
import { Player, TeamId } from '../models/Player';

interface AIPersona {
  displayName: string;
  avatarUrl: string;
}

const PERSONAS: AIPersona[] = [
  { displayName: 'Arjun',  avatarUrl: 'avatar://ai/arjun' },
  { displayName: 'Priya',  avatarUrl: 'avatar://ai/priya' },
  { displayName: 'Ravi',   avatarUrl: 'avatar://ai/ravi' },
  { displayName: 'Meena',  avatarUrl: 'avatar://ai/meena' },
  { displayName: 'Suresh', avatarUrl: 'avatar://ai/suresh' },
  { displayName: 'Nisha',  avatarUrl: 'avatar://ai/nisha' },
  { displayName: 'Vikram', avatarUrl: 'avatar://ai/vikram' },
  { displayName: 'Deepa',  avatarUrl: 'avatar://ai/deepa' },
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
