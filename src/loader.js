const util = require("./util.js")
const popsicle = require("popsicle")

const load = module.exports = (() => {

  const endpoint = "https://canvas.brown.edu/api/v1/"
  const baselink = "https://canvas.brown.edu/"
  const local = "https://canvas.brown.edu/api/v1/"

  class Loader {

    constructor(key) {
      this.wait = new util.MultiSet()
      this.type = "generic"
      this.token = key
      this.param = {} // { "per_page": 1000 }
      this.head = {
        "Authorization": `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }

    to_url(arglist) {
      const section = arglist.join("/")
      return `${local}${section}`
    }

    // load a given link, replacing the base with the local
    // and adding predefined headers
    loadxhr(method, link, {data, param, head}, callback) {
      // these two lines keep track of the number of objects
      // that are still being waited on
      const body = data
      const params  = Object.assign({}, this.param, param)
      const headers = Object.assign({}, this.head, head)
      const preurl = link.includes(endpoint)
        ? link.replace(endpoint, local)
        : link.replace(baselink, local)
      const url = util.addparams(preurl, params)
      this.wait.add(url)
      const call = (r, e) => {
        if (r.status === 200)
          this.wait.remove(url),
          callback(r, e)
        else
          console.log("Error", r),
          callback(r, r)
      }
      const options = { method, url, body, headers }
      let promise = () => popsicle
        .request(options)
        .then(call)
        .catch(r => {
          console.log("error", r)
          console.log("retrying")
          promise()
        })

      return promise()
    }

    putcontent(link, metadata, callback = r=>r) {
      return this.loadxhr('PUT', link, metadata, callback)
    }

    deletecontent(link, metadata, callback = r=>r) {
      return this.loadxhr('DELETE', link, metadata, callback)
    }

    loadlink(method, link, metadata, callback) {
      const call = (r, e) => e
        ? callback(r, e)
        : callback(JSON.parse(r.body), e)
      return this.loadxhr(method, link, metadata, call)
    }

    loadall(method, link, metadata, callback) {
      const self = this
      const recursive_call = (r, e) => {
        const resp = JSON.parse(r.body)
        if (e || resp.errors)
          return callback(resp, e)
        resp.forEach(r => callback(r))
        const next = util.getnext(r)
        if (next)
          self.loadxhr(method, next, metadata, recursive_call)
      }

      return self.loadxhr(method, link, metadata, recursive_call)
    }

    putlink(link, metadata, callback) {
      return this.loadlink('PUT', link, metadata, callback)
    }

    getlink(link, metadata, callback) {
      return this.loadlink('GET', link, metadata, callback)
    }

    // get and reget following the next link
    getall(link, metadata, callback) {
      return this.loadall('GET', link, metadata, callback)
    }

    getcourse(course, metadata, callback) {
      if (this.type === "generic")
        throw "unspecified class for loader"
      const link = this.to_url(["courses", course, this.type])
      return this.getall(link, metadata, callback)
    }
  }


  class QuizLoader extends Loader {

    constructor(key) {
      super(key)
      this.type = "quizzes"
    }
  }

  class AssignmentLoader extends Loader {

    constructor(key) {
      super(key)
      this.type = "assignments"
    }
  }


  class DiscussionLoader extends Loader {

    constructor(key) {
      super(key)
      this.type = "discussion_topics"
    }
  }


  class AnnouncementLoader extends Loader {

    getcourse(course, {headers, param, data}, callback) {
      const course_str = `course_${course}`
      const link = this.to_url(["courses", course, "discussion_topics"])
      param = Object.assign({'only_announcements': true}, param)
      return this.getall(link, {headers, param, data}, callback)
    }

    constructor(key) {
      super(key)
      this.type = "announcements"
    }
  }

  class PageLoader extends Loader {

    constructor(key) {
      super(key)
      this.type = "pages"
    }

    getcourse(course, metadata, callback) {
      const self = this
      return super.getcourse(course, {}, (response, error) => {
        if (error)
          callback(response, error)
        self.getlink(response.html_url, metadata, callback)
      })
    }
  }

  class CourseLoader extends Loader {

    constructor(key) {
      super(key)
      this.type = "courses"
    }

    getcourse(course, metadata, callback) {
      // ironic
      throw "not supported"
    }

    listcourse(callback, metadata) {
      const link = this.to_url(["courses"])
      return this.getlink(link, metadata, (r, e) => 
        e ? callback(undefined, e) : r.forEach(r => callback(r)))
    }
  }

  // course loader not included cuz
  // well, its kind of different
  const courses = key => new CourseLoader(key)
  const loaders = key => ({
    'pages': new PageLoader(key),
    'quizzes': new QuizLoader(key),
    'assignments': new AssignmentLoader(key),
    'announcements': new AnnouncementLoader(key),
    'discussion_topics': new DiscussionLoader(key)
  })

  return { courses, loaders }

})()