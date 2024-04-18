import Channel from '../lib/channel'

export default class ChatChannel extends Channel {
    getChannelName() {
        return 'chat'
    }

    getChannelConfig() {
        return {
            protocol: 'chatV1',
        }
    }

    destroy() {
        // console.log('DebugChannel destroy() called')
    }
}