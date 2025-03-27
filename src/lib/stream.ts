import xCloudApiClient, { StartStreamReponse } from '../apiclient'

export interface StateResponse {
    state: string;
}

export default class Stream {
    private _apiClient: xCloudApiClient
    private _sessionId: string
    private _sessionPath: string
    private _state:'New'|'Provisioning'|'Provisioned'|'ReadyToConnect'|'Error'

    private _waitInterval

    constructor(apiClient:xCloudApiClient, response:StartStreamReponse){
        this._apiClient = apiClient
        this._sessionId = response.sessionId
        this._sessionPath = response.sessionPath
        this._state = 'New'
    }

    getSessionId():string{
        return this._sessionId
    }

    getState():string{
        return this._state
    }

    getSessionPath():string{
        return '/'+this._sessionPath
    }

    waitForState(desiredState:string){
        this._waitInterval = setInterval(() => {
            this.refreshState().then((state) => {

                if(state === desiredState){
                    clearInterval(this._waitInterval)
                }
                
            }).catch((error) => {
                console.error('Failed to refresh state of stream:', error)
            })
        }, 500)
    }

    refreshState(){
        return new Promise<string>((resolve, reject) => {
            this._apiClient.get(this.getSessionPath()+'/state').then((response:any) => {
                
                const fireReadyToConnect = (this._state !== 'ReadyToConnect' && response.state === 'ReadyToConnect') ? true : false
                const fireProvisioned = (this._state !== 'Provisioned' && response.state === 'Provisioned') ? true : false

                this._state = response.state
                resolve(this.getState())

                if(fireReadyToConnect === true){ this.onReadyToConnect(this) }
                if(fireProvisioned === true){ this.onProvisioned(this) }

            }).catch((error) => {
                this.onError(this)
                reject(error)
            })
        })
    }

    onReadyToConnect(stream:Stream){
        return stream
    }

    onProvisioned(stream:Stream){
        return stream
    }

    onError(stream:Stream){
        return stream
    }

    sendSDPOffer(sdpOffer){
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({
                'messageType':'offer',
                'sdp': sdpOffer.sdp,
                'requestId': '1',
                'configuration':{
                    'chatConfiguration':{
                        'bytesPerSample':2,
                        'expectedClipDurationMs':20,
                        'format':{
                            'codec':'opus',
                            'container':'webm',
                        },
                        'numChannels':1,
                        'sampleFrequencyHz':24000,
                    },
                    'chat':{
                        'minVersion':1,
                        'maxVersion':1,
                    },
                    'control':{
                        'minVersion':1,
                        'maxVersion':3,
                    },
                    'input':{
                        'minVersion':1,
                        'maxVersion':9,
                    },
                    'message':{
                        'minVersion':1,
                        'maxVersion':1,
                    },
                    'reliableinput':{
                        'minVersion':9,
                        'maxVersion':9,
                    },
                    'unreliableinput':{
                        'minVersion':9,
                        'maxVersion':9,
                    },
                },
            })

            this._apiClient.post(this.getSessionPath()+'/sdp', body, { 'Content-Type': 'application/json', 'Accept': 'application/json' }).then(() => {
                this.waitForSdpResponse().then((sdpResponse) => {
                    resolve(sdpResponse)

                }).catch((error) => {
                    reject(error)
                })

            }).catch((error) => {
                reject(error)
            })
        })
    }

    sendChatSDPOffer(sdpOffer){
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({
                'messageType':'offer',
                'requestId': 2,
                'sdp': sdpOffer.sdp,
                'configuration':{
                    'isMediaStreamsChatRenegotiation': true,
                },
            })

            this._apiClient.post(this.getSessionPath()+'/sdp', body, { 'Content-Type': 'application/json', 'Accept': 'application/json' }).then(() => {
                this.waitForSdpResponse().then((sdpResponse) => {
                    resolve(sdpResponse)

                }).catch((error) => {
                    reject(error)
                })

            }).catch((error) => {
                reject(error)
            })
        })
    }

    waitForSdpResponse(){
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                this._apiClient.get(this.getSessionPath()+'/sdp').then(sdpResponse => {
                    if((sdpResponse as any).status !== 204){
                        resolve(sdpResponse)
                        clearInterval(checkInterval)
                    }

                }).catch(() => {
                    // Not received yet, lets retry..
                })
            }, 500)
        })
    }

    sendIceCandidates(candidates:Array<any>){
        return new Promise((resolve, reject) => {
            this._apiClient.post(this.getSessionPath()+'/ice', JSON.stringify({ candidates: candidates }), { 'Content-Type': 'application/json', 'Accept': 'application/json' }).then(() => {
                this.waitForIceResponse().then((iceResponse) => {
                    resolve(iceResponse)

                }).catch((error) => {
                    reject(error)
                })

            }).catch((error) => {
                reject(error)
            })
        })
    }

    waitForIceResponse(){
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                this._apiClient.get(this.getSessionPath()+'/ice').then(iceResponse => {
                    if((iceResponse as any).status !== 204){
                        resolve(iceResponse)
                        clearInterval(checkInterval)
                    }

                }).catch(() => {
                    // Not received yet, lets retry..
                })
            }, 1000)
        })
    }

    sendKeepalive(){
        return new Promise((resolve, reject) => {
            this._apiClient.post(this.getSessionPath()+'/keepalive', '').then(keepaliveResponse => {
                resolve(keepaliveResponse)
            }).catch((error) => {
                reject({ error: error })
            })
        })
    }

    sendMSALAuth(userToken:string){
        return this._apiClient.post(this.getSessionPath()+'/connect', JSON.stringify({
            'userToken': userToken,
        }), { 'Content-Type': 'application/json', 'Accept': 'application/json' })
    }

    stop(){
        return new Promise((resolve, reject) => {
            this._apiClient.delete(this.getSessionPath()).then(() => {
                resolve({ status: 'ok'})

            }).catch((error) => {
                reject(error)
            })
        })
    }
}