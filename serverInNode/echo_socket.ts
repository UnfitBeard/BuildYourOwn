import * as net from 'net'

type TCPConn = {
    socket: net.Socket,
    end: boolean
    err: null | Error
    reader: null | {
        resolve: (value: Buffer) => void,
        reject: (err: Error) => void
    }
}

type DynBuf = {
    data: Buffer,
    length: number,
    offset: number
}

type HTTPReq = {
    method: string,
    uri: Buffer,
    version: string,
    headers: Buffer[],
};

// an HTTP response
type HTTPRes = {
    code: number,
    headers: Buffer[],
    body: BodyReader,
};

type BodyReader = {
    // the "Content-Length", -1 if unknown.
    length: number,
    // read data. returns an empty buffer after EOF.
    read: () => Promise<Buffer>,
};

async function newConn(socket: net.Socket) {
    console.log('new connection', socket.remoteAddress, socket.remotePort)
    //...
    try {
        await serveClient(socket)
    } catch (exc) {
        console.error(exc)
    } finally {
        socket.destroy()
    }

}

function soInit(socket: net.Socket): TCPConn {
    const conn: TCPConn = { socket: socket, end: false, err: null, reader: null }

    socket.on('data', (data: Buffer) => {
        console.assert(conn.reader)
        //pause socket until next read
        conn.socket.pause()
        //fulfill promise of current read
        conn.reader?.resolve(data)
        conn.reader = null
    })

    socket.on('end', () => {
        //also fulfills the current read
        conn.end = true
        if (conn.reader) {
            conn.reader.resolve(Buffer.from(''));
            conn.reader = null
        }
    })

    socket.on('error', (err: Error) => {
        conn.err = err
        if (conn.reader) {
            conn.reader.reject(err)
            conn.reader = null
        }
    })
    return conn
}

function soRead(conn: TCPConn): Promise<Buffer> {
    console.assert(!conn.reader) //no concurrent calls
    return new Promise((resolve, reject) => {
        if (conn.err) {
            reject(conn.err)
            return
        }

        if (conn.end) {
            resolve(Buffer.from(''))
            return
        }
        //save the promise callbacks
        conn.reader = { resolve: resolve, reject: reject }
        // and resume the 'data' event to fullfill promise later
        conn.socket.resume()
    })
}

function soWrite(conn: TCPConn, data: Buffer): Promise<void> {
    console.assert(data.length > 0)
    return new Promise((resolve, reject) => {
        if (conn.err) {
            reject(conn.err)
            return
        }

        conn.socket.write(data, (err?: Error | null | undefined) => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

async function serveClient(socket: net.Socket): Promise<void> {
    const conn: TCPConn = soInit(socket)
    const buf: DynBuf = { data: Buffer.alloc(0), length: 0, offset: 0 }
    while (true) {
        const msg: null | Buffer = cutMessage(buf)

        if (!msg) {
            const data: Buffer = await soRead(conn)
            bufPush(buf, data)

            //EOF
            if (data.length === 0) {
                console.log('end connection')
                return
            }

            console.log('data:', data)
            await soWrite(conn, data)

            continue
        }

    }
}

function bufPush(buf: DynBuf, data: Buffer) {
    const newLen = data.length + buf.data.length

    if (newLen > buf.data.length) {
        let cap = Math.max(buf.data.length, 32)

        if (cap < newLen) {
            cap *= 2
        }

        const grown = Buffer.alloc(cap)
        buf.data.copy(grown, 0, 0)
        buf.data = grown
    }

    data.copy(buf.data, buf.length, 0)
    buf.length = newLen
}

function cutMessage(buf: DynBuf): null | Buffer {
    const slice = buf.data.subarray(buf.offset, buf.length)
    const idx = slice.indexOf("\n")

    if (idx < 0) {
        return null
    }


    const msg = Buffer.from(slice.subarray(0, idx + 1));
    buf.offset += idx + 1
    //Hold remaining data in place until wasted space reaches a threshold like 1/2 capacity
    const wasted = buf.offset
    const capacity = buf.data.length

    if (wasted >= capacity / 2) {
        buf.data.copyWithin(0, buf.offset, buf.length)
        buf.length -= buf.offset
        buf.offset = 0
    }

    return msg
}

type TCPListener = {
    server: net.Server
}

function soListen(port: number, host: string = '127.0.0.1'): TCPListener {
    let server = net.createServer({ allowHalfOpen: true, pauseOnConnect: true })
    server.listen({ host, port }, () => {
        console.log('Server listening on port 1234')
    })
    return { server }
}

async function soAccept(listener: TCPListener): Promise<TCPConn> {
    return new Promise((resolve) => {
        listener.server.once('connection', (socket: net.Socket) => {
            const conn: TCPConn = soInit(socket)
            resolve(conn)
        })
    })
}

async function main() {
    const listener = soListen(1234)
    while (true) {
        const conn = await soAccept(listener)
        console.log('Accepted new connection')
        await serveClient(conn.socket)
    }
}

main()