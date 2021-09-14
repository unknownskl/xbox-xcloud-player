import BaseChannel from './Base'

export default class DebugChannel extends BaseChannel {

    _events = {
        'dialog': [],
    }

    onOpen(event) {
        super.onOpen(event)

        // console.log('xCloudPlayer Channels/Debug.ts - ['+this._channelName+'] onOpen:', event)
    }
    
    onMessage(event) {
        console.log('xCloudPlayer Channels/Debug.ts - ['+this._channelName+'] onMessage:', event)
    }

    onClose(event) {
        super.onClose(event)
        // console.log('xCloudPlayer Channels/Debug.ts - ['+this._channelName+'] onClose:', event)
    }

    addEventListener(name, callback) {
        this._events[name].push(callback)
    }

    emitEvent(name, event) {
        for(var callback in this._events[name]){
            this._events[name][callback](event)
        }
    }
}