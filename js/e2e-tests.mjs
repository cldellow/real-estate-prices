import LZ4 from 'lz4';

import fs from 'fs';
import path from 'path';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
import * as engine from './engine';

function parseOracle(file) {
  const bytes = fs.readFileSync(file);
  const lines = bytes.toString('utf8').split('\n');
  const rv = [];
  for(var i = 0; i < lines.length; i++) {
    if(lines[i])
      rv.push(JSON.parse(lines[i]));
  }

  return rv;
}

function canonicalize(obj) {
  return Object.entries(obj).sort();
}

function compare(expected, actual) {
  const rv = {
    'both': [],
    'missing': [],
    'extra': []
  };

  const both = {}
  for(var i = 0; i < expected.length; i++) {
    const needle = JSON.stringify(canonicalize(expected[i]));

    for (var j = 0; j < actual.length; j++) {
      const candidate = JSON.stringify(canonicalize(actual[j]));

      if(needle == candidate) {
        both[needle] = true;
        break;
      }
    }
  }

  for(var i = 0; i < expected.length; i++) {
    const candidate = expected[i];
    const needle = JSON.stringify(canonicalize(candidate));
    if(both[needle]) {
      //rv['both'].push(candidate);
    } else {
      rv['missing'].push(candidate);
    }
  }

  for(var i = 0; i < actual.length; i++) {
    const candidate = actual[i];
    const needle = JSON.stringify(canonicalize(candidate));
    if(!both[needle]) {
      rv['extra'].push(candidate);
    }
  }

  return rv;
}

function runTests(outputDir, oracles) {
  oracles.forEach(oracle => {
    const file = oracle.replace(/\.jsonl$/, '');
    const expected = parseOracle(oracle);

    console.log(file);
    var bytes = fs.readFileSync(file);
    if(file.endsWith('.lz4')) {
      bytes = LZ4.decode(bytes);
    }

    const dom = new JSDOM(bytes);

    engine.rewrite(dom.window.document.body);

    const actual = engine.extract(dom.window.document);
    const compared = compare(expected, actual);
    if(compared['missing'].length > 0 || compared['extra'].length > 0) {
      // Write a sentinel file
      fs.writeFileSync(outputDir + '/' + oracle.replace(/^.*\//, ''), JSON.stringify(compared, null, 2));
    }
  });
}

function usage() {
  console.error('usage: node e2e-tests.mjs run outputdir/ file1 [file2 ... fileN]');
  process.exit(1);
}

if (process.argv.length >= 5 && process.argv[2] == 'run') {
  const files = process.argv.slice(4);
  console.log(files);
  const rv = runTests(process.argv[3], files);
  process.exit(rv);
}

usage();
