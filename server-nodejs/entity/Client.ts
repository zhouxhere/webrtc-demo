import { v4 } from 'uuid'

export class Client {
    id: string
    socketId: string
    type: string
    status: string

    constructor(socketId: string, type: string, status: string) {
        this.id = v4()
        this.socketId = socketId
        this.type = type;
        this.status = status;
    }

    login(socketId: string) {
        this.socketId = socketId
        this.status = 'online'
    }

    logout() {
        this.socketId = ""
        this.status = 'offline'
    }
}