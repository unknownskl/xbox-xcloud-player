import BaseChannel from './Base'

export default class AudioChannel extends BaseChannel {

    onOpen(event) {
        super.onOpen(event)

        console.log('xCloudPlayer Channels/Audio.ts - ['+this._channelName+'] onOpen:', event)
    }
    
    onMessage(event) {
        console.log('xCloudPlayer Channels/Audio.ts - ['+this._channelName+'] onMessage:', event)
    }

    onClose(event) {
        super.onClose(event)
        
        console.log('xCloudPlayer Channels/Audio.ts - ['+this._channelName+'] onClose:', event)
    }
}