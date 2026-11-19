import xCloudPlayer from '../player'

export default class AudioComponent {
    private _player:xCloudPlayer

    private _element:HTMLAudioElement | undefined

    constructor(player:any){
        this._player = player
    }

    create(stream:MediaStream):void {
        const element = document.getElementById(this._player.getElementId())
        if(element === null) {return}

        const audioElement = document.createElement('audio')
        audioElement.srcObject = stream
        audioElement.autoplay = true
        audioElement.muted = false

        this._element = audioElement
        element.appendChild(this._element)
    }

    getElement():HTMLAudioElement | undefined{
        return this._element
    }

    destroy():void{
        if(this._element !== undefined){
            this._element.srcObject = null
            this._element.remove()
            this._element = undefined
        }
    }
}