import BaseChannel from './Base'

export default class InputChannel extends BaseChannel {

    _inputSequenceNum = 0

    _reportTypes = {
        None: 0,
        Metadata: 1,
        GamepadReport: 2,
        ClientMetadata: 8,
        ServerMetadata: 16,
    }

    onOpen(event) {
        super.onOpen(event)

        // console.log('xCloudPlayer Channel/Input.ts - ['+this._channelName+'] onOpen:', event)

        const reportType = this._reportTypes.ClientMetadata
        const metadataReport = this._createInputPacket(reportType, [])

        this.send(metadataReport)

        setInterval(() => {
            // Check for metadata interval
            if(this.getClient().getChannelProcessor('video').getMetadataQueueLength() > 4){
                let reportType = this._reportTypes.None

                const metadataQueue = this.getClient().getChannelProcessor('video').getMetadataQueue()
                const inputReport = this._createInputPacket(reportType, metadataQueue)

                // console.log('inputReport', inputReport, metadataQueue)
                this.send(inputReport)
            }
        }, 16)
    }
    
    onMessage(event) {
        console.log('xCloudPlayer Channel/Input.ts - ['+this._channelName+'] onMessage:', event)
    }

    onClose(event) {
        super.onClose(event)
        // console.log('xCloudPlayer Channel/Input.ts - ['+this._channelName+'] onClose:', event)
    }

    _createInputPacket(reportType, metadata:Array<any>) {
        this._inputSequenceNum++
        const packetTimeNow = performance.now()

        const defaultLength = 5
        let metadataSize = 0

        let totalSize = 5

        if(metadata.length > 0){
            reportType |= this._reportTypes.Metadata // Set bitmask for metadata
            // Calc metadata. We can have max 30 only due size.
            metadataSize = 1 + ((7 * 4) * metadata.length)
            totalSize += metadataSize
        }

        const metadataAlloc = new Uint8Array(totalSize);
        const metadataReport = new DataView(metadataAlloc.buffer)
        metadataReport.setUint8(0, reportType)
        metadataReport.setUint32(1, this._inputSequenceNum, true)

        let offset = 5

        if(metadata.length > 0){
            metadataReport.setUint8(offset, metadata.length)
            offset++

            var dateNow = performance.now();

            for (; metadata.length > 0;) {
                var frame = metadata.shift()
    
                var firstFramePacketArrivalTimeMs = frame.firstFramePacketArrivalTimeMs * 10
                var frameSubmittedTimeMs = frame.frameSubmittedTimeMs * 10
                var frameDecodedTimeMs = frame.frameDecodedTimeMs * 10
                var frameRenderedTimeMs = frame.frameRenderedTimeMs * 10
                var framePacketTime = packetTimeNow * 10
                var frameDateNow = dateNow * 10
    
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

        return metadataReport
    }
}