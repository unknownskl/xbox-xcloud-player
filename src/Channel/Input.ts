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
            let reportType = this._reportTypes.None
            // reportType |= this._reportTypes.Metadata
            const inputReport = this._createInputPacket(reportType, [])
        }, 10)
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

        const defaultLength = 6
        let metadataSize = 0

        let totalSize = 6

        if(metadata.length > 0){
            reportType |= this._reportTypes.Metadata // Set bitmask for metadata
            // Calc metadata. We can have max 30 only due size.
            metadataSize = 1 + (7 * 4) * metadata.length
            totalSize += metadataSize
        }

        const metadataAlloc = new Uint8Array(totalSize);
        const metadataReport = new DataView(metadataAlloc.buffer)
        metadataReport.setUint8(0, reportType)
        metadataReport.setUint32(1, this._inputSequenceNum, true)

        let offset = 5

        if(metadata.length > 0){
            for(const frame in metadata){
                console.log('Process frame:', metadata[frame])
            }
        }

        return metadataReport
    }
}