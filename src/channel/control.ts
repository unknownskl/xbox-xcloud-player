import Gamepad from '../input/gamepad'
import MouseKeyboard from '../input/mousekeyboard'
import Touch from '../input/touch'
import Channel from '../lib/channel'

export type GamepadSlotIndex = 0 | 1 | 2 | 3

export type InputHandler = Gamepad | MouseKeyboard | Touch

export interface GamepadHandlers {
    0: undefined|InputHandler;
    1: undefined|InputHandler;
    2: undefined|InputHandler;
    3: undefined|InputHandler;
}

export default class ControlChannel extends Channel {
    _keyframeInterval: ReturnType<typeof setInterval> | undefined
    _gamepadHandlers:GamepadHandlers = {
        0: undefined,
        1: undefined,
        2: undefined,
        3: undefined,
    }

    getChannelName():string {
        return 'control'
    }

    getChannelConfig():RTCDataChannelInit {
        return {
            protocol: 'controlV1',
            ordered: true,
        }
    }

    destroy():void {
        // console.log('DebugChannel destroy() called')
        clearInterval(this._keyframeInterval)

        this._gamepadHandlers[0]?.detach()
        this._gamepadHandlers[1]?.detach()
        this._gamepadHandlers[2]?.detach()
        this._gamepadHandlers[3]?.detach()
    }

    sendAuthorization():void{
        const authRequest = JSON.stringify({
            'message':'authorizationRequest',
            'accessKey':'4BDB3609-C1F1-4195-9B37-FEFF45DA8B8E',
        })

        this.send(authRequest)

        this.sendGamepadState(0, true)
        this.sendGamepadState(0, false)

        if(this.getPlayer()._config.keyframe_interval > 0) {
            this._keyframeInterval = setInterval(() => {
                this.requestKeyframeRequest(true)
            }, this.getPlayer()._config.keyframe_interval*1000)
        }
    }

    private isGamepadSlotIndex(index:number): index is GamepadSlotIndex {
        return index === 0 || index === 1 || index === 2 || index === 3
    }

    sendGamepadState(gamepadIndex:number, wasAdded:boolean = true, handler:undefined|InputHandler = undefined):void {
       
        if(this.isGamepadSlotIndex(gamepadIndex)){
            if(wasAdded === true){
                if(handler !== undefined){
                    if(this._gamepadHandlers[gamepadIndex] !== undefined){
                        this._gamepadHandlers[gamepadIndex]?.detach()
                    }
                    this._gamepadHandlers[gamepadIndex] = handler
                }
            } else {
                this._gamepadHandlers[gamepadIndex] = undefined
            }
        }

        const gamepadRequest = JSON.stringify({
            'message': 'gamepadChanged',
            'gamepadIndex': gamepadIndex,
            'wasAdded': wasAdded,
        })
        this.send(gamepadRequest)
    }

    requestKeyframeRequest(ifrRequested:boolean = false):void {
        // console.log('xCloudPlayer Channel/Control.ts - ['+this._channelName+'] User requested Video KeyFrame')
        const keyframeRequest = JSON.stringify({
            message: 'videoKeyframeRequested',
            ifrRequested: ifrRequested,
        })

        this.send(keyframeRequest)
    }

    getGamepadHandlers():GamepadHandlers{
        return this._gamepadHandlers
    }

    getGamepadHandler(index:number):Gamepad|undefined{
        const handlers = this.getPlayer()._channels.control.getGamepadHandlers()
        for(const slot of [0, 1, 2, 3] as const){
            const handler = handlers[slot]
            if(
                handler instanceof Gamepad &&
                handler.getPhysicalGamepadId() === index
            ) {
                return handler
            }
        }

        return undefined
    }
}