export default class FunctionRepeater {

  static repeat(interval, fn, ...params) {
    setTimeout(() => {
      fn(...params);
      FunctionRepeater.repeat(fn, ...params);
    }, interval);
  }

  static async repeatAwaiting(interval, fn, ...params) {
    console.log('repeatAwaiting:', interval);
    setTimeout(async () => {
      await fn(...params);
      FunctionRepeater.repeatAwaiting(interval, fn, ...params);
    }, interval);
  }
}
