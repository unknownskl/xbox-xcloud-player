import FpsCounter from '../Helper/FpsCounter'
//import LatencyCounter from '../Helper/LatencyCounter'
import BaseChannel from './Base'

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
    _inputInterval

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
        const reportType = this._reportTypes.ClientMetadata
        const metadataReport = this._createInputPacket(reportType, [], [], [], [])
        // console.log('metadata report:', metadataReport)

        this.send(metadataReport)
        
        this._inputInterval = setInterval(() => {
            const reportType = this._reportTypes.None

            // Keyboard mask
            if(this.getGamepadQueueLength() === 0){
                const gpState = this.getClient()._inputDriver.requestState()
                const kbState = this.getClient()._keyboardDriver.requestState()
                const mergedState = this.mergeState(gpState, kbState, this._adhocState)
                this._adhocState = null
                this.queueGamepadState(mergedState)
            }

            if(this.getMouseQueueLength() === 0){
                this._mouseFrames.push({
                    X: this._mouseStateX,
                    Y: this._mouseStateY,
                    WheelX: 0,
                    WheelY: 0,
                    Buttons: this._mouseStateButtons,
                    Relative: 1, // 0 = Relative, 1 = Absolute
                })
            }

            // if(Object.keys(this._touchEvents).length > 0){
            //     console.log('Sending events to queue...')
            //     for(const pointerEvent in this._touchEvents){
            //         console.log('queued event:', this._touchEvents[pointerEvent])
            //         this._pointerFrames.push({
            //             events: this._touchEvents[pointerEvent].events
            //         })
            //     }
            //     this._touchEvents = {}
            // }

            

            const metadataQueue = this.getMetadataQueue()
            const gamepadQueue = this.getGamepadQueue()
            const pointerQueue = this.getPointerQueue()
            const mouseQueue = this.getMouseQueue()

            if(metadataQueue.length !== 0 || gamepadQueue.length !== 0 || pointerQueue.length !== 0 ){
                const inputReport = this._createInputPacket(reportType, metadataQueue, gamepadQueue, pointerQueue, mouseQueue)
                this.send(inputReport)
            }
        }, 32)// 16 ms = 1 frame (1000/60)
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
        i++

        if(reportType === this._reportTypes.Vibration){
            dataView.getUint8(i) // rumbleType: 0 = FourMotorRumble
            i += 2 // Read one unknown byte extra

            const leftMotorPercent = dataView.getUint8(i) / 100
            const rightMotorPercent = dataView.getUint8(i+1) / 100
            const leftTriggerMotorPercent = dataView.getUint8(i+2) / 100
            const rightTriggerMotorPercent = dataView.getUint8(i+3) / 100
            const durationMs = dataView.getUint16(i+4, !0)
            const delayMs = dataView.getUint16(i+6, !0)
            const repeat = dataView.getUint8(i+8)
            i += 9

            // Check if we have an active gamepad and rumble enabled
            const gamepad = navigator.getGamepads()[0]
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

                if((gamepad as any).vibrationActuator !== undefined) {

                    if((gamepad as any).vibrationActuator.type === 'dual-rumble') {
                        const intensityRumble = rightMotorPercent < .6 ? (.6 - rightMotorPercent) / 2 : 0
                        const intensityRumbleTriggers = (leftTriggerMotorPercent + rightTriggerMotorPercent) / 4
                        const endIntensity = Math.min(intensityRumble, intensityRumbleTriggers)
                        
                        rumbleData.weakMagnitude = Math.min(1, rightMotorPercent + endIntensity)

                        // Set triggers as we have changed the motor rumble already
                        rumbleData.leftTrigger = 0
                        rumbleData.rightTrigger = 0
                    }

                    (gamepad as any).vibrationActuator.playEffect((gamepad as any).vibrationActuator.type, rumbleData)

                    if(repeat > 0) {
                        let repeatCount = repeat

                        this._rumbleInterval = setInterval(() => {
                            if(repeatCount <= 0){
                                clearInterval(this._rumbleInterval)
                            }

                            if((gamepad as any).vibrationActuator !== undefined) {
                                (gamepad as any).vibrationActuator.playEffect((gamepad as any).vibrationActuator.type, rumbleData)
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

    _createInputPacket(reportType, metadataQueue:Array<any>, gamepadQueue:Array<InputFrame>, pointerQueue:Array<PointerFrame>, mouseQueue:Array<MouseFrame>) {
        this._inputSequenceNum++
        const packetTimeNow = performance.now()

        let metadataSize = 0
        let gamepadSize = 0
        let pointerSize = 0
        let mouseSize = 0

        let totalSize = 14

        if(metadataQueue.length > 0){
            reportType |= this._reportTypes.Metadata // Set bitmask for metadata
            metadataSize = 1 + ((7 * 4) * metadataQueue.length)
            totalSize += metadataSize
        }

        if(gamepadQueue.length > 0){
            reportType |= this._reportTypes.Gamepad // Set bitmask for gamepad data
            gamepadSize = 1 + (23 * gamepadQueue.length)
            totalSize += gamepadSize
        }

        if(pointerQueue.length > 0){
            reportType |= this._reportTypes.Pointer // Set bitmask for pointer data
            pointerSize = 1
            for(const frame in pointerQueue){
                pointerSize = pointerSize + 1 + (pointerQueue[frame].events.length * 20)
            }
            totalSize += pointerSize
        }

        if(mouseQueue.length > 0){
            reportType |= this._reportTypes.Mouse // Set bitmask for pointer data
            mouseSize = 1 + (18 * mouseQueue.length)
            totalSize += mouseSize
        }

        if(reportType === this._reportTypes.ClientMetadata){
            totalSize++
        }

        const metadataAlloc = new Uint8Array(totalSize)
        const metadataReport = new DataView(metadataAlloc.buffer)
        metadataReport.setUint16(0, reportType, true)
        metadataReport.setUint32(2, this._inputSequenceNum, true)
        metadataReport.setFloat64(6, performance.now(), true)

        let offset = 14

        if(metadataQueue.length > 0){
            metadataReport.setUint8(offset, metadataQueue.length)
            offset++

            for (; metadataQueue.length > 0;) {
                this._metadataFps.count()
                const frame = metadataQueue.shift()
    
                const firstFramePacketArrivalTimeMs = frame.firstFramePacketArrivalTimeMs
                const frameSubmittedTimeMs = frame.frameSubmittedTimeMs
                const frameDecodedTimeMs = frame.frameDecodedTimeMs
                const frameRenderedTimeMs = frame.frameRenderedTimeMs
                const framePacketTime = packetTimeNow
                const frameDateNow = performance.now()
    
                metadataReport.setUint32(offset, frame.serverDataKey, true)
                metadataReport.setUint32(offset+4, firstFramePacketArrivalTimeMs, true)
                metadataReport.setUint32(offset+8, frameSubmittedTimeMs, true)
                metadataReport.setUint32(offset+12, frameDecodedTimeMs, true)
                metadataReport.setUint32(offset+16, frameRenderedTimeMs, true)
                metadataReport.setUint32(offset+20, framePacketTime, true)
                metadataReport.setUint32(offset+24, frameDateNow, true)
    
                offset += 28
    
                // // Measure latency
                // const metadataDelay = (performance.now()-frame.frameRenderedTimeMs)
                // this.#metadataLatency.push(metadataDelay)
                // if(metadataDelay > this.#maxMetadataLatency || this.#maxMetadataLatency ===  undefined){
                //     this.#maxMetadataLatency = metadataDelay
    
                // } else if(metadataDelay < this.#minMetadataLatency || this.#minMetadataLatency ===  undefined){
                //     this.#minMetadataLatency = metadataDelay
                // }
            }
        }

        if(gamepadQueue.length > 0){
            metadataReport.setUint8(offset, gamepadQueue.length)
            offset++

            for (; gamepadQueue.length > 0;) {
                this._inputFps.count()
                const shift = gamepadQueue.shift()
                if(shift !== undefined){

                    const input:InputFrame = shift

                    metadataReport.setUint8(offset, input.GamepadIndex)
                    offset++

                    let buttonMask = 0
                    if(input.Nexus > 0){ buttonMask |= 2 }
                    if(input.Menu > 0){ buttonMask |= 4 }
                    if(input.View > 0){ buttonMask |= 8 }
                    if(input.A > 0){ buttonMask |= 16 }
                    if(input.B > 0){ buttonMask |= 32 }
                    if(input.X > 0){ buttonMask |= 64 }
                    if(input.Y > 0){ buttonMask |= 128 }
                    if(input.DPadUp > 0){ buttonMask |= 256 }
                    if(input.DPadDown > 0){ buttonMask |= 512 }
                    if(input.DPadLeft > 0){ buttonMask |= 1024 }
                    if(input.DPadRight > 0){ buttonMask |= 2048 }
                    if(input.LeftShoulder > 0){ buttonMask |= 4096 }
                    if(input.RightShoulder > 0){ buttonMask |= 8192 }
                    if(input.LeftThumb > 0){ buttonMask |= 16384 }
                    if(input.RightThumb > 0){ buttonMask |= 32768 }
        
                    metadataReport.setUint16(offset, buttonMask, true)
                    metadataReport.setInt16(offset+2, this.normalizeAxisValue(input.LeftThumbXAxis), true) // LeftThumbXAxis
                    metadataReport.setInt16(offset+4, this.normalizeAxisValue(-input.LeftThumbYAxis), true) // LeftThumbYAxis
                    metadataReport.setInt16(offset+6, this.normalizeAxisValue(input.RightThumbXAxis), true) // RightThumbXAxis
                    metadataReport.setInt16(offset+8, this.normalizeAxisValue(-input.RightThumbYAxis), true) // RightThumbYAxis
                    metadataReport.setUint16(offset+10, this.normalizeTriggerValue(input.LeftTrigger), true) // LeftTrigger
                    metadataReport.setUint16(offset+12, this.normalizeTriggerValue(input.RightTrigger), true) // RightTrigger

                    metadataReport.setUint32(offset+14, 0, true) // PhysicalPhysicality
                    metadataReport.setUint32(offset+18, 0, true) // VirtualPhysicality
                    offset += 22
                }
            }
        }

        // if(pointerQueue.length > 0){
        //     console.log('DEBUG generatePointerFrame():')
        //     metadataReport.setUint8(offset, pointerQueue.length)
        //     offset++
        //     console.log('append8:', pointerQueue.length)


        //     for (; pointerQueue.length > 0;) {
        //         // this._inputFps.count()
        //         const shift = pointerQueue.shift()
        //         if(shift !== undefined){
        //             const pointer:PointerFrame = shift

        //             metadataReport.setUint8(offset, pointer.events.length)
        //             offset++
        //             console.log('append8:', pointer.events.length)

        //             for(const event in shift.events){
        //                 var rect = shift.events[event].target.getBoundingClientRect();
        //                 console.log(rect)

        //                 let e = 0.06575749909301447 * 1080 / 1
        //                     , n = 0.06575749909301447 * 1920 / 1;

        //                 // console.log('DEBUG 1:', shift.events[event].height, 1080, 1, e)
        //                 // console.log('DEBUG 2:', shift.events[event].width, 1920, 1, n)

        //                 if(shift.events[event].type === 'pointerup'){
        //                     e = 0
        //                     n = 0
        //                 }

        //                 metadataReport.setUint16(offset, e)
        //                 metadataReport.setUint16(offset+2, n)
        //                 // metadataReport.setUint16(offset, shift.events[event].height)
        //                 // metadataReport.setUint16(offset+2, shift.events[event].width)
        //                 metadataReport.setUint8(offset+4, 255*shift.events[event].pressure)
        //                 metadataReport.setUint16(offset+5, shift.events[event].twist)
        //                 metadataReport.setUint32(offset+7, 0)
        //                 let o = (shift.events[event].clientX) * 1920 / rect.width
        //                     , l = (shift.events[event].clientY) * 1080 / rect.height;

        //                 console.log('append16:', e)
        //                 console.log('append16:', n)
        //                 console.log('append8:', 255*shift.events[event].pressure)
        //                 console.log('append16:', shift.events[event].twist)
        //                 console.log('append32:', 0)

        //                 // console.log('DEBUG 3:', shift.events[event].clientX, 1920, rect.width, o)
        //                 // console.log('DEBUG 4:', shift.events[event].clientY, 1080, rect.height, l)

        //                 if(shift.events[event].type === 'pointerup'){
        //                     o = 0
        //                     l = 0
        //                 }

        //                 metadataReport.setUint32(offset+11, Math.round(o))
        //                 metadataReport.setUint32(offset+15, Math.round(l))
        //                 // metadataReport.setUint32(offset+11, shift.events[event].x)
        //                 // metadataReport.setUint32(offset+15, shift.events[event].y)
        //                 metadataReport.setUint8(offset+19, (shift.events[event].type === 'pointerdown') ? 1 :
        //                     (shift.events[event].type === 'pointerup') ? 2 : (shift.events[event].type === 'pointermove') ? 3 : 0)
                        
        //                 console.log('append32:', o)
        //                 console.log('append32:', l)
        //                 console.log('append8:', shift.events[event].type)
                        
        //                 offset = offset+20

        //                 console.log('Sending event: ', shift.events[event], pointer, e, n, o, l)
        //             }
        //         }
        //     }

        //     console.log('Data:', metadataReport)
        // }

        // MouseFrame

        if(mouseQueue.length > 0){
            metadataReport.setUint8(offset, mouseQueue.length)
            offset++

            for (; mouseQueue.length > 0;) {
                this._inputFps.count()
                const shift = mouseQueue.shift()
                if(shift !== undefined){
                    const input:MouseFrame = shift

                    metadataReport.setUint32(offset, input.X, true)
                    metadataReport.setUint32(offset+4, input.Y, true)
                    metadataReport.setUint32(offset+8, input.WheelX, true)
                    metadataReport.setUint32(offset+12, input.WheelY, true)

                    metadataReport.setUint8(offset+16, input.Buttons)
                    metadataReport.setUint8(offset+17, input.Relative)
                    offset += 18
                }
            }
        }

        // KeyboardFrame

        // SendorFrame

        if(reportType === this._reportTypes.ClientMetadata){
            metadataReport.setUint8(offset, 0) // Max Touchpoints
            offset++
        }

        return metadataReport
    }

    getGamepadQueue(size=30) {
        return this._gamepadFrames.splice(0, (size-1))
    }

    getGamepadQueueLength() {
        return this._gamepadFrames.length
    }

    queueGamepadState(input:InputFrame) {
        return this._gamepadFrames.push(input)
    }

    getPointerQueue(size=30) {
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

    onPointerMove(e){
        e.preventDefault()

        // if (e.pointerType === 'touch'){
        //     this._mouseActive = false
        //     this._touchActive = true
        // } else if (e.pointerType === 'mouse'){
        this._mouseActive = true
        this._touchActive = false
        // }

        if(this._mouseActive === true){
            const rect = e.target.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            const [cx, cy] = this.convertAbsoluteMousePositionImpl(x, y, rect.width, rect.height)
            this._mouseStateX = cx
            this._mouseStateY = cy
            this._mouseStateButtons = e.buttons
        }

        // if(this._touchActive === true){
        //     this._touchLastPointerId = e.pointerId
        //     if(this._touchEvents[e.pointerId] === undefined){
        //         this._touchEvents[e.pointerId] = {
        //             events: []
        //         }
        //     }
        //     this._touchEvents[e.pointerId].events.push(e)
        // }
    }

    _touchEvents = {}
    _touchLastPointerId = 0

    onPointerClick(e){
        e.preventDefault()

        if(this._mouseActive === true){
            const rect = e.target.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            const [cx, cy] = this.convertAbsoluteMousePositionImpl(x, y, rect.width, rect.height)
            this._mouseStateX = cx
            this._mouseStateY = cy
            this._mouseStateButtons = e.buttons
        }

        // if(this._touchActive === true){
        //     this._touchLastPointerId = e.pointerId
        //     if(this._touchEvents[e.pointerId] === undefined){
        //         this._touchEvents[e.pointerId] = {
        //             events: []
        //         }
        //     }
        //     this._touchEvents[e.pointerId].events.push(e)
        // }
    }

    onPointerScroll(e){
        e.preventDefault()
        
        // console.log('got onpointerscroll', e)
    }

    _mouseActive = false
    _touchActive = false

    _mouseStateButtons = 0
    _mouseStateX = 0
    _mouseStateY = 0

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

    pressButton(index:number, input:InputFrame){
        this._adhocState = input
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