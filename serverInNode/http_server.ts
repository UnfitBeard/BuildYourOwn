import { rejects } from "assert"
import * as net from "net"
import { resolve } from "path"
// parsed HTTP Request Header
type HTTPReq = {
    method: string,
    uri: Buffer,
    version: string,
    headers: Buffer[],
}

type TCPListener = {
	server: net.Server
}

// HTTP Response
type HTTPRes = {
    code: number,
    headers: Buffer[],
    body: BodyReader,
}

// interface for reading data from the HTTP body
type BodyReader = {
    length: number,
    read: () => Promise<Buffer>,
}

type TCPConn = {
    socket: net.Socket,
    err: null | Error,
    ended: boolean,
    reader: null | {
        resolve: (value: Buffer) => void,
        reject: (reason: Error) => void
    }
}

type DynBuf = {
    data: Buffer,
    length: number,
    offset: number
}

class HTTPError extends Error {
    code: number;
    constructor(code: number, message: string) {
        super(message);
        this.code = code;
    }
}

async function serveClient(conn: TCPConn): Promise<void> {
    const buf: DynBuf = { data: Buffer.alloc(0), length: 0, offset: 0 }
    while (true) {
        // try to get 1 request header from the buffer
        const msg: null | HTTPReq = cutMessage(buf)
        if (!msg) {
            const data: Buffer = await soRead(conn)
            bufPush(buf, data);
            // EOF
            if (data.length === 0 && buf.length === 0) {
                return; // no more requests
            }
            if (data.length === 0) {
                throw new HTTPError(400, 'Unexpected EOF')
            }

            //got some data 
            continue
        }

        // process the message and send the request
        const reqBody: BodyReader = readerFromReq(conn, buf, msg)

        const res: HTTPRes = await handleReq(msg, reqBody)
        await writeHTTPResp(conn, res)

        // close the connection for HTTP/1.0
        if (msg.version === '1.0') {
            return
        }

        // make sure that the request body is consumed completely
        while ((await reqBody.read()).length > 0) { /*empty */ }

    }// loop for 10
}

async function newConn(socket: net.Socket): Promise<void> {
    const conn: TCPConn = soInit(socket)
    try {
        await serveClient(conn)
    } catch (error) {
        console.error('exception:', error)
        if (error instanceof HTTPError) {
            //intended to send an error response
            const resp: HTTPRes = {
                code: error.code,
                headers: [],
                body: readerFromMemory(Buffer.from(error.message + '\n'))
            }
            try {
                await writeHTTPResp(conn, resp);
            } catch (error) {
                /*ignore*/
            }
        }
    } finally {
        socket.destroy()
    }
}

// maximum length of a http header
const kMaxHeaderLen = 1024 * 8

// parse and remove a header from the beginning of the buffer if possible
function cutMessage(buf: DynBuf): null | HTTPReq {
    //end of header is marked by \r\n\r\n
    const idx = buf.data.subarray(0, buf.length).indexOf("\r\n\r\n")
    if (idx < 0) {
        if (buf.length >= kMaxHeaderLen) {
            throw new HTTPError(413, 'header is too large')
        }
        return null // need more data
    }
    // parse and remove the header
    const msg = parseHTTPReq(buf.data.subarray(0, idx + 4))
    bufPop(buf, idx + 4);
    return msg;
}

function bufPush(buf: DynBuf, data: Buffer) {
    const newLen = buf.data.length + data.length

    if (newLen > buf.data.length) {
        let cap = Math.max(32, buf.data.length)

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

function readerFromReq(
    conn: TCPConn, buf: DynBuf, req: HTTPReq): BodyReader {
    let bodyLen = -1
    const contentLen = fieldGet(req.headers, 'Content-Length');
    if (contentLen) {
        bodyLen = parseDec(contentLen.toString('latin1'))
        if (isNaN(bodyLen)) {
            throw new HTTPError(400, 'bad content Length.')
        }
    }
    const bodyAllowed = !(req.method === 'GET' || req.method === 'HEAD')
    const chunked = fieldGet(req.headers, 'Transfer-Encoding')
        ?.equals(Buffer.from('chunked')) || false
    if (!bodyAllowed && bodyLen > 0 || chunked) {
        throw new HTTPError(400, 'Body not allowed')
    }

    if (!bodyAllowed) {
        bodyLen = 0;
    }

    if (bodyLen >= 0) {
        // "Content-Length" is present
        return readerFromConnLength(conn, buf, bodyLen)
    } else if (chunked) {
        // chunked encoding
        throw new HTTPError(501, 'TODO')
    } else {
        // read the rest of the connection
        throw new HTTPError(501, 'TODO')
    }
}

async function writeHTTPResp(conn: TCPConn, resp: HTTPRes): Promise<void> {
    if (resp.body.length < 0) {
        throw new Error('TODO: chunked encoding')
    }
    // set the "Content-Length" field
    console.assert(!fieldGet(resp.headers, 'Content-Length'))
    resp.headers.push(Buffer.from(`Content-Length: ${resp.body.length}`))
    // write the header
    await soWrite(conn, encodeHTTPResp(resp));
    // write the body
    while (true) {
        const data = await resp.body.read()
        if (data.length === 0) {
            break
        }
        await soWrite(conn, data)
    }
}

function handleReq(req: HTTPReq, body: BodyReader): Promise<HTTPRes> {
    // act on the request Uri
    let resp: BodyReader;
    switch (req.uri.toString('latin1')) {
        case '/echo':
            // http echo server
            resp = body;
            break;
        default:
            resp = readerFromMemory(Buffer.from("hello world.\n"));
            break;
    }

    return Promise.resolve({
        code: 200,
        headers: [Buffer.from('Server: my_first_http_server')],
        body: resp
    });
}

function soInit(socket: net.Socket): TCPConn {
    const conn: TCPConn = {
        socket: socket,
        err: null,
        ended: false,
        reader: null
    }

    socket.on('data', (data: Buffer) => {
        console.assert(conn.reader);
        conn.socket.pause();
        conn.reader?.resolve(data);
        conn.reader = null;
    })

    socket.on('end', () => {
        conn.ended = true;
        if (conn.reader) {
            conn.reader.resolve(Buffer.from(''))//EOF
            conn.reader = null;
        }
    })

    socket.on('error', (error: Error) => {
        conn.err = error;
        if (conn.reader) {
            conn.reader.reject(error)
            conn.reader = null;
        }
    })

    return conn;
}

function readerFromMemory(data: Buffer): BodyReader {
    let done = false;
    return {
        length: data.length,
        read: async (): Promise<Buffer> => {
            if (done) {
                return Buffer.from('')// no more data
            } else {
                done = true;
                return data;
            }
        }
    }
}


// parse a HTTP Header
function parseHTTPReq(data: Buffer): HTTPReq {
    // split the data into lines
    const lines: Buffer[] = splitLines(data)
    // the first line is 'METHOD URI VERSION'
    const [method, uri, version] = parseRequestLine(lines[0]);
    // followed by header fields in the format of 'Name: value'
    const headers: Buffer[] = []

    for (let i = 1; i < lines.length - 1; i++) {
        const h = Buffer.from(lines[i]) //copy
        if (!validateHeader(h)) {
            throw new HTTPError(400, 'bad field');
        }
        headers.push(h);
    }
    console.assert(lines[lines.length - 1].length === 0);
    return {
        method: method, uri: Buffer.from(uri), version: version, headers: headers
    }
}

function bufPop(buf: DynBuf, offset: number): void {
    buf.data.copyWithin(0, buf.offset, buf.length);
    buf.length -= buf.offset;
    buf.offset = 0
}

function soRead(conn: TCPConn): Promise<Buffer> {
    console.assert(!conn.reader); // no concurrent reads
    return new Promise((resolve, reject) => {
        if (conn.err) {
            reject(conn.err);
            return
        }
        if (conn.ended) {
            resolve(Buffer.from('')) //EOF
            return
        }
        conn.reader = { resolve: resolve, reject: reject }
        conn.socket.resume()
    })

}

function splitLines(data: Buffer): Buffer[] {
    const delimiter = "\r\n";
    const lines = data.toString().split(delimiter).map(line => Buffer.from(line));
    return lines;
}

function parseRequestLine(data: Buffer): string {
    const lines = splitLines(data);
    const lineOne = lines[0].toString()
    const requestLinePattern = /^[A-Z]+ \S+ HTTP\/\d+\.\.\d+$/
    if (!requestLinePattern.test(lineOne)) {
        throw new Error("Invalid HTTP Request");
    }
    return lineOne;
}

function validateHeader(data: Buffer): boolean {
    const headerPattern = /^[A-Za-z\-]+:\s.+$/; // Example pattern for HTTP headers
    return headerPattern.test(data.toString());
}

function parseDec(arg0: any): number {
    throw new Error("Function not implemented.")
}

function fieldGet(headers: Buffer[], key: string): null | Buffer {
    for (const header of headers) {
        if (header.toString('latin1').startsWith(key)) {
            return header
        }
    }
    return null
}

// Body reader from a socket with a known length
function readerFromConnLength(
    conn: TCPConn, buf: DynBuf, remain: number): BodyReader {
    return {
        length: remain,
        read: async (): Promise<Buffer> => {
            if (remain === 0) {
                return Buffer.from(''); //done
            }
            if (buf.length === 0) {
                // try and get some data if theres some
                const data = await soRead(conn)
                bufPush(buf, data)

                if (data.length === 0) {
                    // expect more data
                    throw new Error("Unexpected EOF from the HTTP Body")
                }
            }
            // consume data from the buffer
            const consume = Math.min(buf.length, remain)
            remain -= consume
            const data = Buffer.from(buf.data.subarray(0, consume))
            bufPop(buf, consume)
            return data
        },
    }
}
function soWrite(conn: TCPConn, data: Buffer):Promise<void> {
    console.assert(data.length > 0)
    return new Promise((resolve, reject) => {
        if (conn.err) {
            throw new Error("Error")
        }
        conn.socket.write(data, (error: Error | null | undefined) => {
            if (error) {
                reject(error)
            } else {
                resolve()
            }
        })
    })

}

function encodeHTTPResp(resp: HTTPRes): any {
    throw new Error("Function not implemented.")
}

function soListen(port: number, host: string = '127.0.0.1'): TCPListener {
	let server = net.createServer({ allowHalfOpen: true, pauseOnConnect: true });
	server.listen({ host, port }, () => {
		console.log(`Server Listening on ${host}:${port}`)
	});

	return { server }
}

function soAccept(listener: TCPListener): Promise<TCPConn> {
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
        serveClient(soInit(conn.socket))
	}
}
main()