import xCloudPlayer from '../player'

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

    getCandidates(){
        return this._iceCandidates
    }

    setRemoteCandidates(candidates:RTCIceCandidate[]){
        if(candidates.length === 0){
            console.warn('Error: No candidates received!')
        }

        for(const candidate in candidates){
            if(candidates[candidate].candidate === 'a=end-of-candidates')
                continue;

            this._peerConnection.addIceCandidate({
                candidate: candidates[candidate].candidate,
                sdpMid: candidates[candidate].sdpMid,
                sdpMLineIndex: candidates[candidate].sdpMLineIndex
            })
        }
    }
}