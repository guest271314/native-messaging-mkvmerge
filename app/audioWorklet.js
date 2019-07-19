class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }
  process(inputs, outputs) {
    console.log(currentTime);
    return true;
  }
}
registerProcessor("output-silence", RecorderProcessor);
