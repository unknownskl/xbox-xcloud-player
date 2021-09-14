import { Client } from "../Library";

export default class BaseChannel {

    _queue:Array<Buffer> = []
    _client:Client;
    _channelName:string;
    _state:'new'|'connected'|'closing'|'closed';

    constructor(channelName:string, client:Client) {
        this._channelName = channelName;
        this._client = client;
        this._state = 'new';
    }
    
    // Events
    onOpen(event) {
        console.log('xCloudPlayer Channels/Base.ts - ['+this._channelName+'] onOpen:', event)

        this._state = 'connected'
    }
    
    // onMessage(event) {
    //     console.log('xSDK channel/base.js - ['+this._channelName+'] onMessage:', event)
    // }

    onClosing(event) {
        console.log('xCloudPlayer Channels/Base.ts - ['+this._channelName+'] onClosing:', event)

        this._state = 'closing'
    }

    onClose(event) {
        console.log('xCloudPlayer Channels/Base.ts - ['+this._channelName+'] onClose:', event)

        this._state = 'closed'
    }

    // Queue functions
    getQueueLength() {
        return this._queue.length
    }

    addToQueue(data:Buffer) {
        this._queue.push(data)
    }

    // Channel functions
    send(data) {
        var channel = this.getClient().getChannel(this._channelName);

        // Encode to ArrayBuffer if not ArrayBuffer
        if(typeof data === 'string'){
            data = (new TextEncoder).encode(data)
        }
        
        if(channel.readyState === 'open') {
            if(this._channelName !== 'input')
                console.log('xSDK channels/base.js - ['+this._channelName+'] Sending message:', data)

            channel.send(data)
        } else {
            console.warn('xSDK channels/base.js - ['+this._channelName+'] Channel is closed. Failed to send packet:', data)
        }
    }

    // Base functions
    getClient() {
        return this._client
    }
}