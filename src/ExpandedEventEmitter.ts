import EventEmitter from 'events';

// This is an expanded event emitter that allows registering of events with an id.
// Example:
// emitter.on('event#my-id', ...)
// Now you can remove all events with that id:
// emitter.getIDListeners('my-id', [eventName]) => returns listeners array
// emitter.removeIDListeners('my-id') => removes all listeners with that id, no matter the event


interface ListenerData {
  event: string | symbol,
  id: string | null,
  listener: (...args: any[]) => void
}

class ExpandedEventEmitter extends EventEmitter {
  private idListeners: ListenerData[];

  constructor() {
    super();
    this.idListeners = [];
    super.on('removeListener', (event, listener) => {
      for (let i = 0; i < this.idListeners.length; i++) {
        const data = this.idListeners[i];
        if (data.event !== event) continue;
        if (data.listener !== listener) continue;
        this.idListeners.splice(i, 1);
        i--;
      }
    });
  }

  on(event: string | symbol, listener: (...args: any[]) => void): this {
    const data = this._splitID(event, listener);
    super.on(data.event, listener);
    if (data.id !== null) this.idListeners.push(data);
    return this;
  }

  addListener(event: string | symbol, listener: (...args: any[]) => void): this {
    return this.on(event, listener);
  }

  once(event: string | symbol, listener: (...args: any[]) => void): this {
    const data = this._splitID(event, listener);
    super.once(data.event, listener);
    if (data.id !== null) this.idListeners.push(data);
    return this;
  }

  prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
    const data = this._splitID(event, listener);
    super.prependListener(data.event, listener);
    if (data.id !== null) this.idListeners.push(data);
    return this;
  }

  prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
    const data = this._splitID(event, listener);
    super.prependOnceListener(data.event, listener);
    this.idListeners.push(data);
    this.listeners
    return this;
  }

  getIDListenersData(id: string, event?: string): ListenerData[] {
    let out = [];
    for (let i = 0; i < this.idListeners.length; i++) {
      const data = this.idListeners[i];
      if (data.id !== id) continue;
      if (event !== undefined && event !== data.event) continue;
      out.push(data);
    }
    return out;
  }

  getIDListeners(id: string, event?: string): ((...args: any[]) => void)[] {
    return this.getIDListenersData(id, event).map(e => e.listener);
  }

  removeIDListeners(id: string): this {
    this.getIDListenersData(id).forEach(data => {
      this.removeListener(data.event, data.listener);
    });
    return this;
  }

  private _splitID(event: string | symbol, listener: (...args: any[]) => void): ListenerData {
    let id = null;
    if (typeof event === 'string') {
      const index = event.indexOf('#');
      if (index !== -1) {
        id = event.substring(index + 1);
        event = event.substring(0, index);
      }
    }
    return {
      event: event,
      id: id,
      listener: listener
    }
  }
}

export = ExpandedEventEmitter;