import xCloudPlayer from '../Library'

export default class LatencyCounter {

    _name:string
    _application:xCloudPlayer

    _latency:Array<number> = []

    _eventInterval

    constructor(application:xCloudPlayer, name:string) {
        this._name = name
        this._application = application
    }

    start() {
        this._eventInterval = setInterval(() => {

            let latencyCount = 0
            let minLatency = 999
            let maxLatency = 0
            // console.log('latency:', this._latency)

            for(const latencyTime in this._latency){
                if(this._latency[latencyTime] !== undefined){
                    latencyCount += this._latency[latencyTime]
                }

                if(this._latency[latencyTime] < minLatency){
                    minLatency = this._latency[latencyTime]
                }

                if(this._latency[latencyTime] > maxLatency){
                    maxLatency = this._latency[latencyTime]
                }
            }
            
            if(this._latency.length > 0){
                latencyCount = (latencyCount/this._latency.length)
            }

            minLatency = Math.round(minLatency*100)/100
            maxLatency = Math.round(maxLatency*100)/100
            const avgLatency = Math.round(latencyCount*100)/100

            // console.log('xCloudPlayer Helper/LatencyCounter.ts [latency_'+this._name+'] - Emit min:', minLatency, 'avg:', avgLatency, 'max:', maxLatency)

            this._application.getEventBus().emit('latency_'+this._name, {
                avg: avgLatency,
                min: minLatency,
                max: maxLatency,
            })

            this._latency = []
        }, 1000)
    }

    stop() {
        clearInterval(this._eventInterval)
    }

    count(time) {
        this._latency.push(time)
    }

}