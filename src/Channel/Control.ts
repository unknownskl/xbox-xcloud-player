import BaseChannel from './Base'

export default class ControlChannel extends BaseChannel {

    onOpen(event) {
        super.onOpen(event)
        // console.log('xCloudPlayer Channel/Control.ts - ['+this._channelName+'] onOpen:', event)
    }

    start() {
        const authRequest = JSON.stringify({
            'message':'authorizationRequest',
            'accessKey':'4BDB3609-C1F1-4195-9B37-FEFF45DA8B8E',
        })

        this.send(authRequest)
        
        const gamepadRequest = JSON.stringify({
            'message': 'gamepadChanged',
            'gamepadIndex': 0,
            'wasAdded': true,
        })
        this.send(gamepadRequest)
    }
    
    onMessage(event) {
        console.log('xCloudPlayer Channel/Control.ts - ['+this._channelName+'] onMessage:', event)

        const jsonMessage = JSON.parse(event.data)
        console.log('xCloudPlayer Channel/Control.ts - Received json:', jsonMessage)
    }

    onClose(event) {
        super.onClose(event)
        // console.log('xCloudPlayer Channel/Control.ts - ['+this._channelName+'] onClose:', event)
    }

    requestKeyframeRequest() {
        console.log('xCloudPlayer Channel/Control.ts - ['+this._channelName+'] User requested Video KeyFrame')
        const keyframeRequest = JSON.stringify({
            message: 'videoKeyframeRequested',
            ifrRequested: true,
        })

        this.send(keyframeRequest)
    }
}