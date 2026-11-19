import xCloudPlayer from '../player'
import Teredo from '../lib/teredo'

export default class Ice {
    private _peerConnection:RTCPeerConnection
    private _iceCandidates: RTCIceCandidate[] = []

    constructor(player:xCloudPlayer) {
        this._peerConnection = player._peerConnection

        this._peerConnection.addEventListener('icecandidate', event => {
            if(event.candidate) {
                this._iceCandidates.push(event.candidate)

                // @TODO: Implement Teredo port selection for remote streaming
            }
        })
    }

    getCandidates():RTCIceCandidate[]{
        return this._iceCandidates
    }

    setRemoteCandidates(candidates:Array<RTCIceCandidateInit>):void{
        if(candidates.length === 0){
            console.warn('Error: No candidates received!')
        }

        for(const item of candidates){
            if(!item.candidate || item.candidate === 'a=end-of-candidates') {continue}

            const candidateAddress = item.candidate.split(' ')
                        
            if(candidateAddress.length > 4 && candidateAddress[4].substr(0, 4) === '2001'){
                const teredo = new Teredo(candidateAddress[4])

                this._peerConnection.addIceCandidate({
                    candidate: 'a=candidate:10 1 UDP 1 '+teredo.getIpv4Address()+' 9002 typ host ',
                    sdpMLineIndex: item.sdpMLineIndex,
                    sdpMid: item.sdpMid,
                })
                this._peerConnection.addIceCandidate({
                    candidate: 'a=candidate:11 1 UDP 1 '+teredo.getIpv4Address()+' '+teredo.getIpv4Port()+' typ host ',
                    sdpMLineIndex: item.sdpMLineIndex,
                    sdpMid: item.sdpMid,
                })
            }

            this._peerConnection.addIceCandidate({
                candidate: item.candidate,
                sdpMid: item.sdpMid,
                sdpMLineIndex: item.sdpMLineIndex,
            })
        }
    }
}