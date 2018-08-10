
<div class="template flexible">

  <section v-if="replacing" class="replace-loader">
    <div
      class="loadbar center-align"
      style="width: 60%; height:10%; display: block; background: gray">
      <div
        class="loadsubbar" 
        style="height:100%; display: block; background: black"
        v-bind:style="{ 'width': load_progress * 100 + '%' }">
      </div>
    </div>
  </section>
  <section v-else style='display:none'></section>

  <section v-if="hidden" class="header">
    <div class="title vertical-align"
      style="transform: translateY(-40%)">
      {{ name }} 
    </div>
    <input
      type="text"
      class="vertical-align text-center"
      placeholder="course id"
      style="left: 67%; width: 10%;"
      v-model="course"
      v-if="loggedin"
      @keyup.enter="view.loadid()"/>
    <input
      type="text"
      class="vertical-align"
      placeholder="search..."
      style="left: 79%; width: 15%; padding-left:30px"
      v-model="query"
      v-if="loggedin"
      @keyup="view.search(query)"
      @keyup.enter="view.true_search(query, ashtml)">
    <input
      type="checkbox"
      class="vertical-align"
      style="left: 79.7%; transform: translateY(-50%);"
      v-model="ashtml"
      v-if="loggedin">
    <div
      id="limbo"
      class="title vertical-align"
      style="position: absolute; right: 0%; translateY(-50%);">
    </div>
  </section>

  <section v-else class="header">
    <div class="title vertical-align"> {{ name }} </div>
    <table
      class="vertical-align" 
      style="left: 52%; width: 25%; padding-left:30px;">
      <tr style="transform: translateY(10%)">
        <td 
          v-for="c in checks">
          <input
            type="checkbox"
            v-model="c.checked"
            v-if="loggedin"
            @change="view.match_filter()">
          {{ c.name }}
        </td>
      </tr>
    </table>
    <input
      type="text"
      class="vertical-align"
      placeholder="replace..."
      style="left: 79%; width: 15%; padding-left:30px"
      v-model="replace_query"
      v-if="loggedin"
      @keyup.enter="view.replace()">
    <input
      type="checkbox"
      class="vertical-align"
      style="left: 79.7%; transform: translateY(-50%);"
      v-model="ashtml"
      v-if="loggedin">
    <div
      class="title vertical-align close-replace pointer"
      style="position: absolute; right: 3%;"
      @click="hidden = true"
      @keydown.esc="hidden = true">
    </div>
    <div id="limbo" style="display: none;"></div>
  </section>


  <div class="keyinput" v-if="!loggedin">
    <form class="keyinput" @submit="$event.preventDefault(); view.init()">
      <input
        id="apikey"
        type="text"
        class="center-align text-center monospace"
        style="width: 60%; top: 40%;"
        placeholder="api key"
        v-model="apikey">
    </form>
  </div>

  <section class="subbody" v-else>
    <section class="left scroll p-5">
      <div v-html="description" class='small'></div>
    </section>

    <section v-if="hidden" class="right small scroll ph-3">
      <table class="course-items relative" style="width: 100%">
        <tr class="title-items">
          <td
            class="box pointer b-border title-instance text-center"
            style="width:15%"
            @click="view.sort('id')">
            id (link)
          </td><td
            class="box pointer b-border title-instance text-center"
            @click="view.sort('title')"
            style="width:60%">
            title
          </td><td
            class="box pointer b-border title-instance"
            style="width:25%"
            @click="view.sort('loadertype')">
            type
          </td>
        </tr>
        <tr
          v-for="item in items"
          @click="view.setbody(item)"
          class="course-items pointer">
          <td class="box small text-center">
            <a v-bind:href="item.pagelink" target="__blank">
              {{ item.id }}
            </a>
          </td>
          <td class="box small">
            {{ item.title }}
          </td>
          <td class="box small">
            {{ item.loader.type }}
          </td>
        </tr>
      </table>
    </section>

    <section v-else 
      class="right small scroll ph-3"
      style="background: #f6f6f6">
      <table class="course-items relative" style="width:100%">
        <tr class="title-items">
          <td 
            class="box b-border text-center"
            style="width:3%;">
          </td> 
          <td
            class="box pointer b-border title-instance text-center"
            @click="view.match_sort('id')"
            style="width:15%;">
            id (link)
          </td><td
            class="box pointer b-border text-center title-instance"
            style="width:57%;"
            @click="view.match_sort('text')">
            text
          </td><td
            class="box pointer b-border title-instance"
            style="width:25%;"
            @click="view.match_sort('type')">
            type
          </td>
        </tr>
        <tr
          v-for="match in matches"
          @click="view.setbody(match.object)"
          class="course-items pointer">
          <td class="box small text-center" style="width:3%;">
            <input type="checkbox" v-model="match.checked"></input>
          </td>
          <td class="box small text-center">
            <a v-bind:href="match.object.pagelink" target="__blank">
              {{ match.object.id }}
            </a>
          </td>
          <td class="box small text-center"
              style="font-family: 'mplus', monospace">
              {{ match.m.before }}<mark>{{ match.m.text }}</mark>{{ match.m.after }}
          </td>
          <td class="box small">
            {{ match.object.loader.type }}
          </td>
        </tr>
      </table>
    </section>
  </section>


</div>
