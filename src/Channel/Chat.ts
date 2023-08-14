import BaseChannel from './Base'

export default class ChatChannel extends BaseChannel {
    _mediaRecorder

    isPaused = true

    onOpen(event) {
        super.onOpen(event)
        // console.log('xCloudPlayer Channel/Control.ts - ['+this._channelName+'] onOpen:', event)
    }

    start() {
        // Do nothing
    }
    
    onMessage(event) {
        console.log('xCloudPlayer Channel/Chat.ts - ['+this._channelName+'] onMessage:', event)

        const jsonMessage = JSON.parse(event.data)
        console.log('xCloudPlayer Channel/Chat.ts - Received json:', jsonMessage)
    }

    onClose(event) {
        super.onClose(event)
        // console.log('xCloudPlayer Channel/Control.ts - ['+this._channelName+'] onClose:', event)
    }

    startMic() {
        console.log('xCloudPlayer Channel/Chat.ts - Enabling Microphone')

        if(this._mediaRecorder === undefined){

            navigator.mediaDevices.getUserMedia({audio: {
                channelCount: 1,
                sampleRate: 24e3,
                sampleSize: 8 * 2,
            }}).then((stream) => {

                this._mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
                this._mediaRecorder.start(20)

                this._mediaRecorder.ondataavailable = (event) => {
                    if(this._state === 'connected' && this.isPaused === false){
                        event.data.arrayBuffer().then((data) => {
                            // console.log('sending mic data:', data)
                            this.send(data)
                        })
                    }
                }

            }).catch((err) => {
                console.log('xCloudPlayer Channel/Chat.ts - Error opening microphone:', err)
            })
        }

        this.isPaused = false
    }

    pauseMic(){
        this.isPaused = true
    }

    unpauseMic(){
        this.isPaused = false
    }

    stopMic() {
        console.log('xCloudPlayer Channel/Chat.ts - Disabling Microphone')
        this.isPaused = true
    }
}