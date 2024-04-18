export default class VideoComponent {
    private _player:any

    constructor(player:any){
        this._player = player
    }

    create(stream:MediaStream) {
        const videoElement = document.createElement('video')
        videoElement.srcObject = stream
        videoElement.autoplay = true
        videoElement.muted = true
        videoElement.style.width = '100%'
        videoElement.style.height = '100%'
        videoElement.style.objectFit = 'contain'
        videoElement.style.backgroundColor = 'black'

        const element = document.getElementById(this._player._elementId)
        if(element === null) {return}

        element.appendChild(videoElement)
    }

    destroy(){
        const streamHolder = document.getElementById(this._player._elementId)
        const element = streamHolder?.querySelector('video')

        if(element){
            element.remove()
        }
    }
}