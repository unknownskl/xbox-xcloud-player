import xCloudPlayer from '../Library'

export default class BaseChannel {

    _client:xCloudPlayer;
    _channelName:string;
    _state:'new'|'connected'|'closing'|'closed';

    _events = {
        'state': [],
    }

    constructor(channelName:string, client:xCloudPlayer) {
        this._channelName = channelName
        this._client = client
        this._state = 'new'
    }
    
    // Events
    onOpen(event) {
        console.log('xCloudPlayer Channels/Base.ts - ['+this._channelName+'] onOpen:', event)
        this.setState('connected')
    }
    
    // onMessage(event) {
    //     console.log('xSDK channel/base.js - ['+this._channelName+'] onMessage:', event)
    // }

    onClosing(event) {
        console.log('xCloudPlayer Channel/Base.ts - ['+this._channelName+'] onClosing:', event)
        this.setState('closing')
    }

    onClose(event) {
        console.log('xCloudPlayer Channel/Base.ts - ['+this._channelName+'] onClose:', event)
        this.setState('closed')
    }

    destroy() {
        // Called when we want to destroy the channel.
    }

    setState(state) {
        this._state = state
        this.emitEvent('state', {
            state: this._state,
        })
    }

    // Channel functions
    send(data) {
        const channel = this.getClient().getChannel(this._channelName)

        // Encode to ArrayBuffer if not ArrayBuffer
        
        if(channel.readyState === 'open') {
            if(this._channelName !== 'input') {
                console.log('xCloudPlayer Channel/Base.ts - ['+this._channelName+'] Sending message:', data)
            }

            if(typeof data === 'string'){
                data = (new TextEncoder).encode(data)
            }

            channel.send(data)
        } else {
            console.warn('xCloudPlayer Channel/Base.ts - ['+this._channelName+'] Channel is closed. Failed to send packet:', data)
        }
    }

    // Base functions
    getClient() {
        return this._client
    }

    addEventListener(name, callback) {
        this._events[name].push(callback)
    }

    emitEvent(name, event) {
        for(const callback in this._events[name]){
            this._events[name][callback](event)
        }
    }
}