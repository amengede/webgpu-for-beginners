import * as fs from 'fs';
import * as path from 'path';
import { getOptions } from 'loader-utils';

const name = 'webpack-glsl-loader';

function parse(loader, source, context, cb) {
  const imports = [];
  const importPattern = /@import ([.\/\w_-]+);/gi;
  let match = importPattern.exec(source);

  while (match != null) {
    imports.push({
      key: match[1],
      target: match[0],
      content: '',
    });
    match = importPattern.exec(source);
  }

  processImports(loader, source, context, imports, cb);
}

function processImports(loader, source, context, imports, cb) {
  if (imports.length === 0) {
    return cb(null, source);
  }

  const imp = imports.pop();

  loader.resolve(context, `${imp.key}.glsl`, (err, resolved) => {
    if (err) {
      return cb(err);
    }

    loader.addDependency(resolved);
    fs.readFile(resolved, 'utf-8', (err, src) => {
      if (err) {
        return cb(err);
      }

      parse(loader, src, path.dirname(resolved), (err, bld) => {
        if (err) {
          return cb(err);
        }

        const newSource = source.replace(imp.target, bld);
        processImports(loader, newSource, context, imports, cb);
      });
    });
  });
}

export default function (source) {
  this.cacheable();
  const cb = this.async();

  parse(this, source, this.context, (err, bld) => {
    if (err) return cb(err);

    cb(null, `export default ${JSON.stringify(bld)}`);
  });
}
