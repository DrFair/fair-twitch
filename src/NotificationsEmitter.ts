import EventEmitter from 'events';
import uuidv4 from 'uuid/v4';
import TwitchIRC from './chat';

interface Recepient {
  /** The login of the recepient */
  login: string,
  /** The display name of the recepient */
  displayName: string,
}

interface NoticeInterface {
  /** The login of the user */
  login: string,
  /** The display name of the user */
  displayName: string,
  /** The unique ID of the message from Twitch */
  id: string,
  /** The timestamp of when the message was sent from Twitch */
  timestamp: number,
}

interface SubNotice extends NoticeInterface {
  /** The system message from Twitch */
  systemMsg: string,
  /** The sub tier. */
  tier: 'Prime' | '1000' | '2000' | '3000',
}

interface ResubNotice extends NoticeInterface {
  /** The system message from Twitch */
  systemMsg: string,
  /** The sub tier. */
  tier: 'Prime' | '1000' | '2000' | '3000',
  /** The message attached to the resub */
  msg: string | null,
  /** The total number of months */
  months: number
}

interface GiftSubNotice extends NoticeInterface {
  /** The system message from Twitch */
  systemMsg: string,
  /** The sub tier. */
  tier: 'Prime' | '1000' | '2000' | '3000',
  /** The number of subs user has given to channel */
  senderCount: number,
  /** The recepient of the giftsub */
  recepient: Recepient,
}

interface MassGiftSubNotice extends NoticeInterface {
  /** The system message from Twitch */
  systemMsg: string,
  /** The sub tier. */
  tier: 'Prime' | '1000' | '2000' | '3000',
  /** The number of subs user has given to channel */
  senderCount: number,
  /** The number of the subs that's being gifted */
  massCount: number,
  /** The recepients of the mass giftsub */
  recepients: Recepient[],
}

interface BitsNotice extends NoticeInterface {
  /** The number of bits in the message */
  bits: number,
  /** The chat message */
  msg: string
}

interface NotificationsEmitter {
  addListener(event: string, listener: (...args: any[]) => void): this;
  /** When a sub happens */
  addListener(event: 'sub', listener: (channel: string, data: SubNotice, tags: any) => void): this;
  /** When someone announces a resub */
  addListener(event: 'resub', listener: (channel: string, data: ResubNotice, tags: any) => void): this;
  /** When someone gifts another person a sub */
  addListener(event: 'giftsub', listener: (channel: string, data: GiftSubNotice, tags: any) => void): this;
  /** When someone mass gift subs to a channel */
  addListener(event: 'massgiftsub', listener: (channel: string, data: MassGiftSubNotice, tags: any) => void): this;
  /** When someone sends bit message to a channel */
  addListener(event: 'bits', listener: (channel: string, data: BitsNotice, tags: any) => void): this;
  /** When a any notice happens */
  addListener(event: 'any', listener: (event: 'sub' | 'resub' | 'giftsub' | 'massgiftsub' | 'bits', channel: string, data: SubNotice | ResubNotice | GiftSubNotice | MassGiftSubNotice | BitsNotice, tags: any) => void): this;

  on(event: string, listener: (...args: any[]) => void): this;
  /** When a sub happens */
  on(event: 'sub', listener: (channel: string, data: SubNotice, tags: any) => void): this;
  /** When someone announces a resub */
  on(event: 'resub', listener: (channel: string, data: ResubNotice, tags: any) => void): this;
  /** When someone gifts another person a sub */
  on(event: 'giftsub', listener: (channel: string, data: GiftSubNotice, tags: any) => void): this;
  /** When someone mass gift subs to a channel */
  on(event: 'massgiftsub', listener: (channel: string, data: MassGiftSubNotice, tags: any) => void): this;
  /** When someone sends bit message to a channel */
  on(event: 'bits', listener: (channel: string, data: BitsNotice, tags: any) => void): this;
  /** When a any notice happens */
  on(event: 'any', listener: (event: 'sub' | 'resub' | 'giftsub' | 'massgiftsub' | 'bits', channel: string, data: SubNotice | ResubNotice | GiftSubNotice | MassGiftSubNotice | BitsNotice, tags: any) => void): this;
  
  once(event: string, listener: (...args: any[]) => void): this;
  /** When a sub happens */
  once(event: 'sub', listener: (channel: string, data: SubNotice, tags: any) => void): this;
  /** When someone announces a resub */
  once(event: 'resub', listener: (channel: string, data: ResubNotice, tags: any) => void): this;
  /** When someone gifts another person a sub */
  once(event: 'giftsub', listener: (channel: string, data: GiftSubNotice, tags: any) => void): this;
  /** When someone mass gift subs to a channel */
  once(event: 'massgiftsub', listener: (channel: string, data: MassGiftSubNotice, tags: any) => void): this;
  /** When someone sends bit message to a channel */
  once(event: 'bits', listener: (channel: string, data: BitsNotice, tags: any) => void): this;
  /** When a any notice happens */
  once(event: 'any', listener: (event: 'sub' | 'resub' | 'giftsub' | 'massgiftsub' | 'bits', channel: string, data: SubNotice | ResubNotice | GiftSubNotice | MassGiftSubNotice | BitsNotice, tags: any) => void): this;

  emit(event: string, ...args: any[]): boolean;
  emit(event: 'sub', channel: string, data: SubNotice, tags: any): boolean;
  emit(event: 'resub', channel: string, data: ResubNotice, tags: any): boolean;
  emit(event: 'giftsub', channel: string, data: GiftSubNotice, tags: any): boolean;
  emit(event: 'massgiftsub', channel: string, data: ResubNotice, tags: any): boolean;
  emit(event: 'bits', channel: string, data: MassGiftSubNotice, tags: any): boolean;
  emit(event: 'any', eventName: 'sub' | 'resub' | 'giftsub' | 'massgiftsub' | 'bits', channel: string, data: SubNotice | ResubNotice | GiftSubNotice | MassGiftSubNotice | BitsNotice, tags: any): boolean;
}
// Wait to notify gift subs in case they are a part of mass gift subs
const mysteryGiftTimeout = 5000; // If count is reached, it will call it
const giftTimeout = 1000;

class SmartTimeout {
  time: number;
  callback: () => void;
  timeout: NodeJS.Timeout;

  constructor(callback: () => void, time: number) {
    this.time = time;
    this.callback = callback;
    this.timeout = null;

    this.start = this.start.bind(this);
    this.refresh = this.refresh.bind(this);
    this.clear = this.clear.bind(this);
  }

  start() {
    this.timeout = setTimeout(this.callback, this.time);
  }

  clear() {
    if (this.timeout !== null) {
      clearTimeout(this.timeout);
    }
  }

  refresh(newTime?: number) {
    if (newTime !== undefined) this.time = newTime;
    this.clear();
    this.start();
  }

  call() {
    this.clear();
    this.callback();
  }
}

class NotificationsEmitter extends EventEmitter {
  giftSubs: any[];
  massGifters: any[];

  /**
   * @param twitchIRC The Twitch IRC client
   */
  constructor(twitchIRC: TwitchIRC) {
    super();
    // We want to collect all the recepients of a mass gift sub under 1 notice
    // Since all mass gift subs are also displayed as a gift sub and there's no way
    // to guarantee that 'submysterygift' event triggers before the giftsub events,
    // we have to wait a short while before displaying the notice, in case a
    // 'submysterygift' event happens

    this.giftSubs = [];
    this.massGifters = [];

    twitchIRC.addListener('usernotice', (channel, login, message, tags) => {
      const data: any = {
        login: login,
        displayName: tags['display-name'],
        id: tags.id,
        timestamp: Number(tags['tmi-sent-ts']),
        systemMsg: tags['system-msg'].replace(/\\s/g, ' ')
      };
      switch (tags['msg-id']) {
        case 'sub': {
          data.tier = tags['msg-param-sub-plan'];
          this._emitNotification('sub', channel, data, tags);
          break;
        }
        case 'resub': {
          data.msg = message;
          data.months = Number(tags['msg-param-cumulative-months']);
          data.tier = tags['msg-param-sub-plan'];
          this._emitNotification('resub', channel, data, tags);
          break;
        }
        case 'subgift': {
          data.recepient = {
            login: tags['msg-param-recipient-user-name'],
            displayName: tags['msg-param-recipient-display-name']
          };
          data.msg = message;
          data.months = Number(tags['msg-param-months']);
          data.senderCount = Number(tags['msg-param-sender-count']);
          data.tier = tags['msg-param-sub-plan'];
          const key = data.login + '#' + channel + '!' + data.tier;
          let absorbed = false;
          // First check if there's any mass gifts going on
          for (let i = 0; i < this.massGifters.length; i++) {
            const massGift = this.massGifters[i];
            if (massGift.key === key) {
              if (massGift.data.recepients.length < massGift.data.massCount) {
                massGift.data.recepients.push(data.recepient);
                if (massGift.data.recepients.length >= massGift.data.massCount) {
                  massGift.timeout.call();
                } else {
                  // Refresh timeout
                  massGift.timeout.refresh(giftTimeout);
                }
                absorbed = true;
                break;
              }
            }
          }
          if (!absorbed) {
            const obj = {
              key: key,
              channel: channel,
              data: data,
              timeout: new SmartTimeout(() => {
                this._emitNotification('giftsub', channel, data, tags);
                // Remove from list
                for (let i = 0; i < this.giftSubs.length; i++) {
                  if (this.giftSubs[i] === obj) {
                    this.giftSubs.splice(i, 1);
                    break;
                  }
                }
              }, giftTimeout)
            };
            obj.timeout.start();
            this.giftSubs.push(obj);
          }
          break;
        }
        case 'submysterygift': {
          data.massCount = Number(tags['msg-param-mass-gift-count']);
          data.senderCount = Number(tags['msg-param-sender-count']);
          data.tier = tags['msg-param-sub-plan'];
          data.recepients = [];
          const key = data.login + '#' + channel + '!' + data.tier;
          // Check all sub gifts going on, and add them to this part
          for (let i = 0; i < this.giftSubs.length; i++) {
            const giftSub = this.giftSubs[i];
            if (giftSub.key === key && data.recepient.length < data.massCount) {
              data.recepients.push(giftSub.data.recepient);
              giftSub.timeout.clear();
              this.giftSubs.splice(i, 1);
              i--;
            }
          }
          const obj = {
            key: key,
            channel: channel,
            data: data,
            timeout: new SmartTimeout(() => {
              this._emitNotification('massgiftsub', channel, data, tags);
              for (let i = 0; i < this.massGifters.length; i++) {
                if (this.massGifters[i] === obj) {
                  this.massGifters.splice(i, 1);
                  break;
                }
              }
            }, mysteryGiftTimeout)
          };
          if (data.recepients.length >= data.massCount) {
            obj.timeout.call();
          } else {
            obj.timeout.start();
            this.massGifters.push(obj);
          }
          break;
        }
      }
    });

    twitchIRC.addListener('msg', (channel, login, message, tags) => {
      if (tags.bits) {
        const data = {
          login: login,
          displayName: tags['display-name'],
          id: tags.id,
          timestamp: Number(tags['tmi-sent-ts']),
          msg: message,
          bits: Number(tags.bits)
        };
        this._emitNotification('bits', channel, data, tags);
      }
    });
  }

  /**
   * Emit an 'any' event but also a normal event
   * @param eventName The name of the event
   * @param args The args/parameters of the event
   */
  _emitNotification(eventName: string, ...args: any[]) {
    this.emit('any', eventName, ...args);
    this.emit(eventName, ...args);
  }

  /**
   * Get a dummy notification object
   * @param eventName The event name (sub, resub, giftsub, massgiftsub, bits, any)
   * @param channel The optional target channel (default DummyChannel)
   * @param overwriteData Will overwrite the final object these keys and values
   */
  getDummyNotification(eventName: string, channel: string = 'DummyChannel', overwriteData: object = {}): SubNotice | ResubNotice | GiftSubNotice | MassGiftSubNotice | BitsNotice {
    // First generate basic object
    const nameAffix = getRandomAffix();
    let login = 'dummyfan' + nameAffix;
    let displayName = 'DummyFan' + nameAffix;
    const obj: any = {
      login: login,
      displayName: displayName,
      id: uuidv4(),
      timestamp: Date.now()
    };
    switch (eventName) {
      case 'sub': {
        obj.tier = randomOneOf('Prime', '1000', '2000', '3000');
        const tierMsg = obj.tier === 'Prime' ? 'Twitch Prime' : 'Tier ' + obj.tier.charAt(0);
        obj.systemMsg = `${obj.displayName} subscribed with ${tierMsg}.`;
        break;
      }
      case 'resub': {
        obj.tier = randomOneOf('Prime', '1000', '2000', '3000');
        obj.months = 1 + Math.floor(Math.random() * 23);
        const tierMsg = obj.tier === 'Prime' ? 'Twitch Prime' : 'Tier ' + obj.tier.charAt(0);
        obj.systemMsg = `${obj.displayName} subscribed with ${tierMsg}. They've subscribed for ${obj.months} months!`;
        if (Math.floor(Math.random() * 3) !== 1) {
          obj.msg = `Dummy message ${getRandomAffix()}`;
        }
        break;
      }
      case 'giftsub': {
        obj.tier = randomOneOf('1000', '2000', '3000');
        obj.recepient = getDummyRecepient();
        obj.senderCount = Math.max(0, Math.floor(Math.random() * 500) - 200);
        const systemMsgAffix = obj.senderCount > 1 ? ` They have given ${obj.senderCount} Gift Subs in the channel!` : '';
        obj.systemMsg = `${obj.displayName} gifted a Tier ${obj.tier.charAt(0)} sub to ${obj.recepient.displayName}!` + systemMsgAffix;
        obj.months = Math.floor(Math.random() * 12);
        break;
      }
      case 'massgiftsub': {
        obj.tier = randomOneOf('1000', '2000', '3000');
        obj.massCount = randomOneOf(5, 5, 5, 10, 10, 100);
        obj.senderCount = Math.max(0, Math.floor(Math.random() * 500) - 200) + obj.massCount;
        const community = channel ? channel : 'Unknown'
        obj.systemMsg = `${obj.displayName} is gifting ${obj.massCount} Tier ${obj.tier.charAt(0)} to ${community}'s community! They've gifted a total of ${obj.senderCount} in the channel!`;
        obj.recepients = [];
        for (let i = 0; i < obj.massCount; i++) {
          obj.recepients.push(getDummyRecepient());
        }
        break;
      }
      case 'bits': {
        obj.bits = randomOneOf(1, 100, 1000, 10000);
        obj.msg = `Dummy message ${getRandomAffix()} cheer${obj.bits}`;
        break;
      }
      default: {
        return this.getDummyNotification(randomOneOf('sub', 'resub', 'giftsub', 'massgiftsub', 'bits'));
      }
    }
    for (const key in overwriteData) {
      obj[key] = overwriteData[key];
    }
    return obj;
  }

  /**
   * Emit a dummy notification event (tags will not be included)
   * @param eventName The event name (sub, resub, giftsub, massgiftsub, bits, any)
   * @param channel The channel name (optional)
   * @param overwriteData Will overwrite the final object these keys and values (optional)
   */
  sendDummyNotification(eventName: string, channel: string, overwriteData: object) {
    if (eventName === 'any') eventName = randomOneOf('sub', 'resub', 'giftsub', 'massgiftsub', 'bits');
    const obj = this.getDummyNotification(eventName, channel, overwriteData);
    this._emitNotification(eventName, channel, obj);
  }

}

function randomOneOf(...items: any[]): any {
  return items[Math.floor(Math.random() * items.length)];
}

function getDummyRecepient(): Recepient {
  const recipientAffix = getRandomAffix();
  return {
    login: 'dummytarget' + recipientAffix,
    displayName: 'DummyTarget' + recipientAffix
  };
}

function getRandomAffix(): string {
  let affix = '';
  for (let i = 0; i < 5; i++) {
    let num = Math.floor(Math.random() * 10);
    affix += num;
  }
  return affix;
}

export = NotificationsEmitter;