export default function worker(self:any) {

    console.log('xCloudPlayer Worker/Audio.ts - Loading worker...')

    self.onPacket = function(eventData, timePerformanceNow){
        var messageBuffer = new DataView(eventData.data);

        var frameId = messageBuffer.getUint32(0, true);
        var timestamp = (messageBuffer.getUint32(4, true)/10);
        var frameSize = messageBuffer.getUint32(8, true);

        var frameBuffer = new Uint8Array(eventData.data, 12)

        var frameData = {
            frameId: frameId,
            timestamp: timestamp,
            frameSize: frameSize,
            frameData: frameBuffer,
            frameReceived: timePerformanceNow
        }

        postMessage({
            action: 'decodeAudio',
            status: 200,
            data: {
                frame: frameData
            }
        });

        return frameData
    }

    onmessage = async (workerMessage) => {
        switch(workerMessage.data.action){
            case 'onPacket':
                // Process incoming input
                self.onPacket(workerMessage.data.data, workerMessage.data.data.timePerformanceNow)
                break;
            default:
                console.log('xCloudPlayer Worker/Audio.ts - Unknown incoming worker message:', workerMessage.data.action, workerMessage.data)
        }
    }

    return self
}