import { v4 as uuidv4 } from 'uuid'

import Channel from '../lib/channel'
import MessageHandler from './message/handler'

export default class MessageChannel extends Channel {
    _handshakeCompleted = false

    getChannelName() {
        return 'message'
    }

    getChannelConfig() {
        return {
            protocol: 'messageV1',
        }
    }

    onOpen() {
        console.log('[MessageChannel] Sending handshake...')
        const handshake = JSON.stringify({
            'type':'Handshake',
            'version':'messageV1',
            'id':'f9c5f412-0e69-4ede-8e62-92c7f5358c56',
            'cv':'',
        })
        this.send(handshake)
    }

    onMessage(event: MessageEvent<any>) {
        const data = JSON.parse(event.data)
        // console.log('[MessageChannel] received:', data)

        switch(data.type){
            case 'HandshakeAck':
                console.log('[MessageChannel] Handshake completed')
                this._handshakeCompleted = true
                // Start control & input channels
                this.getPlayer()._channels.control.sendAuthorization()
                this.getPlayer()._channels.input.start()
                this.sendConfig()
                break

            case 'TransactionStart':
            case 'Message':
                new MessageHandler(this, data)
                break

            default:
                console.log('[MessageChannel] Unhandled message type:', data.type, data)
        }

    }

    sendConfig(){
        const systemUis = [10, 19, 31, 27, 32, -41]
        const systemVersion = [0, 1, 0]
        const uiConfig = JSON.stringify(this.generateMessage('/streaming/systemUi/configuration', {
            'version': systemVersion,
            'systemUis': systemUis, // Xbox Windows app has [33], xCloud has [10,19,31,27,32,-41]
            
            // 10 = ShowVirtualKeyboard
            // 19 = ShowMessageDialog
            // 31 = ShowApplication
            // 27 = ShowPurchase
            // 32 = ShowTimerExtensions
            // 33 = Xbox windows app, disables the nexus menu on xCloud (Alt nexus menu?)
            // -44 = unknown
            // 40 = unknown
            // 41 = unknown
            // -43 = unknown

            // Possible options: Keyboard, PurchaseModal
        }))
        this.send(uiConfig)

        const clientConfig = JSON.stringify(this.generateMessage('/streaming/properties/clientappinstallidchanged', { 'clientAppInstallId': 'c11ddb2e-c7e3-4f02-a62b-fd5448e0b851' }))
        this.send(clientConfig)

        const orientationConfig = JSON.stringify(this.generateMessage('/streaming/characteristics/orientationchanged', { 'orientation': 0 }))
        this.send(orientationConfig)

        const touchConfig = JSON.stringify(this.generateMessage('/streaming/characteristics/touchinputenabledchanged', { 'touchInputEnabled': false }))
        this.send(touchConfig)

        const deviceConfig = JSON.stringify(this.generateMessage('/streaming/characteristics/clientdevicecapabilities', {}))
        this.send(deviceConfig)

        const dimensionsConfig = JSON.stringify(this.generateMessage('/streaming/characteristics/dimensionschanged', {
            'horizontal': 1920,
            'vertical': 1080,
            'preferredWidth': 1920,
            'preferredHeight': 1080,
            'safeAreaLeft': 0,
            'safeAreaTop': 0,
            'safeAreaRight': 1920,
            'safeAreaBottom': 1080,
            'supportsCustomResolution':true,
        }))
        this.send(dimensionsConfig)
    }

    generateMessage(path, data) {
        return {
            'type': 'Message',
            'content': JSON.stringify(data),
            'id': uuidv4(),
            'target': path,
            'cv': '',
        }
    }

    destroy() {
        // console.log('DebugChannel destroy() called')
    }
}