//Videoの実験
Vue.use(window["vue-js-toggle-button"].default);

new Vue({
  el: "#app",
  data: {
    video_object: null,
    ABisActive: false,
    video_length: null,
    Atime: null,
    Btime: null,
    midiOutputIsReady: false,
    outputDevice: null,
    score: [
        [3, 60, 1], [4, 60, 0], [4, 62, 1], [5, 62, 0], [5, 64, 1], [6, 64, 0]
    ],
    score_position: null //次にscoreの何番目を判定するか nullなら冒頭から探す
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
    restart() {
      this.video_object.currentTime(0);
    },
    startLoop(){
      let this_ = this;
      (function loop(){

        //再生中じゃなければ何もしない
        if(this_.video_object.paused() || this_.video_object.seeking()){
          this_.score_position = null;
        } else {

          let now = this_.video_object.currentTime();

          // nullになったprevious_timeとscore_positionを設定する処理
          if(this_.score_position == null){
            for(let i=0; i<this_.score.length; i++){
              if(this_.score[i][0] > now){
                this_.score_position = i;
                break;
              }
            }
          }

          //MIDI信号送信の処理
          while(this_.score_position < this_.score.length && this_.score[this_.score_position][0] < now){
            
              let current_note = this_.score[this_.score_position];
              //this.outputDevice.send([current_note[2] ? 0x90 : 0x80, current_note[1], 127]);
              console.log(current_note[1]);
              this_.score_position += 1;
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
    this.video_object = videojs("my-player");
    this.video_object.ready(() => {
      let p = jQuery(
        this.video_object.controlBar.progressControl.children_[0].el_
      );
      let marker_a = jQuery('<div class="vjs-marker marker-a"></div>');
      let marker_b = jQuery('<div class="vjs-marker marker-b"></div>');
      p.append(marker_a);
      p.append(marker_b);

      this.startLoop();

    //   this.video_object.on("timeupdate", () => {

    //     let now = this.video_object.currentTime();

    //     //MIDI信号送信の処理
    //     //AB再生の処理
    //     if (
    //       this.Atime &&
    //       this.Btime &&
    //       this.ABisActive &&
    //       !this.video_object.paused() &&
    //       now > this.Btime
    //     ) {
    //       this.video_object.currentTime(this.Atime);
    //     }

    //     //previous_timeの更新
    //     this.previous_time = now

    //   });
      
    });

    navigator.requestMIDIAccess().then(
        (midiAccess) => {
          //成功
          console.log("MIDI ready!");
          // デバイスが 1台だけつながっている前提 ないとエラーになる
          // const input = midiAccess.inputs.values().next();
          // console.log(input.value.manufacturer);
          // console.log(input.value.name);
          // input.value.onmidimessage = onMIDIMessage;
          try {
            let output = midiAccess.outputs.values().next();
            this.outputDevice = output.value;
            console.log(this.outputDevice.name);
            this.midiOutputIsReady = true;
          } catch (e) {
            console.log("cannot find MIDI device");
          }
        },
        (msg) => {
          //失敗
          console.log("Failed to get MIDI access - " + msg);
        }
      );
  },
});

//OpenCV.jsの実験

let video = document.getElementById('video');
function handleCanPlayThrough()
{  
  video.removeEventListener('canplaythrough', handleCanPlayThrough);
  getKeyPosition();
}
video.addEventListener('canplaythrough', handleCanPlayThrough);

let inputElement = document.getElementById('videoInput');
inputElement.addEventListener('change', (e) => {
  video.src = URL.createObjectURL(e.target.files[0]);
  video.width = 1280;
  video.height = 720;
  video.load();
  video.play(); // chromeで動画を読み込んだ後にplayしないとvideocaptureが真っ暗になる。謎
}, false);

function onOpenCvReady() {
    document.getElementById('status').innerHTML = 'OpenCV.js is ready.';
}

function getKeyPosition() {
  let width = video.width;
  let height = video.height;
  let src = new cv.Mat(height, width, cv.CV_8UC4);
  let mono = new cv.Mat(height, width, cv.CV_8UC1);

  video.pause(); // ここでplayした動画を停止している
  video.currentTime = 4;
  let cap = new cv.VideoCapture(video);
  cap.read(src);
  cv.cvtColor(src, mono, cv.COLOR_RGBA2GRAY);
  let start_row = src.rows/3*2;
  let rect = new cv.Rect(0, start_row, src.cols, src.rows - start_row);
  let dst = mono.roi(rect);
  let color_dst = src.roi(rect);
  
  cv.threshold(dst, dst, 100, 255, cv.THRESH_BINARY);
  cv.Canny(dst, dst, 100, 200, 3);
  let lines = new cv.Mat();
  cv.HoughLinesP(dst, lines, 1, Math.PI, 80, 30, 2);

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
  let octave = 3;
  let standard = 0;
  for (let i = 0; i < pos_list.length - 13; ++i)
  {
    if (pos_list[i][1] > threshold && pos_list[i + 5][1] > threshold && pos_list[i + 12][1] > threshold) {
      standard = i % 12 + 1 - octave * 12;
      console.log("standard: ", standard);
      break;
    }
  }

  // make key_list
  let key_list = [];
  for (let i = 0; i < pos_list.length + 1; ++i)
  {
    if (i == 0) {
      key_list.push([Math.floor(pos_list[i][0] / 2), i - standard]);
    } else if (i == pos_list.length) {
      key_list.push([Math.floor((pos_list[i - 1][0] + dst.cols) / 2), i - standard]);
    } else {
      key_list.push([Math.floor((pos_list[i][0] + pos_list[i - 1][0]) / 2), i - standard]);
    }
  }

  console.log(key_list);
  
  // draw lines
  let color = new cv.Scalar(0, 255, 0, 255);
  for (let i = 0; i < pos_list.length; ++i)
  {
    let startPoint = new cv.Point(pos_list[i][0], 0);
    let endPoint = new cv.Point(pos_list[i][0], pos_list[i][1]);
    cv.line(color_dst, startPoint, endPoint, color);
  }
  cv.imshow('canvasOutput', color_dst);

  return key_list;
}

//WebMidiの実験

// new Vue({
//   el: "#webmidi",
//   data: {
//     src: "",
//     midiOutputIsReady: false,
//     outputDevice: null,
//     count: 0,
//   },
//   computed: {},
//   methods: {
//     playScale() {
//       console.log("playScale");
//       let o = this.outputDevice;
//       let scale = [60, 62, 64, 65, 67, 69, 71, 72];
//       for (let i = 0; i < 8; i++) {
//         o.send(
//           [0x90, scale[i], 100],
//           window.performance.now() + 200 + 1000 * i
//         );
//         o.send(
//           [0x80, scale[i], 0],
//           window.performance.now() + 200 + 1000 * (i + 1)
//         );
//       }
//     },
//   },
//   mounted() {
//     navigator.requestMIDIAccess().then(
//       (midiAccess) => {
//         //成功
//         console.log("MIDI ready!");
//         // デバイスが 1台だけつながっている前提 ないとエラーになる
//         // const input = midiAccess.inputs.values().next();
//         // console.log(input.value.manufacturer);
//         // console.log(input.value.name);
//         // input.value.onmidimessage = onMIDIMessage;
//         try {
//           let output = midiAccess.outputs.values().next();
//           this.outputDevice = output.value;
//           console.log(this.outputDevice.name);
//           this.midiOutputIsReady = true;
//         } catch (e) {
//           console.log("cannot find MIDI device");
//         }
//       },
//       (msg) => {
//         //失敗
//         console.log("Failed to get MIDI access - " + msg);
//       }
//     );
//   },
// });

// function onMIDIMessage(message) {
//   const data = message.data;
//   console.log("MIDI data: ", data);
// }
