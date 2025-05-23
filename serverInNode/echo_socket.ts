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

function soWrite(conn:TCPConn, data:Buffer):Promise<void> {
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

async function serveClient(socket: net.Socket):Promise<void> {
    const conn: TCPConn = soInit(socket)
    while(true) {
        const data = await soRead(conn)
        if (data.length === 0) {
            console.log('end connection')
            break;
        }

        console.log('data', data)
        await soWrite(conn, data)
    }
}

type TCPListener = {
  server: net.Server
}

function soListen(port:number = 1234, host:string = '127.0.0.1') :TCPListener {
    let server = net.createServer({allowHalfOpen:true, pauseOnConnect:true})
    server.listen({ port, host }, () => {
        console.log('Server listening on port 1234')
    })
    return { server }
}

function soAccept(listener: TCPListener): Promise<TCPConn> {
    return new Promise((resolve) => {
        listener.server.once('connection', (socket: net.Socket)=>{
            const conn:TCPConn = soInit(socket)
            resolve(conn)
        })
    })
}

async function main(socket: net.Socket) {
    const listener = await soListen()
    while (true) {
        const conn = await soAccept(listener)
        console.log('Accepted new connection')
        serveClient(conn.socket)
    }
}