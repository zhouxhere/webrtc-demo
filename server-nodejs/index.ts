import express, {Request, Response} from 'express'
import {createServer} from 'http'
import {Server, Socket} from 'socket.io'
import passport from "passport";

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer,{})

app.post('login', passport.authenticate('local'), (req: any,res: any) => {
    res.redirect('/users/' + req.user.username)
})

io.on("connection", (socket: Socket) => {
    console.log(socket)
})

httpServer.listen(8000, () => {
    console.log('application listening 8000')
})
