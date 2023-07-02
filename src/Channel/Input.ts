import FpsCounter from '../Helper/FpsCounter'
//import LatencyCounter from '../Helper/LatencyCounter'
import BaseChannel from './Base'

export type RumbleCallback<T> = (
    device: T,
    delayMs: number,
    durationMs: number,
    rightMotorPercent: number,
    leftMotorPercent: number,
    rightTriggerMotorPercent: number,
    leftTriggerMotorPercent: number,
    repeat: number,
) => void;

export type PollCallback<T> = (deviceObject: T) => InputFrame | null;

export interface InputDriver<T> {
    start(
        onNewDevice: (poll: PollCallback<T>, rumble: RumbleCallback<T> | undefined, deviceObject: T) => void
    ): void;
    stop(): void;
}

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

export default class InputChannel extends BaseChannel {

    _inputSequenceNum = 0

    _reportTypes = {
        None: 0,
        Metadata: 1,
        GamepadReport: 2,
        ClientMetadata: 8,
        ServerMetadata: 16,
        Mouse: 32,
        Keyboard: 64,
        Vibration: 128,
    }

    _frameMetadataQueue: Array<any> = []

    _gamepadFrames: Array<InputFrame> = []
    _inputDevices: Array<any> = []


    _metadataFps: FpsCounter
    // _metadataLatency:LatencyCounter
    _addedDevices = 0;

    _inputFps: FpsCounter
    // _inputLatency:LatencyCounter

    _rumbleInterval
    _rumbleEnabled = true

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

    start() {
        const reportType = this._reportTypes.ClientMetadata
        const metadataReport = this._createInputPacket(reportType, [], [])
        // console.log('metadata report:', metadataReport)

        this.send(metadataReport)

        this.getClient().getInputDriver().start(((poll, rumble, deviceObject) => {
            this.onDeviceAdded(poll, rumble, deviceObject)
        }))

    }

    static mergeState(gpState: InputFrame | null): InputFrame {
        return {
            GamepadIndex: gpState?.GamepadIndex ?? 0,
            A: Math.max(gpState?.A ?? 0),
            B: Math.max(gpState?.B ?? 0),
            X: Math.max(gpState?.X ?? 0),
            Y: Math.max(gpState?.Y ?? 0),
            LeftShoulder: Math.max(gpState?.LeftShoulder ?? 0),
            RightShoulder: Math.max(gpState?.RightShoulder ?? 0),
            LeftTrigger: Math.max(gpState?.LeftTrigger ?? 0),
            RightTrigger: Math.max(gpState?.RightTrigger ?? 0),
            View: Math.max(gpState?.View ?? 0),
            Menu: Math.max(gpState?.Menu ?? 0),
            LeftThumb: Math.max(gpState?.LeftThumb ?? 0),
            RightThumb: Math.max(gpState?.RightThumb ?? 0),
            DPadUp: Math.max(gpState?.DPadUp ?? 0),
            DPadDown: Math.max(gpState?.DPadDown ?? 0),
            DPadLeft: Math.max(gpState?.DPadLeft ?? 0),
            DPadRight: Math.max(gpState?.DPadRight ?? 0),
            Nexus: Math.max(gpState?.Nexus ?? 0),
            LeftThumbXAxis: Math.max(gpState?.LeftThumbXAxis ?? 0),
            LeftThumbYAxis: Math.max(gpState?.LeftThumbYAxis ?? 0),
            RightThumbXAxis: Math.max(gpState?.RightThumbXAxis ?? 0),
            RightThumbYAxis: Math.max(gpState?.RightThumbYAxis ?? 0),
        } as InputFrame
    }

    onMessage(event) {
        // console.log('xCloudPlayer Channel/Input.ts - ['+this._channelName+'] onMessage:', event)

        const dataView = new DataView(event.data)

        let i = 0
        const reportType = dataView.getUint8(i)
        i++

        if (reportType === this._reportTypes.Vibration) {
            dataView.getUint8(i) // rumbleType: 0 = FourMotorRumble
            const gamepadIndex = dataView.getUint8(i + 1) // what?

            i += 2 // Read one unknown byte extra

            const leftMotorPercent = dataView.getUint8(i) / 100
            const rightMotorPercent = dataView.getUint8(i + 1) / 100
            const leftTriggerMotorPercent = dataView.getUint8(i + 2) / 100
            const rightTriggerMotorPercent = dataView.getUint8(i + 3) / 100
            const durationMs = dataView.getUint16(i + 4, !0)
            const delayMs = dataView.getUint16(i + 6, !0)
            const repeat = dataView.getUint8(i + 8)
            i += 9

            if (this._rumbleEnabled !== true) {
                return
            }

            for (const inputDevice of this._inputDevices) {
                if (inputDevice.gamepadIndex === gamepadIndex) {
                    if (inputDevice.rumble) {
                        inputDevice.rumble(
                            delayMs,
                            durationMs,
                            rightMotorPercent,
                            leftMotorPercent,
                            rightTriggerMotorPercent,
                            leftTriggerMotorPercent,
                            repeat,
                        )
                    }
                    break
                }
            }

            /*
            // Check if we have an active gamepad and rumble enabled
            const gamepad = navigator.getGamepads()[gamepadIndex]
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
                */
        }
    }

    onClose(event) {
        for (const inputDevice of this._inputDevices) {
            clearInterval(inputDevice.pollTimer)
        }

        super.onClose(event)
        // console.log('xCloudPlayer Channel/Input.ts - ['+this._channelName+'] onClose:', event)
    }

    _createInputPacket(reportType, metadataQueue: Array<any>, gamepadQueue: Array<InputFrame>) {
        this._inputSequenceNum++
        const packetTimeNow = performance.now()

        let metadataSize = 0
        let gamepadSize = 0

        let totalSize = 13

        if (metadataQueue.length > 0) {
            reportType |= this._reportTypes.Metadata // Set bitmask for metadata
            metadataSize = 1 + ((7 * 4) * metadataQueue.length)
            totalSize += metadataSize
        }

        if (gamepadQueue.length > 0) {
            reportType |= this._reportTypes.GamepadReport // Set bitmask for gamepad data
            gamepadSize = 1 + (23 * gamepadQueue.length)
            totalSize += gamepadSize
        }

        if (reportType === this._reportTypes.ClientMetadata) {
            totalSize++
        }

        const metadataAlloc = new Uint8Array(totalSize)
        const metadataReport = new DataView(metadataAlloc.buffer)
        metadataReport.setUint8(0, reportType)
        metadataReport.setUint32(1, this._inputSequenceNum, true)
        metadataReport.setFloat64(5, performance.now(), true)

        let offset = 13

        if (metadataQueue.length > 0) {
            metadataReport.setUint8(offset, metadataQueue.length)
            offset++

            for (; metadataQueue.length > 0;) {
                this._metadataFps.count()
                const frame = metadataQueue.shift()

                const dateNow = performance.now()

                const firstFramePacketArrivalTimeMs = frame.firstFramePacketArrivalTimeMs
                const frameSubmittedTimeMs = frame.frameSubmittedTimeMs
                const frameDecodedTimeMs = frame.frameDecodedTimeMs
                const frameRenderedTimeMs = frame.frameRenderedTimeMs
                const framePacketTime = packetTimeNow
                const frameDateNow = dateNow

                metadataReport.setUint32(offset, frame.serverDataKey, true)
                metadataReport.setUint32(offset + 4, firstFramePacketArrivalTimeMs, true)
                metadataReport.setUint32(offset + 8, frameSubmittedTimeMs, true)
                metadataReport.setUint32(offset + 12, frameDecodedTimeMs, true)
                metadataReport.setUint32(offset + 16, frameRenderedTimeMs, true)
                metadataReport.setUint32(offset + 20, framePacketTime, true)
                metadataReport.setUint32(offset + 24, frameDateNow, true)

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

        if (gamepadQueue.length > 0) {
            metadataReport.setUint8(offset, gamepadQueue.length)
            offset++

            for (; gamepadQueue.length > 0;) {
                this._inputFps.count()
                const shift = gamepadQueue.shift()
                if (shift !== undefined) {

                    const input: InputFrame = shift

                    metadataReport.setUint8(offset, input.GamepadIndex)
                    offset++

                    let buttonMask = 0
                    if (input.Nexus > 0) { buttonMask |= 2 }
                    if (input.Menu > 0) { buttonMask |= 4 }
                    if (input.View > 0) { buttonMask |= 8 }
                    if (input.A > 0) { buttonMask |= 16 }
                    if (input.B > 0) { buttonMask |= 32 }
                    if (input.X > 0) { buttonMask |= 64 }
                    if (input.Y > 0) { buttonMask |= 128 }
                    if (input.DPadUp > 0) { buttonMask |= 256 }
                    if (input.DPadDown > 0) { buttonMask |= 512 }
                    if (input.DPadLeft > 0) { buttonMask |= 1024 }
                    if (input.DPadRight > 0) { buttonMask |= 2048 }
                    if (input.LeftShoulder > 0) { buttonMask |= 4096 }
                    if (input.RightShoulder > 0) { buttonMask |= 8192 }
                    if (input.LeftThumb > 0) { buttonMask |= 16384 }
                    if (input.RightThumb > 0) { buttonMask |= 32768 }

                    metadataReport.setUint16(offset, buttonMask, true)
                    metadataReport.setInt16(offset + 2, this.normalizeAxisValue(input.LeftThumbXAxis), true) // LeftThumbXAxis
                    metadataReport.setInt16(offset + 4, this.normalizeAxisValue(-input.LeftThumbYAxis), true) // LeftThumbYAxis
                    metadataReport.setInt16(offset + 6, this.normalizeAxisValue(input.RightThumbXAxis), true) // RightThumbXAxis
                    metadataReport.setInt16(offset + 8, this.normalizeAxisValue(-input.RightThumbYAxis), true) // RightThumbYAxis
                    metadataReport.setUint16(offset + 10, this.normalizeTriggerValue(input.LeftTrigger), true) // LeftTrigger
                    metadataReport.setUint16(offset + 12, this.normalizeTriggerValue(input.RightTrigger), true) // RightTrigger

                    metadataReport.setUint32(offset + 14, 0, true) // PhysicalPhysicality
                    metadataReport.setUint32(offset + 18, 0, true) // VirtualPhysicality
                    offset += 22
                }
            }
        }

        if (reportType === this._reportTypes.ClientMetadata) {
            metadataReport.setUint8(offset, 0)
            offset++
        }

        return metadataReport
    }

    getGamepadQueue(size = 30) {
        return this._gamepadFrames.splice(0, (size - 1))
    }

    getGamepadQueueLength() {
        return this._gamepadFrames.length
    }

    queueGamepadState(input: InputFrame) {
        return this._gamepadFrames.push(input)
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

    pressButton(index: number, input: InputFrame) {
        //this._adhocState = input
    }

    onDeviceAdded(poll: PollCallback<unknown>, rumble: RumbleCallback<unknown> | undefined, deviceObject: unknown) {
        const gamepadIndex = this._addedDevices
        const device = {
            gamepadIndex,
            deviceObject,
            pollTimer: setInterval(() => {
                const reportType = this._reportTypes.None

                if (this.getGamepadQueueLength() === 0) {
                    const gpState = poll(deviceObject)
                    const mergedState = InputChannel.mergeState(gpState)
                    mergedState.GamepadIndex = gamepadIndex
                    this.queueGamepadState(mergedState)
                }

                const metadataQueue = this.getMetadataQueue()
                const gamepadQueue = this.getGamepadQueue()

                if (metadataQueue.length !== 0 || gamepadQueue.length !== 0) {
                    const inputReport = this._createInputPacket(reportType, metadataQueue, gamepadQueue)
                    this.send(inputReport)
                }
            }, 32),
            rumble: (
                delayMs: number,
                durationMs: number,
                rightMotorPercent: number,
                leftMotorPercent: number,
                rightTriggerMotorPercent: number,
                leftTriggerMotorPercent: number,
                repeat: number) => {
                if (rumble) {
                    rumble(
                        deviceObject,
                        delayMs,
                        durationMs,
                        rightMotorPercent,
                        leftMotorPercent,
                        rightTriggerMotorPercent,
                        leftTriggerMotorPercent,
                        repeat,
                    )
                }
            }

        }
        this._inputDevices.push(device)
        this.getClient().onDeviceAdded(gamepadIndex)
        this._addedDevices++
        return device
    }

    destroy() {
        this._metadataFps.stop()
        // this._metadataLatency.stop()
        this._inputFps.stop()
        // this._inputLatency.stop()

        for (const inputDevice of this._inputDevices) {
            clearInterval(inputDevice.pollTimer)
        }

        this.getClient().getInputDriver().stop()

        super.destroy()
    }

    addProcessedFrame(frame) {
        frame.frameRenderedTimeMs = performance.now()
        this._frameMetadataQueue.push(frame)

        // this._fpsCounter.count()

        //const frameProcessedMs = (performance.now()-frame.firstFramePacketArrivalTimeMs)
        // this._latencyCounter.count(frameProcessedMs)
    }

    getMetadataQueue(size = 30) {
        return this._frameMetadataQueue.splice(0, (size - 1))
    }

    getMetadataQueueLength() {
        return this._frameMetadataQueue.length
    }
}