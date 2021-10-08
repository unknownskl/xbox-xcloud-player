import BaseChannel from './Base'

export default class MessageChannel extends BaseChannel {

    onOpen(event) {
        super.onOpen(event)
        // console.log('xCloudPlayer Channel/Message.ts - ['+this._channelName+'] onOpen:', event)

        const handshake = JSON.stringify({
            'type':'Handshake',
            'version':'messageV1',
            'id':'0ab125e2-6eee-4687-a2f4-5cfb347f0643',
            'cv':'',
        })
        this.send(handshake)

        const systemUis = this.getClient()._config.ui_systemui || [10, 19, 31, 27, 32]
        const systemVersion = this.getClient()._config.ui_version || [0, 1, 0]
        const data4 = JSON.stringify(this.generateMessage('/streaming/systemUi/configuration', {
            'version': systemVersion,
            'systemUis':systemUis, // Xbox Windows app has [33], xCloud has [10,19,31,27,32]
            
            // 10
            // 19 = Modal UI
            // 31
            // 27
            // 32
            // 33 = Xbox windows app, disables the nexus menu on xCloud (Alt nexus menu?)
            // Possible options: Keyboard, PurchaseModal
        }))
        this.send(data4)

        const data8 = JSON.stringify(this.generateMessage('/streaming/characteristics/dimensionschanged', { 'horizontal':1920, 'vertical':1080 }))
        this.send(data8)
    }
    
    onMessage(event) {
        console.log('xCloudPlayer Channel/Message.ts - ['+this._channelName+'] onMessage:', event)

        const jsonMessage = JSON.parse(event.data)
        console.log('xCloudPlayer Channel/Message.ts - Received json:', jsonMessage)

        this.getClient().getEventBus().emit('message', {
            ...jsonMessage,
        })

    }

    onClose(event) {
        super.onClose(event)
        // console.log('xCloudPlayer Channel/Message.ts - ['+this._channelName+'] onClose:', event)
    }

    generateMessage(path, data) {
        return {
            'type': 'Message',
            'content': JSON.stringify(data),
            'id': '41f93d5a-900f-4d33-b7a1-2d4ca6747072',
            'target': path,
            'cv': '',
        }
    }

    sendTransaction(id, data) {
        const transaction = JSON.stringify({
            'type': 'TransactionComplete',
            'content': JSON.stringify(data),
            // 'content':'{\'Result\':0}',
            'id': id,
            'cv': '',
        })

        this.send(transaction)
    }
}