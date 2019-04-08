import * as request from 'request';

class TwitchAPI {
  options: any;

  constructor(options: any) {
    this.options = options;
  }

  test(callback?: (err: any, res: request.Response, body: any) => void): void {
    request('http://www.google.com', (err, res, body) => {
      if (callback) callback(err, res, body);
    });
  }
}

export default TwitchAPI;