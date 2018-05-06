const { promisify } = require("util");
const { join: joinPath } = require("path");
const readlineSpecific = promisify(require("readline-specific").oneline);

const { resolve: resolvePromise } = require("bluebird");

const Error = require("./error");

function formatError(error, { srcDir }) {
  if (!(error instanceof Error)) {
    return resolvePromise(error.toString());
  }
  const { message, location: { file, start: { line, column } } } = error;
  const description = [file, line, column, message]
    .filter(x => x !== "")
    .join(":");
  if (file && line && column) {
    return readlineSpecific(joinPath(srcDir, file), line).then(line => [
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
