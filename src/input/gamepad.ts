import xCloudPlayer from '../player'
import { VibrationFrame } from '../channel/input'

export interface GamepadOptions {
    enable_keyboard?: boolean;
    enable_gamepad?: boolean;
    keyboard_mapping?: {
        [key:string]: string;
    };
    gamepad_mapping?: {
        [key:string]: string;
    };
    gamepad_axes_mapping?: {
        [key:string]: string;
    };
    gamepad_deadzone?: number;
}

export interface GamepadOptionsDefaults extends Required<GamepadOptions> {}

export default class Gamepad {
    private _player: xCloudPlayer | undefined
    private _index: number
    private _physicalGamepadId = -1
    private _rumbleInterval

    private _options:GamepadOptionsDefaults = {
        enable_keyboard: false,
        enable_gamepad: true,
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
        gamepad_mapping: {
            'A': '0',
            'B': '1',
            'X': '2',
            'Y': '3',
            'DPadUp': '12',
            'DPadDown': '13',
            'DPadLeft': '14',
            'DPadRight': '15',
            'LeftShoulder': '4',
            'RightShoulder': '5',
            'LeftThumb': '10',
            'RightThumb': '11',
            'LeftTrigger': '6',
            'RightTrigger': '7',
            'Menu': '9',
            'View': '8',
            'Nexus': '16',
        },
        gamepad_axes_mapping: {
            'LeftThumbXAxis': '0',
            'LeftThumbYAxis': '1',
            'RightThumbXAxis': '2',
            'RightThumbYAxis': '3',
        },
        gamepad_deadzone: 0.2,
    }

    private _listener = {
        keyDown: this.onKeyDown.bind(this),
        keyUp: this.onKeyUp.bind(this),
        gamepadConnected: this.onGamepadConnected.bind(this),
        gamepadDisconnected: this.onGamepadDisconnected.bind(this),
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

        this._player._channels.control.sendGamepadState(this._index, true, this)

        if(this._options.enable_keyboard === true){
            window.addEventListener('keydown', this._listener.keyDown)
            window.addEventListener('keyup', this._listener.keyUp)
        }

        if(this._options.enable_gamepad === true){
            window.addEventListener('gamepadconnected', this._listener.gamepadConnected)
            window.addEventListener('gamepaddisconnected', this._listener.gamepadDisconnected)
        }

        this.detectActiveGamepad()
    }

    detach(){
        if(this._player === undefined){
            console.log('[Gamepad] Player is not attached. this._player is:', this._player)
            return
        }
        this._player._channels.control.sendGamepadState(this._index, false)
        this._physicalGamepadId = -1

        if(this._rumbleInterval !== undefined){
            clearInterval(this._rumbleInterval)
        }

        if(this._options.enable_keyboard === true){
            window.removeEventListener('keydown', this._listener.keyDown)
            window.removeEventListener('keyup', this._listener.keyUp)
        }

        if(this._options.enable_gamepad === true){
            window.removeEventListener('gamepadconnected', this._listener.gamepadConnected)
            window.removeEventListener('gamepaddisconnected', this._listener.gamepadDisconnected)
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

            return this._player._channels.input.queueGamepadFrames([buttonPreset])
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

    detectActiveGamepad(){
        if(this._physicalGamepadId < 0){
            for(const gamepadBrowser in navigator.getGamepads()){
                const gamepadIndex = navigator.getGamepads()[gamepadBrowser]?.index
                if(gamepadIndex === undefined){
                    continue
                }

                let gamepadFoundInHandler = false
                for(const gamepad in this._player?._channels.control.getGamepadHandlers()){
                    if(
                        this._player?._channels.control.getGamepadHandlers()[gamepad] instanceof Gamepad &&
                        (this._player?._channels.control.getGamepadHandlers()[gamepad] as Gamepad)._physicalGamepadId === navigator.getGamepads()[gamepadBrowser]?.index
                    ) {
                        console.log('[Gamepad] Active gamepad already detected:', gamepadIndex, (this._player?._channels.control.getGamepadHandlers()[gamepad] as Gamepad)._physicalGamepadId)
                        gamepadFoundInHandler = true
                        continue
                    }
                }

                if(gamepadFoundInHandler === false){
                    this._physicalGamepadId = gamepadIndex
                    console.log('[Gamepad] Active gamepad detected:', this._physicalGamepadId)
                }
            }
        } else {
            console.log('[Gamepad] Physical gamepad already detected:', this._physicalGamepadId)
        }
    }

    onGamepadConnected(event:GamepadEvent){
        if(this._physicalGamepadId < 0){
            for(const gamepad in this._player?._channels.control.getGamepadHandlers()){
                if(
                    this._player?._channels.control.getGamepadHandlers()[gamepad] instanceof Gamepad &&
                    (this._player?._channels.control.getGamepadHandlers()[gamepad] as Gamepad)._physicalGamepadId === event.gamepad.index
                ) {
                    return
                }
            }

            this._physicalGamepadId = event.gamepad.index
        }
    }

    onGamepadDisconnected(event:GamepadEvent){
        if(event.gamepad.index === this._physicalGamepadId){
            this._physicalGamepadId = -1
        }
    }

    getGamepadState(){
        const gamepad = this.getGamepad(this._physicalGamepadId)
        if(this._physicalGamepadId < 0 || gamepad === undefined){
            return undefined
        }

        const frame = this.getDefaultFamepadFrame()
        frame.GamepadIndex = this._index

        for(const button in this._options.gamepad_mapping){
            frame[button] = gamepad.buttons[this._options.gamepad_mapping[button]].value
        }

        // Start + Select Nexus menu workaround
        if(frame.View > 0 && frame.Menu > 0){
            frame.View = 0
            frame.Menu = 0

            frame.Nexus = 1
        }

        for(const axis in this._options.gamepad_axes_mapping){
            frame[axis] = this.normaliseAxis(gamepad.axes[this._options.gamepad_axes_mapping[axis]])
        }

        return frame
    }

    getGamepad(index = -1){
        const gamepad = navigator.getGamepads()[index]
        if(gamepad !== null) {
            return gamepad
        } else {
            return undefined
        }
    }

    getPhysicalGamepadId(){
        return this._physicalGamepadId
    }

    handleVibration(report:VibrationFrame){
        if(this._physicalGamepadId < 0){
            console.log('[Gamepad] Received a vibration report but no physical gamepad is connected')
            return
        }

        const gamepad = this.getGamepad(this._physicalGamepadId)
        if(gamepad === undefined){
            console.log('[Gamepad] Received a vibration report but no physical gamepad is connected')
            return
        }

        const rumbleData = {
            startDelay: 0,
            duration: report.durationMs,
            weakMagnitude: report.rightMotorPercent,
            strongMagnitude: report.leftMotorPercent,

            leftTrigger: report.leftTriggerMotorPercent,
            rightTrigger: report.rightTriggerMotorPercent,
        }
        
        // @ts-expect-error - dual-rumble is not in the types
        if(gamepad.vibrationActuator?.type === 'dual-rumble') {
            const intensityRumble = report.rightMotorPercent < .6 ? (.6 - report.rightMotorPercent) / 2 : 0
            const intensityRumbleTriggers = (report.leftTriggerMotorPercent + report.rightTriggerMotorPercent) / 4
            const endIntensity = Math.min(intensityRumble, intensityRumbleTriggers)
            
            rumbleData.weakMagnitude = Math.min(1, report.rightMotorPercent + endIntensity)

            // Set triggers to 0 as dual-rumble does not support Triggers
            // @TODO: Check if we can improve rumble: https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/GamepadHapticsActuatorTriggerRumble/explainer.md
            rumbleData.leftTrigger = 0
            rumbleData.rightTrigger = 0

            gamepad.vibrationActuator?.playEffect('dual-rumble', rumbleData)

            clearInterval(this._rumbleInterval)
            if(report.repeat > 0) {
                let repeatCount = report.repeat

                this._rumbleInterval = setInterval(() => {
                    if(repeatCount <= 0){
                        clearInterval(this._rumbleInterval)
                    }

                    if(gamepad.vibrationActuator !== undefined) {
                        gamepad.vibrationActuator?.playEffect('dual-rumble', rumbleData)
                    }
                    repeatCount--

                }, report.delayMs + report.durationMs)
            }
        } else {
            console.log('[Gamepad] Unknown vibration type:', gamepad.vibrationActuator?.type)
        }
    }

    normaliseAxis(value) {
        if(Math.abs(value) < this._options.gamepad_deadzone) {
            return 0
        }

        value = value - Math.sign(value) * this._options.gamepad_deadzone
        value /= (1.0 - this._options.gamepad_deadzone)
        
        return value
    }
}