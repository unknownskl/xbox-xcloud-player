import xCloudPlayer from "../Library"
import { InputFrame } from '../Channel/Input'

export default class GammepadDriver {

    _application:xCloudPlayer

    _gamepads:Array<any> = []

    constructor(application:xCloudPlayer) {
        this._application = application

        window.addEventListener("gamepadconnected", (e) => {

            var gamepad = {
                index: e.gamepad.index,
                name: e.gamepad.id,
                buttons: e.gamepad.buttons,
                axes: e.gamepad.axes,
            }
            this._gamepads.push(gamepad)

            this._application.getEventBus().emit('gamepad_connect', gamepad)
            console.log('xCloudPlayer Driver/Gamepad.ts - Controller connected:', this._gamepads)
        })

        window.addEventListener("gamepaddisconnected", (e) => {
            for(var gamepad in this._gamepads){
                if(this._gamepads[gamepad].index === e.gamepad.index){
                    var removedGamepad = this._gamepads[gamepad]
                    this._gamepads.splice(e.gamepad.index, 1)

                    this._application.getEventBus().emit('gamepad_disconnect', removedGamepad)
                    console.log('xCloudPlayer Driver/Gamepad.ts - Controller disconnected:', this._gamepads)
                }
            }
        })
    }

    start() {
        // console.log('xCloudPlayer Driver/Gamepad.ts - Start collecting events:', this._gamepads)
    }

    stop() {
        // console.log('xCloudPlayer Driver/Gamepad.ts - Stop collecting events:', this._gamepads)
    }

    requestState() {
        for(var gamepad in this._gamepads){
            var gamepadState = navigator.getGamepads()[this._gamepads[gamepad].index]
            const state = this.mapStateLabels(gamepadState?.buttons, gamepadState?.axes)

            state.GamepadIndex = this._gamepads[gamepad].index

            this._application.getChannelProcessor('input').queueGamepadState(state)
        }
    }

    mapStateLabels(buttons, axes) {
        return {
            A: buttons[0].value,
            B: buttons[1].value,
            X: buttons[2].value,
            Y: buttons[3].value,
            LeftShoulder: buttons[4].value,
            RightShoulder: buttons[5].value,
            LeftTrigger: buttons[6].value,
            RightTrigger: buttons[7].value,
            View: buttons[8].value,
            Menu: buttons[9].value,
            LeftThumb: buttons[10].value,
            RightThumb: buttons[11].value,
            DPadUp: buttons[12].value,
            DPadDown: buttons[13].value,
            DPadLeft: buttons[14].value,
            DPadRight: buttons[15].value,
            Nexus: buttons[16].value,
            LeftThumbXAxis: axes[0],
            LeftThumbYAxis: axes[1],
            RightThumbXAxis: axes[2],
            RightThumbYAxis: axes[3]
        } as InputFrame
    }
}