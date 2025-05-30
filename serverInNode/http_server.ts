import * as net from "net"
// parsed HTTP Request Header
type HTTPReq = {
    method: string,
    uri: Buffer,
    version: string,
    headers: Buffer[],
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
}

type DynBuf = {
    data: Buffer,
    length: number
}

type HTTPError = {
    error: Error,
}

async function serveClient(conn: TCPConn): Promise<void> {
    const buf: DynBuf = { data: Buffer.alloc(0), length: 0 }
    while (true) {
        // try to get 1 request header from the buffer
        const msg: null | HTTPReq = cutMessage(buf)
        if (!msg) {
            const data = await soRead(conn)
            bufPush(buf, data);
            // EOF
            if (data.length === 0 && buf.length === 0) {
                return; // no more requests
            }
            if (data.length === 0) {
                throw new Error(400, 'Unexpected EOF')
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

function bufPush(buf: DynBuf, data: void) {
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
}

function writeHTTPResp(conn: TCPConn, res: HTTPRes) {
}

function handleReq(msg: HTTPReq, reqBody: BodyReader): HTTPRes | PromiseLike<HTTPRes> {
}

function soInit(socket: net.Socket): TCPConn {
}

function readerFromMemory(arg0: Buffer<ArrayBuffer>): BodyReader {
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
        console.assert(lines[lines.length - 1].length === 0);
        return {
            method: method, uri: uri, version: version, headers: headers
        }
    }
}

function bufPop(buf: DynBuf, arg1: number) {
}

function soRead(conn: TCPConn) {
    throw new Error("Function not implemented.")
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

