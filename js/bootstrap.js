// Tag DOM with extra classes for targeting.
function rewrite(el) {
  if(el.nodeType == 1) { // Element

    var txt = innerText(el);
    if(txt.length <= 40) {
      txt = txt.toLowerCase().replace(/[^0-9a-z]+/g, '-').replace(/^-+|-+$/g, '');
      if(txt) {
        el.className += ' q-' + txt;
      }
    }

    for(var i = 0; i < el.children.length; i++) {
      rewrite(el.children[i]);
    }

  }
}

function innerText(el) {
  if(el.nodeType == 1) {
    const rv = [];
    for(var i = 0; i < el.childNodes.length; i++) {
      rv.push(innerText(el.childNodes[i]));
    }
    return rv.join(' ').replace(/^ +| +$/g, '');
  } else if (el.nodeType == 3) {
    return el.textContent;
  }
  return '';
}

function mergeMapKeys(acc, cur) {
  if(!cur)
    return acc;

  const entries = Object.entries(cur);
  for(var i = 0; i < entries.length; i++) {
    const [k, v] = entries[i];

    if(!acc[k])
      acc[k] = [];

    if(acc[k].indexOf(v) == -1)
      acc[k].push(v);
  }

  return acc;
}

function tryListing(candidate) {
  const rv = {};

  const entries = Object.entries(candidate);
  var ok = false;
  for(var i = 0; i < entries.length; i++) {
    const [k, v] = entries[i];

    if(v.length == 1) {
      rv[k] = v[0];
      ok = true;
    }
    else
      return;
  }

  if(ok)
    return rv;
}

function applyRule(el, selector, rules) {
  const els = el.querySelectorAll(selector);

  const rv = [];
  for(var i = 0; i < els.length; i++) {
    const listings = [];
    const el = els[i];

    // Apply the rules to extract values from the page, accumulating distinct values.
    for(var j = 0; j < rules.length; j++) {
      const [ruleSelector, f] = rules[j];
      const nodes = el.querySelectorAll(ruleSelector);
      for(var k = 0; k < nodes.length; k++) {
        listings.push(f(nodes[k]));
      }
    }

    const candidate = listings.reduce(mergeMapKeys, {})
    const listing = tryListing(candidate);

    if(listing) {
      rv.push(listing);
    }
  }

  return rv;
}

function extract(el) {
  const rv = [];
  for(var i = 0; i < rules.length; i++) {
    const tmp = applyRule(el, rules[i][0], rules[i][1]);
    for(var j = 0; j < tmp.length; j++)
      rv.push(tmp[j]);
  }

  return rv;
}

function parseStreetAddress(el) {
  const txt = innerText(el);
  const rv = /(.+), (.+), ([A-Z][A-Z]) +([0-9]{5})/.exec(txt);

  if(rv)
    return {
      address: rv[1],
      city: rv[2],
      state: rv[3],
      postal_code: rv[4],
      country: 'US'
    }
}

function parsePrice(el) {
  const txt = innerText(el);
  const res = [
    /\$([0-9]{1,3}, *[0-9]{3}, *[0-9]{3})/,
    /\$([0-9]{3}, *[0-9]{3})/
  ];

  for(var i = 0; i < res.length; i++) {
    const re = res[i];
    const rv = re.exec(txt);

    if(rv)
      return {
        price: parseInt(rv[1].replace(/,/g, ''), 10)
      }
  }
}

function parseBeds(el) {
  const txt = innerText(el);
  const res = [
    /^ *([0-9]) *beds? *$/i,
    /^ *([0-9]) *bedbeds *$/i
  ];

  for(var i = 0; i < res.length; i++) {
    const re = res[i];
    const rv = re.exec(txt);
    if(rv)
      return {
        beds: parseInt(rv[1], 10)
      }
  }
}

function parseBaths(el) {
  const txt = innerText(el);
  const rv = /^ *([0-9]) *baths? *$/i.exec(txt);
  if(rv)
    return {
      baths: parseInt(rv[1], 10)
    }
}

function parseMLS(el) {
  const txt = innerText(el);
  const rv = /^ *MLS *#? *([A-Z0-9]{5,15}) *$/.exec(txt);

  if(rv)
    return {
      external_id: rv[1]
    }
}

function parseSqft(el) {
  const txt = innerText(el);
  const res = [
    /^ *([0-9]{1,2},? *[0-9]{3}) *squ?a?r?e?\.? ?fe?e?o?o?t[. ]*$/i,
    /^ *([0-9]{3}) *squ?a?r?e?\.? ?fe?e?o?o?t[. ]*$/i,
  ];

  for(var i = 0; i < res.length; i++) {
    const re = res[i];
    const rv = re.exec(txt);
    if(rv)
      return {
        sqft: parseInt(rv[1].replace(/[ ,]+/, ''), 10)
      }
  }
}

const rules = [
  ['.property', [
    ['.address', parseStreetAddress],
    ['*', parsePrice],
    ['*', parseBeds],
    ['*', parseBaths],
    ['*', parseMLS]]],
  ['.idxitem', [
    ['*', parseStreetAddress],
    ['*', parsePrice],
    ['*', parseBeds],
    ['*', parseBaths],
    ['*', parseSqft],
    ['*', parseMLS]]]
];

// If we're running in Chrome, load Selector Gadget and apply some rules.
(function() {
  if(typeof document == 'object') {
    s=document.createElement('script');
    s.setAttribute('type','text/javascript');
    s.setAttribute('src','https://dv0akt2986vzh.cloudfront.net/unstable/lib/selectorgadget_edge.js');
    document.body.appendChild(s);

    const start = new Date();
    console.log('start');
    rewrite(document.body)
    console.log('done: ' + (new Date() - start));

    const listings = extract(document.body);

    const rv = [];
    for(var i = 0; i < listings.length; i++) {
      rv.push(JSON.stringify(listings[i]));
    }

    console.log(rv.join('\n'));
  }
})();


if(typeof module !== 'undefined') {
  var exports = module.exports = {
    rules: rules,
    applyRule: applyRule,
    mergeMapKeys: mergeMapKeys,
    tryListing: tryListing,
    rewrite: rewrite,
    extract: extract

  };
}