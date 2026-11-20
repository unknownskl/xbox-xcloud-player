export default class Teredo {
    private _address:string

    private _ipv4Address:string
    private _ipv4Port:number

    static expandIpv6(address:string): string[] | undefined {
        if(typeof address !== 'string' || address === ''){
            return undefined
        }

        const hasCompression = address.includes('::')
        let parts: string[]

        if(hasCompression){
            const sections = address.split('::')
            if(sections.length !== 2){
                return undefined
            }
            const left = sections[0] === '' ? [] : sections[0].split(':')
            const right = sections[1] === '' ? [] : sections[1].split(':')
            const missing = 8 - (left.length + right.length)
            if(missing < 1){
                return undefined
            }
            parts = [...left, ...Array(missing).fill('0000'), ...right]
        } else {
            parts = address.split(':')
        }

        if(parts.length !== 8){
            return undefined
        }

        const expanded: string[] = []
        for(const hextet of parts){
            if(!/^[0-9a-fA-F]{1,4}$/.test(hextet)){
                return undefined
            }
            expanded.push(hextet.padStart(4, '0'))
        }

        return expanded
    }

    static isTeredoAddress(address:string): boolean {
        const expanded = Teredo.expandIpv6(address)
        return expanded !== undefined && expanded[0].toLowerCase() === '2001' && expanded[1] === '0000'
    }

    constructor(address:string){
        this._address = address

        const expanded = Teredo.expandIpv6(this._address)
        if(expanded === undefined){
            this._ipv4Address = '0.0.0.0'
            this._ipv4Port = 0
            return
        }

        const ipv4_part = expanded[6] + expanded[7]
        const ipv4_port_part = expanded[5]

        const ip_1 = ~parseInt(ipv4_part.substring(0, 2), 16) & 0xFF
        const ip_2 = ~parseInt(ipv4_part.substring(2, 4), 16) & 0xFF
        const ip_3 = ~parseInt(ipv4_part.substring(4, 6), 16) & 0xFF
        const ip_4 = ~parseInt(ipv4_part.substring(6, 8), 16) & 0xFF
        const port_1 = ~parseInt(ipv4_port_part.substring(0, 4), 16) & 0xFFFF

        this._ipv4Address = ip_1+'.'+ip_2+'.'+ip_3+'.'+ip_4
        this._ipv4Port = port_1
    }

    getIpv4Address(){
        return this._ipv4Address
    }

    getIpv4Port(){
        return this._ipv4Port
    }
}