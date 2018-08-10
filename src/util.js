

const util = module.exports = (() => {

  class MultiSet {

    constructor() {
      this.set = {}
      this.length = 0
    }

    add(string) {
      this.length += 1
      if (this.set[string])
        this.set[string] += 1
      else
        this.set[string] = 1
    }

    remove(string) {
      if (!this.set[string])
        throw "removing element not in MultiSet"
      else if (this.set[string] === 1)
        delete this.set[string]
      else
        this.set[string] -= 1
      this.length -= 1
    }

  }

  function watch(callback) {
    const call = () => { callback() && setTimeout(call) }
    setTimeout(call, 500)
  }

  function serialize(object) {
    const enc = encodeURIComponent
    const args = []
    const cond = ([key, val]) => val instanceof Array
      ? val.forEach(v => args.push([enc(key)+'[]', enc(v)]))
      : args.push([enc(key), enc(val)])
    Object.entries(object).forEach(cond)
    return args
      .map(([k, v]) => `${k}=${v}`)
      .join('&')
  }

  function addparams(url, headers) {
    return url.includes("?")
      ? `${url}&${serialize(headers)}`
      : `${url}?${serialize(headers)}`
  }


  function getnext(result) {

    function pairs_to_object(list) {
      return list.reduce((dict, pairs) => {
        const [key, value] = pairs
        dict[key] = value
        return dict
      }, {})
    }

    function parselinkheader(rawtext) {

      const trim = x => x.slice(1, x.length-1)
      const items = rawtext.split(",")
      const pairs = items.map(s => {
        const [rawlink, rawrel] = s.split(";")
        const [_, rel]  = rawrel.split("=")
        return [trim(rel), trim(rawlink)]
      })

      return pairs_to_object(pairs)
    }

    function main(result) {
      const linkhead = result.get("Link")
      return linkhead
        ? parselinkheader(linkhead).next
        : undefined
    }

    return main(result)
  }

  function regex(query, cased) {
    const modifier = cased ? "g" : "ig"
    return query instanceof RegExp
      ? query
      : new RegExp(`(${query})`, modifier)
  }

  function splitmatch(item, query, cased=false) {
    const string = JSON.stringify(item)
    const regex = util.regex(query, cased)
    return string.split(regex)
  }

  function includes(string, query, cased=false) {
    if (!cased)
      string = string.toLowerCase(),
      query  = query.toLowercase()
    return string.includes(query)

  }

  function truncate(string, n) {
    return string.length > n
      ? string.slice(0, n - 3) + "..."
      : string
  }

  function indicesof(array, check) {
    const coll = []
    if (!check instanceof Function)
      check = x => x === check
    array.forEach((val, ind) => {
      if (check(val)) coll.push(ind)
    })
    return coll
  }

  function print(x) {
    console.log(x)
    return x
  }

  function boxkeys(boxname, object) {
    const box = s => `${boxname}[${s}]`
    const newobj = {}
    Object
      .entries(object)
      .map(([key, value]) => newobj[box(key)] = value)
    return newobj
  }

  return {
    watch, regex, getnext, addparams, indicesof,
    splitmatch, MultiSet, print, boxkeys
  }

})()



