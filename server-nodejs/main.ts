import express from 'express'
import {createServer} from 'http'
import {Server, Socket} from 'socket.io'
import { Client } from './entity/Client';
import {User} from "./entity/User";
import {Room} from "./entity/Room";
import {Message} from "./entity/Message";

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer,{})

const rooms: Array<Room> = []

function getRoom(id: string): Room | null {
    return rooms.find(p => p.id === id) || null
}

const users: Array<User> = []

function checkUser(unique: string): boolean {
    return users.some(p => p.unique === unique)
}

function findUser(name: string, unique: string): User | null {
    return users.find(p => p.name === name && p.unique === unique) || null
}

function getUser(id: string): User | null {
    return users.find(p => p.id === id) || null
}

function getClient(user: User, clientType: string): Client | null {
    return user.clients.find(p => p.type === clientType) || null
}

io.on("connection", (socket: Socket) => {
    console.log('%d connected', socket.id)

    /**
     * 登陆操作
     * 1.顶掉上一个登陆的位置
     * 2.不同设备都可以登录
     */
    socket.on('login', req => {
        console.log('request login')
        if (checkUser(req.unique)) socket.emit('login',{status: 'error', message: 'unique is already existed'})
        let _user = findUser(req.name, req.unique)
        if (_user) {
            let _client = getClient(_user, req.clientType)
            if (_client) {
                _user.logout(req.clientType)
                socket.to(_client.socketId).emit('login', {status: 'error', message: 'login at other place'})
            }
            _user.login(socket.id, req.clientType)
            socket.emit('login', {status: 'success', message: 'login success', data: _user})
        } else {
            _user = new User(req.name, req.unique, socket.id, req.clientType)
            users.push(_user)
            socket.emit('login', {status: 'success', message: 'login success', data: _user})
        }
    })

    /**
     * 登出操作
     */
    socket.on('logout', req => {
        let _user = getUser(req.userId)
        if (_user) {
            _user.logout(req.clientType)

            let _room = getRoom(req.roomId)
            if (_room) {
                _room.leave(_user)
                socket.leave(_room.id)

                if (_room.member.length === 0) {
                    rooms.splice(rooms.findIndex(p => p.id === _room?.id), 1)
                }
            }
        }
    })

    /**
     * 新增房间
     */
    socket.on('create', req => {
        let _user = getUser(req.userId)
        if (!_user) return socket.emit('create', {status: 'failure', message: 'user not existed'})

        let _room = new Room(req.roomName, _user)
        rooms.push(_room)
        socket.join(_room.id)
        socket.emit('create', {status: 'success', message: 'create room success', data: _room})
    })

    /**
     * 加入房间
     */
    socket.on('join', req => {
        let _user = getUser(req.userId)
        if (!_user) return socket.emit('join', {status: 'failure', message: 'user not existed'})
        let _room = getRoom(req.roomId)
        if (!_room) return socket.emit('join', {status: 'failure', message: 'room not existed'})

        _room.join(_user)
        socket.join(_room.id)

        return socket.emit('join', {status: 'success', message: 'join room success', data: _room})
    })

    /**
     * 离开房间
     */
    socket.on('leave', req => {
        let _user = getUser(req.userId)
        if (!_user) return socket.emit('leave', {status: 'failure', message: 'user not existed'})
        let _room = getRoom(req.roomId)
        if (!_room) return socket.emit('leave', {status: 'failure', message: 'room not existed'})

        _room.leave(_user)
        socket.leave(_room.id)

        if (_room.member.length === 0) {
            rooms.splice(rooms.findIndex(p => p.id === _room?.id), 1)
        }

        return socket.emit('leave', {status: 'success', message: 'leave room success'})
    })

    /**
     * 发送消息
     */
    socket.on('message', req => {
        let _room = getRoom(req.roomId)
        if (!_room) return socket.emit('message', {status: 'failure', message: 'room not existed'})
        let _message = new Message(req.userId, req.content)
        _room.messages.push(_message)

        socket.to(req.roomId).emit('message', {status: 'success', data: _message})
    })

    /**
     * 加入聊天
     */
    socket.on('join_chat', req => {
        let _user = getUser(req.userId)
        if (!_user) return socket.emit('join_chat', {status: 'failure', message: 'user not existed'})
        let _room = getRoom(req.roomId)
        if (!_room) return socket.emit('join_chat', {status: 'failure', message: 'room not existed'})
        let _client = getClient(_user, req.clientType)
        if (!_client) return socket.emit('join_chat', {status: 'failure', message: 'client not existed'})

        _room.open(_user, _client, {video: req.video, audio: req.audio})

        socket.to(req.roomId).emit('join_chat', {status: 'success',data: _user})
    })

    /**
     * 离开聊天
     */
    socket.on('leave_chat', req => {
        let _user = getUser(req.userId)
        if (!_user) return socket.emit('leave_chat', {status: 'failure', message: 'user not existed'})
        let _room = getRoom(req.roomId)
        if (!_room) return socket.emit('leave_chat', {status: 'failure', message: 'room not existed'})

        _room.close(_user)

        socket.to(req.roomId).emit('leave_chat', {status: 'success',data: _user})
    })

    /**
     * 建立连接
     */
    socket.on('chat', req => {
        socket.to(req.to).emit('chat', {from: req.from, to: req.to, sdp: req.sdp, candidate: req.candidate})
    })
})

httpServer.listen(8000, () => {
    console.log('application listening 8000')
})
