import xCloudApiClient, { StartStreamReponse } from '../apiclient'

export interface StateResponse {
    state: string;
}

export default class Stream {
    private _apiClient: xCloudApiClient
    private _sessionId: string
    private _sessionPath: string
    private _state:'New'|'Provisioning'|'Provisioned'|'ReadyToConnect'|'Error'

    private _waitInterval: ReturnType<typeof setInterval> | undefined
    private _sdpInterval: ReturnType<typeof setInterval> | undefined
    private _iceInterval: ReturnType<typeof setInterval> | undefined
    private _sdpReject: ((reason?: unknown) => void) | undefined
    private _iceReject: ((reason?: unknown) => void) | undefined
    private _isStopped = false

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

    waitForState(desiredState:string):void{
        if(this._waitInterval !== undefined){
            clearInterval(this._waitInterval)
        }
        this._waitInterval = setInterval(() => {
            if(this._isStopped){
                clearInterval(this._waitInterval)
                this._waitInterval = undefined
                return
            }

            this.refreshState().then((state) => {

                if(state === desiredState || state === 'Error' || this._isStopped){
                    clearInterval(this._waitInterval)
                    this._waitInterval = undefined
                }
                
            }).catch((error:unknown) => {
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

    waitForSdpResponse():Promise<unknown>{
        if(this._sdpInterval !== undefined){
            clearInterval(this._sdpInterval)
            this._sdpInterval = undefined
        }
        if(this._sdpReject !== undefined){
            const prevReject = this._sdpReject
            this._sdpReject = undefined
            prevReject(new Error('SDP polling superseded'))
        }

        return new Promise<unknown>((resolve, reject) => {
            if(this._isStopped){
                reject(new Error('Stream stopped'))
                return
            }

            this._sdpReject = reject
            this._sdpInterval = setInterval(() => {
                if(this._isStopped){
                    clearInterval(this._sdpInterval)
                    this._sdpInterval = undefined
                    if(this._sdpReject === reject){
                        this._sdpReject = undefined
                    }
                    reject(new Error('Stream stopped'))
                    return
                }
                this._apiClient.get(this.getSessionPath()+'/sdp').then((sdpResponse:unknown) => {
                    if(this._isStopped){
                        clearInterval(this._sdpInterval)
                        this._sdpInterval = undefined
                        if(this._sdpReject === reject){
                            this._sdpReject = undefined
                        }
                        reject(new Error('Stream stopped'))
                        return
                    }
                    if((sdpResponse as { status?: number }).status !== 204){
                        clearInterval(this._sdpInterval)
                        this._sdpInterval = undefined
                        if(this._sdpReject === reject){
                            this._sdpReject = undefined
                        }
                        resolve(sdpResponse)
                    }

                }).catch(() => {
                    // Not received yet, lets retry..
                })
            }, 500)
        })
    }

    sendIceCandidates(candidates:Array<unknown>):Promise<unknown>{
        return new Promise<unknown>((resolve, reject) => {
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

    waitForIceResponse():Promise<unknown>{
        if(this._iceInterval !== undefined){
            clearInterval(this._iceInterval)
            this._iceInterval = undefined
        }
        if(this._iceReject !== undefined){
            const prevReject = this._iceReject
            this._iceReject = undefined
            prevReject(new Error('ICE polling superseded'))
        }

        return new Promise<unknown>((resolve, reject) => {
            if(this._isStopped){
                reject(new Error('Stream stopped'))
                return
            }

            this._iceReject = reject
            this._iceInterval = setInterval(() => {
                if(this._isStopped){
                    clearInterval(this._iceInterval)
                    this._iceInterval = undefined
                    if(this._iceReject === reject){
                        this._iceReject = undefined
                    }
                    reject(new Error('Stream stopped'))
                    return
                }
                this._apiClient.get(this.getSessionPath()+'/ice').then((iceResponse:unknown) => {
                    if(this._isStopped){
                        clearInterval(this._iceInterval)
                        this._iceInterval = undefined
                        if(this._iceReject === reject){
                            this._iceReject = undefined
                        }
                        reject(new Error('Stream stopped'))
                        return
                    }
                    if((iceResponse as { status?: number }).status !== 204){
                        clearInterval(this._iceInterval)
                        this._iceInterval = undefined
                        if(this._iceReject === reject){
                            this._iceReject = undefined
                        }
                        resolve(iceResponse)
                    }

                }).catch(() => {
                    // Not received yet, lets retry..
                })
            }, 1000)
        })
    }

    sendKeepalive():Promise<unknown>{
        return new Promise<unknown>((resolve, reject) => {
            this._apiClient.post(this.getSessionPath()+'/keepalive', '').then((keepaliveResponse:unknown) => {
                resolve(keepaliveResponse)
            }).catch((error:unknown) => {
                reject(error)
            })
        })
    }

    sendMSALAuth(userToken:string):Promise<unknown>{
        return this._apiClient.post(this.getSessionPath()+'/connect', JSON.stringify({
            'userToken': userToken,
        }), { 'Content-Type': 'application/json', 'Accept': 'application/json' })
    }

    private clearIntervals(reason?:Error):void{
        if(this._waitInterval !== undefined){
            clearInterval(this._waitInterval)
            this._waitInterval = undefined
        }
        if(this._sdpInterval !== undefined){
            clearInterval(this._sdpInterval)
            this._sdpInterval = undefined
        }
        if(this._iceInterval !== undefined){
            clearInterval(this._iceInterval)
            this._iceInterval = undefined
        }
        if(reason !== undefined){
            if(this._sdpReject !== undefined){
                const rejectSdp = this._sdpReject
                this._sdpReject = undefined
                rejectSdp(reason)
            }
            if(this._iceReject !== undefined){
                const rejectIce = this._iceReject
                this._iceReject = undefined
                rejectIce(reason)
            }
        }
    }

    stop():Promise<{ status: string }>{
        this._isStopped = true
        this.clearIntervals(new Error('Stream stopped'))

        return new Promise<{ status: string }>((resolve, reject) => {
            this._apiClient.delete(this.getSessionPath()).then(() => {
                resolve({ status: 'ok'})

            }).catch((error:unknown) => {
                reject(error)
            })
        })
    }
}