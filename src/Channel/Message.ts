import Channel from '../lib/channel'

export default class MessageChannel extends Channel {
    getChannelName() {
        return 'message'
    }

    getChannelConfig() {
        return {
            protocol: 'messageV1',
        }
    }

    destroy() {
        // console.log('DebugChannel destroy() called')
    }
}