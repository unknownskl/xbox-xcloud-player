import xCloudPlayer from '../player'

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
    getChannelName() {
        return 'channel'
    }

    getChannelConfig() {
        return { }
    }

    // Default channel functions
    onOpen() {
        console.log(this.getChannelName(), 'Opening channel...')
    }

    onMessage() { }
    onClosing() { }
    onClose() { }
    onError() { }

    // Channel destroy function
    destroy() {}
}