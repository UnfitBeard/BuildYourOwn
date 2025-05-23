import * as net from "net"

//A promise based API for TCP sockets
type TCPConn = {
	//the JS Socket Object
	socket: net.Socket
	// from the 'error' event
	err: null | Error
	//EOF from the end event
	ended: boolean
	//the callbacks of the promise of the current read
	reader: null | {
		resolve: (value: Buffer) => void,
		reject: (reason: Error) => void,
	}
}

//A dynamic sized buffer
type DynBuf = {
	data: Buffer,
	length: number,
	offset: number //current read offset
}

type TCPListener = {
	server: net.Server
}


//append data to DybBuf
function bufPush(buf: DynBuf, data: Buffer): void {
	const newLen = buf.length + data.length

	if (buf.data.length < newLen) {
		//grow buffer capacity
		let cap = Math.max(buf.data.length, 32);
		if (cap < newLen) {
			cap *= 2;
		}

		const grown = Buffer.alloc(cap);
		buf.data.copy(grown, 0, 0)
		buf.data = grown
	}

	data.copy(buf.data, buf.length, 0);
	buf.length = newLen
}

//2.Accept new connections
async function newConn(socket: net.Socket): Promise<void> {
	console.log('new connection', socket.remoteAddress, socket.remotePort);
	// ...
	try {
		await serveClient(socket)
	} catch (exc) {
		console.error('exception:', exc)
	} finally {
		socket.destroy()
	}
}

//create a wrapper from net.Socket
function soInit(socket: net.Socket): TCPConn {
	const conn: TCPConn = {
		socket: socket, err: null, ended: false, reader: null
	};
	socket.on('data', (data: Buffer) => {
		console.assert(conn.reader);
		//pause data event until next read
		conn.socket.pause();
		//fulfill the promise of the current read
		conn.reader!.resolve(data)
		conn.reader = null
	});

	socket.on("end", () => {
		//this also fulfills the current read
		conn.ended = true
		if (conn.reader) {
			conn.reader.resolve(Buffer.from('')) //EOF
			conn.reader = null
		}
	});

	socket.on('error', (err: Error) => {
		//errors are also delivered to the current read
		conn.err = err
		if (conn.reader) {
			conn.reader.reject(err);
			conn.reader = null
		}
	})
	return conn
}

//returns an empty buffer after EOF
function soRead(conn: TCPConn): Promise<Buffer> {
	console.assert(!conn.reader)// no concurrent calls
	return new Promise((resolve, reject) => {
		if (conn.err) {
			reject(conn.err);
			return
		}
		if (conn.ended) {
			resolve(Buffer.from('')) //EOF
			return
		}

		//save the promise callbacks
		conn.reader = { resolve: resolve, reject: reject };
		//and resume the data event to fulfill the promise later
		conn.socket.resume()
	})
}
function soWrite(conn: TCPConn, data: Buffer): Promise<void> {
	console.assert(data.length > 0)
	return new Promise((resolve, reject) => {
		if (conn.err) {
			reject(conn.err);
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

async function serveClient(socket: net.Socket) {
	const conn: TCPConn = soInit(socket)
	const buf: DynBuf = { data: Buffer.alloc(0), length: 0, offset:0 }
	while (true) {
		//try to get one message from the buffer
		const msg: null | Buffer = cutMessage(buf)
		const text = msg?.toString().trim()
		if (!msg) {
			//need more data
			const data: Buffer = await soRead(conn);
			bufPush(buf, data)
			// EOF
			if (data.length === 0) {
				console.log('end connection')
				return
			}
			console.log('data', data);
			await soWrite(conn, data)
			// got some data try it again
			continue
		}

		if (msg.equals(Buffer.from('quit\n'))) {
			await soWrite(conn, Buffer.from('Bye.\n'));
			socket.destroy()
			return
		} else {
			const reply = Buffer.concat([Buffer.from('Echo: '), msg])
			await soWrite(conn, reply)
		}
	}
}

function cutMessage(buf: DynBuf): null|Buffer {
	// messages are separated by '\n'
	const slice = buf.data.subarray(buf.offset,buf.length);
	const idx = slice.indexOf('\n');
	if (idx < 0) {
		return null // not complete
	} 

	// make a copy of the message and move the remaining data to the front
	const msg = Buffer.from(slice.subarray(0, idx + 1));
	//change the beggining to the back of the next message
	buf.offset += idx + 1
	//Hold remaining data in place until wasted space reaches a threshold like 1/2 capacity
	const wasted = buf.offset
	const capacity = buf.data.length

	if (wasted >= capacity/2) {
		bufPop(buf);
	}
	return msg
}

// remove data from the front
function bufPop(buf:DynBuf): void {
	buf.data.copyWithin(0, buf.offset, buf.length);
	buf.length -= buf.offset;
	buf.offset = 0
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
		serveClient(conn.socket)
	}
}



