import FpsCounter from '../Helper/FpsCounter'
//import LatencyCounter from '../Helper/LatencyCounter'
import BaseChannel from './Base'

import InputPacket from './Input/Packet'

export interface InputFrame {
    GamepadIndex: number;
    Nexus: number;
    Menu: number;
    View: number;
    A: number;
    B: number;
    X: number;
    Y: number;
    DPadUp: number;
    DPadDown: number;
    DPadLeft: number;
    DPadRight: number;
    LeftShoulder: number;
    RightShoulder: number;
    LeftThumb: number;
    RightThumb: number;

    LeftThumbXAxis: number;
    LeftThumbYAxis: number;
    RightThumbXAxis: number;
    RightThumbYAxis: number;
    LeftTrigger: number;
    RightTrigger: number;
}

export interface PointerFrame {
    events: Array<any>;
}

export interface MouseFrame {
    X: number;
    Y: number;
    WheelX: number;
    WheelY: number;
    Buttons: number;
    Relative: number;
}

export interface KeyboardFrame {
    pressed: boolean;
    keyCode: number;
    key: string;
}

export default class InputChannel extends BaseChannel {

    _inputSequenceNum = 0

    _reportTypes = {
        None: 0,
        Metadata: 1,
        Gamepad: 2,
        Pointer: 4,
        ClientMetadata: 8,
        ServerMetadata: 16,
        Mouse: 32,
        Keyboard: 64,
        Vibration: 128,
        Sendor: 256,
    }

    _frameMetadataQueue:Array<any> = []

    _gamepadFrames:Array<InputFrame> = []
    _pointerFrames:Array<PointerFrame> = []
    _pointerCounter = 1
    _mouseFrames:Array<MouseFrame> = []
    _keyboardFrames:Array<KeyboardFrame> = []
    _inputInterval

    _keyboardEvents:Array<any> = []

    _metadataFps:FpsCounter
    // _metadataLatency:LatencyCounter

    _inputFps:FpsCounter
    // _inputLatency:LatencyCounter

    _rumbleInterval
    _rumbleEnabled = true
    _adhocState

    constructor(channelName, client) {
        super(channelName, client)

        this._metadataFps = new FpsCounter(this.getClient(), 'metadata')
        // this._metadataLatency = new LatencyCounter(this.getClient(), 'metadata')

        this._inputFps = new FpsCounter(this.getClient(), 'input')
        // this._inputLatency = new LatencyCounter(this.getClient(), 'input')
    }

    onOpen(event) {
        super.onOpen(event)

        this._metadataFps.start()
        this._inputFps.start()

        // console.log('xCloudPlayer Channel/Input.ts - ['+this._channelName+'] onOpen:', event)
    }

    start(){
        const Packet = new InputPacket(this._inputSequenceNum)
        Packet.setMetadata(2)

        this.send(Packet.toBuffer())

        if(this._client._config.input_legacykeyboard === false){
            this.getClient()._inputDriver.run()
        }
        
        this._inputInterval = setInterval(() => {
            // Keyboard mask
            if(this._client._config.input_legacykeyboard === true && this.getGamepadQueueLength() === 0){
                const gpState = this.getClient()._inputDriver.requestState()
                const kbState = this.getClient()._keyboardDriver.requestState()
                const mergedState = this.mergeState(gpState, kbState, this._adhocState)
                this._adhocState = null
                this.queueGamepadState(mergedState)
            }

            if(this._client._config.input_touch === true && Object.keys(this._touchEvents).length > 0){
                for(const pointerEvent in this._touchEvents){
                    this._pointerFrames.push({
                        events: this._touchEvents[pointerEvent].events,
                    })
                }
                this._touchEvents = {}
            }

            const metadataQueue = this.getMetadataQueue()
            const gamepadQueue = this.getGamepadQueue()
            const pointerQueue = this.getPointerQueue()
            const mouseQueue = this.getMouseQueue()
            const keyboardQueue = this.getKeyboardQueue()

            if(metadataQueue.length !== 0 || gamepadQueue.length !== 0 || pointerQueue.length !== 0 ){

                this._inputSequenceNum++
                const packet = new InputPacket(this._inputSequenceNum)
                packet.setData(metadataQueue, gamepadQueue, pointerQueue, mouseQueue, keyboardQueue)
                // console.log('Sending new format:', packet)
                
                this.send(packet.toBuffer())
            }
        }, 16)// 16 ms = 1 frame (1000/60)
    }

    mergeState(gpState:InputFrame, kbState:InputFrame, adHoc:InputFrame):InputFrame{
        return {
            GamepadIndex: gpState?.GamepadIndex ?? kbState.GamepadIndex,
            A: Math.max(gpState?.A ?? 0, kbState.A, adHoc?.A ?? 0),
            B: Math.max(gpState?.B ?? 0, kbState.B, adHoc?.B ?? 0),
            X: Math.max(gpState?.X ?? 0, kbState.X, adHoc?.X ?? 0),
            Y: Math.max(gpState?.Y ?? 0, kbState.Y, adHoc?.Y ?? 0),
            LeftShoulder: Math.max(gpState?.LeftShoulder ?? 0, kbState.LeftShoulder, adHoc?.LeftShoulder ?? 0),
            RightShoulder: Math.max(gpState?.RightShoulder ?? 0, kbState.RightShoulder, adHoc?.RightShoulder ?? 0),
            LeftTrigger: Math.max(gpState?.LeftTrigger ?? 0, kbState.LeftTrigger, adHoc?.LeftTrigger ?? 0),
            RightTrigger: Math.max(gpState?.RightTrigger ?? 0, kbState.RightTrigger, adHoc?.RightTrigger ?? 0),
            View: Math.max(gpState?.View ?? 0, kbState.View, adHoc?.View ?? 0),
            Menu: Math.max(gpState?.Menu ?? 0, kbState.Menu, adHoc?.Menu ?? 0),
            LeftThumb: Math.max(gpState?.LeftThumb ?? 0, kbState.LeftThumb, adHoc?.LeftThumb ?? 0),
            RightThumb: Math.max(gpState?.RightThumb ?? 0, kbState.RightThumb, adHoc?.RightThumb ?? 0),
            DPadUp: Math.max(gpState?.DPadUp ?? 0, kbState.DPadUp, adHoc?.DPadUp ?? 0),
            DPadDown: Math.max(gpState?.DPadDown ?? 0, kbState.DPadDown, adHoc?.DPadDown ?? 0),
            DPadLeft: Math.max(gpState?.DPadLeft ?? 0, kbState.DPadLeft, adHoc?.DPadLeft ?? 0),
            DPadRight: Math.max(gpState?.DPadRight ?? 0, kbState.DPadRight, adHoc?.DPadRight ?? 0),
            Nexus: Math.max(gpState?.Nexus ?? 0, kbState.Nexus, adHoc?.Nexus ?? 0),
            LeftThumbXAxis: this.mergeAxix(gpState?.LeftThumbXAxis ?? 0, kbState.LeftThumbXAxis),
            LeftThumbYAxis: this.mergeAxix(gpState?.LeftThumbYAxis ?? 0, kbState.LeftThumbYAxis),
            RightThumbXAxis: this.mergeAxix(gpState?.RightThumbXAxis ?? 0, kbState.RightThumbXAxis),
            RightThumbYAxis: this.mergeAxix(gpState?.RightThumbYAxis ?? 0, kbState.RightThumbYAxis),
        } as InputFrame
    }
    
    mergeAxix(axis1: number, axis2: number){
        if(Math.abs(axis1) > Math.abs(axis2)){
            return axis1
        }else{
            return axis2
        }
    }

    onMessage(event) {
        // console.log('xCloudPlayer Channel/Input.ts - ['+this._channelName+'] onMessage:', event)

        const dataView = new DataView(event.data)

        let i = 0
        const reportType = dataView.getUint8(i)
        const unk1 = dataView.getUint8(i+1)
        i += 2


        if(reportType === this._reportTypes.Vibration){
            dataView.getUint8(i) // rumbleType: 0 = FourMotorRumble
            const gamepadIndex = dataView.getUint8(i+1) // Gamepadindex?
            // console.log('gamepad: ', gamepadIndex, unk1)
            i += 2 // Read one unknown byte extra

            const leftMotorPercent = dataView.getUint8(i) / 100
            const rightMotorPercent = dataView.getUint8(i+1) / 100
            const leftTriggerMotorPercent = dataView.getUint8(i+2) / 100
            const rightTriggerMotorPercent = dataView.getUint8(i+3) / 100
            const durationMs = dataView.getUint16(i+4, true)
            const delayMs = dataView.getUint16(i+6, true)
            const repeat = dataView.getUint8(i+8)
            i += 9

            // Check if we have an active gamepad and rumble enabled
            const gamepad = (navigator.getGamepads()[0] as any)
            if(gamepad !== null && this._rumbleEnabled === true){

                const rumbleData = {
                    startDelay: 0,
                    duration: durationMs,
                    weakMagnitude: rightMotorPercent,
                    strongMagnitude: leftMotorPercent,

                    leftTrigger: leftTriggerMotorPercent,
                    rightTrigger: rightTriggerMotorPercent,
                }

                if(this._rumbleInterval !== undefined){
                    clearInterval(this._rumbleInterval)
                }
                
                if(gamepad.vibrationActuator !== undefined) {

                    if(gamepad.vibrationActuator.type === 'dual-rumble') {
                        const intensityRumble = rightMotorPercent < .6 ? (.6 - rightMotorPercent) / 2 : 0
                        const intensityRumbleTriggers = (leftTriggerMotorPercent + rightTriggerMotorPercent) / 4
                        const endIntensity = Math.min(intensityRumble, intensityRumbleTriggers)
                        
                        rumbleData.weakMagnitude = Math.min(1, rightMotorPercent + endIntensity)

                        // Set triggers as we have changed the motor rumble already
                        rumbleData.leftTrigger = 0
                        rumbleData.rightTrigger = 0
                    }

                    gamepad.vibrationActuator?.playEffect(gamepad.vibrationActuator.type, rumbleData)

                    if(repeat > 0) {
                        let repeatCount = repeat

                        this._rumbleInterval = setInterval(() => {
                            if(repeatCount <= 0){
                                clearInterval(this._rumbleInterval)
                            }

                            if(gamepad.vibrationActuator !== undefined) {
                                gamepad.vibrationActuator?.playEffect(gamepad.vibrationActuator.type, rumbleData)
                            }
                            repeatCount--
                        }, delayMs + durationMs)
                    }
                }
            }
        }
    }

    onClose(event) {
        clearInterval(this._inputInterval)

        super.onClose(event)
        // console.log('xCloudPlayer Channel/Input.ts - ['+this._channelName+'] onClose:', event)
    }

    _createInputPacket(reportType, metadataQueue:Array<any>, gamepadQueue:Array<InputFrame>, pointerQueue:Array<PointerFrame>, mouseQueue:Array<MouseFrame>, keyboardQueue:Array<KeyboardFrame>) {
        this._inputSequenceNum++

        const Packet = new InputPacket(this._inputSequenceNum)
        Packet.setData(metadataQueue, gamepadQueue, pointerQueue, mouseQueue, keyboardQueue)
        
        return Packet.toBuffer()
    }

    getGamepadQueue(size=30) {
        return this._gamepadFrames.splice(0, (size-1))
    }

    getGamepadQueueLength() {
        return this._gamepadFrames.length
    }

    queueGamepadState(input:InputFrame) {
        if(input !== null) {return this._gamepadFrames.push(input)}
    }

    getPointerQueue(size=2) {
        return this._pointerFrames.splice(0, (size-1))
    }

    getPointerQueueLength() {
        return this._pointerFrames.length
    }

    getMouseQueue(size=30) {
        return this._mouseFrames.splice(0, (size-1))
    }

    getMouseQueueLength() {
        return this._mouseFrames.length
    }

    getKeyboardQueue(size=2) {
        return this._keyboardFrames.splice(0, (size-1))
    }

    getKeyboardQueueLength() {
        return this._keyboardFrames.length
    }

    onPointerMove(e){
        e.preventDefault()

        if(this._mouseActive === true && this._mouseLocked === true){
            this._mouseStateX = e.movementX
            this._mouseStateY = e.movementY
            this._mouseStateButtons = e.buttons

            this._mouseFrames.push({
                X: this._mouseStateX*10,
                Y: this._mouseStateY*10,
                WheelX: 0,
                WheelY: 0,
                Buttons: this._mouseStateButtons,
                Relative: 0, // 0 = Relative, 1 = Absolute
            })
        }

        if(this._touchActive === true){
            this._touchLastPointerId = e.pointerId
            if(this._touchEvents[e.pointerId] === undefined){
                this._touchEvents[e.pointerId] = {
                    events: [],
                }
            }
            this._touchEvents[e.pointerId].events.push(e)
        }
    }

    requestPointerLockWithUnadjustedMovement(element) {
        const promise = element.requestPointerLock({
            unadjustedMovement: true,
        })

        if ('keyboard' in navigator && 'lock' in (navigator.keyboard as any)) {
            document.body.requestFullscreen().then(() => {
                (navigator as any).keyboard.lock()
            })
        }
      
        return promise.then(() => {
            console.log('pointer is locked')
            this._mouseLocked = true

        }).catch((error) => {
            if (error.name === 'NotSupportedError') {

                this._mouseLocked = true
                return element.requestPointerLock()
            }
        })
    }

    _touchEvents = {}
    _touchLastPointerId = 0

    onPointerClick(e){
        e.preventDefault()

        if (e.pointerType === 'touch'){
            this._mouseActive = false
            this._touchActive = true
        } else if (e.pointerType === 'mouse'){
            this._mouseActive = true
            this._touchActive = false
        }

        if(this._client._config.input_mousekeyboard === true && this._mouseActive === true && this._mouseLocked === false){

            this.requestPointerLockWithUnadjustedMovement(e.target)
            document.addEventListener('pointerlockchange', () => {
                if(document.pointerLockElement !== null){
                    this._mouseLocked = true
                } else {
                    this._mouseLocked = false
                }
            }, false)
            document.addEventListener('systemkeyboardlockchanged', event => {
                console.log(event)
                // // if (event.systemKeyboardLockEnabled) {
                // //   console.log('System keyboard lock enabled.')
                // // } else {
                // //   console.log('System keyboard lock disabled.')
                // // }
            }, false)
        } else if(this._mouseActive === true && this._mouseLocked === true){
            this._mouseStateX = e.movementX
            this._mouseStateY = e.movementY
            this._mouseStateButtons = e.buttons

            this._mouseFrames.push({
                X: this._mouseStateX*10,
                Y: this._mouseStateY*10,
                WheelX: 0,
                WheelY: 0,
                Buttons: this._mouseStateButtons,
                Relative: 0, // 0 = Relative, 1 = Absolute
            })
        }

        if(this._touchActive === true){
            this._touchLastPointerId = e.pointerId
            if(this._touchEvents[e.pointerId] === undefined){
                this._touchEvents[e.pointerId] = {
                    events: [],
                }
            }
            this._touchEvents[e.pointerId].events.push(e)
        }
    }

    onPointerScroll(e){
        e.preventDefault()
        
        // console.log('got onpointerscroll', e)
    }

    _mouseActive = false
    _mouseLocked = false
    _touchActive = false

    _mouseStateButtons = 0
    _mouseStateX = 0
    _mouseStateY = 0


    onKeyDown(event){
        if(this._mouseActive === true && this._mouseLocked === true){
            if(this._keyboardButtonsState[event.keyCode] !== true){
                this._keyboardButtonsState[event.keyCode] = true

                // console.log('keyDown', event.keyCode)

                this._keyboardFrames.push({
                    pressed: true,
                    key: event.key,
                    keyCode: event.keyCode,
                })

                setTimeout(() => {
                    this._keyboardFrames.push({
                        pressed: true,
                        key: event.key,
                        keyCode: event.keyCode,
                    })
                }, 16)
            }
        }
    }

    onKeyUp(event){
        if(this._mouseActive === true && this._mouseLocked === true){
            this._keyboardButtonsState[event.keyCode] = false

            // console.log('keyUp', event.keyCode)

            this._keyboardFrames.push({
                pressed: false,
                key: event.key,
                keyCode: event.keyCode,
            })

            setTimeout(() => {
                this._keyboardFrames.push({
                    pressed: false,
                    key: event.key,
                    keyCode: event.keyCode,
                })
            }, 16)
        }
    }

    _keyboardButtonsState = {}

    convertAbsoluteMousePositionImpl(e, t, i, n) {
        let s = i
        let a = n
        const o = 1920 / 1080
        if (o > i / n) {
            a = s / o
            t -= (n - a) / 2
        } else {
            s = a * o
            e -= (i - s) / 2
        }
        e *= 65535 / s
        t *= 65535 / a
        return [e = Math.min(Math.max(Math.round(e), 0), 65535), t = Math.min(Math.max(Math.round(t), 0), 65535)]
    }

    _convertToInt16(e) {
        const int = new Int16Array(1)
        return int[0] = e, int[0]
    }

    _convertToUInt16(e) {
        const int = new Uint16Array(1)
        return int[0] = e, int[0]
    }

    normalizeTriggerValue(e) {
        if (e < 0) {
            return this._convertToUInt16(0)
        }
        const t = 65535 * e,
            a = t > 65535 ? 65535 : t
        return this._convertToUInt16(a)
    }

    normalizeAxisValue(e) {
        const t = this._convertToInt16(32767),
            a = this._convertToInt16(-32767),
            n = e * t
        return n > t ? t : n < a ? a : this._convertToInt16(n)
    }

    pressButton(index:number, button:string){
        if(this._client._config.input_legacykeyboard === true){
            this._client._keyboardDriver.pressButton(button)
        } else {
            this._client._inputDriver.pressButton(index, button)
        }
    }

    destroy() {
        this._metadataFps.stop()
        this._inputFps.stop()
        
        clearInterval(this._inputInterval)

        super.destroy()
    }

    addProcessedFrame(frame) {
        frame.frameRenderedTimeMs = performance.now()
        this._frameMetadataQueue.push(frame)
    }

    getMetadataQueue(size=30) {
        return this._frameMetadataQueue.splice(0, (size-1))
    }

    getMetadataQueueLength() {
        return this._frameMetadataQueue.length
    }
}