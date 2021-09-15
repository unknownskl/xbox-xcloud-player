console.log('xCloudPlayer Worker/Opus.ts - Setting up Opus WebWorker')

var OpusDecoderLib;
var OggOpusDecoder;

console.log('xCloudPlayer Worker/Opus.ts - Loading WASM binary and libraries...')

self.OPUS_SCRIPT_LOCATION = '../opus/';
importScripts('../opus/libopus-decoder.min.js');
importScripts('../opus/oggOpusDecoder.js');

console.log('xCloudPlayer Worker/Opus.ts - Files loaded. Creating OPUS Decoder...')
var _frameQueue = {}
var _opusDecoder = new self.OggOpusDecoder({

    decoderSampleRate: 48000,
    outputBufferSampleRate: 48000,
    numberOfChannels: 2,
    rawOpus: true,

}, self.OpusDecoderLib );

console.log('xCloudPlayer Worker/Opus.ts - Decoder is ready:', _opusDecoder)