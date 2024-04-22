import xCloudPlayer from '../../player'
import InputPacket, { InputFrame as GamepadFrame, KeyboardFrame, MetadataFrame, MouseFrame, PointerFrame } from './packet'

export default class InputQueue {
    private _player:xCloudPlayer

    private _inputSequenceNum = 0

    private _metadataQueue:Array<MetadataFrame> = []
    private _gamepadQueue:Array<GamepadFrame> = []
    private _pointerQueue:Array<PointerFrame> = []
    private _mouseQueue:Array<MouseFrame> = []
    private _keyboardQueue:Array<KeyboardFrame> = []

    constructor(player:xCloudPlayer) {
        this._player = player
    }

    queueMetadataFrame(data:MetadataFrame) {
        this._metadataQueue.push(data)
        this.checkQueueAndSend()
    }

    queueGamepadFrame(data:GamepadFrame) {
        this._gamepadQueue.push(data)
        this.checkQueueAndSend()
    }

    queueMouseFrame(data:MouseFrame) {
        this._mouseQueue.push(data)
        this.checkQueueAndSend()
    }

    queueKeyboardFrame(data:KeyboardFrame) {
        this._keyboardQueue.push(data)
        this.checkQueueAndSend()
    }

    checkQueueAndSend() {
        if(this._metadataQueue.length > 10){
            this.sendQueue()
        }  
        if(this._gamepadQueue.length > 0){
            this.sendQueue()
        }  
        if(this._mouseQueue.length > 0){
            this.sendQueue()
        }  
        if(this._keyboardQueue.length > 0){
            this.sendQueue()
        }        
    }

    sendQueue() {
        console.log('Sending queues:', this._metadataQueue.length, this._gamepadQueue.length, this._pointerQueue.length, this._mouseQueue.length, this._keyboardQueue.length)

        const packet = new InputPacket(this.getSequenceNum())
        packet.setData(this._metadataQueue, this._gamepadQueue, this._pointerQueue, this._mouseQueue, this._keyboardQueue)
        this._player._channels.input.send(packet.toBuffer())

        this.clearQueues()
    }

    clearQueues() {
        this._metadataQueue = []
        this._gamepadQueue = []
        this._pointerQueue = []
        this._mouseQueue = []
        this._keyboardQueue = []
    }

    getSequenceNum() {
        this._inputSequenceNum++
        return this._inputSequenceNum
    }
}