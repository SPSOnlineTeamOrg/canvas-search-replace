// NOTE: doesn't work when we have
// str<br>ing</br> and we search for string.

const Search = module.exports = (() => {

  const l = i => 2 * i + 1 // index of left child
  const r = i => 2 * i + 2 // index of right child
  const p = i => (i - 1) >> 1 // index of parent
  // largest power of two greater than or equal to x
  const ceillog = x => Math.ceil(Math.log2(x))

  function assert_str_eq() {

  }


  function onespace(s) {
    while (s.includes("  "))
      s = s.replace(/  /g, " ")

    while (s.includes("\n "))
      s = s.replace(/\n /g, "\n")

    while (s.includes(" \n"))
      s = s.replace(/ \n/g, "\n")

    return s
  }

  class Html {


    // binary tree stores the length of the text stored in the tree
    heapify() {
      const size = this.size = 2**ceillog(this.items.length)
      const heap = this.heap = Array(size<<1 + 1).fill(0)
      this.items.forEach((s, i) =>
        heap[i+size] = !s.attr * s.text.length)
      for (let i = size - 1; i >= 0; --i)
        heap[i] = heap[l(i)] + heap[r(i)]

    }

    constructor(html, ashtml=false) {
      const match = /(<[\S|\s]*?>)/g
      this.raw = html
      this.items = ashtml
        ? html
          .split(match)
          .map(s => s.trim())
          .filter(s => s.trim() !== '')
          .map(s => ({ "attr": /^<[\S|\s]*?>$/g.test(s), "text":s+" " }))
        : [{ "attr": false, "text":html }]
      if (!ashtml)
        this.items.forEach(d => 
          d.attr ? null : d.text = onespace(d.text+" "))
      this.heapify()
    }

    // update the tree to preserve the property
    update(i) {

      const heap = this.heap
      this.asserttext(i)
      heap[i+this.size] = this.items[i].text.length
      i += this.size
      while (i >>= 1)
        heap[i] = heap[l(i)] + heap[r(i)]
    }

    // find the item containing
    // character at index i in the text
    itemindex(i) {
      let curr = 0
      const heap = this.heap
      while (curr < this.size)
        curr = i < heap[l(curr)]
          ? l(curr)
          : (i -= heap[l(curr)], r(curr)) // cute
      return curr - this.size
    }

    // returns the starting index
    // in the text of item at index i
    textindex(i) {
      let ind = 0
      i += this.size
      while (i = p(i))
        // only adds the size of left child if you are the right child
        ind += !(i%2) * this.heap[l(p(i))]
      return ind
    }

    text() {
      return this.items
        .filter(s => !s.attr)
        .map(s => s.text)
        .join("")
        .trim()
    }

    html() {
      return this.items
        .map(s => s.text.trim())
        .join("")
    }

    search(pattern, options, csize=18) {
      if (!pattern)
        throw "empty search pattern"
      if (pattern[0] == '(' && pattern[pattern.length-1] == ')')
        pattern = pattern.slice(1, pattern.length - 1)
      let match = 0
      const pos = x => Math.max(x, 0)
      const regex  = new RegExp(`(${pattern})`, options)
      const strict = new RegExp(`^${pattern}$`, options)
      const text = this.text()
      return text
        .split(regex)
        .map(str => [str, match, match += str.length])
        .filter(t => strict.test(t[0])) // dont switch filter with map here
        .map(([str, start, end]) => ({
          "text"   : str,
          "s"      : start,
          "e"      : end,
          'before' : text.slice(pos(start-csize), start),
          'after'  : text.slice(end, end+csize)
        }))
    }


    // returns -1 if this is the last
    // instance of text
    nexttextitem(i) {
      while (++i < this.items.length)
        if (!this.items[i].attr)
          return i
      return -1
    }

    asserttext(i) {
      if (this.items[i].attr)
        throw "not an editable text"
    }


    replace(match, newstr) {
      function split(text, ...pairs) {
        pairs.unshift(0)
        const mapper = (_, i) =>
          text.slice(pairs[i], pairs[i+1])
        return pairs.map(mapper)
      }

      function finalize(self, match, tochange, affected) {
        const removedtext = tochange
          .map(([_, oldtext, __]) => oldtext)
          .join("")

        if (removedtext !== match.text)
          throw `text to replace is different from text found: "${match.text}" vs "${removedtext}"`

        tochange.map(([item, _, newtext]) => item.text = newtext)
        affected.forEach(i => self.update(i))

      }

      function main(self, match, newstr) {
        if (newstr === undefined)
          throw 'no replace string given'
        let i = self.itemindex(match.s)
        self.asserttext(i)
        const t = self.textindex(i)
        const affected = [i]

        const curr  = self.items[i]
        const [start, stop] = [match.s - t, match.e - t]
        const [l, m, r] = split(curr.text, start, stop)
        const tochange = [[curr, m, l + newstr + r]]
        let overflow = stop - curr.text.length

        while (overflow > 0 && (i = self.nexttextitem(i)) > -1) {
          const curr = self.items[i]
          tochange.push([curr, ...split(curr.text, overflow)])
          affected.push(i)
          overflow -= curr.text.length
        }

        return finalize(self, match, tochange, affected)
      }

      return main(this, match, newstr)
    }

    replaceall(matches, newstr) {
      matches.sort((ma, mb) => mb.s - ma.s)
      for (let i = 0; i < matches.length - 1; ++i)
        if (matches[i].s < matches[i+1].e)
          throw "overlap in matches to be replaced"
      // replace from the back since
      // sizes in the heap are preserved up to the
      // index of replacement
      matches.forEach(m => this.replace(m, newstr))
    }
  }

  return Html

})()

