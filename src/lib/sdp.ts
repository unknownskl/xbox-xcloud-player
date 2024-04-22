import xCloudPlayer from '../player'

export default class Sdp {
    private _peerConnection:RTCPeerConnection

    constructor(player:xCloudPlayer) {
        this._peerConnection = player._peerConnection
    }

    getAvailableCodecs():Array<any> {
        const capabilities = RTCRtpReceiver.getCapabilities('video')?.codecs
        if(capabilities === undefined) {return []}

        const codecs:Array<string> = []
        for(const codec in capabilities) {
            if(!codecs.includes(capabilities[codec].mimeType)) {codecs.push(capabilities[codec].mimeType)}
        }

        return codecs
    }

    // getServerCodecs() {
    //     for(const sender in this._peerConnection.getSenders()){
    //         console.log('Sender:', this._peerConnection.getSenders()[sender])
    //     }
    // }

    setLocalSDP(sdp:RTCSessionDescriptionInit) {
        // @TODO Implememnt bitrate limiter and audio channel settings

        // Set bitrate
        // if(this._maxVideoBitrate > 0){
        //     console.log('xCloudPlayer Library.ts - createOffer() Set max video bitrate to:', this._maxVideoBitrate, 'kbps')
        //     offer.sdp = this._setBitrate(offer.sdp, 'video', this._maxVideoBitrate)
        // }

        // if(this._maxAudioBitrate > 0){
        //     console.log('xCloudPlayer Library.ts - createOffer() Set max audio bitrate to:', this._maxVideoBitrate, 'kbps')
        //     offer.sdp = this._setBitrate(offer.sdp, 'audio', this._maxAudioBitrate)
        // }

        // if((this._config.sound_force_mono || false) !== true){
        //     console.log('xCloudPlayer Library.ts - createOffer() Set audio to stereo')
        //     offer.sdp = offer.sdp?.replace('useinbandfec=1', 'useinbandfec=1; stereo=1')
        // }

        return sdp
    }

    setRemoteSDP(sdp:string) {
        // console.log('setRemoteSDP:', sdp)
        // console.log('Server codecs:', this.getServerCodecs())

        // for(const transceiver in this._peerConnection.getTransceivers()){
        //     // console.log('Transceiver:', this._peerConnection.getTransceivers()[transceiver])

        //     if(this._peerConnection.getTransceivers()[transceiver].receiver.track.kind === 'video'){
        //         // We got the video transceiver.
        //     }
        // }

        return sdp
    }

    getDefaultCodecPreferences() {
        const capabilities = RTCRtpReceiver.getCapabilities('video')?.codecs
        if(capabilities === undefined) {return []}

        const t1:Array<any> = []
        const t2:Array<any> = []
        const t3:Array<any> = []

        for(const codec in capabilities) {
            console.log('codec:', capabilities[codec].mimeType, capabilities[codec].sdpFmtpLine)

            if(capabilities[codec].mimeType.includes('H264')) {
                if(capabilities[codec].sdpFmtpLine?.includes('profile-level-id=4d')) {
                    t1.push(capabilities[codec])

                } else if(capabilities[codec].sdpFmtpLine?.includes('profile-level-id=42')) {
                    t2.push(capabilities[codec])
                } 
            } else if(capabilities[codec].mimeType.includes('ulpfec')) {
                t3.push(capabilities[codec])
            } else if(capabilities[codec].mimeType.includes('flexfec')) {
                t3.push(capabilities[codec])
            } else if(capabilities[codec].mimeType.includes('VP9')) {
                t3.push(capabilities[codec])
            }
            // if(capabilities[codec].mimeType.includes('VP9')) {t2.push(capabilities[codec].mimeType)}
            // if(capabilities[codec].mimeType.includes('VP8')) {t3.push(capabilities[codec].mimeType)}
        }

        const codecOrder = [...t1, ...t2, ...t3]
        console.log('Final codec order:', codecOrder)

        return codecOrder
    }
}