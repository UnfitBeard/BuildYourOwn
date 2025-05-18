import * as net from "net"
import { type } from "os";

//2.Accept new connections
function newConn(socket) {
	console.log('new connection', socket.remoteAddress, socket.remotePort);
	// ...
	socket.on('end', () => {
		//FIN received connection will be terrminated automatically
		console.log('EOF.')
	})

	socket.on('data', (data)=>{
		console.log('data:', data);
		socket.write(data); //echo back data

		//actively close the connection if the data contains q
		if (data.includes('q')) {
			console.log('closing');
			socket.end()
		}
	});
}

let server = net.createServer({allowHalfOpen:true});
server.on('error', (err) => {throw err})
server.on('connection', newConn);
server.listen({host: '127.0.0.1', port: 1234}, () => {
	console.log("Listening on port 1234")
});
