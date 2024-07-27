# Webpack loader for GLSL shaders
[![NPM](https://nodei.co/npm/ts-shader-loader.png)](https://npmjs.org/package/ts-shader-loader)

A glsl shader loader for webpack, includes support for nested imports, 
allowing for smart code reuse among more complex shader implementations. 
The shader is returned as a string.

## Why fork

I had a problem using other webpack shader loaders with typescript. While i was investigating what is the problem, i forked and tried to make my version work with typescript. Other than support with typescript, it has no other benefits.

## Install

```shell
npm install --save-dev ts-shader-loader
```

## Usage

## In configuration

```javascript
{
    module: {
        loaders: [
            {
                test: /\.(glsl|vs|fs)$/,
                loader: 'ts-shader-loader'
            }
        ]
    }
}
```

and then

```javascript
import myLovleyShaderGlsl from './myLovelyShader.glsl');
```


## Imports

This loader supports an import syntax to allow you to maximise your code reuse
and keep those shaders
[DRY](http://en.wikipedia.org/wiki/Don%27t_repeat_yourself). This syntax is 
very similar to that of SASS.

### Example

Example project structure:
```
src/
---- ts/
---- ---- main.ts
---- shaders/
---- ---- includes/
---- ---- ---- perlin-noise.glsl
---- ---- fragment.glsl
```

If I require my fragment shader inside `main.js`:

```javascript
import shader from '../shaders/fragment.glsl');
```

I can have that shader include other `.glsl` files inline, like so:

```sass
@import ./includes/perlin-noise;
```

> **N.B.** all imports within `.glsl` files exclude the file extension and 
are relative to the file doing the importing.

Imported files are parsed for `@import` statements as well, so you can nest
imports as deep as you'd like (although, you should probably rethink your
shader if you require any more than 2 levels).

Imported files are inserted directly into the source file in place of the
`@import` statement and no special handling or error checking is provided. So,
if you get syntax errors, please first check that shader works as one 
contiguous file before raising an issue.

## TODO

+ Deduplicate imports, to prevent code clobbering and conflicts at runtime
