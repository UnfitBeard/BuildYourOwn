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

type TCPListener = {
    server: net.Server
}

type DynBuf = {
    data:Buffer,
    length: number,
    offset: number
}

function soInit(socket: net.Socket):TCPConn {
    const conn: TCPConn = {
        socket: socket,
        err: null,
        ended: false,
        reader: null
    }

    conn.socket.on("data", (data: Buffer) => {
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

async function soRead(conn: TCPConn): Promise<Buffer> {
    console.assert(!conn.reader)
    return new Promise((resolve, reject) => {
        conn.reader = { resolve: resolve, reject: reject }
        conn.socket.resume();
    })
}

async function soWrite(conn: TCPConn, data: Buffer): Promise<void> {
    console.assert(data.length > 0)
    return new Promise((resolve, reject) => {
        if (conn.err) {
            throw new Error("Unexpected EOF")
        }
        conn.socket.write(data, (error: Error | null | undefined) => {
            if (error) {
                reject(conn.err)
            } else {
                resolve()
            }

        })
    })
}

function soListen(port:number, host: string = "127.0.0.1"): TCPListener {
    let server = net.createServer({ allowHalfOpen: true, pauseOnConnect: true });

    server.listen({ port, hostname: host}, () => {
        console.log(`Server listening on localhost:1234`)
    })

    return { server }
}

function soAccept(listener: TCPListener): Promise<TCPConn> {
    return new Promise((resolve) => {
        listener.server.once("connection", (socket: net.Socket) => {
            const conn: TCPConn = soInit(socket)
            resolve(conn)
        })
    })
}

async function main() {
    const listener = soListen(1234)
    while (true) {
        const conn = await soAccept(listener);
        console.log("Accepted new connection")
        serveClient(conn)
    }
}
main()

async function serveClient(conn:TCPConn) {
    while (true) {
        const msg:Buffer = await soRead(conn);
        if (msg.length === 0) {
            console.log(Buffer.from('')) //EOF
        } else {
            console.log(msg)
            await soWrite(conn, msg)
        }
    
        if (msg.includes('q')) {
            console.log("Connection ended")
            conn.ended = true
            conn.socket.destroy()
        }
    }
}

