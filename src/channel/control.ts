import Channel from '../lib/channel'

export default class ControlChannel extends Channel {
    _keyframeInterval

    getChannelName() {
        return 'control'
    }

    getChannelConfig() {
        return {
            protocol: 'controlV1', // @TODO: Implement V2 for reliable input and unreliable input channels
            ordered: 0,
            maxRetransmits: 0,
        }
    }

    destroy() {
        // console.log('DebugChannel destroy() called')
        clearInterval(this._keyframeInterval)
    }

    sendAuthorization(){
        const authRequest = JSON.stringify({
            'message':'authorizationRequest',
            'accessKey':'4BDB3609-C1F1-4195-9B37-FEFF45DA8B8E',
        })

        this.send(authRequest)

        this.sendGamepadState(0, true)
        this.sendGamepadState(0, false)

        this._keyframeInterval = setInterval(() => {
            console.log('Requesting KeyFrame...')
            this.requestKeyframeRequest()
        }, 3000)
    }

    sendGamepadState(gamepadIndex, wasAdded = true) {
        const gamepadRequest = JSON.stringify({
            'message': 'gamepadChanged',
            'gamepadIndex': gamepadIndex,
            'wasAdded': wasAdded,
        })
        this.send(gamepadRequest)
    }

    requestKeyframeRequest(ifrRequested = false) {
        // console.log('xCloudPlayer Channel/Control.ts - ['+this._channelName+'] User requested Video KeyFrame')
        const keyframeRequest = JSON.stringify({
            message: 'videoKeyframeRequested',
            ifrRequested: ifrRequested,
        })

        this.send(keyframeRequest)
    }
}