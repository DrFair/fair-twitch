import * as net from 'net';
import * as EventEmitter from 'events';

/**
 * Notes:
 * Normal subs (usernotice): 
 *   tags['msg-id'] = 'sub' or 'resub'
 *   tags['msg-param-sub-plan'] = 'Prime', '1000', '2000', '3000'
 *   tags['msg-param-cumulative-months'] = String number of months subscribed
 * Gift subs (usernotice):
 *   tags['msg-id'] = 'subgift' or 'anonsubgift'
 *   tags['msg-param-sub-plan'] = 'Prime', '1000', '2000', '3000'
 *   tags['msg-param-sender-count'] = String count of gifters total gifts
 *   tags['msg-param-recipient-user-name'] = login of recipient
 *   tags['msg-param-recipient-display-name'] = display name of recipient
 *   tags['msg-param-cumulative-months'] = String number of months recipient subscribed
 * Mass gift subs (usernotice):
 *   Will first send a:
 *   tags['msg-id'] = 'submysterygift'
 *   tags['msg-param-sub-plan'] = 'Prime', '1000', '2000', '3000'
 *   tags['msg-param-mass-gift-count'] = String number of subs that's being gifted
 *   tags['msg-param-sender-count'] = String count of gifters total gifts (was 0 when admiralbahroo gave 100 subs to himself?)
 *   Then all the subs will be sent as gift subs (see above)
 * Bits (msg):
 *   tags['bits'] = https://dev.twitch.tv/docs/irc/tags#privmsg-twitch-tags
 */

// TODO: Handle Twitch RECONNECT command
// https://dev.twitch.tv/docs/irc/commands/#reconnect-twitch-commands

// IRC Client events interface
interface TwitchIRC {
  addListener(event: string, listener: (...args: any[]) => void): this;
  /** When an error has happened */
  addListener(event: 'error', callback: (error: any) => void): this;
  /** When a parse error happens */
  addListener(event: 'parseerror', callback: (line: string, error: any) => void): this;
  /** When successfully connected and authorized */
  addListener(event: 'ready', callback: () => void): this;
  /** A raw IRC event */
  addListener(event: 'raw', callback: (raw: string, parsed: ParsedMessage) => void): this;
  /** When a raw message is sent out */
  addListener(event: 'rawSend', callback: (message: string) => void): this;
  /** When you have joined a channel */
  addListener(event: 'join', callback: (channel: string) => void): this;
  /** When you have left a channel */
  addListener(event: 'part', callback: (channel: string) => void): this;
  /** When a user joined a channel */
  addListener(event: 'otherjoin', callback: (channel: string, login: string) => void): this;
  /** When a user left a channel */
  addListener(event: 'otherpart', callback: (channel: string, login: string) => void): this;
  /** When a message was submitted to a channel */
  addListener(event: 'msg', callback: (channel: string, login: string, message: string, tags: any) => void): this;
  /** When a channel changes its roomstate (like submode, slowmode) */
  addListener(event: 'roomstate', callback: (channel: string, tags: any) => void): this;
  /** When a usernotice has happened (like a sub, resub, giftsub) */
  addListener(event: 'usernotice', callback: (channel: string, login: string, message: string, tags: any) => void): this;
  /** When a channel notice happens (example: slow mode off) */
  addListener(event: 'notice', callback: (channel: string, message: string, tags: any) => void): this;
  /** Happens when a chat is cleared by a moderator */
  addListener(event: 'clearchat', callback: (channel: string) => void): this;
  /** User was permanently or temporarily banned (tags has ban-duration if not permanent) */
  addListener(event: 'userban', callback: (channel: string, login: string, tags: any) => void): this;
  /** Happens when a single message was removed */
  addListener(event: 'clearmsg', callback: (channel: string, tags: any) => void): this;
  /** Happens on successful login, tags contain information about user */
  addListener(event: 'globaluserstate', callback: (tags: any) => void): this;
  /** Happens when you join a channel, tags contain information about user */
  addListener(event: 'userstate', callback: (channel: string, tags: any) => void): this;
  /** Happens when a channel hosts a target channel. Viewers is a number is started hosting, undefined if already hosting. If taget is '-', it means it stopped hosting */
  addListener(event: 'host', callback: (channel: string, target: string, viewers?: number) => void): this;
  
  on(event: string, listener: (...args: any[]) => void): this;
  /** When an error has happened */
  on(event: 'error', callback: (error: any) => void): this;
  /** When a parse error happens */
  on(event: 'parseerror', callback: (line: string, error: any) => void): this;
  /** When successfully connected and authorized */
  on(event: 'ready', callback: () => void): this;
  /** A raw IRC event */
  on(event: 'raw', callback: (raw: string, parsed: ParsedMessage) => void): this;
  /** When a raw message is sent out */
  on(event: 'rawSend', callback: (message: string) => void): this;
  /** When you have joined a channel */
  on(event: 'join', callback: (channel: string) => void): this;
  /** When you have left a channel */
  on(event: 'part', callback: (channel: string) => void): this;
  /** When a user joined a channel */
  on(event: 'otherjoin', callback: (channel: string, login: string) => void): this;
  /** When a user left a channel */
  on(event: 'otherpart', callback: (channel: string, login: string) => void): this;
  /** When a message was submitted to a channel */
  on(event: 'msg', callback: (channel: string, login: string, message: string, tags: any) => void): this;
  /** When a channel changes its roomstate (like submode, slowmode) */
  on(event: 'roomstate', callback: (channel: string, tags: any) => void): this;
  /** When a usernotice has happened (like a sub, resub, giftsub) */
  on(event: 'usernotice', callback: (channel: string, login: string, message: string, tags: any) => void): this;
  /** When a channel notice happens (example: slow mode off) */
  on(event: 'notice', callback: (channel: string, message: string, tags: any) => void): this;
  /** Happens when a chat is cleared by a moderator */
  on(event: 'clearchat', callback: (channel: string) => void): this;
  /** User was permanently or temporarily banned (tags has ban-duration if not permanent) */
  on(event: 'userban', callback: (channel: string, login: string, tags: any) => void): this;
  /** Happens when a single message was removed */
  on(event: 'clearmsg', callback: (channel: string, tags: any) => void): this;
  /** Happens on successful login, tags contain information about user */
  on(event: 'globaluserstate', callback: (tags: any) => void): this;
  /** Happens when you join a channel, tags contain information about user */
  on(event: 'userstate', callback: (channel: string, tags: any) => void): this;
  /** Happens when a channel hosts a target channel. Viewers is a number is started hosting, undefined if already hosting. If taget is '-', it means it stopped hosting */
  on(event: 'host', callback: (channel: string, target: string, viewers?: number) => void): this;
  
  once(event: string, listener: (...args: any[]) => void): this;
  /** When an error has happened */
  once(event: 'error', callback: (error: any) => void): this;
  /** When a parse error happens */
  once(event: 'parseerror', callback: (line: string, error: any) => void): this;
  /** When successfully connected and authorized */
  once(event: 'ready', callback: () => void): this;
  /** A raw IRC event */
  once(event: 'raw', callback: (raw: string, parsed: ParsedMessage) => void): this;
  /** When a raw message is sent out */
  once(event: 'rawSend', callback: (message: string) => void): this;
  /** When you have joined a channel */
  once(event: 'join', callback: (channel: string) => void): this;
  /** When you have left a channel */
  once(event: 'part', callback: (channel: string) => void): this;
  /** When a user joined a channel */
  once(event: 'otherjoin', callback: (channel: string, login: string) => void): this;
  /** When a user left a channel */
  once(event: 'otherpart', callback: (channel: string, login: string) => void): this;
  /** When a message was submitted to a channel */
  once(event: 'msg', callback: (channel: string, login: string, message: string, tags: any) => void): this;
  /** When a channel changes its roomstate (like submode, slowmode) */
  once(event: 'roomstate', callback: (channel: string, tags: any) => void): this;
  /** When a usernotice has happened (like a sub, resub, giftsub) */
  once(event: 'usernotice', callback: (channel: string, login: string, message: string, tags: any) => void): this;
  /** When a channel notice happens (example: slow mode off) */
  once(event: 'notice', callback: (channel: string, message: string, tags: any) => void): this;
  /** Happens when a chat is cleared by a moderator */
  once(event: 'clearchat', callback: (channel: string) => void): this;
  /** User was permanently or temporarily banned (tags has ban-duration if not permanent) */
  once(event: 'userban', callback: (channel: string, login: string, tags: any) => void): this;
  /** Happens when a single message was removed */
  once(event: 'clearmsg', callback: (channel: string, tags: any) => void): this;
  /** Happens on successful login, tags contain information about user */
  once(event: 'globaluserstate', callback: (tags: any) => void): this;
  /** Happens when you join a channel, tags contain information about user */
  once(event: 'userstate', callback: (channel: string, tags: any) => void): this;
  /** Happens when a channel hosts a target channel. Viewers is a number is started hosting, undefined if already hosting. If taget is '-', it means it stopped hosting */
  once(event: 'host', callback: (channel: string, target: string, viewers?: number) => void): this;
  
  onceIf(event: string, listener: (...args: any[]) => boolean, timeout?: number): this;
  /** When an error has happened */
  onceIf(event: 'error', callback: (error: any) => boolean, timeout?: number): this;
  /** When a parse error happens */
  onceIf(event: 'parseerror', callback: (line: string, error: any) => boolean, timeout?: number): this;
  /** When successfully connected and authorized */
  onceIf(event: 'ready', callback: () => boolean, timeout?: number): this;
  /** A raw IRC event */
  onceIf(event: 'raw', callback: (raw: string, parsed: ParsedMessage) => boolean, timeout?: number): this;
  /** When a raw message is sent out */
  onceIf(event: 'rawSend', callback: (message: string) => boolean, timeout?: number): this;
  /** When you have joined a channel */
  onceIf(event: 'join', callback: (channel: string) => boolean, timeout?: number): this;
  /** When you have left a channel */
  onceIf(event: 'part', callback: (channel: string) => boolean, timeout?: number): this;
  /** When a user joined a channel */
  onceIf(event: 'otherjoin', callback: (channel: string, login: string) => boolean, timeout?: number): this;
  /** When a user left a channel */
  onceIf(event: 'otherpart', callback: (channel: string, login: string) => boolean, timeout?: number): this;
  /** When a message was submitted to a channel */
  onceIf(event: 'msg', callback: (channel: string, login: string, message: string, tags: any) => boolean, timeout?: number): this;
  /** When a channel changes its roomstate (like submode, slowmode) */
  onceIf(event: 'roomstate', callback: (channel: string, tags: any) => boolean, timeout?: number): this;
  /** When a usernotice has happened (like a sub, resub, giftsub) */
  onceIf(event: 'usernotice', callback: (channel: string, login: string, message: string, tags: any) => boolean, timeout?: number): this;
  /** When a channel notice happens (example: slow mode off) */
  onceIf(event: 'notice', callback: (channel: string, message: string, tags: any) => boolean, timeout?: number): this;
  /** Happens when a chat is cleared by a moderator */
  onceIf(event: 'clearchat', callback: (channel: string) => boolean, timeout?: number): this;
  /** User was permanently or temporarily banned (tags has ban-duration if not permanent) */
  onceIf(event: 'userban', callback: (channel: string, login: string, tags: any) => boolean, timeout?: number): this;
  /** Happens when a single message was removed */
  onceIf(event: 'clearmsg', callback: (channel: string, tags: any) => boolean, timeout?: number): this;
  /** Happens on successful login, tags contain information about user */
  onceIf(event: 'globaluserstate', callback: (tags: any) => boolean, timeout?: number): this;
  /** Happens when you join a channel, tags contain information about user */
  onceIf(event: 'userstate', callback: (channel: string, tags: any) => boolean, timeout?: number): this;
  /** Happens when a channel hosts a target channel. Viewers is a number is started hosting, undefined if already hosting. If taget is '-', it means it stopped hosting */
  onceIf(event: 'host', callback: (channel: string, target: string, viewers?: number) => boolean, timeout?: number): this;
  
  emit(event: string, ...args: any[]): boolean;
  emit(event: 'error', error: any): boolean;
  emit(event: 'parseerror', line: string, error: any): boolean;
  emit(event: 'ready'): boolean;
  emit(event: 'raw', raw: string, parsed: ParsedMessage): boolean;
  emit(event: 'rawSend', message: string): boolean;
  emit(event: 'join', channel: string): boolean;
  emit(event: 'part', channel: string): boolean;
  emit(event: 'otherjoin', channel: string, login: string): boolean;
  emit(event: 'otherpart', channel: string, login: string): boolean;
  emit(event: 'msg', channel: string, login: string, message: string, tags: any): boolean;
  emit(event: 'roomstate', channel: string, tags: any): boolean;
  emit(event: 'usernotice', channel: string, login: string, message: string, tags: any): boolean;
  emit(event: 'notice', channel: string, message: string, tags: any): boolean;
  emit(event: 'clearchat', channel: string): boolean;
  emit(event: 'userban', channel: string, login: string, tags: any): boolean;
  emit(event: 'clearmsg', channel: string, tags: any): boolean;
  emit(event: 'globaluserstate', tags: any): boolean;
  emit(event: 'userstate', channel: string, tags: any): boolean;
  emit(event: 'host', channel: string, target: string, viewers?: number): boolean;
}

interface ParsedMessage {
  tags: any,
  url: string | null,
  cmd: string | null,
  channel: string | null,
  extra: string | null,
  msg: string | null,
}

/** Constructor options */
interface ChatOptionsParam {
  /** The Twitch login. Use null for anonymous. Defaults to null */
  login?: string | null,
  /** 
   * The Twitch auth token. Required if login is not null.
   * Example: "cfabdegwdoklmawdzdo98xt2fo512y"
   * Default: null
   */
  token?: string | null,
  /** If you want to auto reconnect on conn loss. Defaults to true */
  autoReconnect?: boolean,
  /** If you want to request Twitch capabilities. Defaults to true */
  requestCAP?: boolean,
  /** If you want to connect automatically. Defaults to true */
  autoConnect?: boolean,
  /** The Twitch IRC URL. Defaults to "irc.chat.twitch.tv" */
  url?: string,
  /** The Twitch IRC Port. Defaults to 6667 */
  port?: number,
  /**
   * Some of the required messages for a successful connect.
   * See https://dev.twitch.tv/docs/irc/guide/#connecting-to-twitch-irc
   * Do not change unless this is not updated for it.
   */
  successMessages?: string[],
}

interface ChatOptions {
  login: string | null,
  token: string | null,
  autoReconnect: boolean,
  requestCAP: boolean,
  autoConnect: boolean,
  url: string,
  port: number,
  successMessages: string[]
}

class TwitchIRC extends EventEmitter {
  options: ChatOptions;
  ready: boolean;
  sendQueue: string[];
  closeCalled: boolean;
  socket: net.Socket | null;
  dataBuffer: string;
  readyList: string[];

  /**
   * @param options The constructor options
   */
  constructor(options?: ChatOptionsParam) {
    super();
    // Default options
    this.options = {
      login: null, // The login nick (leave null for anonymouse)
      token: null, // The login token. Required if login is not null
      autoReconnect: true,
      requestCAP: true,
      autoConnect: true,
      url: 'irc.chat.twitch.tv',
      port: 6667,
      successMessages: [
        'Welcome, GLHF!',
        'You are in a maze of twisty passages',
        '>'
      ]
    };
    if (options) {
      for (const key in options) {
        if (this.options.hasOwnProperty(key)) {
          this.options[key] = options[key];
        }
      }
    }
    if (this.options.login === null) {
      let anoLogin = 'justinfan';
      for (let i = 0; i < 5; i++) {
        let num = Math.floor(Math.random() * 10);
        anoLogin += num;
      }
      this.options.login = anoLogin;
    } else {
      // If token is null and login doesn't match justinfan regex
      if (this.options.token === null && !/justinfan[\d]+/.test(this.options.login)) {
        throw new Error('Missing token option');
      }
    }

    this.ready = false;
    this.sendQueue = []; // Used to store messages that needs to be sent when ready

    this.closeCalled = false;
    this.socket = null;

    this.dataBuffer = '';

    if (this.options.autoConnect) {
      this.connect();
    }
  }

  /**
   * Starts a connection to Twitch IRC servers using the options given in constructor
   * Will reconnect if already connected
   * @param callback Callback for when connection was successfully created (not ready to be used)
   */
  connect(callback?: () => void): void {
    // If already connecting/connected clear that
    if (this.socket !== null) {
      this.socket.end();
      this.socket.unref();
      this.socket = null;
    }
    this.readyList = [...this.options.successMessages]; // A list of required messages for successful login

    this.socket = net.createConnection(this.options.port, this.options.url, callback);
    // Handle errors
    this.socket.addListener('error', (err) => this.emit('error', err));
    // Handle data
    this.socket.addListener('data', (data: any) => {
      if (typeof (data) !== 'string') {
        data = data.toString();
      }
      // We split the data up into lines.
      // It's possible that the data we receive doesn't end with a new line, and we have to store that and wait for an ending
      data = this.dataBuffer + data;
      if (!data.endsWith('\n')) {
        const lastNl = data.lastIndexOf('\n');
        // console.log('Storing last part (' + lastNl + ',' + data.length + '):');
        if (lastNl === -1) {
          this.dataBuffer = data;
          return; // Don't process data
        } else {
          this.dataBuffer = data.substring(lastNl + 1);
          data = data.substring(0, lastNl);
        }
      } else {
        this.dataBuffer = '';
      }
      const lines = data.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i].trim();
        if (rawLine.length === 0) continue;
        // console.log(rawLine); // Debug printing
        if (rawLine.startsWith('PING')) {
          this.send('PONG :tmi.twitch.tv');
          continue;
        }
        try {
          const pl = parseTwitchMessage(rawLine);
          if (!this.ready) {
            if (pl.msg.includes(this.readyList[0])) {
              this.readyList.splice(0, 1);
              if (this.readyList.length === 0) {
                this.ready = true;
                while (this.sendQueue.length > 0) {
                  this.send(this.sendQueue[0]);
                  this.sendQueue.splice(0, 1);
                }
                this.emit('ready');
              }
            }
            // A notice means there was a problem with connecting or login
            if (pl.cmd === 'NOTICE') {
              this.emit('error', new Error(pl.msg));
              this.close();
            }
          } else {
            this.emit('raw', rawLine, pl);
            switch (pl.cmd) {
              case 'JOIN':
                const joinLogin = pl.url.substring(0, pl.url.indexOf('!'));
                if (joinLogin === this.options.login) {
                  this.emit('join', pl.channel);
                } else {
                  this.emit('otherjoin', pl.channel, joinLogin);
                }
                break;
              case 'PART':
                const partLogin = pl.url.substring(0, pl.url.indexOf('!'));
                if (partLogin === this.options.login) {
                  this.emit('part', pl.channel);
                } else {
                  this.emit('otherpart', pl.channel, partLogin);
                }
                break;
              case 'PRIVMSG':
                this.emit('msg', pl.channel, pl.url.substring(0, pl.url.indexOf('!')), pl.msg, pl.tags);
                break;
              case 'ROOMSTATE':
                this.emit('roomstate', pl.channel, pl.tags);
                break;
              case 'USERNOTICE':
                // console.log(rawLine);
                // console.log(pl);
                this.emit('usernotice', pl.channel, pl.tags.login, pl.msg, pl.tags)
                break;
              case 'NOTICE':
                this.emit('notice', pl.channel, pl.msg, pl.tags);
                break;
              case 'CLEARCHAT':
                if (pl.msg && pl.msg.length > 0) {
                  this.emit('clearchat', pl.channel);
                } else {
                  this.emit('userban', pl.channel, pl.msg, pl.tags);
                }
                break;
              case 'CLEARMSG':
                this.emit('clearmsg', pl.channel, pl.tags);
                break;
              case 'GLOBALUSERSTATE':
                this.emit('globaluserstate', pl.tags);
                break;
              case 'USERSTATE':
                this.emit('userstate', pl.channel, pl.tags);
                break;
              case 'HOSTTARGET':
                const msgSplit = pl.msg.split(' ');
                const target = msgSplit[0];
                let viewers = msgSplit.length > 1 ? Number(msgSplit[1]) : undefined;
                if (isNaN(viewers)) viewers = undefined;
                this.emit('host', pl.channel, target, viewers);
                break;
              default: {
                // Do nothing on default
              }
            }
          }
        } catch (err) {
          this.emit('parseerror', rawLine, err);
        }
      }
    });

    this.socket.once('ready', () => {
      // Login once the connection is ready
      if (this.options.requestCAP) {
        this.socket.write('CAP REQ twitch.tv/membership\r\n');
        this.socket.write('CAP REQ twitch.tv/tags\r\n');
        this.socket.write('CAP REQ twitch.tv/commands\r\n');
      }
      if (this.options.token) {
        if (this.options.token.startsWith('oauth:')) {
          this.socket.write('PASS ' + this.options.token + '\r\n');
        } else {
          this.socket.write('PASS oauth:' + this.options.token + '\r\n');
        }
      }
      this.socket.write('NICK ' + this.options.login + '\r\n');
    });

    this.socket.once('close', () => {
      this.ready = false;
      if (!this.closeCalled && this.options.autoReconnect) {
        // Try and reconnect after 5 seconds
        setTimeout(() => {
          this.connect();
        }, 5000);
      }
    });
  }

  /**
   * @returns If connection is ready or not
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Same as once, but will remove the listener if the callback returns true
   * @param eventName The name of the event
   * @param callback Event callback
   * @param timeout Timeout to remove listener
   */
  onceIf(eventName: string, callback: (...eventArgs: any[]) => boolean, timeout?: number): this {
    const listener = (...args: any[]) => {
      if (callback(...args)) {
        removeListener();
      }
    };
    const removeListener = () => {
      this.removeListener(eventName, listener);
    };
    this.addListener(eventName, listener);
    if (typeof (timeout) == 'number') {
      setTimeout(removeListener, timeout);
    }
    return this;
  }

  /**
   * Joins a channel, callback is optional and has no parameters
   * @param channel The channel to join (without #)
   * @param callback Channel joined callback. Times out after 5 seconds if still not joined
   */
  join(channel: string, callback?: () => void): void {
    if (!channel.startsWith('#')) channel = '#' + channel;
    this.send('JOIN ' + channel);
    if (typeof (callback) === 'function') {
      this.onceIf('join', (chn) => {
        if (chn === channel) {
          callback();
          return true;
        }
        return false;
      }, 5000);
    }
  }

  /**
   * Leaves a channel, callback is optional and has no parameters
   * @param channel The channel to join (without #)
   * @param callback Channel joined callback. Times out after 5 seconds if still not left
   */
  part(channel: string, callback?: () => void): void {
    if (!channel.startsWith('#')) channel = '#' + channel;
    this.send('PART ' + channel);
    if (typeof (callback) === 'function') {
      this.onceIf('part', (chn) => {
        if (chn === channel) {
          callback();
          return true;
        }
        return false;
      }, 5000);
    }
  }

  /**
   * Sends a chat message in a channel
   * @param channel The channel to talk in (without #)
   * @param msg The message to send
   */
  say(channel: string, msg: string): void {
    if (!channel.startsWith('#')) channel = '#' + channel;
    this.send('PRIVMSG ' + channel + ' :' + msg);
  }

  /**
   * Sends data to Twitch. Use @function Say() to send chat messages
   * @param data The data to send
   */
  send(data: string): void {
    if (data.length > 500) {
      this.emit('error', new Error('Cannot send more than 500 characters'));
      return;
    }
    if (!this.ready) {
      this.sendQueue.push(data);
    } else {
      this.socket.write(data + '\r\n', () => {
        this.emit('rawSend', data);
      });
    }
  }

  /**
   * Tries to close the connection.
   * @param callback Callback when close happened
   */
  close(callback?: (err: any) => void): void {
    this.closeCalled = true;
    if (this.socket !== null) {
      this.socket.end();
      this.socket.once('close', callback);
    }
  }
}

// This is iterated through to parse each part of a Twitch message
// Each function is called and should return the remaining of the unparsed data
const parserActions = [
  // Look for tags first
  (data: string, obj: ParsedMessage): string | null => {
    if (data.charAt(0) === ':') {
      return data.substring(1);
    }
    const endIndex = data.indexOf(' :');
    if (endIndex !== -1) {
      const tagsData = data.substring(0, endIndex);
      if (tagsData.length > 0 && tagsData.charAt(0) === '@') {
        const tagsSplit = tagsData.substring(1).split(';');
        const tags = {};
        for (let i = 0; i < tagsSplit.length; i++) {
          const tagSplit = tagsSplit[i].split('=');
          if (tagSplit.length > 1) {
            tags[tagSplit[0]] = tagSplit[1];
          } else {
            tags[tagSplit[0]] = null;
          }
        }
        obj.tags = tags;
      }
      return data.substring(endIndex + 1);
    } else {
      return data;
    }
  },
  // Look for the url kind of part
  (data: string, obj: ParsedMessage): string | null => {
    if (data.charAt(0) === ':') data = data.substring(1);
    const endIndex = data.indexOf(" ");
    if (endIndex !== -1) {
      const urlData = data.substring(0, endIndex);
      if (urlData.length > 0) {
        obj.url = urlData;
      }
      return data.substring(endIndex + 1);
    } else {
      return data;
    }
  },
  // Look for the command
  (data: string, obj: ParsedMessage): string | null => {
    const endIndex = data.indexOf(" ");
    const cmdData = endIndex === -1 ? data : data.substring(0, endIndex);
    const out = endIndex === -1 ? null : data.substring(endIndex + 1);
    if (cmdData.length > 0) {
      obj.cmd = cmdData;
    }
    return out;
  },
  // Extra and channel
  (data: string, obj: ParsedMessage): string | null => {
    const endIndex = data.indexOf(" :");
    const extraData = endIndex === -1 ? data : data.substring(0, endIndex);
    const out = endIndex === -1 ? null : data.substring(endIndex + 1);
    if (extraData.length > 0) {
      const extraSplit = extraData.split(' ');
      // Look for channel
      for (let i = 0; i < extraSplit.length; i++) {
        if (extraSplit[i].length > 0 && extraSplit[i].charAt(0) === '#') {
          obj.channel = extraSplit[i].substring(1);
        }
      }
      obj.extra = extraData.trim();
    }
    return out;
  },
  // Look for the msg
  (data: string, obj: ParsedMessage): string | null => {
    if (data.charAt(0) === ':') data = data.substring(1);
    obj.msg = data.trim();
    return null;
  }
];

function parseTwitchMessage(msg: string): any {
  const out = {
    tags: null,
    url: null,
    cmd: null,
    channel: null,
    extra: null,
    msg: null,
  };
  for (let i = 0; i < parserActions.length; i++) {
    const parser = parserActions[i];
    msg = parser(msg, out);
    if (msg === null || msg.length === 0) break;
  }
  if (msg !== null && msg.length > 0) {
    console.log('Could not parse part of message:');
    console.log(msg);
  }
  return out;
}

export default TwitchIRC;