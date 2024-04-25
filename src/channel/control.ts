import Gamepad from '../input/gamepad'
import MouseKeyboard from '../input/mousekeyboard'
import Touch from '../input/touch'
import Channel from '../lib/channel'

interface GamepadHandlers {
    0: undefined|Gamepad|MouseKeyboard|Touch;
    1: undefined|Gamepad|MouseKeyboard|Touch;
    2: undefined|Gamepad|MouseKeyboard|Touch;
    3: undefined|Gamepad|MouseKeyboard|Touch;
}

export default class ControlChannel extends Channel {
    _keyframeInterval
    _gamepadHandlers:GamepadHandlers = {
        0: undefined,
        1: undefined,
        2: undefined,
        3: undefined,
    }

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

        this._gamepadHandlers[0]?.detach()
        this._gamepadHandlers[1]?.detach()
        this._gamepadHandlers[2]?.detach()
        this._gamepadHandlers[3]?.detach()
    }

    sendAuthorization(){
        const authRequest = JSON.stringify({
            'message':'authorizationRequest',
            'accessKey':'4BDB3609-C1F1-4195-9B37-FEFF45DA8B8E',
        })

        this.send(authRequest)

        this.sendGamepadState(0, true)
        this.sendGamepadState(0, false)

        if(this.getPlayer()._config.keyframe_interval > 0) {
            this._keyframeInterval = setInterval(() => {
                this.requestKeyframeRequest()
            }, this.getPlayer()._config.keyframe_interval*1000)
        }
    }

    sendGamepadState(gamepadIndex, wasAdded = true, handler:undefined|Gamepad|MouseKeyboard|Touch = undefined) {
        if(handler !== undefined){
            this._gamepadHandlers[gamepadIndex] = handler
        }

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