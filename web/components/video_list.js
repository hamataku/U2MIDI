Vue.component('video_list', {
  props: ['list', 'video_lists', 'title'],
  template:`
      <div class="m-4">
        <div class="px-3 py-2 mx-auto" style="width: fit-content">
          <h4 class="text-center m-0" style="width: fit-content"><span>{{ title }}</span></h4>
        </div> 
        <div class="row justify-content-center">
          <div v-for="n in list" class="card m-2" style="width: 18rem;">
            <img :src="video_lists[n][2]" class="card-img-top">
            <div class="card-body">
              <h5 class="card-title"> {{ video_lists[n][0] }}</h5>
              <a :href="'practice/' + n + '.html'" class="btn btn-primary btn-sm">練習モード</a>
              <a :href="'scoring/' + n + '.html'" class="btn btn-success btn-sm">採点モード</a>
            </div>
          </div>
        </div>
      </div>
      `
  
})
