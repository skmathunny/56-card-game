import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomManager } from '../rooms/RoomManager';
import type { Server } from 'socket.io';
import type { RoomSettings } from '../rooms/GameRoom';

// ── Mock socket.io Server ─────────────────────────────────────────────────────

function mockIO(): Server {
  return {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
    in: vi.fn().mockReturnThis(),
    socketsLeave: vi.fn(),
  } as unknown as Server;
}

const BASE_SETTINGS: RoomSettings = {
  playerCount: 4,
  startingTables: 7,
  bidTimerSeconds: 30,
  playTimerSeconds: 30,
  expiryHours: 4,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeManager() {
  return new RoomManager(mockIO());
}

// ── Room creation ─────────────────────────────────────────────────────────────

describe('RoomManager – room creation', () => {
  it('creates a room and returns it with an id and code', () => {
    const rm = makeManager();
    const room = rm.createRoom(BASE_SETTINGS);
    expect(room.id).toMatch(/^room-/);
    expect(room.code).toHaveLength(5);
    expect(rm.roomCount).toBe(1);
  });

  it('generates unique codes across multiple rooms', () => {
    const rm = makeManager();
    const codes = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const room = rm.createRoom(BASE_SETTINGS);
      codes.add(room.code);
    }
    expect(codes.size).toBe(5);
  });

  it('increments roomCount per room created', () => {
    const rm = makeManager();
    expect(rm.roomCount).toBe(0);
    rm.createRoom(BASE_SETTINGS);
    expect(rm.roomCount).toBe(1);
    rm.createRoom(BASE_SETTINGS);
    expect(rm.roomCount).toBe(2);
  });

  it('persists settings on the created room', () => {
    const rm = makeManager();
    const room = rm.createRoom({ ...BASE_SETTINGS, startingTables: 10, bidTimerSeconds: 60 });
    expect(room.settings.startingTables).toBe(10);
    expect(room.settings.bidTimerSeconds).toBe(60);
  });
});

// ── Room limit enforcement ────────────────────────────────────────────────────

describe('RoomManager – room limit (MAX_ROOMS = 5)', () => {
  it('isFull() returns false when 0 rooms exist', () => {
    const rm = makeManager();
    expect(rm.isFull()).toBe(false);
  });

  it('isFull() returns false when 4 rooms exist', () => {
    const rm = makeManager();
    for (let i = 0; i < 4; i++) rm.createRoom(BASE_SETTINGS);
    expect(rm.isFull()).toBe(false);
  });

  it('isFull() returns true when 5 rooms exist', () => {
    const rm = makeManager();
    for (let i = 0; i < 5; i++) rm.createRoom(BASE_SETTINGS);
    expect(rm.isFull()).toBe(true);
  });

  it('isFull() returns false after a room is deleted from a full server', () => {
    const rm = makeManager();
    const rooms = [];
    for (let i = 0; i < 5; i++) rooms.push(rm.createRoom(BASE_SETTINGS));
    expect(rm.isFull()).toBe(true);

    rm.deleteRoom(rooms[0].id);
    expect(rm.isFull()).toBe(false);
    expect(rm.roomCount).toBe(4);
  });

  it('isFull() stays true while 5 rooms remain', () => {
    const rm = makeManager();
    const rooms = [];
    for (let i = 0; i < 5; i++) rooms.push(rm.createRoom(BASE_SETTINGS));
    rm.deleteRoom(rooms[0].id);
    rm.createRoom(BASE_SETTINGS); // refill
    expect(rm.isFull()).toBe(true);
  });
});

// ── Room lookup ───────────────────────────────────────────────────────────────

describe('RoomManager – lookup', () => {
  it('getRoomByCode returns the room for a known code', () => {
    const rm = makeManager();
    const room = rm.createRoom(BASE_SETTINGS);
    expect(rm.getRoomByCode(room.code)).toBe(room);
  });

  it('getRoomByCode is case-insensitive', () => {
    const rm = makeManager();
    const room = rm.createRoom(BASE_SETTINGS);
    const lower = room.code.toLowerCase();
    expect(rm.getRoomByCode(lower)).toBe(room);
  });

  it('getRoomByCode returns null for unknown code', () => {
    const rm = makeManager();
    expect(rm.getRoomByCode('ZZZZZ')).toBeNull();
  });

  it('getRoomById returns the room for a known id', () => {
    const rm = makeManager();
    const room = rm.createRoom(BASE_SETTINGS);
    expect(rm.getRoomById(room.id)).toBe(room);
  });

  it('getRoomById returns null for unknown id', () => {
    const rm = makeManager();
    expect(rm.getRoomById('room-does-not-exist')).toBeNull();
  });
});

// ── Room deletion ─────────────────────────────────────────────────────────────

describe('RoomManager – deleteRoom', () => {
  it('deleteRoom removes the room from the manager', () => {
    const rm = makeManager();
    const room = rm.createRoom(BASE_SETTINGS);
    rm.deleteRoom(room.id);
    expect(rm.roomCount).toBe(0);
    expect(rm.getRoomById(room.id)).toBeNull();
    expect(rm.getRoomByCode(room.code)).toBeNull();
  });

  it('deleteRoom is idempotent for unknown id', () => {
    const rm = makeManager();
    expect(() => rm.deleteRoom('nonexistent-id')).not.toThrow();
  });

  it('deleting one room does not affect others', () => {
    const rm = makeManager();
    const r1 = rm.createRoom(BASE_SETTINGS);
    const r2 = rm.createRoom(BASE_SETTINGS);
    rm.deleteRoom(r1.id);
    expect(rm.getRoomById(r2.id)).toBe(r2);
    expect(rm.roomCount).toBe(1);
  });

  it('deleting and re-creating cycles roomCount correctly', () => {
    const rm = makeManager();
    const r = rm.createRoom(BASE_SETTINGS);
    rm.deleteRoom(r.id);
    expect(rm.roomCount).toBe(0);
    rm.createRoom(BASE_SETTINGS);
    expect(rm.roomCount).toBe(1);
  });
});

// ── deleteIfEmpty ─────────────────────────────────────────────────────────────

describe('RoomManager – deleteIfEmpty', () => {
  it('deleteIfEmpty removes an empty room', () => {
    const rm = makeManager();
    const room = rm.createRoom(BASE_SETTINGS);
    // room has no human players → isEmpty() returns true
    rm.deleteIfEmpty(room);
    expect(rm.roomCount).toBe(0);
    expect(rm.getRoomById(room.id)).toBeNull();
  });
});

// ── Room limit + HTTP 429 simulation ─────────────────────────────────────────

describe('Server room limit HTTP 429 scenario', () => {
  it('isFull() correctly drives a 429 response decision', () => {
    const rm = makeManager();
    for (let i = 0; i < 5; i++) rm.createRoom(BASE_SETTINGS);

    // Mimic the route handler logic from src/index.ts
    function attemptCreate(): { status: number; body: object } {
      if (rm.isFull()) {
        return { status: 429, body: { error: 'SERVER_ROOM_LIMIT' } };
      }
      const room = rm.createRoom(BASE_SETTINGS);
      return { status: 201, body: { code: room.code } };
    }

    const res = attemptCreate();
    expect(res.status).toBe(429);
    expect((res.body as any).error).toBe('SERVER_ROOM_LIMIT');
  });

  it('can create a room after one is deleted (frees capacity)', () => {
    const rm = makeManager();
    const rooms = [];
    for (let i = 0; i < 5; i++) rooms.push(rm.createRoom(BASE_SETTINGS));

    function attemptCreate(): { status: number; body: object } {
      if (rm.isFull()) {
        return { status: 429, body: { error: 'SERVER_ROOM_LIMIT' } };
      }
      const room = rm.createRoom(BASE_SETTINGS);
      return { status: 201, body: { code: room.code } };
    }

    expect(attemptCreate().status).toBe(429);

    rm.deleteRoom(rooms[0].id);
    const second = attemptCreate();
    expect(second.status).toBe(201);
    expect(rm.roomCount).toBe(5);
  });

  it('6th room always gets 429 until one is freed', () => {
    const rm = makeManager();
    const rooms: string[] = [];
    for (let i = 0; i < 5; i++) rooms.push(rm.createRoom(BASE_SETTINGS).id);

    for (let attempt = 0; attempt < 3; attempt++) {
      expect(rm.isFull()).toBe(true);
    }

    rm.deleteRoom(rooms[4]);
    expect(rm.isFull()).toBe(false);
  });
});

// ── Exit then create scenarios ────────────────────────────────────────────────

describe('exit → create room lifecycle on server', () => {
  it('roomCount decreases when a room is removed after player exits', () => {
    const rm = makeManager();
    const room = rm.createRoom(BASE_SETTINGS);
    expect(rm.roomCount).toBe(1);

    // Simulate: last human player exits → deleteIfEmpty called
    rm.deleteIfEmpty(room); // room has no humans → deletes
    expect(rm.roomCount).toBe(0);
  });

  it('player can create a new room after their previous room is cleaned up', () => {
    const rm = makeManager();
    const r1 = rm.createRoom(BASE_SETTINGS);
    rm.deleteRoom(r1.id);

    const r2 = rm.createRoom({ ...BASE_SETTINGS, startingTables: 5 });
    expect(r2.settings.startingTables).toBe(5);
    expect(rm.roomCount).toBe(1);
  });

  it('code from deleted room is not reused in lookup', () => {
    const rm = makeManager();
    const r1 = rm.createRoom(BASE_SETTINGS);
    const code = r1.code;
    rm.deleteRoom(r1.id);

    expect(rm.getRoomByCode(code)).toBeNull();
  });

  it('multiple create/delete cycles keep roomCount accurate', () => {
    const rm = makeManager();

    for (let cycle = 0; cycle < 3; cycle++) {
      const rooms = [];
      for (let i = 0; i < 3; i++) rooms.push(rm.createRoom(BASE_SETTINGS));
      expect(rm.roomCount).toBe(3);
      for (const r of rooms) rm.deleteRoom(r.id);
      expect(rm.roomCount).toBe(0);
    }
  });
});
