/**
 * StoryScript
 * Copyright (c) 2021, GoldFire Studios, Inc.
 * https://goldfirestudios.com
 */

const types = require('./types');

/**
 * Parse the tokens into an abstract syntax tree (AST)
 * to represent the script in a structured format..
 */
class Parser {
  /**
   * Construct the parser with the tokens.
   * @param  {Array} tokens Tokens from lexer.
   */
  constructor(tokens) {
    // Define the base AST.
    this.ast = {
      type: 'root',
      characters: [],
      stats: {
        lines: 0,
        words: 0,
        characters: {},
      },
      scenes: [],
      children: [],
    };

    // Keep track of the current state.
    this.tokens = tokens;
    this.character = '';
    this.idle = false;
    this.vo = false;
    this.os = false;
    this.choiceLine = 0;
    this.parentNode = this.ast;
    this.curNode = null;
    this.i = 0;
  }

  /**
   * Run the parser to generate the AST.
   * @return {Object} AST.
   */
  run() {
    // TODO: Possible errors we could automatically check for:
    // * A conditional that starts and never closes.
    // * Two strings that are side by side without having a character, parenthetical, etc.

    // Loop through the tokens and build the abstract syntax tree.
    for (this.i = 0; this.i < this.tokens.length; this.i += 1) {
      const token = this.tokens[this.i];

      // Check each type of node and insert when matched.
      if (this.getCharacter(token)) continue;
      if (this.getDialogue(token)) continue;
      if (this.getAction(token)) continue;
      if (this.getScene(token)) continue;
      if (this.getChoice(token)) continue;
      if (this.getConditional(token)) continue;
      if (this.getConditionalEnd(token)) continue;
    }

    return this.ast;
  }

  /**
   * Create a new node in the AST.
   * @param  {String} type  Type of node.
   * @param  {String} value Node value.
   * @param  {Object} meta  Any extra meta data.
   */
  createNode(type, value, meta) {
    // If this node doesn't have a children array, add it.
    if (!this.parentNode.children) {
      this.parentNode.children = [];
    }

    // Insert the new node.
    const data = {type};
    if (value) {
      if (typeof value === 'object') {
        data.conditions = value;
      } else {
        data.value = value;
      }
    }
    if (meta) {
      data.meta = meta;
    }
    if (type === 'choice') {
      data.children = [];
    }
    this.parentNode.children.push(data);
    this.curNode = this.parentNode.children[this.parentNode.children.length - 1];

    // Track counts of dialogue lines.
    if (type === 'dialogue') {
      // Overall stats.
      const words = value.split(' ').length;
      this.ast.stats.lines += 1;
      this.ast.stats.words += words;

      // Character stats.
      if (!this.ast.stats.characters[this.character]) {
        this.ast.stats.characters[this.character] = {lines: 0, words: 0};
      }
      this.ast.stats.characters[this.character].lines += 1;
      this.ast.stats.characters[this.character].words += words;
    }
  }

  /**
   * Recursively search through the object to find the parent of the passed child object.
   * @param  {Object} obj   Object to search.
   * @param  {Object} child Child to match by reference.
   * @return {Object}       Parent of the child.
   */
  findParent(obj, child) {
    let parentObj;

    // Recursively traverse the data object.
    const traverse = (parent, value) => {
      // If we've found our node, then stop searching.
      if (value === parent) {
        return true;
      }

      // Recursively loop through all children arrays to find the parent.
      if (parent.children) {
        for (let i = 0; i < parent.children.length; i += 1) {
          if (traverse(parent.children[i], value)) {
            parentObj = parent;
            break;
          }
        }
      }
    };

    // Kick off the rrecursive operation.
    traverse(obj, child);

    return parentObj;
  }

  /**
   * Recursively find the next parent of a node that matches the specified type.
   * @param  {Object} obj   Object to search.
   * @param  {Object} child Child to match by reference.
   * @param  {String} type  Type of node to find.
   * @return {Object}       Parent of the child by type.
   */
  findParentOfType(obj, child, type) {
    const parent = this.findParent(obj, child);
    if (parent && parent.type === type) {
      return parent;
    } else if (parent) {
      return this.findParentOfType(obj, parent, type);
    }

    return null;
  }

  /**
   * Track the current character and the global characters.
   * @param  {String} name Character name
   */
  trackCharacter(name, idle, vo, os) {
    this.character = name;
    this.idle = idle;
    this.vo = vo;
    this.os = os;

    // Add the character to the primary list if not already included.
    if (!this.ast.characters.includes(name)) {
      this.ast.characters.push(name);
    }
  }

  /**
   * Determine if the current token is a character name.
   *
   * A character is defined by:
   *   * Text in all caps.
   *   * Preceded by an empty line.
   *   * Followed by a line or parenthetical.
   * 
   * @return {Boolean}
   */
  isCharacter() {
    const token = this.tokens[this.i];
    const prevToken = this.tokens[this.i - 1];
    const postToken = this.tokens[this.i + 1];
    const isCaps = token.value === (token.value || '').toUpperCase();
    const isPrecededEmptyLine = prevToken ? prevToken.type === types.EMPTYLINE : true;
    const isFollwedByStringOrParen = postToken
      ? postToken.type === types.STRING || postToken.type === types.PARENTHETICAL
      : false;

    return isCaps && isPrecededEmptyLine && isFollwedByStringOrParen;
  }

  /**
   * Check if this is a character name and insert the node.
   * @param  {Object} token Token to check.
   * @return {Boolean}
   */
  getCharacter(token) {
    if (token.type === types.STRING && this.isCharacter()) {
      const name = token.value
        .replace(' (V.O.)', '')
        .replace(' (O.S.)', '')
        .replace(' (IDLE)', '');
      const idle = token.value.includes(' (IDLE)');
      const vo = token.value.includes(' (V.O.)');
      const os = token.value.includes(' (O.S.)');

      this.trackCharacter(name, idle, vo, os);

      return true;
    }

    return false;
  }

  /**
   * Determine if the current token is a dialogue line.
   *
   * A dialogue line is defined by:
   *   * Has a character or parenthetical before it.
   *   * Has a parenthetical or empty line after it.
   * 
   * @return {Boolean}
   */
  isDialogue() {
    const token = this.tokens[this.i];
    const prevToken = this.tokens[this.i - 1];
    const postToken = this.tokens[this.i + 1];
    const hasCharacterOrParenPrev = prevToken
      ? prevToken.type === types.STRING || prevToken.type === types.PARENTHETICAL
      : false;
    const hasEmptyOrParenAfter = postToken
      ? postToken.type === types.EMPTYLINE || postToken.type === types.PARENTHETICAL
      : true;

    return hasCharacterOrParenPrev && hasEmptyOrParenAfter;
  }

  /**
   * Check if this is a dialogue line and insert the node.
   * @param  {Object} token Token to check.
   * @return {Boolean}
   */
  getDialogue(token) {
    if (token.type === types.STRING && this.isDialogue()) {
      const prevToken = this.tokens[this.i - 1];
      const meta = {character: this.character};
      if (this.idle) {
        meta.idle = true;
      }
      if (this.vo) {
        meta.voiceover = true;
      }
      if (this.os) {
        meta.offscreen = true;
      }
      if (prevToken && prevToken.type === types.PARENTHETICAL) {
        meta.parenthetical = prevToken.value;
      }

      this.createNode('dialogue', token.value, meta);

      return true;
    }

    return false;
  }

  /**
   * Determine if the current token is an action description.
   *
   * An action description is defined by:
   *   * Has a scene header or an empty line before it.
   *   * Has an empty line or end of file after it.
   *   * Starts with an alphanumeric key.
   * 
   * @return {Boolean}
   */
  isAction() {
    const token = this.tokens[this.i];
    const prevToken = this.tokens[this.i - 1];
    const postToken = this.tokens[this.i + 1];
    const hasEmptyOrScenePrev = prevToken
      ? prevToken.type === types.EMPTYLINE || prevToken.type === types.SCENE
      : true;
    const hasEmptyAfter = postToken ? postToken.type === types.EMPTYLINE : true;
    const startsWithAlpha = new RegExp('^[0-9a-z]', 'i').test(token.value);

    return hasEmptyOrScenePrev && hasEmptyAfter && startsWithAlpha;
  }

  /**
   * Check if this is an action description and insert the node.
   * @param  {Object} token Token to check.
   * @return {Boolean}
   */
  getAction(token) {
    if (token.type === types.STRING && this.isAction()) {
      this.createNode('action', token.value);

      return true;
    }

    return false;
  }

  /**
   * Check if this is a scene header and insert the node.
   * @param  {Object} token Token to check.
   * @return {Boolean}
   */
  getScene(token) {
    if (token.type === types.SCENE) {
      // Parse out the different parts of the scene.
      const scene = token.value.split(' - ');
      const name = scene[0].replace(/(EXT|INT)\. /, '');
      const day = parseInt(scene[1].replace('DAY ', ''), 10);
      const time = scene[2];
      const weather = scene[3];

      // Find the parent of the current node and reset the parent to that level.
      if (this.parentNode && this.parentNode.type !== 'root') {
        this.parentNode = this.findParent(this.ast, this.parentNode);
      }

      // Insert the scene node and update the current child to the scene.
      this.createNode('scene', name, {day, time, weather});
      this.parentNode = this.curNode;
      this.ast.scenes.push(name);

      return true;
    }

    return false;
  }

  /**
   * Check if this is a choice option and insert the node.
   * @param  {Object} token Token to check.
   * @return {Boolean}
   */
  getChoice(token) {
    if (token.type === types.CHOICE) {
      const parent = this.findParentOfType(this.ast, this.curNode, 'choice');
      if (!parent || parent.type !== 'choice') {
        this.createNode('choice');
        this.parentNode = this.curNode;
      }

      // Insert the choice option as a child of the choice node.
      this.createNode('choice_option', token.value, {
        fact: this.tokens[this.i + 1].value,
      });

      return true;
    }

    // If this is a conditional wrapped around the first choice option, make this a choice.
    const next = this.tokens[this.i + 1] || {};
    if (token.type === types.CONDITIONAL && this.parentNode.type !== 'choice' && next.type === types.CHOICE) {
      this.createNode('choice');
      this.parentNode = this.curNode;

      return false;
    }

    // If this is an empty line and we are currently in a choice block, jump up one level.
    if (this.parentNode.type === 'choice' && token.type === types.EMPTYLINE) {
      const choice = this.findParentOfType(this.ast, this.curNode, 'choice');;
      const choiceParent = this.findParent(this.ast, choice);
      this.parentNode = choiceParent;
    }

    return false;
  }

  /**
   * Check if this is a conditional and insert the node (or add onto already existing node).
   * @param  {Object} token Token to check.
   * @return {Boolean}
   */
  getConditional(token) {
    if (
      token.type === types.CONDITIONAL
      || token.type === types.CONDITIONAL_BARK
      || token.type === types.CONDITIONAL_OPEN
    ) {
      // Create the fact object with the correct value.
      const cond = {fact: token.value.replace('!', ''), value: 2};
      if (
        token.value.endsWith('Trigger')
        || token.value.endsWith('InHand')
        || token.value.endsWith('Inventory')
        || token.value.endsWith('Clicked')
        || token.value.endsWith('OnHand')
        || token.value.endsWith('Activated')
        || token.value.endsWith('Examined')
        || token.value.endsWith('Pressed')
      ) {
        cond.value = 1;
      }
      if (token.value.startsWith('!')) {
        cond.value = 0;
      }

      // If the previous token is also a conditional, then include this value in that node.
      if (this.curNode && this.curNode.type === 'conditional' && this.choiceLine === token.line) {
        this.curNode.conditions.push(cond);
      } else {
        // Determine the meta data.
        let meta = null;
        if (token.type === types.CONDITIONAL_BARK) {
          meta = {bark: true};
        }
        if (token.type === types.CONDITIONAL_OPEN) {
          meta = {open: true};
        }

        this.createNode('conditional', [cond], meta);
        this.parentNode = this.curNode;
        this.choiceLine = token.line;
      }

      return true;
    }

    return false;
  }

  /**
   * Check if this is the end of a conditional block and move back up the tree.
   * @param  {Object} token Toekn to check.
   * @return {Boolean}
   */
  getConditionalEnd(token) {
    if (token.type === types.CONDITIONAL_END) {
      this.parentNode = this.findParent(this.ast, this.parentNode);

      return true;
    }

    return false;
  }
}

module.exports = Parser;
