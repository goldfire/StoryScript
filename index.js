/**
 * StoryScript
 * Copyright (c) 2021, GoldFire Studios, Inc.
 * https://goldfirestudios.com
 */

const fs = require('fs');
const path = require('path');
const Lexer = require('./src/lexer');
const Parser = require('./src/parser');

/**
 * Run the lexer and parser on the script file and return the AST.
 * @param  {String} script Script file in TXT format.
 * @return {Object}        AST in JSON format.
 */
const parseScript = (script) => {
  // Create a lexer and parser to generate the AST.
  const lexer = new Lexer(script);
  const parser = new Parser(lexer.run());

  // Run the parser and return the AST in JSON format.
  return parser.run();
};

// If a filename is passed in the arguments, run the script.
if (process.argv[2]) {
  const ast = parseScript(fs.readFileSync(process.argv[2], 'utf8'));
  console.log(JSON.stringify(ast, null, 2));
}

module.exports = {parseScript};
