/**
 * StoryScript
 * Copyright (c) 2021, GoldFire Studios, Inc.
 * https://goldfirestudios.com
 */

const types = require('./types');

/**
 * Generate an array of tokens/lexemes to be handled by the parser.
 */
class Lexer {
  /**
   * Import the script and prepare the lexer.
   * @param  {String} script Script in TXT format.
   */
  constructor(script) {
    // Store and split up the script into an array of characters.
    this.script = script;
    this.chars = script.split('');

    // Keep track of current state.
    this.tokens = [];
    this.i = 0;
    this.line = 1;
    this.value = '';

    // Filter out anything that comes before the first scene header (title page, etc).
    this.hasScene = false;
  }

  /**
   * Run the lexer and output the array of tokens.
   * @return {Array} Tokens.
   */
  run() {
    // Loop through the script and reach each character one at a time.
    for (this.i = 0; this.i < this.chars.length; this.i += 1) {
      // Compose the new value.
      this.value += this.chars[this.i].replace(/(’|‘)/, '\'').replace(/(“|”)/, '\"');

      // Filter out anything between comment blocks.
      if (this.isComment()) continue;

      // Run through the checks in order and insert tokens when found.
      if (this.getScene()) continue;
      if (this.getEmptyLine()) continue;
      if (this.getParenthetical()) continue;
      if (this.getConditionalEnd()) continue;
      if (this.getConditional()) continue;
      if (this.getChoice()) continue;
      if (this.getChoiceFact()) continue;

      // Default to a string if nothing else matches.
      this.getString();
    }

    return this.tokens;
  }

  /**
   * Create a new token on the array of tokens.
   * @param  {String} type  Token type.
   * @param  {Number} line  Line in the script file.
   * @param  {String} value Token value.
   */
  createToken(type, line, value) {
    const token = {type, line};

    if (typeof value !== 'undefined') {
      token.value = value.replace('\n', '');
    }

    if (this.hasScene) {
      this.tokens.push(token);
    }
  }

  /**
   * Step to the next line.
   */
  nextLine() {
    if (this.hasScene) {
      this.line += 1;
    }
    this.value = '';
  }

  /**
   * Check if we are in a comment block and ignore everything inside of it.
   * @return {Boolean}
   */
  isComment() {
    if (this.value.startsWith('/*')) {
      // If this is the full comment, reset and move to the next line.
      if (this.value.match(/\/\*(\*(?!\/)|[^*])*\*\/\n/)) {
        this.value = '';
      }

      return true;
    }

    return false;
  }

  /**
   * Check if this is a scene heading and insert the token.
   *
   * A scene header is defined by:
   *   * All caps.
   *   * Begins with either EXT. or INT.
   * 
   * @return {Boolean}
   */
  getScene() {
    if (this.value.match(/(EXT|INT)\.(.*)\n/) && this.value.toUpperCase() === this.value) {
      this.hasScene = true;
      this.createToken(types.SCENE, this.line, this.value);
      this.nextLine();

      return true;
    }

    return false;
  }

  /**
   * Check if this is an empty line and insert the token.
   *
   * An empty line is defined by:
   *   * A full line that is nothing but a new line character: \n.
   * 
   * @return {Boolean}
   */
  getEmptyLine() {
    if (this.value === '\n') {
      // Only insert a new line if the previous wasn't also a new line.
      const lastToken = this.tokens[this.tokens.length - 1];
      if (!lastToken || (lastToken && lastToken.type !== types.EMPTYLINE)) {
        this.createToken(types.EMPTYLINE, this.line);
        this.nextLine();
      } else {
        this.value = '';
      }

      return true;
    }

    return false;
  }

  /**
   * Check if this is a parenthetical and insert the token.
   *
   * A parenthetical is defined by:
   *   * Opens line with : (.
   *   * Closes line with ) and a newline (\n).
   * 
   * @return {Boolean}
   */
  getParenthetical() {
    const value = this.value.match(/^\((.*?)\)\n/);
    if (value) {
      this.createToken(types.PARENTHETICAL, this.line, value[1]);
      this.nextLine();

      return true;
    }

    return false;
  }

  /**
   * Check if this is the end of a conditional statement and insert the token.
   *
   * A conditional end is defined by:
   *   * Starts line with **{.
   *   * Ends line with **}.
   * 
   * @return {Boolean}
   */
  getConditional() {
    const value = this.value.trimStart().match(/^\*\*{(.*?)}\*\*\n/);
    if (value) {
      // Don't allow "OR NOT" since our rules system can't handle that.
      // TODO: Come up with better error handling.
      if (value.includes('OR NOT')) {
        console.log('ERROR: "OR NOT" conditionals are not supported.');
        process.exit();
      }

      // Determine if this is an open or bark conditional.
      let type = types.CONDITIONAL;
      if (value[1].startsWith('BARK')) {
        type = types.CONDITIONAL_BARK;
      } else if (value[1].startsWith('OPEN')) {
        type = types.CONDITIONAL_OPEN;
      }

      // Parse the conditions (split on "AND").
      const conditions = value[1]
        .replace('BARK ', '')
        .replace('OPEN ', '')
        .split(' AND ');
      for (let i = 0; i < conditions.length; i += 1) {
        // Handle OR and NOT statements in the formatting.
        const cond = conditions[i]
          .replace(/ OR /g, '|')
          .replace(/NOT /g, '!');

        // Insert the correct token type.
        this.createToken(type, this.line, cond);
      }
      this.nextLine();

      return true;
    }

    return false;
  }

  /**
   * Check if this is the end of a conditional statement and insert the token.
   *
   * A conditional end is defined by:
   *   * Marked with **{}**.
   * 
   * @return {Boolean}
   */
  getConditionalEnd() {
    const value = this.value.trimStart();
    const isEOF = this.i === this.chars.length - 1;
    if (value === '**{}**\n' || (value === '**{}**' && isEOF)) {
      this.createToken(types.CONDITIONAL_END, this.line);
      this.nextLine();

      return true;
    }

    return false;
  }

  /**
   * Check if this is a choice option and insert the token.
   *
   * A choice option is defined by:
   *   * Opens with **= [1-9].
   *   * Closes with **.
   * 
   * @return {Boolean}
   */
  getChoice() {
    const value = this.value.trimStart().match(/^\*\*= [1-9]. (.*?)\*\*\n/);
    if (value) {
      this.createToken(types.CHOICE, this.line, value[1]);
      this.nextLine();

      return true;
    }

    return false;
  }

  /**
   * Check if this a choice option fact and insert the token.
   *
   * A choice option fact is defined by:
   *   * Opens with *{.
   *   * Closes with }*.
   * 
   * @return {Boolean}
   */
  getChoiceFact() {
    const value = this.value.trimStart().match(/^\*{(.*?)}\*\n/);
    if (value) {
      this.createToken(types.CHOICE_FACT, this.line, value[1]);
      this.nextLine();

      return true;
    }

    return false;
  }

  /**
   * Check if this is a string (default result) and insert token.
   * @return {Boolean}
   */
  getString() {
    const isEOF = this.i === this.chars.length - 1;
    if (this.value.endsWith('\n') || isEOF) {
      this.createToken(types.STRING, this.line, this.value);
      this.nextLine();

      return true;
    }

    return false;
  }
}

module.exports = Lexer;
