/**
 * StoryScript
 * Copyright (c) 2021, GoldFire Studios, Inc.
 * https://goldfirestudios.com
 */

const test = require('ava');
const Lexer = require('../src/lexer');
const Parser = require('../src/parser');
const types = require('../src/types');

test('parse a character', (t) => {
  const parser = new Parser(new Lexer(`EXT. SCENE HEADING - DAY 1 - AFTERNOON - CALM
Some test action descriptions to start the "script."

CLAIRE
(scared)
I’m having contractions--`).run());

  t.false(parser.getCharacter(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getCharacter(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getCharacter(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getCharacter(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getCharacter(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getCharacter(parser.tokens[parser.i]));
});

test('parse a dialogue line', (t) => {
  const parser = new Parser(new Lexer(`EXT. SCENE HEADING - DAY 1 - AFTERNOON - CALM
Some test action descriptions to start the "script."

CLAIRE
(scared)
I’m having contractions--`).run());

  // Check the dialogue line tests.
  t.false(parser.isDialogue());
  parser.i += 1;
  t.false(parser.isDialogue());
  parser.i += 1;
  t.false(parser.isDialogue());
  parser.i += 1;
  parser.getCharacter(parser.tokens[parser.i]);
  t.false(parser.isDialogue());
  parser.i += 1;
  t.false(parser.isDialogue());
  parser.i += 1;
  t.true(parser.isDialogue());

  // Check dialogue node creation.
  parser.getDialogue(parser.tokens[parser.i]);
  t.deepEqual(parser.curNode, {
    type: 'dialogue',
    value: 'I\'m having contractions--',
    meta: {
      character: 'CLAIRE',
      parenthetical: 'scared',
    },
  });
});

test('parse an action description', (t) => {
  const parser = new Parser(new Lexer(`EXT. SCENE HEADING - DAY 1 - AFTERNOON - CALM
Some test action descriptions to start the "script."

CLAIRE
(scared)
I’m having contractions--`).run());

  // Check the action description tests.
  t.false(parser.isAction());
  parser.i += 1;
  t.true(parser.isAction());
  parser.getAction(parser.tokens[parser.i]);
  parser.i += 1;
  t.false(parser.isAction());
  parser.i += 1;
  t.false(parser.isAction());
  parser.i += 1;
  t.false(parser.isAction());
  parser.i += 1;
  t.false(parser.isAction());

  // Check action node creation.
  t.deepEqual(parser.curNode, {
    type: 'action',
    value: 'Some test action descriptions to start the "script."',
  });
});

test('parse a scene header', (t) => {
  const parser = new Parser(new Lexer(`EXT. SCENE HEADING - DAY 1 - AFTERNOON - CALM
Some test action descriptions to start the "script."

CLAIRE
(scared)
I’m having contractions--`).run());

  // Check the dialogue line tests.
  t.true(parser.getScene(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getScene(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getScene(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getScene(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getScene(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getScene(parser.tokens[parser.i]));

  // Check dialogue node creation.
  t.deepEqual(parser.curNode, {
    type: 'scene',
    value: 'SCENE HEADING',
    meta: {
      day: 1,
      time: 'AFTERNOON',
      weather: 'CALM',
    },
  });
});

test('parse a choice block', (t) => {
  const parser = new Parser(new Lexer(`EXT. SCENE HEADING - DAY 1 - AFTERNOON - CALM
Some test action descriptions to start the "script."

**= 1. Choice #1**
*{TestScene_Choice01_01}*
**= 2. Choice #2**
*{TestScene_Choice01_02}*
**= 3. Choice #3**
*{TestScene_Choice01_03}*
**= 4. [silence]**
*{TestScene_Choice01_Silence}*
`).run());

  // Check the dialogue line tests.
  parser.getScene(parser.tokens[parser.i])
  t.false(parser.getChoice(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getChoice(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getChoice(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getChoice(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getChoice(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getChoice(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getChoice(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getChoice(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getChoice(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getChoice(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getChoice(parser.tokens[parser.i]));

  // Check dialogue node creation.
  t.deepEqual(parser.parentNode, {
    type: 'choice',
    children: [
      {
        type: 'choice_option',
        value: 'Choice #1',
        meta: {
          fact: 'TestScene_Choice01_01',
        },
      },
      {
        type: 'choice_option',
        value: 'Choice #2',
        meta: {
          fact: 'TestScene_Choice01_02',
        },
      },
      {
        type: 'choice_option',
        value: 'Choice #3',
        meta: {
          fact: 'TestScene_Choice01_03',
        },
      },
      {
        type: 'choice_option',
        value: '[silence]',
        meta: {
          fact: 'TestScene_Choice01_Silence',
        },
      },
    ],
  });
});

test('parse a conditional', (t) => {
  const parser = new Parser(new Lexer(`EXT. SCENE HEADING - DAY 1 - AFTERNOON - CALM
Some test action descriptions to start the "script."

CLAIRE
(scared)
I’m having contractions--

**{TestFact}**

CLAIRE
I don’t know, a few of ‘em just happened.

**{}**`).run());

  // Check the dialogue line tests.
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getConditionalEnd(parser.tokens[parser.i]));

  // Check dialogue node creation.
  t.deepEqual(parser.curNode, {
    type: 'conditional',
    conditions: [
      {
        fact: 'TestFact',
        value: 2,
      },
    ],
  });
});

test('parse the end of a conditional', (t) => {
  const parser = new Parser(new Lexer(`EXT. SCENE HEADING - DAY 1 - AFTERNOON - CALM
Some test action descriptions to start the "script."

CLAIRE
(scared)
I’m having contractions--

**{TestFact AND TestScene_Choice01_03}**

JACK
Stop-- her head’s not tilted far back enough-- you’re blowing air into her stomach--

  **{TestFact02 AND NOT TestScene_Choice01_01}**

BOONE
Are you sure? I’m a lifeguard! I’m licensed!

  **{}**

**{}**`).run());

  // Check the dialogue line tests.
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getCharacter(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getDialogue(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getCharacter(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getDialogue(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getConditionalEnd(parser.tokens[parser.i]));
  parser.i += 1;
  t.false(parser.getConditional(parser.tokens[parser.i]));
  parser.i += 1;
  t.true(parser.getConditionalEnd(parser.tokens[parser.i]));
});
