class Error {
  constructor(message, location) {
    this.message = message;
    location = location || {};
    this.location = {
      file: location.file,
      start: location.start || {},
      end: location.end || {}
    };
  }
}

module.exports = Error;
