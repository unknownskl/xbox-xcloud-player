import {InputFrame} from '../Channel/Input'

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


export type MouseKeyboardMapping = {
    [keyCode: string]: (keyof InputFrame) | undefined;
};

export class MouseKeyboardConfig {
    _keymapping: MouseKeyboardMapping

    constructor(args: {keymapping?: MouseKeyboardMapping}) {
        if(args.keymapping === undefined) {
            this._keymapping = MouseKeyboardConfig.defaultMapping()
        } else {
            this._keymapping = args.keymapping
        }
    }

    private static defaultMapping(): MouseKeyboardMapping {
        return {
            [KEYCODE_ARROW_LEFT]: 'DPadLeft',
            [KEYCODE_ARROW_UP]: 'DPadUp',
            [KEYCODE_ARROW_RIGHT]: 'DPadRight',
            [KEYCODE_ARROW_DOWN]: 'DPadDown',

            [KEYCODE_ENTER]: 'A',
            [KEYCODE_KEY_A]: 'A',

            [KEYCODE_BACKSPACE]: 'B',
            [KEYCODE_KEY_B]: 'B',

            [KEYCODE_KEY_X]: 'X',
            [KEYCODE_KEY_Y]: 'Y',

            [KEYCODE_KEY_LEFT_BRACKET]: 'LeftShoulder',
            [KEYCODE_KEY_RIGHT_BRACKET]: 'RightShoulder',

            [KEYCODE_MINUS]: 'LeftTrigger',
            [KEYCODE_EQUALS]: 'RightTrigger',

            [KEYCODE_KEY_V]: 'View',
            [KEYCODE_KEY_M]: 'Menu',
            [KEYCODE_KEY_N]: 'Nexus',
        }
    }

    static default(): MouseKeyboardConfig {
        return new MouseKeyboardConfig({})
    }
}

export default class KeyboardDriver {
    _mouseKeyboardConfig: MouseKeyboardConfig
    constructor(mouseKeyboardConfig: MouseKeyboardConfig) {
        this._mouseKeyboardConfig = mouseKeyboardConfig
        console.log('MouseConfig /// ', this._mouseKeyboardConfig)
    }


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
        console.log("Key ", e.key)
        const val = down ? 1 : 0

        const mappedButton = this._mouseKeyboardConfig._keymapping[e.key]

        if(mappedButton === undefined) {
            return
        }

        this._keyboardState[mappedButton] = val
    }

    requestState(): InputFrame {
        return this._keyboardState
    }

    pressButton(button: keyof InputFrame) {
        this._keyboardState[button] = 1
        setTimeout(() => {
            this._keyboardState[button] = 0
        }, 60)
    }

}