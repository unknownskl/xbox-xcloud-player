import xCloudApiClient, { StartStreamReponse } from '../apiclient'

export type StreamState = 'New' | 'Provisioning' | 'Provisioned' | 'ReadyToConnect' | 'Error'

export interface StateResponse {
    state: StreamState;
    errorDetails?: unknown;
}

export interface SdpExchangeResponse {
    exchangeResponse: string;
    status?: number;
}

export interface IceExchangeResponse {
    exchangeResponse: string;
    status?: number;
}

export type IceCandidatePayload = string | RTCIceCandidateInit

export interface KeepaliveResponse {
    code?: string;
    status?: number;
}

export interface StopStreamResponse {
    status: 'ok';
}

export default class Stream {
    private _apiClient: xCloudApiClient
    private _sessionId: string
    private _sessionPath: string
    private _state:StreamState

    private _waitInterval: ReturnType<typeof setInterval> | undefined

    constructor(apiClient:xCloudApiClient, response:StartStreamReponse){
        this._apiClient = apiClient
        this._sessionId = response.sessionId
        this._sessionPath = response.sessionPath
        this._state = 'New'
    }

    getSessionId():string{
        return this._sessionId
    }

    getState():StreamState{
        return this._state
    }

    getSessionPath():string{
        return '/'+this._sessionPath
    }

    waitForState(desiredState:StreamState):void{
        this._waitInterval = setInterval(() => {
            this.refreshState().then((state) => {

                if(state === desiredState){
                    clearInterval(this._waitInterval)
                }
                
            }).catch((error:unknown) => {
                console.error('Failed to refresh state of stream:', error)
            })
        }, 500)
    }

    refreshState():Promise<StreamState>{
        return new Promise<StreamState>((resolve, reject) => {
            this._apiClient.get(this.getSessionPath()+'/state').then((rawResponse) => {
                const response = rawResponse as StateResponse
                
                const fireReadyToConnect = (this._state !== 'ReadyToConnect' && response.state === 'ReadyToConnect') ? true : false
                const fireProvisioned = (this._state !== 'Provisioned' && response.state === 'Provisioned') ? true : false

                this._state = response.state
                resolve(this.getState())

                if(fireReadyToConnect === true){ this.onReadyToConnect(this) }
                if(fireProvisioned === true){ this.onProvisioned(this) }

            }).catch((error:unknown) => {
                this.onError(this)
                reject(error)
            })
        })
    }

    onReadyToConnect(stream:Stream):Stream | void{
        return stream
    }

    onProvisioned(stream:Stream):Stream | void{
        return stream
    }

    onError(stream:Stream):Stream | void{
        return stream
    }

    sendSDPOffer(sdpOffer:RTCSessionDescriptionInit):Promise<SdpExchangeResponse>{
        return new Promise<SdpExchangeResponse>((resolve, reject) => {
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

                }).catch((error:unknown) => {
                    reject(error)
                })

            }).catch((error:unknown) => {
                reject(error)
            })
        })
    }

    sendChatSDPOffer(sdpOffer:RTCSessionDescriptionInit):Promise<SdpExchangeResponse>{
        return new Promise<SdpExchangeResponse>((resolve, reject) => {
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

                }).catch((error:unknown) => {
                    reject(error)
                })

            }).catch((error:unknown) => {
                reject(error)
            })
        })
    }

    waitForSdpResponse():Promise<SdpExchangeResponse>{
        return new Promise<SdpExchangeResponse>((resolve) => {
            const checkInterval = setInterval(() => {
                this._apiClient.get(this.getSessionPath()+'/sdp').then((rawResponse) => {
                    const sdpResponse = rawResponse as SdpExchangeResponse
                    if(sdpResponse.status !== 204){
                        resolve(sdpResponse)
                        clearInterval(checkInterval)
                    }

                }).catch(() => {
                    // Not received yet, lets retry..
                })
            }, 500)
        })
    }

    sendIceCandidates(candidates:Array<IceCandidatePayload>):Promise<IceExchangeResponse>{
        return new Promise<IceExchangeResponse>((resolve, reject) => {
            this._apiClient.post(this.getSessionPath()+'/ice', JSON.stringify({ candidates: candidates }), { 'Content-Type': 'application/json', 'Accept': 'application/json' }).then(() => {
                this.waitForIceResponse().then((iceResponse) => {
                    resolve(iceResponse)

                }).catch((error:unknown) => {
                    reject(error)
                })

            }).catch((error:unknown) => {
                reject(error)
            })
        })
    }

    waitForIceResponse():Promise<IceExchangeResponse>{
        return new Promise<IceExchangeResponse>((resolve) => {
            const checkInterval = setInterval(() => {
                this._apiClient.get(this.getSessionPath()+'/ice').then((rawResponse) => {
                    const iceResponse = rawResponse as IceExchangeResponse
                    if(iceResponse.status !== 204){
                        resolve(iceResponse)
                        clearInterval(checkInterval)
                    }

                }).catch(() => {
                    // Not received yet, lets retry..
                })
            }, 1000)
        })
    }

    sendKeepalive():Promise<KeepaliveResponse>{
        return new Promise<KeepaliveResponse>((resolve, reject) => {
            this._apiClient.post(this.getSessionPath()+'/keepalive', '').then((keepaliveResponse) => {
                resolve(keepaliveResponse as KeepaliveResponse)
            }).catch((error:unknown) => {
                reject({ error: error })
            })
        })
    }

    sendMSALAuth(userToken:string):Promise<unknown>{
        return this._apiClient.post(this.getSessionPath()+'/connect', JSON.stringify({
            'userToken': userToken,
        }), { 'Content-Type': 'application/json', 'Accept': 'application/json' })
    }

    stop():Promise<StopStreamResponse>{
        return new Promise<StopStreamResponse>((resolve, reject) => {
            this._apiClient.delete(this.getSessionPath()).then(() => {
                resolve({ status: 'ok'})

            }).catch((error:unknown) => {
                reject(error)
            })
        })
    }
}