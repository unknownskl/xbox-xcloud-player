import xCloudPlayer from '../Library'
import { InputFrame } from '../Channel/Input'
import Driver from './Driver'

const KEYCODE_KEY_N = 'n'

export default class GamepadDriver implements Driver {

    _application: xCloudPlayer | null = null

    _shadowGamepad = {
        0: {
            A: 0,
            B: 0,
            X: 0,
            Y: 0,
            LeftShoulder: 0,
            RightShoulder: 0,
            LeftTrigger: 0,
            RightTrigger: 0,
            View: 0,
            Menu: 0,
            LeftThumb: 0,
            RightThumb: 0,
            DPadUp: 0,
            DPadDown: 0,
            DPadLeft: 0,
            DPadRight: 0,
            Nexus: 0,

            LeftThumbXAxis: 0.0,
            LeftThumbYAxis: 0.0,
            RightThumbXAxis: 0.0,
            RightThumbYAxis: 0.0,
        },
    }

    _activeGamepads = { 0: false, 1: false, 2: false, 3: false}
    _activeGamepadsInterval

    _nexusOverrideN = false

    // constructor() {
    // }

    setApplication(application: xCloudPlayer) {
        this._application = application
    }

    start() {
        this._activeGamepads = { 0: false, 1: false, 2: false, 3: false}
        
        // console.log('xCloudPlayer Driver/Gamepad.ts - Start collecting events:', this._gamepads)
        this._activeGamepadsInterval = setInterval(() => {
            const gamepads = navigator.getGamepads()

            for (let gamepad = 0; gamepad < gamepads.length; gamepad++) {

                // Skip gamepad 0 as we always keep this one connected
                if(gamepad === 0) {return}

                // Check if the control channel is open
                if(this._application?.getChannelProcessor('control') === undefined) {return}

                if(gamepads[gamepad] === null && this._activeGamepads[gamepad] === true) {
                    this._application?.getChannelProcessor('control').sendGamepadRemoved(gamepad)
                    this._activeGamepads[gamepad] = false
                    return
                }

                if(gamepads[gamepad] !== null && this._activeGamepads[gamepad] === false) {
                    this._application?.getChannelProcessor('control').sendGamepadAdded(gamepad)
                    this._activeGamepads[gamepad] = true
                    return
                }
            }
        }, 500)

        window.addEventListener('keydown', this._downFunc)
        window.addEventListener('keyup', this._upFunc)
    }

    stop() {
        // console.log('xCloudPlayer Driver/Gamepad.ts - Stop collecting events:', this._gamepads)
        clearInterval(this._activeGamepadsInterval)

        window.removeEventListener('keydown', this._downFunc)
        window.removeEventListener('keyup', this._upFunc)
    }

    _downFunc = (e: KeyboardEvent) => { this.onKeyChange(e, true) }
    _upFunc = (e: KeyboardEvent) => { this.onKeyChange(e, false) }

    onKeyChange(e: KeyboardEvent, down: boolean) {
        switch (e.key) {
            case KEYCODE_KEY_N:
                this._nexusOverrideN = down
                break
        }
    }

    pressButton(index:number, button:string){
        this._shadowGamepad[index][button] = 1
        this._application?.getChannelProcessor('input').queueGamepadState(this._shadowGamepad[index])

        setTimeout(() => {
            this._shadowGamepad[index][button] = 0
            this._application?.getChannelProcessor('input').queueGamepadState(this._shadowGamepad[index])
        }, 60)
    }

    // Only ran when new gamepad driver is selected
    run(){
        const gpState = this.requestStates()

        if(gpState[0] !== undefined) {
            if(this._nexusOverrideN === true){
                gpState[0].Nexus = 1
            }
        }

        this._application?.getChannelProcessor('input')._inputFps.count()
        this._application?.getChannelProcessor('input').queueGamepadStates(gpState)

        // requestAnimationFrame(() => { this.run() })
        setTimeout(() => { this.run() }, 1000 / 60)
    }

    requestStates():Array<InputFrame> {
        const gamepads = navigator.getGamepads()
        // let foundActive = false
        const states:Array<InputFrame> = []
        for (let gamepad = 0; gamepad < gamepads.length; gamepad++) {
            const gamepadState = gamepads[gamepad]

            if (gamepadState !== null && gamepadState.connected) {
                const state = this.mapStateLabels(gamepadState.buttons, gamepadState.axes)
                state.GamepadIndex = gamepadState.index
                states.push(state)
            }
        }

        return states
    }

    mapStateLabels(buttons, axes) {
        return {
            A: buttons[0]?.value || this._shadowGamepad[0].A || 0,
            B: buttons[1]?.value || this._shadowGamepad[0].B || 0,
            X: buttons[2]?.value || this._shadowGamepad[0].X || 0,
            Y: buttons[3]?.value || this._shadowGamepad[0].Y || 0,
            LeftShoulder: buttons[4]?.value || 0,
            RightShoulder: buttons[5]?.value || 0,
            LeftTrigger: buttons[6]?.value || 0,
            RightTrigger: buttons[7]?.value || 0,
            View: buttons[8]?.value || 0,
            Menu: buttons[9]?.value || 0,
            LeftThumb: buttons[10]?.value || 0,
            RightThumb: buttons[11]?.value || 0,
            DPadUp: buttons[12]?.value || 0,
            DPadDown: buttons[13]?.value || 0,
            DPadLeft: buttons[14]?.value || 0,
            DPadRight: buttons[15]?.value || 0,
            Nexus: buttons[16]?.value || (buttons[8]?.value && buttons[9]?.value) || this._shadowGamepad[0].Nexus || 0,
            LeftThumbXAxis: axes[0],
            LeftThumbYAxis: axes[1],
            RightThumbXAxis: axes[2],
            RightThumbYAxis: axes[3],
        } as InputFrame
    }
}