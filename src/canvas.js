
const util = require("./util.js")
const load = require("./loader.js")
const Search = require("./replace.js")

const canvas = module.exports = (() => {
  // local is set in case we're using a server relay
  const local    = "https://canvas.brown.edu/api/v1/"
  const endpoint = "https://canvas.brown.edu/api/v1/"
  const baselink = "https://canvas.brown.edu/"

  class CanvasObject {

    transferrable() {
      return {}
    }

    matchable() {
      return []
    }

    construct(response, loader) {
      const self = this

      // extract course id and page type from given url
      function parse(url) {
        const l = url.split("/")
        const start = l.indexOf("courses")
        // url formats are of the form /courses/course_id/page_type/page_id
        const [courseid, pagetype] = l.slice(start+1, start+3)
        return [courseid, pagetype]
      }

      // bad name
      function runprotocol(self) {
        // transfer things in transferrable to self
        Object
          .entries(self.transferrable())
          .forEach(([key, value]) => self[key] = response[value] || "")
      }

      function main(response, loader) {
        const link = response.html_url.includes(endpoint)
          ? response.html_url
          : response.html_url.replace(baselink, endpoint)
        const [courseid, pagetype] = parse(link)
        self.pagelink = response.html_url
        self.courseid = courseid
        self.pagetype = pagetype
        self.response = response
        self.searcher = {}
        self.loader = loader
        self.link = link
        self.loadertype = self.loader.type

        runprotocol(self)
      }

      return main(response, loader)
    }

    constructor(response, loader) {
      this.construct(response, loader)
    }

    fromnewresponse(response) {
      this.construct(response, this.loader)
    }

    text() {
      return this
        .matchable()
        .map(key => `--[${this.searcher[key].text()}]--`)
        .join("")
    }

    assert_type(type) {
      if (this.pagetype !== type)
        throw `wrong canvas object type. expected ${type}, got ${this.page_type}`
    }

    assert_id(id) {
      const resp_id = (this.response.id || this.response.courseid)
      if (this.id != resp_id)
        throw `inconsistent object id: ${resp_id} vs ${this.id}`
      else if (id && this.id != id)
        throw `false assert id: ${id} vs ${this.id}`
    }

    // returns url for getting and posting
    arrayurl() {
      return ["courses", this.courseid, this.pagetype, this.id]
    }

    reload() {
      throw "not implemented"
    }

    altered() {
      const retval = {}
      Object
        .entries(this.transferrable())
        .map(([key, value]) => {
          if (this[key] !== this.response[value])
            retval[value] = this[key]
        })
      return retval
    }

    search(query, option, ashtml=false, result=[]) {
      const object = this
      const search = object.searcher = {}
      object
        .matchable()
        .map(key => search[key] = new Search(object[key], ashtml))

      Object
        .entries(search)
        .map(([key, s]) => [key, s.search(query, option)])
        .map(([key, r]) =>
          r.map(m => result.push({
            key, object, m,
            text : `${m.before}${m.text}${m.after}`,
            type : object.loadertype,
            id   : object.id
          })))
      return result
    }

    replace(matches, newstr) {
      const cats = {}
      matches
        .map(({object, key, m}) =>
          cats[[object.id, key]]
            ? cats[[object.id, key]].match.push(m)
            : cats[[object.id, key]] = {object, key, match:[m]})
      Object
        .values(cats)
        .map(({object, key, match}) => {
          object.searcher[key].replaceall(match, newstr)
          this[key] = object.searcher[key].html()
        })

    }

    push(callback) {
      const load = this.loader
      // const url_array = this.arrayurl()
      // const url = load.to_url(url_array)
      const link = this.link
      const data = this.updatename
        ? util.boxkeys(this.updatename, this.altered())
        : this.altered()
      load.putcontent(link, {data}, callback)
    }

    delete(callback) {
      const load = this.loader
      // const url_array = this.arrayurl()
      // const url = load.to_url(url_array)
      const link = this.link
      load.deletecontent(link, {}, callback)
    }
  }

  class CanvasQuiz extends CanvasObject {

    transferrable() {
      return {
        "id": "id",
        "title": "title",
        "rawbody": "description"
      }
    }

    matchable() {
      return ["title", "rawbody"]
    }

    constructor(response, loader) {
      super(response, loader)
      this.assert_type("quizzes")
      this.updatename = 'quiz'
    }
  }


  class CanvasPage extends CanvasObject {

    transferrable() {
      return {
        "id": "page_id",
        "title": "title",
        "rawbody": "body"
      }
    }

    matchable() {
      return ["title", "rawbody"]
    }

    constructor(response, loader) {
      super(response, loader)
      this.assert_type("pages")
      this.updatename = 'wiki_page'
    }

  }

  class CanvasDiscussion extends CanvasObject {

    transferrable() {
      return {
        "id": "id",
        "title": "title",
        "rawbody": "message"
      }
    }

    matchable() {
      return ["title", "rawbody"]
    }

    constructor(response, loader) {
      super(response, loader)
      this.assert_type("discussion_topics")
      this.updatename = null
    }

  }

  class CanvasAnnouncement extends CanvasObject {

    transferrable() {
      return {
        "id": "id",
        "title": "title",
        "rawbody": "message"
      }
    }

    matchable() {
      return ["title", "rawbody"]
    }

    constructor(response, loader) {
      super(response, loader)
      this.assert_type("discussion_topics")
      this.updatename = null
    }
  }

  class CanvasAssignment extends CanvasObject {

    transferrable() {
      return {
        "id": "id",
        "title": "name",
        "rawbody": "description"
      }
    }

    matchable() {
      return ["title", "rawbody"]
    }

    constructor(response, loader) {
      super(response, loader)
      this.assert_type("assignments")
      this.updatename = 'assignment'
    }

  }

  class CanvasCourse {

    constructor(loaders, id, name) {
      name = name || id
      this.subs = {}
      this.name = name // name doesn't have to be defined
      this.course = id // course id does have to be defined
      this.loaders = loaders
    }

    check(callback=r=>r) {
      const loader = this.loaders.pages
      const link = loader.to_url(["courses", this.course])
      loader.getlink(link, {}, callback)
    }

    getcontent(callback=r=>r) {

      // returns to corresponding
      // canvas object judging from response
      function fromresponse(response, loader) {

        const prototypes = (type, response, loader) => new ({
          'object': CanvasObject,
          'pages': CanvasPage,
          'quizzes': CanvasQuiz,
          'assignments': CanvasAssignment,
          'announcements': CanvasAnnouncement,
          'discussion_topics': CanvasDiscussion,
        }[type])(response, loader)


        const type = loader.type // object.page_type
        return prototypes(type, response, loader)
      }

      function main(self, callback) {

        const course = self.course
        const setval = loader => (r, e) => {
          if (e)
            callback(r, e)
          else {
            const object = fromresponse(r, loader)
            self.subs[object.id] = object
            callback(object)
          }
        }

        return Object
          .values(self.loaders)
          // .filter(load => load.type !== 'announcements')
          // .filter(load => load.type !== 'discussion_topics')
          // .filter(load => load.type !== 'pages')
          // .filter(load => load.type !== 'quizzes')
          // .filter(load => load.type !== 'assignments')
          .forEach(load => load.getcourse(course, {}, setval(load)))
      }

      return main(this, callback)
    }

    search(query, options, ashtml=false) {
      const result = []
      Object
        .values(this.subs)
        .map(s => s.search(query, options, ashtml, result))
      return result
    }

    // number of requests that are being waited on
    limbo() {
      return Object
        .values(this.loaders)
        .reduce((coll, val) => coll + val.wait.length, 0)
    }

  }

  class CourseList {

    constructor(key) {
      this.key = key
      this.courses = []
      this.loader = load.courses(key)
    }

    loadcourse(callback, metadata={}) {
      const courselist = this.courses
      const loaders = load.loaders(this.key)
      const call = (r, e) => {
        if (e) return callback(r, e)
        let course = new CanvasCourse(loaders, r.id, r.name)
        courselist.push(course)
        callback(course)
      }

      return this.loader.listcourse(call, metadata)
    }


    load(id) {
      const loaders = load.loaders(this.key)
      return new CanvasCourse(loaders, id, id)
    }


  }

  return key => new CourseList(key)
  /*
  objectcall = cvobj => {
    // if (!cvobj.title.toLowerCase().includes('a'))
    let matches = cvobj.search('goethe', 'i')
    // if (!matches.length) return
    // console.log(matches)
    cvobj.replace(matches, "goethe now")
    console.log(cvobj.altered())
    // cvobj.push()
  }

  callback = course => {
    if (course.course !== 1074403)
      return
    else
      course.search('a', 'i')
  }
  let cl = new CourseList(apikey)
  cl.loadcourse(callback)
  */
})()