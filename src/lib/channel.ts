import xCloudPlayer from '../player'

export type ChannelSendData = string | Blob | ArrayBuffer | ArrayBufferView<ArrayBuffer>

export default class Channel {
    private _player:xCloudPlayer
    private _dataChannel:RTCDataChannel

    constructor(player:xCloudPlayer) {
        this._player = player
        // console.log('creating data channel: ', this.constructor.name, this, this.getChannelConfig())

        this._dataChannel = this._player._peerConnection.createDataChannel(this.getChannelName(), this.getChannelConfig())

        this._dataChannel.onopen = this.onOpen.bind(this)
        this._dataChannel.onmessage = this.onMessage.bind(this)
        this._dataChannel.onclosing = this.onClosing.bind(this)
        this._dataChannel.onclose = this.onClose.bind(this)
        this._dataChannel.onerror = this.onError.bind(this)
    }

    // Channel config functions
    getChannelName():string {
        return 'channel'
    }

    getChannelConfig():RTCDataChannelInit {
        return { }
    }

    // Default channel functions
    onOpen(event:Event):void {
        console.log(this.getChannelName(), 'Opening channel:', event)
    }

    onMessage(event:MessageEvent<unknown>):void {
        console.log(this.getChannelName(), 'Message channel:', event)
    }

    onClosing(event:Event):void {
        console.log(this.getChannelName(), 'Closing channel:', event)
    }

    onClose(event:Event):void {
        console.log(this.getChannelName(), 'Closed channel:', event)
    }

    onError(event:Event):void {
        console.log(this.getChannelName(), 'Error channel:', event)
    }

    send(data:ChannelSendData):void {
        if(this._dataChannel.readyState !== 'open'){
            console.log('['+this.getChannelName()+'] Tried to send data while channel is not open. readyState is:', this._dataChannel.readyState)
            return
        }

        if(typeof data === 'string'){
            const encoded = (new TextEncoder).encode(data)
            this._dataChannel.send(encoded)
            return
        }

        if(data instanceof Blob){
            this._dataChannel.send(data)
            return
        }

        if(data instanceof ArrayBuffer){
            this._dataChannel.send(data)
            return
        }

        this._dataChannel.send(data)
    }

    getPlayer():xCloudPlayer{
        return this._player
    }

    // Channel destroy function
    destroy():void {}
}