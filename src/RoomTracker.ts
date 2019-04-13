import ExpandedEventEmitter from './ExpandedEventEmitter';
import TwitchIRC from './chat';

// This keeps track of what channels/rooms that the Twitch IRC client is in
// Also keeps track of room states. Like slow mode, sub mode, follower mode etc.

interface RoomTracker {
  addListener(event: string, listener: (...args: any[]) => void): this;
  /** When a channel is joined */
  addListener(event: 'join', listener: (channel: string) => void): this;
  /** When a channel is left */
  addListener(event: 'part', listener: (channel: string) => void): this;
  /** When a channel room state has changed */
  addListener(event: 'state', listener: (channel: string, state: RoomState) => void): this;
  /** When any changes has been made to any room (join, left, room state) */
  addListener(event: 'change', listener: (channel: string) => void): this;

  on(event: string, listener: (...args: any[]) => void): this;
  /** When a channel is joined */
  on(event: 'join', listener: (channel: string) => void): this;
  /** When a channel is left */
  on(event: 'part', listener: (channel: string) => void): this;
  /** When a channel room state has changed */
  on(event: 'state', listener: (channel: string, state: RoomState) => void): this;
  /** When any changes has been made to any room (join, left, room state) */
  on(event: 'change', listener: (channel: string) => void): this;
  
  once(event: string, listener: (...args: any[]) => void): this;
  /** When a channel is joined */
  once(event: 'join', listener: (channel: string) => void): this;
  /** When a channel is left */
  once(event: 'part', listener: (channel: string) => void): this;
  /** When a channel room state has changed */
  once(event: 'state', listener: (channel: string, state: RoomState) => void): this;
  /** When any changes has been made to any room (join, left, room state) */
  once(event: 'change', listener: (channel: string) => void): this;
  
  emit(event: string, ...args: any[]): boolean;
  emit(event: 'join', channel: string): boolean;
  emit(event: 'part', channel: string): boolean;
  emit(event: 'state', channel: string, state: RoomState): boolean;
  emit(event: 'change', channel: string): boolean;
}

interface RoomState {
  "room-id"?: string,
  "emote-only"?: boolean,
  r9k?: boolean,
  slow?: number,
}

interface Room {
  channel: string,
  state: RoomState | null,
}

class RoomTracker extends ExpandedEventEmitter {
  rooms: Room[];

  /**
   * @param twitchIRC The Twitch IRC client
   */
  constructor(twitchIRC: TwitchIRC) {
    super();
    this.rooms = [];
    twitchIRC.addListener('join', (channel) => {
      const index = this._getRoomObjIndex(channel);
      if (index === -1) {
        const roomObj = {
          channel: channel,
          state: null
        };
        this.rooms.push(roomObj);
        this.emit('join', channel);
        this.emit('change', channel);
      }
    });
    twitchIRC.addListener('part', (channel) => {
      const index = this._getRoomObjIndex(channel);
      if (index !== -1) {
        this.rooms.splice(index, 1);
        this.emit('part', channel);
        this.emit('change', channel);
      }
    });
    twitchIRC.addListener('roomstate', (channel, tags) => {
      const roomObj = this._getRoomObj(channel);
      if (roomObj !== null) {
        roomObj.state = tags;
        this.emit('state', channel, tags);
        this.emit('change', channel);
      }
    });
  }

  /**
   * @param channel The Twitch channel name
   * @returns If in channel chat room or not
   */
  isInChannel(channel: string): boolean {
    return this._getRoomObjIndex(channel) !== -1;
  }

  /**
   * Get the room state tags
   * @param channel The Twitch channel name
   * @returns The room state tags, or null if not in channel or not gotten the state yet
   */
  getChannelState(channel: string): RoomState | null {
    const roomObj = this._getRoomObj(channel);
    return roomObj !== null ? roomObj.state : null;
  }

  /**
   * @returns An array of room objects with channel and state variables
   */
  getChannels(): Room[] {
    // Basically copy the rooms array
    return this.rooms.map(e => e);
  }

  /**
   * @param channel The Twitch channel name
   * @returns The internal room object, null if not found
   */
  _getRoomObj(channel: string): Room {
    const index = this._getRoomObjIndex(channel);
    return index === -1 ? null : this.rooms[index];
  }

  /**
   * @param channel The Twitch channel name
   * @returns The internal room index, -1 if not found
   */
  _getRoomObjIndex(channel: string): number {
    if (channel.startsWith('#')) channel = channel.substring(1);
    for (let i = 0; i < this.rooms.length; i++) {
      if (this.rooms[i].channel === channel) return i;
    }
    return -1;
  }
}

export = RoomTracker;