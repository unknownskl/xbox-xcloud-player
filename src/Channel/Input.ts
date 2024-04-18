import Channel from '../lib/channel'

export default class InputChannel extends Channel {
    getChannelName() {
        return 'input'
    }

    getChannelConfig() {
        return {
            ordered: true,
            protocol: '1.0',
        }
    }

    destroy() {
        // console.log('DebugChannel destroy() called')
    }
}