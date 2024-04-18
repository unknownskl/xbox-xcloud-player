import Channel from '../lib/channel'

export default class ControlChannel extends Channel {
    getChannelName() {
        return 'control'
    }

    getChannelConfig() {
        return {
            protocol: 'controlV1',
        }
    }

    destroy() {
        // console.log('DebugChannel destroy() called')
    }
}