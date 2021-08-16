import { v4 } from 'uuid'
import { Client } from './Client'

export class User {
    id: string
    name: string
    unique: string
    status: string
    clients: Array<Client>

    constructor(name: string, unique: string, socketId: string, clientType: string) {
        this.id = v4()
        this.name = name
        this.unique = unique
        this.status = ''
        this.clients = []
        this.login(socketId, clientType)
    }

    login(socketId: string, clientType: string) {
        this.status = 'online'
        let _client = this.clients.find(p => p.type === clientType)
        if (_client) {
            _client.login(socketId)
        } else {
            _client = new Client(socketId, clientType, 'online')
            this.clients.push(_client)
        }
    }

    logout(clientType: string) {
        // this.status = 'offline'
        let _client = this.clients.find(p => p.type === clientType)
        if (_client) {
            _client.logout()
            // setTimeout(() => {
            //     this.clients.splice(this.clients.findIndex(p => p.type === clientType), 1)
            // }, 1000 * 60 * 30)
        }
        this.status = this.clients.some(p => p.status === 'online') ? 'online' : 'offline'
    }
}
