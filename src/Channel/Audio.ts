import BaseChannel from './Base'
import AudioComponent from '../Component/Audio'
import AudioWorker from '../Worker/Audio'
import FpsCounter from '../Helper/FpsCounter'
import BitrateCounter from '../Helper/BitrateCounter'
import LatencyCounter from '../Helper/LatencyCounter'

export default class AudioChannel extends BaseChannel {

    _component:AudioComponent
    _opusWorker
    _worker

    _audioContext
    _gainNode

    _audioOffset = 0
    _audioTimeOffset = 0
    _frameBufferDuration = 20
    _audioDelay = 20

    _audioBuffers = {
        num: 0,
        buffers: [undefined, undefined, undefined, undefined],
    }

    _frameQueue:Array<Buffer> = []

    _softResetInterval
    _mediaInterval
    _performanceInterval

    _fpsCounter:FpsCounter
    _bitrateCounter:BitrateCounter
    _latencyCounter:LatencyCounter

    constructor(channelName, client){
        super(channelName, client)

        this._component = new AudioComponent(this.getClient())
        this._fpsCounter = new FpsCounter(this.getClient(), 'audio')
        this._bitrateCounter = new BitrateCounter(this.getClient(), 'audio')
        this._latencyCounter = new LatencyCounter(this.getClient(), 'audio')
    }

    onOpen(event) {
        super.onOpen(event)
        console.log('xCloudPlayer Channel/Audio.ts - ['+this._channelName+'] onOpen:', event)

        this._component.create()
        this._fpsCounter.start()
        this._bitrateCounter.start()
        this._latencyCounter.start()

        // Create worker to process Audio
        const blob = new Blob(['var func = '+AudioWorker.toString()+'; self = func(self)'])
        this._worker = new Worker(window.URL.createObjectURL(blob))
        // this._opusWorker = new Worker(new URL('dist/opusWorker.min.js', 'http://localhost:3000/'));
        this._opusWorker = new Worker('dist/opusWorker.min.js')

        this._setupOpusWorker()
        this._setupAudioWorker()

        this._createAudioContext()

        this._performanceInterval = setInterval(() => {
            // console.log('xCloudPlayer Channel/Audio.ts - frameQueue length:', this._frameQueue.length)
        }, 1000)
    }
    
    onMessage(event) {
        // console.log('xCloudPlayer Channel/Audio.ts - ['+this._channelName+'] onMessage:', event)
        this._bitrateCounter.countPacket(event.data.byteLength)

        this._worker.postMessage({
            action: 'onPacket',
            data: {
                data: event.data,
                timePerformanceNow: performance.now(),
            },
        })

    }

    onClose(event) {
        console.log('xCloudPlayer Channel/Audio.ts - ['+this._channelName+'] onClose:', event)

        this._opusWorker.postMessage({
            action: 'endStream',
        })

        this._component.destroy()

        super.onClose(event)
    }

    _setupAudioWorker() {
        this._worker.onmessage = (workerMessage) => {
            // console.log('xCloudPlayer Channel/Audio.ts - ['+this._channelName+'] _worker message:', workerMessage)

            switch(workerMessage.data.action){
                case 'decodeAudio':
                    // Decode audio using opus
                    this._opusWorker.postMessage({
                        action: 'decodeAudio',
                        data: {
                            buffer: workerMessage.data.data.frame.frameData,
                            timePerformanceNow: performance.now(),
                        },
                    })

                    this._latencyCounter.count((performance.now()-workerMessage.data.data.frame.frameReceived))
                    break
                default:
                    console.log('xCloudPlayer Channel/Audio.ts - Unknown incoming _worker message:', workerMessage.data.action, workerMessage.data)
            }
        }
    }

    _setupOpusWorker() {
        this._opusWorker.onmessage = (workerMessage) => {
            // console.log('xCloudPlayer Channel/Audio.ts - ['+this._channelName+'] _opusWorker message:', workerMessage)

            switch(workerMessage.data.action){
                case 'bufferAudio':
                    // Lets schedule audio into the media buffer.
                    this._frameQueue.push(workerMessage.data.data.buffer)
                    break
                default:
                    console.log('xCloudPlayer Channel/Audio.ts - Unknown incoming _worker message:', workerMessage.data.action, workerMessage.data)
            }
        }
    }

    _createAudioContext() {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext

        this._audioContext = new AudioContext({
            latencyHint: 'interactive',
            sampleRate: 96000,
        })

        // For volume? See https://developer.mozilla.org/en-US/docs/Web/API/GainNode
        this._gainNode = this._audioContext.createGain(),
        this._gainNode.gain.value = 2 // 200 %
        this._gainNode.connect(this._audioContext.destination)

        this._softResetInterval = setInterval(() => {
            this._softReset()
        }, 2000)

        this._mediaInterval = setInterval(() => {
            if(this._frameQueue.length > 0){
                this._sendToMediaSource()
            }
        }, 5)
    }

    _sendToMediaSource() {
        if(this._audioContext.state === 'running'){
            // Check if we have anything to play
            if(this._frameQueue.length > 0){

                // Set audio offset
                if(this._audioOffset === 0){
                    this._audioOffset = Math.round(this._audioContext.currentTime * 100) / 100
                }
                
                this._playFrameBuffer(this._frameQueue.shift())
                this._audioTimeOffset = this._audioTimeOffset + (this._frameBufferDuration/1000)
                
            }

        } else {
            // console.log('AudioSource is not running:', this.#audioContext.state)
        }
    }

    _playFrameBuffer(outputBuffer) {
        this._fpsCounter.count()
        this._bitrateCounter.countData(outputBuffer.length)

        let audioBuffer:any

        if(this._audioBuffers.buffers[this._audioBuffers.num] === undefined) {
            audioBuffer = this._audioContext.createBuffer(2, outputBuffer.length, 96000)
            this._audioBuffers.buffers.push(audioBuffer)
        } else {
            audioBuffer = this._audioBuffers.buffers[this._audioBuffers.num]
        }

        this._audioBuffers.num++
        if(this._audioBuffers.num > 3){
            this._audioBuffers.num = 0
        }

        if(audioBuffer.numberOfChannels !== 2){
            throw 'audioBuffer.numberOfChannels is not 2.. Cannot process audio...'
        }

        const leftChannel = audioBuffer.getChannelData(0)
        const rightChannel = audioBuffer.getChannelData(1)

        for (let i = 0; i < outputBuffer.length; i++) {
            if(! (i % 2)) {
                leftChannel[i] = outputBuffer[i]
            } else {
                rightChannel[i] = outputBuffer[i]
            }
        }

        const source = this._audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(this._gainNode)
        
        const startTime = (this._audioOffset+this._audioTimeOffset+(this._audioDelay/1000)) // in MS
        // const delay = (startTime-this._audioContext.currentTime) // in MS
        
        source.start(startTime)
    }

    _softReset() {
        this._frameQueue = []

        this._audioOffset = Math.round(this._audioContext.currentTime * 100) / 100
        this._audioDelay = 20
        this._audioTimeOffset = 0.02
    }

    destroy() {
        clearInterval(this._performanceInterval)
        clearInterval(this._softResetInterval)
        clearInterval(this._mediaInterval)
        
        this._fpsCounter.stop()
        this._bitrateCounter.stop()
        this._latencyCounter.stop()

        if(this._worker !== undefined){
            this._worker.terminate()
        }

        if(this._opusWorker !== undefined){
            this._opusWorker.terminate()
        }
        
        this._component.destroy()
        
        console.log('xCloudPlayer Channel/Audio.ts - Workers terminated', this._opusWorker, this._worker)

        // Called when we want to destroy the channel.
        super.destroy()
    }
}