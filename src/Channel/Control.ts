import BaseChannel from './Base'

export default class ControlChannel extends BaseChannel {

    onOpen(event) {
        super.onOpen(event)
        // console.log('xCloudPlayer Channel/Control.ts - ['+this._channelName+'] onOpen:', event)

        // const data = JSON.stringify({
        //     'message':'rateControlBitrateUpdate',
        //     'bitratebps': (7500*1000), // min = 512, max = 12000, default = 5000 (value = * 1000)
        // })
        // this.send(data)

        const videoConfigRequest = JSON.stringify({
            'message':'videoChannelConfigUpdate',
            'maxVideoSctpMessageSizeBytes': 16000, // min = 512, max = 12000, default = 5000 (value = * 1000)
            'supportedFormats': [
                {
                    'container': 'mp4',
                    'codec': 'hevc',
                    'profile': 2,
                },
                {
                    'container': 'mp4',
                    'codec': 'avc',
                    'profile': 2,
                },
                {
                    'container': 'mp4',
                    'codec': 'avc',
                    'profile': 1,
                },
                {
                    'container': 'annexb',
                    'codec': 'avc',
                    'profile': 2,
                },
                {
                    'container': 'annexb',
                    'codec': 'avc',
                    'profile': 1,
                },
            ],
        })
        this.send(videoConfigRequest)
    }
    
    onMessage(event) {
        console.log('xCloudPlayer Channel/Control.ts - ['+this._channelName+'] onMessage:', event)

        const jsonMessage = JSON.parse(event.data)
        console.log('xCloudPlayer Channel/Control.ts - Received json:', jsonMessage)

        if(jsonMessage.messageType === 'videoChannelConfig'){
            // Load config:
            // let streamFormat = {
            //     "codec":"avc",
            //     "container":"mp4",
            //     "frameRate":60,
            //     "height":1080,
            //     "mimeType":"video/mp4; codecs=\"avc1.4d0020\"",
            //     "profile":2,
            //     "width":1920
            // }

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