import xCloudPlayer from '../player'

export interface GamepadOptions {
    enable_keyboard?: boolean;
    keyboard_mapping?: {
        [key:string]: string;
    };
}

export interface GamepadOptionsDefaults {
    enable_keyboard: boolean;
    keyboard_mapping: {
        [key:string]: string;
    };
}

export default class Gamepad {
    private _player: xCloudPlayer | undefined
    private _index: number

    private _options:GamepadOptionsDefaults = {
        enable_keyboard: false,
        keyboard_mapping: {
            'A': 'Enter',
            'B': 'Backspace',
            'X': 'x',
            'Y': 'y',
            'DPadUp': 'ArrowUp',
            'DPadDown': 'ArrowDown',
            'DPadLeft': 'ArrowLeft',
            'DPadRight': 'ArrowRight',
            'LeftShoulder': '[',
            'RightShoulder': ']',
            'LeftThumb': 'l',
            'RightThumb': 'r',
            'LeftTrigger': '-',
            'RightTrigger': '=',
            'Menu': 'm',
            'View': 'v',
            'Nexus': 'n',
        },
    }

    private _listener = {
        keyDown: this.onKeyDown.bind(this),
        keyUp: this.onKeyUp.bind(this),
    }

    constructor(index:number, options:GamepadOptions = {}){
        this._index = index

        this._options = {
            ...this._options,
            ...options,
        }
    }

    attach(xCloudPlayer:xCloudPlayer){
        this._player = xCloudPlayer

        this._player._channels.control.sendGamepadState(this._index, true)

        if(this._options.enable_keyboard === true){
            window.addEventListener('keydown', this._listener.keyDown)
            window.addEventListener('keyup', this._listener.keyUp)
        }
    }

    detach(){
        if(this._player === undefined){
            console.log('[Gamepad] Player is not attached. this._player is:', this._player)
            return
        }
        this._player._channels.control.sendGamepadState(this._index, false)

        if(this._options.enable_keyboard === true){
            window.removeEventListener('keydown', this._listener.keyDown)
            window.removeEventListener('keyup', this._listener.keyUp)
        }
    }

    sendButtonState(button, value){
        if(this._player === undefined){
            console.log('[Gamepad] Player is not attached. this._player is:', this._player)
            return
        }

        if(! (button in this.getDefaultFamepadFrame())){
            console.log('[Gamepad] Invalid button:', button)
            return
        } else {

            const buttonPreset = this.getDefaultFamepadFrame()
            buttonPreset.GamepadIndex = this._index
            buttonPreset[button] = value

            return this._player._channels.input.queueGamepadFrame(buttonPreset)
        }
    }

    onKeyDown(event:KeyboardEvent){
        for(const button in this._options.keyboard_mapping){
            if(this._options.keyboard_mapping[button] === event.key){
                this.sendButtonState(button, 1)
            }
        }
        event.preventDefault()
    }

    onKeyUp(event:KeyboardEvent){
        for(const button in this._options.keyboard_mapping){
            if(this._options.keyboard_mapping[button] === event.key){
                this.sendButtonState(button, 0)
            }
        }
        event.preventDefault()
    }

    getDefaultFamepadFrame(){
        return {
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

            LeftThumbXAxis: 0,
            LeftThumbYAxis: 0,
            RightThumbXAxis: 0,
            RightThumbYAxis: 0,
            LeftTrigger: 0,
            RightTrigger: 0,
        }
    }
}