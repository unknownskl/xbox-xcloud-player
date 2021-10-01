import xCloudPlayer from '../Library'

export default class AudioComponent {

    _client:xCloudPlayer

    _audioSource
    _mediaSource
    _audioRender

    constructor(client:xCloudPlayer) {
        this._client = client
    }

    create() {
        console.log('xCloudPlayer Component/Audio.ts - Create media element')

        const audioHolder = document.getElementById(this._client._elementHolder)
        if(audioHolder !== null){
            const audioSrc = this.createMediaSource()
            const audioRender = document.createElement('audio')
            audioRender.id = this.getElementId()
            audioRender.src = audioSrc
            audioRender.play()

            this._audioRender = audioRender
            
            audioHolder.appendChild(audioRender)
        } else {
            console.log('xCloudPlayer Component/Audio.ts - Error fetching audioholder: div#'+this._client._elementHolder)
        }

        console.log('xCloudPlayer Component/Audio.ts - Media element created')
    }

    getElementId(){
        return 'xCloudPlayer_'+this._client._elementHolderRandom+'_audioRender'
    }

    getSource() {
        return this._audioSource
    }

    createMediaSource(){
        const mediaSource = new MediaSource()
        const audioSourceUrl = window.URL.createObjectURL(mediaSource)

        mediaSource.addEventListener('sourceopen', () => {
            console.log('xCloudPlayer Component/Audio.ts - MediaSource opened. Attaching audioSourceBuffer...')

            // if safari?
            let codec = 'audio/webm;codecs=opus'
            if (this._isSafari()){
                codec = 'audio/mp4' // @TODO: Fix audio issues on Safari
            }
            // alert('codec: '+codec)
        
            const audioSourceBuffer = mediaSource.addSourceBuffer(codec)
            audioSourceBuffer.mode = 'sequence'

            // audioSourceBuffer.addEventListener('updateend', (event) => {
            //     // console.log('xCloudPlayer Component/Audio.ts - Updateend audio...', event);
            // })

            // audioSourceBuffer.addEventListener('update', (event) => {
            //     // console.log('xCloudPlayer Component/Audio.ts - Updateend audio...', event);
            // })

            audioSourceBuffer.addEventListener('error', (event) => {
                console.log('xCloudPlayer Component/Audio.ts - Error audio...', event)
            })

            this._audioSource = audioSourceBuffer
        })

        this._mediaSource = mediaSource

        return audioSourceUrl
    }

    destroy() {
        // this._audioRender.pause()

        delete this._mediaSource
        delete this._audioRender
        delete this._audioSource
        
        document.getElementById(this.getElementId())?.remove()

        console.log('xCloudPlayer Component/Audio.ts - Cleaning up audio element')
    }

    _isSafari(){
        return (navigator.userAgent.search('Safari') >= 0 && navigator.userAgent.search('Chrome') < 0)
    }
}