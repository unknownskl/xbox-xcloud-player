import FpsCounter from '../Helper/FpsCounter'
import LatencyCounter from '../Helper/LatencyCounter'
import BaseChannel from './Base'

export interface InputFrame {
    GamepadIndex: 0;
    Nexus: 0;
    Menu: 0;
    View: 0;
    A: 0;
    B: 0;
    X: 0;
    Y: 0;
    DPadUp: 0;
    DPadDown: 0;
    DPadLeft: 0;
    DPadRight: 0;
    LeftShoulder: 0;
    RightShoulder: 0;
    LeftThumb: 0;
    RightThumb: 0;

    LeftThumbXAxis: 0.0;
    LeftThumbYAxis: 0.0;
    RightThumbXAxis: 0.0;
    RightThumbYAxis: 0.0;
    LeftTrigger: 0.0;
    RightTrigger: 0.0;
}

export default class InputChannel extends BaseChannel {

    _inputSequenceNum = 0

    _reportTypes = {
        None: 0,
        Metadata: 1,
        GamepadReport: 2,
        ClientMetadata: 8,
        ServerMetadata: 16,
    }

    _gamepadFrames:Array<InputFrame> = []
    _inputInterval

    _metadataFps:FpsCounter
    // _metadataLatency:LatencyCounter

    _inputFps:FpsCounter
    // _inputLatency:LatencyCounter

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
        // this._metadataLatency.start()
        this._inputFps.start()
        // this._inputLatency.start()

        // console.log('xCloudPlayer Channel/Input.ts - ['+this._channelName+'] onOpen:', event)

        const reportType = this._reportTypes.ClientMetadata
        const metadataReport = this._createInputPacket(reportType, [], [])

        this.send(metadataReport)

        this._inputInterval = setInterval(() => {
            const reportType = this._reportTypes.None

            if(this.getGamepadQueueLength() === 0){
                this.getClient()._inputDriver.requestState()
            }

            const metadataQueue = this.getClient().getChannelProcessor('video').getMetadataQueue()
            const gamepadQueue = this.getGamepadQueue()
            const inputReport = this._createInputPacket(reportType, metadataQueue, gamepadQueue)

            this.send(inputReport)
        }, 32)// 16 ms = 1 frame (1000/60)
    }
    
    onMessage(event) {
        console.log('xCloudPlayer Channel/Input.ts - ['+this._channelName+'] onMessage:', event)
    }

    onClose(event) {
        clearInterval(this._inputInterval)

        super.onClose(event)
        // console.log('xCloudPlayer Channel/Input.ts - ['+this._channelName+'] onClose:', event)
    }

    _createInputPacket(reportType, metadataQueue:Array<any>, gamepadQueue:Array<InputFrame>) {
        this._inputSequenceNum++
        const packetTimeNow = performance.now()

        let metadataSize = 0
        let gamepadSize = 0

        let totalSize = 5

        if(metadataQueue.length > 0){
            reportType |= this._reportTypes.Metadata // Set bitmask for metadata
            metadataSize = 1 + ((7 * 4) * metadataQueue.length)
            totalSize += metadataSize
        }

        if(gamepadQueue.length > 0){
            reportType |= this._reportTypes.GamepadReport // Set bitmask for gamepad data
            gamepadSize = 1 + (23 * gamepadQueue.length)
            totalSize += gamepadSize
        }

        const metadataAlloc = new Uint8Array(totalSize)
        const metadataReport = new DataView(metadataAlloc.buffer)
        metadataReport.setUint8(0, reportType)
        metadataReport.setUint32(1, this._inputSequenceNum, true)

        let offset = 5

        if(metadataQueue.length > 0){
            metadataReport.setUint8(offset, metadataQueue.length)
            offset++

            for (; metadataQueue.length > 0;) {
                this._metadataFps.count()
                const frame = metadataQueue.shift()

                const dateNow = performance.now()
    
                const firstFramePacketArrivalTimeMs = frame.firstFramePacketArrivalTimeMs * 10
                const frameSubmittedTimeMs = frame.frameSubmittedTimeMs * 10
                const frameDecodedTimeMs = frame.frameDecodedTimeMs * 10
                const frameRenderedTimeMs = frame.frameRenderedTimeMs * 10
                const framePacketTime = packetTimeNow * 10
                const frameDateNow = dateNow * 10
    
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

    pressButton(gamepadIndex, state){
        const newState = {
            GamepadIndex: gamepadIndex,
            A: state.A || 0,
            B: state.B || 0,
            X: state.X || 0,
            Y: state.Y || 0,
            LeftShoulder: state.LeftShoulder || 0,
            RightShoulder: state.RightShoulder || 0,
            LeftTrigger: state.LeftTrigger || 0,
            RightTrigger: state.RightTrigger || 0,
            View: state.View || 0,
            Menu: state.Menu || 0,
            LeftThumb: state.LeftThumb || 0,
            RightThumb: state.RightThumb || 0,
            DPadUp: state.DPadUp || 0,
            DPadDown: state.DPadDown || 0,
            DPadLeft: state.DPadLeft || 0,
            DPadRight: state.DPadRight || 0,
            Nexus: state.Nexus || 0,
            LeftThumbXAxis: state.LeftThumbXAxis || 0,
            LeftThumbYAxis: state.LeftThumbYAxis || 0,
            RightThumbXAxis: state.RightThumbXAxis || 0,
            RightThumbYAxis: state.RightThumbYAxis || 0,
        }

        this.queueGamepadState(newState)

        setTimeout(() => {
            for(const button in state){
                newState[button] = 0
            }

            this.queueGamepadState(newState)
        }, 50)
    }

    destroy() {
        this._metadataFps.stop()
        // this._metadataLatency.stop()
        this._inputFps.stop()
        // this._inputLatency.stop()
        
        clearInterval(this._inputInterval)

        super.destroy()
    }
}