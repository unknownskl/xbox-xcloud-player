export default function worker(self) {

    console.log('xCloudPlayer Worker/Video.ts - Loading worker...', self)

    const _frameQueue = {}

    // let _performanceInterval

    // _performanceInterval = setInterval(() => {
    //     console.log('xCloudPlayer Worker/Video.ts - [Performance] _frameQueue size:', Object.keys(_frameQueue).length, '_metadataQueue size:', this._metadataQueue.length)
    // }, 1000)

    // self.init = function() {
    //     return new Promise((resolve, reject) => {

    //         this._performanceInterval = setInterval(() => {
    //             console.log('xCloudPlayer Worker/Video.ts - [Performance] _frameQueue size:', Object.keys(_frameQueue).length)
    //         }, 1000)

    //         resolve('ok')
    //     })
    // }

    self.destroy = function() {
        return new Promise((resolve) => {

            // clearInterval(this._performanceInterval)

            resolve('ok')
        })
    }

    self.onPacket = function(eventData, timePerformanceNow){

        return new Promise((resolve) => {
            this._normalizeBuffer(eventData.data).then((buffer) => {
            
                const messageBuffer = new DataView(buffer)

                const frameId = messageBuffer.getUint32(0, true)
                const timestamp = (messageBuffer.getUint32(4, true)/10)
                const frameSize = messageBuffer.getUint32(8, true)
                const frameOffset = messageBuffer.getUint32(12, true)
                const serverDataKey = messageBuffer.getUint32(16, true)
                const isKeyFrame = messageBuffer.getUint8(20)

                const offset = 21

                const frameBufferData = new Uint8Array(buffer, offset)

                const frameData = {
                    frameId: frameId,
                    timestamp: timestamp,
                    frameSize: frameSize,
                    frameOffset: frameOffset,
                    serverDataKey: serverDataKey,
                    isKeyFrame: isKeyFrame,
                    frameData: frameBufferData,
                }

                // Check if frame already exists
                let frameDataBuffer:Uint8Array

                if(_frameQueue[frameId] !== undefined) {
                    frameDataBuffer = new Uint8Array(_frameQueue[frameId].frameData)
                    frameDataBuffer.set(frameData.frameData, frameData.frameOffset)

                    _frameQueue[frameId].bytesReceived += frameData.frameData.byteLength
                    _frameQueue[frameId].frameData = frameDataBuffer

                } else {
                    frameDataBuffer = new Uint8Array(new ArrayBuffer(frameData.frameSize))
                    frameDataBuffer.set(frameData.frameData, frameData.frameOffset)
                    const bytesReceived = frameData.frameData.byteLength

                    _frameQueue[frameId] = {
                        frameId: frameId,
                        timestamp: frameData.timestamp,
                        frameSize: frameData.frameSize,
                        frameData: frameDataBuffer,
                        bytesReceived: bytesReceived,
                        serverDataKey: frameData.serverDataKey,
                        isKeyFrame: frameData.isKeyFrame,
                        fullFrame: false,

                        firstFramePacketArrivalTimeMs: timePerformanceNow,
                        frameSubmittedTimeMs: timePerformanceNow,
                        frameDecodedTimeMs: timePerformanceNow,
                        frameRenderedTimeMs: 0,
                    }
                }
                
                // Check if we have a full frame
                if(_frameQueue[frameId].bytesReceived === _frameQueue[frameId].frameSize){
                    _frameQueue[frameId].fullFrame = true

                    postMessage({
                        action: 'doRender',
                        status: 200,
                        data: _frameQueue[frameId],
                    })
                    resolve(_frameQueue[frameId])

                    delete _frameQueue[frameId]
                } else {
                    resolve(_frameQueue[frameId])
                }
            })
        })
    }

    onmessage = async (workerMessage) => {

        switch(workerMessage.data.action){

            case 'endStream':
                self.destroy().then(() => {
                    postMessage({
                        action: 'endStream',
                        status: 200,
                    })
                }).catch((error) => {
                    postMessage({
                        action: 'endStream',
                        status: 500,
                        message: error,
                    })
                })
                break
            case 'onPacket':
                // Process incoming input
                self.onPacket(workerMessage.data.data, workerMessage.data.data.timePerformanceNow).then(() => {
                    // Packet succeeded
                }).catch((error) => {
                    console.warn('xCloudPlayer Worker/Video.ts - Failed onPacket():', error)
                })
                break
            default:
                console.log('xCloudPlayer Worker/Video.ts - Unknown incoming worker message:', workerMessage.data.action, workerMessage.data)
        }
    }

    self._normalizeBuffer = (eventData) => {
        return new Promise((resolve, reject) => {
            if(eventData instanceof Blob){
                eventData.arrayBuffer().then((buffer) => {
                    resolve(buffer)
                }).catch((error) => {
                    reject(error)
                })
            } else {
                resolve(eventData)
            }
        })
    }

    return self
}