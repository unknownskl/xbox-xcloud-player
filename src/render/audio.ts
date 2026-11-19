import xCloudPlayer from '../player'

export default class AudioComponent {
    private _player:xCloudPlayer

    private _element:HTMLAudioElement | undefined

    constructor(player:xCloudPlayer){
        this._player = player
    }

    create(stream:MediaStream):void {
        const element = document.getElementById(this._player.getElementId())
        if(element === null) {return}

        const audioElement = document.createElement('audio')
        audioElement.srcObject = stream
        audioElement.autoplay = true
        audioElement.muted = this._player.isMuted()
        audioElement.volume = this._player.getVolume()

        this._element = audioElement
        element.appendChild(this._element)
    }

    getElement():HTMLAudioElement | undefined{
        return this._element
    }

    setVolume(volume:number):void{
        if(typeof volume !== 'number' || Number.isNaN(volume)) {return}
        if(this._element !== undefined){
            this._element.volume = Math.min(1, Math.max(0, volume))
        }
    }

    setMuted(muted:boolean):void{
        if(this._element !== undefined){
            this._element.muted = muted
        }
    }

    destroy():void{
        if(this._element !== undefined){
            this._element.srcObject = null
            this._element.remove()
            this._element = undefined
        }
    }
}