//Videoの実験
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
    key_default_color: [],
    key_note_state: [],
    octave: 4,

    alert_analysis_failed: false,
    alert_uplight_connected: false,
    alert_keyboard_connected: false
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
      let fileURL = URL.createObjectURL(file);
      let fileType = file.type;
      this.video_object.src({ type: fileType, src: fileURL });
      this.video_object.load();
      this.video_src_is_set = true;
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

      this.video_analysis.pause();

      try {
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
          if (h_lines.data32S[i*4 + 1] < minY && h_lines.data32S[i*4 + 1] > mono.rows/2) {
            minY = h_lines.data32S[i*4 + 1];
            min_index = i;
          }
          if (h_lines.data32S[i*4 + 1] > maxY && h_lines.data32S[i*4 + 1] > mono.rows/2) {
            maxY = h_lines.data32S[i*4 + 1];
            max_index = i;
          }
        }

        // cut out the keyboard region
        let rect = new cv.Rect(
          h_lines.data32S[min_index * 4],
          h_lines.data32S[min_index * 4 + 1],
          h_lines.data32S[max_index * 4 + 2] - h_lines.data32S[max_index * 4],
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
          if (Math.abs(pos_list[i][0] - pos_list[i + 1][0]) < 3) {
            pos_list[i + 1][0] = (pos_list[i][0] + pos_list[i + 1][0]) / 2;
            pos_list[i + 1][1] = Math.max(pos_list[i][1], pos_list[i + 1][1]);
            pos_list.splice(i, 1); // remove index i value
            i -= 1;
          }
        }

        // detect first long line between B and C
        let threshold = dst.rows - 10;
        let standard = 0;
        for (let i = 0; i < pos_list.length - 13; ++i)
        {
          if (pos_list[i][1] > threshold && pos_list[i + 5][1] > threshold && pos_list[i + 12][1] > threshold) {
            standard = i % 12 + 1 - 3 * 12;
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
          cv.line(color_dst, startPoint, endPoint, color);
        }
        cv.imshow('canvasOutput2', color_dst);
        
        M.delete();
        src.delete();
        mono.delete();
        dst.delete();
        color_dst.delete();
        this.video_show = true;
      } catch(e) {

      }
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
          this.video_object.play();
        } else {
          this.video_object.pause();
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
          this_.practiceCheck();
        } else {
          let now = this_.video_object.currentTime();

          ctx.drawImage(video_body, 0, 0);
          for (let i = 0; i < this_.key_list.length; ++i) {
            var imageData = ctx.getImageData(this_.key_list[i][0], 630, 1, 1);
            let color = Math.floor((imageData.data[0] + imageData.data[1] + imageData.data[2]) / 3);
            if (Math.abs(color - this_.key_default_color[i]) > 50) {
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
                this.showKeyboardConnectedAlert();
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
              this.showUplightConnectedAlert();
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
    },
    showAnalysisFailedAlert(){
      this.alert_analysis_failed = true;
      setTimeout(() => {this.alert_analysis_failed = false}, 3000);
    },
    showUplightConnectedAlert(){
      this.alert_uplight_connected = true;
      setTimeout(() => {this.alert_uplight_connected = false}, 3000);
    },
    showKeyboardConnectedAlert(){
      this.alert_keyboard_connected = true;
      setTimeout(() => {this.alert_keyboard_connected = false}, 3000);
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