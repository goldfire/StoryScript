## Description
**StoryScript** is a fork of the standard screenplay format to be used with interactive games, originally designed for use in the game [Arctic Awakening](https://arcticawakening.com).

## Installation
* Install with [npm](https://www.npmjs.com/package/@goldfire/storyscript): `npm install @goldfire/storyscript`
* Install with [Yarn](https://yarnpkg.com/en/package/@goldfire/storyscript): `yarn add @goldfire/storyscript`

## Usage
To use as a CLI:

```bash
> node StoryScript /absolute/path/to/script.txt
```

To use in a Node.js project:

```javascript
const {parseScript} = require('@goldfire/storyscript');

const scriptFile = fs.readFileSync('/path/to/script.txt', 'utf8');
const ast = parseScript(scriptFile);

console.log(JSON.stringify(ast, null, 2));
```

## StoryScript Syntax
TODO

## License
Copyright (c) 2021 [James Simpson](https://twitter.com/GoldFireStudios) and [GoldFire Studios, Inc.](https://goldfirestudios.com)

Released under the [MIT License](https://github.com/goldfire/storyscript/blob/master/LICENSE).
