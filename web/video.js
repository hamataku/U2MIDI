new Vue({
  el: "#app",
  data: {
    id: "",
    roomName: "",
    chat: "",
    nowInSec: null,
    SkyWayAuthToke: null,
    SkyWayContext: null,
    SkyWayRoom: null,
    SkyWayStreamFactory: null,
    uuidV4: null,
    token: null,
    audio: null,
    video: null,
    data_stream: null,

    midiOutputIsReady: false,
    outputDevice: null,
    inputDevices: [],
    inputDevice: null,
    midiObserverId: null,

    light: 0,
  },
  methods: {
    send() {
      this.data_stream.write(this.chat);
    },
    join() {
      (async () => {
        if (this.roomName === '') return;

        const context = await this.SkyWayContext.Create(this.token);
        const room = await this.SkyWayRoom.FindOrCreate(context, {
          type: 'p2p',
          name: this.roomName,
        });
        const me = await room.join();
        this.id = me.id;

        await me.publish(this.audio);
        await me.publish(this.video);
        await me.publish(this.data_stream);

        const subscribeAndAttach = (publication) => {
          if (publication.publisher.id === me.id) return;

          (async () => {
            const { stream } = await me.subscribe(publication.id);

            let newMedia;
            switch (stream.contentType) {
              case 'video':
                newMedia = document.getElementById('remote-video');
                newMedia.playsInline = true;
                newMedia.autoplay = true;
                break;
              case 'audio':
                newMedia = document.createElement('audio');
                newMedia.controls = true;
                newMedia.autoplay = true;
                break;
              case 'data': {
                stream.onData.add((data) => {
                  if (data[0] == 'f') { //note off
                    let note = parseInt(data.slice(1)) + (this.light - 3) * 12;
                    this.uplightSend(note, false);
                    console.log('note off: '+note);
                  } else if (data[0] == 'n'){ // note on
                    let note = parseInt(data.slice(1)) + (this.light - 3) * 12;
                    this.uplightSend(note, true);
                    console.log('note on: '+note);
                  }
                });
              }
              default:
                return;
            }
            stream.attach(newMedia);
          })();
        };

        room.publications.forEach(subscribeAndAttach);
        room.onStreamPublished.add((e) => subscribeAndAttach(e.publication));
      })();
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
        let note = event.data[1];
        if (event.data[0] == 0x90) {
          if (event.data[2] == 0) {
            console.log("Input Note off: ", note);
            this.data_stream.write("f"+note);
          } else {
            console.log("Input Note on:  ", note);
            this.data_stream.write("n"+note);
          }
        } else if (event.data[0] == 0x80) {
          console.log("Input Note off: ", note);
          this.data_stream.write("f"+note);
        }
      };
    }
  },
  mounted() {
    const { nowInSec, SkyWayAuthToken, SkyWayContext, SkyWayRoom, SkyWayStreamFactory, uuidV4 } = skyway_room;
    this.nowInSec = nowInSec;
    this.SkyWayAuthToken = SkyWayAuthToken;
    this.SkyWayContext = SkyWayContext;
    this.SkyWayRoom = SkyWayRoom;
    this.SkyWayStreamFactory = SkyWayStreamFactory;
    this.uuidV4 = uuidV4;

    this.token = new this.SkyWayAuthToken({
      jti: this.uuidV4(),
      iat: this.nowInSec(),
      exp: this.nowInSec() + 60 * 60 * 24,
      scope: {
        app: {
          id: '32d686e0-9e9a-4bdd-81ba-8b78ced60de2',
          turn: true,
          actions: ['read'],
          channels: [
            {
              id: '*',
              name: '*',
              actions: ['write'],
              members: [
                {
                  id: '*',
                  name: '*',
                  actions: ['write'],
                  publication: {
                    actions: ['write'],
                  },
                  subscription: {
                    actions: ['write'],
                  },
                },
              ],
              sfuBots: [
                {
                  actions: ['write'],
                  forwardings: [
                    {
                      actions: ['write'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    }).encode('gxSeaIz2v7CDvgE77Nuf+y/c3WDzX1tjgYvKfczMsIE=');

    (async () => {
      const localVideo = document.createElement('video');
      const { audio, video } = await this.SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
      const data = await this.SkyWayStreamFactory.createDataStream();
      this.audio = audio;
      this.video = video;
      this.data_stream = data;
      video.attach(localVideo);
      await localVideo.play();
    })(); // 1

    this.midiObserverId = setInterval(this.midiObserver, 3000);
  }
}); 