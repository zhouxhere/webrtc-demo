import express from 'express'
import {createServer} from 'http'
import {Server, Socket} from 'socket.io'
import { Client } from './entity/Client';
import {User} from "./entity/User";
import {Room} from "./entity/Room";
import {Message} from "./entity/Message";

const app = express()

const httpServer = createServer(app)
const io = new Server(httpServer,{
    cors: {
        origin: '*'
    }
})

const rooms: Array<Room> = []

function getRoom(id: string): Room | null {
    return rooms.find(p => p.id === id) || null
}

const users: Array<User> = []

function checkUser(unique: string, name: string): boolean {
    return users.some(p => p.unique === unique && p.name != name)
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
    console.log('connected', socket.id)

    /**
     * 登陆操作
     */
    socket.on('login', req => {
        console.log('login', req)
        if (checkUser(req.unique, req.name)) return socket.emit('login',{status: 'error', message: 'unique is already existed'})
        let _user = findUser(req.name, req.unique)
        if (_user) {
            let _client = getClient(_user, req.clientType)
            if (_client) {
                socket.to(_client.socketId).emit('login', {status: 'error', message: 'login at other place'})
                _user.logout(req.clientType)
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
        console.log('logout', req)
        let _user = getUser(req.userId)
        if (_user) {
            _user.logout(req.clientType)

            let _room = getRoom(req.roomId)
            if (_room) {
                _room.leave(_user)
                socket.leave(_room.id)

                if (_room.member.length === 0) {
                    rooms.splice(rooms.findIndex(p => p.id === req.roomId), 1)
                } else {
                    io.in(req.roomId).emit('room', {status: 'success', data:_room})
                }
            }
        }

        socket.emit('logout', {status: 'success', message: 'logout success'})
    })

    /**
     * 新增房间
     */
    socket.on('create', req => {
        console.log('create', req)
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
        console.log('join', req)
        let _user = getUser(req.userId)
        if (!_user) return socket.emit('join', {status: 'failure', message: 'user not existed'})
        let _room = getRoom(req.roomId)
        if (!_room) return socket.emit('join', {status: 'failure', message: 'room not existed'})

        _room.join(_user)
        socket.join(_room.id)

        socket.emit('join', {status: 'success', message: 'join success'})
        io.in(req.roomId).emit('room', {status: 'success', data:_room})
    })

    /**
     * 获取房间信息
     */
    socket.on('room', req => {
        let _room = getRoom(req.roomId)
        if (!_room) return socket.emit('join', {status: 'failure', message: 'room not existed'})
        socket.emit('room', {status: 'success',data:_room})
    })

    /**
     * 离开房间
     */
    socket.on('leave', req => {
        console.log('leave', req)
        let _user = getUser(req.userId)
        if (!_user) return socket.emit('leave', {status: 'failure', message: 'user not existed'})
        let _room = getRoom(req.roomId)
        if (!_room) return socket.emit('leave', {status: 'failure', message: 'room not existed'})

        _room.leave(_user)
        socket.leave(_room.id)

        if (_room.member.length === 0) {
            rooms.splice(rooms.findIndex(p => p.id === req.roomId), 1)
        } else {
            io.in(req.roomId).emit('room', {status: 'success', data:_room})
        }

        socket.emit('leave', {status: 'success',message: 'leave success'})
    })

    /**
     * 发送消息
     */
    socket.on('message', req => {
        console.log('message', req)
        let _room = getRoom(req.roomId)
        if (!_room) return socket.emit('message', {status: 'failure', message: 'room not existed'})
        let _message = new Message(req.userId, req.content)
        _room.messages.push(_message)

        // socket.to(req.roomId).emit('message', {status: 'success', data: _message})
        socket.emit('message', {status: 'success', message: 'send message success'})
        io.in(req.roomId).emit('room', {status: 'success', data:_room})
    })

    /**
     * 加入聊天
     */
    socket.on('join_chat', req => {
        console.log('join_chat', req)
        let _user = getUser(req.userId)
        if (!_user) return socket.emit('join_chat', {status: 'failure', message: 'user not existed'})
        let _room = getRoom(req.roomId)
        if (!_room) return socket.emit('join_chat', {status: 'failure', message: 'room not existed'})
        let _client = getClient(_user, req.clientType)
        if (!_client) return socket.emit('join_chat', {status: 'failure', message: 'client not existed'})

        _room.open(_user, _client, {video: req.video, audio: req.audio})

        socket.emit('join_chat', {status: 'success',message: 'join chat success'})

        io.in(req.roomId).emit('room', {status: 'success', data:_room})
    })

    /**
     * 离开聊天
     */
    socket.on('leave_chat', req => {
        console.log('leave_chat', req)
        let _user = getUser(req.userId)
        if (!_user) return socket.emit('leave_chat', {status: 'failure', message: 'user not existed'})
        let _room = getRoom(req.roomId)
        if (!_room) return socket.emit('leave_chat', {status: 'failure', message: 'room not existed'})

        _room.close(_user)

        socket.emit('leave_chat', {status: 'success',message: 'leave chat success'})
        io.in(req.roomId).emit('room', {status: 'success', data:_room})
    })

    /**
     * webrtc
     */
    socket.on('chat', req => {
        console.log('chat', req)
        socket.to(req.to).emit('chat', {status: 'success', data: {from: req.from, to: req.to, sdp: req.sdp, candidate: req.candidate}})
    })

    /**
     * 断开
     */
    socket.on('close', req => {
        console.log('close',req)
        if (req.userId) {
            let _user = users.find(p => p.id === req.userId)
            if (_user) {
                _user.logout(req.clientType)

                let _room = rooms.find(p => p.id === req.roomId)
                if (_room) {
                    _room.leave(_user)

                    if (_room.member.length === 0) {
                        rooms.splice(rooms.findIndex(p => p.id === req.roomId), 1)
                    } else {
                        io.in(req.roomId).emit('room', {status: 'success', data:_room})
                    }
                }
            }
        }
        socket.disconnect()
    })


    socket.on('disconnect', () => {
        console.log('disconnect', socket.id)
    })
})


httpServer.listen(8000, () => {
    console.log('application listening 8000')
})
