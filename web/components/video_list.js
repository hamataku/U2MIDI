Vue.component('video_list', {
  props: ['list', 'video_lists', 'title'],
  template:`
      <div>
        <h2>{{ title }}</h2>
        <div class="row">
          <div v-for="n in list" class="col-sm-6">
            <div class="card" style="width: 18rem;">
              <img :src="video_lists[n][2]" class="card-img-top">
              <div class="card-body">
                <h5 class="card-title"> {{ video_lists[n][0] }}</h5>
                <a :href="'practice/' + n + '.html'" class="btn btn-primary btn-sm">練習モード</a>
                <a :href="'scoring/' + n + '.html'" class="btn btn-primary btn-sm">採点モード</a>
              </div>
            </div>
          </div>
        </div>
      </div>
      `
  
})
