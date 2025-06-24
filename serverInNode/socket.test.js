const { expect } = require('@jest/globals');
const {newConn, sum, server} = require('./socket');
const {net, createConnection} = require('net');

test('Adds 1+2 is 3', () => {
    expect(sum(1,2)).toBe(3);
})

test("newConn", () => {
    expect(newConn).toBeDefined();
})

test("server", () => {
    expect(server).toBeDefined();
    expect(server.listening).toBe(false); // server should not be listening yet
})

test("echoes back sent data", (done) => {
    const client = createConnection({port: 1234}, () => {
        client.write('hello')
    })

    client.on('data', (data) => {
        expect(data.toString()).toBe('hello')
        client.end()
        done()
    })
})
test("echoes back EOF when closed", () => {
    const client = createConnection({port: 1234}, () => {
        client.end() // close the connection
    })

    client.on('end', () => {
        expect(data.toString()).toBe('EOF')
        expect(client.end()).toBeDefined()
        client.end()
        done()
    })
})