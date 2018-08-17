module.exports = class extends Error {
  constructor(message, location) {
    super(message);
    location = location || {};
    this.location = {
      file: location.file,
      start: location.start || {},
      end: location.end || {}
    };
  }
};
