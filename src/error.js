class Error {
  constructor(message, location) {
    this.message = message;
    location = location || {};
    this.location = {
      file: location.file || "<unknown>",
      start: location.start || {
        line: "<unknown>",
        column: "<unknown>"
      },
      end: location.end || {
        line: "<unknown>",
        column: "<unknown>"
      }
    };
  }
}

module.exports = Error;
