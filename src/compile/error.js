module.exports = class extends Error {
  constructor(message, location) {
    super(message);
    this.location = location;
  }
};
