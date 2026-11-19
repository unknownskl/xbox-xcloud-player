import xCloudPlayer from '../player'
import Teredo from '../lib/teredo'

export default class Ice {
    private _peerConnection:RTCPeerConnection
    private _iceCandidates: RTCIceCandidate[] = []
    private _onIceCandidate: (event: RTCPeerConnectionIceEvent) => void

    constructor(player:xCloudPlayer) {
        this._peerConnection = player._peerConnection

        this._onIceCandidate = (event: RTCPeerConnectionIceEvent) => {
            if(event.candidate) {
                this._iceCandidates.push(event.candidate)

                // @TODO: Implement Teredo port selection for remote streaming
            }
        }

        this._peerConnection.addEventListener('icecandidate', this._onIceCandidate)
    }

    getCandidates(){
        return this._iceCandidates
    }

    setRemoteCandidates(candidates:RTCIceCandidate[]){
        if(candidates.length === 0){
            console.warn('Error: No candidates received!')
        }

        for(const candidate of candidates){
            if(!candidate.candidate || candidate.candidate === 'a=end-of-candidates') {continue}

            const candidateAddress = candidate.candidate.split(' ')

            if(candidateAddress.length > 4 && Teredo.isTeredoAddress(candidateAddress[4])){
                const teredo = new Teredo(candidateAddress[4])

                Promise.resolve(this._peerConnection.addIceCandidate({
                    candidate: 'a=candidate:10 1 UDP 1 '+teredo.getIpv4Address()+' 9002 typ host ',
                    sdpMLineIndex: candidate.sdpMLineIndex,
                    sdpMid: candidate.sdpMid,
                })).catch((err) => {
                    console.warn('Failed to add Teredo port 9002 ICE candidate:', err)
                })
                Promise.resolve(this._peerConnection.addIceCandidate({
                    candidate: 'a=candidate:11 1 UDP 1 '+teredo.getIpv4Address()+' '+teredo.getIpv4Port()+' typ host ',
                    sdpMLineIndex: candidate.sdpMLineIndex,
                    sdpMid: candidate.sdpMid,
                })).catch((err) => {
                    console.warn('Failed to add Teredo ICE candidate:', err)
                })
            }

            Promise.resolve(this._peerConnection.addIceCandidate({
                candidate: candidate.candidate,
                sdpMid: candidate.sdpMid,
                sdpMLineIndex: candidate.sdpMLineIndex,
            })).catch((err) => {
                console.warn('Failed to add ICE candidate:', err)
            })
        }
    }

    destroy():void{
        this._peerConnection.removeEventListener?.('icecandidate', this._onIceCandidate)
    }
}