Vue.use(window["vue-js-toggle-button"].default);

Vue.component('scoring_component', {
  props: ['data'],
  data: function () {
    return {
      video_object: null,
      video_analysis: null,
      video_src_is_set: false,
      video_length: null,
      
      video_show: false,

      midiOutputIsReady: false,
      outputDevice: null,
      inputDevices: [],
      inputDevice: null,
      midiObserverId: null,

      key_list: [],
      key_default_color: [],
      key_note_state: [],
      key_score_state: Array.from({ length: 128 }, () => false),
      key_top: null,
      light: 0,
      octave: 0,
      key_note_count: 0,
      key_correct_count: 0,
      score: 0,
      good: false,
      miss: false,

      song_finished: false,
    }
  },
  template:`
      <div>
        <div id="scoring_component" class="container">
          <div id="monitor">
            <div id="monitorscreen">
                <video
                id="my-player"
                class="video-js vjs-fluid"
                preload="auto"
                playbackRates="[0.2, 0.5, 1, 1.5, 2]"
                >
                  <source :src="'../' + data[1]" type="video/mp4"/>
                </video>
            </div>
          </div>
          <div class="text-center" style="height: 60px;" v-show="!song_finished">
            <p v-show="good" class="good">Good!</p>
            <p v-show="miss" class="miss">miss...</p>
          </div>
          <div v-show="song_finished" class="text-center">
            <p><span class="score">{{ score }}</span>点</p>
            <p class="score_info">{{ key_correct_count }} / {{ key_note_count }}</p>
            <a href="../index.html"><button type="button" class="btn btn-primary">メニューに戻る</button></a>
            <button type="button" class="btn btn-secondary" @click="retry">　　もう一度　　</button>
          </div>
          <table class="table table-borderless" v-show="!song_finished">
            <tbody>
              <tr>
                <th scope="row">光る位置の調整</th>
                <td>
                  <button @click="lightDown" class="btn btn-outline-secondary btn-sm px-2">ー</button>
                  <span class="font-weight-normal px-2">{{light}}</span>
                  <button @click="lightUp" class="btn btn-outline-secondary btn-sm px-2">＋</button>
                </td>
              </tr>
              <tr>
              <th scope="row">鍵盤のオクターブ調整</th>
                <td>
                  <button @click="octaveDown" class="btn btn-outline-secondary btn-sm px-2">ー</button>
                  <span class="font-weight-normal px-2">{{octave}}</span>
                  <button @click="octaveUp" class="btn btn-outline-secondary btn-sm px-2">＋</button>
                </td>
              </tr>
              <tr>
                <th scope="row">キーボード</th>
                <td>
                  <select class="form-select" aria-label="MIDIキーボードを選択" @change="setInputDevice">
                    <option selected :value="-1">MIDIキーボードを選択</option>
                    <option v-for="(input, index) in inputDevices" :value="index">
                      {{input.name}}
                    </option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="d-grid gap-2 d-md-block">
            <button v-show="!song_finished" class="btn btn-primary" type="button" @click="startSong()">開始</button>
          </div>

          <div class="accordion accordion-flush" id="accordionFlushExample" v-show="!song_finished">
            <div class="accordion-item">
              <h2 class="accordion-header" id="flush-headingOne">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseOne" aria-expanded="false" aria-controls="flush-collapseOne">
                  キーボード認識結果
                </button>
              </h2>
              <div id="flush-collapseOne" class="accordion-collapse collapse" aria-labelledby="flush-headingOne" data-bs-parent="#accordionFlushExample">
                <div class="accordion-body">
                  <canvas class="keyboard-output" id="canvasOutput1"></canvas>
                  <canvas class="keyboard-output" id="canvasOutput2"></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`
  ,
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
    lightUp() {
      this.light += 1;
      if (this.light > 5) {
        this.light = 9;
      }
      this.clearAll();
    },
    lightDown() {
      this.light -= 1;
      if (this.light < -5) {
        this.light = -5;
      }
      this.clearAll();
    },
    octaveUp() {
      this.octave += 1;
      if (this.octave > 5) {
        this.octave = 9;
      }
    },
    octaveDown() {
      this.octave -= 1;
      if (this.octave < -5) {
        this.octave = -5;
      }
    },
    setSrc(filename) {
      this.video_object.src({ type: "video/mp4", src: filename });
      this.video_object.load();
      this.video_src_is_set = true;
      this.video_object.on("loadeddata", () => {
        this.video_length = this.video_object.duration();
      });
      this.video_object.on("ended", () => {
        this.song_finished = true;
      })
      this.Atime = null;
      this.Btime = null;

      this.video_analysis = document.createElement('video');
      this.video_analysis.src = filename;
      this.video_analysis.width = 1280;
      this.video_analysis.height = 720;
      this.video_analysis.load();
      this.video_analysis.play(); // chromeで動画を読み込んだ後にplayしないとvideocaptureが真っ暗になる。謎
      this.video_analysis.addEventListener('canplaythrough', this.getKeyPosition);
      this.video_object.on("loadeddata", () => {
        this.video_length = this.video_object.duration();
      });
    },
    getKeyPosition() {
      this.video_analysis.removeEventListener('canplaythrough', this.getKeyPosition);
      let width = this.video_analysis.width;
      let height = this.video_analysis.height;
      let src = new cv.Mat(height, width, cv.CV_8UC4);
      let mono = new cv.Mat(height, width, cv.CV_8UC1);

      this.video_analysis.pause();
      let cap = new cv.VideoCapture(this.video_analysis);
      cap.read(src);
      cv.cvtColor(src, mono, cv.COLOR_RGBA2GRAY);
      // binarize, canny, and houghlinesP
      cv.threshold(mono, mono, 200, 255, cv.THRESH_BINARY);
      cv.Canny(mono, mono, 0, 0, 3);
      let h_lines = new cv.Mat();
      cv.HoughLinesP(mono, h_lines, 1, Math.PI/180, 100, 1000, 100);

      // get the top and the bottom lines of the keyboard
      let minY = 1000;
      let maxY = 0;
      let min_index = 0;
      let max_index = 0;
      for (let i = 0; i < h_lines.rows; ++i) {
         // piano keyboard region is basically at the bottom half of the image, so "> mono.rows/2"
        if (h_lines.data32S[i*4 + 1] < minY && h_lines.data32S[i*4 + 1] > mono.rows/3) {
          minY = h_lines.data32S[i*4 + 1];
          min_index = i;
        }
        if (h_lines.data32S[i*4 + 1] > maxY && h_lines.data32S[i*4 + 1] > mono.rows/3) {
          maxY = h_lines.data32S[i*4 + 1];
          max_index = i;
        }
      }

      this.key_top = minY;
      console.log(minY);

      // cut out the keyboard region
      let rect = new cv.Rect(
        0,
        h_lines.data32S[min_index * 4 + 1],
        width,
        (h_lines.data32S[max_index * 4 + 1] - h_lines.data32S[min_index * 4 + 1]) * 7 / 9
      ); //(x, y, width, height), multiply by 7/9 to avoid katakana.
      
      let dst = mono.roi(rect);
      let color_dst = src.roi(rect);

      // dilate the image to fix dotted lines
      let M = cv.Mat.ones(3, 3, cv.CV_8U);
      let anchor = new cv.Point(-1, -1);
      cv.dilate(dst, dst, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
      cv.imshow('canvasOutput1', dst);

      // detect vertical lines of the keyboard using HoughLinesP
      let lines = new cv.Mat();
      cv.HoughLinesP(dst, lines, 1, Math.PI, 100, dst.rows/3*2);

      // sort position of lines
      let pos_list = [];
      for (let i = 0; i < lines.rows; ++i) // (x1, y1, x2, y2) for each line
      {
        // only extract "x1" and "y1"
        pos_list.push([lines.data32S[i * 4], lines.data32S[i * 4 + 1]]);
      }
      pos_list.sort(function (a, b) { return (a[0] - b[0]); });

      // thin out the lines
      for (let i = 0; i < pos_list.length - 1; ++i)
      {
        if (Math.abs(pos_list[i][0] - pos_list[i + 1][0]) < 8) {
          pos_list[i + 1][0] = (pos_list[i][0] + pos_list[i + 1][0]) / 2;
          pos_list[i + 1][1] = Math.max(pos_list[i][1], pos_list[i + 1][1]);
          pos_list.splice(i, 1); // remove index i value
          i -= 1;
        }
      }

      // 何らかの原因で飛ばされてしまった直線を補完する
      for (let i = 0; i < pos_list.length - 1; ++i) {
        if (pos_list[i + 1][0] - pos_list[i][0] > (dst.cols / pos_list.length + 10)) {
          pos_list.splice(i + 1, 0, [(pos_list[i][0] + pos_list[i + 1][0]) / 2, (pos_list[i][1] + pos_list[i + 1][1]) / 2]);
        }
      }

      // detect first long line between B and C
      let threshold = dst.rows - 10;
      let standard = 0;
      for (let i = 0; i < pos_list.length - 13; ++i)
      {
        if (pos_list[i][1] > threshold && pos_list[i + 5][1] > threshold && pos_list[i + 12][1] > threshold) {
          standard = i % 12 + 1 - 1 * 12;
          console.log("standard: ", standard);
          break;
        }
      }

      // make key_list format:(key's center x coordinate, key number)
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

      // show the detected lines on the original image
      let color = new cv.Scalar(0, 255, 0, 255);
      for (let i = 0; i < pos_list.length; ++i)
      {
        let startPoint = new cv.Point(pos_list[i][0], 0);
        let endPoint = new cv.Point(pos_list[i][0], pos_list[i][1]);
        cv.line(color_dst, startPoint, endPoint, color, 4);
      }
      cv.imshow('canvasOutput2', color_dst);
      
      M.delete();
      src.delete();
      mono.delete();
      dst.delete();
      color_dst.delete();
      this.video_show = true;
    },
    retry() {
      this.song_finished = false;
      this.key_score_state = Array.from({ length: 128 }, () => false);
      this.key_note_count = 0;
      this.key_correct_count = 0;
      this.video_object.currentTime(0);
      this.video_object.pause();
      this.good = false;
      this.bad = false;
    },
    clearAll() {
      for (let i = 0; i < 128; ++i) {
        this.uplightSend(i, false);
      }
    },
    uplightSend(note, state) {
      if (note < 0 || note > 127) {
        return;
      }
      if (state) {
        if (this.midiOutputIsReady) {
          this.outputDevice.send([0x90, note, 127]);
        }
      } else {
        if (this.midiOutputIsReady) {
          this.outputDevice.send([0x80, note, 0]);
        }
      }
    },
    startSong(){
      this.video_object.play();
    },
    startLoop(){
      let this_ = this;
      let video_body = document.getElementById("my-player_html5_api");
      let canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      var ctx = canvas.getContext('2d',{willReadFrequently: true});
      (function loop(){
        if (this_.video_object.paused() || this_.video_object.seeking()) {
          //再生中じゃなければ何もしない
        } else {
          let now = this_.video_object.currentTime();

          ctx.drawImage(video_body, 0, 0);
          for (let i = 0; i < this_.key_list.length; ++i) {
            var imageData = ctx.getImageData(this_.key_list[i][0], this_.key_top + 80, 1, 1);
            let color = Math.floor((imageData.data[0] + imageData.data[1] + imageData.data[2]) / 3);
            if (Math.abs(color - this_.key_default_color[i]) > 50) {
              if (!this_.key_note_state[i]){
                this_.key_note_state[i] = true;
                this_.uplightSend(this_.key_list[i][1] + this_.light * 12, true);
                console.log("Note on:  ", this_.key_list[i][1]);
                this_.key_score_state[this_.key_list[i][1]] = true;
                this_.key_note_count++;
              }
            } else {
              if (this_.key_note_state[i]){
                this_.key_note_state[i] = false;
                this_.uplightSend(this_.key_list[i][1] + this_.light * 12, false);
                if (this_.key_score_state[this_.key_list[i][1]]) {
                  this_.good = false;
                  this_.miss = true;
                } else {
                  this_.good = false;
                  this_.miss = false;
                }
                this_.key_score_state[this_.key_list[i][1]] = false;
                console.log("Note off: ", this_.key_list[i][1]);
              }
            }
          }
          this_.score = Math.floor(this_.key_correct_count / this_.key_note_count * 100);

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
      if (input.target.value == -1) {
        this.inputDevice.onmidimessage = (event) => {
        };
        this.inputDevice = null;
        return;
      }
      this.inputDevice = this.inputDevices[input.target.value];
      console.log(this.inputDevice.name + " is selected");
      this.inputDevice.onmidimessage = (event) => {
        let note = event.data[1] + this.octave * 12;
        if (note < 0 || note > 127) {
          return;
        }
        if (event.data[0] == 0x90) {
          if (event.data[2] == 0) {
            console.log("Input Note off: ", note);
          } else {
            console.log("Input Note on:  ", note);
            if (this.key_score_state[note]) {
              this.key_correct_count++;
              this.key_score_state[note] = false;
              this.good = true;
              this.miss = false;
            }
          }
        } else if (event.data[0] == 0x80) {
          console.log("Input Note off: ", note);
        }
      };
    }
  },
  mounted() {
    this.video_object = videojs("my-player");
    this.video_object.ready(() => {
      this.setSrc(this.data[1]);
      this.startLoop();      
    });

    this.midiObserverId = setInterval(this.midiObserver, 3000);
  }
});
