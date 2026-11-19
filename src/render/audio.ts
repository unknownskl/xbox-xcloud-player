import xCloudPlayer from '../player'

export default class AudioComponent {
    private _player:xCloudPlayer

    private _element:HTMLAudioElement | undefined

    constructor(player:xCloudPlayer){
        this._player = player
    }

    create(stream:MediaStream):void {
        const audioElement = document.createElement('audio')
        audioElement.srcObject = stream
        audioElement.autoplay = true
        audioElement.muted = false

        this._element = audioElement

        const element = document.getElementById(this._player.getElementId())
        if(element === null) {return}

        element.appendChild(this._element)
    }

    getElement():HTMLAudioElement | undefined{
        return this._element
    }

    destroy():void{
        const streamHolder = document.getElementById(this._player.getElementId())
        const element = streamHolder?.querySelector('audio')

        if(element){
            element.remove()
        }
    }
}