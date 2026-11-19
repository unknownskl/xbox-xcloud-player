import Channel from '../lib/channel'

export default class DebugChannel extends Channel {
    getChannelName():string {
        return 'debug'
    }

    getChannelConfig():RTCDataChannelInit {
        return { }
    }

    destroy():void {
        // console.log('DebugChannel destroy() called')
    }
}