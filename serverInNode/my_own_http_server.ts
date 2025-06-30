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
    headers: Buffer[]
}

type HTTPRes = {
    code: number,
    headers: Buffer[],
    body: BodyReader
}

type BodyReader = {
    length: number,
    read: () => Promise<Buffer>
}

class HTTPError extends Error {
    statusCode: number
    constructor(statusCode: number, message?: string) {
        super(message);

        Object.setPrototypeOf(this, HTTPError.prototype)

        this.name = 'HTTPError';
        this.statusCode = statusCode;
    }
}

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

async function serveClient(conn: TCPConn) {
    const buf: DynBuf = { data: Buffer.alloc(0), length: 0, offset: 0 }
    while (true) {
        const msg: null | HTTPReq = cutMessage(buf)
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
        const res: HTTPRes = await handleReq(msg, reqBody)
        await writeHTTPResp(conn, res);

        // close the connection for HTTP/1.0
        if (msg.version === '1.0') {
            return
        }

        // make sure the request body is consumed completely
        while ((await reqBody.read()).length > 0) {/* empty */ }
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

// Define the maximum length of header
const kMaxHeaderLen = 1024 * 8;

// parse and remove qa heaedr from beginning of parser if possible
function cutMessage(buf: DynBuf): HTTPReq|null {
    const slice = buf.data.subarray(0, buf.length)
    const idx = slice.indexOf("\r\n\r\n")

    if (idx < 0) {
        if (buf.length > kMaxHeaderLen) {
            throw new HTTPError(413, "Header is too large")
        }
        return null; // need more data
    }

    // parse and remove header
    const msg = parseHTTPReq(buf.data.subarray(0, idx + 4))
    bufPop(buf, idx + 4)
    return msg;
}

function bufPop(buf: DynBuf, idx: number) {
    buf.data.copyWithin(0, idx, buf.length)
    buf.length -= idx
    // buf.offset = 0
}

function readerFromReq(conn: TCPConn, buf: DynBuf, req: HTTPReq): BodyReader {
    let bodyLen = -1
    const contentLen = fieldGet(req.headers, "Content-Length")
    if (contentLen) {
        bodyLen = parseDec(contentLen.toString('latin1'));
        if (isNaN(bodyLen)) {
            throw new HTTPError(400, "Invalid Content-Length")
        }
    }

    const bodyAllowed = !(req.method === 'GET' || req.method === 'HEAD');
    const chunked = fieldGet(req.headers, "Transfer-Encoding")?.equals(Buffer.from("chunked")) || false;

    if (!bodyAllowed &&(bodyLen > 0|| chunked)) {
        throw new HTTPError(400, "Body not allowed")
    }

    if (!bodyAllowed) {
        bodyLen = 0
    }

    if (bodyLen >= 0) {
        // Content Length is present
        return readerFromConnLength(conn, buf, bodyLen)
    } else if (chunked) {
        // chunked encoding 
        throw new HTTPError(501, "TODO")
    } else {
        // read the rest of the connection
        throw new HTTPError(501, "TODO")
    }

}

async function handleReq(req: HTTPReq, body: BodyReader): Promise<HTTPRes> {
    // act on the request URI
   let resp: BodyReader;
   switch (req.uri.toString('latin1')) {
    case '/echo':
        // http echo server
        resp = body
        break;

    default:
        resp = readerFromMemory(Buffer.from('hello world\n'));
        break;
   }

   return {
    code: 200,
    headers:[Buffer.from('Server: my_first_http_server')],
    body: resp
   }
}

async function writeHTTPResp(conn: TCPConn, resp: HTTPRes) {
    if (resp.body.length < 0) {
        throw new Error('TODO: Chunked Encoding')
    }

    // Set the content -length field
    console.assert(!fieldGet(resp.headers, 'Content-Length'))
    resp.headers.push(Buffer.from(`Content-Length: ${resp.body.length}`));

    // write the header
    await soWrite(conn, await encodeHTTPResp(resp));
    // write the body
    while (true) {
        const data = await resp.body.read();
        if (data.length === 0) {
            break; // done
        }
        await soWrite(conn, data);
    }
}

async function newConn(socket: net.Socket): Promise<void> {
    const conn: TCPConn = soInit(socket);
    try {
        await serveClient(conn)
    } catch (exc) {
        console.error("Error while serving client: ", exc);
        if (exc instanceof HTTPError) {
            // intended to send an error response
            const resp: HTTPRes = {
                code: exc.statusCode,
                headers: [],
                body: readerFromMemory(Buffer.from(exc.message + '\n'))
            };
            try {
                await writeHTTPResp(conn, resp);
            } catch (exc) {
                /* ignore */
            }
        }
    } finally {
        socket.destroy()
    }
}

function readerFromMemory(data: Buffer): BodyReader {
    let done = false
    return {
        length: data.length,
        read: async (): Promise<Buffer> => {
            if (done) {
                return Buffer.from('')
            } else {
                done = true;
                return data;
            }
        }
    }
}

// parse a HTTP Request Header
function parseHTTPReq(data: Buffer) {
    // split the data into lines
    const lines: Buffer[] = splitLines(data)

    // the first line is `method URI version`
    const [method, uri, version] = parseRequestLine(lines[0])

    // followed by header fields in the format of `Name"Value`
    const headers: Buffer[] = []
    for (let i = 1; i<lines.length - 1; i++) {
        const h = Buffer.from(lines[i])

        if(!validateHeader(h)) {
            throw new HTTPError(400, 'Bad field')
        }
        headers.push(h)
    }

    // the header ends by an empty line
    console.assert(lines[lines.length - 1].length === 0)
    return {
        method: method,
        uri: Buffer.from(uri),
        version: version,
        headers: headers
    }
}

function splitLines(data: Buffer): Buffer[] {
    let linesArr = []
    let start = 0
    let idx:number;

    while ((idx = data.indexOf("\r\n\r\n", start)) !== -1) {
        linesArr.push(data.subarray(start, idx));
        start = idx + 4; 
    }

    if (start < data.length) {
        linesArr.push(data.subarray(start))
    }

    return linesArr
}

function parseRequestLine(line: Buffer) {
    const firstLine = line.toString().split('\r\n')[0]; // Extract the first line
    console.log("Request Line:", firstLine); // Debugging log

    const lineParts = firstLine.split(' ');
    const requestLinePattern = /^[A-Z]+ \S+ HTTP\/\d+\.\d+$/;

    if (!requestLinePattern.test(lineParts.join(' '))) {
        throw new HTTPError(413, `Invalid HTTP Request: ${firstLine}`);
    }

    const [method, uri, version] = lineParts;
    return [method, uri, version];
}

function validateHeader(h: Buffer): boolean {
    const regex = /^[A-Za-z\-]+:\s.+$/g
    return regex.test(h.toString())
}

function fieldGet(headers: Buffer[], key: string): null|Buffer {
    return headers.find(header => {
        header.toString('latin1') == key.toString()
    }) || null
}

function parseDec(arg0: string): number {
    return parseInt(arg0, 10);
}

function readerFromConnLength(conn: TCPConn, buf: DynBuf, remain: number): BodyReader {
    return {
        length: remain,
        read: async(): Promise<Buffer> => {
            if (remain === 0) {
                return Buffer.from(''); //done
            }
            if (buf.length === 0) {
                // try to get some data if there is none
                const data = await soRead(conn);
                bufPush(data, buf);
                if (data.length === 0) {
                    // expect more data
                    throw new Error('Unexpected EOF from HTTP Body');
                }
            }

            // consume data from the buffer
            const consume = Math.min(buf.length, remain)
            remain -= consume;
            const data = Buffer.from(buf.data.subarray(0, consume))
            bufPop(buf, consume)
            return data;
        }
    }
}


main()

async function encodeHTTPResp(resp: HTTPRes): Promise<Buffer> {
    let header = `HTTP/1.1 ${resp.code} OK\r\n`;
    for (const h of resp.headers) {
        header += h.toString('latin1') + '\r\n';
    }
    header += '\r\n'; // end of headers

    const body = resp.body.length > 0 ? await resp.body.read() : Buffer.from('');
    return Buffer.concat([Buffer.from(header, 'latin1'), body]);
}
