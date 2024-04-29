import xCloudPlayer from '../player'

export default class Stats {
    private _player: xCloudPlayer
    private _peerConnection:RTCPeerConnection

    _videoCodec:string = ''
    _audioCodec:string = ''

    _videoWidth:number = 0
    _videoHeight:number = 0
    _videoFps:number = 0

    _remoteHost:string = ''
    _remotePort:number = 0
    _remoteIsLocal = false
    _remoteIsIpv6 = false

    constructor(player:xCloudPlayer) {
        this._player = player
        this._peerConnection = player._peerConnection

        setInterval(this.loop.bind(this), 1000)
    }

    loop(){
        this._peerConnection.getStats().then((stats) => {
            stats.forEach((report) => {
                //  @TODO: Implement chat stats using type outbound-rtp

                if(report.type === 'inbound-rtp'){
                    this.readInboundRtp(report)
                    
                } else if(report.type === 'remote-candidate'){
                    this.readRemoteCandidate(report)
                }
            })
        })
    }

    readInboundRtp(report:RTCInboundRtpStreamStats){
        if(report.kind === 'video' && report.codecId){
            this._videoCodec = report.codecId

            if(report.frameWidth){ this._videoWidth = report.frameWidth }
            if(report.frameHeight){ this._videoHeight = report.frameHeight }
            if(report.framesPerSecond){ this._videoFps = report.framesPerSecond }

            // report.jitter

        } else if(report.kind === 'audio' && report.codecId){
            this._audioCodec = report.codecId

            // report.jitter
        }
    }

    readRemoteCandidate(report){
        console.log('Remote Candidate:', report)

        if(this.isPrivateIP(report.address)){
            this._remoteIsLocal = true
        } else {
            this._remoteIsLocal = false
        }

        if(this.isIpv6(report.address)){
            this._remoteIsIpv6 = true
        } else {
            this._remoteIsIpv6 = false
        }

        this._remoteHost = report.address
        this._remotePort = report.port
    }

    isPrivateIP(ip) {
        const parts = ip.split('.')
        return parts[0] === '10' || (parts[0] === '172' && (parseInt(parts[1], 10) >= 16 && parseInt(parts[1], 10) <= 31)) || (parts[0] === '192' && parts[1] === '168')
    }

    isIpv6(ip) {
        const parts = ip.split(':')
        return parts.length > 3 ? true : false
    }
}