import Channel from '../lib/channel'

export default class DebugChannel extends Channel {
    getChannelName() {
        return 'debug'
    }

    getChannelConfig() {
        return { }
    }

    destroy():void {
        super.destroy()
    }
}