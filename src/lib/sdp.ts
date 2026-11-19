import xCloudPlayer from '../player'

export default class Sdp {
    private _player: xCloudPlayer
    private _peerConnection:RTCPeerConnection

    constructor(player:xCloudPlayer) {
        this._player = player
        this._peerConnection = player._peerConnection
    }

    getAvailableCodecs():Array<any> {
        const capabilities = RTCRtpReceiver.getCapabilities('video')?.codecs
        if(capabilities === undefined) {return []}

        const codecs:Array<string> = []
        for(const codec of capabilities) {
            if(!codecs.includes(codec.mimeType)) {codecs.push(codec.mimeType)}
        }

        return codecs
    }

    // getServerCodecs() {
    //     for(const sender in this._peerConnection.getSenders()){
    //         console.log('Sender:', this._peerConnection.getSenders()[sender])
    //     }
    // }

    setLocalSDP(sdp:RTCSessionDescriptionInit) {
        console.log('[SDP] setLocalSDP() Setting local SDP:', sdp)

        if(this._player._config.video_bitrate > 0){
            console.log('[SDP] Set max video bitrate to:', this._player._config.video_bitrate, 'kbps')
            sdp.sdp = this._setBitrate(sdp.sdp, 'video', this._player._config.video_bitrate)
        }

        if(this._player._config.audio_bitrate > 0){
            console.log('[SDP] Set max audio bitrate to:', this._player._config.audio_bitrate, 'kbps')
            sdp.sdp = this._setBitrate(sdp.sdp, 'audio', this._player._config.audio_bitrate)
        }

        if(this._player._config.audio_mono !== true){
            console.log('[SDP] setLocalSDP() Set audio to stereo')
            sdp.sdp = sdp.sdp?.replace('useinbandfec=1', 'useinbandfec=1; stereo=1')
        }

        return sdp
    }

    setRemoteSDP(sdp:string) {
        console.log('[SDP] setRemoteSDP() Setting remote SDP:', sdp)
        return sdp
    }

    getDefaultCodecPreferences() {
        const capabilities = RTCRtpReceiver.getCapabilities('video')?.codecs
        if(capabilities === undefined) {return []}

        const t1:Array<any> = []
        const t2:Array<any> = []
        const t3:Array<any> = []
        const t4:Array<any> = []

        for(const codec of capabilities) {
            if(codec.mimeType.includes('H264')) {
                if(codec.sdpFmtpLine?.includes('profile-level-id=4d')) {
                    t1.push(codec)

                } else if(codec.sdpFmtpLine?.includes('profile-level-id=42e')) {
                    t2.push(codec)

                } else if(codec.sdpFmtpLine?.includes('profile-level-id=420')) {
                    t3.push(codec)
                } 
            } else if(codec.mimeType.includes('ulpfec')) {
                t4.push(codec)
            } else if(codec.mimeType.includes('flexfec')) {
                t4.push(codec)
            } else if(codec.mimeType.includes('VP9')) {
                t4.push(codec)
            } else if(codec.mimeType.includes('VP8')) {
                t4.push(codec)
            }
            // else {
            //     t4.push(codec)
            // }
        }

        const codecOrder = [...t1, ...t2, ...t3, ...t4]

        return codecOrder
    }

    _setBitrate(sdp, media, bitrate) {
        if(!sdp){
            return sdp
        }
        const lines = sdp.split('\n')
        let line = -1
        for(let i=0; i < lines.length; i++) {
            if(lines[i].indexOf('m='+media) === 0) {
                line = i
                break
            }
        }
        if (line === -1) {
            console.debug('Could not find the m line for', media)
            return sdp
        }
        line++

        while(line < lines.length && (lines[line].indexOf('i=') === 0 || lines[line].indexOf('c=') === 0)) {
            line++
        }
       
        if (line < lines.length && lines[line].indexOf('b') === 0) {
            lines[line] = 'b=AS:'+bitrate
            return lines.join('\n')
        }
        
        let newLines = lines.slice(0, line)
        newLines.push('b=AS:'+bitrate)
        newLines = newLines.concat(lines.slice(line, lines.length))

        return newLines.join('\n')
    }
}