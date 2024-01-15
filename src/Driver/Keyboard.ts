import { InputFrame } from '../Channel/Input'

const KEYCODE_ARROW_LEFT = 37
const KEYCODE_ARROW_UP = 38
const KEYCODE_ARROW_RIGHT = 39
const KEYCODE_ARROW_DOWN = 40

const KEYCODE_KEY_A = 65
const KEYCODE_ENTER = 13

const KEYCODE_KEY_B = 66
const KEYCODE_BACKSPACE = 8

const KEYCODE_KEY_X = 88
const KEYCODE_KEY_Y = 89
const KEYCODE_KEY_N = 78
const KEYCODE_KEY_LEFT_BRACKET = 219
const KEYCODE_KEY_RIGHT_BRACKET = 221

const KEYCODE_KEY_V = 86
const KEYCODE_KEY_M = 77

const KEYCODE_MINUS = 189
const KEYCODE_EQUALS = 187


export default class KeyboardDriver {

    _keyboardState = {
        GamepadIndex: 0,
        Nexus: 0,
        Menu: 0,
        View: 0,
        A: 0,
        B: 0,
        X: 0,
        Y: 0,
        DPadUp: 0,
        DPadDown: 0,
        DPadLeft: 0,
        DPadRight: 0,
        LeftShoulder: 0,
        RightShoulder: 0,
        LeftThumb: 0,
        RightThumb: 0,

        LeftThumbXAxis: 0.0,
        LeftThumbYAxis: 0.0,
        RightThumbXAxis: 0.0,
        RightThumbYAxis: 0.0,
        LeftTrigger: 0.0,
        RightTrigger: 0.0,
    } as InputFrame

    _downFunc = (e: KeyboardEvent) => { this.onKeyChange(e, true) }
    _upFunc = (e: KeyboardEvent) => { this.onKeyChange(e, false) }

    start() {
        window.addEventListener('keydown', this._downFunc)
        window.addEventListener('keyup', this._upFunc)
    }

    stop() {
        window.removeEventListener('keydown', this._downFunc)
        window.removeEventListener('keyup', this._upFunc)
    }

    onKeyDown(e) { this.onKeyChange(e, true) }
    onKeyUp(e) { this.onKeyChange(e, false) }

    onKeyChange(e: KeyboardEvent, down: boolean) {
        const val = down ? 1 : 0
        switch (e.keyCode) {
            case KEYCODE_ARROW_LEFT:
                this._keyboardState.DPadLeft = val
                break
            case KEYCODE_ARROW_UP:
                this._keyboardState.DPadUp = val
                break
            case KEYCODE_ARROW_RIGHT:
                this._keyboardState.DPadRight = val
                break
            case KEYCODE_ARROW_DOWN:
                this._keyboardState.DPadDown = val
                break
            case KEYCODE_ENTER:
            case KEYCODE_KEY_A:
                this._keyboardState.A = val
                break
            case KEYCODE_BACKSPACE:
            case KEYCODE_KEY_B:
                this._keyboardState.B = val
                break
            case KEYCODE_KEY_X:
                this._keyboardState.X = val
                break
            case KEYCODE_KEY_Y:
                this._keyboardState.Y = val
                break
            case KEYCODE_KEY_LEFT_BRACKET:
                this._keyboardState.LeftShoulder = val
                break
            case KEYCODE_KEY_RIGHT_BRACKET:
                this._keyboardState.RightShoulder = val
                break
            case KEYCODE_KEY_V:
                this._keyboardState.View = val
                break
            case KEYCODE_KEY_M:
                this._keyboardState.Menu = val
                break
            case KEYCODE_KEY_N:
                this._keyboardState.Nexus = val
                break
            case KEYCODE_MINUS:
                this._keyboardState.LeftTrigger = val
                break
            case KEYCODE_EQUALS:
                this._keyboardState.RightTrigger = val
                break
        }
    }

    requestState(): InputFrame {
        return this._keyboardState
    }

    pressButton(button:string) {
        this._keyboardState[button] = true
        setTimeout(() => {
            this._keyboardState[button] = false
        }, 60)
    }

}