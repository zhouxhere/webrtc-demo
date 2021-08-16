import {User} from "./User";
import {v4} from "uuid";
import {Message} from "./Message";
import {Client} from "./Client";

export class Room {
    id: string
    name: string
    admin: User
    member: Array<User>
    messages: Array<Message>
    chat: Array<any>

    constructor(name: string, admin: User) {
        this.id = v4()
        this.name = name
        this.admin = admin
        this.member = []
        this.messages = []
        this.chat = []
        this.join(this.admin)
    }

    isIn(user: User): boolean {
        let _index = this.member.findIndex(p => p.id === user.id)
        return _index >= 0
    }

    join(user: User) {
        let _index = this.member.findIndex(p => p.id === user.id)
        if (_index < 0) {
            this.member.push(user)
        }
    }

    leave(user: User) {
        let _index = this.member.findIndex(p => p.id === user.id)
        if (_index >= 0) {
            this.member.splice(_index, 1)
        }
        this.close(user)
    }

    chown(admin: User, user: User) {
        if (admin.id !== this.admin.id) throw new Error('no permission to change owner')
        let _index = this.member.findIndex(p => p.id === user.id)
        if (_index <= 0) throw new Error('not in the room')
        this.admin = user
    }

    open(user: User, client: Client, options: any) {
        let _index = this.chat.findIndex(p => p.user.id === user.id)
        if (_index < 0) {
            this.chat.push({user: user, client: client, options: options})
        }
    }

    close(user: User) {
        let _index = this.chat.findIndex(p => p.user.id === user.id)
        if (_index >= 0) {
            this.chat.splice(_index, 1)
        }
    }

}