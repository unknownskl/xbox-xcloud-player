import { InputFrame } from '../Channel/Input'

const KEYCODE_ARROW_LEFT = 'ArrowLeft'
const KEYCODE_ARROW_UP = 'ArrowUp'
const KEYCODE_ARROW_RIGHT = 'ArrowRight'
const KEYCODE_ARROW_DOWN = 'ArrowDown'

const KEYCODE_KEY_A = 'a'
const KEYCODE_ENTER = 'Enter'

const KEYCODE_KEY_B = 'b'
const KEYCODE_BACKSPACE = 'Backspace'

const KEYCODE_KEY_X = 'x'
const KEYCODE_KEY_Y = 'y'
const KEYCODE_KEY_N = 'n'
const KEYCODE_KEY_LEFT_BRACKET = '['
const KEYCODE_KEY_RIGHT_BRACKET = ']'

const KEYCODE_KEY_V = 'v'
const KEYCODE_KEY_M = 'm'

const KEYCODE_MINUS = '-'
const KEYCODE_EQUALS = '='


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
        switch (e.key) {
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