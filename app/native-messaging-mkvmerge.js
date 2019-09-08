// native-messaging-mkvmerge 
// Merge Matroska and WebM files using Native Messaging, mkvmerge, JavaScript
// https://github.com/guest271314/native-messaging-mkvmerge
let [port, fileNames, appendTo, dir, status, result] = [null, [], "--append-to "];
const [hostName, mimeType, cmd, options, metadata, outputFileName, randomFileName, getTrack] = [
  "native_messaging_mkvmerge", "video/webm;codecs=vp8,opus"
  // path to mkvmerge at OS
  , "./mkvmerge", "-o", "-J", "merged.webm", _ => "_" + ".".repeat(16).replace(/./g, _ =>
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ" [~~(Math.random() * 36)]), (tracks, type) => tracks.find(({
    type: t
  }) => t === type)
];
const connectButton = document.getElementById("connect-button");
const sendMessageButton = document.getElementById("send-message-button");
const sources = document.getElementById("sources");
// permision status of `dir` is "prompt" and `DOMException` thrown if files 
// are not uploaded from same folder as later requested file read/write access
// https://bugs.chromium.org/p/chromium/issues/detail?id=986107
const inputFiles = document.querySelector("input[type=file]");
// update HTML
const updateUiState = _ => {
    if (port) {
      connectButton.style.display = "none";
      sendMessageButton.style.display = "block";
    } else {
      connectButton.style.display = "block";
      sendMessageButton.style.display = "none";
    }
  }
  // send native message to host
const sendNativeMessage = async e => {
  try {
    dir = await self.chooseFileSystemEntries({
      type: "openDirectory"
    });
    // https://bugs.chromium.org/p/chromium/issues/detail?id=986060
    status = await dir.requestPermission({
      writable: true
    });
    console.log(dir, status);
    // create array of files paths to fetch
    let media = sources.value.length ? sources.value.trim().match(/\S+/g)
      .map(src => {
        // `hash`: Media Fragment URI
        const {
          hash
        } = new URL(src);
        return {
          src, hash
        };
      }) : [];
    // handle `File` objects from `<input type="file" multiple>`
    // concatenate to `media` array; can be adjusted to arrange
    // elements of `media` array, including `File`s, in any order
    if (inputFiles.files.length) {
      media.push(...[...inputFiles.files].map(file => ({
        src: file,
        hash: ""
      })));
    };
    if (media.length === 0) {
      console.log("No files to merge");
      return;
    }
    const recordings = await Promise.all(media.map(data => new Promise(async resolve => {
        const {
          src, hash
        } = data;
        const video = document.createElement("video");
        let blob;
        let request;
        if (!(src instanceof File)) {
          request = await fetch(src);
        }
        blob = request instanceof Response ? await request.blob() : src;
        const blobURL = URL.createObjectURL(blob) + hash;
        let [audioContext, canvas, ctx, canvasStream, imageData, mediaStream, recorder, width, height, rs, controller, audioTrack, videoTrack] = [];
        video.onloadedmetadata = async _ => {
          try {
            [width, height] = [video.videoWidth, video.videoHeight];
            mediaStream = video.captureStream();
            [audioTrack] = mediaStream.getAudioTracks();
            [videoTrack] = mediaStream.getVideoTracks();
            // handle no video track in media file, stream
            // draw black frames onto canvas; capture, write video track
            // `mkvmerge` outputs error for case of file containing only audio track 
            // appended to file containing audio track and video track
            if (!videoTrack) {
              console.log("No video track");
              canvas = document.createElement("canvas");
              width = 800;
              height = 400;
              canvas.width = width;
              canvas.height = height;
              ctx = canvas.getContext("2d");
              canvasStream = canvas.captureStream(0);
              [videoTrack] = canvasStream.getVideoTracks();
              mediaStream.addTrack(videoTrack);
              rs = new ReadableStream({
                start(c) {
                    return controller = c;
                  },
                  async pull(_) {
                    if (videoTrack.readyState === "ended") {
                      controller.close();
                      return;
                    }
                    controller.enqueue(null);
                    await new Promise(resolve => requestAnimationFrame(_ => resolve()));
                  }
              }).pipeTo(new WritableStream({
                write() {
                  ctx.clearRect(0, 0, width, height);
                  ctx.fillStyle = "#000000";
                  ctx.fillRect(0, 0, width, height);
                  videoTrack.requestFrame();
                  console.log("video frame written");
                }
              }));
            } else {
              video.width = width;
              video.height = height;
            }
            // handle no audio track in media file, stream
            // output silence, capture, write audio track to file
            // mkvmerge outputs error if tracks in files do not match 1:1:A:V
            // Using `-J` option WebM file output by MediaRecorder: 
            // Chromium "audio_sampling_frequency": 48000
            // Firefox "audio_sampling_frequency": 44100
            if (!audioTrack) {
              console.log("No audio track");
              audioContext = new AudioContext({
                sampleRate: 44100
              });
              const audioStream = audioContext.createMediaStreamDestination();
              [audioTrack] = audioStream.stream.getAudioTracks();
              mediaStream.addTrack(audioTrack);
              await audioContext.audioWorklet.addModule("audioWorklet.js");
              const aw = new AudioWorkletNode(audioContext, "output-silence");
              aw.connect(audioStream);
              aw.connect(audioContext.destination);

            }
            await video.play();
          } catch (e) {
            console.error(e);
            throw e;
          }
        };
        video.onplay = async _ => {
          recorder = new MediaRecorder(mediaStream, {
            mimeType
          });
          recorder.start();
          recorder.onerror = e => {
            throw e;
          };
          recorder.ondataavailable = async e => {
            recorder.ondataavailable = null;
            resolve(e.data);
            video.remove();
            if (videoTrack.readyState !== "ended") {
              videoTrack.stop();
            };
            if (audioContext && audioContext.state === "running") {
              await audioContext.close();
            };
          };
        };
        video.onpause = _ => recorder.stop();
        video.onended = _ => {
          if (recorder.state === "recording") {
            recorder.stop()
          };
        };
        video.src = blobURL;
      })))
      .catch(e => {
        throw e;
      });
    // write recorded webm files to local filesystem with Native File System
    // "mkvmerge needs the whole source file to be present on disk." 
    // https://gitlab.com/mbunkus/mkvtoolnix/issues/2576#note_185902903
    const fileWriter = await Promise.all(recordings.map(async blob => {
        try {
          const fileName = `${randomFileName()}.webm`;
          fileNames.push(fileName);
          const fileHandle = await dir.getFile(fileName, {
            create: true
          });
          const writer = await fileHandle.createWriter();
          const writeFile = await writer.write(0, blob);
          return await writer.close();
        } catch (e) {
          throw e;
        }
      }))
      .catch(e => {
        throw e;
      });
    // https://www.reddit.com/r/mkvtoolnix/comments/cdi824/mkvmerge_prints_error_when_merging_webm_files/etwhugs/
    // 1. run `mkvmerge -J` file.webm on each input file
    // 2. determine which tracks go together
    // 3. create an appropriate --append-to argument from the algorithm in 2
    let filesMetadata = [];
    for (const fileName of fileNames) {
      await new Promise(resolve => {
        const getMetadata = ({
          body
        }) => {
          port.onMessage.removeListener(getMetadata);
          filesMetadata.push(JSON.parse(body));
          resolve();
        };
        port.onMessage.addListener(getMetadata);
        port.postMessage({
          "message": "metadata",
          "body": `${cmd} ${metadata} ${fileName}`
        });
      });
    };
    // construct `--append-to` option for merging files where
    // tracks are not in consistent order; for example, WebM
    // files output by Chromium, Firefox MediaRecorder implementations 
    // Chromium => Opus: "id": 0, Firefox => Opus: "id": 1,
    // Chromium => VP8: "id": 1, Firefox => VP8: "id": 0 
    for (let i = 0; i < filesMetadata.length; i++) {
      const {
        tracks: currentTracks
      } = filesMetadata[i];
      const currentAudioTrack = getTrack(currentTracks, "audio").id;
      const currentVideoTrack = getTrack(currentTracks, "video").id;
      if (filesMetadata[i + 1]) {
        const {
          tracks: nextTracks
        } = filesMetadata[i + 1];
        const nextAudioTrack = getTrack(nextTracks, "audio").id;
        const nextVideoTrack = getTrack(nextTracks, "video").id;
        appendTo += `${i+1}:${nextAudioTrack}:${i}:${currentAudioTrack},${i+1}:${nextVideoTrack}:${i}:${currentVideoTrack},`;
      } else {
        const {
          tracks: previousTracks
        } = filesMetadata[i - 1];
        const previousAudioTrack = getTrack(previousTracks, "audio").id;
        const previousVideoTrack = getTrack(previousTracks, "video").id;
        appendTo += `${i}:${currentAudioTrack}:${i-1}:${previousAudioTrack},${i}:${currentVideoTrack}:${i-1}:${previousVideoTrack}`;
      }
    };
    // check if tracks are ordered AV,AV...AV or arbitrarily AV,VA,AV,AV,VA...AV
    const orderedTracks = filesMetadata.map(({
      tracks
    }) => tracks).every(([{
      type
    }]) => type === "audio");
    console.log(JSON.stringify({
      filesMetadata, orderedTracks, appendTo
    }, null, 2));
    port.onMessage.addListener(onNativeMessage);
    const message = {
      "message": "write",
      // if tracks in files are not ordered use `--append-to` option, else do not
      "body": `${cmd} ${options} ${outputFileName} ${!orderedTracks ? appendTo : ""} '[' ${fileNames.join(" ")} ']'`
    };
    // mkvmerge <35 outputs error when merging video tracks having differing pixel dimensions
    // Error: The track number 1 from the file '1.webm' cannot be appended to the track number 
    // 1 from the file '0.webm'. The width of the two tracks is different: 768 and 480
    // fixed with mkvmerge: allow appending video tracks with differing pixel dimensions 
    // https://gitlab.com/mbunkus/mkvtoolnix/commit/2548a7f3497940135e55be604a87b9495fdff94d
    port.postMessage(message);
    console.log(JSON.stringify(message));
  } catch (e) {
    console.error(e);
    console.trace();
  };
};
// handle native message from host
const onNativeMessage = async e => {
  const {
    message, body
  } = e;
  try {
    // get file written to filesystem using native file sysytem
    if (message === "output") {
      // At Chromium 77 throws net error GET blob:chrome-extension://<extension> net::ERR_FILE_NOT_FOUND
      // https://github.com/WICG/native-file-system/issues/70
      // https://bugs.chromium.org/p/chromium/issues/detail?id=985665
      // `outputFileName` which is an element of and including `fileNames` array
      // are files on disk that will be deleted at the code below
      result = new Blob([await (await (await dir.getFile(outputFileName, {
        create: false
      })).getFile()).arrayBuffer()], {
        type: mimeType
      });
      // result of `FileSystemFileHandle.getFile()`
      console.log({
        result
      });
      // do stuff with merged file   
      const video = document.createElement("video");
      // passing `result` to `URL.createObjectURL()` does not work
      // at Chromium 77; does not GET the File
      const blobURL = URL.createObjectURL(result);
      video.controls = true;
      video.onresize = e => {
        video.style.left = `calc(50vw - ${video.videoWidth/2}px)`;
        console.log(video.videoWidth, video.videoHeight);
      };
      video.src = blobURL;
      document.body.appendChild(video);
      console.log(result, blobURL);
      fileNames.push(outputFileName);
      // delete written files from filesystem
      for (const fileName of fileNames) {
        await dir.removeEntry(fileName);
      };
      fileNames.length = 0;
    } else if (message === "stderr") {
      console.log(e);
      port.disconnect();
    } else {
      console.log(JSON.parse(e.message.body));
    }
  } catch (e) {
    console.error(e);
    console.trace();
  } finally {
    if (port) {
      port = null;
      updateUiState();
    };
  };
};
const onDisconnected = _ => {
  console.error(chrome.runtime.lastError.message);
  port = null;
  updateUiState();
};
const connect = e => {
  console.log("Connecting to native messaging host: " + hostName);
  port = chrome.runtime.connectNative(hostName);
  port.onDisconnect.addListener(onDisconnected);
  updateUiState();
};
connectButton.onclick = connect;
sendMessageButton.onclick = sendNativeMessage;
updateUiState();
