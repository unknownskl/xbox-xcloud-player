import Channel from '../lib/channel'
import InputPacket, { MetadataFrame, ReportTypes, InputFrame as GamepadFrame, MouseFrame, KeyboardFrame } from './input/packet'
import InputQueue from './input/queue'

export default class InputChannel extends Channel {
    private _serverVideoWidth = 0
    private _serverVideoHeight = 0

    private _inputQueue = new InputQueue(this.getPlayer())

    getChannelName() {
        return 'input'
    }

    getChannelConfig() {
        return {
            ordered: true,
            protocol: '1.0',
        }
    }

    start(){
        const Packet = new InputPacket(0)
        Packet.setMetadata(navigator.maxTouchPoints > 1 ? navigator.maxTouchPoints : 1)
        this.send(Packet.toBuffer())

        console.log('[InputChannel] Sent metadata:', Packet, Packet.toBuffer())
    }

    onMessage(event: MessageEvent<any>) {
        const dataView = new DataView(event.data)
        const reportType = dataView.getUint8(0)
        // const i = 2

        console.log('[InputChannel] received:', dataView)

        if(reportType === ReportTypes.Vibration){
            console.log('Received a vibration report')

        } else if(reportType === ReportTypes.ServerMetadata){
            console.log('[InputChannel] Received server video dimensions:', dataView.getUint32(2, true), dataView.getUint32(6, true))
            this._serverVideoHeight = dataView.getUint32(2, true)
            this._serverVideoWidth = dataView.getUint32(6, true)
        }

    }

    queueMetadataFrame(data:MetadataFrame){
        return this._inputQueue.queueMetadataFrame(data)
    }

    queueGamepadFrame(data:GamepadFrame){
        this._inputQueue.queueGamepadFrame(data)
    }

    queueMouseFrame(data:MouseFrame){
        this._inputQueue.queueMouseFrame(data)
    }

    queueKeyboardFrame(data:KeyboardFrame){
        this._inputQueue.queueKeyboardFrame(data)
    }

    destroy() {
        // console.log('DebugChannel destroy() called')
    }
}