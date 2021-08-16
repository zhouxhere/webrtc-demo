import {v4} from "uuid";

export class Message {
    id: string
    userId: string
    content: string
    timestamp: number


    constructor(userId: string, content: string) {
        this.userId = userId;
        this.content = content;
        this.id = v4()
        this.timestamp = new Date().valueOf()
    }
}