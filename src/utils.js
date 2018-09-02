const { promisify } = require("util");
const { resolve: resolvePath } = require("path");
const readlineSpecific = promisify(require("readline-specific").oneline);

const { resolve: resolvePromise } = require("bluebird");

function formatError(error) {
  if (!(error.location)) {
    return resolvePromise(error.stack);
  }
  const { message, location: { file, start: { line, column } } } = error;
  const description = [file, line, column, message]
    .filter(x => x !== "")
    .join(":");
  if (file && line && column) {
    return readlineSpecific(resolvePath(file), line).then(line => [
      description,
      line,
      "^".padStart(column)
    ].join("\n"));
  }
  else {
    return resolvePromise(description);
  }
}

module.exports = {
  formatError
};
