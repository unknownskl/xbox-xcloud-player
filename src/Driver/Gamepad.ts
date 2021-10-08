import xCloudPlayer from '../Library'
import { InputFrame } from '../Channel/Input'

export default class GamepadDriver {

    _application:xCloudPlayer|null = null

    _gamepads:Array<any> = []

    // constructor() {
    // }

    setApplication(application:xCloudPlayer) {
        this._application = application
    }

    start() {
        // console.log('xCloudPlayer Driver/Gamepad.ts - Start collecting events:', this._gamepads)
    }

    stop() {
        // console.log('xCloudPlayer Driver/Gamepad.ts - Stop collecting events:', this._gamepads)
    }

    requestState() {
        const gamepads = navigator.getGamepads()
        for(let gamepad = 0; gamepad < gamepads.length; gamepad++){
            const gamepadState = gamepads[gamepad]
            
            if(gamepadState !== null){
                const state = this.mapStateLabels(gamepadState.buttons, gamepadState.axes)
                state.GamepadIndex = 0 // @TODO: Could we use a second gamepad this way?

                this._application?.getChannelProcessor('input').queueGamepadState(state)
            }
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
            Nexus: buttons[16]?.value || 0,
            LeftThumbXAxis: axes[0],
            LeftThumbYAxis: axes[1],
            RightThumbXAxis: axes[2],
            RightThumbYAxis: axes[3],
        } as InputFrame
    }
}