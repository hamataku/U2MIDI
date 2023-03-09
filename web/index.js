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

// let video = document.getElementById('video');
// let inputElement = document.getElementById('fileInput');
// inputElement.addEventListener('change', (e) => {
//     video.src = URL.createObjectURL(e.target.files[0]);
//     countFrames();
// }, false);
// function onOpenCvReady() {
//     document.getElementById('status').innerHTML = 'OpenCV.js is ready.';
// }

// function countFrames() {
//     let width = video.width;
//     let height = video.height;
//     let src = new cv.Mat(height, width, cv.CV_8UC4);
//     let dst = new cv.Mat(height, width, cv.CV_8UC1);

//     let loop = setInterval(() => {
//         try {
//             if(video.duration <= video.currentTime + (1.0/30)){
//                 console.log("end");
//                 clearInterval(loop);
//                 src.delete();
//                 dst.delete();
//                 return
//             }
//             video.currentTime += (1.0/30);
//             let cap = new cv.VideoCapture(video);
//             cap.read(src);
//             cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
//             cv.imshow('canvasOutput', dst);
//         } catch(e){
//             console.log("error")
//             console.log(e);
//             clearInterval(loop);
//             src.delete();
//             dst.delete();
//         }
//     }, (1000.0/30))
// }

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
