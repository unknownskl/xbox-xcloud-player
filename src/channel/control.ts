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

    sendAuthorization(){
        const authRequest = JSON.stringify({
            'message':'authorizationRequest',
            'accessKey':'4BDB3609-C1F1-4195-9B37-FEFF45DA8B8E',
        })

        this.send(authRequest)
    }
}