import Vue from 'vue'
const util = require('./util.js')
const canvas = require('./canvas.js')

const apikey = ""

class View {

  constructor() {
    const template = require('../tmpl/index.vue')
    const data = {
      loggedin: false,
      apikey: apikey,
      name: "Canvas Searcher",

      course: "",
      query: "",
      ashtml: true,

      items: [],
      matches: [],
      description: `<h3> Add a course code and select an item </h3>`,

      view: this,
      hidden : true,
      checks : [
        { name : 'ann', checked: true, full: 'announcements' },
        { name : 'asg', checked: true, full: 'assignments' },
        { name : 'dsc', checked: true, full: 'discussion_topics' },
        { name : 'pag', checked: true, full: 'pages' },
        { name : 'qzz', checked: true, full: 'quizzes' }
      ],

      replace_query: "",
      replacing: false,
      load_progress: 0,
    }




    this.vue = new Vue({ el: '#main', data, template })
    this.courselist = undefined
    this.key = undefined
    this.course = undefined
    this.course_info = undefined
    this.items = []
    setInterval(() => this.course
      ? document.getElementById('limbo').innerHTML = this.course.limbo()
      : document.getElementById('limbo').innerHTML = 0, 100)


    document.onkeydown = e => {
      e = e || window.event;
      const esc = "key" in e
        ? e.key == "Escape" || e.key == "Esc"
        : e.keyCode == 27
      if (esc)
        event.preventDefault(),
        data.hidden = true
    }
  }


  init() {
    const key = this.vue.apikey
    const cl = this.courselist = canvas(key)
    const call = (r, e) => {
      if (e)
        // for sanity check
        this.vue.loggedin = false,
        window.alert(`Error: ${e.statusText}`)
      else
        this.key = key,
        this.vue.loggedin = true
    }
    console.log(cl)
    return cl.loadcourse(call)

  }

  load(id, call=r=>r) {
    if (!this.vue.loggedin)
      throw "attempted to load course without logging in "
    const course = this.course = this.courselist.load(id)
    const currhash = this.currhash = Math.random()

    course.check((r, e) => {
      if (e)
        return window.alert(`Error - ${e.statusText}`)
      this.items = []
      this.vue.items = [],
      this.course_info = r,
      this.vue.name = r.name,
      this.course.getcontent((r, e) => {
        if (currhash != this.currhash)
          return
        else if (e)
          console.log(`Error: ${e.statusText}`)
        else {
          this.items.push(r)
          const query = this.vue.query
          if ( r.rawbody.toLowerCase().includes(query)
            || r.title.toLowerCase().includes(query) )
            this.vue.items.push(r)
        }
      })
    })
  }

  loadid() {
    const call = (r, e) => e
      ? window.alert(`Error: ${e.statusText}`)
      :(this.items.push(r), 
        this.update())
    this.load(this.vue.course, call)
  }

  sort(key) {
    
    if (this.sortkey == key)
      this.ascending = !this.ascending
    else
      this.sortkey = key,
      this.ascending = true
    const comp = this.ascending
        ? (a, b) => (a[key] > b[key]) - (a[key] < b[key])
        : (a, b) => (a[key] < b[key]) - (a[key] > b[key])
    this.items.sort(comp)
    this.search(this.vue.query)
  }

  search(query) {

    const data = []
    query = query.toLowerCase()
    this.vue.items = this.items
      .filter(i => i.rawbody.toLowerCase().includes(query)
                || i.title.toLowerCase().includes(query))
  }

  true_search(query, ashtml) {
    if (!query)
      return this.vue.items = this.items.slice()
    const data = this.course.search(query, "i", ashtml)
    for (const m of data)
      m.checked = true
    this.matches = data.slice(0)
    this.vue.matches = data
    this.vue.hidden = false
    this.vue.replace_query = ""
    console.log(data)
    for (const item of this.vue.checks)
      item.checked = true
  }


  setbody(item) {
    const body = item.rawbody
    const title = item.title
    this.vue.description = `<h2>${title}</h2><br>${body}`
  }

  replace() {
    const query = this.vue.query
    const replace_query = this.vue.replace_query
    const matches = this.match_filter()
      .filter(m => m.checked)
    if (!matches) return
    const message = `replace ${matches.length} instance(s) of `
                  + ` "${query}" with "${replace_query}"?`
    if (!window.confirm(message))
      return
    this.vue.replacing = true
    const searchers = {}
    matches.forEach(r => searchers[r.object.id]
        ? searchers[r.object.id].push(r)
        : searchers[r.object.id] = [r])

    Object
      .values(searchers)
      .forEach(s =>
        s[0].object.replace(s, replace_query))

    const items = Object
      .values(searchers)
      .map(s => s[0].object)

    let counter = 0
    for (const s of items)
      s.push((r, e) => {
        this.vue.load_progress = (++counter) / items.length
        if (e)
          window.alert("Failed to send a resource, check console for returned response"),
          console.log("error", e)
        s.fromnewresponse(JSON.parse(r.body))
        if (counter === items.length) {
          this.vue.replacing = false
          this.vue.hidden = true
          this.vue.query = ""
          this.vue.items = this.items.slice()
          this.vue.load_progress = 0.0
        }
      })

  }

  match_filter() {
    const include = this.vue.checks
      .filter(i => i.checked)
      .map(i => i.full)
    return this.vue.matches = this.matches
      .filter(m => include.includes(m.type))
  }

  match_sort(key) {
    if (this.match_sortkey == key)
      this.match_ascending = !this.match_ascending
    else
      this.match_sortkey = key,
      this.match_ascending = true
    const comp = this.match_ascending
        ? (a, b) => (a[key] > b[key]) - (a[key] < b[key])
        : (a, b) => (a[key] < b[key]) - (a[key] > b[key])
    this.matches.sort(comp)
    this.match_filter()
  }
}


const view = window.view = new View()
// view.init()
// setTimeout(() => view.loadid(), 1000)
// const d = canvas(key)