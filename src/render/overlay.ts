import xCloudPlayer from '../player'
import VideoComponent from './video'

interface OverlayInterface {
    debug: undefined | HTMLElement;
}

export default class Overlay {
    private _player:xCloudPlayer
    private _videoComponent:VideoComponent

    private _overlays:OverlayInterface = {
        debug: undefined,
    }

    constructor(videoComponent:VideoComponent, player:xCloudPlayer){
        this._videoComponent = videoComponent
        this._player = player
    }

    toggleDebug(){
        if(this._overlays.debug === undefined){
            this.createDebugOverlay()
        } else {
            this.destroyDebugOverlay()
        }
    }

    createDebugOverlay(){
        this._overlays.debug = document.createElement('div')
        this._overlays.debug.id = 'playerDebugOverlay'

        this._overlays.debug.style.position = 'absolute'
        this._overlays.debug.style.top = '0'
        this._overlays.debug.style.left = '0'
        this._overlays.debug.style.width = this._videoComponent.getElement()?.style.width || '100%'
        this._overlays.debug.style.height = this._videoComponent.getElement()?.style.height || 'auto'
        this._overlays.debug.style.background = 'linear-gradient(0deg, rgba(0,0,0, 0) 0%, rgba(0,0,0, 0) 75%, rgba(0,0,0, 0.5) 100%)'
        this._overlays.debug.style.padding = '10px'

        document.getElementById(this._player.getElementId())?.appendChild(this._overlays.debug)

        setTimeout(() => {
            this.refreshDebugOverlay()
        }, 500)
        this.refreshDebugOverlay()
    }

    destroyDebugOverlay(){
        this._overlays.debug?.remove()
        this._overlays.debug = undefined
    }

    refreshDebugOverlay(){
        if(this._overlays.debug !== undefined){
            this._overlays.debug.innerHTML = ''

            this._overlays.debug.appendChild(this.createLabel('Local Play', this._player.getStats()._remoteIsLocal ? 'Local' : 'Remote', this._player.getStats()._remoteIsLocal ? 'ok' : 'warning'))
            this._overlays.debug.appendChild(this.createLabel('Resolution', this._player.getStats()._videoWidth+'x'+this._player.getStats()._videoHeight, 'ok'))
            this._overlays.debug.appendChild(this.createLabel('FPS', this._player.getStats()._videoFps.toString(), this._player.getStats()._videoFps >= 58 ? 'ok' : 'warning'))
            this._overlays.debug.appendChild(this.createLabel('Connection', this._player.getStats()._remoteIsIpv6 ? 'IPv6' : 'IPv4', 'ok'))
            
            setTimeout(() => {
                this.refreshDebugOverlay()
            }, 500)
        }
    }

    createLabel(text:string, value:string = '', style:string = ''){
        const labelStyle = {
            borderRadius: '5px',
            background: 'linear-gradient(0deg, rgba(28,26,26,1) 0%, rgba(47,45,45,1) 100%)',
            padding: '10px',
            fontSize: '12px',
            marginRight: '10px',
            textTransform: 'uppercase',
            color: 'white',
        }

        const element = document.createElement('span')

        const colors = {
            'error': 'rgb(220, 53, 69)',
            'warning': 'rgb(255, 193, 7)',
            'ok': 'rgb(25, 135, 84)',
        }

        if(value !== ''){
            element.innerHTML = `${text}: <span style="background: ${colors[style]}; border-radius: 5px; padding: 4px; padding-left: 8px; padding-right: 8px;">${value}</span>`
        } else {
            element.innerText = text
        }
            

        for(const key in labelStyle){
            element.style[key] = labelStyle[key]
        }
        return element
    }
    
}