export default function worker(self) {

    console.log('xCloudPlayer Worker/Audio.ts - Loading worker...')

    self.onPacket = function(eventData, timePerformanceNow):void {

        self._normalizeBuffer(eventData.data).then((buffer) => {

            // if(eventData.data instanceof Blob){
            //     const bytesBuffer = Buffer.from(eventData.data)
            //     var messageBuffer = new DataView(eventData.data);
            // } else {
            //     var messageBuffer = new DataView(eventData.data);
            // }

            const messageBuffer = new DataView(buffer)

            const frameId = messageBuffer.getUint32(0, true)
            const timestamp = (messageBuffer.getUint32(4, true)/10)
            const frameSize = messageBuffer.getUint32(8, true)

            const frameBuffer = new Uint8Array(buffer, 12)

            const frameData = {
                frameId: frameId,
                timestamp: timestamp,
                frameSize: frameSize,
                frameData: frameBuffer,
                frameReceived: timePerformanceNow,
            }

            postMessage({
                action: 'decodeAudio',
                status: 200,
                data: {
                    frame: frameData,
                },
            })

        }).catch((error) => {
            console.warn('xCloudPlayer Worker/Audio.ts - _normalizeBuffer failed:', error)
        })

        // return frameData
    }

    onmessage = async (workerMessage) => {
        switch(workerMessage.data.action){
            case 'onPacket':
                // Process incoming input
                self.onPacket(workerMessage.data.data, workerMessage.data.data.timePerformanceNow)
                break
            default:
                console.log('xCloudPlayer Worker/Audio.ts - Unknown incoming worker message:', workerMessage.data.action, workerMessage.data)
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