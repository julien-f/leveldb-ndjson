#!/usr/bin/env node

const fs = require("fs");
const level = require("level-party");
const ndjson = require("ndjson");
const pump = require("pump");
const stream = require("stream");
const zlib = require("zlib");
const { fromCallback } = require("promise-toolbox");

async function main([command, dbPath, filePath]) {
  if (command === "export") {
    const db = level(dbPath);
    await fromCallback(cb =>
      pump(
        db.createReadStream(),
        ndjson.stringify(),
        zlib.createGzip(),
        fs.createWriteStream(filePath),
        cb
      )
    );
    await fromCallback(cb => db.close(cb));
  } else if (command === "import") {
    const db = level(dbPath);
    await fromCallback(cb =>
      pump(
        fs.createReadStream(filePath),
        zlib.createGunzip(),
        ndjson.parse(),
        new stream.Writable({
          objectMode: true,
          write({ key, value }, _, cb) {
            db.put(key, value, cb);
          }
        }),
        cb
      )
    );
    await fromCallback(cb => db.close(cb));
  } else {
    console.warn('invalid command:', command)
    console.log('%s', `Usage:

  ./cli.js export <db path> <JSON file>

  ./cli.js import <db path> <JSON file>
`)
  }
}
main(process.argv.slice(2)).catch(console.error.bind(console, "FATAL:"));
