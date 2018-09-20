const canvas = require('../src/canvas.js')

// a manager library for use 
// for synchronous interaction
// with the canvas library
class Manager {

  constructor(apikey, course) {
    this.courseid = course
    this.apikey = apikey
    this.course = course = canvas(apikey).load(course)
    this.loaded = false
    this.loading = false
  }


  wait() {
    let course = this.course
    let call = (t, resolve) => course.limbo() 
        ? console.log("objects in queue:", course.limbo())
        : (clearInterval(t), resolve())

    return new Promise(resolve => {
      let t = setInterval(() => call(t, resolve), 1000)
    })
  }

  async load(reload=false) {
    if (this.loading)
      await this.wait()
    else if (!this.loaded || reload) {
      this.loading = true
      this.course.getcontent()
      await this.wait()
      this.loading = false
      this.loaded = true
    }
  }

  async search(pattern, option, ashtml=false) {
    await this.load(false)
    return this.course.search(pattern, option, ashtml)
  }


  // find links that link to some other courses
  // that is not the current one
  async find_bad_links(callback) {
    await this.load(false)
    let f = (i, n, c) => String.raw`<[^>]*?/courses/[0-9]{${i}}[^${c}][^<]*?>`
    let g = s => s.split("")
            .map((c, i) => f(i, s.length-1, c))
            .map(i => i)
            .join("|")

    let pattern = `(${g(this.courseid.toString())})`
    let matches = await this.search(pattern)
    // console.log(matches)
    return Object
      .values(matches)
      .map(i => ({
        link  : i.object.pagelink,
        title : i.object.title,
        match : i.m.text
      }))
  }

}

api = "1116~Br8VsIcG74XaZBnueQwDTNUykG75tLnZmrtLgntLfcEWSZPT2lCxEhvGosmB9RsJ"
let m = new Manager(api, "1073295")

m.find_bad_links().then(i => console.log(i))

