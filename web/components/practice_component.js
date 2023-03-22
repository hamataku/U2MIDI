Vue.component('practice_component', {
  props: ['data'],
  template:`
      <div class="container">
        <div id="monitorscreen">
            <video
                id="my-player"
                class="video-js vjs-fluid"
                controls
                preload="auto"
                playbackRates="[0.2, 0.5, 1, 1.5, 2]"
            >
            <source :src="'../' + data[1]" type="video/mp4"/>
            </video>
        </div>
      </div>
      `
})
