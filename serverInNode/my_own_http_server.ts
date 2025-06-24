import * as net from "net"
import { buffer } from "stream/consumers"

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
    data: Buffer,
    length: number,
    offset: number
}

type HTTPReq = {
    method: string,
    uri: Buffer,
    version: string,
    headers: Buffer
}

type HTTPRes = {
    code :number,
    headers: Buffer[],
    body: BodyReader
}

type BodyReader ={
    length: number,
    read: () => Promise<Buffer>
}

const HTTPError = ''

function soInit(socket: net.Socket): TCPConn {
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

function soListen(port: number, host: string = "127.0.0.1"): TCPListener {
    let server = net.createServer({ allowHalfOpen: true, pauseOnConnect: true });
    server.listen({ port, hostname: host }, () => {
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

async function serveClient(conn: TCPConn) {
    const buf: DynBuf = { data: Buffer.alloc(0), length: 0, offset: 0 }
    while (true) {
        const msg: null | HTTPReq  = cutMessage(buf)
        if (!msg) {
            const data = await soRead(conn)
            bufPush(data, buf)

            if (data.length === 0 && buf.length === 0) {
                return
            }

            if (data.length === 0) {
                throw new HTTPError(400, 'Unexpected EOF')
            }
            // got some data try it again
            continue
        } 

        // Process the message and send the response
        const reqBody: BodyReader = readerFromReq(conn, buf, msg)
        const res:HTTPRes = await handleReq(msg, reqBody)
        await writeHTTPResp(conn, res);

        // close the connection for HTTP/1.0
        if (msg.version === '1.0') {
            return
        }

        // make sure the request body is consumed completely
        while ((await reqBody.read()).length > 0) {/* empty */}
    }
}

function bufPush(data: Buffer, buf: DynBuf) {
    let newLen = data.length + buf.length

    if (newLen > buf.data.length) {
        let cap = Math.max(32, newLen)

        while (cap < newLen) {
            cap += 2
        }

        const grown = Buffer.alloc(cap)
        buf.data.copy(grown, 0, 0)
        buf.data = grown
    }

    data.copy(buf.data, buf.length, 0)
    buf.length = newLen
}

function cutMessage(buf: DynBuf): null | HTTPReq | Buffer {
    const slice = buf.data.subarray(buf.offset, buf.length)
    const idx = slice.indexOf("\n")

    if (idx < 0) {
        return null;
    }

    const msg = Buffer.from(buf.data.subarray(0, idx + 1))

    buf.offset += idx + 1

    const wasted = buf.offset

    const capacity = buf.data.length

    if (wasted > capacity * 0.5) {
        bufPop(buf)
    }
    return msg;
}

function bufPop(buf: DynBuf) {
    buf.data.copyWithin(0, buf.offset, buf.length)
    buf.length -= buf.offset
    buf.offset = 0
}

function readerFromReq(conn: TCPConn, buf: DynBuf, msg: Buffer | HTTPReq): BodyReader {
    throw new Error("Function not implemented.")
}

function handleReq(msg: Buffer | HTTPReq, reqBody: BodyReader): HTTPRes | PromiseLike<HTTPRes> {
    throw new Error("Function not implemented.")
}

function writeHTTPResp(conn: TCPConn, res: HTTPRes) {
    throw new Error("Function not implemented.")
}

