console.log('xCloudPlayer Worker/Opus.ts - Setting up Opus WebWorker')

var OpusDecoderLib;
var OggOpusDecoder;

console.log('xCloudPlayer Worker/Opus.ts - Loading WASM binary and libraries...')

self.OPUS_SCRIPT_LOCATION = '../opus/';
importScripts('../opus/libopus-decoder.min.js');
importScripts('../opus/oggOpusDecoder.js');

console.log('xCloudPlayer Worker/Opus.ts - Files loaded. Creating OPUS Decoder...')

var _opusDecoder = new self.OggOpusDecoder({

    decoderSampleRate: 48000,
    outputBufferSampleRate: 48000,
    numberOfChannels: 2,
    rawOpus: true,

}, self.OpusDecoderLib );

console.log('xCloudPlayer Worker/Opus.ts - Decoder is ready:', _opusDecoder)

onmessage = async (workerMessage) => {

    switch(workerMessage.data.action){
        case 'decodeAudio':
            self.decode(workerMessage.data.data.buffer)
            break;
        default:
            console.log('xCloudPlayer Worker/Opus.ts - Unknown incoming worker message:', workerMessage.data.action, workerMessage.data)
    }
}

self.decode = (inputBuffer) => {
    _opusDecoder.decodeRaw(inputBuffer, (output) => {
        var audioOutput = output.slice(0)

        self.postMessage({
            action: 'bufferAudio',
            status: 200,
            data: {
                buffer: audioOutput
            }
        });
    })
}