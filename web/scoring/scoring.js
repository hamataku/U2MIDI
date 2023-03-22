//Videoの実験 //test
Vue.use(window["vue-js-toggle-button"].default);

new Vue({
  el: "#app",
  data: {
    video_object: null,
    video_analysis: null,
    video_src_is_set: false,
    ABisActive: false,
    practiceIsActive: false,
    video_length: null,
    playbackRate: 1, //再生速度
    video_show: false,
    Atime: null,
    Btime: null,

    midiOutputIsReady: false,
    outputDevice: null,
    inputDevices: [],
    inputDevice: null,
    midiObserverId: null,
    practiceNote: Array.from({ length: 128 }, () => false),

    key_list: [],
    key_info: [],
    key_note_state: [],
    octave: 4,
    video_lists: [
      ["きらきら星", "videos/beginner/kirakira_boshi.mp4", "videos/beginner/kirakira_boshi.png"],
      ["さんぽ", "videos/beginner/sanpo.mp4", "videos/beginner/sanpo.png"],
      ["かえるのうた", "videos/intermediate/kaeru_no_uta.mp4", "videos/intermediate/kaeru_no_uta.png"],
      ["となりのトトロ", "videos/intermediate/tonari_no_totoro.mp4", "videos/intermediate/tonari_no_totoro.png"],
      ["ビリーブ", "videos/advanced/believe.mp4", "videos/advanced/believe.png"],
      ["夢をかなえてドラえもん", "videos/advanced/yumewo_kanaete_doraemon.mp4", "videos/advanced/yumewo_kanaete_doraemon.png"],
    ],
  },
  computed: {
    Apos: function () {
      return (this.Atime / this.video_length) * 100 + "%";
    },
    Bpos: function () {
      return (this.Btime / this.video_length) * 100 + "%";
    },
  },
  methods: {
    check(text){
      console.log(text);
    },
    monitorClick() {
      if (!this.video_src_is_set) {
        this.$refs.input.click();
      }
    },
    sampleClick() {
      this.setSrc("./sample.mp4");
    },
    setSrc(file) {
      this.video_src_is_set = true;
      this.video_object.on("loadeddata", () => {
        this.video_length = this.video_object.duration();
      });
      this.Atime = null;
      this.Btime = null;
    },
    setA() {
      let now = this.video_object.currentTime();
      if (this.Btime && this.Btime <= now) {
        return;
      }
      this.Atime = now;
    },
    setB() {
      let now = this.video_object.currentTime();
      if (this.Atime && now <= this.Atime) {
        return;
      }
      this.Btime = now;
    },
    octaveUp() {
      this.octave += 1;
      if (this.octave > 9) {
        this.octave = 9;
      }
      this.clearAll();
    },
    octaveDown() {
      this.octave -= 1;
      if (this.octave < 0) {
        this.octave = 0;
      }
      this.clearAll();
    },
    slower(){
      this.setSpeed(this.playbackRate-0.05);
    },
    faster(){
      this.setSpeed(this.playbackRate+0.05);
    },
    setSpeed(playbackRate){
      if(0 < playbackRate && playbackRate < 5){
        this.playbackRate = playbackRate;
      }
    },
    clearAll() {
      for (let i = 0; i < 128; ++i) {
        this.uplightSend(i, false);
      }
    },
    restart() {
      this.video_object.currentTime(0);
    },
    toend(){
      this.video_object.currentTime(this.video_length);
    },
    uplightSend(note, state) {
      if (note < 0 || note > 127) {
        return;
      }
      if (state) {
        if (this.midiOutputIsReady) {
          this.outputDevice.send([0x90, note, 127]);
        }
        this.practiceNote[note + this.octave * 12] = true;
      } else {
        if (this.midiOutputIsReady) {
          this.outputDevice.send([0x80, note, 0]);
        }
      }
    },
    practiceButton() {
      this.video_object.playbackRate(this.playbackRate);
      this.practiceNote = Array.from({ length: 128 }, () => false);
      this.clearAll();
    },
    practiceCheck() {
      //練習モード
      if (this.practiceIsActive) {
        var isAllOff = true;
        for (let i = 0; i < 128; ++i) {
          if (this.practiceNote[i]) {
            isAllOff = false;
            break;
          }
        }
        if (isAllOff) {
          this.video_object.playbackRate(this.playbackRate);
        } else {
          this.video_object.playbackRate(0);
        }
      }
    },
    startLoop(){
      let this_ = this;
      let video_body = document.getElementById("my-player_html5_api");
      let canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      var ctx = canvas.getContext('2d',{willReadFrequently: true});
      (function loop(){
        //再生中じゃなければ何もしない
        if (this_.video_object.paused() || this_.video_object.seeking()) {
          // this_.practiceCheck();
        } else {
          let now = this_.video_object.currentTime();

          ctx.drawImage(video_body, 0, 0);
          for (let i = 0; i < this_.key_list.length; ++i) {
            var imageData = ctx.getImageData(this_.key_list[i][0], 630, 1, 1);
            let color = Math.floor((imageData.data[0] + imageData.data[1] + imageData.data[2]) / 3);
            if (Math.abs(color - this_.key_info[i][0]) > 50) {
              if (!this_.key_note_state[i]){
                this_.key_note_state[i] = true;
                this_.uplightSend(this_.key_list[i][1] - this_.octave * 12, true);
                console.log("Note on:  ", this_.key_list[i][1]);
              }
            } else {
              if (this_.key_note_state[i]){
                this_.key_note_state[i] = false;
                this_.uplightSend(this_.key_list[i][1] - this_.octave * 12, false);
                console.log("Note off: ", this_.key_list[i][1]);
              }
            }
          }

          //AB再生の処理
          if (
            this_.Atime &&
            this_.Btime &&
            this_.ABisActive &&
            !this_.video_object.paused() &&
            now > this_.Btime
          ) {
            this_.video_object.currentTime(this_.Atime);
          }
          this_.practiceCheck();
        }
        requestAnimationFrame(loop);
      }());
    },
    midiObserver() {
      navigator.requestMIDIAccess().then(
      (midiAccess) => {
        //成功
        try {
          if (this.inputDevices.length == 0) {
            var inputIterator = midiAccess.inputs.values();
            for (var i = inputIterator.next(); !i.done; i = inputIterator.next()) {
              if (!i.value.name.match(/Uplight/)) {
                this.inputDevices.push(i.value);
                return;
              }
            }
          }
          var outputIterator = midiAccess.outputs.values();
          for (var o = outputIterator.next(); !o.done; o = outputIterator.next()) {
            if (o.value.name.match(/Uplight/)) {
              this.outputDevice = o.value;
              console.log(this.outputDevice.name);
              this.midiOutputIsReady = true;
              this.clearAll();
              clearInterval(this.midiObserverId);
              return;
            }
          } 
          console.log("cannot find Uplight");
        } catch (e) {
          console.log("cannot find MIDI device");
        }
      },
      (msg) => {
        //失敗
        console.log("Failed to get MIDI access - " + msg);
      });
    },
    setInputDevice(input) {
      this.practiceNote = Array.from({ length: 128 }, () => false);
      if (input.target.value == -1) {
        this.inputDevice.onmidimessage = (event) => {
        };
        this.inputDevice = null;
        return;
      }
      this.inputDevice = this.inputDevices[input.target.value];
      console.log(this.inputDevice.name + " is selected");
      this.inputDevice.onmidimessage = (event) => {
        if (event.data[0] == 0x90) {
          if (event.data[2] == 0) {
            console.log("Input Note off: ", event.data[1]);
          } else {
            console.log("Input Note on:  ", event.data[1]);
            this.practiceNote[event.data[1]] = false;
          }
        } else if (event.data[0] == 0x80) {
          console.log("Input Note off: ", event.data[1]);
        }
      };
    }
  },
  watch: {
    Atime: {
      immediate: true,
      handler: function () {
        if (this.video_src_is_set) {
          document.querySelectorAll('.marker-a')[0].style.left = this.Apos;
        }
      },
    },
    Btime: {
      immediate: true,
      handler: function () {
        if (this.video_src_is_set) {
          document.querySelectorAll('.marker-b')[0].style.left = this.Bpos;
        }
      },
    },
    playbackRate: {
      handler: function() {
        this.video_object.playbackRate(this.playbackRate);
      }
    }
  },
  mounted() {
    this.video_object = videojs("my-player");
    this.video_object.ready(() => {
      let p = document.querySelectorAll('.vjs-progress-holder')[0];
      let marker_a = document.createElement('div');
      marker_a.className = 'vjs-marker marker-a';
      let marker_b = document.createElement('div');
      marker_b.className = 'vjs-marker marker-b';
      p.appendChild(marker_a);
      p.appendChild(marker_b);

      this.startLoop();      
    });

    this.midiObserverId = setInterval(this.midiObserver, 3000);
  },
});