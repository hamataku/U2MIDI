//Videoの実験
Vue.use(window["vue-js-toggle-button"].default);

let opencvReady = false;

new Vue({
  el: "#app",
  data: {
    video_object: null,
    video_analysis: null,
    ABisActive: false,
    video_length: null,
    Atime: null,
    Btime: null,
    midiOutputIsReady: false,
    outputDevice: null,
    midiObserverId: null,
    key_list: [],
    key_default_color: [],
    key_note_state: [],
    octave: 4,
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
    setSrc(e) {
      let file = e.target.files[0];
      let fileURL = URL.createObjectURL(file);
      let fileType = file.type;
      this.video_object.src({ type: fileType, src: fileURL });
      this.video_object.load();
      this.video_object.on("loadeddata", () => {
        this.video_length = this.video_object.duration();
      });
      this.Atime = null;
      this.Btime = null;

      this.video_analysis = document.createElement('video');
      this.video_analysis.src = fileURL;
      this.video_analysis.width = 1280;
      this.video_analysis.height = 720;
      this.video_analysis.load();
      this.video_analysis.play(); // chromeで動画を読み込んだ後にplayしないとvideocaptureが真っ暗になる。謎
      this.video_analysis.addEventListener('canplaythrough', this.getKeyPosition);
    },
    getKeyPosition() {
      this.video_analysis.removeEventListener('canplaythrough', this.getKeyPosition);
      let width = this.video_analysis.width;
      let height = this.video_analysis.height;
      let src = new cv.Mat(height, width, cv.CV_8UC4);
      let mono = new cv.Mat(height, width, cv.CV_8UC1);

      this.video_analysis.pause(); // ここでplayした動画を停止している
      let cap = new cv.VideoCapture(this.video_analysis);
      cap.read(src);
      cv.cvtColor(src, mono, cv.COLOR_RGBA2GRAY);
      let start_row = src.rows/3*2;
      let rect = new cv.Rect(0, start_row, src.cols, src.rows - start_row);
      let dst = mono.roi(rect);
      let color_dst = src.roi(rect);
      
      cv.threshold(dst, dst, 100, 255, cv.THRESH_BINARY);
      cv.Canny(dst, dst, 100, 200, 3);

      cv.imshow('canvasOutput1', dst);

      let lines = new cv.Mat();
      cv.HoughLinesP(dst, lines, 2, Math.PI, 130, 30, 2);

      // sort position of lines
      let pos_list = [];
      for (let i = 0; i < lines.rows; ++i)
      {
        pos_list.push([lines.data32S[i * 4], lines.data32S[i * 4 + 1]]);
      }
      pos_list.sort(function (a, b) { return (a[0] - b[0]); });

      // thin out the lines
      for (let i = 0; i < pos_list.length - 1; ++i)
      {
        if (Math.abs(pos_list[i][0] - pos_list[i + 1][0]) < 5) {
          pos_list[i + 1][0] = (pos_list[i][0] + pos_list[i + 1][0]) / 2;
          pos_list[i + 1][1] = Math.max(pos_list[i][1], pos_list[i + 1][1]);
          pos_list.splice(i, 1);
        }
      }

      // detect first long line between B and C
      let threshold = dst.rows - 40;
      let standard = 0;
      for (let i = 0; i < pos_list.length - 13; ++i)
      {
        if (pos_list[i][1] > threshold && pos_list[i + 5][1] > threshold && pos_list[i + 12][1] > threshold) {
          standard = i % 12 + 1 - 3 * 12;
          console.log("standard: ", standard);
          break;
        }
      }

      // make key_list
      for (let i = 0; i < pos_list.length + 1; ++i)
      {
        if (i == 0) {
          this.key_list.push([Math.floor(pos_list[i][0] / 2), i - standard]);
        } else if (i == pos_list.length) {
          this.key_list.push([Math.floor((pos_list[i - 1][0] + dst.cols) / 2), i - standard]);
        } else {
          this.key_list.push([Math.floor((pos_list[i][0] + pos_list[i - 1][0]) / 2), i - standard]);
        }
      }

      // get key_default_color
      for (let i = 0; i < this.key_list.length; ++i)
      {
        let rem = this.key_list[i][1] % 12;
        if (rem == 0 || rem == 2 || rem == 4 || rem == 5 || rem == 7 || rem == 9 || rem == 11) {
          this.key_default_color.push(255); // 白鍵
        } else {
          this.key_default_color.push(0); // 黒鍵
        }
      }

      console.log(this.key_list);

      let color = new cv.Scalar(0, 255, 0, 255);
      for (let i = 0; i < pos_list.length; ++i)
      {
        let startPoint = new cv.Point(pos_list[i][0], 0);
        let endPoint = new cv.Point(pos_list[i][0], pos_list[i][1]);
        cv.line(color_dst, startPoint, endPoint, color);
      }
      cv.imshow('canvasOutput2', color_dst);
      
      src.delete();
      mono.delete();
      dst.delete();
      color_dst.delete();
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
    clearAll() {
      for (let i = 0; i < 128; ++i) {
        this.uplightSend(i, false);
      }
    },
    restart() {
      this.video_object.currentTime(0);
    },
    uplightSend(note, state)
    {
      if (note < 0 || note > 127) {
        return;
      }
      if (this.midiOutputIsReady) {
        if(state){
          this.outputDevice.send([0x90, note, 127]);
        } else {
          this.outputDevice.send([0x80, note, 0]);
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
        if(this_.video_object.paused() || this_.video_object.seeking()){
        } else {
          let now = this_.video_object.currentTime();

          ctx.drawImage(video_body, 0, 0);
          for (let i = 0; i < this_.key_list.length; ++i) {
            var imageData = ctx.getImageData(this_.key_list[i][0], 630, 1, 1);
            let color = Math.floor((imageData.data[0] + imageData.data[1] + imageData.data[2]) / 3);
            if (Math.abs(color - this_.key_default_color[i]) > 30) {
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
        }
        requestAnimationFrame(loop);
      }());
    },
    midiObserver() {
      navigator.requestMIDIAccess().then(
      (midiAccess) => {
        //成功
        try {
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
    }
  },
  watch: {
    Atime: {
      immediate: true,
      handler: function () {
        $(".marker-a").css("left", this.Apos);
      },
    },
    Btime: {
      immediate: true,
      handler: function () {
        $(".marker-b").css("left", this.Bpos);
      },
    },
  },
  mounted() {
    this.video_object = videojs("my-player", {
      playbackRates: [0.2, 0.5, 1, 1.5, 2]
    });
    this.video_object.ready(() => {
      let p = jQuery(
        this.video_object.controlBar.progressControl.children_[0].el_
      );
      let marker_a = jQuery('<div class="vjs-marker marker-a"></div>');
      let marker_b = jQuery('<div class="vjs-marker marker-b"></div>');
      p.append(marker_a);
      p.append(marker_b);

      this.startLoop();      
    });

    this.midiObserverId = setInterval(this.midiObserver, 3000);
  },
});

//OpenCV.jsの実験
function onOpenCvReady() {
  opencvReady = true;
  document.getElementById('status').innerHTML = 'OpenCV.js is ready.';
}
