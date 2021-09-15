import BaseChannel from './Base'
import AudioComponent from '../Component/Audio'
import AudioWorker from '../Worker/Audio'

export default class AudioChannel extends BaseChannel {

    _component:AudioComponent
    _opusWorker
    _worker

    constructor(channelName, client){
        super(channelName, client)

        this._component = new AudioComponent(this.getClient())
        
    }

    onOpen(event) {
        super.onOpen(event)
        console.log('xCloudPlayer Channels/Audio.ts - ['+this._channelName+'] onOpen:', event)

        this._component.create()

        // Create worker to process Audio
        const blob = new Blob(['var func = '+AudioWorker.toString()+'; self = func(self)']);
        this._worker = new Worker(window.URL.createObjectURL(blob));
        this._opusWorker = new Worker(new URL('dist/opusWorker.min.js', 'http://localhost:3000/'));

        this._setupOpusWorker()
        this._setupAudioWorker()
    }
    
    onMessage(event) {
        console.log('xCloudPlayer Channels/Audio.ts - ['+this._channelName+'] onMessage:', event)
    }

    onClose(event) {
        console.log('xCloudPlayer Channels/Audio.ts - ['+this._channelName+'] onClose:', event)

        this._opusWorker.postMessage({
            action: 'endStream'
        })
        this._component.destroy()

        super.onClose(event)
    }

    _setupAudioWorker() {
        this._worker.onmessage = (workerMessage) => {
            console.log('xCloudPlayer Channels/Audio.ts - ['+this._channelName+'] _worker message:', event)
        }
    }

    _setupOpusWorker() {
        this._opusWorker.onmessage = (workerMessage) => {
            console.log('xCloudPlayer Channels/Audio.ts - ['+this._channelName+'] _opusWorker message:', event)
        }
    }

    destroy() {

        this._worker.terminate()
        this._opusWorker.terminate()
        console.log('xCloudPlayer Channels/Audio.ts - Workers terminated', this._opusWorker, this._worker)

        // Called when we want to destroy the channel.
        super.destroy()
    }
}