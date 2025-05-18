import * as net from "net"

//A promise based API for TCP sockets
type TCPConn = {
	//the JS Socket Object
	socket: net.Socket
	// from the 'error' event
	err: null|Error
	//EOF from the end event
	ended: boolean
	//the callbacks of the promise of the current read
	reader: null|{
		resolve: (value: Buffer) => void,
		reject: (reason: Error) => void,
	}
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
		socket: socket,err:null, ended:false, reader: null
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
function soRead(conn: TCPConn) :Promise<Buffer> {
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
		conn.reader = {resolve: resolve, reject: reject};
		//and resume the data event to fulfill the promise later
		conn.socket.resume()
	})
}
function soWrite(conn: TCPConn, data:Buffer): Promise<void> {
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
	const conn:TCPConn = soInit(socket)
	while (true) {
		const data = await soRead(conn);
		if (data.length === 0) {
			console.log('end connection')
			break
		}

		console.log('data', data);
		await soWrite(conn, data)
	}
}

let server = net.createServer({allowHalfOpen:true, pauseOnConnect:true});
server.on('error', (err) => {throw err})
server.on('connection', newConn);
server.listen({host: '127.0.0.1', port: 1234}, () => {
	console.log("Listening on port 1234")
});


