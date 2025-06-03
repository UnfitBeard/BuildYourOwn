import { Socket } from 'dgram';
import { error } from "console"
import * as net from "net"

type TCPConn = {
    socket: net.Socket,
    err: Error | null,
    ended: boolean,
    reader: null | {
        resolve: (value: Buffer) => void,
        reject: (reason: Error) => void
    }
}

async function soInit(socket: net.Socket) {
    const conn:TCPConn = {
        socket: socket,
        err: null,
        ended: false,
        reader: null
    }

    conn.socket.on("data", (data:Buffer) => {
        console.assert(conn.reader)
        conn.socket.pause()
        conn.reader?.resolve(data)
        conn.reader = null
    })

    conn.socket.on("error", (err: Error) => {
        conn.err = err
        console.log("Error: ", err)
    })

    conn.socket.on("end", () => {
        conn.ended = true
        console.log(Buffer.from(''))//EOF
    })
    return conn
}

async function soRead(conn:TCPConn): Promise<Buffer> {
    console.assert(!conn.reader)
    return new Promise((resolve, reject) => {
        conn.reader = {resolve: resolve, reject: reject}
        conn.socket.resume();
    })
}

async function soWrite(conn:TCPConn, data:Buffer):Promise<void> {
    console.assert(data.length > 0)
    return new Promise((resolve, reject) => {
        if (conn.err) {
            throw new Error("Unexpected EOF")
        }
        conn.socket.write(data, (error:Error | null | undefined) => {
            if (error) {
                reject(conn.err)
            } else {
                resolve()
            }
    
        })
    })
}

const server = net.createServer({allowHalfOpen: true, pauseOnConnect: true});
server.listen({ port: 1234, hostname: "localhost" }, () => {
    console.log(`Server listening on localhost:1234`)
})
server.on("connection", async (socket: net.Socket) => {
    console.log("Connected on port whatever")
    await soInit(socket)
})
