import xCloudPlayer from '../player'
import { VibrationFrame } from '../channel/input'
import { InputFrame } from '../channel/input/packet'

export type GamepadAxisName = 'LeftThumbXAxis' | 'LeftThumbYAxis' | 'RightThumbXAxis' | 'RightThumbYAxis'
export type GamepadButtonName = Exclude<keyof InputFrame, 'GamepadIndex' | GamepadAxisName>
export type GamepadFrameKey = Exclude<keyof InputFrame, 'GamepadIndex'>

interface DualRumbleActuator {
    readonly type?: string;
    playEffect(type:string, params:Record<string, number>): Promise<string>;
}

interface GamepadWithVibration extends globalThis.Gamepad {
    readonly vibrationActuator: GamepadHapticActuator & DualRumbleActuator;
}

export interface GamepadOptions {
    enable_keyboard?: boolean;
    enable_gamepad?: boolean;
    enable_vibration?: boolean;
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
    gamepad_force_capture?: boolean;
}

export interface GamepadOptionsDefaults extends Required<GamepadOptions> {}

export default class Gamepad {
    private _player: xCloudPlayer | undefined
    private _index: number
    private _physicalGamepadId = -1
    private _rumbleInterval: ReturnType<typeof setInterval> | undefined
    private _isFocused = true
    private _gamepadOverride: { buttons: Partial<Record<GamepadFrameKey, number>> } = {
        buttons: {},
    }

    private _options:GamepadOptionsDefaults = {
        enable_keyboard: false,
        enable_gamepad: true,
        enable_vibration: true,
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
        gamepad_force_capture: false,
    }

    private _listener = {
        keyDown: this.onKeyDown.bind(this),
        keyUp: this.onKeyUp.bind(this),
        gamepadConnected: this.onGamepadConnected.bind(this),
        gamepadDisconnected: this.onGamepadDisconnected.bind(this),
        windowFocus: this.onWindowFocus.bind(this),
        windowBlur: this.onWindowBlur.bind(this),
    }

    constructor(index:number, options:GamepadOptions = {}){
        this._index = index

        this._options = {
            ...this._options,
            ...options,
        }
    }

    attach(xCloudPlayer:xCloudPlayer):void{
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

        if(this._options.enable_gamepad === true && this._options.gamepad_force_capture === false){
            window.addEventListener('blur', this._listener.windowBlur)
            window.addEventListener('focus', this._listener.windowFocus)
        }

        this.detectActiveGamepad()
    }

    detach():void{
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

        if(this._options.enable_gamepad === true && this._options.gamepad_force_capture === false){
            window.removeEventListener('blur', this._listener.windowBlur)
            window.removeEventListener('focus', this._listener.windowFocus)
        }
    }

    private isGamepadFrameKey(button:string): button is GamepadFrameKey {
        return button !== 'GamepadIndex' && button in this.getDefaultFamepadFrame()
    }

    sendButtonState(button:GamepadFrameKey | string, value:number):void{
        if(this._player === undefined){
            console.log('[Gamepad] Player is not attached. this._player is:', this._player)
            return
        }

        if(!this.isGamepadFrameKey(button)){
            console.log('[Gamepad] Invalid button:', button)
            return
        }

        const buttonPreset = this.getDefaultFamepadFrame()
        buttonPreset.GamepadIndex = this._index
        this._gamepadOverride.buttons[button] = value
    }

    onKeyDown(event:KeyboardEvent):void{
        if(this._isFocused === false){
            return
        }

        for(const button in this._options.keyboard_mapping){
            if(this._options.keyboard_mapping[button] === event.key && this.isGamepadFrameKey(button)){
                this._gamepadOverride.buttons[button] = 1
                event.preventDefault()
            }
        }
    }

    onKeyUp(event:KeyboardEvent):void{
        if(this._isFocused === false){
            return
        }

        for(const button in this._options.keyboard_mapping){
            if(this._options.keyboard_mapping[button] === event.key && this.isGamepadFrameKey(button)){
                this._gamepadOverride.buttons[button] = 0
                event.preventDefault()
            }
        }
    }

    onWindowFocus():void{
        this._isFocused = true
    }

    onWindowBlur():void{
        this._isFocused = false
    }

    getDefaultFamepadFrame():InputFrame{
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

    detectActiveGamepad():void{
        if(this._physicalGamepadId < 0){
            for(const gamepadBrowser of navigator.getGamepads()){
                const gamepadIndex = gamepadBrowser?.index
                if(gamepadIndex === undefined){
                    continue
                }

                let gamepadFoundInHandler = false
                const handlers = this._player?._channels.control.getGamepadHandlers()
                if(handlers !== undefined){
                    for(const slot of [0, 1, 2, 3] as const){
                        const handler = handlers[slot]
                        if(
                            handler instanceof Gamepad &&
                            handler._physicalGamepadId === gamepadIndex
                        ) {
                            console.log('[Gamepad] Active gamepad already detected:', gamepadIndex, handler._physicalGamepadId)
                            gamepadFoundInHandler = true
                            continue
                        }
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

    onGamepadConnected(event:GamepadEvent):void{
        if(this._physicalGamepadId < 0){
            const handlers = this._player?._channels.control.getGamepadHandlers()
            if(handlers !== undefined){
                for(const slot of [0, 1, 2, 3] as const){
                    const handler = handlers[slot]
                    if(
                        handler instanceof Gamepad &&
                        handler._physicalGamepadId === event.gamepad.index
                    ) {
                        return
                    }
                }
            }

            this._physicalGamepadId = event.gamepad.index
        }
    }

    onGamepadDisconnected(event:GamepadEvent):void{
        if(event.gamepad.index === this._physicalGamepadId){
            this._physicalGamepadId = -1
        }
    }

    hasOverrideButtons():boolean{
        return Object.keys(this._gamepadOverride.buttons).length > 0
    }

    getGamepadState():InputFrame | undefined{
        const gamepad = this.getGamepad(this._physicalGamepadId)
        if((this._physicalGamepadId < 0 || gamepad === undefined || this._isFocused === false) && (this.hasOverrideButtons() === false)){
            return undefined
        }

        const frame = this.getDefaultFamepadFrame()
        frame.GamepadIndex = this._index

        // Set buttons
        if(gamepad !== undefined){
            for(const button in this._options.gamepad_mapping){
                if(!this.isGamepadFrameKey(button)) {continue}
                const mappedButton = gamepad.buttons[Number(this._options.gamepad_mapping[button])]
                if(mappedButton !== undefined){
                    frame[button] = mappedButton.value
                }
            }

            // Set axis
            for(const axis in this._options.gamepad_axes_mapping){
                if(!this.isGamepadFrameKey(axis)) {continue}
                const mappedAxis = gamepad.axes[Number(this._options.gamepad_axes_mapping[axis])]
                if(mappedAxis !== undefined){
                    frame[axis] = this.normaliseAxis(mappedAxis)
                }
            }
        }

        // Check for button overrides from the keyboard
        for(const button of Object.keys(this._gamepadOverride.buttons) as Array<GamepadFrameKey>){
            const overrideVal = this._gamepadOverride.buttons[button]
            if(overrideVal !== undefined){
                frame[button] = overrideVal
            }

            // Clean up existing keys if they are 0
            if(overrideVal === 0){
                // Remove key from override
                const newOverrideButtons: Partial<Record<GamepadFrameKey, number>> = {}
                for(const oButton of Object.keys(this._gamepadOverride.buttons) as Array<GamepadFrameKey>){
                    const oVal = this._gamepadOverride.buttons[oButton]
                    if(oVal !== undefined && oVal !== 0){
                        newOverrideButtons[oButton] = oVal
                    }
                }
                this._gamepadOverride.buttons = newOverrideButtons
            }
        }

        // Start + Select Nexus menu workaround
        if(frame.View > 0 && frame.Menu > 0){
            frame.View = 0
            frame.Menu = 0

            frame.Nexus = 1
        }

        return frame
    }

    getGamepad(index:number = -1):globalThis.Gamepad | undefined{
        const gamepad = navigator.getGamepads()[index]
        if(gamepad !== null) {
            return gamepad
        } else {
            return undefined
        }
    }

    getPhysicalGamepadId():number{
        return this._physicalGamepadId
    }

    handleVibration(report:VibrationFrame):void{
        if(this._physicalGamepadId < 0){
            console.log('[Gamepad] Received a vibration report but no physical gamepad is connected')
            return
        }

        const gamepad = this.getGamepad(this._physicalGamepadId)
        if(gamepad === undefined){
            console.log('[Gamepad] Received a vibration report but no physical gamepad is connected')
            return
        }

        if(this._options.enable_vibration === false){
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
        
        const actuator = (gamepad as GamepadWithVibration).vibrationActuator as DualRumbleActuator | undefined
        if(actuator?.type === 'dual-rumble') {
            const intensityRumble = report.rightMotorPercent < .6 ? (.6 - report.rightMotorPercent) / 2 : 0
            const intensityRumbleTriggers = (report.leftTriggerMotorPercent + report.rightTriggerMotorPercent) / 4
            const endIntensity = Math.min(intensityRumble, intensityRumbleTriggers)
            
            rumbleData.weakMagnitude = Math.min(1, report.rightMotorPercent + endIntensity)

            // Set triggers to 0 as dual-rumble does not support Triggers
            // @TODO: Check if we can improve rumble: https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/GamepadHapticsActuatorTriggerRumble/explainer.md
            rumbleData.leftTrigger = 0
            rumbleData.rightTrigger = 0

            actuator.playEffect('dual-rumble', rumbleData)

            clearInterval(this._rumbleInterval)
            if(report.repeat > 0) {
                let repeatCount = report.repeat

                this._rumbleInterval = setInterval(() => {
                    if(repeatCount <= 0){
                        clearInterval(this._rumbleInterval)
                    }

                    if(actuator !== undefined) {
                        actuator.playEffect('dual-rumble', rumbleData)
                    }
                    repeatCount--

                }, report.delayMs + report.durationMs)
            }
        } else {
            console.log('[Gamepad] Unknown vibration type:', actuator?.type)
        }
    }

    normaliseAxis(value:number):number {
        if(Math.abs(value) < this._options.gamepad_deadzone) {
            return 0
        }

        value = value - Math.sign(value) * this._options.gamepad_deadzone
        value /= (1.0 - this._options.gamepad_deadzone)
        
        return value
    }
}