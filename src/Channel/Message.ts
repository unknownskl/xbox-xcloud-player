import BaseChannel from './Base'

export default class MessageChannel extends BaseChannel {

    onOpen(event) {
        super.onOpen(event)
        // console.log('xCloudPlayer Channel/Message.ts - ['+this._channelName+'] onOpen:', event)

        var handshake = JSON.stringify({
            "type":"Handshake",
            "version":"messageV1",
            "id":"0ab125e2-6eee-4687-a2f4-5cfb347f0643",
            "cv":""
        })
        this.send(handshake)

        var data4 = JSON.stringify(this.generateMessage('/streaming/systemUi/configuration', {
            "version": [0,1,0],
            "systemUis":[10,19,31,27,32]
        }))
        this.send(data4)

        var data8 = JSON.stringify(this.generateMessage('/streaming/characteristics/dimensionschanged', {"horizontal":1920,"vertical":1080}))
        this.send(data8)
    }
    
    onMessage(event) {
        console.log('xCloudPlayer Channel/Message.ts - ['+this._channelName+'] onMessage:', event)
    }

    onClose(event) {
        super.onClose(event)
        // console.log('xCloudPlayer Channel/Message.ts - ['+this._channelName+'] onClose:', event)
    }

    generateMessage(path, data) {
        return {
            "type": "Message",
            "content": JSON.stringify(data),
            "id": "41f93d5a-900f-4d33-b7a1-2d4ca6747072",
            "target": path,
            "cv": ""
        }
    }
}